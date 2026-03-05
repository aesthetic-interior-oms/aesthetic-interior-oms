// Import ActivityType and Prisma types from the generated Prisma client
import { Prisma } from '@/generated/prisma/client'
// Import the Prisma database instance to perform database operations
import prisma from '@/lib/prisma'
// Import Next.js HTTP request/response utilities for API route handling
import { NextRequest, NextResponse } from 'next/server'

// Type definition for route context params
type RouteContext = { params: { leadId: string } | Promise<{ leadId: string }> }

// Helper function: Resolves and validates the leadId parameter from route context
// Returns the leadId as a string if valid, or null if invalid/empty
async function resolveLeadId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params
  const leadId = resolvedParams?.leadId?.trim() || null
  return leadId && leadId.length > 0 ? leadId : null
}

// GET /api/activity-log/[leadId] - Fetch all activity logs for a specific lead
// URL Parameters:
//   - leadId: The ID of the lead to fetch activity logs for (required)
// Query Parameters (optional):
//   - page: Page number for pagination (default: 1)
//   - limit: Number of records per page (default: 20)
//   - type: Filter by activity type (optional)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Resolve and validate the leadId from the route parameters
    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'Invalid lead id' },
        { status: 400 }
      )
    }

    // Extract query parameters from the request URL
    const { searchParams } = new URL(request.url)

    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20', 10)), 100)
    const skip = (page - 1) * limit

    // Extract optional type filter
    const type = searchParams.get('type')

    // Verify that the lead exists in the database
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, name: true, email: true }
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Build the WHERE clause for filtering activities
    const where: Prisma.ActivityLogWhereInput = {
      leadId, // Filter by the specific lead
      ...(type && { type }), // Add type filter if provided
    }

    // Execute two database queries in parallel for better performance
    // 1. Find activities with pagination and includes user details
    // 2. Count total activities to calculate pagination metadata
    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where, // Apply filters
        include: {
          // Include related user data who performed the activity
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        skip, // Skip previous pages
        take: limit, // Limit results to page size
        orderBy: { createdAt: 'desc' }, // Sort by creation date (newest first)
      }),
      prisma.activityLog.count({ where }), // Count total matching records
    ])

    // Return success response with filtered activity logs and pagination info
    return NextResponse.json({
      success: true,
      data: activities,
      lead: lead, // Include lead information in response
      pagination: {
        page, // Current page number
        limit, // Records per page
        total, // Total matching records
        totalPages: Math.ceil(total / limit), // Total number of pages
      },
    })
  } catch (error: unknown) {
    // Log error for debugging
    console.error('Error fetching activity logs for lead:', error)
    // Return error response
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
