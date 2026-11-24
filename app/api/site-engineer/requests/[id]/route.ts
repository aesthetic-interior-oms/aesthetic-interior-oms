import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { LeadAssignmentDepartment, LeadSiteWorkRequestStatus, NotificationType } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/site-engineer/requests/[id]
 * Accept or Reject a site work request.
 * Authorized for Project Coordinator & Admin.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    if (!isAdmin && !isPc) {
      return NextResponse.json(
        { success: false, error: 'Only Project Coordinator or Admin can review site work requests' },
        { status: 403 },
      )
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 },
      )
    }

    const existingRequest = await prisma.leadSiteWorkRequest.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, fullName: true } },
      },
    })

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, error: 'Site work request not found' },
        { status: 404 },
      )
    }

    const body = await request.json()
    const { action, rejectionReason, siteEngineerUserIds, siteEngineerUserId } = body

    if (action !== 'ACCEPT' && action !== 'REJECT') {
      return NextResponse.json(
        { success: false, error: 'Action must be either ACCEPT or REJECT' },
        { status: 400 },
      )
    }

    const now = new Date()

    if (action === 'REJECT') {
      const reasonTrimmed = rejectionReason?.trim()
      if (!reasonTrimmed) {
        return NextResponse.json(
          { success: false, error: 'Rejection reason is required when rejecting a site work request' },
          { status: 400 },
        )
      }

      const updated = await prisma.leadSiteWorkRequest.update({
        where: { id },
        data: {
          status: LeadSiteWorkRequestStatus.REJECTED,
          rejectionReason: reasonTrimmed,
          reviewedById: authResult.actorUserId,
          reviewedAt: now,
        },
        include: {
          reviewedBy: { select: { id: true, fullName: true } },
        },
      })

      // Notify the requester (Sr CRM / Admin)
      try {
        await prisma.notification.create({
          data: {
            userId: existingRequest.requestedById,
            leadId: existingRequest.leadId,
            type: NotificationType.LEAD_ASSIGNED_TO_YOU,
            title: 'Site Work Request Rejected',
            message: `Project Coordinator declined site work for ${existingRequest.lead.name}: "${reasonTrimmed}"`,
            scheduledFor: now,
          },
        })
      } catch (notifErr) {
        console.error('Failed to send rejection notification:', notifErr)
      }

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Site work request has been rejected and reason recorded.',
      })
    }

    // action === 'ACCEPT'
    // Normalize site engineer IDs
    let engineerIdsToAssign: string[] = []
    if (Array.isArray(siteEngineerUserIds)) {
      engineerIdsToAssign = siteEngineerUserIds.filter(Boolean)
    } else if (siteEngineerUserId && typeof siteEngineerUserId === 'string') {
      engineerIdsToAssign = [siteEngineerUserId.trim()]
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update the request status
      const reqUpdated = await tx.leadSiteWorkRequest.update({
        where: { id },
        data: {
          status: LeadSiteWorkRequestStatus.ACCEPTED,
          reviewedById: authResult.actorUserId,
          reviewedAt: now,
        },
        include: {
          reviewedBy: { select: { id: true, fullName: true } },
        },
      })

      // 2. Mark lead site work as active
      await tx.lead.update({
        where: { id: existingRequest.leadId },
        data: {
          isSiteWorkActive: true,
          siteWorkStartedAt: now,
        },
      })

      // 3. Assign Site Engineers if provided
      for (const engineerId of engineerIdsToAssign) {
        await tx.leadAssignment.upsert({
          where: {
            leadId_department_userId: {
              leadId: existingRequest.leadId,
              department: LeadAssignmentDepartment.SITE_ENGINEER,
              userId: engineerId,
            },
          },
          create: {
            leadId: existingRequest.leadId,
            department: LeadAssignmentDepartment.SITE_ENGINEER,
            userId: engineerId,
          },
          update: {},
        })
      }

      return reqUpdated
    })

    // Notify assigned Site Engineers
    if (engineerIdsToAssign.length > 0) {
      try {
        await prisma.notification.createMany({
          data: engineerIdsToAssign.map((engId) => ({
            userId: engId,
            leadId: existingRequest.leadId,
            type: 'LEAD_ASSIGNED_TO_YOU',
            title: 'Assigned to Site Project',
            message: `You have been assigned as Site Engineer for ${existingRequest.lead.name}.`,
            scheduledFor: now,
          })),
        })
      } catch (notifErr) {
        console.error('Failed to notify site engineers:', notifErr)
      }
    }

    // Notify requester (Sr CRM / Admin)
    try {
      await prisma.notification.create({
        data: {
          userId: existingRequest.requestedById,
          leadId: existingRequest.leadId,
          type: NotificationType.LEAD_ASSIGNED_TO_YOU,
          title: 'Site Work Accepted',
          message: `Site work request for ${existingRequest.lead.name} was accepted by Project Coordinator.`,
          scheduledFor: now,
        },
      })
    } catch (notifErr) {
      console.error('Failed to notify requester:', notifErr)
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Site work request accepted and project is now active for site engineering.',
    })
  } catch (error) {
    console.error('[PATCH /api/site-engineer/requests/[id]]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
