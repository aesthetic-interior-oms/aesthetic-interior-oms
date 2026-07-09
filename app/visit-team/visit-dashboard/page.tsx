'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileWarning,
  Gauge,
  LayoutDashboard,
  MapPin,
  Navigation,
  RefreshCcw,
  Route,
  ShieldAlert,
  TimerReset,
  UserCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'

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
  lead: { id: string; name: string; phone?: string | null; location: string | null }
  assignedTo?: { id: string; fullName: string; email: string; phone?: string | null } | null
  supportAssignments?: Array<{ id: string; supportUserId: string; supportUser: { id: string; fullName: string; email: string }; result?: { id: string; completedAt: string } | null }>
  supportResults?: Array<{ id: string; supportUserId: string; completedAt: string }>
  result?: { id: string; completedAt: string; summary?: string | null; files?: unknown[] } | null
  updateRequests?: Array<{ id: string; type: string; createdAt: string; requestedBy?: { fullName: string } | null }>
}

type ApiResponse = { success: boolean; data?: VisitRecord[]; error?: string }

type DashboardData = ReturnType<typeof buildDashboardData>

type KpiCard = { title: string; value: string; detail: string; icon: LucideIcon; tone: string; href: string }
type SecondaryKpi = { label: string; value: string; icon: LucideIcon }
type PriorityAction = { title: string; lead: string; owner: string; time: string; href: string; tone: 'danger' | 'warning' | 'success' }
type WorkflowStage = { label: string; value: number; helper: string; tone: string }
type ScheduleRow = { id: string; lead: string; area: string; time: string; member: string; status: string; tone: string }
type TeamRow = { name: string; assigned: number; completed: number; pending: number; workload: number; status: string }
type TrendRow = { day: string; scheduled: number; completed: number; rescheduled: number }
type StatusRow = { name: string; value: number; fill: string }

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

function formatVisitTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function getVisitStatus(visit: VisitRecord, now = new Date()) {
  if (visit.status === 'COMPLETED') return 'Completed'
  if (visit.status === 'CANCELLED') return 'Cancelled'
  if (visit.status === 'RESCHEDULED') return 'Rescheduled'
  if (visit.updateRequests?.some((request) => request.type === 'RESCHEDULE')) return 'Reschedule Pending'
  if (new Date(visit.scheduledAt).getTime() < now.getTime()) return 'Overdue'
  if (!visit.assignedTo) return 'Needs Owner'
  return 'Scheduled'
}

function getToneForStatus(status: string) {
  if (status === 'Completed') return statusColors.completed
  if (status === 'Overdue') return statusColors.danger
  if (status.includes('Reschedule') || status === 'Needs Owner') return statusColors.warning
  if (status === 'Cancelled') return statusColors.neutral
  return statusColors.scheduled
}

function hasReport(visit: VisitRecord) {
  return Boolean(visit.result || visit.supportResults?.length || visit.supportAssignments?.some((assignment) => assignment.result))
}

function buildDashboardData(visits: VisitRecord[]) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = new Date(todayStart.getTime() - 5 * DAY_MS)
  const todayVisits = visits.filter((visit) => isSameDay(new Date(visit.scheduledAt), now))
  const completedToday = todayVisits.filter((visit) => visit.status === 'COMPLETED')
  const reschedulePending = visits.filter((visit) => visit.status === 'RESCHEDULED' || visit.updateRequests?.some((request) => request.type === 'RESCHEDULE'))
  const overdue = visits.filter((visit) => visit.status === 'SCHEDULED' && new Date(visit.scheduledAt).getTime() < now.getTime())
  const assignedToday = todayVisits.filter((visit) => visit.assignedTo).length
  const unassignedToday = todayVisits.length - assignedToday
  const completedMissingReports = visits.filter((visit) => visit.status === 'COMPLETED' && !hasReport(visit))
  const reportSubmitted = visits.filter(hasReport)
  const readyForHandoff = visits.filter((visit) => visit.status === 'COMPLETED' && hasReport(visit))
  const activeMembers = new Set(visits.flatMap((visit) => [visit.assignedTo?.id, ...(visit.supportAssignments ?? []).map((assignment) => assignment.supportUserId)]).filter(Boolean)).size
  const cycleHours = completedToday.length
    ? completedToday.reduce((sum, visit) => sum + Math.max(0, now.getTime() - new Date(visit.scheduledAt).getTime()) / 36e5, 0) / completedToday.length
    : 0
  const completionRate = todayVisits.length ? Math.round((completedToday.length / todayVisits.length) * 100) : 0
  const reportCompleteness = visits.length ? Math.round((reportSubmitted.length / visits.length) * 100) : 0

  const kpis: KpiCard[] = [
    { title: 'Today Scheduled', value: String(todayVisits.length), detail: `${assignedToday} assigned • ${unassignedToday} need owner`, icon: CalendarClock, tone: statusColors.scheduled, href: '/visit-team/visit-today' },
    { title: 'Completed Today', value: String(completedToday.length), detail: `${completionRate}% completion today`, icon: CheckCircle2, tone: statusColors.completed, href: '/visit-team/visits' },
    { title: 'Pending Reschedule', value: String(reschedulePending.length), detail: `${reschedulePending.filter((visit) => new Date(visit.scheduledAt) < now).length} overdue client callbacks`, icon: RefreshCcw, tone: statusColors.warning, href: '/visit-team/visit-schedule-queue' },
    { title: 'Overdue / Blocked', value: String(overdue.length), detail: 'Immediate follow-up required', icon: ShieldAlert, tone: statusColors.danger, href: '/visit-team/visit-today' },
  ]

  const secondaryKpis: SecondaryKpi[] = [
    { label: 'Report completeness', value: `${reportCompleteness}%`, icon: ClipboardCheck },
    { label: 'Ready for handoff', value: String(readyForHandoff.length), icon: BadgeCheck },
    { label: 'Active members', value: String(activeMembers), icon: UsersRound },
    { label: 'Avg. visit cycle', value: cycleHours ? `${cycleHours.toFixed(1)}h` : '0h', icon: Gauge },
  ]

  const priorityActions: PriorityAction[] = [
    ...overdue.slice(0, 2).map((visit) => ({ title: 'Overdue site visit confirmation', lead: visit.lead.name, owner: visit.assignedTo?.fullName ?? 'Assign member', time: `${Math.max(1, Math.round((now.getTime() - new Date(visit.scheduledAt).getTime()) / 60000))}m overdue`, href: '/visit-team/visit-today', tone: 'danger' as const })),
    ...completedMissingReports.slice(0, 2).map((visit) => ({ title: 'Completed visit missing report notes', lead: visit.lead.name, owner: visit.assignedTo?.fullName ?? 'Unassigned', time: 'Report due', href: '/visit-team/my-visits', tone: 'warning' as const })),
    ...todayVisits.filter((visit) => !visit.assignedTo).slice(0, 2).map((visit) => ({ title: 'Unassigned scheduled visit', lead: visit.lead.name, owner: 'Assign member', time: formatVisitTime(visit.scheduledAt), href: '/visit-team/visit-schedule-queue', tone: 'warning' as const })),
    ...readyForHandoff.slice(0, 2).map((visit) => ({ title: 'Ready for department handoff', lead: visit.lead.name, owner: visit.assignedTo?.fullName ?? 'Visit team', time: 'Completed', href: '/visit-team/supported-visits', tone: 'success' as const })),
  ].slice(0, 4)

  const workflowStages: WorkflowStage[] = [
    { label: 'Request', value: visits.length, helper: 'Visit records', tone: statusColors.neutral },
    { label: 'Scheduled', value: visits.filter((visit) => visit.status === 'SCHEDULED').length, helper: 'Date & time fixed', tone: statusColors.scheduled },
    { label: 'Assigned', value: visits.filter((visit) => visit.assignedTo).length, helper: 'Member attached', tone: statusColors.scheduled },
    { label: 'Completed', value: visits.filter((visit) => visit.status === 'COMPLETED').length, helper: 'Site work done', tone: statusColors.completed },
    { label: 'Report', value: reportSubmitted.length, helper: 'Notes submitted', tone: statusColors.warning },
    { label: 'Handoff', value: readyForHandoff.length, helper: 'Next team ready', tone: statusColors.completed },
  ]

  const scheduleRows: ScheduleRow[] = todayVisits.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).slice(0, 8).map((visit) => {
    const status = getVisitStatus(visit, now)
    return { id: visit.id, lead: visit.lead.name, area: visit.location || visit.lead.location || 'No location', time: formatVisitTime(visit.scheduledAt), member: visit.assignedTo?.fullName ?? 'Unassigned', status, tone: getToneForStatus(status) }
  })

  const memberMap = new Map<string, TeamRow>()
  visits.filter((visit) => visit.assignedTo).forEach((visit) => {
    const name = visit.assignedTo!.fullName
    const row = memberMap.get(name) ?? { name, assigned: 0, completed: 0, pending: 0, workload: 0, status: 'Available' }
    row.assigned += 1
    if (visit.status === 'COMPLETED') row.completed += 1
    if (visit.status === 'COMPLETED' && !hasReport(visit)) row.pending += 1
    memberMap.set(name, row)
  })
  const teamRows = Array.from(memberMap.values()).map((row) => ({ ...row, workload: Math.min(100, Math.round((row.assigned / Math.max(1, todayVisits.length || 5)) * 100)), status: row.assigned >= 5 ? 'Overloaded' : row.pending === 0 ? 'Available' : 'Balanced' })).slice(0, 6)

  const trendData: TrendRow[] = Array.from({ length: 6 }, (_, index) => {
    const day = new Date(weekStart.getTime() + index * DAY_MS)
    const dayVisits = visits.filter((visit) => isSameDay(new Date(visit.scheduledAt), day))
    return { day: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day), scheduled: dayVisits.length, completed: dayVisits.filter((visit) => visit.status === 'COMPLETED').length, rescheduled: dayVisits.filter((visit) => visit.status === 'RESCHEDULED' || visit.updateRequests?.some((request) => request.type === 'RESCHEDULE')).length }
  })

  const statusData: StatusRow[] = [
    { name: 'Completed', value: visits.filter((visit) => visit.status === 'COMPLETED').length, fill: '#10b981' },
    { name: 'Scheduled', value: visits.filter((visit) => visit.status === 'SCHEDULED').length, fill: '#3b82f6' },
    { name: 'Reschedule', value: reschedulePending.length, fill: '#f59e0b' },
    { name: 'Overdue', value: overdue.length, fill: '#ef4444' },
  ]

  return { kpis, secondaryKpis, priorityActions, workflowStages, scheduleRows, teamRows, trendData, statusData, reportSubmitted: reportSubmitted.length, missingReports: completedMissingReports.length, readyForHandoff: readyForHandoff.length }
}

const trendConfig = {
  scheduled: { label: 'Scheduled', color: 'var(--color-chart-1)' },
  completed: { label: 'Completed', color: 'var(--color-chart-2)' },
  rescheduled: { label: 'Rescheduled', color: 'var(--color-chart-4)' },
} satisfies ChartConfig

const workloadConfig = {
  assigned: { label: 'Assigned', color: 'var(--color-chart-1)' },
  completed: { label: 'Completed', color: 'var(--color-chart-2)' },
} satisfies ChartConfig

const statusConfig = {
  Completed: { label: 'Completed', color: '#10b981' },
  Scheduled: { label: 'Scheduled', color: '#3b82f6' },
  Reschedule: { label: 'Reschedule', color: '#f59e0b' },
  Overdue: { label: 'Overdue', color: '#ef4444' },
} satisfies ChartConfig

function OperationHero() {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative p-4 sm:p-8">
          <div className="absolute -right-16 -top-16 size-52 rounded-full bg-primary/10 blur-3xl" />
          <Badge variant="secondary" className="mb-3 gap-1.5 rounded-full px-3 py-1 sm:mb-4">
            <LayoutDashboard className="size-3.5" />
            Visit command center
          </Badge>
          <h2 className="max-w-3xl text-xl font-bold tracking-tight text-foreground sm:text-3xl">
            Run today&apos;s visits, reports, and department handoffs from one place.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-5 text-muted-foreground sm:mt-3 sm:text-base sm:leading-6">
            Start with overdue visits and missing reports, balance team capacity, then move completed site outputs to the next department without losing context.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
            <Button asChild className="h-10 px-3 text-xs sm:text-sm">
              <Link href="/visit-team/visit-today">Today&apos;s visits <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="h-10 px-3 text-xs sm:text-sm">
              <Link href="/visit-team/visit-schedule-queue">Schedule queue</Link>
            </Button>
          </div>
        </div>
        <div className="border-t border-border/70 bg-muted/30 p-4 sm:p-6 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Today&apos;s operating policy</p>
            <Badge variant="outline" className="shrink-0 rounded-full px-2 py-0.5 text-[10px] sm:hidden">3-step flow</Badge>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:grid-cols-1 sm:gap-3">
            {[['Overdue', 'Clear overdue first', 'Protect client commitments before new assignments.', TimerReset], ['Reports', 'Complete reports', 'A visit is actionable only after notes are submitted.', ClipboardCheck], ['Handoff', 'Handoff fast', 'Send completed outputs to the next department same day.', Navigation]].map(([mobileTitle, title, text, Icon]) => (
              <div key={title as string} className="rounded-xl border border-border/70 bg-background p-2.5 sm:flex sm:gap-3 sm:p-3">
                <Icon className="size-4 text-primary sm:mt-0.5" />
                <div className="mt-2 min-w-0 sm:mt-0">
                  <p className="text-xs font-semibold leading-tight text-foreground sm:hidden">{mobileTitle as string}</p>
                  <p className="hidden text-sm font-medium text-foreground sm:block">{title as string}</p>
                  <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{text as string}</p>
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
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {kpis.map((card) => {
        const Icon = card.icon
        return (
          <Link key={card.title} href={card.href} className="group rounded-xl focus:outline-none focus:ring-2 focus:ring-ring">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground sm:text-sm">{card.title}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:mt-2 sm:text-3xl">{card.value}</p>
                  </div>
                  <div className={`rounded-xl border p-2 sm:p-2.5 ${card.tone}`}><Icon className="size-4 sm:size-5" /></div>
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

function SecondaryMetrics({ secondaryKpis }: { secondaryKpis: DashboardData['secondaryKpis'] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {secondaryKpis.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.label} className="bg-muted/20">
            <CardContent className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
              <div className="rounded-lg bg-background p-2 shadow-sm"><Icon className="size-4 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-semibold text-foreground">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function PriorityActions({ priorityActions }: { priorityActions: DashboardData['priorityActions'] }) {
  return (
    <Card className="h-full">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4 text-amber-500" /> Priority actions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {priorityActions.map((action) => (
          <div key={action.lead} className="rounded-xl border border-border/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{action.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{action.lead} • {action.owner}</p>
              </div>
              <Badge variant="outline" className={action.tone === 'danger' ? statusColors.danger : action.tone === 'success' ? statusColors.completed : statusColors.warning}>{action.time}</Badge>
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-2 px-0 text-primary hover:bg-transparent">
              <Link href={action.href}>Open action <ArrowRight className="size-3.5" /></Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function WorkflowFunnel({ workflowStages, missingReports }: { workflowStages: DashboardData['workflowStages']; missingReports: number }) {
  return (
    <Card className="h-full">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Route className="size-4 text-primary" /> Visit workflow funnel</CardTitle></CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {workflowStages.map((stage) => (
            <div key={stage.label} className={`rounded-xl border p-3 text-center ${stage.tone}`}>
              <p className="text-xs font-medium">{stage.label}</p>
              <p className="mt-1 text-2xl font-bold">{stage.value}</p>
              <p className="mt-1 text-[11px] opacity-80">{stage.helper}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="flex gap-3">
            <FileWarning className="mt-0.5 size-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-foreground">Bottleneck: report submission</p>
              <p className="mt-1 text-xs text-muted-foreground">{missingReports} completed visits still need notes before they can be handed off to the next department.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ScheduleBoard({ scheduleRows }: { scheduleRows: DashboardData['scheduleRows'] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="size-4 text-primary" /> Today schedule board</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {scheduleRows.map((visit) => (
          <div key={visit.id} className="grid gap-3 rounded-xl border border-border/70 p-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto] md:items-center">
            <div>
              <p className="font-medium text-foreground">{visit.lead}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {visit.area}</p>
            </div>
            <div className="text-sm text-muted-foreground">{visit.time}</div>
            <div className="text-sm text-muted-foreground">{visit.member}</div>
            <Badge variant="outline" className={visit.tone}>{visit.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function TeamPerformance({ teamRows }: { teamRows: DashboardData['teamRows'] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserCheck className="size-4 text-primary" /> Team workload & performance</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {teamRows.map((member) => (
          <div key={member.name} className="space-y-2 rounded-xl border border-border/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.completed}/{member.assigned} completed • {member.pending} pending report</p>
              </div>
              <Badge variant="outline" className={member.status === 'Overloaded' ? statusColors.danger : member.status === 'Available' ? statusColors.completed : statusColors.scheduled}>{member.status}</Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${member.workload}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function ReportHealth({ reportSubmitted, missingReports, readyForHandoff }: { reportSubmitted: number; missingReports: number; readyForHandoff: number }) {
  const items = [
    ['Submitted reports', String(reportSubmitted), statusColors.completed],
    ['Missing notes/photos', String(missingReports), statusColors.warning],
    ['Need correction', '0', statusColors.danger],
    ['Ready for handoff', String(readyForHandoff), statusColors.completed],
  ]
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="size-4 text-primary" /> Visit report health</CardTitle></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {items.map(([label, value, tone]) => (
          <div key={label} className={`rounded-xl border p-4 ${tone}`}>
            <p className="text-xs font-medium">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function ReportingCharts({ trendData, statusData, teamRows }: { trendData: DashboardData['trendData']; statusData: DashboardData['statusData']; teamRows: DashboardData['teamRows'] }) {
  const workloadData = teamRows.map((member) => ({ name: member.name.split(' ')[0], assigned: member.assigned, completed: member.completed }))
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-4 text-primary" /> Visit trend</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="h-[260px] w-full">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="scheduled" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.12} strokeWidth={2} />
              <Area dataKey="completed" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.12} strokeWidth={2} />
              <Area dataKey="rescheduled" stroke="var(--color-chart-4)" fill="var(--color-chart-4)" fillOpacity={0.12} strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Status mix</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={statusConfig} className="h-[260px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} stroke="var(--color-card)" strokeWidth={2}>
                {statusData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Member output</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={workloadConfig} className="h-[260px] w-full">
            <BarChart data={workloadData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="assigned" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
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

  useEffect(() => {
    let cancelled = false
    async function loadDashboard() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/visit-schedule?scope=all', { cache: 'no-store' })
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

  const dashboard = useMemo(() => buildDashboardData(visits), [visits])

  return (
    <div className="min-h-screen bg-muted/20">
      <CrmPageHeader title="Visit Team Dashboard" subtitle="Live reporting from scheduled visits, team capacity, and handoffs." />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6">
        <OperationHero />
        {error ? <Card className="border-destructive/40"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : null}
        {loading ? <Card><CardContent className="p-4 text-sm text-muted-foreground">Loading real visit data...</CardContent></Card> : null}
        <KpiGrid kpis={dashboard.kpis} />
        <SecondaryMetrics secondaryKpis={dashboard.secondaryKpis} />
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"><PriorityActions priorityActions={dashboard.priorityActions} /><WorkflowFunnel workflowStages={dashboard.workflowStages} missingReports={dashboard.missingReports} /></div>
        <ScheduleBoard scheduleRows={dashboard.scheduleRows} />
        <div className="grid gap-6 xl:grid-cols-2"><TeamPerformance teamRows={dashboard.teamRows} /><ReportHealth reportSubmitted={dashboard.reportSubmitted} missingReports={dashboard.missingReports} readyForHandoff={dashboard.readyForHandoff} /></div>
        <ReportingCharts trendData={dashboard.trendData} statusData={dashboard.statusData} teamRows={dashboard.teamRows} />
      </main>
    </div>
  )
}
