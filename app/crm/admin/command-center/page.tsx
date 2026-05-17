import { addDays, endOfDay, endOfWeek, format, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { LeadStage, LeadSubStatus } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import {
  ActionLauncherSection,
  AlertSection,
  DeadlineSubmissionSection,
  HeroSection,
  LeadVisitOperationsSection,
  MetricCardSection,
  MetricsGridSection,
  VisitControlTowerSection,
  DataFlowStatsSection,
  ReviewWaitingSection,
  QuotationApprovedBudgetSection,
  SeniorThreeDayCalendarSection,
  VisualizationCompletionSection,
  type DeadlineQueueItem,
  type DeadlineSummary,
  type LeadStageMetric,
  type Metric,
  type ReviewWaitingItem,
  type QuotationApprovedBudgetItem,
  type SeniorWorkDay,
  type VisualizationCompletionItem,
} from './_components/sections'

export default async function AdminCommandCenterPage() {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const monthStart = startOfMonth(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const dayAfterTomorrow = addDays(now, 2)
  const threeDayStart = todayStart
  const threeDayEnd = endOfDay(dayAfterTomorrow)

  const [
    stageCounts,
    activeLeads,
    pendingVisitData,
    weeklyScheduledVisits,
    overdueVisitResults,
    cadProjects,
    budgetProjects,
    reviewJa,
    reviewQt,
    reviewViz,
    visitQueue,
    cadQueue,
    quotationQueue,
    srBudgetQueue,
    awaitingSchedule,
    awaitingExecution,
    awaitingOutcome,
    missedMeetings,
    missedProjectDeadlines,
    missedBudgetDeadlines,
    cancelledMtd,
    rescheduledMtd,
    deadlineQueueTasks,
    seniorThreeDayMeetings,
    seniorThreeDayTasks,
    reviewWaitingItemsRaw,
    quotationApprovedBudgetLeadsRaw,
    visualizationCompletionRaw,
  ] = await Promise.all([
    prisma.lead.groupBy({
      by: ['stage'],
      where: { created_at: { gte: monthStart } },
      _count: { stage: true },
    }),
    prisma.lead.count({
      where: {
        stage: {
          in: [LeadStage.NEW, LeadStage.CONTACT_ATTEMPTED, LeadStage.VISIT_SCHEDULED, LeadStage.CAD_PHASE, LeadStage.QUOTATION_PHASE, LeadStage.BUDGET_PHASE],
        },
      },
    }),
    prisma.visit.count({ where: { status: 'SCHEDULED' } }),
    prisma.visit.count({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.visit.count({
      where: {
        scheduledAt: { lt: now },
        status: { in: ['SCHEDULED', 'RESCHEDULED', 'COMPLETED'] },
        result: { is: null },
      },
    }),
    prisma.lead.count({ where: { stage: LeadStage.CAD_PHASE } }),
    prisma.lead.count({ where: { stage: { in: [LeadStage.QUOTATION_PHASE, LeadStage.BUDGET_PHASE] } } }),
    prisma.lead.count({ where: { stage: LeadStage.CAD_PHASE, subStatus: LeadSubStatus.CAD_COMPLETED } }),
    prisma.lead.count({ where: { stage: LeadStage.QUOTATION_PHASE, subStatus: LeadSubStatus.QUOTATION_COMPLETED } }),
    prisma.lead.count({ where: { stage: LeadStage.VISUALIZATION_PHASE, subStatus: LeadSubStatus.VISUAL_COMPLETED } }),
    prisma.lead.count({ where: { stage: LeadStage.VISIT_COMPLETED, subStatus: LeadSubStatus.VISIT_COMPLETED } }),
    prisma.lead.count({ where: { stage: LeadStage.CAD_PHASE } }),
    prisma.lead.count({ where: { stage: LeadStage.QUOTATION_PHASE } }),
    prisma.lead.count({ where: { stage: LeadStage.BUDGET_PHASE } }),
    prisma.lead.count({ where: { stage: LeadStage.CAD_PHASE, subStatus: LeadSubStatus.CAD_APPROVED } }),
    prisma.lead.count({ where: { stage: LeadStage.DISCOVERY, subStatus: LeadSubStatus.FIRST_MEETING_SET } }),
    prisma.leadMeetingEvent.count({ where: { startsAt: { lt: now } } }),
    prisma.leadMeetingEvent.count({ where: { startsAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.leadPhaseTask.count({ where: { dueAt: { lt: now }, status: { not: 'COMPLETED' } } }),
    prisma.leadPhaseTask.count({ where: { dueAt: { lt: now }, phaseType: 'QUOTATION', status: { not: 'COMPLETED' } } }),
    prisma.visit.count({ where: { status: 'CANCELLED', updatedAt: { gte: monthStart } } }),
    prisma.visit.count({ where: { status: 'RESCHEDULED', updatedAt: { gte: monthStart } } }),
    prisma.leadPhaseTask.findMany({
      where: {
        status: { in: ['OPEN', 'IN_REVIEW', 'COMPLETED'] },
        dueAt: { lte: now },
      },
      select: {
        id: true,
        phaseType: true,
        dueAt: true,
        completedAt: true,
        status: true,
        lead: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            userDepartments: {
              select: {
                department: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }],
      take: 250,
    }),
    prisma.leadMeetingEvent.findMany({
      where: {
        startsAt: { gte: threeDayStart, lte: threeDayEnd },
      },
      select: {
        id: true,
        title: true,
        type: true,
        startsAt: true,
        lead: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startsAt: 'asc' },
      take: 200,
    }),
    prisma.leadPhaseTask.findMany({
      where: {
        dueAt: { gte: threeDayStart, lte: threeDayEnd },
        status: { in: ['OPEN', 'IN_REVIEW', 'COMPLETED'] },
      },
      select: {
        id: true,
        phaseType: true,
        status: true,
        dueAt: true,
        lead: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { dueAt: 'asc' },
      take: 200,
    }),
    prisma.cadWorkSubmission.findMany({
      where: {
        lead: {
          OR: [
            { stage: LeadStage.CAD_PHASE, subStatus: LeadSubStatus.CAD_COMPLETED },
            { stage: LeadStage.QUOTATION_PHASE, subStatus: LeadSubStatus.QUOTATION_COMPLETED },
            { stage: LeadStage.VISUALIZATION_PHASE, subStatus: LeadSubStatus.VISUAL_COMPLETED },
          ],
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        submittedAt: true,
        lead: { select: { id: true, name: true, stage: true } },
        submittedBy: { select: { fullName: true } },
        files: { select: { id: true } },
      },
    }),
    prisma.lead.findMany({
      where: {
        stage: LeadStage.QUOTATION_PHASE,
        subStatus: LeadSubStatus.QUOTATION_APPROVED,
      },
      select: {
        id: true,
        name: true,
        budget: true,
        quotationType: true,
      },
      orderBy: { updated_at: 'desc' },
      take: 12,
    }),
    prisma.cadWorkSubmission.findMany({
      where: {
        lead: {
          stage: LeadStage.VISUALIZATION_PHASE,
          subStatus: {
            in: [LeadSubStatus.VISUAL_COMPLETED, LeadSubStatus.CLIENT_APPROVED],
          },
        },
      },
      select: {
        id: true,
        submittedAt: true,
        submittedBy: { select: { fullName: true } },
        lead: { select: { id: true, name: true, subStatus: true } },
        files: {
          select: { id: true, url: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 12,
    }),
  ])

  const totalReviewBacklog = reviewJa + reviewQt + reviewViz
  const activeProjects = cadProjects + budgetProjects + totalReviewBacklog
  const todayMissedDeadlines = missedMeetings + missedProjectDeadlines
  const meetingQueueTotal = awaitingSchedule + awaitingExecution + awaitingOutcome + missedMeetings
  const budgetQueueTotal = quotationQueue + srBudgetQueue

  const leadStageMap = new Map(stageCounts.map((x: { stage: LeadStage; _count: { stage: number } }) => [x.stage, x._count.stage]))
  const leadFlowStages: LeadStageMetric[] = [LeadStage.NEW, LeadStage.CONTACT_ATTEMPTED, LeadStage.VISIT_SCHEDULED].map((stage) => ({
    stage,
    value: leadStageMap.get(stage) ?? 0,
    href: `/crm/admin/leads?stage=${stage}`,
  }))

  const isJrTask = (departmentNames: string[]) => departmentNames.includes('JR_ARCHITECT')
  const isQuotationTask = (departmentNames: string[]) => departmentNames.includes('QUOTATION') || departmentNames.includes('QUOTATION_TEAM')
  const isVisualizerTask = (departmentNames: string[]) => departmentNames.includes('VISUALIZER_3D') || departmentNames.includes('3D_VISUALIZER')

  const deadlineSummaryMap: Record<'jr' | 'quotation' | 'visualizer', { department: string; missed: number; late: number; onTime: number }> = {
    jr: { department: 'JR Architect (CAD)', missed: 0, late: 0, onTime: 0 },
    quotation: { department: 'Quotation Team (Quotation)', missed: 0, late: 0, onTime: 0 },
    visualizer: { department: '3D Visualizer (CAD)', missed: 0, late: 0, onTime: 0 },
  }

  const deadlineQueue: Array<DeadlineQueueItem & { priority: number; orderTime: number }> = []

  for (const task of deadlineQueueTasks) {
    const departmentNames = task.assignee.userDepartments.map((row) => row.department.name)
    const departmentKey = isJrTask(departmentNames) ? 'jr' : isQuotationTask(departmentNames) ? 'quotation' : isVisualizerTask(departmentNames) ? 'visualizer' : null
    if (!departmentKey) continue

    const completed = task.status === 'COMPLETED' && Boolean(task.completedAt)
    const isLateSubmission = completed && task.completedAt! > task.dueAt
    const isOnTimeSubmission = completed && task.completedAt! <= task.dueAt
    const isDeadlineMissed = !completed && task.dueAt < now

    if (!isLateSubmission && !isOnTimeSubmission && !isDeadlineMissed) continue

    if (isLateSubmission) deadlineSummaryMap[departmentKey].late += 1
    if (isOnTimeSubmission) deadlineSummaryMap[departmentKey].onTime += 1
    if (isDeadlineMissed) deadlineSummaryMap[departmentKey].missed += 1

    const statusLabel: DeadlineQueueItem['statusLabel'] = isLateSubmission
      ? 'LATE_SUBMISSION'
      : isDeadlineMissed
        ? 'DEADLINE_MISSED'
        : 'ON_TIME_SUBMISSION'

    deadlineQueue.push({
      id: task.id,
      leadName: task.lead.name,
      department: deadlineSummaryMap[departmentKey].department,
      phaseLabel: task.phaseType === 'QUOTATION' ? 'Quotation' : 'CAD',
      statusLabel,
      dueAtText: task.dueAt.toLocaleDateString('en-US'),
      completedAtText: task.completedAt ? task.completedAt.toLocaleDateString('en-US') : 'Not submitted',
      href: `/crm/admin/leads/${task.lead.id}`,
      priority: statusLabel === 'LATE_SUBMISSION' ? 0 : statusLabel === 'DEADLINE_MISSED' ? 1 : 2,
      orderTime: (task.completedAt ?? task.dueAt).getTime(),
    })
  }

  deadlineQueue.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.orderTime - b.orderTime
  })

  const deadlineQueueItems: DeadlineQueueItem[] = deadlineQueue.map((item) => ({
    id: item.id,
    leadName: item.leadName,
    department: item.department,
    phaseLabel: item.phaseLabel,
    statusLabel: item.statusLabel,
    dueAtText: item.dueAtText,
    completedAtText: item.completedAtText,
    href: item.href,
  }))

  const deadlineSummary: DeadlineSummary[] = [
    { key: 'jr', ...deadlineSummaryMap.jr },
    { key: 'quotation', ...deadlineSummaryMap.quotation },
    { key: 'visualizer', ...deadlineSummaryMap.visualizer },
  ]

  const seniorWorkDays: SeniorWorkDay[] = [0, 1, 2].map((offset) => {
    const date = addDays(todayStart, offset)
    const key = format(date, 'yyyy-MM-dd')
    return {
      key,
      label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : 'Day After Tomorrow',
      dateText: format(date, 'EEE, MMM d'),
      items: [],
    }
  })

  const dayMap = new Map(seniorWorkDays.map((d) => [d.key, d]))

  for (const meeting of seniorThreeDayMeetings) {
    const dayKey = format(meeting.startsAt, 'yyyy-MM-dd')
    const day = dayMap.get(dayKey)
    if (!day) continue
    day.items.push({
      id: `m-${meeting.id}`,
      title: meeting.lead.name,
      subtitle: `${meeting.type.replaceAll('_', ' ')} - ${meeting.title}`,
      timeText: meeting.startsAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      href: `/crm/admin/leads/${meeting.lead.id}`,
      tone: 'meeting',
    })
  }

  for (const task of seniorThreeDayTasks) {
    const dayKey = format(task.dueAt, 'yyyy-MM-dd')
    const day = dayMap.get(dayKey)
    if (!day) continue
    day.items.push({
      id: `t-${task.id}`,
      title: task.lead.name,
      subtitle: `${task.phaseType} deadline`,
      timeText: task.dueAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      href: `/crm/admin/leads/${task.lead.id}`,
      tone: task.status === 'COMPLETED' ? 'completed' : 'deadline',
    })
  }

  seniorWorkDays.forEach((day) => {
    day.items.sort((a, b) => a.timeText.localeCompare(b.timeText))
  })

  const reviewWaitingItems: ReviewWaitingItem[] = reviewWaitingItemsRaw.map((item) => ({
    id: item.id,
    leadId: item.lead.id,
    leadName: item.lead.name,
    source: item.lead.stage === 'CAD_PHASE' ? 'JR Architect' : item.lead.stage === 'QUOTATION_PHASE' ? 'Quotation Team' : '3D Visualizer',
    submittedBy: item.submittedBy.fullName,
    submittedAtText: item.submittedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    filesCount: item.files.length,
  }))


  const visualizationCompletionItems: VisualizationCompletionItem[] = visualizationCompletionRaw.map((item) => ({
    submissionId: item.id,
    leadId: item.lead.id,
    leadName: item.lead.name,
    statusLabel: item.lead.subStatus === LeadSubStatus.CLIENT_APPROVED ? 'VISUALIZATION_APPROVED' : 'IN_VISUALIZATION',
    submittedAtText: item.submittedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    submittedBy: item.submittedBy.fullName,
    fileCount: item.files.length,
    primaryDownloadUrl: item.files[0]?.url ?? null,
  }))

  const quotationApprovedBudgetItems: QuotationApprovedBudgetItem[] = quotationApprovedBudgetLeadsRaw.map((lead) => ({
    leadId: lead.id,
    leadName: lead.name,
    budget: lead.budget,
    quotationType: lead.quotationType,
  }))

  const pulseMetrics: Metric[] = [
    { label: 'Total Active Leads', value: activeLeads, note: 'Active pipeline volume in current timeframe.', href: '/crm/admin/leads?view=active' },
    { label: "Today's Missed Deadlines", value: todayMissedDeadlines, note: 'Visits/CAD/Budget/Meeting tasks crossed deadline today.', href: '/crm/admin/calendar?filter=missed-today', critical: true },
    { label: 'Total Review Backlog', value: totalReviewBacklog, note: 'Items waiting for Senior CRM action in Review Center.', href: '/crm/admin/review-center?myLeadsOnly=false' },
    { label: 'Active Projects', value: activeProjects, note: 'Workload in CAD + Budget + Review pipelines.', href: '/crm/admin/design-queue?filter=active' },
  ]

  const meetingMetrics: Metric[] = [
    { label: 'Awaiting Schedule', value: awaitingSchedule, note: 'CAD approved but no meeting set by Senior CRM.', href: '/crm/admin/meeting-queue?filter=cad-approved-no-meeting' },
    { label: 'Awaiting Execution', value: awaitingExecution, note: 'First meeting set and waiting for meeting time.', href: '/crm/admin/meeting-queue?filter=awaiting-execution' },
    { label: 'Awaiting Outcome', value: awaitingOutcome, note: 'Meeting time passed but outcome not submitted.', href: '/crm/admin/meeting-queue?filter=awaiting-outcome' },
  ]

  const reviewMetrics: Metric[] = [
    { label: 'Junior Architect Reviews', value: reviewJa, note: 'Layouts/plans pending approval.', href: '/crm/admin/review-center?source=jr-architect' },
    { label: 'Quotation Team Reviews', value: reviewQt, note: 'Budget/pricing approvals pending.', href: '/crm/admin/review-center?source=quotation-team' },
    { label: '3D Visualizer Reviews', value: reviewViz, note: 'Render approvals pending.', href: '/crm/admin/review-center?source=3d-visualizer' },
  ]

  const visitControlMetrics: Metric[] = [
    {
      label: 'This Week Scheduled Visits',
      value: weeklyScheduledVisits,
      note: 'Total visits scheduled in current week window (Mon-Sun).',
      href: '/crm/admin/visits?status=scheduled&range=this-week',
    },
    {
      label: 'Overdue Visit Results',
      value: overdueVisitResults,
      note: 'Visit date/time passed, but visit team still did not submit the result.',
      href: '/crm/admin/visits?status=pending&filter=overdue-result',
      critical: true,
    },
    {
      label: 'Visit Queue Pending Assignment',
      value: visitQueue,
      note: 'Still waiting for JR Architect assignment; not yet entered CAD phase.',
      href: '/crm/admin/queue?filter=waiting-jr-assign',
      critical: visitQueue > 0,
    },
  ]

  const pageFlowMetrics: Metric[] = [
    {
      label: '1) Visits Page (Scheduled/Pending)',
      value: pendingVisitData,
      note: 'Leads currently on visit schedule workflow awaiting full visit completion data.',
      href: '/crm/admin/visits',
    },
    {
      label: '2) Visit Queue',
      value: visitQueue,
      note: 'Visit-completed handoff waiting for JR Architect assignment.',
      href: '/crm/admin/queue',
      critical: visitQueue > 0,
    },
    {
      label: '3) CAD Queue',
      value: cadQueue,
      note: 'Leads currently inside CAD phase.',
      href: '/crm/admin/cad-phase-queue?queueType=cad-phase',
    },
    {
      label: '4) Review Center',
      value: totalReviewBacklog,
      note: 'Total review submissions pending Senior CRM review (JR + Quotation + 3D).',
      href: '/crm/admin/review-center',
    },
    {
      label: '5) Meeting Queue',
      value: meetingQueueTotal,
      note: 'Awaiting schedule/execution/outcome plus missed meetings.',
      href: '/crm/admin/meeting-queue',
      critical: meetingQueueTotal > 0,
    },
    {
      label: '6) Budget Queue',
      value: budgetQueueTotal,
      note: 'Quotation phase and Senior CRM budget phase combined.',
      href: '/crm/admin/budget-queue',
    },
    {
      label: '7) Design Queue',
      value: activeProjects,
      note: `Combined CAD + Budget + Review workload in design pipeline. Current data count: ${activeProjects}.`,
      href: '/crm/admin/design-queue?filter=active',
    },
  ]

  const redAlerts: Metric[] = [
    { label: 'Missed Meetings', value: missedMeetings, note: 'Meeting date/time passed without CRM update.', href: '/crm/admin/meeting-queue?filter=missed', critical: true },
    { label: 'Missed Project Deadlines', value: missedProjectDeadlines, note: 'JR Architect/Quotation/3D tasks overdue.', href: '/crm/admin/calendar?filter=missed-deadline', critical: true },
    { label: 'Pending Visit Data', value: pendingVisitData, note: `Cancelled/Rescheduled MTD: ${cancelledMtd + rescheduledMtd}.`, href: '/crm/admin/visits?status=pending', critical: true },
  ]

  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/20">
      <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <HeroSection />

        <MetricsGridSection metrics={pulseMetrics} />

        <LeadVisitOperationsSection
          leadFlowStages={leadFlowStages}
          metrics={[
            { label: 'Pending Visit Data', value: pendingVisitData, note: `Cancelled/Rescheduled MTD: ${cancelledMtd + rescheduledMtd}. Pending means visit team did not submit final data.`, href: '/crm/admin/visits?status=pending', critical: true },
            { label: 'Visit Queue (Unassigned)', value: visitQueue, note: 'Visit data is ready, but JR Architect Leader has not assigned to any JR Architect.', href: '/crm/admin/queue?filter=waiting-jr-assign', critical: visitQueue > 0 },
          ]}
        />

        <VisitControlTowerSection metrics={visitControlMetrics} />

        <DataFlowStatsSection metrics={pageFlowMetrics} />

        <MetricCardSection
          title="CAD and Department Delivery Watch"
          metrics={[
            { label: 'CAD Queue', value: cadQueue, note: 'How many leads are still inside CAD phase and need department movement.', href: '/crm/admin/cad-phase-queue?queueType=cad-phase' },
            { label: 'Senior Calendar Deadline Risk', value: missedProjectDeadlines, note: 'Deadline monitoring for JR Architect, Quotation Team, and 3D Visualizer tasks.', href: '/crm/admin/calendar?filter=missed-deadline', critical: true },
          ]}
          columns="md:grid-cols-2"
        />

        <MetricCardSection
          title="Meeting Queue Intelligence"
          description="Queue meaning: CAD approved without meeting means Senior CRM did not schedule yet. First meeting set means waiting for meeting completion. Missed meeting means date/time passed but completion/outcome data is still missing."
          metrics={[
            ...meetingMetrics,
            { label: 'Missed Meetings', value: missedMeetings, note: 'Meeting passed, but no completion update submitted by Senior CRM.', href: '/crm/admin/meeting-queue?filter=missed', critical: true },
            { label: 'Meeting Command Actions', value: awaitingSchedule + awaitingExecution + awaitingOutcome, note: 'Total active meeting queue requiring immediate admin supervision.', href: '/crm/admin/meeting-queue' },
          ]}
        />

        <MetricCardSection
          title="Budget and Quotation Control"
          metrics={[
            { label: 'Budget Queue', value: budgetQueueTotal, note: `Quotation Phase: ${quotationQueue} · Senior CRM Budget Phase: ${srBudgetQueue}.`, href: '/crm/admin/budget-queue?filter=needs-action' },
            { label: 'Budget Deadlines Missed', value: missedBudgetDeadlines, note: 'Deadlines crossed in quotation/budget steps, including meeting reminder follow-up risk.', href: '/crm/admin/budget-queue?filter=missed-deadline', critical: true },
          ]}
          columns="md:grid-cols-2"
        />

        <MetricCardSection
          title="Review Center Split by Source Team"
          description="Senior CRM performs the review, and admin should monitor source backlog separately for JR Architect, Quotation Team, and 3D Visualizer."
          metrics={reviewMetrics}
        />

        <SeniorThreeDayCalendarSection days={seniorWorkDays} />

        <ReviewWaitingSection totalWaiting={totalReviewBacklog} items={reviewWaitingItems.slice(0, 10)} />

        <VisualizationCompletionSection items={visualizationCompletionItems} />

        <QuotationApprovedBudgetSection items={quotationApprovedBudgetItems} />

        <DeadlineSubmissionSection summary={deadlineSummary} queue={deadlineQueue.slice(0, 10).map((item) => ({ id: item.id, leadName: item.leadName, department: item.department, phaseLabel: item.phaseLabel, statusLabel: item.statusLabel, dueAtText: item.dueAtText, completedAtText: item.completedAtText, href: item.href }))} />

        <AlertSection metrics={redAlerts} />

        <ActionLauncherSection />
      </main>
    </div>
  )
}
