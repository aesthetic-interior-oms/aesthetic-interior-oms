'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import {
  CheckCircle2,
  CircleAlert,
  Ban,
  CalendarClock,
  ClipboardCheck,
  Download,
  FileText,
  ListFilter,
  Sparkles,
  ImageIcon,
  Loader2,
  MapPin,
  Phone,
  RotateCcw,
  Send,
  Search,
  UserRound,
} from 'lucide-react'
import { formatCadSubmissionFileType } from '@/lib/cad-work'
import { toast } from 'sonner'

type ReviewFile = {
  id: string
  url: string
  fileName: string
  fileType: string
  cadFileType: string
  sizeBytes: number | null
}

const ALL_MEMBER_FILTER = 'ALL_MEMBERS'
const ALL_MONTH_FILTER = 'ALL_MONTHS'
const ALL_STAGE_FILTER = 'ALL_STAGES'

type DepartmentUser = { id: string; fullName: string; email: string }

type ReviewSubmission = {
  id: string
  note: string | null
  submittedAt: string
  lead: {
    id: string
    name: string
    phone: string | null
    location: string | null
    stage: string
    subStatus: string | null
    srCrmAssignment: {
      id: string
      user: DepartmentUser
    } | null
    latestCompletedVisit: {
      id: string
      scheduledAt: string
    } | null
  }
  submittedBy: {
    id: string
    fullName: string
    email: string
  }
  files: ReviewFile[]
}

type ReviewApiResponse = {
  success: boolean
  data?: ReviewSubmission[]
  error?: string
}

type ReviewDecision = 'APPROVE' | 'CORRECTION' | 'DROP'

type ReviewStatCard = {
  key: string
  label: string
  count: number
  Icon: ComponentType<{ className?: string }>
  className: string
  iconClassName: string
  accentClassName: string
}

const REVIEW_STATUS_STATS: Array<{
  key: string
  label: string
  Icon: ComponentType<{ className?: string }>
  className: string
  iconClassName: string
  accentClassName: string
}> = [
  {
    key: 'CAD_COMPLETED',
    label: 'CAD Completed',
    Icon: ClipboardCheck,
    className: 'border-violet-200/70 from-violet-50 via-white to-fuchsia-50 text-violet-800 dark:border-violet-500/30 dark:from-violet-950/60 dark:via-slate-950 dark:to-fuchsia-950/40 dark:text-violet-100',
    iconClassName: 'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/20',
    accentClassName: 'from-violet-500 to-fuchsia-500',
  },
  {
    key: 'CAD_APPROVED',
    label: 'CAD Approved',
    Icon: CheckCircle2,
    className: 'border-emerald-200/70 from-emerald-50 via-white to-teal-50 text-emerald-800 dark:border-emerald-500/30 dark:from-emerald-950/60 dark:via-slate-950 dark:to-teal-950/40 dark:text-emerald-100',
    iconClassName: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20',
    accentClassName: 'from-emerald-500 to-teal-500',
  },
  {
    key: 'FIRST_MEETING_SET',
    label: 'First Meeting Set',
    Icon: CalendarClock,
    className: 'border-sky-200/70 from-sky-50 via-white to-cyan-50 text-sky-800 dark:border-sky-500/30 dark:from-sky-950/60 dark:via-slate-950 dark:to-cyan-950/40 dark:text-sky-100',
    iconClassName: 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/20',
    accentClassName: 'from-sky-500 to-cyan-500',
  },
  {
    key: 'PROPOSAL_SENT',
    label: 'Quotation Sent',
    Icon: Send,
    className: 'border-amber-200/70 from-amber-50 via-white to-orange-50 text-amber-800 dark:border-amber-500/30 dark:from-amber-950/60 dark:via-slate-950 dark:to-orange-950/40 dark:text-amber-100',
    iconClassName: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/20',
    accentClassName: 'from-amber-500 to-orange-500',
  },
]

const TOTAL_REVIEW_STAT = {
  label: 'Total Review',
  Icon: ListFilter,
  className: 'border-slate-200/80 from-slate-900 via-slate-800 to-slate-950 text-white dark:border-white/10 dark:from-slate-100 dark:via-white dark:to-slate-200 dark:text-slate-950',
  iconClassName: 'bg-white/15 text-white ring-white/25 dark:bg-slate-950/10 dark:text-slate-950 dark:ring-slate-950/15',
  accentClassName: 'from-primary to-amber-400',
}

type ReviewCenterViewProps = {
  title?: string
  subtitle?: string
  myLeadsOnly?: boolean
  leadBasePath?: string
  showSrCrmFilter?: boolean
}

function formatLabel(value: string | null | undefined): string {
  if (!value) return 'N/A'
  if (value === 'DISCOVERY') return 'Consulting Phase'
  if (value === 'PROPOSAL_SENT') return 'Quotation Sent'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getSubmissionKind(submission: ReviewSubmission): 'quotation' | 'visualizer' | 'cad' {
  if (submission.lead.stage === 'QUOTATION_PHASE') return 'quotation'
  if (submission.lead.stage === 'VISUALIZATION_PHASE') return 'visualizer'
  return 'cad'
}

function isSubmissionPendingReview(submission: ReviewSubmission): boolean {
  return (
    (submission.lead.stage === 'CAD_PHASE' && submission.lead.subStatus === 'CAD_COMPLETED') ||
    (submission.lead.stage === 'QUOTATION_PHASE' && submission.lead.subStatus === 'QUOTATION_COMPLETED') ||
    (submission.lead.stage === 'VISUALIZATION_PHASE' && submission.lead.subStatus === 'VISUAL_COMPLETED')
  )
}


function getReviewActionUnavailableMessage(submission: ReviewSubmission): string | null {
  if (isSubmissionPendingReview(submission)) return null
  if (submission.lead.subStatus === 'CAD_APPROVED') {
    return 'CAD has already been approved. Approval and correction actions are only available while CAD is completed and pending review.'
  }
  if (submission.lead.subStatus === 'FIRST_MEETING_SET') {
    return 'This lead already moved to First Meeting Set after review. Review actions are no longer available.'
  }
  if (submission.lead.subStatus === 'PROPOSAL_SENT') {
    return 'This lead already moved to Quotation Sent after review. Review actions are no longer available.'
  }
  if (submission.lead.subStatus?.includes('APPROVED')) {
    return 'This submission has already been approved. Review actions are only available for pending submissions.'
  }
  return 'Review actions are only available for submissions currently pending Senior CRM/Admin review.'
}

function getSubmissionKindLabel(submission: ReviewSubmission): string {
  const kind = getSubmissionKind(submission)
  if (kind === 'quotation') return 'Quotation'
  if (kind === 'visualizer') return '3D Visualization'
  return 'CAD'
}

function isImageFile(file: ReviewFile): boolean {
  return file.fileType.toLowerCase().startsWith('image/')
}

function getDownloadUrl(url: string): string {
  return url.includes('?') ? `${url}&download=1` : `${url}?download=1`
}

function formatMonth(value: string | null | undefined): string {
  if (!value) return 'No Visit Date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No Visit Date'
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function toVisitMonthValue(value: string | null | undefined): string {
  if (!value) return 'NO_VISIT_DATE'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'NO_VISIT_DATE'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatSubmittedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatFileSize(sizeBytes: number | null): string {
  if (!sizeBytes || sizeBytes <= 0) return 'Unknown size'
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function FilePreviewCard({ file }: { file: ReviewFile }) {
  if (isImageFile(file)) {
    return (
      <div
        className="group relative h-20 w-28 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted transition hover:border-primary/50"
        title={`${file.fileName} • ${formatCadSubmissionFileType(file.cadFileType)}`}
      >
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-10"
          aria-label={`Open ${file.fileName}`}
        />
        <span
          className="absolute inset-0 block bg-cover bg-center"
          style={{ backgroundImage: `url("${file.url}")` }}
        />
        <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/35" />
        <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
          {formatCadSubmissionFileType(file.cadFileType)}
        </span>
        <a
          href={getDownloadUrl(file.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-1 top-1 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow transition group-hover:opacity-100"
          title="Download file"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>
    )
  }

  return (
    <div
      className="group relative inline-flex h-20 min-w-[220px] shrink-0 flex-col justify-between rounded-md border border-border/70 bg-card px-3 py-2 transition hover:border-primary/50 hover:bg-accent/25"
      title={file.fileName}
    >
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-10"
        aria-label={`Open ${file.fileName}`}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-xs font-medium text-foreground">{file.fileName}</p>
        </div>
        <a
          href={getDownloadUrl(file.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="z-20 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground opacity-0 transition group-hover:opacity-100"
          title="Download file"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] text-muted-foreground">
          {formatCadSubmissionFileType(file.cadFileType)}
        </p>
        <p className="text-[11px] text-muted-foreground">{formatFileSize(file.sizeBytes)}</p>
      </div>
    </div>
  )
}

export function ReviewCenterView({
  title = 'Review Center',
  subtitle = 'Review completed CAD, quotation, and 3D visualization submissions with quick preview and handoff notes.',
  myLeadsOnly = true,
  leadBasePath = '/crm/sr/leads',
  showSrCrmFilter = false,
}: ReviewCenterViewProps) {
  const [submissions, setSubmissions] = useState<ReviewSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false)
  const [decisionTarget, setDecisionTarget] = useState<ReviewSubmission | null>(null)
  const [decisionType, setDecisionType] = useState<ReviewDecision>('APPROVE')
  const [decisionSummary, setDecisionSummary] = useState('')
  const [decisionBusy, setDecisionBusy] = useState(false)
  const [srCrmFilter, setSrCrmFilter] = useState(ALL_MEMBER_FILTER)
  const [visitMonthFilter, setVisitMonthFilter] = useState(ALL_MONTH_FILTER)
  const [stageFilter, setStageFilter] = useState(ALL_STAGE_FILTER)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 400)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '50',
        myLeadsOnly: myLeadsOnly ? '1' : '0',
      })
      if (search) params.set('search', search)
      if (showSrCrmFilter && srCrmFilter !== ALL_MEMBER_FILTER) {
        params.set('srCrmId', srCrmFilter)
      }
      if (visitMonthFilter !== ALL_MONTH_FILTER) {
        params.set('visitMonth', visitMonthFilter)
      }

      const response = await fetch(`/api/cad-work/review-center?${params.toString()}`, {
        cache: 'no-store',
      })
      const payload = (await response.json()) as ReviewApiResponse
      if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
        throw new Error(payload.error ?? 'Failed to fetch CAD review submissions')
      }

      setSubmissions(payload.data)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch review submissions')
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }, [myLeadsOnly, search, showSrCrmFilter, srCrmFilter, visitMonthFilter])

  useEffect(() => {
    void fetchSubmissions()
  }, [fetchSubmissions])

  const openDecisionDialog = useCallback((submission: ReviewSubmission, decision: ReviewDecision) => {
    setDecisionTarget(submission)
    setDecisionType(decision)
    setDecisionSummary('')
    setDecisionDialogOpen(true)
  }, [])

  const handleConfirmDecision = useCallback(async () => {
    if (!decisionTarget) return
    if ((decisionType === 'CORRECTION' || decisionType === 'DROP') && decisionSummary.trim().length === 0) {
      toast.error(decisionType === 'DROP' ? 'Drop reason is required' : 'Correction summary is required')
      return
    }

    try {
      setDecisionBusy(true)
      const response = await fetch(`/api/cad-work/review-center/${decisionTarget.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: decisionType,
          summary: decisionSummary.trim() || null,
        }),
      })
      const payload = (await response.json()) as { success?: boolean; message?: string; error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to process review decision')
      }

      toast.success(payload.message ?? 'Review decision saved')
      setDecisionDialogOpen(false)
      setDecisionTarget(null)
      setDecisionSummary('')
      await fetchSubmissions()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to process review decision')
      await fetchSubmissions()
    } finally {
      setDecisionBusy(false)
    }
  }, [decisionSummary, decisionTarget, decisionType, fetchSubmissions])


  const srCrmFilterOptions = useMemo(() => {
    const options = new Map<string, DepartmentUser>()
    for (const submission of submissions) {
      const user = submission.lead.srCrmAssignment?.user
      if (user) options.set(user.id, user)
    }
    return Array.from(options.values()).sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [submissions])

  const visitMonthFilterOptions = useMemo(() => {
    const options = new Map<string, string>()
    let hasNoVisitDate = false
    for (const submission of submissions) {
      const visitDate = submission.lead.latestCompletedVisit?.scheduledAt
      const value = toVisitMonthValue(visitDate)
      if (value === 'NO_VISIT_DATE') {
        hasNoVisitDate = true
        continue
      }
      options.set(value, formatMonth(visitDate))
    }
    const sorted = Array.from(options.entries()).sort(([a], [b]) => b.localeCompare(a))
    if (hasNoVisitDate) sorted.push(['NO_VISIT_DATE', 'No Visit Date'])
    return sorted
  }, [submissions])

  const statCards = useMemo(() => {
    const cards: ReviewStatCard[] = [
      {
        key: ALL_STAGE_FILTER,
        label: TOTAL_REVIEW_STAT.label,
        count: submissions.length,
        Icon: TOTAL_REVIEW_STAT.Icon,
        className: TOTAL_REVIEW_STAT.className,
        iconClassName: TOTAL_REVIEW_STAT.iconClassName,
        accentClassName: TOTAL_REVIEW_STAT.accentClassName,
      },
    ]

    for (const item of REVIEW_STATUS_STATS) {
      cards.push({
        ...item,
        count: submissions.filter((submission) => submission.lead.subStatus === item.key).length,
      })
    }

    return cards
  }, [submissions])

  const filteredSubmissions = useMemo(() => {
    if (stageFilter === ALL_STAGE_FILTER) return submissions
    return submissions.filter(
      (submission) => submission.lead.subStatus === stageFilter || submission.lead.stage === stageFilter,
    )
  }, [stageFilter, submissions])

  const filteredTotalFiles = useMemo(
    () => filteredSubmissions.reduce((count, submission) => count + submission.files.length, 0),
    [filteredSubmissions],
  )

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title={title}
        subtitle={subtitle}
      />

      <main className="mx-auto max-w-[1440px] px-4 py-6">
        <Card className="mb-4 border-border/70">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-[180px] items-center gap-2 text-sm font-semibold text-foreground">
                <ListFilter className="h-4 w-4 text-primary" />
                Filter Review Center
              </div>
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by lead name, phone, or file..."
                  className="pl-10"
                />
              </div>
              <div className="w-full sm:w-56">
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statCards.map((card) => (
                      <SelectItem key={card.key} value={card.key}>
                        {card.label} ({card.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showSrCrmFilter ? (
                <div className="w-full sm:w-56">
                  <Select value={srCrmFilter} onValueChange={setSrCrmFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by SR CRM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_MEMBER_FILTER}>All SR CRMs</SelectItem>
                      {srCrmFilterOptions.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="w-full sm:w-56">
                <Select value={visitMonthFilter} onValueChange={setVisitMonthFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Visit Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_MONTH_FILTER}>All Visit Months</SelectItem>
                    {visitMonthFilterOptions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="h-9 px-3">
                {filteredSubmissions.length} submission{filteredSubmissions.length === 1 ? '' : 's'} • {filteredTotalFiles} file
                {filteredTotalFiles === 1 ? '' : 's'}
              </Badge>
            </div>

            <div className="rounded-[1.35rem] border border-border/70 bg-gradient-to-br from-background via-muted/20 to-background p-3 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Review Intelligence
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Premium snapshot of the active review queue and approval flow.
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  Live queue metrics
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {statCards.map((card) => {
                  const Icon = card.Icon
                  const percentage = submissions.length > 0 ? Math.round((card.count / submissions.length) * 100) : 0
                  const isActive = stageFilter === card.key

                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => setStageFilter(card.key)}
                      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${card.className} ${isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                      aria-pressed={isActive}
                    >
                      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/30 blur-2xl transition group-hover:scale-125 dark:bg-white/10" />
                      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accentClassName}`} />

                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] opacity-75">
                            {card.label}
                          </p>
                          <div className="mt-3 flex items-end gap-2">
                            <p className="text-3xl font-black leading-none tracking-tight">
                              {card.count}
                            </p>
                            <span className="mb-0.5 rounded-full bg-white/45 px-2 py-0.5 text-[10px] font-bold shadow-sm ring-1 ring-black/5 dark:bg-black/15 dark:ring-white/10">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                        <span className={`rounded-2xl p-2.5 shadow-sm ring-1 ${card.iconClassName}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>

                      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                        <span
                          className={`block h-full rounded-full bg-gradient-to-r ${card.accentClassName} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="relative mt-2 text-[11px] font-medium opacity-70">
                        {card.key === ALL_STAGE_FILTER ? 'All submissions in view' : 'Share of total review queue'}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No submissions found for review.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((submission) => (
              <Card
                key={submission.id}
                className="overflow-hidden border-border/70 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`${leadBasePath}/${submission.lead.id}`}
                        className="truncate text-base font-semibold text-foreground hover:text-primary hover:underline"
                      >
                        {submission.lead.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{getSubmissionKindLabel(submission)}</Badge>
                        <Badge variant="secondary">{formatLabel(submission.lead.stage)}</Badge>
                        {submission.lead.subStatus ? (
                          <Badge variant="outline">{formatLabel(submission.lead.subStatus)}</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(() => {
                        const unavailableMessage = getReviewActionUnavailableMessage(submission)

                        if (!unavailableMessage) {
                          return (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openDecisionDialog(submission, 'APPROVE')}
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDecisionDialog(submission, 'CORRECTION')}
                              >
                                <RotateCcw className="mr-1 h-4 w-4" />
                                Correction
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openDecisionDialog(submission, 'DROP')}
                              >
                                <Ban className="mr-1 h-4 w-4" />
                                Drop Project
                              </Button>
                            </>
                          )
                        }

                        return (
                          <div className="flex flex-wrap items-center gap-2" title={unavailableMessage}>
                            <Badge variant="outline" className="h-8 gap-1.5 border-amber-200 bg-amber-50 px-2.5 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                              <CircleAlert className="h-3.5 w-3.5" />
                              Already moved
                            </Badge>
                            <Button size="sm" variant="secondary" disabled>
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" disabled>
                              <RotateCcw className="mr-1 h-4 w-4" />
                              Correction
                            </Button>
                            <Button size="sm" variant="destructive" disabled>
                              <Ban className="mr-1 h-4 w-4" />
                              Drop Project
                            </Button>
                          </div>
                        )
                      })()}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`${leadBasePath}/${submission.lead.id}`}>Open Lead</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {submission.lead.phone || 'No phone'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {submission.lead.location || 'No location'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" />
                      Submitted by {submission.submittedBy.fullName}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatSubmittedAt(submission.submittedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Visit: {formatMonth(submission.lead.latestCompletedVisit?.scheduledAt)}
                    </span>
                  </div>

                  {submission.note ? (
                    <div className="rounded-md border border-border/70 bg-muted/35 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Submission Note
                      </p>
                      <p className="mt-1 text-sm text-foreground">{submission.note}</p>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Submitted Files
                    </p>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {submission.files.map((file) => (
                        <FilePreviewCard key={file.id} file={file} />
                      ))}
                      {submission.files.length === 0 ? (
                        <div className="inline-flex h-20 min-w-[230px] items-center gap-2 rounded-md border border-dashed border-border/70 px-3 text-xs text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                          No files were submitted with this record.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog
        open={decisionDialogOpen}
        onOpenChange={(open) => {
          if (decisionBusy) return
          setDecisionDialogOpen(open)
          if (!open) {
            setDecisionTarget(null)
            setDecisionSummary('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decisionType === 'APPROVE' ? 'Approve Submission' : decisionType === 'DROP' ? 'Drop Project' : 'Send for Correction'}</DialogTitle>
            <DialogDescription>
              {decisionTarget
                ? decisionType === 'APPROVE'
                  ? getSubmissionKind(decisionTarget) === 'quotation'
                    ? `Confirm quotation approval for ${decisionTarget.lead.name}. Lead will move to Quotation Phase / Quotation Approved and leave this review queue.`
                    : getSubmissionKind(decisionTarget) === 'visualizer'
                      ? `Confirm 3D visualization approval for ${decisionTarget.lead.name}. Lead will move to Visualization Phase / Client Approved and leave this review queue.`
                      : `Confirm CAD approval for ${decisionTarget.lead.name}. Lead will move to CAD Approved and leave this review queue.`
                  : decisionType === 'DROP'
                    ? `Drop ${decisionTarget.lead.name}. Lead will move to Closed / Project Dropped and leave this review queue.`
                    : getSubmissionKind(decisionTarget) === 'quotation'
                      ? `Send ${decisionTarget.lead.name} back to the assigned quotation team for correction. It will leave this review queue.`
                      : getSubmissionKind(decisionTarget) === 'visualizer'
                        ? `Send ${decisionTarget.lead.name} back to the assigned 3D Visualizer for correction. It will leave this review queue.`
                        : `Send ${decisionTarget.lead.name} back to Junior Architect for correction. Lead will move to CAD Assigned and leave this review queue.`
                : 'Confirm your review decision.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {decisionType === 'APPROVE' ? 'Optional Note' : decisionType === 'DROP' ? 'Drop Reason' : 'Correction Summary'}
            </p>
            <Textarea
              rows={4}
              placeholder={
                decisionType === 'APPROVE'
                  ? 'Optional approval note for history...'
                  : decisionType === 'DROP'
                    ? 'Required: explain why this project is being dropped...'
                    : 'Required: explain what should be corrected...'
              }
              value={decisionSummary}
              onChange={(event) => setDecisionSummary(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={decisionBusy}
              onClick={() => {
                if (decisionBusy) return
                setDecisionDialogOpen(false)
                setDecisionTarget(null)
                setDecisionSummary('')
              }}
            >
              Cancel
            </Button>
            <Button type="button" disabled={decisionBusy} onClick={handleConfirmDecision}>
              {decisionBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : decisionType === 'APPROVE' ? (
                'Confirm Approve'
              ) : decisionType === 'DROP' ? (
                'Drop Project'
              ) : (
                'Send Correction'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SeniorCrmReviewCenterPage() {
  return <ReviewCenterView />
}
