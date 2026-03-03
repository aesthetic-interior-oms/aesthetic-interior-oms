import { ActivityType, Prisma } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function toActivityType(value: string | null): ActivityType | undefined {
  if (!value) return undefined
  return Object.values(ActivityType).includes(value as ActivityType)
    ? (value as ActivityType)
    : undefined
}

// GET /api/activity-log - Get all activity logs with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = toPositiveInt(searchParams.get('page'), DEFAULT_PAGE)
    const parsedLimit = toPositiveInt(searchParams.get('limit'), DEFAULT_LIMIT)
    const limit = Math.min(parsedLimit, MAX_LIMIT)
    const skip = (page - 1) * limit

    const leadId = searchParams.get('leadId')
    const userId = searchParams.get('userId')
    const type = toActivityType(searchParams.get('type'))

    const where: Prisma.ActivityLogWhereInput = {}
    if (leadId) where.leadId = leadId
    if (userId) where.userId = userId
    if (type) where.type = type

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/activity-log - Create a new activity log
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const leadId = typeof body.leadId === 'string' ? body.leadId : ''
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const type = toActivityType(typeof body.type === 'string' ? body.type : null)
    const description = typeof body.description === 'string' ? body.description.trim() : ''

    if (!leadId || !userId || !type || !description) {
      return NextResponse.json(
        { success: false, error: 'leadId, userId, type, and description are required' },
        { status: 400 }
      )
    }

    const [lead, user] = await Promise.all([
      prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    ])

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const activity = await prisma.activityLog.create({
      data: {
        leadId,
        userId,
        type,
        description,
      },
      include: {
        lead: {
          select: { id: true, name: true, email: true },
        },
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    })

    return NextResponse.json(
      { success: true, data: activity, message: 'Activity log created successfully' },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Error creating activity log:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create activity log', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}