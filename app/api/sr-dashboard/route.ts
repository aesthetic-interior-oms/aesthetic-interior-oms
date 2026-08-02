import { NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { listVisitCompleteQueueItems } from '@/lib/visit-complete-queue'
import { calculateSrCrmPerformance } from '@/lib/sr-crm-performance'
import {
  LeadAssignmentDepartment,
  LeadMeetingEventType,
  LeadPhaseTaskStatus,
  LeadStage,
  LeadSubStatus,
  Prisma,
  VisitStatus,
} from '@/generated/prisma/client'

const SR_DASHBOARD_DEPARTMENTS = new Set(['ADMIN', 'SR_CRM'])

function buildSrAssignmentScope(userId: string | null): Prisma.LeadWhereInput {
  if (!userId) return {}
  return {
    assignments: {
      some: {
        department: LeadAssignmentDepartment.SR_CRM,
        userId,
      },
    },
  }
}

function mergeLeadScopes(...scopes: Prisma.LeadWhereInput[]): Prisma.LeadWhereInput {
  const activeScopes = scopes.filter((scope) => Object.keys(scope).length > 0)
  if (activeScopes.length === 0) return {}
  if (activeScopes.length === 1) return activeScopes[0]
  return { AND: activeScopes }
}

export async function GET() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actor = await prisma.user.findUnique({
      where: { id: authResult.actorUserId },
      select: {
        id: true,
        userDepartments: { select: { department: { select: { name: true } } } },
      },
    })

    const canViewDashboard = (actor?.userDepartments ?? []).some(
      (row) => SR_DASHBOARD_DEPARTMENTS.has(row.department.name),
    )

    if (!canViewDashboard) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view SR CRM dashboard' },
        { status: 403 },
      )
    }

    const srScope = buildSrAssignmentScope(actor?.id ?? null)
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const overdueSubmissionCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const overdueQueueCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    const cadScope: Prisma.LeadWhereInput = { stage: LeadStage.CAD_PHASE }
    const reviewScope: Prisma.LeadWhereInput = {
      OR: [
        { stage: LeadStage.CAD_PHASE, subStatus: LeadSubStatus.CAD_COMPLETED },
        { stage: LeadStage.QUOTATION_PHASE, subStatus: LeadSubStatus.QUOTATION_COMPLETED },
      ],
    }
    const meetingScope: Prisma.LeadWhereInput = {
      OR: [
        { stage: LeadStage.CAD_PHASE, subStatus: LeadSubStatus.CAD_APPROVED },
        {
          stage: LeadStage.DISCOVERY,
          subStatus: LeadSubStatus.FIRST_MEETING_SET,
          cadWorkSubmissions: { some: {} },
        },
        {
          stage: LeadStage.DISCOVERY,
          subStatus: LeadSubStatus.PROPOSAL_SENT,
          cadWorkSubmissions: { some: {} },
        },
      ],
    }
    const budgetScope: Prisma.LeadWhereInput = {
      OR: [
        {
          stage: LeadStage.QUOTATION_PHASE,
          subStatus: {
            in: [
              LeadSubStatus.QUOTATION_ASSIGNED,
              LeadSubStatus.QUOTATION_WORKING,
              LeadSubStatus.QUOTATION_APPROVED,
            ],
          },
        },
        {
          stage: LeadStage.BUDGET_PHASE,
          subStatus: LeadSubStatus.BUDGET_MEETING_SET,
        },
      ],
    }

    const [
      cadCount,
      reviewCount,
      meetingCount,
      budgetCount,
      visitItems,
      upcomingMeetings,
      overdueCadTasks,
      overdueQuotationTasks,
      reviewSubmissions,
      budgetLeads,
      overdueQuotationReviews,
      designQueueCount,
      overdueDesignQueueCount,
      designReviewPendingCount,
      overdueDesignReviews,
      visitStatusCounts,
      pendingOverdueVisitCount,
    ] = await Promise.all([
      prisma.lead.count({ where: mergeLeadScopes(cadScope, srScope) }),
      prisma.lead.count({ where: mergeLeadScopes(reviewScope, srScope) }),
      prisma.lead.count({ where: mergeLeadScopes(meetingScope, srScope) }),
      prisma.lead.count({ where: mergeLeadScopes(budgetScope, srScope) }),
      listVisitCompleteQueueItems({ srAssigneeUserId: actor?.id ?? null }),
      prisma.leadMeetingEvent.findMany({
        where: {
          startsAt: { gte: now, lte: nextWeek },
          type: { in: [LeadMeetingEventType.FIRST_MEETING, LeadMeetingEventType.BUDGET_MEETING] },
          lead: srScope,
        },
        orderBy: { startsAt: 'asc' },
        take: 4,
        select: {
          id: true,
          type: true,
          title: true,
          startsAt: true,
          lead: { select: { id: true, name: true, stage: true, subStatus: true } },
        },
      }),
      prisma.leadPhaseTask.findMany({
        where: {
          phaseType: 'CAD',
          status: { in: [LeadPhaseTaskStatus.OPEN, LeadPhaseTaskStatus.IN_REVIEW] },
          dueAt: { lte: now },
          lead: srScope,
        },
        orderBy: { dueAt: 'asc' },
        take: 4,
        select: {
          id: true,
          dueAt: true,
          status: true,
          lead: { select: { id: true, name: true, subStatus: true } },
          assignee: { select: { fullName: true } },
        },
      }),
      prisma.leadPhaseTask.findMany({
        where: {
          phaseType: 'QUOTATION',
          status: { in: [LeadPhaseTaskStatus.OPEN, LeadPhaseTaskStatus.IN_REVIEW] },
          dueAt: { lte: now },
          lead: srScope,
        },
        orderBy: { dueAt: 'asc' },
        take: 4,
        select: {
          id: true,
          dueAt: true,
          status: true,
          lead: { select: { id: true, name: true, subStatus: true } },
          assignee: { select: { fullName: true } },
        },
      }),
      prisma.cadWorkSubmission.findMany({
        where: { lead: mergeLeadScopes(reviewScope, srScope) },
        orderBy: { submittedAt: 'desc' },
        take: 4,
        select: {
          id: true,
          submittedAt: true,
          lead: { select: { id: true, name: true, phone: true, location: true } },
          submittedBy: { select: { fullName: true } },
          files: { select: { id: true } },
        },
      }),
      prisma.lead.findMany({
        where: mergeLeadScopes(budgetScope, srScope),
        orderBy: { updated_at: 'desc' },
        take: 4,
        select: {
          id: true,
          name: true,
          budget: true,
          stage: true,
          subStatus: true,
          updated_at: true,
          assignments: {
            where: { department: LeadAssignmentDepartment.QUOTATION },
            take: 1,
            select: { user: { select: { fullName: true } } },
          },
        },
      }),
      prisma.cadWorkSubmission.findMany({
        where: {
          submittedAt: { lte: overdueSubmissionCutoff },
          lead: mergeLeadScopes(
            { stage: LeadStage.QUOTATION_PHASE, subStatus: LeadSubStatus.QUOTATION_COMPLETED },
            srScope,
          ),
        },
        orderBy: { submittedAt: 'asc' },
        take: 4,
        select: {
          id: true,
          submittedAt: true,
          lead: { select: { id: true, name: true } },
          submittedBy: { select: { fullName: true } },
          files: { select: { id: true } },
        },
      }),
      prisma.lead.count({
        where: mergeLeadScopes(
          {
            stage: LeadStage.VISUALIZATION_PHASE,
            subStatus: { in: [LeadSubStatus.VISUAL_ASSIGNED, LeadSubStatus.VISUAL_WORKING] },
          },
          srScope,
        ),
      }),
      prisma.lead.count({
        where: mergeLeadScopes(
          {
            stage: LeadStage.VISUALIZATION_PHASE,
            subStatus: { in: [LeadSubStatus.VISUAL_ASSIGNED, LeadSubStatus.VISUAL_WORKING] },
            updated_at: { lte: overdueQueueCutoff },
          },
          srScope,
        ),
      }),
      prisma.lead.count({
        where: mergeLeadScopes(
          { stage: LeadStage.VISUALIZATION_PHASE, subStatus: LeadSubStatus.VISUAL_COMPLETED },
          srScope,
        ),
      }),
      prisma.cadWorkSubmission.findMany({
        where: {
          submittedAt: { lte: overdueSubmissionCutoff },
          lead: mergeLeadScopes(
            { stage: LeadStage.VISUALIZATION_PHASE, subStatus: LeadSubStatus.VISUAL_COMPLETED },
            srScope,
          ),
        },
        orderBy: { submittedAt: 'asc' },
        take: 4,
        select: {
          id: true,
          submittedAt: true,
          lead: { select: { id: true, name: true } },
          submittedBy: { select: { fullName: true } },
          files: { select: { id: true } },
        },
      }),
      prisma.visit.groupBy({
        by: ['status'],
        where: { lead: srScope },
        _count: { _all: true },
      }),
      prisma.visit.count({
        where: {
          status: VisitStatus.SCHEDULED,
          scheduledAt: { lte: now },
          lead: srScope,
        },
      }),
    ])

    const allPerformance = await calculateSrCrmPerformance(prisma)
    const currentPerformance = actor?.id
      ? allPerformance.find((p) => p.userId === actor.id) ?? null
      : null
    const topPerformance = allPerformance[0] ?? null

    return NextResponse.json({
      success: true,
      data: {
        queueCounts: {
          cad: cadCount,
          review: reviewCount,
          visit: visitItems.length,
          meeting: meetingCount,
          budget: budgetCount,
        },
        upcomingMeetings,
        budgetLeads,
        reviewSubmissions,
        overdueCadTasks,
        overdueQuotationTasks,
        overdueQuotationReviews,
        overdueDesignReviews,
        visitItems,
        designWatch: {
          queueCount: designQueueCount,
          overdueQueueCount: overdueDesignQueueCount,
          reviewPendingCount: designReviewPendingCount,
          overdueReviewCount: overdueDesignReviews.length,
        },
        visitInsights: {
          statusData: [
            { name: 'Completed', value: visitStatusCounts.find((row) => row.status === VisitStatus.COMPLETED)?._count._all ?? 0, fill: 'var(--color-chart-2)' },
            { name: 'Rescheduled', value: visitStatusCounts.find((row) => row.status === VisitStatus.RESCHEDULED)?._count._all ?? 0, fill: 'var(--color-chart-3)' },
            { name: 'Cancelled', value: visitStatusCounts.find((row) => row.status === VisitStatus.CANCELLED)?._count._all ?? 0, fill: 'var(--color-destructive)' },
            { name: 'Pending', value: visitStatusCounts.find((row) => row.status === VisitStatus.SCHEDULED)?._count._all ?? 0, fill: 'var(--color-chart-1)' },
          ],
          pendingOverdueCount: pendingOverdueVisitCount,
        },
        performance: {
          current: currentPerformance,
          top: topPerformance,
        },
      },
    })
  } catch (error) {
    console.error('[sr-dashboard/route][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load SR CRM dashboard data' },
      { status: 500 },
    )
  }
}
