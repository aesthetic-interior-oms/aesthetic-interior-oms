import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { LeadAssignmentDepartment, LeadStage } from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'

export async function GET(request: Request) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const isSrCrm = actorDepartments.has('SR_CRM') || actorDepartments.has('ADMIN')

    if (!isSrCrm) {
      return NextResponse.json(
        { success: false, error: 'Only Senior CRM or admin can access senior CRM quotation queue' },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('includeHistory') === '1'

    const leads = await prisma.lead.findMany({
      where: {
        assignments: {
          some: {
            department: LeadAssignmentDepartment.SR_CRM,
            userId: authResult.actorUserId,
          },
        },
        OR: [
          { stage: LeadStage.QUOTATION_PHASE },
          {
            assignments: {
              some: {
                department: LeadAssignmentDepartment.QUOTATION,
                userId: authResult.actorUserId,
              },
            },
          },
        ],
        ...(includeHistory
          ? {}
          : {
              NOT: {
                subStatus: 'QUOTATION_APPROVED',
              },
            }),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        location: true,
        stage: true,
        subStatus: true,
        updated_at: true,
        budget: true,
        assignments: {
          where: {
            department: {
              in: [
                LeadAssignmentDepartment.QUOTATION,
                LeadAssignmentDepartment.SR_CRM,
                LeadAssignmentDepartment.JR_ARCHITECT,
              ],
            },
          },
          select: {
            department: true,
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            url: true,
            fileType: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
        meetingEvents: {
          where: { type: 'FIRST_MEETING' },
          select: {
            id: true,
            title: true,
            notes: true,
            startsAt: true,
          },
          orderBy: { startsAt: 'desc' },
          take: 1,
        },
        visits: {
          select: { projectSqft: true },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updated_at: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        location: lead.location,
        stage: lead.stage,
        subStatus: lead.subStatus,
        updatedAt: lead.updated_at.toISOString(),
        budget: lead.budget,
        latestFirstMeeting: lead.meetingEvents[0]
          ? {
              id: lead.meetingEvents[0].id,
              title: lead.meetingEvents[0].title,
              notes: lead.meetingEvents[0].notes,
              startsAt: lead.meetingEvents[0].startsAt.toISOString(),
            }
          : null,
        srCrmAssignee: lead.assignments.find((a) => a.department === 'SR_CRM')?.user ?? null,
        jrArchitectAssignee: lead.assignments.find((a) => a.department === 'JR_ARCHITECT')?.user ?? null,
        quotationAssignee: lead.assignments.find((a) => a.department === 'QUOTATION')?.user ?? null,
        projectSqft: lead.visits[0]?.projectSqft ?? null,
        canStart: lead.subStatus === 'QUOTATION_ASSIGNED',
        canSubmit: lead.subStatus === 'QUOTATION_WORKING' || lead.subStatus === 'QUOTATION_ASSIGNED',
        attachments: lead.attachments,
      })),
    })
  } catch (error) {
    console.error('GET /api/sr/quotation-tasks error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch senior CRM quotation tasks' },
      { status: 500 },
    )
  }
}
