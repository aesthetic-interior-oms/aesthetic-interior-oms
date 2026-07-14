'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  MapPin,
  Navigation,
  TimerReset,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { CrmPageHeader } from '@/components/crm/shared/page-header'

const statusColors = {
  completed: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-300',
  scheduled: 'text-blue-700 bg-blue-500/10 border-blue-500/20 dark:text-blue-300',
  warning: 'text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-300',
  danger: 'text-red-700 bg-red-500/10 border-red-500/20 dark:text-red-300',
  neutral: 'text-slate-700 bg-slate-500/10 border-slate-500/20 dark:text-slate-300',
}

type VisitRecord = {
  id: string
  scheduledAt: string
  location: string
  notes: string | null
  status: string
  projectSqft?: number | null
  projectStatus?: string | null
  lead: { id: string; name: string; phone?: string | null; location: string | null }
  assignedTo?: { id: string; fullName: string; email: string; phone?: string | null } | null
  supportAssignments?: Array<{ id: string; supportUserId: string; supportUser: { id: string; fullName: string; email: string }; result?: { id: string; completedAt: string } | null }>
  supportResults?: Array<{ id: string; supportUserId: string; completedAt: string; projectArea?: string | null; projectStatus?: string | null; extraConcern?: string | null }>
  result?: {
    id: string
    completedAt: string
    summary?: string | null
    measurements?: unknown
    clientMood?: string | null
    clientPotentiality?: string | null
    projectType?: string | null
    clientPersonality?: string | null
    budgetRange?: string | null
    timelineUrgency?: string | null
    stylePreference?: string | null
    files?: unknown[]
  } | null
  updateRequests?: Array<{ id: string; type: string; createdAt: string; requestedBy?: { fullName: string } | null }>
}

type ApiResponse = { success: boolean; data?: VisitRecord[]; error?: string }
type DashboardData = ReturnType<typeof buildDashboardData>
type CurrentUser = { id: string; fullName: string; userDepartments?: Array<{ department?: { name?: string } }> }
type KpiCard = { title: string; value: string; detail: string; icon: LucideIcon; tone: string; href: string }
type ScheduleRow = { id: string; lead: string; area: string; time: string; member: string; status: string; tone: string }
type PriorityAction = { id: string; lead: string; owner: string; scheduledDate: string; missedDays: number; href: string }
type TrendRow = { day: string; scheduled: number; completed: number; pending: number }
type StatusRow = { name: string; value: number; fill: string }

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

function isInRunningMonth(value: string, now = new Date()) {
  const date = new Date(value)
  return date >= startOfMonth(now) && date < new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

function formatVisitTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function formatVisitDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(new Date(value))
}

function completedWithin48Hours(visit: VisitRecord) {
  if (visit.status !== 'COMPLETED' || !visit.result?.completedAt) return false
  const scheduledAt = new Date(visit.scheduledAt).getTime()
  const completedAt = new Date(visit.result.completedAt).getTime()
  return completedAt >= scheduledAt && completedAt - scheduledAt <= 2 * DAY_MS
}

function getVisitStatus(visit: VisitRecord, now = new Date()) {
  if (visit.status === 'COMPLETED') return 'Completed'
  if (visit.status === 'CANCELLED') return 'Cancelled'
  if (visit.status === 'RESCHEDULED') return 'Rescheduled'
  if (visit.updateRequests?.some((request) => request.type === 'RESCHEDULE')) return 'Reschedule Pending'
  if (visit.status === 'SCHEDULED' && new Date(visit.scheduledAt) < startOfDay(now)) return 'Overdue'
  if (!visit.assignedTo) return 'Needs Owner'
  return 'Scheduled'
}

function getToneForStatus(status: string) {
  if (status === 'Completed') return statusColors.completed
  if (status === 'Overdue' || status === 'Cancelled') return statusColors.danger
  if (status.includes('Reschedule') || status === 'Needs Owner') return statusColors.warning
  return statusColors.scheduled
}

function isUserVisit(visit: VisitRecord, userId?: string | null) {
  if (!userId) return false
  return visit.assignedTo?.id === userId || (visit.supportAssignments ?? []).some((assignment) => assignment.supportUserId === userId)
}

function buildDashboardData(visits: VisitRecord[], currentUserId?: string | null, showTeamStats = false) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const visibleVisits = showTeamStats || !currentUserId ? visits : visits.filter((visit) => isUserVisit(visit, currentUserId))
  const visibleMonthVisits = visibleVisits.filter((visit) => isInRunningMonth(visit.scheduledAt, now))
  const visibleTodayVisits = visibleVisits.filter((visit) => isSameDay(new Date(visit.scheduledAt), now))
  const completedMonth = visibleMonthVisits.filter((visit) => visit.status === 'COMPLETED')
  const pendingMonth = visibleMonthVisits.filter((visit) => visit.status === 'SCHEDULED' && new Date(visit.scheduledAt) >= todayStart)
  const rescheduledOrCanceledMonth = visibleMonthVisits.filter((visit) => visit.status === 'RESCHEDULED' || visit.status === 'CANCELLED' || visit.updateRequests?.some((request) => request.type === 'RESCHEDULE'))
  const overdueVisits = visibleMonthVisits.filter((visit) => visit.status === 'SCHEDULED' && new Date(visit.scheduledAt) < todayStart)
  const completedIn48Hours = completedMonth.filter(completedWithin48Hours)
  const visitCompleteWithin48HoursPercent = completedMonth.length ? Math.round((completedIn48Hours.length / completedMonth.length) * 100) : 0
  const ownershipLabel = showTeamStats ? 'team' : 'your'

  const kpis: KpiCard[] = [
    { title: 'Monthly schedule', value: String(visibleMonthVisits.length), detail: `${showTeamStats ? 'Team visits' : 'Your visits'} scheduled this month`, icon: CalendarClock, tone: statusColors.scheduled, href: '/visit-team/visits' },
    { title: 'Completed', value: String(completedMonth.length), detail: `Completed from ${ownershipLabel} monthly visits`, icon: CheckCircle2, tone: statusColors.completed, href: '/visit-team/visits' },
    { title: 'Pending schedule', value: String(pendingMonth.length), detail: `Upcoming scheduled visits from ${ownershipLabel} workload`, icon: Clock3, tone: statusColors.warning, href: '/visit-team/visit-schedule-queue' },
    { title: 'Reschedule / Canceled', value: String(rescheduledOrCanceledMonth.length), detail: `Changed or canceled visits from ${ownershipLabel} workload`, icon: XCircle, tone: statusColors.danger, href: '/visit-team/visit-schedule-queue' },
    { title: '48h completion', value: `${visitCompleteWithin48HoursPercent}%`, detail: `Completed within 48h of scheduled time from ${ownershipLabel} visits`, icon: ClipboardCheck, tone: statusColors.completed, href: '/visit-team/my-visits' },
  ]

  const scheduleRows: ScheduleRow[] = [...visibleTodayVisits].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).map((visit) => {
    const status = getVisitStatus(visit, now)
    return { id: visit.id, lead: visit.lead.name, area: visit.location || visit.lead.location || 'No location', time: formatVisitTime(visit.scheduledAt), member: visit.assignedTo?.fullName ?? 'Unassigned', status, tone: getToneForStatus(status) }
  })

  const priorityActions: PriorityAction[] = overdueVisits
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .map((visit) => ({
      id: visit.id,
      lead: visit.lead.name,
      owner: visit.assignedTo?.fullName ?? 'Unassigned',
      scheduledDate: formatVisitDate(visit.scheduledAt),
      missedDays: Math.max(1, Math.floor((todayStart.getTime() - startOfDay(new Date(visit.scheduledAt)).getTime()) / DAY_MS)),
      href: '/visit-team/visit-today',
    }))

  const monthStart = startOfMonth(now)
  const trendData: TrendRow[] = Array.from({ length: Math.max(1, Math.ceil((todayStart.getTime() - monthStart.getTime() + DAY_MS) / DAY_MS)) }, (_, index) => {
    const day = new Date(monthStart.getTime() + index * DAY_MS)
    const dayVisits = visibleMonthVisits.filter((visit) => isSameDay(new Date(visit.scheduledAt), day))
    return { day: new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(day), scheduled: dayVisits.length, completed: dayVisits.filter((visit) => visit.status === 'COMPLETED').length, pending: dayVisits.filter((visit) => visit.status === 'SCHEDULED').length }
  })

  const statusData: StatusRow[] = [
    { name: 'Completed', value: completedMonth.length, fill: '#10b981' },
    { name: 'Pending', value: pendingMonth.length, fill: '#3b82f6' },
    { name: 'Rescheduled', value: visibleMonthVisits.filter((visit) => visit.status === 'RESCHEDULED').length, fill: '#f59e0b' },
    { name: 'Canceled', value: visibleMonthVisits.filter((visit) => visit.status === 'CANCELLED').length, fill: '#ef4444' },
  ]

  return { kpis, scheduleRows, priorityActions, trendData, statusData, todayCount: visibleTodayVisits.length }
}

const trendConfig = {
  scheduled: { label: 'Scheduled', color: 'var(--color-chart-1)' },
  completed: { label: 'Completed', color: 'var(--color-chart-2)' },
  pending: { label: 'Pending', color: 'var(--color-chart-4)' },
} satisfies ChartConfig

const statusConfig = {
  Completed: { label: 'Completed', color: '#10b981' },
  Pending: { label: 'Pending', color: '#3b82f6' },
  Rescheduled: { label: 'Rescheduled', color: '#f59e0b' },
  Canceled: { label: 'Canceled', color: '#ef4444' },
} satisfies ChartConfig

function OperationHero() {
  return (
    <section className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm md:block">
      <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative p-8">
          <div className="absolute -right-16 -top-16 size-52 rounded-full bg-primary/10 blur-3xl" />
          <Badge variant="secondary" className="mb-4 gap-1.5 rounded-full px-3 py-1">
            <LayoutDashboard className="size-3.5" />
            Visit command center
          </Badge>
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-foreground">
            Run today&apos;s visits, reports, and department handoffs from one place.
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-6 text-muted-foreground">
            Start with overdue visits and missing reports, balance team capacity, then move completed site outputs to the next department without losing context.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild><Link href="/visit-team/visit-today">Today&apos;s visits <ArrowRight className="size-4" /></Link></Button>
            <Button asChild variant="outline"><Link href="/visit-team/visit-schedule-queue">Schedule queue</Link></Button>
          </div>
        </div>
        <div className="border-l border-border/70 bg-muted/30 p-6">
          <p className="text-sm font-semibold text-foreground">Today&apos;s operating policy</p>
          <div className="mt-4 grid gap-3">
            {[['Clear overdue first', 'Protect client commitments before new assignments.', TimerReset], ['Complete reports', 'A visit is actionable only after notes are submitted.', ClipboardCheck], ['Handoff fast', 'Send completed outputs to the next department same day.', Navigation]].map(([title, text, Icon]) => (
              <div key={title as string} className="flex gap-3 rounded-xl border border-border/70 bg-background p-3">
                <Icon className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{title as string}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{text as string}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function KpiGrid({ kpis }: { kpis: DashboardData['kpis'] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {kpis.map((card) => {
        const Icon = card.icon
        return (
          <Link key={card.title} href={card.href} className="group min-w-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-ring">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{card.title}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:mt-2 sm:text-3xl">{card.value}</p>
                  </div>
                  <div className={`shrink-0 rounded-xl border p-2 sm:p-2.5 ${card.tone}`}><Icon className="size-4 sm:size-5" /></div>
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-muted-foreground sm:mt-3 sm:text-xs">{card.detail}</p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

function ScheduleBoard({ scheduleRows, todayCount }: { scheduleRows: DashboardData['scheduleRows']; todayCount: number }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base"><Clock3 className="size-4 text-primary" /> Today schedule board</CardTitle>
        <p className="text-sm text-muted-foreground">{todayCount} {todayCount === 1 ? 'visit is' : 'visits are'} happening today.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {scheduleRows.length ? scheduleRows.map((visit) => (
          <div key={visit.id} className="grid min-w-0 gap-2 rounded-xl border border-border/70 p-3 sm:grid-cols-[1.2fr_0.6fr_0.8fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{visit.lead}</p>
              <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" /> <span className="truncate">{visit.area}</span></p>
            </div>
            <div className="text-sm text-muted-foreground">{visit.time}</div>
            <div className="truncate text-sm text-muted-foreground">{visit.member}</div>
            <Badge variant="outline" className={`${visit.tone} w-fit`}>{visit.status}</Badge>
          </div>
        )) : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No visits scheduled for today.</p>}
      </CardContent>
    </Card>
  )
}

function PriorityActions({ priorityActions }: { priorityActions: DashboardData['priorityActions'] }) {
  return (
    <Card className="min-w-0">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4 text-red-500" /> Missed schedule priority</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {priorityActions.length ? priorityActions.map((action) => (
          <div key={action.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{action.lead}</p>
                <p className="mt-1 text-xs text-muted-foreground">{action.owner} • scheduled {action.scheduledDate}</p>
              </div>
              <Badge variant="outline" className={statusColors.danger}>{action.missedDays}d missed</Badge>
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-2 px-0 text-primary hover:bg-transparent">
              <Link href={action.href}>Open visit <ArrowRight className="size-3.5" /></Link>
            </Button>
          </div>
        )) : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No missed scheduled visits this month.</p>}
      </CardContent>
    </Card>
  )
}

function ReportingCharts({ trendData, statusData }: { trendData: DashboardData['trendData']; statusData: DashboardData['statusData'] }) {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-4 text-primary" /> Visit trend</CardTitle></CardHeader>
        <CardContent className="min-w-0 px-2 sm:px-6">
          <ChartContainer config={trendConfig} className="h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={12} />
                <YAxis tickLine={false} axisLine={false} width={24} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="scheduled" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.12} strokeWidth={2} />
                <Area dataKey="completed" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.12} strokeWidth={2} />
                <Area dataKey="pending" stroke="var(--color-chart-4)" fill="var(--color-chart-4)" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader><CardTitle className="text-base">Status mix</CardTitle></CardHeader>
        <CardContent className="min-w-0 px-2 sm:px-6">
          <ChartContainer config={statusConfig} className="h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="72%" stroke="var(--color-card)" strokeWidth={2}>
                  {statusData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadDashboard() {
      try {
        setLoading(true)
        setError(null)
        const [meResponse, visitsResponse] = await Promise.all([
          fetch('/api/me', { cache: 'no-store' }),
          fetch('/api/visit-schedule?scope=dashboard', { cache: 'no-store' }),
        ])
        if (meResponse.ok) {
          const mePayload = (await meResponse.json()) as CurrentUser
          if (!cancelled) setCurrentUser(mePayload)
        }
        const response = visitsResponse
        const payload = (await response.json()) as ApiResponse
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to load visit dashboard')
        if (!cancelled) setVisits(payload.data ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load visit dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadDashboard()
    return () => { cancelled = true }
  }, [])

  const showTeamStats = currentUser?.userDepartments?.some((row) => row.department?.name === 'ADMIN') ?? false
  const dashboard = useMemo(() => buildDashboardData(visits, currentUser?.id, showTeamStats), [currentUser?.id, showTeamStats, visits])
  return (
    <div className="min-h-screen overflow-x-hidden bg-muted/20">
      <CrmPageHeader title="Visit Team Dashboard" subtitle="Live reporting from this month&apos;s scheduled visits." />
      <main className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6">
        <OperationHero />
        {error ? <Card className="border-destructive/40"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : null}
        {loading ? <Card><CardContent className="p-4 text-sm text-muted-foreground">Loading real visit data...</CardContent></Card> : null}
        <KpiGrid kpis={dashboard.kpis} />
        <ScheduleBoard scheduleRows={dashboard.scheduleRows} todayCount={dashboard.todayCount} />
        <PriorityActions priorityActions={dashboard.priorityActions} />
        <ReportingCharts trendData={dashboard.trendData} statusData={dashboard.statusData} />
      </main>
    </div>
  )
}
