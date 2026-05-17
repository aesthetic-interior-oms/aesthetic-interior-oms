import Link from 'next/link'
import { endOfDay, startOfDay, startOfMonth } from 'date-fns'
import { LeadStage, LeadSubStatus } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Metric = {
  label: string
  value: number
  note: string
  href: string
  critical?: boolean
}

function MetricRow({ metric }: { metric: Metric }) {
  return (
    <Link href={metric.href} className="block">
      <div className="flex items-center justify-between rounded-md border p-3 transition hover:border-primary/60 hover:shadow-sm">
        <div>
          <p className="text-sm font-medium">{metric.label}</p>
          <p className="text-xs text-muted-foreground">{metric.note}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-semibold ${metric.critical ? 'text-red-600' : ''}`}>{metric.value}</span>
          <span className="text-xs text-primary">View List →</span>
        </div>
      </div>
    </Link>
  )
}

export default async function AdminCommandCenterPage() {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const monthStart = startOfMonth(now)

  const [
    stageCounts,
    activeLeads,
    pendingVisitData,
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
  ])

  const totalReviewBacklog = reviewJa + reviewQt + reviewViz
  const activeProjects = cadProjects + budgetProjects + totalReviewBacklog
  const todayMissedDeadlines = missedMeetings + missedProjectDeadlines

  const leadStageMap = new Map(stageCounts.map((x: { stage: LeadStage; _count: { stage: number } }) => [x.stage, x._count.stage]))
  const leadFlowStages = [LeadStage.NEW, LeadStage.CONTACT_ATTEMPTED, LeadStage.VISIT_SCHEDULED]

  const pulseMetrics: Metric[] = [
    { label: 'Total Active Leads', value: activeLeads, note: 'Active pipeline volume in current timeframe.', href: '/crm/admin/leads?view=active' },
    { label: "Today's Missed Deadlines", value: todayMissedDeadlines, note: 'Visits/CAD/Budget/Meeting tasks crossed deadline today.', href: '/crm/admin/calendar?filter=missed-today', critical: true },
    { label: 'Total Review Backlog', value: totalReviewBacklog, note: 'Items waiting for Senior CRM action in Review Center.', href: '/crm/admin/review-center?myLeadsOnly=false' },
    { label: 'Active Projects', value: activeProjects, note: 'Workload in CAD + Budget + Review pipelines.', href: '/crm/admin/design-queue?filter=active' },
  ]

  const queueMetrics: Metric[] = [
    { label: 'Visit Queue (Unassigned)', value: visitQueue, note: 'JR Architect Leader not yet assigned to JR Architect.', href: '/crm/admin/queue?filter=waiting-jr-assign' },
    { label: 'CAD Queue', value: cadQueue, note: 'Projects currently sitting in CAD phase.', href: '/crm/admin/cad-phase-queue?queueType=cad-phase' },
    { label: 'Budget Queue', value: quotationQueue + srBudgetQueue, note: `Quotation Phase: ${quotationQueue} · SR CRM Budget Phase: ${srBudgetQueue}.`, href: '/crm/admin/budget-queue?filter=needs-action' },
    { label: 'Budget Deadlines Missed', value: missedBudgetDeadlines, note: 'Quote-specific deadlines already crossed.', href: '/crm/admin/budget-queue?filter=missed-deadline', critical: true },
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

  const redAlerts: Metric[] = [
    { label: 'Missed Meetings', value: missedMeetings, note: 'Meeting date/time passed without CRM update.', href: '/crm/admin/meeting-queue?filter=missed', critical: true },
    { label: 'Missed Project Deadlines', value: missedProjectDeadlines, note: 'JR Architect/Quotation/3D tasks overdue.', href: '/crm/admin/calendar?filter=missed-deadline', critical: true },
    { label: 'Pending Visit Data', value: pendingVisitData, note: `Cancelled/Rescheduled MTD: ${cancelledMtd + rescheduledMtd}.`, href: '/crm/admin/visits?status=pending', critical: true },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Command Center</h1>
          <p className="text-muted-foreground">High-level operational tower for volume, bottlenecks, and missed deadlines.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/crm/admin/calendar">Master Calendar</Link></Button>
          <Button asChild><Link href="/crm/admin/dashboard">Open Dashboard</Link></Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>1) High-Level Performance Metrics (Pulse)</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">{pulseMetrics.map((m) => <MetricRow key={m.label} metric={m} />)}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2) Departmental Status & Queue Trackers</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold">A. Lead & Visit Operations</h3>
            <div className="mb-2 grid gap-2 md:grid-cols-3">
              {leadFlowStages.map((stage) => (
                <Link key={stage} href={`/crm/admin/leads?stage=${stage}`} className="rounded-md border p-2 text-sm transition hover:border-primary/60">
                  <p className="font-medium">{stage.replaceAll('_', ' ')}</p>
                  <p className="text-muted-foreground">{leadStageMap.get(stage) ?? 0}</p>
                </Link>
              ))}
            </div>
            <div className="grid gap-2 md:grid-cols-2">{queueMetrics.slice(0, 1).map((m) => <MetricRow key={m.label} metric={m} />)}</div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">B. Architecture & Design (CAD)</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <MetricRow metric={{ label: 'CAD Queue', value: cadQueue, note: 'Projects currently sitting in CAD phase.', href: '/crm/admin/cad-phase-queue?queueType=cad-phase' }} />
              <MetricRow metric={{ label: 'Junior Architect Deadlines', value: missedProjectDeadlines, note: 'Approaching/overdue architect tasks from calendar.', href: '/crm/admin/calendar?dept=JR_ARCHITECT&filter=deadline-risk' }} />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">C. Budget & Quotation</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <MetricRow metric={{ label: 'Budget Queue', value: quotationQueue + srBudgetQueue, note: `Quotation Phase: ${quotationQueue} · SR CRM Budget Phase: ${srBudgetQueue}.`, href: '/crm/admin/budget-queue?filter=needs-action' }} />
              <MetricRow metric={{ label: 'Budget Deadlines Missed', value: missedBudgetDeadlines, note: 'Quote-specific deadlines already crossed.', href: '/crm/admin/budget-queue?filter=missed-deadline', critical: true }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>3) Meeting Queue & CRM Status</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">{meetingMetrics.map((m) => <MetricRow key={m.label} metric={m} />)}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>4) Review Center (Submission Source Split)</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">{reviewMetrics.map((m) => <MetricRow key={m.label} metric={m} />)}</CardContent>
      </Card>

      <Card className="border-red-300">
        <CardHeader><CardTitle className="text-red-700">5) Red Alert (Missed Deadlines)</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">{redAlerts.map((m) => <MetricRow key={m.label} metric={m} />)}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Master Calendar Integration & Quick Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/crm/admin/calendar?dept=JR_ARCHITECT">JR Architect Calendar</Link></Button>
          <Button asChild variant="outline"><Link href="/crm/admin/calendar?dept=QUOTATION_TEAM">Quotation Calendar</Link></Button>
          <Button asChild variant="outline"><Link href="/crm/admin/calendar?dept=3D_VISUALIZER">3D Visualizer Calendar</Link></Button>
          <Button asChild><Link href="/crm/admin/leads?quick=assign-lead">Quick: Assign Lead</Link></Button>
          <Button asChild><Link href="/crm/admin/budget-queue?quick=force-approve">Quick: Force Approve Budget</Link></Button>
          <Button asChild><Link href="/crm/admin/meeting-queue?quick=reassign-missed">Quick: Reassign Missed Meeting</Link></Button>
        </CardContent>
      </Card>
    </div>
  )
}
