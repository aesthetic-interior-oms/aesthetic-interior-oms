import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download } from 'lucide-react'

type Metric = {
  label: string
  value: number
  note: string
  href: string
  critical?: boolean
}

type LeadStageMetric = {
  stage: string
  value: number
  href: string
}

type DeadlineSummary = {
  key: string
  department: string
  missed: number
  late: number
  onTime: number
}

type DeadlineQueueItem = {
  id: string
  leadName: string
  department: string
  phaseLabel: string
  statusLabel: 'LATE_SUBMISSION' | 'DEADLINE_MISSED' | 'ON_TIME_SUBMISSION'
  dueAtText: string
  completedAtText: string
  href: string
}

type SeniorWorkDay = {
  key: string
  label: string
  dateText: string
  items: Array<{
    id: string
    title: string
    subtitle: string
    timeText: string
    href: string
    tone: 'meeting' | 'deadline' | 'completed'
  }>
}

type ReviewWaitingItem = {
  id: string
  leadId: string
  leadName: string
  source: string
  submittedBy: string
  submittedAtText: string
  filesCount: number
}



type VisualizationCompletionItem = {
  submissionId: string
  leadId: string
  leadName: string
  statusLabel: 'IN_VISUALIZATION' | 'VISUALIZATION_APPROVED'
  submittedAtText: string
  submittedBy: string
  fileCount: number
  primaryDownloadUrl: string | null
}

type QuotationApprovedBudgetItem = {
  leadId: string
  leadName: string
  budget: number | null
  quotationType: string | null
}

export function MetricRow({ metric }: { metric: Metric }) {
  return (
    <Link href={metric.href} className="block">
      <div className={`flex items-center justify-between rounded-md border p-3 transition hover:border-primary/60 hover:shadow-sm ${metric.critical ? 'border-red-200 bg-red-50/50' : ''}`}>
        <div>
          <p className="text-sm font-medium">{metric.label}</p>
          <p className="text-xs text-muted-foreground">{metric.note}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-semibold ${metric.critical ? 'text-red-600' : ''}`}>{metric.value}</span>
          <span className="text-xs text-primary">View List -&gt;</span>
        </div>
      </div>
    </Link>
  )
}

export function HeroSection() {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1">Admin Operations Layer</Badge>
          <h1 className="max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">Admin Command Center</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Monitor every department from one page: leads, visits, visit queue handoffs, CAD flow, meeting queue,
            budget progression, review split, and deadline risk. Open any module instantly and take action as admin.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild><Link href="/crm/admin/calendar?filter=missed-today">Open Today&apos;s Risk</Link></Button>
            <Button asChild variant="outline"><Link href="/crm/admin/dashboard">Open Admin Dashboard</Link></Button>
            <Button asChild variant="outline"><Link href="/crm/admin/leads?view=active">Open Lead Pipeline</Link></Button>
          </div>
        </div>
        <div className="border-t border-border/70 bg-muted/30 p-6 lg:border-l lg:border-t-0">
          <p className="text-sm font-semibold">How to use this page</p>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>1. Start with Pulse to see volume and immediate risk.</li>
            <li>2. Open department blocks to clear handoff bottlenecks.</li>
            <li>3. Use Red Alert and calendars to recover missed deadlines.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

export function MetricsGridSection({ metrics }: { metrics: Metric[] }) {
  return <section className="grid gap-4 md:grid-cols-2">{metrics.map((m) => <MetricRow key={m.label} metric={m} />)}</section>
}

export function LeadVisitOperationsSection({ leadFlowStages, metrics }: { leadFlowStages: LeadStageMetric[]; metrics: Metric[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead and Visit Operations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Leads page shows total lead list and stage distribution by timeframe. Visits page tracks schedules and monthly status
          breakdown where pending means visit team has not yet submitted visit data.
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          {leadFlowStages.map((stage) => (
            <Link key={stage.stage} href={stage.href} className="rounded-md border p-3 text-sm transition hover:border-primary/60">
              <p className="font-medium">{stage.stage.replaceAll('_', ' ')}</p>
              <p className="text-2xl font-semibold">{stage.value}</p>
              <p className="text-xs text-muted-foreground">Open stage list</p>
            </Link>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-2">{metrics.map((m) => <MetricRow key={m.label} metric={m} />)}</div>
      </CardContent>
    </Card>
  )
}

export function MetricCardSection({ title, description, metrics, columns = 'md:grid-cols-3' }: { title: string; description?: string; metrics: Metric[]; columns?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        <div className={`grid gap-2 ${columns}`}>{metrics.map((m) => <MetricRow key={m.label} metric={m} />)}</div>
      </CardContent>
    </Card>
  )
}

export function AlertSection({ metrics }: { metrics: Metric[] }) {
  return (
    <Card className="border-red-300">
      <CardHeader>
        <CardTitle className="text-red-700">Red Alert</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-3">{metrics.map((m) => <MetricRow key={m.label} metric={m} />)}</CardContent>
    </Card>
  )
}

export function ActionLauncherSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Action Launcher</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href="/crm/admin/leads">Leads</Link></Button>
        <Button asChild variant="outline"><Link href="/crm/admin/visits">Visits</Link></Button>
        <Button asChild variant="outline"><Link href="/crm/admin/queue">Visit Queue</Link></Button>
        <Button asChild variant="outline"><Link href="/crm/admin/cad-phase-queue?queueType=cad-phase">CAD Queue</Link></Button>
        <Button asChild variant="outline"><Link href="/crm/admin/meeting-queue">Meeting Queue</Link></Button>
        <Button asChild variant="outline"><Link href="/crm/admin/budget-queue">Budget Queue</Link></Button>
        <Button asChild variant="outline"><Link href="/crm/admin/review-center">Review Center</Link></Button>
        <Button asChild variant="outline"><Link href="/crm/admin/calendar">Master Calendar</Link></Button>
        <Button asChild variant="outline"><Link href="/crm/admin/calendar?dept=JR_ARCHITECT">JR Architect Calendar</Link></Button>
        <Button asChild variant="outline"><Link href="/crm/admin/calendar?dept=QUOTATION_TEAM">Quotation Calendar</Link></Button>
        <Button asChild variant="outline"><Link href="/crm/admin/calendar?dept=3D_VISUALIZER">3D Visualizer Calendar</Link></Button>
      </CardContent>
    </Card>
  )
}

export function DeadlineSubmissionSection({
  summary,
  queue,
}: {
  summary: DeadlineSummary[]
  queue: DeadlineQueueItem[]
}) {
  const toneClass = (status: DeadlineQueueItem['statusLabel']) => {
    if (status === 'LATE_SUBMISSION') return 'bg-red-100 text-red-700'
    if (status === 'DEADLINE_MISSED') return 'bg-amber-100 text-amber-800'
    return 'bg-emerald-100 text-emerald-700'
  }

  const statusText = (status: DeadlineQueueItem['statusLabel']) => {
    if (status === 'LATE_SUBMISSION') return 'Late Submission'
    if (status === 'DEADLINE_MISSED') return 'Deadline Missed'
    return 'On-time Submission'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deadline Submission Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Department-level deadline behavior for JR Architect (CAD), Quotation Team (Quotation), and 3D Visualizer.
          Queue is ordered by urgency: late submission first, then missed deadline, then on-time submission.
        </p>

        <div className="grid gap-2 md:grid-cols-3">
          {summary.map((row) => (
            <div key={row.key} className="rounded-md border p-3">
              <p className="text-sm font-semibold">{row.department}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Missed</p>
                  <p className="text-lg font-semibold text-amber-700">{row.missed}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Late</p>
                  <p className="text-lg font-semibold text-red-700">{row.late}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">On-time</p>
                  <p className="text-lg font-semibold text-emerald-700">{row.onTime}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {queue.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No submission records in this queue right now.</p>
          ) : (
            queue.map((item) => (
              <Link key={item.id} href={item.href} className="block rounded-md border p-3 transition hover:border-primary/60 hover:shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.leadName}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneClass(item.statusLabel)}`}>{statusText(item.statusLabel)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.department} - {item.phaseLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">Due: {item.dueAtText} · Submitted: {item.completedAtText}</p>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function SeniorThreeDayCalendarSection({ days }: { days: SeniorWorkDay[] }) {
  const toneClass = (tone: SeniorWorkDay['items'][number]['tone']) => {
    if (tone === 'completed') return 'bg-emerald-100 text-emerald-700'
    if (tone === 'deadline') return 'bg-amber-100 text-amber-800'
    return 'bg-violet-100 text-violet-700'
  }

  const toneText = (tone: SeniorWorkDay['items'][number]['tone']) => {
    if (tone === 'completed') return 'Completed'
    if (tone === 'deadline') return 'Task Deadline'
    return 'Meeting'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Senior CRM 3-Day Calendar Watch</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Admin view of Senior CRM calendar workload for today, tomorrow, and the next day including meetings and deadline tasks.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {days.map((day) => (
            <div key={day.key} className="rounded-md border p-3">
              <p className="text-sm font-semibold">{day.label}</p>
              <p className="text-xs text-muted-foreground">{day.dateText}</p>
              <div className="mt-3 space-y-2">
                {day.items.length === 0 ? (
                  <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">No scheduled work.</p>
                ) : (
                  day.items.map((item) => (
                    <Link key={item.id} href={item.href} className="block rounded-md border p-2 transition hover:border-primary/60">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold">{item.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${toneClass(item.tone)}`}>{toneText(item.tone)}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{item.subtitle}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{item.timeText}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ReviewWaitingSection({
  totalWaiting,
  items,
}: {
  totalWaiting: number
  items: ReviewWaitingItem[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Center Waiting Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Total waiting for review</p>
          <p className="text-2xl font-bold">{totalWaiting}</p>
        </div>
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No data is currently waiting in Review Center.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <Link key={item.id} href={`/crm/admin/leads/${item.leadId}`} className="block rounded-md border p-3 transition hover:border-primary/60 hover:shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.leadName}</p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Waiting</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.source} • Submitted by {item.submittedBy}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.filesCount} file{item.filesCount === 1 ? '' : 's'} • {item.submittedAtText}</p>
              </Link>
            ))}
            <div className="pt-1">
              <Button asChild variant="outline" size="sm">
                <Link href="/crm/admin/review-center">Open Review Center</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}



export function VisualizationCompletionSection({ items }: { items: VisualizationCompletionItem[] }) {
  const statusTone = (status: VisualizationCompletionItem['statusLabel']) =>
    status === 'VISUALIZATION_APPROVED'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-800'

  const statusText = (status: VisualizationCompletionItem['statusLabel']) =>
    status === 'VISUALIZATION_APPROVED' ? 'Visualization Approved' : 'Visualization Submitted'

  const downloadUrl = (url: string) => (url.includes('?') ? `${url}&download=1` : `${url}?download=1`)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visualization Design Completion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Track leads that reached visualization submission and approved state. Download the latest design file directly from this command center section.
        </p>
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No visualization design submissions found right now.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.submissionId} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/crm/admin/leads/${item.leadId}`} className="text-sm font-semibold hover:underline">{item.leadName}</Link>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(item.statusLabel)}`}>{statusText(item.statusLabel)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Submitted by {item.submittedBy} • {item.submittedAtText}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">{item.fileCount} design file{item.fileCount === 1 ? '' : 's'}</p>
                  {item.primaryDownloadUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={downloadUrl(item.primaryDownloadUrl)} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1 h-3.5 w-3.5" /> Download design
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function QuotationApprovedBudgetSection({ items }: { items: QuotationApprovedBudgetItem[] }) {
  const formatMoney = (value: number | null) => {
    if (!value || value <= 0) return "Budget not set"
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quotation Approved Budget Cards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Approved quotation leads entering budget queue with selected quotation type and submitted budget amount.
        </p>
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No quotation-approved leads available right now.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {items.map((item) => (
              <Link key={item.leadId} href={`/crm/admin/leads/${item.leadId}`} className="block rounded-md border p-3 transition hover:border-primary/60 hover:shadow-sm">
                <p className="text-sm font-semibold">{item.leadName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Quotation Type: <span className="font-medium text-foreground">{item.quotationType ?? "Not set"}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Budget: <span className="font-medium text-foreground">{formatMoney(item.budget)}</span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { Metric, LeadStageMetric, DeadlineSummary, DeadlineQueueItem, SeniorWorkDay, ReviewWaitingItem, QuotationApprovedBudgetItem, VisualizationCompletionItem }
