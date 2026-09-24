'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Ban,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  MapPin,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Table as TableIcon,
  User,
  Wrench,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/* ────────────────── Types ────────────────── */
type VisitStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'
type ProjectStatus = 'UNDER_CONSTRUCTION' | 'READY'

type AttachmentItem = {
  id: string
  fileName: string
  url: string
  fileType: string
}

type VisitResultData = {
  id: string
  summary: string
  projectType: string | null
  budgetRange: string | null
  timelineUrgency: string | null
  stylePreference: string | null
  completedAt: string
  files: AttachmentItem[]
}

type PartialVisitRecord = {
  id: string
  scheduledAt: string
  location: string
  visitType: string
  status: VisitStatus
  notes: string | null
  visitFee?: number | null
  projectSqft?: number | null
  projectStatus?: ProjectStatus | null
  lead: {
    id: string
    name: string
    phone: string
    location: string | null
    budget?: number | null
  }
  assignedTo: {
    id: string
    fullName: string
    email: string
    phone?: string | null
  } | null
  result?: VisitResultData | null
}

/* ────────────────── Helpers ────────────────── */
function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('en-BD', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function getStatusConfig(status: VisitStatus) {
  switch (status) {
    case 'SCHEDULED':
      return {
        label: 'Scheduled',
        icon: Clock,
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300',
      }
    case 'COMPLETED':
      return {
        label: 'Completed',
        icon: CheckCircle2,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300',
      }
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        icon: Ban,
        badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300',
      }
    case 'RESCHEDULED':
      return {
        label: 'Rescheduled',
        icon: Calendar,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300',
      }
    default:
      return {
        label: status,
        icon: Clock,
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
      }
  }
}

/* ────────────────── Component ────────────────── */
export default function PartialVisitsPage() {
  const [visits, setVisits] = useState<PartialVisitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [activeFilter, setActiveFilter] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')

  // Dialog States
  const [selectedVisit, setSelectedVisit] = useState<PartialVisitRecord | null>(null)

  // Visit Complete Dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [clientName, setClientName] = useState('')
  const [remarks, setRemarks] = useState('')
  const [budget, setBudget] = useState('')
  const [requirements, setRequirements] = useState('')
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('UNDER_CONSTRUCTION')
  const [nextFollowUp, setNextFollowUp] = useState('')
  const [projectType, setProjectType] = useState<'RESIDENTIAL' | 'COMMERCIAL'>('RESIDENTIAL')
  const [priority, setPriority] = useState<'IMMEDIATE' | '1-2 months' | '2-3 months'>('IMMEDIATE')
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [submittingComplete, setSubmittingComplete] = useState(false)

  // Reschedule Dialog
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [submittingReschedule, setSubmittingReschedule] = useState(false)

  // Cancel Dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [submittingCancel, setSubmittingCancel] = useState(false)

  // View Result Dialog
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [viewingResult, setViewingResult] = useState<VisitResultData | null>(null)
  const [loadingResult, setLoadingResult] = useState(false)

  const fetchVisits = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/visit-schedule?visitType=PARTIAL_WORK_VISIT')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setVisits(data.data)
      } else {
        setError(data.error || 'Failed to load partial visits.')
      }
    } catch {
      setError('An error occurred while fetching partial visits.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVisits()
  }, [fetchVisits])

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const currentFilter = activeFilter !== 'ALL' ? activeFilter : statusFilter
      if (currentFilter !== 'ALL' && v.status !== currentFilter) {
        return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = v.lead?.name?.toLowerCase().includes(q)
        const matchPhone = v.lead?.phone?.toLowerCase().includes(q)
        const matchLoc = v.location?.toLowerCase().includes(q) || v.lead?.location?.toLowerCase().includes(q)
        const matchAssigned = v.assignedTo?.fullName?.toLowerCase().includes(q)
        if (!matchName && !matchPhone && !matchLoc && !matchAssigned) return false
      }
      return true
    })
  }, [visits, statusFilter, activeFilter, search])

  // Counts for Queue Intelligence
  const counts = useMemo(() => {
    return {
      ALL: visits.length,
      SCHEDULED: visits.filter((v) => v.status === 'SCHEDULED').length,
      COMPLETED: visits.filter((v) => v.status === 'COMPLETED').length,
      RESCHEDULED: visits.filter((v) => v.status === 'RESCHEDULED').length,
      CANCELLED: visits.filter((v) => v.status === 'CANCELLED').length,
    }
  }, [visits])

  // Queue Intelligence Cards Config
  const statCards = [
    {
      key: 'ALL',
      label: 'All Partial Visits',
      count: counts.ALL,
      Icon: Wrench,
      className: 'from-slate-50 to-slate-100/60 border-slate-200/80 dark:from-slate-900/40 dark:to-slate-900/20 dark:border-slate-800',
      accentClassName: 'from-slate-500 to-slate-700',
      iconClassName: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      key: 'SCHEDULED',
      label: 'Scheduled',
      count: counts.SCHEDULED,
      Icon: Clock,
      className: 'from-blue-50/80 to-blue-100/40 border-blue-200/80 dark:from-blue-950/30 dark:to-blue-900/10 dark:border-blue-800/60',
      accentClassName: 'from-blue-500 to-indigo-600',
      iconClassName: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    },
    {
      key: 'COMPLETED',
      label: 'Completed',
      count: counts.COMPLETED,
      Icon: CheckCircle2,
      className: 'from-emerald-50/80 to-emerald-100/40 border-emerald-200/80 dark:from-emerald-950/30 dark:to-emerald-900/10 dark:border-emerald-800/60',
      accentClassName: 'from-emerald-500 to-teal-600',
      iconClassName: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    },
    {
      key: 'RESCHEDULED',
      label: 'Rescheduled',
      count: counts.RESCHEDULED,
      Icon: Calendar,
      className: 'from-amber-50/80 to-amber-100/40 border-amber-200/80 dark:from-amber-950/30 dark:to-amber-900/10 dark:border-amber-800/60',
      accentClassName: 'from-amber-500 to-orange-600',
      iconClassName: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    },
    {
      key: 'CANCELLED',
      label: 'Cancelled',
      count: counts.CANCELLED,
      Icon: Ban,
      className: 'from-red-50/80 to-red-100/40 border-red-200/80 dark:from-red-950/30 dark:to-red-900/10 dark:border-red-800/60',
      accentClassName: 'from-red-500 to-rose-600',
      iconClassName: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    },
  ]

  // Handlers for Modals
  const openCompleteModal = (visit: PartialVisitRecord) => {
    setSelectedVisit(visit)
    setClientName(visit.lead?.name || '')
    setRemarks('')
    setBudget(visit.lead?.budget ? String(visit.lead.budget) : '')
    setRequirements('')
    setProjectStatus(visit.projectStatus || 'UNDER_CONSTRUCTION')
    setNextFollowUp('')
    setProjectType('RESIDENTIAL')
    setPriority('IMMEDIATE')
    setSelectedFiles(null)
    setCompleteDialogOpen(true)
  }

  const openRescheduleModal = (visit: PartialVisitRecord) => {
    setSelectedVisit(visit)
    setRescheduleDate('')
    setRescheduleNotes('')
    setRescheduleDialogOpen(true)
  }

  const openCancelModal = (visit: PartialVisitRecord) => {
    setSelectedVisit(visit)
    setCancelReason('')
    setCancelDialogOpen(true)
  }

  const openViewResultModal = async (visit: PartialVisitRecord) => {
    setSelectedVisit(visit)
    setViewingResult(null)
    setResultDialogOpen(true)
    setLoadingResult(true)
    try {
      const res = await fetch(`/api/visit-schedule/${visit.id}/result`)
      const data = await res.json()
      if (data.success && data.data?.leadResult) {
        setViewingResult(data.data.leadResult)
      } else if (data.data?.supportResults && data.data.supportResults.length > 0) {
        setViewingResult(data.data.supportResults[0])
      }
    } catch {
      toast.error('Failed to load visit result details')
    } finally {
      setLoadingResult(false)
    }
  }

  // Action Submissions
  const handleCompleteSubmit = async () => {
    if (!selectedVisit) return
    if (!remarks.trim()) {
      toast.error('Remarks / Visit Summary is required')
      return
    }

    setSubmittingComplete(true)
    try {
      const formData = new FormData()
      formData.append('leadClientName', clientName)
      formData.append('summary', remarks)
      formData.append('budgetRange', budget)
      if (budget.trim() && !isNaN(Number(budget))) {
        formData.append('budget', budget)
      }
      formData.append('stylePreference', requirements)
      formData.append('projectStatus', projectStatus)
      if (nextFollowUp) {
        formData.append('nextFollowUpAt', new Date(nextFollowUp).toISOString())
      }
      formData.append('projectType', projectType)
      formData.append('timelineUrgency', priority)

      if (selectedFiles && selectedFiles.length > 0) {
        Array.from(selectedFiles).forEach((file) => {
          formData.append('files', file)
        })
      }

      const res = await fetch(`/api/visit-schedule/${selectedVisit.id}/result`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Partial Visit marked as completed!')
        setCompleteDialogOpen(false)
        fetchVisits()
      } else {
        toast.error(data.error || 'Failed to submit visit completion data')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmittingComplete(false)
    }
  }

  const handleRescheduleSubmit = async () => {
    if (!selectedVisit) return
    if (!rescheduleDate) {
      toast.error('New date and time is required')
      return
    }

    setSubmittingReschedule(true)
    try {
      const res = await fetch(`/api/visit-schedule/${selectedVisit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESCHEDULED',
          scheduledAt: new Date(rescheduleDate).toISOString(),
          notes: rescheduleNotes || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Visit rescheduled successfully!')
        setRescheduleDialogOpen(false)
        fetchVisits()
      } else {
        toast.error(data.error || 'Failed to reschedule visit')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmittingReschedule(false)
    }
  }

  const handleCancelSubmit = async () => {
    if (!selectedVisit) return

    setSubmittingCancel(true)
    try {
      const res = await fetch(`/api/visit-schedule/${selectedVisit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          reason: cancelReason || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Visit cancelled successfully')
        setCancelDialogOpen(false)
        fetchVisits()
      } else {
        toast.error(data.error || 'Failed to cancel visit')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmittingCancel(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <CrmPageHeader
        title="Partial Visits"
        subtitle="Track, manage and process partial work visit schedules and completions"
      />

      {/* Queue Intelligence Stats Cards */}
      <Card className="border-border/70 shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Queue Intelligence
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Snapshot of active partial visits and queue status.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchVisits} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {statCards.map((card) => {
              const Icon = card.Icon
              const percentage = visits.length > 0 ? Math.round((card.count / visits.length) * 100) : 0
              const isActive = activeFilter === card.key

              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => {
                    setActiveFilter(card.key)
                    if (card.key !== 'ALL') setStatusFilter('ALL')
                  }}
                  className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg ${card.className} ${isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
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
                    {card.key === 'ALL' ? 'Total visits in queue' : 'Share of partial visits'}
                  </p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client, phone, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground hidden md:block" />
            <Select
              value={activeFilter !== 'ALL' ? activeFilter : statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val)
                setActiveFilter(val)
              }}
            >
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button
            size="sm"
            variant={viewMode === 'card' ? 'default' : 'outline'}
            onClick={() => setViewMode('card')}
            className="h-9 px-3"
          >
            <LayoutGrid className="mr-1.5 h-4 w-4" />
            Cards
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
            className="h-9 px-3"
          >
            <TableIcon className="mr-1.5 h-4 w-4" />
            Table
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
          <p className="text-sm">Loading partial visits queue...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-destructive bg-destructive/5 rounded-xl border border-destructive/20 p-6">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="font-medium text-base mb-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchVisits} className="mt-2">
            Try Again
          </Button>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/10 rounded-xl border p-6 text-center">
          <Wrench className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-semibold text-foreground text-base">No Partial Visits Found</p>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            {search || activeFilter !== 'ALL'
              ? 'No visits match your search or filter criteria. Try clearing search.'
              : 'There are currently no partial work visits scheduled.'}
          </p>
        </div>
      ) : viewMode === 'card' ? (
        /* Cards View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVisits.map((visit) => {
            const statusConfig = getStatusConfig(visit.status)
            const StatusIcon = statusConfig.icon
            const isActionable = visit.status === 'SCHEDULED' || visit.status === 'RESCHEDULED'

            return (
              <Card
                key={visit.id}
                className="group relative flex flex-col justify-between overflow-hidden border transition duration-200 hover:border-primary/50 hover:shadow-md"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <Link
                        href={`/visit-team/partial-visits/${visit.lead.id}`}
                        className="font-bold text-base text-foreground hover:text-primary transition line-clamp-1 flex items-center gap-1.5"
                      >
                        {visit.lead.name}
                        <ExternalLink className="h-3.5 w-3.5 opacity-50 shrink-0" />
                      </Link>
                      <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{visit.lead.phone || 'No phone'}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`shrink-0 font-medium px-2.5 py-0.5 gap-1 ${statusConfig.badgeClass}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Visit Details */}
                  <div className="space-y-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-foreground">{formatDate(visit.scheduledAt)}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{visit.location || visit.lead.location || 'Location not specified'}</span>
                    </div>
                    {visit.assignedTo && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>Consultant: <strong className="text-foreground">{visit.assignedTo.fullName}</strong></span>
                      </div>
                    )}
                    {visit.notes && (
                      <div className="text-[11px] italic text-muted-foreground/90 pt-1 border-t border-border/40">
                        "{visit.notes}"
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    {isActionable ? (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-8 text-xs font-semibold gap-1"
                          onClick={() => openCompleteModal(visit)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Complete Visit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => openRescheduleModal(visit)}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1 px-2"
                          onClick={() => openCancelModal(visit)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex w-full items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs gap-1.5"
                          onClick={() => openViewResultModal(visit)}
                        >
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          Result
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1 h-8 text-xs gap-1.5"
                          asChild
                        >
                          <Link href={`/visit-team/partial-visits/${visit.lead.id}`}>
                            View Lead Details
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold">Client</TableHead>
                <TableHead className="font-bold">Scheduled Time</TableHead>
                <TableHead className="font-bold">Location</TableHead>
                <TableHead className="font-bold">Assigned Consultant</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVisits.map((visit) => {
                const statusConfig = getStatusConfig(visit.status)
                const StatusIcon = statusConfig.icon
                const isActionable = visit.status === 'SCHEDULED' || visit.status === 'RESCHEDULED'

                return (
                  <TableRow key={visit.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <Link
                        href={`/visit-team/partial-visits/${visit.lead.id}`}
                        className="hover:text-primary transition font-bold block"
                      >
                        {visit.lead.name}
                      </Link>
                      <span className="text-xs text-muted-foreground block">{visit.lead.phone}</span>
                    </TableCell>
                    <TableCell className="text-xs font-semibold whitespace-nowrap">
                      {formatDate(visit.scheduledAt)}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {visit.location || visit.lead.location || 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {visit.assignedTo?.fullName || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-medium px-2 py-0.5 text-[11px] gap-1 ${statusConfig.badgeClass}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isActionable ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2.5 gap-1"
                              onClick={() => openCompleteModal(visit)}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2 gap-1"
                              onClick={() => openRescheduleModal(visit)}
                            >
                              <Calendar className="h-3 w-3" />
                              Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2"
                              onClick={() => openCancelModal(visit)}
                            >
                              <Ban className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2.5 gap-1"
                              onClick={() => openViewResultModal(visit)}
                            >
                              <FileText className="h-3 w-3 text-primary" />
                              Result
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs px-2.5"
                              asChild
                            >
                              <Link href={`/visit-team/partial-visits/${visit.lead.id}`}>
                                Details
                              </Link>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ────────────────── Visit Complete Modal ────────────────── */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
              Complete Partial Visit
            </DialogTitle>
            <DialogDescription>
              Record completion details, client feedback, requirements, and attachments for this visit.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3 sm:grid-cols-2">
            {/* Client Name (Editable, pre-filled) */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="clientName" className="font-semibold text-xs">
                Client Name <span className="text-xs text-muted-foreground font-normal">(Editable)</span>
              </Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Name"
              />
            </div>

            {/* Remarks / Visit Summary */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="remarks" className="font-semibold text-xs">
                Remarks / Visit Summary <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="remarks"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter detailed summary of the partial visit discussions, site observations..."
              />
            </div>

            {/* Budget */}
            <div className="space-y-1.5">
              <Label htmlFor="budget" className="font-semibold text-xs">
                Budget (BDT)
              </Label>
              <Input
                id="budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 500,000"
              />
            </div>

            {/* Project Status */}
            <div className="space-y-1.5">
              <Label htmlFor="projectStatus" className="font-semibold text-xs">
                Project Status
              </Label>
              <Select
                value={projectStatus}
                onValueChange={(val) => setProjectStatus(val as ProjectStatus)}
              >
                <SelectTrigger id="projectStatus">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNDER_CONSTRUCTION">Under Construction</SelectItem>
                  <SelectItem value="READY">Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Requirements */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="requirements" className="font-semibold text-xs">
                Requirements & Scope Details
              </Label>
              <Textarea
                id="requirements"
                rows={2}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Specific client requirements, materials, design style..."
              />
            </div>

            {/* Next Follow Up */}
            <div className="space-y-1.5">
              <Label htmlFor="nextFollowUp" className="font-semibold text-xs">
                Next Follow Up Date & Time
              </Label>
              <Input
                id="nextFollowUp"
                type="datetime-local"
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
              />
            </div>

            {/* Project Type */}
            <div className="space-y-1.5">
              <Label htmlFor="projectType" className="font-semibold text-xs">
                Project Type
              </Label>
              <Select
                value={projectType}
                onValueChange={(val) => setProjectType(val as 'RESIDENTIAL' | 'COMMERCIAL')}
              >
                <SelectTrigger id="projectType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                  <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label htmlFor="priority" className="font-semibold text-xs">
                Priority / Timeline
              </Label>
              <Select
                value={priority}
                onValueChange={(val) => setPriority(val as 'IMMEDIATE' | '1-2 months' | '2-3 months')}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                  <SelectItem value="1-2 months">1-2 months</SelectItem>
                  <SelectItem value="2-3 months">2-3 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attachments */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="attachments" className="font-semibold text-xs">
                Attachments (Photos, Videos, PDFs, Site Documents)
              </Label>
              <Input
                id="attachments"
                type="file"
                multiple
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground">
                You can select multiple files or site recordings.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
              disabled={submittingComplete}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={handleCompleteSubmit}
              disabled={submittingComplete}
            >
              {submittingComplete ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Visit Complete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────── Visit Reschedule Modal ────────────────── */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Calendar className="h-5 w-5 text-amber-600" />
              Reschedule Visit
            </DialogTitle>
            <DialogDescription>
              Set a new scheduled date and time for {selectedVisit?.lead.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rescheduleDate" className="font-semibold text-xs">
                New Date & Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rescheduleDate"
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rescheduleNotes" className="font-semibold text-xs">
                Reschedule Reason / Notes
              </Label>
              <Textarea
                id="rescheduleNotes"
                rows={3}
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                placeholder="Reason for rescheduling..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleRescheduleSubmit}
              disabled={submittingReschedule}
            >
              {submittingReschedule ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Reschedule Visit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────── Visit Cancel Modal ────────────────── */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-destructive">
              <Ban className="h-5 w-5" />
              Cancel Visit
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the partial visit for {selectedVisit?.lead.name}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cancelReason" className="font-semibold text-xs">
                Cancellation Reason
              </Label>
              <Textarea
                id="cancelReason"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why is this visit being cancelled?"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubmit}
              disabled={submittingCancel}
            >
              {submittingCancel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancel'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────── View Result Modal ────────────────── */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <FileText className="h-5 w-5 text-primary" />
              Visit Result Details
            </DialogTitle>
            <DialogDescription>
              Submitted visit summary and records for {selectedVisit?.lead.name}
            </DialogDescription>
          </DialogHeader>

          {loadingResult ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
              <p className="text-xs">Fetching result details...</p>
            </div>
          ) : viewingResult ? (
            <div className="space-y-4 py-2 text-sm">
              <div className="bg-muted/40 p-3 rounded-lg space-y-2 border">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Remarks / Summary</p>
                  <p className="text-foreground mt-0.5 font-medium whitespace-pre-wrap">{viewingResult.summary}</p>
                </div>
                {viewingResult.completedAt && (
                  <p className="text-[11px] text-muted-foreground pt-1 border-t">
                    Completed at: {formatDate(viewingResult.completedAt)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {viewingResult.projectType && (
                  <div className="bg-muted/20 p-2.5 rounded-md border">
                    <span className="text-muted-foreground block">Project Type</span>
                    <strong className="text-foreground">{viewingResult.projectType}</strong>
                  </div>
                )}
                {viewingResult.budgetRange && (
                  <div className="bg-muted/20 p-2.5 rounded-md border">
                    <span className="text-muted-foreground block">Budget</span>
                    <strong className="text-foreground">{viewingResult.budgetRange}</strong>
                  </div>
                )}
                {viewingResult.timelineUrgency && (
                  <div className="bg-muted/20 p-2.5 rounded-md border">
                    <span className="text-muted-foreground block">Priority</span>
                    <strong className="text-foreground">{viewingResult.timelineUrgency}</strong>
                  </div>
                )}
                {selectedVisit?.projectStatus && (
                  <div className="bg-muted/20 p-2.5 rounded-md border">
                    <span className="text-muted-foreground block">Project Status</span>
                    <strong className="text-foreground">{selectedVisit.projectStatus}</strong>
                  </div>
                )}
              </div>

              {viewingResult.stylePreference && (
                <div className="bg-muted/20 p-2.5 rounded-md border text-xs">
                  <span className="text-muted-foreground block">Requirements & Scope</span>
                  <p className="text-foreground mt-0.5">{viewingResult.stylePreference}</p>
                </div>
              )}

              {/* Attachments list */}
              {viewingResult.files && viewingResult.files.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" />
                    Attachments ({viewingResult.files.length})
                  </p>
                  <div className="grid gap-2">
                    {viewingResult.files.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted transition border text-xs group"
                      >
                        <span className="truncate flex items-center gap-2">
                          <ImageIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate font-medium">{file.fileName}</span>
                        </span>
                        <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-xs">
              No detailed result data found for this visit.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
