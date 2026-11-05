'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  LayoutDashboard,
  Loader2,
  MapPin,
  Navigation,
  Settings,
  TimerReset,
  TrendingUp,
  Trophy,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { VisitPerformanceRow } from '@/lib/visit-performance-types'
import { generateVisitTeamPerformancePdf } from '@/lib/visit-team-performance-pdf'
import { hasVisitTeamLeadershipRole } from '@/lib/visit-team-roles'
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
type PerformanceResponse = {
  success: boolean
  monthKey?: string
  data?: {
    topPerformer: VisitPerformanceRow | null
    currentUserPerformance: VisitPerformanceRow | null
    averagePerformance: number
    members?: VisitPerformanceRow[]
  }
  error?: string
}
type DashboardData = ReturnType<typeof buildDashboardData>
type CurrentUser = {
  id: string
  fullName: string
  userDepartments?: Array<{ department?: { name?: string } }>
  userRoles?: Array<{ role?: { name?: string } }>
}

function getTagBadgeClass(tag: string | null | undefined) {
  if (!tag) return 'bg-slate-500/10 text-slate-700 border-slate-500/20'
  switch (tag.toUpperCase()) {
    case 'BEST':
      return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
    case 'BETTER':
      return 'bg-teal-500/15 text-teal-700 border-teal-500/30'
    case 'GOOD':
      return 'bg-blue-500/15 text-blue-700 border-blue-500/30'
    case 'NEUTRAL':
      return 'bg-slate-500/15 text-slate-700 border-slate-500/30'
    case 'BAD':
      return 'bg-amber-500/15 text-amber-700 border-amber-500/30'
    case 'WORSE':
      return 'bg-orange-500/15 text-orange-700 border-orange-500/30'
    case 'WORST':
      return 'bg-red-500/15 text-red-700 border-red-500/30'
    default:
      return 'bg-slate-500/10 text-slate-700 border-slate-500/20'
  }
}

function formatMonthLabel(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) return monthKey
  const [yearStr, monthStr] = monthKey.split('-')
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1)
  return isNaN(date.getTime())
    ? monthKey
    : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getCurrentMonthKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [yearStr, monthStr] = monthKey.split('-')
  const date = new Date(Number(yearStr), Number(monthStr) - 1 + delta, 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
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

function PerformanceHighlights({ performance, currentUser }: { performance: PerformanceResponse['data'] | null; currentUser: CurrentUser | null }) {
  const topPerformer = performance?.topPerformer ?? null
  const userPerformance = performance?.currentUserPerformance ?? null
  const compareValue = userPerformance?.performance ?? performance?.averagePerformance ?? 0
  const compareLabel = userPerformance
    ? `${userPerformance.name.split(' ')[0]}'s performance`
    : 'Team average performance'
  const compareDetail = userPerformance
    ? `${userPerformance.completed}/${userPerformance.totalVisits} done • ${userPerformance.totalSqft.toLocaleString()} sqft`
    : 'Backend-calculated team performance'

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden border-amber-500/25 bg-amber-500/5">
        <CardContent className="flex items-center justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <Trophy className="size-4 fill-amber-400 text-amber-500" />
              Top performer
            </p>
            <p className="mt-2 truncate text-2xl font-bold text-foreground">
              {topPerformer?.name ?? 'No performer yet'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {topPerformer
                ? `${topPerformer.performance}/100 score • ${topPerformer.completed}/${topPerformer.totalVisits} done • ${topPerformer.totalSqft.toLocaleString()} sqft`
                : 'Performance will appear after backend monthly data is available.'}
            </p>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-600">
            <Trophy className="size-7" />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <TrendingUp className="size-4" />
              {compareLabel}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{compareValue}/100</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentUser?.fullName ? `${currentUser.fullName} • ` : ''}{compareDetail}
            </p>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <TrendingUp className="size-7" />
          </div>
        </CardContent>
      </Card>
    </div>
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

function DepartmentLeaderboardCard({
  members,
  monthKey,
  onMonthChange,
  onDownloadPdf,
  downloadingPdf,
  isLeader,
  loading,
}: {
  members: VisitPerformanceRow[]
  monthKey: string
  onMonthChange: (delta: number) => void
  onDownloadPdf: () => void
  downloadingPdf: boolean
  isLeader: boolean
  loading: boolean
}) {
  return (
    <Card className="min-w-0 border-border">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" />
            Visit Team Monthly Performance & Evaluation
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Attendance and behaviour marks given by the visit leader for {formatMonthLabel(monthKey)}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month switcher */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onMonthChange(-1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="px-2 text-xs font-semibold whitespace-nowrap">
              {formatMonthLabel(monthKey)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onMonthChange(1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          {/* Download PDF button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadPdf}
            disabled={downloadingPdf || loading || members.length === 0}
            className="gap-1.5 h-8 text-xs font-semibold"
          >
            {downloadingPdf ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5 text-teal-600" />
            )}
            Download PDF
          </Button>

          {/* Settings link for leader */}
          {isLeader ? (
            <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-xs">
              <Link href="/visit-team/settings">
                <Settings className="size-3.5 text-muted-foreground" />
                Settings & Marks
              </Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-0 sm:p-6">
        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin text-teal-600" />
            Loading performance leaderboard...
          </div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No member performance records found for {formatMonthLabel(monthKey)}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3">Consultant</th>
                  <th className="py-2.5 px-3 text-center">Visits (Done/Total)</th>
                  <th className="py-2.5 px-3 text-right">Site SQFT</th>
                  <th className="py-2.5 px-3 text-center">Reports</th>
                  <th className="py-2.5 px-3 text-center">Attendance</th>
                  <th className="py-2.5 px-3 text-center">Behaviour</th>
                  <th className="py-2.5 px-3 text-right font-bold">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m, idx) => {
                  const tagColor = getTagBadgeClass(m.behaviourTag)
                  const isTop = idx === 0
                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        isTop ? 'bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-medium text-muted-foreground">
                        {isTop ? '🥇' : idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                        {m.name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-semibold text-foreground">{m.completed}</span>
                        <span className="text-muted-foreground"> / {m.totalVisits}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          {m.leadVisits}L • {m.supportVisits}S
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-foreground whitespace-nowrap">
                        {m.totalSqft.toLocaleString()} SFT
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {m.reportCompleteness}%
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            m.absentDays === 0
                              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                              : m.absentDays <= 2
                              ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                          }
                        >
                          {m.absentDays}d abs ({m.attendanceScore}/10)
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <Badge variant="outline" className={tagColor}>
                          {m.behaviourTag || 'Normal'} (
                          {m.behaviourScore >= 0 ? `+${m.behaviourScore}` : m.behaviourScore})
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-teal-600 rounded-full"
                              style={{ width: `${Math.min(100, m.performance)}%` }}
                            />
                          </div>
                          <span className="font-bold text-sm text-foreground">
                            {m.performance}
                          </span>
                          <span className="text-[10px] text-muted-foreground">/100</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey)
  const [performance, setPerformance] = useState<PerformanceResponse['data'] | null>(null)
  const [loadingPerformance, setLoadingPerformance] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Load user profile & visits
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

  // Load monthly performance whenever selectedMonth changes
  useEffect(() => {
    let cancelled = false
    async function loadMonthlyPerformance() {
      try {
        setLoadingPerformance(true)
        const res = await fetch(`/api/visit-dashboard/performance?month=${selectedMonth}`, {
          cache: 'no-store',
        })
        if (res.ok) {
          const payload = (await res.json()) as PerformanceResponse
          if (!cancelled && payload.success) {
            setPerformance(payload.data ?? null)
          }
        }
      } catch (err) {
        console.error('Failed to load performance:', err)
      } finally {
        if (!cancelled) setLoadingPerformance(false)
      }
    }
    loadMonthlyPerformance()
    return () => { cancelled = true }
  }, [selectedMonth])

  const handleMonthChange = (delta: number) => {
    setSelectedMonth((prev) => shiftMonthKey(prev, delta))
  }

  const handleDownloadPdf = async () => {
    const members = performance?.members ?? []
    if (members.length === 0) {
      toast.error('No performance records to generate PDF')
      return
    }
    try {
      setDownloadingPdf(true)
      await generateVisitTeamPerformancePdf({
        monthKey: selectedMonth,
        members,
        generatedBy: currentUser?.fullName,
      })
      toast.success('Performance PDF downloaded')
    } catch (err) {
      console.error(err)
      toast.error('Failed to download performance PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const isLeaderOrAdmin = Boolean(
    currentUser?.userDepartments?.some((row) => row.department?.name === 'ADMIN') ||
    (currentUser?.userRoles && hasVisitTeamLeadershipRole(currentUser.userRoles.map((r) => r.role?.name || '')))
  )

  const showTeamStats = currentUser?.userDepartments?.some((row) => row.department?.name === 'ADMIN') ?? false
  const dashboard = useMemo(() => buildDashboardData(visits, currentUser?.id, showTeamStats), [currentUser?.id, showTeamStats, visits])

  return (
    <div className="min-h-screen overflow-x-hidden bg-muted/20">
      <CrmPageHeader title="Visit Team Dashboard" subtitle="Live reporting and monthly performance evaluation." />
      <main className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6">
        <OperationHero />
        {error ? <Card className="border-destructive/40"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : null}
        {loading ? <Card><CardContent className="p-4 text-sm text-muted-foreground">Loading real visit data...</CardContent></Card> : null}
        <PerformanceHighlights performance={performance} currentUser={currentUser} />
        
        {/* Department Leaderboard with Attendance & Behaviour columns */}
        <DepartmentLeaderboardCard
          members={performance?.members ?? []}
          monthKey={selectedMonth}
          onMonthChange={handleMonthChange}
          onDownloadPdf={handleDownloadPdf}
          downloadingPdf={downloadingPdf}
          isLeader={isLeaderOrAdmin}
          loading={loadingPerformance}
        />

        <KpiGrid kpis={dashboard.kpis} />
        <ScheduleBoard scheduleRows={dashboard.scheduleRows} todayCount={dashboard.todayCount} />
        <PriorityActions priorityActions={dashboard.priorityActions} />
        <ReportingCharts trendData={dashboard.trendData} statusData={dashboard.statusData} />
      </main>
    </div>
  )
}
