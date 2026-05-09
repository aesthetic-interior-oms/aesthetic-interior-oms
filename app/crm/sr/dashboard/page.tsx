import { auth } from '@clerk/nextjs/server'
import {
  LeadAssignmentDepartment,
  LeadMeetingEventType,
  LeadPhaseTaskStatus,
  LeadStage,
  LeadSubStatus,
  Prisma,
} from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { listVisitCompleteQueueItems } from '@/lib/visit-complete-queue'
import {
  CommandCenterDashboard,
  formatLabel,
  formatRelativeTime,
  queueLinks,
  type PriorityAction,
} from './_components/command-center-dashboard'

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

export default async function SeniorCrmDashboardPage() {
  const { userId: clerkUserId } = await auth()
  const currentUser = clerkUserId
    ? await prisma.user.findUnique({
        where: { clerkUserId },
        select: { id: true, fullName: true },
      })
    : null

  const srScope = buildSrAssignmentScope(currentUser?.id ?? null)
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const cadScope: Prisma.LeadWhereInput = { stage: LeadStage.CAD_PHASE }
  const reviewScope: Prisma.LeadWhereInput = {
    stage: LeadStage.CAD_PHASE,
    subStatus: LeadSubStatus.CAD_COMPLETED,
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
            LeadSubStatus.QUOTATION_COMPLETED,
          ],
        },
      },
      {
        stage: LeadStage.BUDGET_PHASE,
        subStatus: { in: [LeadSubStatus.BUDGET_MEETING_SET, LeadSubStatus.QUOTATION_COMPLETED] },
      },
    ],
  }

  const [cadCount, reviewCount, meetingCount, budgetCount, visitItems, upcomingMeetings, overdueCadTasks, reviewSubmissions, budgetLeads] =
    await Promise.all([
      prisma.lead.count({ where: mergeLeadScopes(cadScope, srScope) }),
      prisma.lead.count({ where: mergeLeadScopes(reviewScope, srScope) }),
      prisma.lead.count({ where: mergeLeadScopes(meetingScope, srScope) }),
      prisma.lead.count({ where: mergeLeadScopes(budgetScope, srScope) }),
      listVisitCompleteQueueItems({ srAssigneeUserId: currentUser?.id ?? null }),
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
    ])

  const priorityActions: PriorityAction[] = [
    ...overdueCadTasks.map((task): PriorityAction => ({
      id: `cad-task-${task.id}`,
      title: task.lead.name,
      label: 'CAD deadline missed',
      detail: `${task.assignee.fullName} • ${formatLabel(task.status)} • ${formatRelativeTime(task.dueAt)}`,
      href: `${queueLinks.cad}?lead=${task.lead.id}`,
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
      detail: `${meeting.title} • ${formatRelativeTime(meeting.startsAt)}`,
      href: queueLinks.meeting,
      tone: 'success',
      time: meeting.startsAt,
    })),
  ]
    .sort((first, second) => (first.time?.getTime() ?? Number.MAX_SAFE_INTEGER) - (second.time?.getTime() ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 8)

  return (
    <CommandCenterDashboard
      currentUserName={currentUser?.fullName ?? null}
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
    />
  )
}
