'use client'

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

const kpis = [
  { title: 'Today Scheduled', value: '18', detail: '15 assigned • 3 need owner', icon: CalendarClock, tone: statusColors.scheduled, href: '/visit-team/visit-today' },
  { title: 'Completed Today', value: '11', detail: '61% completion before 6 PM', icon: CheckCircle2, tone: statusColors.completed, href: '/visit-team/visits' },
  { title: 'Pending Reschedule', value: '5', detail: '2 client callbacks overdue', icon: RefreshCcw, tone: statusColors.warning, href: '/visit-team/visit-schedule-queue' },
  { title: 'Overdue / Blocked', value: '3', detail: 'Immediate follow-up required', icon: ShieldAlert, tone: statusColors.danger, href: '/visit-team/visit-today' },
]

const secondaryKpis = [
  { label: 'Report completeness', value: '82%', icon: ClipboardCheck },
  { label: 'Ready for handoff', value: '7', icon: BadgeCheck },
  { label: 'Active members', value: '9', icon: UsersRound },
  { label: 'Avg. visit cycle', value: '3.4h', icon: Gauge },
]

const priorityActions = [
  { title: 'Overdue site visit confirmation', lead: 'Rahman Residence', owner: 'Tanvir Ahmed', time: '42m overdue', href: '/visit-team/visit-today', tone: 'danger' },
  { title: 'Completed visit missing report notes', lead: 'North Avenue Duplex', owner: 'Nusrat Jahan', time: 'Due today', href: '/visit-team/my-visits', tone: 'warning' },
  { title: 'Unassigned scheduled visit', lead: 'Banani Office Fit-out', owner: 'Assign member', time: 'Starts 3:30 PM', href: '/visit-team/visit-schedule-queue', tone: 'warning' },
  { title: 'Ready for department handoff', lead: 'Mirpur Apartment', owner: 'Sadia Islam', time: 'Completed 1h ago', href: '/visit-team/supported-visits', tone: 'success' },
]

const workflowStages = [
  { label: 'Request', value: 24, helper: 'Visit needed', tone: statusColors.neutral },
  { label: 'Scheduled', value: 18, helper: 'Date & time fixed', tone: statusColors.scheduled },
  { label: 'Assigned', value: 15, helper: 'Member attached', tone: statusColors.scheduled },
  { label: 'Completed', value: 11, helper: 'Site work done', tone: statusColors.completed },
  { label: 'Report', value: 9, helper: 'Notes submitted', tone: statusColors.warning },
  { label: 'Handoff', value: 7, helper: 'Next team ready', tone: statusColors.completed },
]

const visits = [
  { lead: 'Rahman Residence', area: 'Uttara Sector 7', time: '10:30 AM', member: 'Tanvir Ahmed', status: 'Overdue', tone: statusColors.danger },
  { lead: 'North Avenue Duplex', area: 'Gulshan 2', time: '12:00 PM', member: 'Nusrat Jahan', status: 'Report Due', tone: statusColors.warning },
  { lead: 'Banani Office Fit-out', area: 'Banani 11', time: '03:30 PM', member: 'Unassigned', status: 'Needs Owner', tone: statusColors.warning },
  { lead: 'Mirpur Apartment', area: 'Mirpur DOHS', time: '04:15 PM', member: 'Sadia Islam', status: 'Completed', tone: statusColors.completed },
  { lead: 'Dhanmondi Retail', area: 'Dhanmondi 27', time: '06:00 PM', member: 'Arif Hossain', status: 'Scheduled', tone: statusColors.scheduled },
]

const teamRows = [
  { name: 'Tanvir Ahmed', assigned: 5, completed: 3, pending: 1, workload: 92, status: 'Overloaded' },
  { name: 'Nusrat Jahan', assigned: 4, completed: 3, pending: 1, workload: 78, status: 'Balanced' },
  { name: 'Sadia Islam', assigned: 3, completed: 3, pending: 0, workload: 64, status: 'Available' },
  { name: 'Arif Hossain', assigned: 3, completed: 1, pending: 2, workload: 71, status: 'Balanced' },
]

const trendData = [
  { day: 'Sat', scheduled: 14, completed: 10, rescheduled: 2 },
  { day: 'Sun', scheduled: 16, completed: 12, rescheduled: 3 },
  { day: 'Mon', scheduled: 19, completed: 14, rescheduled: 2 },
  { day: 'Tue', scheduled: 15, completed: 11, rescheduled: 1 },
  { day: 'Wed', scheduled: 20, completed: 15, rescheduled: 4 },
  { day: 'Thu', scheduled: 18, completed: 11, rescheduled: 5 },
]

const statusData = [
  { name: 'Completed', value: 11, fill: '#10b981' },
  { name: 'Scheduled', value: 7, fill: '#3b82f6' },
  { name: 'Reschedule', value: 5, fill: '#f59e0b' },
  { name: 'Overdue', value: 3, fill: '#ef4444' },
]

const workloadData = teamRows.map((member) => ({ name: member.name.split(' ')[0], assigned: member.assigned, completed: member.completed }))

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
        <div className="relative p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 size-52 rounded-full bg-primary/10 blur-3xl" />
          <Badge variant="secondary" className="mb-4 gap-1.5 rounded-full px-3 py-1">
            <LayoutDashboard className="size-3.5" />
            Visit command center
          </Badge>
          <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Run today&apos;s visits, reports, and department handoffs from one place.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Start with overdue visits and missing reports, balance team capacity, then move completed site outputs to the next department without losing context.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/visit-team/visit-today">Open today&apos;s visits <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/visit-team/visit-schedule-queue">Manage schedule queue</Link>
            </Button>
          </div>
        </div>
        <div className="border-t border-border/70 bg-muted/30 p-6 lg:border-l lg:border-t-0">
          <p className="text-sm font-semibold text-foreground">Today&apos;s operating policy</p>
          <div className="mt-4 space-y-3">
            {[['Clear overdue first', 'Protect client commitments before new assignments.', TimerReset], ['Complete reports', 'A visit is actionable only after notes are submitted.', ClipboardCheck], ['Handoff fast', 'Send completed outputs to the next department same day.', Navigation]].map(([title, text, Icon]) => (
              <div key={title as string} className="flex gap-3 rounded-xl border border-border/70 bg-background p-3">
                <Icon className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{title as string}</p>
                  <p className="text-xs text-muted-foreground">{text as string}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function KpiGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((card) => {
        const Icon = card.icon
        return (
          <Link key={card.title} href={card.href} className="group rounded-xl focus:outline-none focus:ring-2 focus:ring-ring">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{card.value}</p>
                  </div>
                  <div className={`rounded-xl border p-2.5 ${card.tone}`}><Icon className="size-5" /></div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{card.detail}</p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

function SecondaryMetrics() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {secondaryKpis.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.label} className="bg-muted/20">
            <CardContent className="flex items-center gap-3 p-4">
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

function PriorityActions() {
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

function WorkflowFunnel() {
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
              <p className="mt-1 text-xs text-muted-foreground">2 completed visits still need notes before they can be handed off to the next department.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ScheduleBoard() {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="size-4 text-primary" /> Today schedule board</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {visits.map((visit) => (
          <div key={visit.lead} className="grid gap-3 rounded-xl border border-border/70 p-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto] md:items-center">
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

function TeamPerformance() {
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

function ReportHealth() {
  const items = [
    ['Submitted reports', '9', statusColors.completed],
    ['Missing notes/photos', '2', statusColors.warning],
    ['Need correction', '1', statusColors.danger],
    ['Ready for handoff', '7', statusColors.completed],
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

function ReportingCharts() {
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
  return (
    <div className="min-h-screen bg-muted/20">
      <CrmPageHeader title="Visit Team Dashboard" subtitle="Action-first reporting for site visits, team capacity, and handoffs." />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6">
        <OperationHero />
        <KpiGrid />
        <SecondaryMetrics />
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"><PriorityActions /><WorkflowFunnel /></div>
        <ScheduleBoard />
        <div className="grid gap-6 xl:grid-cols-2"><TeamPerformance /><ReportHealth /></div>
        <ReportingCharts />
      </main>
    </div>
  )
}
