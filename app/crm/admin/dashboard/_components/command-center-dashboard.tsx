'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  DraftingCompass,
  Download,
  FileCheck2,
  Handshake,
  Medal,
  IndianRupee,
  Layers3,
  MapPinned,
  TimerReset,
  UserCheck,
  UsersRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { VisitStatusChart } from '@/components/crm/shared/visit-status-chart'
import { LeaderboardCard } from '@/components/crm/jr-architecture/performance-cards'
import { QuotationLeaderboardSection, type QuotationPerformanceItem } from './quotation-leaderboard-section'
import {
  formatLabel,
  formatRelativeTime,
  queueLinks,
  type PriorityAction,
} from '@/lib/dashboard-formatting'
export { queueLinks, type PriorityAction, formatLabel, formatRelativeTime }

async function loadLogoBase64(url = '/Logo/HeaderLogo.png'): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

type CommandCenterDashboardProps = {
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
  designWatch: DesignWatch
  visitInsights: VisitInsights
  overduePendingVisits: OverduePendingVisitItem[]
  visitTeamPerformance: VisitTeamPerformanceItem[]
  visitTeamPerformanceMonthKey: string
  srCrmPerformance: SrCrmPerformanceItem[]
  jrArchitectPerformances: JrArchitectPerformanceItem[]
  quotationPerformances: QuotationPerformanceItem[]
  quotationPerformanceMonthKey: string
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

type DesignWatch = {
  queueCount: number
  overdueQueueCount: number
  reviewPendingCount: number
  overdueReviewCount: number
}

type VisitInsights = {
  statusData: Array<{ name: string; value: number; fill: string }>
  pendingOverdueCount: number
}


type SrCrmPerformanceItem = {
  userId: string
  name: string
  activeProjectSqft: number
  totalAgreementValue: number
  review: { score: number; count: number; best: number; better: number; good: number }
  meeting: { score: number; count: number; best: number; better: number; good: number }
  conversion: { score: number; count: number }
  sqftScore: number
  agreementScore: number
  totalPerformance: number
}

type VisitTeamPerformanceItem = {
  id: string
  name: string
  totalVisits: number
  completed: number
  reportCompleteness: number
  totalSqft: number
  avgSqft: number
  performance: number
  leadVisits: number
  supportVisits: number
}

type JrArchitectPerformanceItem = {
  id: string
  totalWork: number
  totalSqft: number
  totalTimeMinutes: number
  performanceScore: number
  user: {
    fullName: string
  }
}

type OverduePendingVisitItem = {
  id: string
  leadId: string
  leadName: string
  leadLocation: string | null
  scheduledAt: Date
  visitLeadName: string | null
}


function formatMoney(value: number | null | undefined): string {
  if (!value || value <= 0) return 'Budget not set'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number | null | undefined): string {
  return Number.isFinite(value ?? Number.NaN) ? Number(value).toLocaleString() : '0'
}

function formatMonthKey(value: string): string {
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return value
  return new Date(year, month - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function QueueStatusGrid({ counts }: { counts: CommandCenterDashboardProps['queueCounts'] }) {
  const queueCards = [
    {
      title: 'Visit Queue',
      value: counts.visit,
      subtitle: 'Completed visits ready for CAD handoff',
      href: queueLinks.visit,
      icon: MapPinned,
      accent: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'CAD Queue',
      value: counts.cad,
      subtitle: 'CAD assignments, status, and deadlines',
      href: queueLinks.cad,
      icon: DraftingCompass,
      accent: 'text-sky-600 bg-sky-500/10 border-sky-500/20',
    },
    {
      title: 'Review Center',
      value: counts.review,
      subtitle: 'Submissions waiting for admin review',
      href: queueLinks.review,
      icon: ClipboardCheck,
      accent: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Meeting Queue',
      value: counts.meeting,
      subtitle: 'Leads awaiting or progressing through meetings',
      href: queueLinks.meeting,
      icon: Handshake,
      accent: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
    },
    {
      title: 'Budget Queue',
      value: counts.budget,
      subtitle: 'Quotation and budget movement watch',
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

function PriorityActionCard({ priorityActions }: { priorityActions: PriorityAction[] }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <TimerReset className="size-4 text-primary" />
            Priority Action
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Most urgent cross-department items for Admin.
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
          <Link href="/crm/admin/calendar">Calendar</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingMeetings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No first or budget meetings scheduled in the next 7 days.</p>
        ) : (
          upcomingMeetings.map((meeting) => (
            <Link key={meeting.id} href={`/crm/admin/leads/${meeting.lead.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 transition hover:border-primary/40 hover:bg-accent/20">
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
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No active quotation or budget records in queue.</p>
        ) : (
          budgetLeads.map((lead) => (
            <Link key={lead.id} href={`/crm/admin/leads/${lead.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 transition hover:border-primary/40 hover:bg-accent/20">
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

function DesignFlowCard({ designWatch }: { designWatch: DesignWatch }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers3 className="size-4 text-primary" />
          Design Flow Watch
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href={queueLinks.design}>Open design queue</Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        <Link href={queueLinks.design} className="rounded-xl border border-border/70 p-3 transition hover:border-primary/40 hover:bg-accent/20">
          <p className="text-xs text-muted-foreground">Design queue active</p>
          <p className="mt-1 text-xl font-semibold">{designWatch.queueCount}</p>
        </Link>
        <Link href={queueLinks.design} className="rounded-xl border border-border/70 p-3 transition hover:border-primary/40 hover:bg-accent/20">
          <p className="text-xs text-muted-foreground">Overdue design queue</p>
          <p className="mt-1 text-xl font-semibold text-destructive">{designWatch.overdueQueueCount}</p>
        </Link>
        <Link href={queueLinks.review} className="rounded-xl border border-border/70 p-3 transition hover:border-primary/40 hover:bg-accent/20">
          <p className="text-xs text-muted-foreground">Design waiting review</p>
          <p className="mt-1 text-xl font-semibold">{designWatch.reviewPendingCount}</p>
        </Link>
        <Link href={queueLinks.review} className="rounded-xl border border-border/70 p-3 transition hover:border-primary/40 hover:bg-accent/20">
          <p className="text-xs text-muted-foreground">Overdue design review</p>
          <p className="mt-1 text-xl font-semibold text-destructive">{designWatch.overdueReviewCount}</p>
        </Link>
      </CardContent>
    </Card>
  )
}



function SrCrmPerformanceSection({ members }: { members: SrCrmPerformanceItem[] }) {
  const [downloading, setDownloading] = useState(false)
  const averagePerformance = members.length
    ? Math.round(members.reduce((sum, member) => sum + member.totalPerformance, 0) / members.length)
    : 0

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape' })
      const pageWidth = doc.internal.pageSize.getWidth()

      const logoDataUrl = await loadLogoBase64('/Logo/HeaderLogo.png')

      const now = new Date()
      const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
      const dateLabel = now.toLocaleDateString('en-GB')

      const totalSqft = members.reduce((sum, m) => sum + (m.activeProjectSqft || 0), 0)
      const totalAgreement = members.reduce((sum, m) => sum + (m.totalAgreementValue || 0), 0)

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 14, 10, 54, 10)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(31, 54, 61) // #1f363d PRIMARY
        doc.text('SR CRM Performance Leaderboard', 74, 17)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(100, 116, 139)
        doc.text(`Month: ${monthLabel}`, 74, 23)
        doc.text(`Generated: ${dateLabel}`, pageWidth - 14, 23, { align: 'right' })

        doc.setTextColor(30, 41, 59)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(
          `Members: ${members.length}  |  Team Avg: ${averagePerformance}/100  |  Active SQFT: ${totalSqft.toLocaleString()}  |  Agreement Value: BDT ${totalAgreement.toLocaleString()}`,
          14,
          31,
        )
      } else {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(31, 54, 61)
        doc.text('SR CRM Performance Leaderboard', 14, 16)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(100, 116, 139)
        doc.text(`Month: ${monthLabel}`, 14, 23)
        doc.text(`Generated: ${dateLabel}`, pageWidth - 14, 23, { align: 'right' })

        doc.setTextColor(30, 41, 59)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(
          `Members: ${members.length}  |  Team Avg: ${averagePerformance}/100  |  Active SQFT: ${totalSqft.toLocaleString()}  |  Agreement Value: BDT ${totalAgreement.toLocaleString()}`,
          14,
          31,
        )
      }

      autoTable(doc, {
        startY: 38,
        head: [[
          'Rank',
          'Name',
          'Active SQFT',
          'Agreement Value',
          'Review (/30)',
          'Meeting (/20)',
          'Conversion (/20)',
          'SQFT Score (/15)',
          'Agreement Score (/15)',
          'Final Score (/100)',
        ]],
        body: members.map((m, index) => [
          String(index + 1),
          m.name,
          `${(m.activeProjectSqft || 0).toLocaleString()} SFT`,
          `BDT ${(m.totalAgreementValue || 0).toLocaleString()}`,
          `${m.review?.score || 0} / 30 (${m.review?.count || 0} appr)`,
          `${m.meeting?.score || 0} / 20 (${m.meeting?.count || 0} comp)`,
          `${m.conversion?.score || 0} / 20 (${m.conversion?.count || 0} moves)`,
          `${m.sqftScore || 0} / 15`,
          `${m.agreementScore || 0} / 15`,
          `${m.totalPerformance || 0} / 100`,
        ]),
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [31, 54, 61], // #1f363d PRIMARY
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: 42 },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right' },
          9: { halign: 'right', fontStyle: 'bold' },
        },
        didDrawPage: () => {
          doc.setFontSize(7)
          doc.setTextColor(100, 116, 139)
          doc.text(`Aesthetic Interior - SR CRM Performance Leaderboard - ${monthLabel}`, 14, 202)
          doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - 14, 202, { align: 'right' })
        },
      })

      doc.save(`sr-crm-performance-leaderboard.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Medal className="size-4 text-primary" />
              SR CRM Performance
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Monthly leaderboard for active project SQFT, agreement value, review approvals, meeting completion, and conversions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Team avg {averagePerformance}/100</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void downloadPdf()}
              disabled={downloading || members.length === 0}
              className="h-9 gap-2"
            >
              <Download className="size-4" />
              {downloading ? 'Preparing' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {members.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No SR CRM performance activity found for the current month.</p>
        ) : (
          members.map((member, index) => (
            <div key={member.userId} className="rounded-xl border border-border/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">#{index + 1} {member.name}</p>
                    {index === 0 ? <Badge variant="secondary">Top</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {member.activeProjectSqft.toLocaleString()} SFT · ৳{member.totalAgreementValue.toLocaleString()} agreement
                  </p>
                </div>
                <Badge variant="outline" className={member.totalPerformance >= 80 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : member.totalPerformance >= 55 ? 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'}>
                  {member.totalPerformance}/100
                </Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${member.totalPerformance}%` }} />
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-5">
                <span>Review {member.review.score}/30</span>
                <span>Meeting {member.meeting.score}/20</span>
                <span>Conversion {member.conversion.score}/20</span>
                <span>SQFT {member.sqftScore}/15</span>
                <span>Agreement {member.agreementScore}/15</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function VisitTeamPerformanceSection({
  members,
  monthKey,
}: {
  members: VisitTeamPerformanceItem[]
  monthKey: string
}) {
  const averagePerformance = members.length
    ? Math.round(members.reduce((sum, member) => sum + member.performance, 0) / members.length)
    : 0
  const monthLabel = formatMonthKey(monthKey)

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="size-4 text-primary" />
              Visit Team Performance
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{monthLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Team avg {averagePerformance}/100</Badge>
            <form action="/crm/admin/dashboard" className="flex items-center gap-2">
              <Input
                type="month"
                name="visitMonth"
                defaultValue={monthKey}
                aria-label="Visit performance month"
                className="h-9 w-[150px]"
              />
              <Button type="submit" size="sm" variant="outline">Apply</Button>
            </form>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {members.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No visit-team activity found for {monthLabel}.</p>
        ) : (
          members.map((member) => (
            <div key={member.id} className="rounded-xl border border-border/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
                </div>
                <Badge variant="outline" className={member.performance >= 80 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : member.performance >= 55 ? 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'}>
                  {member.performance}/100
                </Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${member.performance}%` }} />
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <span>{formatNumber(member.totalSqft)} sqft</span>
                <span>{member.completed}/{member.totalVisits} completed</span>
                <span>{member.leadVisits} lead · {member.supportVisits} support</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function VisitInsightsSection({ visitInsights }: { visitInsights: VisitInsights }) {
  return (
    <section className="grid gap-6">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPinned className="size-4 text-primary" />
            Visit Data Watch
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href={queueLinks.visit}>Open visit queue</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <VisitStatusChart data={visitInsights.statusData} />
        </CardContent>
      </Card>
    </section>
  )
}

function VisitPendingRedAlertSection({ items, totalCount }: { items: OverduePendingVisitItem[]; totalCount: number }) {
  return (
    <Card className="border-red-300 bg-red-50/40 shadow-sm dark:border-red-800 dark:bg-red-950/30">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base text-red-700 dark:text-red-300">Red Alert · Pending Visit Results</CardTitle>
        <p className="text-sm text-red-700/80 dark:text-red-300/80">
          {totalCount} visit{totalCount === 1 ? '' : 's'} are overdue for result submission.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-xl border border-red-200/80 bg-background/60 p-4 text-sm text-muted-foreground dark:border-red-800">
            No overdue pending visits right now.
          </p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/crm/admin/leads/${item.leadId}`}
              className="block rounded-xl border border-red-200 bg-background/80 p-4 transition hover:border-red-400 hover:bg-red-50/40 dark:border-red-800 dark:bg-background/40 dark:hover:bg-red-950/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{item.leadName}</p>
                <Badge variant="destructive">Pending Result</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Scheduled: {item.scheduledAt.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Visit Team Lead: <span className="font-medium text-foreground">{item.visitLeadName ?? 'Not assigned'}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Client: <span className="font-medium text-foreground">{item.leadName}</span> · Location: <span className="font-medium text-foreground">{item.leadLocation ?? 'N/A'}</span>
              </p>
            </Link>
          ))
        )}
        <div>
          <Button asChild variant="destructive" size="sm">
            <Link href={queueLinks.visit}>Open visit queue</Link>
          </Button>
        </div>
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
          <Link href="/crm/admin/leads">Leads <ArrowRight className="size-4" /></Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link href={queueLinks.visit}>Visit Queue <ArrowRight className="size-4" /></Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link href={queueLinks.cad}>CAD Queue <ArrowRight className="size-4" /></Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link href={queueLinks.review}>Review Center <ArrowRight className="size-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function AdminCommandCenterDashboard({
  queueCounts,
  priorityActions,
  upcomingMeetings,
  budgetLeads,
  reviewSubmissions,
  designWatch,
  visitInsights,
  overduePendingVisits,
  visitTeamPerformance,
  visitTeamPerformanceMonthKey,
  srCrmPerformance,
  jrArchitectPerformances,
  quotationPerformances,
  quotationPerformanceMonthKey,
}: CommandCenterDashboardProps) {
  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/20">
      <CrmPageHeader
        title="Admin Command Center"
        subtitle="One-page control room for queue monitoring, approvals, visits, meetings, and budget work."
      />

      <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <QueueStatusGrid counts={queueCounts} />
        <VisitPendingRedAlertSection items={overduePendingVisits} totalCount={visitInsights.pendingOverdueCount} />
        <SrCrmPerformanceSection members={srCrmPerformance} />
        <VisitTeamPerformanceSection members={visitTeamPerformance} monthKey={visitTeamPerformanceMonthKey} />
        <LeaderboardCard performances={jrArchitectPerformances} title="JR Architect Performance Leaderboard" />
        <QuotationLeaderboardSection
          initialPerformances={quotationPerformances}
          initialMonthKey={quotationPerformanceMonthKey}
        />

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <PriorityActionCard priorityActions={priorityActions} />
          <div className="grid gap-6">
            <UpcomingMeetingsCard upcomingMeetings={upcomingMeetings} />
            <BudgetQuotationWatchCard budgetLeads={budgetLeads} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <ReviewSnapshotCard reviewSubmissions={reviewSubmissions} />
          <CommandShortcutsCard />
        </section>

        <DesignFlowCard designWatch={designWatch} />
        <VisitInsightsSection visitInsights={visitInsights} />
      </main>
    </div>
  )
}
