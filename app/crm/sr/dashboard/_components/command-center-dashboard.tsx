import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  DraftingCompass,
  FileCheck2,
  Gauge,
  Handshake,
  IndianRupee,
  LayoutDashboard,
  MapPinned,
  TimerReset,
  UsersRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CrmPageHeader } from '@/components/crm/shared/page-header'

export const queueLinks = {
  cad: '/crm/sr/cad-phase-queue',
  review: '/crm/sr/review-center',
  visit: '/crm/sr/queue',
  meeting: '/crm/sr/meeting-queue',
  budget: '/crm/sr/budget-queue',
}

export type PriorityAction = {
  id: string
  title: string
  label: string
  detail: string
  href: string
  tone: 'critical' | 'warning' | 'info' | 'success'
  time?: Date | null
}

type CommandCenterDashboardProps = {
  currentUserName: string | null
  queueCounts: {
    cad: number
    review: number
    visit: number
    meeting: number
    budget: number
  }
  priorityActions: PriorityAction[]
  upcomingMeetings: UpcomingMeetingItem[]
  budgetLeads: BudgetLeadItem[]
  reviewSubmissions: ReviewSubmissionItem[]
}

type UpcomingMeetingItem = {
  id: string
  type: string
  startsAt: Date
  lead: {
    id: string
    name: string
    subStatus: string | null
  }
}

type BudgetLeadItem = {
  id: string
  name: string
  budget: number | null
  subStatus: string | null
  assignments: Array<{
    user: {
      fullName: string
    }
  }>
}

type ReviewSubmissionItem = {
  id: string
  submittedAt: Date
  lead: {
    name: string
    location: string | null
  }
  submittedBy: {
    fullName: string
  }
  files: Array<{ id: string }>
}

export function formatLabel(value: string | null | undefined): string {
  if (!value) return 'N/A'
  if (value === 'DISCOVERY') return 'Consulting Phase'
  if (value === 'PROPOSAL_SENT') return 'Quotation Sent'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatRelativeTime(value: Date | null | undefined): string {
  if (!value) return 'Needs attention'
  const diffMs = value.getTime() - Date.now()
  const absMs = Math.abs(diffMs)
  const minutes = Math.round(absMs / (1000 * 60))
  const hours = Math.round(absMs / (1000 * 60 * 60))
  const days = Math.round(absMs / (1000 * 60 * 60 * 24))

  if (minutes < 60) return diffMs >= 0 ? `in ${minutes}m` : `${minutes}m overdue`
  if (hours < 24) return diffMs >= 0 ? `in ${hours}h` : `${hours}h overdue`
  return diffMs >= 0 ? `in ${days}d` : `${days}d overdue`
}

function formatMoney(value: number | null | undefined): string {
  if (!value || value <= 0) return 'Budget not set'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function CommandCenterHero({ firstPriorityHref }: { firstPriorityHref: string }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <Badge variant="secondary" className="mb-4 gap-1.5 rounded-full px-3 py-1">
            <LayoutDashboard className="size-3.5" />
            Senior CRM command layer
          </Badge>
          <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Control every department handoff from one dashboard.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Track CAD progress, approve department submissions, monitor visit outputs, schedule client meetings,
            and move quotation work into budget discussions without jumping between multiple pages first.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={firstPriorityHref}>
                Open highest priority
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/crm/sr/lead-journey">View lead journey</Link>
            </Button>
          </div>
        </div>
        <OperatingPolicyPanel />
      </div>
    </section>
  )
}

function OperatingPolicyPanel() {
  return (
    <div className="border-t border-border/70 bg-muted/30 p-6 lg:border-l lg:border-t-0">
      <p className="text-sm font-semibold text-foreground">Today&apos;s operating policy</p>
      <div className="mt-4 space-y-3">
        <div className="flex gap-3 rounded-xl border border-border/70 bg-background p-3">
          <Gauge className="mt-0.5 size-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Scan status cards first</p>
            <p className="text-xs text-muted-foreground">Find queue load and bottlenecks instantly.</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl border border-border/70 bg-background p-3">
          <TimerReset className="mt-0.5 size-4 text-destructive" />
          <div>
            <p className="text-sm font-medium">Handle Priority Action next</p>
            <p className="text-xs text-muted-foreground">Overdue CAD and approval waits surface automatically.</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl border border-border/70 bg-background p-3">
          <BadgeCheck className="mt-0.5 size-4 text-emerald-600" />
          <div>
            <p className="text-sm font-medium">Then clear meetings and budgets</p>
            <p className="text-xs text-muted-foreground">Keep client-facing decisions moving.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function QueueStatusGrid({ counts }: { counts: CommandCenterDashboardProps['queueCounts'] }) {
  const queueCards = [
    {
      title: 'CAD Queue',
      value: counts.cad,
      subtitle: 'CAD activity, assignments, deadlines',
      href: queueLinks.cad,
      icon: DraftingCompass,
      accent: 'text-sky-600 bg-sky-500/10 border-sky-500/20',
    },
    {
      title: 'Review Center',
      value: counts.review,
      subtitle: 'CAD submissions needing approval',
      href: queueLinks.review,
      icon: ClipboardCheck,
      accent: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Visit Queue',
      value: counts.visit,
      subtitle: 'Completed visits ready for CAD handoff',
      href: queueLinks.visit,
      icon: MapPinned,
      accent: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Meeting Queue',
      value: counts.meeting,
      subtitle: 'CAD-approved and active meeting leads',
      href: queueLinks.meeting,
      icon: Handshake,
      accent: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
    },
    {
      title: 'Budget Queue',
      value: counts.budget,
      subtitle: 'Quotation activity and budget meetings',
      href: queueLinks.budget,
      icon: IndianRupee,
      accent: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
    },
  ]

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {queueCards.map((queue) => {
        const Icon = queue.icon
        return (
          <Link key={queue.title} href={queue.href} className="group rounded-xl focus:outline-none focus:ring-2 focus:ring-ring">
            <Card className="h-full border-border/70 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex size-11 items-center justify-center rounded-xl border ${queue.accent}`}>
                    <Icon className="size-5" />
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-5 text-sm font-medium text-muted-foreground">{queue.title}</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-3xl font-bold tracking-tight text-foreground">{queue.value}</span>
                  <span className="pb-1 text-xs text-muted-foreground">open</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{queue.subtitle}</p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </section>
  )
}

function PriorityActionCard({
  currentUserName,
  priorityActions,
}: {
  currentUserName: string | null
  priorityActions: PriorityAction[]
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <TimerReset className="size-4 text-primary" />
            Priority Action
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Most urgent cross-department items for {currentUserName ?? 'Senior CRM'}.
          </p>
        </div>
        <Badge variant="outline">{priorityActions.length} surfaced</Badge>
      </CardHeader>
      <CardContent>
        {priorityActions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <FileCheck2 className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">No urgent action right now</p>
            <p className="mt-1 text-xs text-muted-foreground">All monitored queues are currently clear of critical handoffs.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {priorityActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="group flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-background p-4 transition hover:border-primary/40 hover:bg-accent/20"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={action.tone === 'critical' ? 'destructive' : 'secondary'}
                      className="rounded-full"
                    >
                      {action.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(action.time)}</span>
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-foreground">{action.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.detail}</p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UpcomingMeetingsCard({ upcomingMeetings }: { upcomingMeetings: UpcomingMeetingItem[] }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-primary" />
          Upcoming Meetings
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/crm/sr/meetings">Calendar</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingMeetings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No first or budget meetings scheduled in the next 7 days.</p>
        ) : (
          upcomingMeetings.map((meeting) => (
            <Link key={meeting.id} href={`/crm/sr/leads/${meeting.lead.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 transition hover:border-primary/40 hover:bg-accent/20">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{meeting.lead.name}</p>
                <p className="text-xs text-muted-foreground">{formatLabel(meeting.type)} • {formatRelativeTime(meeting.startsAt)}</p>
              </div>
              <Badge variant="outline">{formatLabel(meeting.lead.subStatus)}</Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function BudgetQuotationWatchCard({ budgetLeads }: { budgetLeads: BudgetLeadItem[] }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <IndianRupee className="size-4 text-primary" />
          Budget & Quotation Watch
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href={queueLinks.budget}>Open hub</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {budgetLeads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No active quotation or budget records in your queue.</p>
        ) : (
          budgetLeads.map((lead) => (
            <Link key={lead.id} href={`/crm/sr/leads/${lead.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 transition hover:border-primary/40 hover:bg-accent/20">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{lead.name}</p>
                <p className="text-xs text-muted-foreground">{lead.assignments[0]?.user.fullName ?? 'Quotation team'} • {formatMoney(lead.budget)}</p>
              </div>
              <Badge variant="secondary">{formatLabel(lead.subStatus)}</Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function ReviewSnapshotCard({ reviewSubmissions }: { reviewSubmissions: ReviewSubmissionItem[] }) {
  return (
    <Card className="border-border/70 shadow-sm lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="size-4 text-primary" />
          Review Center Snapshot
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href={queueLinks.review}>Review all</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviewSubmissions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No CAD submissions are waiting for final approval.</p>
        ) : (
          reviewSubmissions.map((submission) => (
            <Link key={submission.id} href={queueLinks.review} className="grid gap-3 rounded-xl border border-border/70 p-4 transition hover:border-primary/40 hover:bg-accent/20 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-semibold text-foreground">{submission.lead.name}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{submission.submittedBy.fullName}</span>
                  <span>•</span>
                  <span>{submission.files.length} file{submission.files.length === 1 ? '' : 's'}</span>
                  {submission.lead.location ? <><span>•</span><span>{submission.lead.location}</span></> : null}
                </div>
              </div>
              <Badge variant="outline" className="h-fit justify-self-start sm:justify-self-end">{formatRelativeTime(submission.submittedAt)}</Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function CommandShortcutsCard() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UsersRound className="size-4 text-primary" />
          Command Shortcuts
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button asChild variant="outline" className="justify-between">
          <Link href={queueLinks.cad}>CAD Queue <ArrowRight className="size-4" /></Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link href={queueLinks.visit}>Visit Queue <ArrowRight className="size-4" /></Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link href={queueLinks.meeting}>Meeting Queue <ArrowRight className="size-4" /></Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link href={queueLinks.budget}>Budget Queue <ArrowRight className="size-4" /></Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link href="/crm/sr/handoffs">Handoff Center <ArrowRight className="size-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function CommandCenterDashboard({
  currentUserName,
  queueCounts,
  priorityActions,
  upcomingMeetings,
  budgetLeads,
  reviewSubmissions,
}: CommandCenterDashboardProps) {
  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/20">
      <CrmPageHeader
        title="Command Center"
        subtitle="One-page control room for Senior CRM queue monitoring, approvals, visits, meetings, and budget work."
      />

      <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <CommandCenterHero firstPriorityHref={priorityActions[0]?.href ?? queueLinks.review} />
        <QueueStatusGrid counts={queueCounts} />

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <PriorityActionCard currentUserName={currentUserName} priorityActions={priorityActions} />
          <div className="grid gap-6">
            <UpcomingMeetingsCard upcomingMeetings={upcomingMeetings} />
            <BudgetQuotationWatchCard budgetLeads={budgetLeads} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <ReviewSnapshotCard reviewSubmissions={reviewSubmissions} />
          <CommandShortcutsCard />
        </section>
      </main>
    </div>
  )
}
