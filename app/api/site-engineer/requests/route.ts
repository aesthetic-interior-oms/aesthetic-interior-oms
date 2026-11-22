import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { LeadSiteWorkRequestStatus } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/site-engineer/requests
 * Lists site work requests.
 * Project Coordinator & Admin see all requests.
 * Sr CRM sees requests for their own leads or all requests.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = authResult.actorRoles ?? []
    const isAdmin =
      actorDepartments.has('ADMIN') ||
      actorRoles.some((r) => r.toUpperCase() === 'ADMIN')
    const isPc =
      actorDepartments.has('PROJECT_COORDINATOR') ||
      actorDepartments.has('PROJECT_CORDINATOR') ||
      actorRoles.some((r) => r.toUpperCase().includes('PROJECT_COORDINATOR'))
    const isSrCrm = actorDepartments.has('SR_CRM')

    if (!isAdmin && !isPc && !isSrCrm) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to view site work requests' },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const leadIdParam = searchParams.get('leadId')

    const where: any = {}

    if (leadIdParam) {
      where.leadId = leadIdParam
    }

    if (statusParam && statusParam !== 'ALL') {
      if (Object.values(LeadSiteWorkRequestStatus).includes(statusParam as LeadSiteWorkRequestStatus)) {
        where.status = statusParam as LeadSiteWorkRequestStatus
      }
    }

    const requests = await prisma.leadSiteWorkRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            location: true,
            stage: true,
            subStatus: true,
            agreementType: true,
            agreementValue: true,
            isSiteWorkActive: true,
            assignments: {
              where: {
                department: {
                  in: ['SR_CRM', 'SITE_ENGINEER', 'PROJECT_COORDINATOR'],
                },
              },
              include: {
                user: {
                  select: { id: true, fullName: true, email: true },
                },
              },
            },
          },
        },
        requestedBy: {
          select: { id: true, fullName: true, email: true },
        },
        reviewedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: requests,
    })
  } catch (error) {
    console.error('[GET /api/site-engineer/requests]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/site-engineer/requests
 * Initiates a request to start site work for an agreement lead.
 * Can be called by Admin or Sr CRM.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = authResult.actorRoles ?? []
    const isAdmin =
      actorDepartments.has('ADMIN') ||
      actorRoles.some((r) => r.toUpperCase() === 'ADMIN')
    const isSrCrm = actorDepartments.has('SR_CRM')
    const isPc =
      actorDepartments.has('PROJECT_COORDINATOR') ||
      actorDepartments.has('PROJECT_CORDINATOR')

    if (!isAdmin && !isSrCrm && !isPc) {
      return NextResponse.json(
        { success: false, error: 'Only Admin, Senior CRM, or Project Coordinator can request site work' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { leadId, note } = body

    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Lead ID is required' },
        { status: 400 },
      )
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        isSiteWorkActive: true,
        agreementType: true,
        agreementValue: true,
      },
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 },
      )
    }

    // Check if there is already a PENDING request
    const existingPending = await prisma.leadSiteWorkRequest.findFirst({
      where: {
        leadId,
        status: LeadSiteWorkRequestStatus.PENDING,
      },
    })

    if (existingPending) {
      return NextResponse.json(
        {
          success: false,
          error: 'A request to start site work is already pending Project Coordinator review.',
        },
        { status: 409 },
      )
    }

    // Create the new site work request
    const siteWorkRequest = await prisma.leadSiteWorkRequest.create({
      data: {
        leadId,
        requestedById: authResult.actorUserId,
        status: LeadSiteWorkRequestStatus.PENDING,
        note: note?.trim() || null,
      },
      include: {
        lead: {
          select: { id: true, name: true },
        },
        requestedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    })

    // Notify Project Coordinators
    try {
      const pcUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          userDepartments: {
            some: {
              department: {
                name: { in: ['PROJECT_COORDINATOR', 'PROJECT_CORDINATOR'] },
              },
            },
          },
        },
        select: { id: true },
      })

      if (pcUsers.length > 0) {
        await prisma.notification.createMany({
          data: pcUsers.map((pc) => ({
            userId: pc.id,
            leadId,
            type: 'LEAD_ASSIGNED_TO_YOU',
            title: 'New Site Work Request',
            message: `${siteWorkRequest.requestedBy.fullName} requested to start site work for ${lead.name}.`,
            scheduledFor: new Date(),
          })),
        })
      }
    } catch (notifErr) {
      console.error('Failed to notify Project Coordinators:', notifErr)
    }

    return NextResponse.json({
      success: true,
      data: siteWorkRequest,
      message: 'Request to start site work submitted successfully.',
    })
  } catch (error) {
    console.error('[POST /api/site-engineer/requests]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
