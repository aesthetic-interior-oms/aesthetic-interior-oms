'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Archive,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Layers,
  Loader2,
  MapPin,
  PenTool,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatCadSubmissionFileType } from '@/lib/cad-work'
import { formatBytesToMbLabel } from '@/lib/upload-limits'
import { CadSubmissionDialog } from '@/components/crm/junior/cad-submission-dialog'

type SubmissionFile = {
  id: string
  fileName: string
  url: string
  fileType: string
  cadFileType: string
  sizeBytes: number | null
  createdAt: string
}

type CadSubmission = {
  id: string
  note: string | null
  submittedAt: string
  submittedById: string
  submittedBy: {
    id: string
    fullName: string
    email: string
  }
  files: SubmissionFile[]
}

type MyWorkLead = {
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
  attachments?: Array<{
    id: string
    fileName: string
    url: string
    fileType: string | null
    category?: string
  }>
  submissions: CadSubmission[]
}

function formatLabel(value: string | null | undefined): string {
  if (!value) return 'N/A'
  if (value === 'CAD_ASSIGNED') return 'CAD Assigned'
  if (value === 'CAD_WORKING') return 'CAD Working'
  if (value === 'CAD_COMPLETED') return 'Under Review'
  if (value === 'CAD_APPROVED') return 'CAD Approved'
  if (value === 'QUOTATION_PHASE') return 'Quotation Phase'
  if (value === 'VISUALIZATION_PHASE') return '3D Visualization Phase'
  if (value === 'DISCOVERY') return 'Consulting Phase'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getRecentMonthsList() {
  const months: { label: string; value: string }[] = [
    { label: 'All Time', value: 'ALL' },
    { label: 'No Visit Date', value: 'NO_VISIT' },
  ]
  const now = new Date()

  for (let i = 0; i < 18; i += 1) {
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

export default function JrArchitectMyWorkPage() {
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<MyWorkLead[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const availableMonths = useMemo(() => getRecentMonthsList(), [])
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const selectedMonthLabel =
    availableMonths.find((month) => month.value === selectedMonth)?.label ?? 'All Time'

  const [selectedFilter, setSelectedFilter] = useState<string>('all')

  // Detailed inspect modal for past submissions
  const [inspectLead, setInspectLead] = useState<MyWorkLead | null>(null)
  const [submitWorkLead, setSubmitWorkLead] = useState<MyWorkLead | null>(null)

  const loadTasks = useCallback(async (monthKey = 'ALL', silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ includeHistory: '1' })
      if (monthKey && monthKey !== 'ALL') params.set('month', monthKey)

      const response = await fetch(`/api/cad-work/assigned-tasks?${params.toString()}`, {
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
        throw new Error(payload?.error ?? 'Failed to load your work history')
      }
      setLeads(payload.data as MyWorkLead[])
    } catch (error) {
      if (!silent) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to load your work history',
        )
        setLeads([])
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTasks(selectedMonth)
  }, [loadTasks, selectedMonth])

  const summary = useMemo(() => {
    const total = leads.length
    const approved = leads.filter(
      (l) => l.subStatus === 'CAD_APPROVED' || l.stage !== 'CAD_PHASE',
    ).length
    const underReview = leads.filter((l) => l.subStatus === 'CAD_COMPLETED').length
    const working = leads.filter(
      (l) => l.subStatus === 'CAD_WORKING' || l.subStatus === 'CAD_ASSIGNED',
    ).length
    const totalSqft = leads.reduce((sum, l) => sum + (l.projectSqft ?? 0), 0)
    const totalFiles = leads.reduce(
      (sum, l) => sum + l.submissions.reduce((s, sub) => s + sub.files.length, 0),
      0,
    )
    return {
      total,
      approved,
      underReview,
      working,
      totalSqft,
      totalFiles,
    }
  }, [leads])

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
        const notesMatch = lead.submissions.some((s) => s.note?.toLowerCase().includes(q))
        const fileMatch = lead.submissions.some((s) =>
          s.files.some((f) => f.fileName.toLowerCase().includes(q)),
        )
        return (
          nameMatch ||
          phoneMatch ||
          locationMatch ||
          stageMatch ||
          subStatusMatch ||
          srMatch ||
          notesMatch ||
          fileMatch
        )
      })
    }

    if (selectedFilter === 'approved') {
      result = result.filter(
        (lead) => lead.subStatus === 'CAD_APPROVED' || lead.stage !== 'CAD_PHASE',
      )
    } else if (selectedFilter === 'inReview') {
      result = result.filter((lead) => lead.subStatus === 'CAD_COMPLETED')
    } else if (selectedFilter === 'working') {
      result = result.filter(
        (lead) => lead.subStatus === 'CAD_WORKING' || lead.subStatus === 'CAD_ASSIGNED',
      )
    } else if (selectedFilter === 'hasFiles') {
      result = result.filter((lead) => lead.submissions.some((s) => s.files.length > 0))
    }

    return result
  }, [leads, searchQuery, selectedFilter])

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="My Work Archive"
        subtitle="Review, search, and download your past CAD designs, submission notes, and project deliverables."
      />

      <main className="mx-auto max-w-[1440px] px-6 py-6 space-y-4">
        {/* Metric Overview Section */}
        <div className="rounded-[1.35rem] border border-border/70 bg-gradient-to-br from-background via-muted/20 to-background p-3.5 shadow-sm mb-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                <Archive className="h-3.5 w-3.5" />
                Work History & Deliverables
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                All projects you have been assigned to or submitted CAD work for. Click any card to filter your archive.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex items-center min-w-[220px] max-w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by client, file name, note..."
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
                    <SelectValue placeholder="Select period" />
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[
              {
                key: 'all',
                label: 'Total Projects',
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
                key: 'approved',
                label: 'Approved / Completed',
                value: summary.approved,
                isSqft: false,
                Icon: CheckCircle,
                className:
                  'border-emerald-200/70 from-emerald-50 via-white to-teal-50 text-emerald-800 dark:border-emerald-500/30 dark:from-emerald-950/60 dark:via-slate-950 dark:to-teal-950/40 dark:text-emerald-100',
                iconClass:
                  'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20',
                accentClass: 'from-emerald-500 to-teal-500',
              },
              {
                key: 'inReview',
                label: 'Under Review',
                value: summary.underReview,
                isSqft: false,
                Icon: Clock,
                className:
                  'border-amber-200/70 from-amber-50 via-white to-orange-50 text-amber-800 dark:border-amber-500/30 dark:from-amber-950/60 dark:via-slate-950 dark:to-orange-950/40 dark:text-amber-100',
                iconClass:
                  'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/20',
                accentClass: 'from-amber-500 to-orange-500',
              },
              {
                key: 'hasFiles',
                label: 'Submitted Files',
                value: summary.totalFiles,
                isSqft: false,
                Icon: FileText,
                className:
                  'border-blue-200/70 from-blue-50 via-white to-sky-50 text-blue-800 dark:border-blue-500/30 dark:from-blue-950/60 dark:via-slate-950 dark:to-sky-950/40 dark:text-blue-100',
                iconClass:
                  'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/20',
                accentClass: 'from-blue-500 to-sky-500',
              },
              {
                key: 'sqft',
                label: 'Total Designed SQFT',
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
              const isSelected = selectedFilter === stat.key
              return (
                <button
                  type="button"
                  key={stat.key}
                  onClick={() =>
                    setSelectedFilter((prev) =>
                      prev === stat.key && stat.key !== 'all' ? 'all' : stat.key,
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
                        {stat.isSqft ? (
                          <span className="mb-0.5 text-[10px] font-bold opacity-75">sqft</span>
                        ) : null}
                      </div>
                    </div>
                    <span className={`rounded-xl p-2 shadow-sm ring-1 ${stat.iconClass}`}>
                      <stat.Icon className="h-4 w-4" />
                    </span>
                  </div>
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
            {selectedFilter !== 'all' ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-semibold">
                  <span>Filter:</span>
                  <span className="font-bold text-primary uppercase">{selectedFilter}</span>
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px]">
                    {filteredLeads.length} projects
                  </span>
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedFilter('all')}
                >
                  <X className="mr-1 h-3 w-3" /> Clear Filter
                </Button>
              </div>
            ) : null}
            {!searchQuery && selectedFilter === 'all' ? (
              <span className="text-xs font-medium text-muted-foreground">
                Showing all <strong>{leads.length}</strong> historical projects
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
              <p className="font-medium text-foreground">No historical projects found for {selectedMonthLabel}.</p>
              <p className="text-xs">
                As you receive assignments and submit CAD designs, your completed and in-progress work will appear here.
              </p>
            </CardContent>
          </Card>
        ) : filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
              <p>No projects match your search or filter.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {searchQuery ? (
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </Button>
                ) : null}
                {selectedFilter !== 'all' ? (
                  <Button variant="outline" size="sm" onClick={() => setSelectedFilter('all')}>
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
                    <th className="px-4 py-3">Stage / Status</th>
                    <th className="px-4 py-3">Location & SQFT</th>
                    <th className="px-4 py-3">Submissions</th>
                    <th className="px-4 py-3">Latest File</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredLeads.map((lead) => {
                    const allFiles = lead.submissions.flatMap((s) => s.files)
                    const latestSubmission = lead.submissions[0]
                    const latestFile = allFiles[0]

                    return (
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
                              <span>{lead.phone}</span>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="outline" className="text-[10px]">
                              {formatLabel(lead.stage)}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-semibold ${
                                lead.subStatus === 'CAD_APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                  : lead.subStatus === 'CAD_COMPLETED'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                                    : ''
                              }`}
                            >
                              {formatLabel(lead.subStatus)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs truncate max-w-[160px]" title={lead.location ?? ''}>
                            {lead.location ?? '—'}
                          </div>
                          <div className="text-xs font-semibold text-primary mt-0.5">
                            {lead.projectSqft ? `${lead.projectSqft.toLocaleString()} sqft` : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                            {lead.submissions.length} round(s)
                          </span>
                          <span className="text-[11px] text-muted-foreground block">
                            {allFiles.length} file(s) total
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {latestFile ? (
                            <a
                              href={latestFile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 max-w-[180px] truncate"
                              title={latestFile.fileName}
                            >
                              <Download className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{latestFile.fileName}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">None uploaded</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-xs"
                              onClick={() => setSubmitWorkLead(lead)}
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Upload
                            </Button>
                            {lead.submissions.length > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-xs"
                                onClick={() => setInspectLead(lead)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Submissions ({allFiles.length})
                              </Button>
                            ) : null}
                            <Button asChild size="sm" variant="ghost" className="h-8 px-2.5 text-xs">
                              <Link href={`/crm/jr-architecture/leads/${lead.id}`}>
                                Details
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Card View */
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredLeads.map((lead) => {
              const allFiles = lead.submissions.flatMap((s) => s.files)
              const latestSubmission = lead.submissions[0]

              return (
                <Card
                  key={lead.id}
                  className="relative overflow-hidden transition-all duration-200 hover:shadow-lg border-border/80 flex flex-col justify-between"
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      lead.subStatus === 'CAD_APPROVED'
                        ? 'bg-emerald-500'
                        : lead.subStatus === 'CAD_COMPLETED'
                          ? 'bg-blue-500'
                          : lead.subStatus === 'CAD_WORKING'
                            ? 'bg-amber-500'
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
                            <span>{lead.phone}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold ${
                            lead.subStatus === 'CAD_APPROVED'
                              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                              : lead.subStatus === 'CAD_COMPLETED'
                                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                                : ''
                          }`}
                        >
                          {formatLabel(lead.subStatus)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatLabel(lead.stage)}
                        </span>
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

                    {/* Submissions Summary */}
                    {lead.submissions.length > 0 ? (
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            Submitted Drawings ({allFiles.length})
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {lead.submissions.length} submission round{lead.submissions.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Recent files list */}
                        <div className="space-y-1.5 pt-1">
                          {allFiles.slice(0, 3).map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between gap-2 text-xs bg-background rounded-md px-2.5 py-1.5 border border-border/50"
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                                  {formatCadSubmissionFileType(file.cadFileType as any)}
                                </Badge>
                                <span className="truncate max-w-[160px] font-medium" title={file.fileName}>
                                  {file.fileName}
                                </span>
                              </div>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 flex items-center gap-1 text-[11px] font-semibold flex-shrink-0"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </a>
                            </div>
                          ))}

                          {allFiles.length > 3 ? (
                            <button
                              type="button"
                              onClick={() => setInspectLead(lead)}
                              className="text-[11px] text-primary hover:underline font-semibold block text-center w-full pt-1"
                            >
                              + View {allFiles.length - 3} more file(s)
                            </button>
                          ) : null}
                        </div>

                        {latestSubmission?.note ? (
                          <div className="pt-1.5 border-t border-border/40 text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground">Latest Note: </span>
                            <span className="line-clamp-2">{latestSubmission.note}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
                        No CAD submissions logged yet for this lead.
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <Button asChild size="sm" variant="ghost" className="h-8 text-xs px-2.5">
                        <Link href={`/crm/jr-architecture/leads/${lead.id}`}>
                          Open Workspace
                        </Link>
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => setSubmitWorkLead(lead)}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Upload / Resubmit
                        </Button>

                        {lead.submissions.length > 0 ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => setInspectLead(lead)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            History
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Full Submissions History Modal */}
      <Dialog open={Boolean(inspectLead)} onOpenChange={(open) => !open && setInspectLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary" />
              CAD Deliverables: {inspectLead?.name}
            </DialogTitle>
            <DialogDescription>
              Review all historical submission rounds, attached drawings, and feedback notes.
            </DialogDescription>
          </DialogHeader>

          {inspectLead ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Current Stage
                  </span>
                  <p className="font-bold text-foreground mt-0.5">{formatLabel(inspectLead.stage)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Sub Status
                  </span>
                  <p className="font-bold text-foreground mt-0.5">{formatLabel(inspectLead.subStatus)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Project SQFT
                  </span>
                  <p className="font-bold text-foreground mt-0.5">
                    {inspectLead.projectSqft ? `${inspectLead.projectSqft.toLocaleString()} sqft` : '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Submission History ({inspectLead.submissions.length} round{inspectLead.submissions.length > 1 ? 's' : ''})
                </h4>

                {inspectLead.submissions.map((sub, idx) => (
                  <div key={sub.id} className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2">
                      <div>
                        <span className="text-xs font-bold text-foreground">
                          Round #{inspectLead.submissions.length - idx}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Submitted on {new Date(sub.submittedAt).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}{' '}
                          by {sub.submittedBy.fullName}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {sub.files.length} file{sub.files.length > 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {sub.note ? (
                      <div className="rounded-md bg-muted/30 p-2.5 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground block text-[11px]">Note:</span>
                        <p className="mt-0.5 whitespace-pre-wrap">{sub.note}</p>
                      </div>
                    ) : null}

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Files in this submission:
                      </span>
                      {sub.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-background text-xs hover:border-primary/50 transition-colors"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                              {formatCadSubmissionFileType(file.cadFileType as any)}
                            </Badge>
                            <span className="font-semibold truncate max-w-[280px]" title={file.fileName}>
                              {file.fileName}
                            </span>
                            {file.sizeBytes ? (
                              <span className="text-[10px] text-muted-foreground">
                                ({formatBytesToMbLabel(file.sizeBytes)})
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                              <a href={file.url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <CadSubmissionDialog
        open={Boolean(submitWorkLead)}
        onOpenChange={(open) => {
          if (!open) setSubmitWorkLead(null)
        }}
        leadId={submitWorkLead?.id ?? null}
        leadName={submitWorkLead?.name}
        onSubmitted={() => void loadTasks(selectedMonth)}
      />
    </div>
  )
}
