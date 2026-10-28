'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  CheckCircle,
  ClipboardList,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  MapPin,
  PenTool,
  Phone,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CAD_SUBMISSION_FILE_TYPE_OPTIONS,
  type CadSubmissionFileTypeValue,
  formatCadSubmissionFileType,
} from '@/lib/cad-work'
import { uploadDirectGCSFile, type UploadedGCSFileMeta } from '@/lib/client-gcs-upload'
import {
  CAD_WORK_UPLOAD_LIMIT_MESSAGE,
  CAD_WORK_UPLOAD_MAX_BYTES,
  formatBytesToMbLabel,
} from '@/lib/upload-limits'

type CadTaskLead = {
  id: string
  name: string
  phone: string | null
  location: string | null
  stage: string
  subStatus: string | null
  updatedAt: string
  createdAt: string
  budget: number | null
  visitDate: string | null
  visitMonthKey: string | null
  projectSqft: number | null
  srCrmAssignee: {
    id: string
    fullName: string
    email: string
  } | null
  jrArchitectAssignee: {
    id: string
    fullName: string
    email: string
  } | null
  latestFirstMeeting: {
    id: string
    title: string
    notes: string | null
    startsAt: string
  } | null
  latestPhaseTask: {
    id: string
    status: string
    currentReviewRound: number
    dueAt: string | null
    completedAt: string | null
    workDetails: string | null
  } | null
  isRework: boolean
  canStart: boolean
  canSubmit: boolean
  attachments?: Array<{
    id: string
    fileName: string
    url: string
    fileType: string | null
    category?: string
    sizeBytes?: number | null
    createdAt?: string
  }>
  submissions?: Array<{
    id: string
    note: string | null
    submittedAt: string
    files: Array<{
      id: string
      fileName: string
      url: string
      fileType: string
      cadFileType: string
      sizeBytes: number | null
    }>
  }>
}

type SubmissionRow = {
  id: string
  cadFileType: CadSubmissionFileTypeValue
  file: File | null
}

function createCadSubmissionRow(
  cadFileType: CadSubmissionFileTypeValue = 'FLOOR_PLAN',
): SubmissionRow {
  return {
    id: crypto.randomUUID(),
    cadFileType,
    file: null,
  }
}

function formatLabel(value: string | null | undefined): string {
  if (!value) return 'N/A'
  if (value === 'CAD_ASSIGNED') return 'CAD Assigned'
  if (value === 'CAD_WORKING') return 'CAD Working'
  if (value === 'CAD_COMPLETED') return 'In Review'
  if (value === 'CAD_APPROVED') return 'CAD Approved'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getRecentMonthsList() {
  const months: { label: string; value: string }[] = [
    { label: 'All Visit Months', value: 'ALL' },
    { label: 'No Visit Date', value: 'NO_VISIT' },
  ]
  const now = new Date()

  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    months.push({
      label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      value: `${yyyy}-${mm}`,
    })
  }

  return months
}

export default function JrArchitectAssignedWorkPage() {
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [leads, setLeads] = useState<CadTaskLead[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const availableMonths = useMemo(() => getRecentMonthsList(), [])
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const selectedMonthLabel =
    availableMonths.find((month) => month.value === selectedMonth)?.label ?? 'All Visit Months'

  const [selectedStatFilter, setSelectedStatFilter] = useState<string>('total')

  // Start work dialog states
  const [startWorkOpen, setStartWorkOpen] = useState(false)
  const [startWorkLead, setStartWorkLead] = useState<CadTaskLead | null>(null)
  const [startingWork, setStartingWork] = useState(false)

  // Submit work dialog states
  const [submitWorkOpen, setSubmitWorkOpen] = useState(false)
  const [submitWorkLead, setSubmitWorkLead] = useState<CadTaskLead | null>(null)
  const [submittingWork, setSubmittingWork] = useState(false)
  const [submissionNote, setSubmissionNote] = useState('')
  const [submissionProjectSqft, setSubmissionProjectSqft] = useState('')
  const [submissionRows, setSubmissionRows] = useState<SubmissionRow[]>([createCadSubmissionRow()])

  const loadTasks = useCallback(async (monthKey = 'ALL', silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (monthKey && monthKey !== 'ALL') params.set('month', monthKey)

      const response = await fetch(`/api/cad-work/assigned-tasks?${params.toString()}`, {
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
        throw new Error(payload?.error ?? 'Failed to load assigned CAD tasks')
      }
      setLeads(payload.data as CadTaskLead[])
    } catch (error) {
      if (!silent) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to load assigned CAD tasks',
        )
        setLeads([])
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTasks(selectedMonth)

    // Auto-refresh tasks every 30 seconds when tab is active so changes from team sync live
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadTasks(selectedMonth, true)
      }
    }, 30000)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadTasks(selectedMonth, true)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [loadTasks, selectedMonth])

  const summary = useMemo(
    () => ({
      total: leads.length,
      assigned: leads.filter((lead) => lead.subStatus === 'CAD_ASSIGNED').length,
      working: leads.filter((lead) => lead.subStatus === 'CAD_WORKING' && !lead.isRework).length,
      inReview: leads.filter((lead) => lead.subStatus === 'CAD_COMPLETED').length,
      corrections: leads.filter((lead) => lead.isRework).length,
      totalSqft: leads.reduce((sum, l) => sum + (l.projectSqft ?? 0), 0),
    }),
    [leads],
  )

  const filteredLeads = useMemo(() => {
    let result = leads

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((lead) => {
        const nameMatch = lead.name?.toLowerCase().includes(q)
        const phoneMatch = lead.phone?.toLowerCase().includes(q)
        const locationMatch = lead.location?.toLowerCase().includes(q)
        const stageMatch = formatLabel(lead.stage).toLowerCase().includes(q)
        const subStatusMatch = formatLabel(lead.subStatus).toLowerCase().includes(q)
        const srMatch = lead.srCrmAssignee?.fullName?.toLowerCase().includes(q)
        const jrMatch = lead.jrArchitectAssignee?.fullName?.toLowerCase().includes(q)
        return (
          nameMatch ||
          phoneMatch ||
          locationMatch ||
          stageMatch ||
          subStatusMatch ||
          srMatch ||
          jrMatch
        )
      })
    }

    if (selectedStatFilter === 'assigned') {
      result = result.filter((lead) => lead.subStatus === 'CAD_ASSIGNED')
    } else if (selectedStatFilter === 'working') {
      result = result.filter((lead) => lead.subStatus === 'CAD_WORKING' && !lead.isRework)
    } else if (selectedStatFilter === 'inReview') {
      result = result.filter((lead) => lead.subStatus === 'CAD_COMPLETED')
    } else if (selectedStatFilter === 'corrections') {
      result = result.filter((lead) => lead.isRework)
    } else if (selectedStatFilter === 'sqft') {
      result = result.filter((lead) => (lead.projectSqft ?? 0) > 0)
    }

    return result
  }, [leads, searchQuery, selectedStatFilter])

  const openStartWorkDialog = useCallback((lead: CadTaskLead) => {
    setStartWorkLead(lead)
    setStartWorkOpen(true)
  }, [])

  const handleStartWork = useCallback(async () => {
    if (!startWorkLead) return
    setStartingWork(true)
    setBusyId(startWorkLead.id)
    try {
      const response = await fetch(`/api/lead/${startWorkLead.id}/cad-work/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Started from JR Architect assigned task board',
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to start CAD work')
      }
      toast.success(payload.message ?? 'CAD work started')
      setStartWorkOpen(false)
      setStartWorkLead(null)
      await loadTasks(selectedMonth)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start CAD work')
    } finally {
      setStartingWork(false)
      setBusyId(null)
    }
  }, [loadTasks, selectedMonth, startWorkLead])

  const openSubmitWorkDialog = useCallback((lead: CadTaskLead) => {
    setSubmitWorkLead(lead)
    setSubmissionRows([createCadSubmissionRow()])
    setSubmissionNote('')
    setSubmissionProjectSqft(lead.projectSqft ? String(lead.projectSqft) : '')
    setSubmitWorkOpen(true)
  }, [])

  const updateSubmissionType = useCallback(
    (rowId: string, value: CadSubmissionFileTypeValue) => {
      setSubmissionRows((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, cadFileType: value } : row)),
      )
    },
    [],
  )

  const updateSubmissionFile = useCallback((rowId: string, file: File | null) => {
    setSubmissionRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, file } : row)),
    )
  }, [])

  const addSubmissionRow = useCallback(() => {
    setSubmissionRows((prev) => [...prev, createCadSubmissionRow('OTHERS')])
  }, [])

  const removeSubmissionRow = useCallback((rowId: string) => {
    setSubmissionRows((prev) => prev.filter((row) => row.id !== rowId))
  }, [])

  const handleSubmitWork = useCallback(async () => {
    if (!submitWorkLead) return

    const parsedProjectSqft = Number(submissionProjectSqft.replace(/,/g, '').trim())
    if (!Number.isFinite(parsedProjectSqft) || parsedProjectSqft <= 0) {
      toast.error('Please enter a valid project sqft before submitting CAD work')
      return
    }

    const rowsWithFiles = submissionRows.filter((row) => Boolean(row.file))
    if (rowsWithFiles.length === 0) {
      toast.error('Please select at least one CAD file or drawing to upload')
      return
    }

    const oversizeRow = rowsWithFiles.find(
      (row) => row.file && row.file.size > CAD_WORK_UPLOAD_MAX_BYTES,
    )
    if (oversizeRow?.file) {
      toast.error(
        `"${oversizeRow.file.name}" is ${formatBytesToMbLabel(oversizeRow.file.size)}. Direct upload supports up to ${formatBytesToMbLabel(CAD_WORK_UPLOAD_MAX_BYTES)} per file.`,
      )
      return
    }

    setSubmittingWork(true)
    setBusyId(submitWorkLead.id)
    try {
      const uploadedFiles: Array<UploadedGCSFileMeta & { cadFileType: CadSubmissionFileTypeValue }> = []
      for (const row of rowsWithFiles) {
        if (!row.file) continue
        const uploaded = await uploadDirectGCSFile({
          file: row.file,
          context: 'cad-work',
          ownerId: submitWorkLead.id,
        })
        uploadedFiles.push({ ...uploaded, cadFileType: row.cadFileType })
      }

      const response = await fetch(`/api/lead/${submitWorkLead.id}/cad-work/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: submissionNote.trim() || null,
          projectSqft: parsedProjectSqft,
          files: uploadedFiles,
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        if (response.status === 413) {
          throw new Error(`Upload request too large. ${CAD_WORK_UPLOAD_LIMIT_MESSAGE}`)
        }
        throw new Error(payload?.error ?? 'Failed to submit CAD work')
      }

      toast.success(payload.message ?? 'CAD work submitted to Senior CRM Review Center')
      setSubmitWorkOpen(false)
      setSubmitWorkLead(null)
      setSubmissionRows([createCadSubmissionRow()])
      setSubmissionNote('')
      setSubmissionProjectSqft('')
      await loadTasks(selectedMonth)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit CAD work')
    } finally {
      setSubmittingWork(false)
      setBusyId(null)
    }
  }, [loadTasks, selectedMonth, submissionNote, submissionProjectSqft, submissionRows, submitWorkLead])

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="Assigned CAD Work"
        subtitle="Manage and execute active CAD phase assignments with direct 200MB Google Cloud uploads."
      />

      <main className="mx-auto max-w-[1440px] px-6 py-6 space-y-4">
        {/* Metric Overview Section */}
        <div className="rounded-[1.35rem] border border-border/70 bg-gradient-to-br from-background via-muted/20 to-background p-3.5 shadow-sm mb-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Active CAD Phase Metrics
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Overview of current active CAD tasks in your department. Completed/approved tasks leave this queue automatically.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex items-center min-w-[220px] max-w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by client, phone, location, CRM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 pr-8 text-sm"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                {selectedMonthLabel}
              </Badge>
              <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-2 py-1">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-9 w-[180px] border-0 px-2 shadow-none focus:ring-0">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 gap-2"
                disabled={loading}
                onClick={() => void loadTasks(selectedMonth)}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              {
                key: 'total',
                label: 'Active CAD Leads',
                value: summary.total,
                isSqft: false,
                Icon: ClipboardList,
                className:
                  'border-slate-200/80 from-slate-900 via-slate-800 to-slate-950 text-white dark:border-white/10 dark:from-slate-100 dark:via-white dark:to-slate-200 dark:text-slate-950',
                iconClass:
                  'bg-white/15 text-white ring-white/25 dark:bg-slate-950/10 dark:text-slate-950 dark:ring-slate-950/15',
                accentClass: 'from-primary to-blue-400',
              },
              {
                key: 'assigned',
                label: 'CAD Assigned',
                value: summary.assigned,
                isSqft: false,
                Icon: UserRound,
                className:
                  'border-blue-200/70 from-blue-50 via-white to-sky-50 text-blue-800 dark:border-blue-500/30 dark:from-blue-950/60 dark:via-slate-950 dark:to-sky-950/40 dark:text-blue-100',
                iconClass:
                  'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/20',
                accentClass: 'from-blue-500 to-sky-500',
              },
              {
                key: 'working',
                label: 'CAD Working',
                value: summary.working,
                isSqft: false,
                Icon: PenTool,
                className:
                  'border-amber-200/70 from-amber-50 via-white to-orange-50 text-amber-800 dark:border-amber-500/30 dark:from-amber-950/60 dark:via-slate-950 dark:to-orange-950/40 dark:text-amber-100',
                iconClass:
                  'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/20',
                accentClass: 'from-amber-500 to-orange-500',
              },
              {
                key: 'inReview',
                label: 'Under Review',
                value: summary.inReview,
                isSqft: false,
                Icon: CheckCircle,
                className:
                  'border-emerald-200/70 from-emerald-50 via-white to-teal-50 text-emerald-800 dark:border-emerald-500/30 dark:from-emerald-950/60 dark:via-slate-950 dark:to-teal-950/40 dark:text-emerald-100',
                iconClass:
                  'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20',
                accentClass: 'from-emerald-500 to-teal-500',
              },
              {
                key: 'corrections',
                label: 'Corrections',
                value: summary.corrections,
                isSqft: false,
                Icon: RotateCcw,
                className:
                  'border-rose-200/70 from-rose-50 via-white to-pink-50 text-rose-800 dark:border-rose-500/30 dark:from-rose-950/60 dark:via-slate-950 dark:to-pink-950/40 dark:text-rose-100',
                iconClass:
                  'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/20',
                accentClass: 'from-rose-500 to-pink-500',
              },
              {
                key: 'sqft',
                label: 'Total Project SQFT',
                value: summary.totalSqft,
                isSqft: true,
                Icon: Layers,
                className:
                  'border-purple-200/70 from-purple-50 via-white to-indigo-50 text-purple-900 dark:border-purple-500/30 dark:from-purple-950/60 dark:via-slate-950 dark:to-indigo-950/40 dark:text-purple-100',
                iconClass:
                  'bg-purple-100 text-purple-700 ring-purple-200 dark:bg-purple-500/15 dark:text-purple-200 dark:ring-purple-400/20',
                accentClass: 'from-purple-500 to-indigo-500',
              },
            ].map((stat) => {
              const percentage =
                summary.total > 0 && !stat.isSqft
                  ? Math.round((Number(stat.value) / summary.total) * 100)
                  : 0
              const isSelected = selectedStatFilter === stat.key
              return (
                <button
                  type="button"
                  key={stat.key}
                  onClick={() =>
                    setSelectedStatFilter((prev) =>
                      prev === stat.key && stat.key !== 'total' ? 'total' : stat.key,
                    )
                  }
                  className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3.5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950 shadow-md scale-[1.02]'
                      : 'opacity-90 hover:opacity-100'
                  } ${stat.className}`}
                >
                  <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/30 blur-2xl transition group-hover:scale-125 dark:bg-white/10" />
                  <span
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.accentClass}`}
                  />

                  <div className="relative flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] opacity-80">
                        {stat.label}
                      </p>
                      <div className="mt-2.5 flex items-end gap-1.5">
                        <p className="text-2xl font-black leading-none tracking-tight">
                          {stat.isSqft ? Number(stat.value).toLocaleString() : stat.value}
                        </p>
                        {!stat.isSqft ? (
                          <span className="mb-0.5 rounded-full bg-white/45 px-1.5 py-0.5 text-[9px] font-bold shadow-sm ring-1 ring-black/5 dark:bg-black/15 dark:ring-white/10">
                            {percentage}%
                          </span>
                        ) : (
                          <span className="mb-0.5 text-[10px] font-bold opacity-75">sqft</span>
                        )}
                      </div>
                    </div>
                    <span className={`rounded-xl p-2 shadow-sm ring-1 ${stat.iconClass}`}>
                      <stat.Icon className="h-4 w-4" />
                    </span>
                  </div>

                  {!stat.isSqft ? (
                    <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                      <span
                        className={`block h-full rounded-full bg-gradient-to-r ${stat.accentClass} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {/* Filters and View Mode Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {searchQuery ? (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-semibold">
                <span>Search:</span>
                <span className="font-bold text-primary">&quot;{searchQuery}&quot;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null}
            {selectedStatFilter !== 'total' ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-semibold">
                  <span>Filter:</span>
                  <span className="font-bold text-primary uppercase">{selectedStatFilter}</span>
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px]">
                    {filteredLeads.length} leads
                  </span>
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedStatFilter('total')}
                >
                  <X className="mr-1 h-3 w-3" /> Clear Filter
                </Button>
              </div>
            ) : null}
            {!searchQuery && selectedStatFilter === 'total' ? (
              <span className="text-xs font-medium text-muted-foreground">
                Showing all <strong>{leads.length}</strong> active CAD tasks
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 rounded-md border p-1 bg-muted/20">
            <Button
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setViewMode('card')}
            >
              Card View
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setViewMode('table')}
            >
              Table View
            </Button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : leads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">No active CAD tasks found for {selectedMonthLabel}.</p>
              <p className="text-xs">
                Tasks automatically leave this page once approved or transitioned out of the CAD phase. Check{' '}
                <Link href="/crm/jr-architecture/my-work" className="text-primary underline">
                  My Work
                </Link>{' '}
                to access historical projects and past submissions.
              </p>
            </CardContent>
          </Card>
        ) : filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
              <p>No CAD tasks match your search or selected filter.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {searchQuery ? (
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </Button>
                ) : null}
                {selectedStatFilter !== 'total' ? (
                  <Button variant="outline" size="sm" onClick={() => setSelectedStatFilter('total')}>
                    Clear Filter
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Client / Project</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Location & SQFT</th>
                    <th className="px-4 py-3">Visit Date</th>
                    <th className="px-4 py-3">Senior CRM</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/crm/jr-architecture/leads/${lead.id}`}
                          className="font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
                        >
                          {lead.name}
                          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                        </Link>
                        {lead.phone ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" />
                            <a href={`tel:${lead.phone}`} className="hover:underline">
                              {lead.phone}
                            </a>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            variant={
                              lead.isRework
                                ? 'destructive'
                                : lead.subStatus === 'CAD_WORKING'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className={`text-[10px] font-semibold ${
                              lead.subStatus === 'CAD_WORKING' && !lead.isRework
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                : lead.subStatus === 'CAD_COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                  : ''
                            }`}
                          >
                            {lead.isRework ? 'Correction Required' : formatLabel(lead.subStatus)}
                          </Badge>
                          {lead.latestPhaseTask && lead.latestPhaseTask.currentReviewRound > 0 ? (
                            <span className="text-[10px] text-muted-foreground">
                              Round {lead.latestPhaseTask.currentReviewRound}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs truncate max-w-[180px]" title={lead.location ?? ''}>
                          {lead.location ?? '—'}
                        </div>
                        <div className="text-xs font-semibold text-primary mt-0.5">
                          {lead.projectSqft ? `${lead.projectSqft.toLocaleString()} sqft` : 'No SQFT'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {lead.visitDate
                          ? new Date(lead.visitDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {lead.srCrmAssignee ? (
                          <span className="font-medium text-foreground">
                            {lead.srCrmAssignee.fullName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.canStart ? (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 gap-1 text-xs"
                              disabled={busyId === lead.id}
                              onClick={() => openStartWorkDialog(lead)}
                            >
                              <Play className="h-3.5 w-3.5" />
                              Start Work
                            </Button>
                          ) : null}
                          {lead.canSubmit ? (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                              disabled={busyId === lead.id}
                              onClick={() => openSubmitWorkDialog(lead)}
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Submit Work
                            </Button>
                          ) : null}
                          {lead.subStatus === 'CAD_COMPLETED' ? (
                            <Badge variant="outline" className="text-xs py-1 px-2 text-emerald-700 border-emerald-300">
                              In Review
                            </Badge>
                          ) : null}
                          <Button asChild size="sm" variant="outline" className="h-8 px-2.5 text-xs">
                            <Link href={`/crm/jr-architecture/leads/${lead.id}`}>
                              Workspace
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Card View */
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredLeads.map((lead) => (
              <Card
                key={lead.id}
                className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg border-border/80 ${
                  lead.isRework
                    ? 'border-rose-300 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/20 via-background to-background'
                    : lead.subStatus === 'CAD_WORKING'
                      ? 'border-amber-300 dark:border-amber-900/60'
                      : ''
                }`}
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    lead.isRework
                      ? 'bg-rose-500'
                      : lead.subStatus === 'CAD_WORKING'
                        ? 'bg-amber-500'
                        : lead.subStatus === 'CAD_COMPLETED'
                          ? 'bg-emerald-500'
                          : 'bg-primary'
                  }`}
                />

                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/crm/jr-architecture/leads/${lead.id}`}
                        className="text-base font-bold hover:text-primary transition-colors flex items-center gap-1.5 truncate group"
                      >
                        <span className="truncate">{lead.name}</span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 flex-shrink-0" />
                      </Link>
                      {lead.phone ? (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />
                          <a href={`tel:${lead.phone}`} className="hover:underline">
                            {lead.phone}
                          </a>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge
                        variant={
                          lead.isRework
                            ? 'destructive'
                            : lead.subStatus === 'CAD_WORKING'
                              ? 'secondary'
                              : 'outline'
                        }
                        className={`text-[10px] font-bold ${
                          lead.subStatus === 'CAD_WORKING' && !lead.isRework
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                            : lead.subStatus === 'CAD_COMPLETED'
                              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                              : ''
                        }`}
                      >
                        {lead.isRework ? 'Correction' : formatLabel(lead.subStatus)}
                      </Badge>
                      {lead.latestPhaseTask && lead.latestPhaseTask.currentReviewRound > 0 ? (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Round {lead.latestPhaseTask.currentReviewRound}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-2.5 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Location
                      </span>
                      <p className="font-medium truncate flex items-center gap-1 mt-0.5" title={lead.location ?? ''}>
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{lead.location ?? 'Not specified'}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Project SQFT
                      </span>
                      <p className="font-bold text-foreground mt-0.5">
                        {lead.projectSqft ? `${lead.projectSqft.toLocaleString()} sqft` : '—'}
                      </p>
                    </div>
                    <div className="mt-1">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Visit Date
                      </span>
                      <p className="font-medium mt-0.5">
                        {lead.visitDate
                          ? new Date(lead.visitDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'No visit date'}
                      </p>
                    </div>
                    <div className="mt-1">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Senior CRM
                      </span>
                      <p className="font-medium truncate mt-0.5">
                        {lead.srCrmAssignee?.fullName ?? 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  {/* Correction note or meeting note banner */}
                  {lead.isRework && lead.latestPhaseTask?.workDetails ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                      <span className="font-bold block text-[10px] uppercase tracking-wide">
                        Senior CRM Correction Note:
                      </span>
                      <p className="mt-0.5 line-clamp-2">{lead.latestPhaseTask.workDetails}</p>
                    </div>
                  ) : lead.latestFirstMeeting?.notes ? (
                    <div className="rounded-lg border border-border/50 bg-background/50 p-2.5 text-xs text-muted-foreground">
                      <span className="font-semibold block text-[10px] uppercase tracking-wide text-foreground">
                        Meeting Note:
                      </span>
                      <p className="mt-0.5 line-clamp-2">{lead.latestFirstMeeting.notes}</p>
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                    <Button asChild size="sm" variant="ghost" className="h-8 text-xs px-2.5">
                      <Link href={`/crm/jr-architecture/leads/${lead.id}`}>
                        Open Workspace
                      </Link>
                    </Button>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {lead.canStart ? (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 gap-1.5 text-xs"
                          disabled={busyId === lead.id}
                          onClick={() => openStartWorkDialog(lead)}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Start CAD Work
                        </Button>
                      ) : null}

                      {lead.canSubmit ? (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                          disabled={busyId === lead.id}
                          onClick={() => openSubmitWorkDialog(lead)}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Submit CAD Work
                        </Button>
                      ) : null}

                      {lead.subStatus === 'CAD_COMPLETED' ? (
                        <Badge
                          variant="secondary"
                          className="h-8 px-3 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        >
                          Work Under Review
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Start Work Confirmation Dialog */}
      <Dialog
        open={startWorkOpen}
        onOpenChange={(open) => {
          if (startingWork) return
          setStartWorkOpen(open)
          if (!open) setStartWorkLead(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start CAD Work?</DialogTitle>
            <DialogDescription>
              {startWorkLead
                ? `Confirm starting CAD design work for ${startWorkLead.name}. This will update the lead status to "CAD Working".`
                : 'This action will update the lead status to CAD Working.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={startingWork}
              onClick={() => {
                setStartWorkOpen(false)
                setStartWorkLead(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={startingWork}
              onClick={() => void handleStartWork()}
              className="gap-2"
            >
              {startingWork ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Confirm Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Work Dialog (Supports up to 200MB Google Cloud Upload) */}
      <Dialog
        open={submitWorkOpen}
        onOpenChange={(open) => {
          if (submittingWork) return
          setSubmitWorkOpen(open)
          if (!open) {
            setSubmitWorkLead(null)
            setSubmissionRows([createCadSubmissionRow()])
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit CAD Work</DialogTitle>
            <DialogDescription>
              Upload CAD drawings and documents for {submitWorkLead?.name ?? 'client'}. Files upload
              directly to Google Cloud Storage (supports up to {formatBytesToMbLabel(CAD_WORK_UPLOAD_MAX_BYTES)} per file).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Project SQFT <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                placeholder="Enter final measured/designed square footage (e.g. 1850)"
                value={submissionProjectSqft}
                onChange={(e) => setSubmissionProjectSqft(e.target.value)}
                disabled={submittingWork}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-foreground">
                  CAD Drawings & Files <span className="text-destructive">*</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSubmissionRow}
                  disabled={submittingWork || submissionRows.length >= 12}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Another File
                </Button>
              </div>

              <div className="space-y-2.5">
                {submissionRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg border bg-muted/20"
                  >
                    <div className="w-full sm:w-[200px]">
                      <Select
                        value={row.cadFileType}
                        onValueChange={(val) =>
                          updateSubmissionType(row.id, val as CadSubmissionFileTypeValue)
                        }
                        disabled={submittingWork}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="File Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CAD_SUBMISSION_FILE_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Input
                        type="file"
                        className="h-9 text-xs cursor-pointer"
                        disabled={submittingWork}
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null
                          updateSubmissionFile(row.id, file)
                        }}
                      />
                    </div>

                    {submissionRows.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive flex-shrink-0"
                        disabled={submittingWork}
                        onClick={() => removeSubmissionRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Supported formats: DWG, DXF, PDF, PPTX, Images. Up to {formatBytesToMbLabel(CAD_WORK_UPLOAD_MAX_BYTES)} per file.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Submission Note / Instructions (Optional)
              </label>
              <Textarea
                placeholder="Include key notes for Senior CRM or Quotation team regarding this revision..."
                value={submissionNote}
                onChange={(e) => setSubmissionNote(e.target.value)}
                disabled={submittingWork}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={submittingWork}
              onClick={() => {
                setSubmitWorkOpen(false)
                setSubmitWorkLead(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submittingWork}
              onClick={() => void handleSubmitWork()}
              className="gap-2 bg-primary"
            >
              {submittingWork ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading & Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Submit CAD Work
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
