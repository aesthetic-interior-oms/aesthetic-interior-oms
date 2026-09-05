import {
  LeadAssignmentDepartment,
  LeadMeetingEventType,
  LeadPhaseTaskStatus,
  LeadStage,
  LeadSubStatus,
  Prisma,
  VisitStatus,
} from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { listVisitCompleteQueueItems } from '@/lib/visit-complete-queue'
import { getMonthlyVisitTeamPerformance } from '@/lib/visit-performance'
import { calculateSrCrmPerformance } from '@/lib/sr-crm-performance'
import { getMonthKey, normalizeMonthKey, syncAllQuotationTeamPerformance } from '@/lib/quotation-performance'
import { AdminCommandCenterDashboard } from './_components/command-center-dashboard'
import {
  formatLabel,
  formatRelativeTime,
  queueLinks,
  type PriorityAction,
} from '@/lib/dashboard-formatting'

type AdminDashboardPageProps = {
  searchParams?: Promise<{
    visitMonth?: string | string[]
  }>
}

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const params = await searchParams
  const visitPerformanceMonthKey = normalizeMonthKey(firstSearchParam(params?.visitMonth))
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

  const [cadCount, reviewCount, meetingCount, budgetCount, visitItems, upcomingMeetings, overdueCadTasks, overdueQuotationTasks, reviewSubmissions, budgetLeads, overdueQuotationReviews, designQueueCount, overdueDesignQueueCount, designReviewPendingCount, overdueDesignReviews, visitStatusCounts, pendingOverdueVisitCount, overduePendingVisits, monthlyVisitPerformanceData] =
    await Promise.all([
      prisma.lead.count({ where: cadScope }),
      prisma.lead.count({ where: reviewScope }),
      prisma.lead.count({ where: meetingScope }),
      prisma.lead.count({ where: budgetScope }),
      listVisitCompleteQueueItems(),
      prisma.leadMeetingEvent.findMany({
        where: {
          startsAt: { gte: now, lte: nextWeek },
          type: { in: [LeadMeetingEventType.FIRST_MEETING, LeadMeetingEventType.BUDGET_MEETING] },
        },
        orderBy: { startsAt: 'asc' },
        take: 4,
        select: {
          id: true,
          type: true,
          startsAt: true,
          lead: { select: { id: true, name: true, subStatus: true } },
        },
      }),
      prisma.leadPhaseTask.findMany({
        where: {
          phaseType: 'CAD',
          status: { in: [LeadPhaseTaskStatus.OPEN, LeadPhaseTaskStatus.IN_REVIEW] },
          dueAt: { lte: now },
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
        where: { lead: reviewScope },
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
        where: budgetScope,
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
          lead: { stage: LeadStage.QUOTATION_PHASE, subStatus: LeadSubStatus.QUOTATION_COMPLETED },
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
        where: {
          stage: LeadStage.VISUALIZATION_PHASE,
          subStatus: { in: [LeadSubStatus.VISUAL_ASSIGNED, LeadSubStatus.VISUAL_WORKING] },
        },
      }),
      prisma.lead.count({
        where: {
          stage: LeadStage.VISUALIZATION_PHASE,
          subStatus: { in: [LeadSubStatus.VISUAL_ASSIGNED, LeadSubStatus.VISUAL_WORKING] },
          updated_at: { lte: overdueQueueCutoff },
        },
      }),
      prisma.lead.count({
        where: {
          stage: LeadStage.VISUALIZATION_PHASE,
          subStatus: LeadSubStatus.VISUAL_COMPLETED,
        },
      }),
      prisma.cadWorkSubmission.findMany({
        where: {
          submittedAt: { lte: overdueSubmissionCutoff },
          lead: { stage: LeadStage.VISUALIZATION_PHASE, subStatus: LeadSubStatus.VISUAL_COMPLETED },
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
        _count: { _all: true },
      }),
      prisma.visit.count({
        where: {
          status: VisitStatus.SCHEDULED,
          scheduledAt: { lte: now },
        },
      }),
      prisma.visit.findMany({
        where: {
          status: VisitStatus.SCHEDULED,
          scheduledAt: { lte: now },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 8,
        select: {
          id: true,
          scheduledAt: true,
          assignedTo: { select: { fullName: true } },
          lead: { select: { id: true, name: true, location: true } },
        },
      }),
      getMonthlyVisitTeamPerformance(visitPerformanceMonthKey),
    ])

  const visitTeamPerformance = monthlyVisitPerformanceData.members
  const srCrmPerformance = await calculateSrCrmPerformance(prisma)

  const monthStr = (now.getUTCMonth() + 1).toString().padStart(2, '0')
  const currentMonthYear = `${now.getUTCFullYear()}-${monthStr}`

  const jrArchitectPerformances = await prisma.jrArchitectPerformance.findMany({
    where: { monthYear: currentMonthYear },
    include: { user: { select: { fullName: true } } },
    orderBy: { performanceScore: 'desc' },
  })

  // Quotation Team Pre-Calculated Monthly Performance
  const monthKey = getMonthKey(now)
  await syncAllQuotationTeamPerformance(now)
  const [quotationPerformanceRecords, quotationTeamMembers] = await Promise.all([
    prisma.quotationUserPerformance.findMany({
      where: { monthKey },
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { performanceScore: 'desc' },
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          {
            userDepartments: {
              some: {
                department: {
                  name: { in: ['QUOTATION_TEAM', 'QUOTATION', 'Quotation Team', 'Quotation'], mode: 'insensitive' },
                },
              },
            },
          },
          {
            leadAssignments: {
              some: {
                department: LeadAssignmentDepartment.QUOTATION,
              },
            },
          },
          {
            quotationDraftsCreated: {
              some: {},
            },
          },
          {
            quotationDraftsUpdated: {
              some: {},
            },
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    }),
  ])

  const quotationPerformanceByUser = new Map(quotationPerformanceRecords.map((record) => [record.userId, record]))
  const quotationPerformances = quotationTeamMembers
    .map((member) => {
      const performance = quotationPerformanceByUser.get(member.id)
      return {
        userId: member.id,
        fullName: member.fullName,
        email: member.email,
        detailSqft: performance?.detailSqft ?? 0,
        shortSqft: performance?.shortSqft ?? 0,
        totalSqft: performance?.totalSqft ?? 0,
        completedCount: performance?.completedCount ?? 0,
        avgWorkingHours: performance?.avgWorkingHours ?? 0,
        performanceScore: performance?.performanceScore ?? 0,
        updatedAt: performance?.updatedAt.toISOString() ?? null,
      }
    })
    .sort((first, second) => second.performanceScore - first.performanceScore)

  const priorityActions: PriorityAction[] = [
    ...overdueCadTasks.map((task): PriorityAction => ({
      id: `cad-task-${task.id}`,
      title: task.lead.name,
      label: 'CAD deadline missed',
      detail: `${task.assignee.fullName} • ${formatLabel(task.status)} • ${formatRelativeTime(task.dueAt)}`,
      href: `${queueLinks.cad}&lead=${task.lead.id}`,
      tone: 'critical',
      time: task.dueAt,
    })),
    ...reviewSubmissions.map((submission): PriorityAction => ({
      id: `review-${submission.id}`,
      title: submission.lead.name,
      label: 'CAD review waiting',
      detail: `${submission.submittedBy.fullName} submitted ${submission.files.length} file${submission.files.length === 1 ? '' : 's'} • ${formatRelativeTime(submission.submittedAt)}`,
      href: queueLinks.review,
      tone: 'warning',
      time: submission.submittedAt,
    })),
    ...overdueQuotationTasks.map((task): PriorityAction => ({
      id: `quotation-task-${task.id}`,
      title: task.lead.name,
      label: 'Quotation deadline missed',
      detail: `${task.assignee.fullName} • ${formatLabel(task.status)} • ${formatRelativeTime(task.dueAt)}`,
      href: `${queueLinks.budget}?lead=${task.lead.id}`,
      tone: 'critical',
      time: task.dueAt,
    })),
    ...overdueQuotationReviews.map((submission): PriorityAction => ({
      id: `quotation-review-${submission.id}`,
      title: submission.lead.name,
      label: 'Quotation review overdue',
      detail: `${submission.submittedBy.fullName} submitted ${submission.files.length} file${submission.files.length === 1 ? '' : 's'} • ${formatRelativeTime(submission.submittedAt)}`,
      href: queueLinks.review,
      tone: 'warning',
      time: submission.submittedAt,
    })),
    ...overdueDesignReviews.map((submission): PriorityAction => ({
      id: `design-review-${submission.id}`,
      title: submission.lead.name,
      label: 'Design review overdue',
      detail: `${submission.submittedBy.fullName} submitted ${submission.files.length} file${submission.files.length === 1 ? '' : 's'} • ${formatRelativeTime(submission.submittedAt)}`,
      href: queueLinks.review,
      tone: 'warning',
      time: submission.submittedAt,
    })),
    ...(overdueDesignQueueCount > 0
      ? [{
          id: 'design-queue-overdue',
          title: `${overdueDesignQueueCount} design item${overdueDesignQueueCount === 1 ? '' : 's'}`,
          label: 'Design queue overdue',
          detail: `Visualization queue items are aging past 48 hours before review handoff.`,
          href: queueLinks.design,
          tone: 'critical' as const,
          time: overdueQueueCutoff,
        }]
      : []),
    ...(pendingOverdueVisitCount > 0
      ? [{
          id: 'visit-result-overdue',
          title: `${pendingOverdueVisitCount} visit pending result`,
          label: 'Visit result overdue',
          detail: 'Scheduled visit time passed but no result submission yet.',
          href: queueLinks.visit,
          tone: 'critical' as const,
          time: now,
        }]
      : []),
    ...visitItems.slice(0, 4).map((item): PriorityAction => ({
      id: `visit-${item.leadId}`,
      title: item.leadName,
      label: 'Visit output ready',
      detail: `${item.latestCompletedVisit?.assignedVisitLead?.fullName ?? 'Visit team'} completed site work • assign CAD`,
      href: queueLinks.visit,
      tone: 'info',
      time: item.latestCompletedVisit?.completedAt ?? item.latestCompletedVisit?.scheduledAt ?? null,
    })),
    ...upcomingMeetings.map((meeting): PriorityAction => ({
      id: `meeting-${meeting.id}`,
      title: meeting.lead.name,
      label: meeting.type === LeadMeetingEventType.BUDGET_MEETING ? 'Budget meeting upcoming' : 'Client meeting upcoming',
      detail: `${formatLabel(meeting.type)} • ${formatRelativeTime(meeting.startsAt)}`,
      href: queueLinks.meeting,
      tone: 'success',
      time: meeting.startsAt,
    })),
  ]
    .sort((first, second) => (first.time?.getTime() ?? Number.MAX_SAFE_INTEGER) - (second.time?.getTime() ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 8)

  return (
    <AdminCommandCenterDashboard
      queueCounts={{
        cad: cadCount,
        review: reviewCount,
        visit: visitItems.length,
        meeting: meetingCount,
        budget: budgetCount,
      }}
      priorityActions={priorityActions}
      upcomingMeetings={upcomingMeetings}
      budgetLeads={budgetLeads}
      reviewSubmissions={reviewSubmissions}
      designWatch={{
        queueCount: designQueueCount,
        overdueQueueCount: overdueDesignQueueCount,
        reviewPendingCount: designReviewPendingCount,
        overdueReviewCount: overdueDesignReviews.length,
      }}
      visitInsights={{
        statusData: [
          { name: 'Completed', value: visitStatusCounts.find((row) => row.status === VisitStatus.COMPLETED)?._count._all ?? 0, fill: 'var(--color-chart-2)' },
          { name: 'Rescheduled', value: visitStatusCounts.find((row) => row.status === VisitStatus.RESCHEDULED)?._count._all ?? 0, fill: 'var(--color-chart-3)' },
          { name: 'Cancelled', value: visitStatusCounts.find((row) => row.status === VisitStatus.CANCELLED)?._count._all ?? 0, fill: 'var(--color-destructive)' },
          { name: 'Pending', value: visitStatusCounts.find((row) => row.status === VisitStatus.SCHEDULED)?._count._all ?? 0, fill: 'var(--color-chart-1)' },
        ],
        pendingOverdueCount: pendingOverdueVisitCount,
      }}
      visitTeamPerformance={visitTeamPerformance}
      visitTeamPerformanceMonthKey={monthlyVisitPerformanceData.monthKey}
      srCrmPerformance={srCrmPerformance}
      jrArchitectPerformances={jrArchitectPerformances}
      quotationPerformances={quotationPerformances}
      quotationPerformanceMonthKey={monthKey}
      overduePendingVisits={overduePendingVisits.map((visit) => ({
        id: visit.id,
        leadId: visit.lead.id,
        leadName: visit.lead.name,
        leadLocation: visit.lead.location,
        scheduledAt: visit.scheduledAt,
        visitLeadName: visit.assignedTo?.fullName ?? null,
      }))}
    />
  )
}
