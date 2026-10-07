import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { LeadAssignmentDepartment, LeadStage, LeadSubStatus } from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'
import { calculateLeadQuotationSqftSummary } from '@/lib/quotation-sqft-calculator'
import { normalizeMonthKey } from '@/lib/quotation-performance'

export async function GET(request: Request) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const canView =
      actorDepartments.has('ADMIN') ||
      actorDepartments.has('SR_CRM') ||
      actorDepartments.has('QUOTATION') ||
      actorDepartments.has('QUOTATION_TEAM') ||
      actorDepartments.has('PROJECT_COORDINATOR')

    if (!canView) {
      return NextResponse.json(
        { success: false, error: 'Only quotation team, senior CRM, or admin can access assigned tasks' },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('includeHistory') === '1'
    const requestedMonth = searchParams.get('month')
    const monthKey = requestedMonth ? normalizeMonthKey(requestedMonth) : null
    const isAdminOrSrCrm =
      actorDepartments.has('ADMIN') ||
      actorDepartments.has('SR_CRM') ||
      actorDepartments.has('PROJECT_COORDINATOR')

    const whereCondition: any = includeHistory
      ? {
          OR: [
            {
              assignments: {
                some: {
                  department: LeadAssignmentDepartment.QUOTATION,
                  userId: authResult.actorUserId,
                },
              },
            },
            {
              quotationDrafts: {
                some: {
                  OR: [
                    { createdById: authResult.actorUserId },
                    { updatedById: authResult.actorUserId },
                  ],
                },
              },
            },
          ],
        }
      : isAdminOrSrCrm
        ? {
            assignments: {
              some: {
                department: LeadAssignmentDepartment.QUOTATION,
              },
            },
          }
        : {
            assignments: {
              some: {
                department: LeadAssignmentDepartment.QUOTATION,
                userId: authResult.actorUserId,
              },
            },
          }

    const leads = await prisma.lead.findMany({
      where: whereCondition,
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
              in: [LeadAssignmentDepartment.QUOTATION, LeadAssignmentDepartment.SR_CRM, LeadAssignmentDepartment.JR_ARCHITECT]
            }
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
          where: { status: 'COMPLETED' },
          select: { projectSqft: true, scheduledAt: true },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
        quotationDrafts: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            draftKey: true,
            projectSqft: true,
            content: true,
            updatedAt: true,
            createdById: true,
            updatedById: true,
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    })

    const tasksData = leads.map((lead) => {
      const fallbackSqft = lead.visits[0]?.projectSqft ?? 0
      const visitDate = lead.visits[0]?.scheduledAt ?? null
      const visitMonthKey = visitDate
        ? `${visitDate.getFullYear()}-${String(visitDate.getMonth() + 1).padStart(2, '0')}`
        : null

      // Filter drafts edited in monthRange by current user if monthRange is provided
      const userMonthDrafts = lead.quotationDrafts.filter(
        (d) => d.createdById === authResult.actorUserId || d.updatedById === authResult.actorUserId,
      )

      const sqftSummary = calculateLeadQuotationSqftSummary(
        userMonthDrafts.length > 0 ? userMonthDrafts : lead.quotationDrafts,
        0,
      )

      const latestDraftUpdate =
        (userMonthDrafts.length > 0 ? userMonthDrafts[0]?.updatedAt : lead.quotationDrafts[0]?.updatedAt) ??
        lead.updated_at

      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        location: lead.location,
        stage: lead.stage,
        subStatus: lead.subStatus,
        updatedAt: latestDraftUpdate,
        visitDate: visitDate?.toISOString() ?? null,
        visitMonthKey,
        budget: lead.budget,
        quotationAssignee: lead.assignments.find((a) => a.department === 'QUOTATION')?.user ?? null,
        srCrmAssignee: lead.assignments.find((a) => a.department === 'SR_CRM')?.user ?? null,
        jrArchitectAssignee: lead.assignments.find((a) => a.department === 'JR_ARCHITECT')?.user ?? null,
        latestFirstMeeting: lead.meetingEvents[0] ?? null,
        projectSqft: fallbackSqft || null,
        avgDetailSqft: sqftSummary.avgDetailSqft,
        avgShortSqft: sqftSummary.avgShortSqft,
        detailVersionsCount: sqftSummary.detailVersionsCount,
        shortPackagesCount: sqftSummary.shortPackagesCount,
        attachments: lead.attachments,
        canStart:
          (lead.stage as string) === LeadStage.CONVERSION ||
          lead.subStatus === LeadSubStatus.QUOTATION_ASSIGNED ||
          lead.subStatus === LeadSubStatus.QUOTATION_CORRECTION,
        canSubmit:
          lead.subStatus === LeadSubStatus.QUOTATION_WORKING ||
          (lead.stage as string) === LeadStage.CONVERSION,
      }
    })

    const filteredTasksData = monthKey
      ? tasksData.filter((task) => task.visitMonthKey === monthKey)
      : tasksData

    const totalDetailSqft = filteredTasksData.reduce((sum, item) => sum + item.avgDetailSqft, 0)
    const totalShortSqft = filteredTasksData.reduce((sum, item) => sum + item.avgShortSqft, 0)

    return NextResponse.json({
      success: true,
      monthKey,
      data: filteredTasksData,
      metrics: {
        totalDetailSqft,
        totalShortSqft,
        totalSqftWorked: totalDetailSqft + totalShortSqft,
      },
    })
  } catch (error) {
    console.error('[quotation/assigned-tasks][GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load assigned quotation tasks' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS' },
  })
}
