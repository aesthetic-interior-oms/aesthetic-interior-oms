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
        created_at: true,
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
            createdAt: true,
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
        cadWorkSubmissions: {
          where: { department: LeadAssignmentDepartment.QUOTATION },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            versionNumber: true,
            versionName: true,
            note: true,
            createdAt: true,
            submittedBy: {
              select: { id: true, fullName: true },
            },
            files: {
              select: {
                id: true,
                fileName: true,
                url: true,
                fileType: true,
                sizeBytes: true,
              },
            },
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

      // Compute assignment date based on latest quotation assignment or lead created_at
      const quotationAssignments = lead.assignments
        .filter((a) => a.department === LeadAssignmentDepartment.QUOTATION)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      const assignmentDate = quotationAssignments[0]?.createdAt ?? lead.created_at
      const assignedYear = assignmentDate.getFullYear()
      const assignedMonth = assignmentDate.getMonth() + 1
      const assignedMonthKey = `${assignedYear}-${String(assignedMonth).padStart(2, '0')}`

      const isPostAgreementStage =
        (lead.stage as string) === LeadStage.CONVERSION ||
        (lead.stage as string) === LeadStage.PROJECT_SETUP ||
        (lead.stage as string) === LeadStage.MATERIAL_PLANNING ||
        (lead.stage as string) === LeadStage.PROCUREMENT ||
        (lead.stage as string) === LeadStage.SITE_EXECUTION ||
        (lead.stage as string) === LeadStage.QUALITY_CHECK ||
        (lead.stage as string) === LeadStage.HANDOVER ||
        Boolean((lead as any).agreementType)

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
        createdAt: lead.created_at.toISOString(),
        updatedAt: latestDraftUpdate,
        assignedAt: assignmentDate.toISOString(),
        assignedDate: assignmentDate.toISOString(),
        assignedMonthKey,
        assignedYear,
        assignedMonth,
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
        isPostAgreement: isPostAgreementStage,
        canStart:
          isPostAgreementStage ||
          lead.subStatus === LeadSubStatus.QUOTATION_ASSIGNED ||
          lead.subStatus === LeadSubStatus.QUOTATION_CORRECTION,
        canSubmit:
          isPostAgreementStage ||
          lead.subStatus === LeadSubStatus.QUOTATION_WORKING,
        nextVersionNumber: lead.cadWorkSubmissions.length + 1,
        quotationSubmissions: lead.cadWorkSubmissions.map((sub) => ({
          id: sub.id,
          versionNumber: sub.versionNumber,
          versionName: sub.versionName,
          note: sub.note,
          createdAt: sub.createdAt.toISOString(),
          submittedBy: sub.submittedBy ? { id: sub.submittedBy.id, fullName: sub.submittedBy.fullName } : null,
          files: sub.files.map((f) => ({
            id: f.id,
            fileName: f.fileName,
            url: f.url,
            fileType: f.fileType,
            sizeBytes: f.sizeBytes,
          })),
        })),
      }
    })

    // Sort by assignedAt descending (latest assigned at the top)
    tasksData.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())

    const filteredTasksData = requestedMonth === 'NO_VISIT'
      ? tasksData.filter((task) => !task.visitMonthKey)
      : monthKey
        ? tasksData.filter((task) => task.assignedMonthKey === monthKey || task.visitMonthKey === monthKey)
        : tasksData

    const totalDetailSqft = filteredTasksData.reduce((sum, item) => sum + item.avgDetailSqft, 0)
    const totalShortSqft = filteredTasksData.reduce((sum, item) => sum + item.avgShortSqft, 0)

    const payload = NextResponse.json({
      success: true,
      monthKey,
      data: filteredTasksData,
      metrics: {
        totalDetailSqft,
        totalShortSqft,
        totalSqftWorked: totalDetailSqft + totalShortSqft,
      },
    })
    // Cache for 60s on the client, allow serving stale for 120s while revalidating — cuts repeated joins
    payload.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120')
    return payload
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
