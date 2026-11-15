'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  History,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Monitor,
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
  versionNumber?: number
  versionName?: string | null
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
  assignedDate: string
  assignedYear: number
  assignedMonth: number
  assignedMonthKey: string
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
    sizeBytes?: number
    createdAt?: string
  }>
  submissions: CadSubmission[]
}

const MONTH_NAMES = [
  { num: 1, name: 'January', short: 'Jan' },
  { num: 2, name: 'February', short: 'Feb' },
  { num: 3, name: 'March', short: 'Mar' },
  { num: 4, name: 'April', short: 'Apr' },
  { num: 5, name: 'May', short: 'May' },
  { num: 6, name: 'June', short: 'Jun' },
  { num: 7, name: 'July', short: 'Jul' },
  { num: 8, name: 'August', short: 'Aug' },
  { num: 9, name: 'September', short: 'Sep' },
  { num: 10, name: 'October', short: 'Oct' },
  { num: 11, name: 'November', short: 'Nov' },
  { num: 12, name: 'December', short: 'Dec' },
]

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

export default function JrArchitectMyWorkPage() {
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [leads, setLeads] = useState<MyWorkLead[]>([])

  // File explorer navigation state
  // Levels: 'ROOT' (Years) -> 'YEAR' (Months) -> 'MONTH' (Projects)
  const [currentYear, setCurrentYear] = useState<number | null>(null)
  const [currentMonth, setCurrentMonth] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Detailed inspect modal for past submissions
  const [inspectLead, setInspectLead] = useState<MyWorkLead | null>(null)
  const [submitWorkLead, setSubmitWorkLead] = useState<MyWorkLead | null>(null)

  const loadTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ includeHistory: '1' })
      const response = await fetch(`/api/cad-work/assigned-tasks?${params.toString()}`, {
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
        throw new Error(payload?.error ?? 'Failed to load assigned CAD tasks')
      }
      setLeads(payload.data as MyWorkLead[])
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
    void loadTasks()
  }, [loadTasks])

  // Derive unique years from leads (plus current year)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>()
    yearsSet.add(new Date().getFullYear())
    for (const lead of leads) {
      if (lead.assignedYear) {
        yearsSet.add(lead.assignedYear)
      } else if (lead.assignedDate) {
        yearsSet.add(new Date(lead.assignedDate).getFullYear())
      }
    }
    return Array.from(yearsSet).sort((a, b) => b - a)
  }, [leads])

  // Auto-select current year on initial load once data is ready
  useEffect(() => {
    if (currentYear === null && availableYears.length > 0) {
      setCurrentYear(availableYears[0])
    }
  }, [availableYears, currentYear])

  // Overall summary metrics
  const summary = useMemo(() => {
    const total = leads.length
    const assigned = leads.filter((l) => l.subStatus === 'CAD_ASSIGNED').length
    const working = leads.filter((l) => l.subStatus === 'CAD_WORKING').length
    const underReview = leads.filter((l) => l.subStatus === 'CAD_COMPLETED').length
    const approved = leads.filter(
      (l) => l.subStatus === 'CAD_APPROVED' || l.stage !== 'CAD_PHASE',
    ).length
    const rework = leads.filter((l) => l.isRework).length
    const totalSqft = leads.reduce((sum, l) => sum + (l.projectSqft ?? 0), 0)
    const totalFiles = leads.reduce(
      (sum, l) => sum + l.submissions.reduce((s, sub) => s + sub.files.length, 0),
      0,
    )
    return {
      total,
      assigned,
      working,
      underReview,
      approved,
      rework,
      totalSqft,
      totalFiles,
    }
  }, [leads])

  // Group leads by year and month
  // Structure: Map<year, Map<monthNum, MyWorkLead[]>>
  const leadsByYearMonth = useMemo(() => {
    const map = new Map<number, Map<number, MyWorkLead[]>>()

    for (const lead of leads) {
      let y = lead.assignedYear
      let m = lead.assignedMonth

      if (!y || !m) {
        const d = lead.assignedDate ? new Date(lead.assignedDate) : new Date(lead.updatedAt)
        y = d.getFullYear()
        m = d.getMonth() + 1
      }

      if (!map.has(y)) map.set(y, new Map<number, MyWorkLead[]>())
      const yearMap = map.get(y)!
      if (!yearMap.has(m)) yearMap.set(m, [])
      yearMap.get(m)!.push(lead)
    }

    return map
  }, [leads])

  // Leads in the currently selected month
  const currentMonthLeads = useMemo(() => {
    if (currentYear === null || currentMonth === null) return []
    const yearMap = leadsByYearMonth.get(currentYear)
    if (!yearMap) return []
    const monthLeads = yearMap.get(currentMonth) || []

    return monthLeads.filter((lead) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ASSIGNED' && lead.subStatus !== 'CAD_ASSIGNED') return false
        if (statusFilter === 'WORKING' && lead.subStatus !== 'CAD_WORKING') return false
        if (statusFilter === 'UNDER_REVIEW' && lead.subStatus !== 'CAD_COMPLETED') return false
        if (
          statusFilter === 'APPROVED' &&
          lead.subStatus !== 'CAD_APPROVED' &&
          lead.stage === 'CAD_PHASE'
        )
          return false
        if (statusFilter === 'REWORK' && !lead.isRework) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = lead.name.toLowerCase().includes(q)
        const matchesPhone = lead.phone?.toLowerCase().includes(q)
        const matchesLocation = lead.location?.toLowerCase().includes(q)
        const matchesSrCrm = lead.srCrmAssignee?.fullName.toLowerCase().includes(q)
        const matchesFiles = lead.submissions.some((s) =>
          s.files.some((f) => f.fileName.toLowerCase().includes(q)),
        )
        return matchesName || matchesPhone || matchesLocation || matchesSrCrm || matchesFiles
      }
      return true
    })
  }, [currentYear, currentMonth, leadsByYearMonth, statusFilter, searchQuery])

  // Global search leads (if user types in search bar while at root or year level)
  const searchMatchedLeads = useMemo(() => {
    if (!searchQuery.trim() || currentMonth !== null) return []
    const q = searchQuery.toLowerCase()
    return leads.filter((lead) => {
      const matchesName = lead.name.toLowerCase().includes(q)
      const matchesPhone = lead.phone?.toLowerCase().includes(q)
      const matchesLocation = lead.location?.toLowerCase().includes(q)
      const matchesSrCrm = lead.srCrmAssignee?.fullName.toLowerCase().includes(q)
      const matchesFiles = lead.submissions.some((s) =>
        s.files.some((f) => f.fileName.toLowerCase().includes(q)),
      )
      return matchesName || matchesPhone || matchesLocation || matchesSrCrm || matchesFiles
    })
  }, [searchQuery, currentMonth, leads])

  // Navigation handlers
  const handleGoToRoot = () => {
    setCurrentYear(null)
    setCurrentMonth(null)
  }

  const handleGoToYear = (year: number) => {
    setCurrentYear(year)
    setCurrentMonth(null)
  }

  const handleGoToMonth = (monthNum: number) => {
    setCurrentMonth(monthNum)
  }

  const handleGoUp = () => {
    if (currentMonth !== null) {
      setCurrentMonth(null)
    } else if (currentYear !== null) {
      setCurrentYear(null)
    }
  }

  // Action handlers
  const startCadWork = async (leadId: string) => {
    setBusyId(leadId)
    try {
      const response = await fetch(`/api/lead/${leadId}/cad-work/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'JR Architect started CAD work from My Work' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to start CAD work')
      }
      toast.success('CAD work started')
      await loadTasks(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start CAD work')
    } finally {
      setBusyId(null)
    }
  }

  // Current folder name for breadcrumb
  const currentMonthMeta = currentMonth
    ? MONTH_NAMES.find((m) => m.num === currentMonth)
    : null

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="CAD Architecture File Explorer"
        subtitle="Browse, search, and manage your assigned architectural drafting projects organized as a PC file directory by Year and Month."
      />

      <main className="mx-auto max-w-[1440px] px-6 py-6 space-y-4">
        {/* Top Summary Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className="font-semibold px-2.5 py-1">
              Total: {summary.total}
            </Badge>
            <Badge variant="secondary" className="px-2.5 py-1">
              Assigned: {summary.assigned}
            </Badge>
            <Badge variant="secondary" className="px-2.5 py-1">
              Working: {summary.working}
            </Badge>
            <Badge variant="secondary" className="px-2.5 py-1">
              Under Review: {summary.underReview}
            </Badge>
            <Badge
              variant="secondary"
              className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
            >
              Approved: {summary.approved}
            </Badge>
            {summary.rework > 0 ? (
              <Badge variant="destructive" className="px-2.5 py-1">
                Rework: {summary.rework}
              </Badge>
            ) : null}
            <Badge variant="outline" className="px-2.5 py-1 border-primary/40 text-primary font-semibold">
              <Layers className="h-3 w-3 mr-1" />
              {summary.totalSqft.toLocaleString()} sqft
            </Badge>
            <Badge variant="outline" className="px-2.5 py-1 text-muted-foreground">
              <FileText className="h-3 w-3 mr-1" />
              {summary.totalFiles} files
            </Badge>
          </div>
        </div>

        {/* --- LOCAL PC FILE EXPLORER WINDOW --- */}
        <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden flex flex-col">
          {/* File Explorer Titlebar */}
          <div className="bg-muted/40 border-b border-border/60 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Monitor className="h-4 w-4 text-primary" />
              <span>CAD Architecture PC Explorer</span>
              <span className="text-muted-foreground">• Local Storage Hierarchy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80 inline-block" />
            </div>
          </div>

          {/* Explorer Toolbar / Address Bar */}
          <div className="p-3 border-b border-border/60 bg-card flex flex-wrap items-center justify-between gap-3">
            {/* Navigation buttons (Up, Refresh) */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentYear === null && currentMonth === null}
                onClick={handleGoUp}
                title="Go up one folder"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => void loadTasks()}
                disabled={loading}
                title="Refresh folder contents"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Clickable Breadcrumb Address Bar */}
            <div className="flex-1 min-w-[240px] flex items-center gap-1 rounded-lg border border-border/70 bg-background px-3 py-1 text-xs">
              <HardDrive className="h-3.5 w-3.5 text-primary shrink-0 mr-1" />
              <button
                type="button"
                onClick={handleGoToRoot}
                className="font-medium hover:text-primary transition-colors truncate cursor-pointer"
              >
                This PC
              </button>

              {currentYear !== null ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <button
                    type="button"
                    onClick={() => handleGoToYear(currentYear)}
                    className={`font-medium transition-colors cursor-pointer ${
                      currentMonth === null ? 'text-primary font-bold' : 'hover:text-primary text-foreground'
                    }`}
                  >
                    📁 {currentYear}
                  </button>
                </>
              ) : null}

              {currentMonthMeta ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-primary font-bold truncate">
                    📁 {currentMonthMeta.name}
                  </span>
                </>
              ) : null}
            </div>

            {/* Right Controls: Search & View Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search CAD projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              {currentMonth !== null ? (
                <div className="flex items-center border rounded-md p-0.5 bg-muted/20">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setViewMode('grid')}
                    title="Grid view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setViewMode('list')}
                    title="List view"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Explorer Main Content Area */}
          <div className="p-5 min-h-[460px] bg-muted/5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading file system...</p>
              </div>
            ) : searchQuery.trim() && currentMonth === null ? (
              /* Global Search Results View */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    Search Results for &quot;{searchQuery}&quot; ({searchMatchedLeads.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="text-xs h-7"
                  >
                    Clear Search
                  </Button>
                </div>

                {searchMatchedLeads.length === 0 ? (
                  <div className="text-center py-16 text-sm text-muted-foreground">
                    No CAD architecture files match &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {searchMatchedLeads.map((lead) => (
                      <ProjectCadCard
                        key={lead.id}
                        lead={lead}
                        busyId={busyId}
                        onStartWork={startCadWork}
                        onSubmitWork={(l) => setSubmitWorkLead(l)}
                        onInspectWork={(l) => setInspectLead(l)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : currentYear === null ? (
              /* --- LEVEL 1: ROOT DIRECTORY (YEARS) --- */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Folders (Years)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {availableYears.length} {availableYears.length === 1 ? 'Year' : 'Years'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {availableYears.map((year) => {
                    const yearMap = leadsByYearMonth.get(year)
                    let yearProjectCount = 0
                    if (yearMap) {
                      for (const monthList of yearMap.values()) {
                        yearProjectCount += monthList.length
                      }
                    }

                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => handleGoToYear(year)}
                        className="group flex flex-col items-center justify-center p-4 rounded-xl border border-border/70 bg-card hover:bg-primary/5 hover:border-primary/50 transition-all text-center shadow-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                      >
                        <div className="relative mb-2">
                          <Folder className="h-14 w-14 text-amber-500 fill-amber-500/20 group-hover:scale-105 transition-transform" />
                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            {yearProjectCount}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {year}
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          {yearProjectCount} {yearProjectCount === 1 ? 'Project' : 'Projects'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : currentMonth === null ? (
              /* --- LEVEL 2: YEAR DIRECTORY (12 MONTHS) --- */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGoToRoot}
                      className="h-7 text-xs px-2"
                    >
                      <ArrowLeft className="h-3 w-3 mr-1" /> All Years
                    </Button>
                    <span className="text-sm font-bold text-foreground">
                      Year: {currentYear}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">12 Months</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {MONTH_NAMES.map((m) => {
                    const yearMap = leadsByYearMonth.get(currentYear)
                    const monthLeads = yearMap?.get(m.num) || []
                    const count = monthLeads.length
                    const hasItems = count > 0

                    return (
                      <button
                        key={m.num}
                        type="button"
                        onClick={() => handleGoToMonth(m.num)}
                        className={`group flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/40 ${
                          hasItems
                            ? 'bg-card border-border/80 hover:border-primary/50 hover:bg-primary/5 shadow-xs'
                            : 'bg-muted/10 border-dashed border-border/50 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="relative mb-2">
                          <Folder
                            className={`h-14 w-14 transition-transform group-hover:scale-105 ${
                              hasItems
                                ? 'text-amber-500 fill-amber-500/20'
                                : 'text-muted-foreground/40 fill-muted/10'
                            }`}
                          />
                          {hasItems ? (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                              {count}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {String(m.num).padStart(2, '0')} - {m.name}
                        </span>
                        <span
                          className={`text-[10px] mt-0.5 font-medium ${
                            hasItems
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {count} {count === 1 ? 'Project' : 'Projects'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* --- LEVEL 3: MONTH DIRECTORY (PROJECTS / CAD DRAWINGS) --- */
              <div className="space-y-4">
                {/* Folder Header & Sub-filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentMonth(null)}
                      className="h-7 text-xs px-2"
                    >
                      <ArrowLeft className="h-3 w-3 mr-1" /> Months
                    </Button>
                    <FolderOpen className="h-5 w-5 text-amber-500" />
                    <h2 className="text-base font-bold text-foreground">
                      {currentMonthMeta?.name} {currentYear}
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                      {currentMonthLeads.length}{' '}
                      {currentMonthLeads.length === 1 ? 'Project' : 'Projects'}
                    </Badge>
                  </div>

                  {/* Status Pills */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: 'ALL', label: 'All Statuses' },
                      { key: 'ASSIGNED', label: 'Assigned' },
                      { key: 'WORKING', label: 'Working' },
                      { key: 'UNDER_REVIEW', label: 'Under Review' },
                      { key: 'APPROVED', label: 'Approved' },
                      { key: 'REWORK', label: 'Rework' },
                    ].map((st) => (
                      <Button
                        key={st.key}
                        variant={statusFilter === st.key ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setStatusFilter(st.key)}
                      >
                        {st.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {currentMonthLeads.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-14 text-center space-y-2 bg-card/40">
                    <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                    <p className="text-sm font-semibold text-foreground">
                      This folder is empty
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      No CAD architectural projects were first assigned in{' '}
                      {currentMonthMeta?.name} {currentYear}
                      {statusFilter !== 'ALL' ? ` with filter "${statusFilter}"` : ''}.
                    </p>
                  </div>
                ) : viewMode === 'grid' ? (
                  /* Grid View of Project Files */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currentMonthLeads.map((lead) => (
                      <ProjectCadCard
                        key={lead.id}
                        lead={lead}
                        busyId={busyId}
                        onStartWork={startCadWork}
                        onSubmitWork={(l) => setSubmitWorkLead(l)}
                        onInspectWork={(l) => setInspectLead(l)}
                      />
                    ))}
                  </div>
                ) : (
                  /* Table / Details List View */
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">CAD Project</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">First Assigned Date</th>
                          <th className="py-2.5 px-3">Location &amp; Sqft</th>
                          <th className="py-2.5 px-3">Deliverables</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {currentMonthLeads.map((lead) => {
                          const allFiles = lead.submissions.flatMap((s) => s.files)
                          const latestFile = allFiles[0]

                          return (
                            <tr key={lead.id} className="hover:bg-muted/30">
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                                    <PenTool className="h-3.5 w-3.5" />
                                  </div>
                                  <div>
                                    <Link
                                      href={`/crm/jr-architecture/leads/${lead.id}`}
                                      className="font-semibold text-foreground hover:text-primary hover:underline"
                                    >
                                      {lead.name}
                                    </Link>
                                    {lead.phone ? (
                                      <p className="text-[10px] text-muted-foreground">{lead.phone}</p>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-1 items-start">
                                  <Badge
                                    variant={
                                      lead.subStatus === 'CAD_APPROVED'
                                        ? 'default'
                                        : lead.subStatus === 'CAD_WORKING'
                                          ? 'secondary'
                                          : 'outline'
                                    }
                                    className={`text-[10px] ${
                                      lead.subStatus === 'CAD_APPROVED'
                                        ? 'bg-emerald-600 text-white'
                                        : lead.subStatus === 'CAD_COMPLETED'
                                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                                          : ''
                                    }`}
                                  >
                                    {formatLabel(lead.subStatus)}
                                  </Badge>
                                  {lead.isRework ? (
                                    <Badge
                                      variant="destructive"
                                      className="text-[9px] px-1.5 py-0 font-bold"
                                    >
                                      Rework Round {lead.latestPhaseTask?.currentReviewRound ?? 1}
                                    </Badge>
                                  ) : null}
                                </div>
                              </td>
                              <td className="py-3 px-3 font-semibold text-foreground">
                                {lead.assignedDate
                                  ? new Date(lead.assignedDate).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'Not set'}
                              </td>
                              <td className="py-3 px-3">
                                <p className="truncate max-w-[150px]">{lead.location || '—'}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {lead.projectSqft ? `${lead.projectSqft.toLocaleString()} sqft` : 'Area: —'}
                                </p>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-semibold text-foreground block">
                                  {lead.submissions.length} round(s) • {allFiles.length} file(s)
                                </span>
                                {latestFile ? (
                                  <a
                                    href={latestFile.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 max-w-[160px] truncate mt-0.5"
                                    title={latestFile.fileName}
                                  >
                                    <Download className="h-2.5 w-2.5 flex-shrink-0" />
                                    <span className="truncate">{latestFile.fileName}</span>
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground italic">None yet</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                                    <Link href={`/crm/jr-architecture/leads/${lead.id}`}>
                                      Workspace
                                    </Link>
                                  </Button>
                                  {lead.canStart ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={busyId === lead.id}
                                      onClick={() => void startCadWork(lead.id)}
                                      className="h-7 text-xs"
                                    >
                                      Start
                                    </Button>
                                  ) : null}
                                  {lead.canSubmit ? (
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => setSubmitWorkLead(lead)}
                                    >
                                      Upload
                                    </Button>
                                  ) : null}
                                  {lead.submissions.length > 0 ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs p-1"
                                      onClick={() => setInspectLead(lead)}
                                      title="Inspect Submissions"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Explorer Bottom Statusbar */}
          <div className="bg-muted/40 border-t border-border/60 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-muted-foreground">
            <div>
              {currentMonth !== null ? (
                <span>
                  <strong>{currentMonthLeads.length}</strong> items in{' '}
                  <strong>
                    {currentMonthMeta?.name} {currentYear}
                  </strong>
                </span>
              ) : currentYear !== null ? (
                <span>
                  Viewing year <strong>{currentYear}</strong> (12 month directories)
                </span>
              ) : (
                <span>
                  Root Directory (<strong>{availableYears.length}</strong> Years)
                </span>
              )}
            </div>
            <div>
              <span>Local Storage Mode • CAD Architecture First Assigned Month Archive</span>
            </div>
          </div>
        </div>
      </main>

      {/* Inspect Past Submissions Dialog */}
      <Dialog
        open={Boolean(inspectLead)}
        onOpenChange={(open) => {
          if (!open) setInspectLead(null)
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              CAD Submission History & Deliverables
            </DialogTitle>
            <DialogDescription>
              {inspectLead?.name} • Review all drawing versions, uploaded blueprints, and notes.
            </DialogDescription>
          </DialogHeader>

          {inspectLead ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Current Stage & Status
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">
                      {formatLabel(inspectLead.stage)}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {formatLabel(inspectLead.subStatus)}
                    </Badge>
                  </div>
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
                  Submission History ({inspectLead.submissions.length} round
                  {inspectLead.submissions.length > 1 ? 's' : ''})
                </h4>

                {inspectLead.submissions.map((sub, idx) => (
                  <div key={sub.id} className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2">
                      <div>
                        <span className="text-xs font-bold text-foreground">
                          {sub.versionName ||
                            `Version ${sub.versionNumber || inspectLead.submissions.length - idx}`}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Submitted on{' '}
                          {new Date(sub.submittedAt).toLocaleString('en-US', {
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

      {/* Cad Submission Dialog */}
      <CadSubmissionDialog
        open={Boolean(submitWorkLead)}
        onOpenChange={(open) => {
          if (!open) setSubmitWorkLead(null)
        }}
        leadId={submitWorkLead?.id ?? null}
        leadName={submitWorkLead?.name}
        onSubmitted={() => void loadTasks(true)}
      />
    </div>
  )
}

// Subcomponent: Project CAD Card inside the Month Directory (Matches Quotation Card Standard)
function ProjectCadCard({
  lead,
  busyId,
  onStartWork,
  onSubmitWork,
  onInspectWork,
}: {
  lead: MyWorkLead
  busyId: string | null
  onStartWork: (id: string) => Promise<void>
  onSubmitWork: (lead: MyWorkLead) => void
  onInspectWork: (lead: MyWorkLead) => void
}) {
  const isWorking = lead.subStatus === 'CAD_WORKING'
  const isApproved = lead.subStatus === 'CAD_APPROVED' || lead.stage !== 'CAD_PHASE'
  const isUnderReview = lead.subStatus === 'CAD_COMPLETED'
  const isRework = lead.isRework
  const allFiles = lead.submissions.flatMap((s) => s.files)

  return (
    <Card
      className={`group overflow-hidden border transition-all hover:shadow-md ${
        isRework
          ? 'border-red-300/80 bg-gradient-to-br from-red-500/5 to-rose-500/5 dark:border-red-700/50'
          : isWorking
            ? 'border-amber-300/80 bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:border-amber-700/50'
            : isUnderReview
              ? 'border-blue-300/80 bg-gradient-to-br from-blue-500/5 to-sky-500/5 dark:border-blue-700/50'
              : isApproved
                ? 'border-emerald-300/80 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:border-emerald-700/50'
                : 'border-border/70 hover:border-primary/40 bg-card'
      }`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Top Header: Icon + Lead Name + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-110 transition-transform">
              <PenTool className="h-5 w-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <Link
                href={`/crm/jr-architecture/leads/${lead.id}`}
                className="font-bold text-sm text-foreground hover:text-primary hover:underline line-clamp-1 truncate block"
                title={lead.name}
              >
                {lead.name}
              </Link>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant={isApproved ? 'default' : isWorking ? 'secondary' : 'outline'}
                  className={`text-[10px] px-1.5 py-0 ${
                    isApproved
                      ? 'bg-emerald-600 text-white'
                      : isUnderReview
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                        : isWorking
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                          : ''
                  }`}
                >
                  {formatLabel(lead.subStatus)}
                </Badge>
                {isRework ? (
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold">
                    Rework Round {lead.latestPhaseTask?.currentReviewRound ?? 1}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Lead Metadata */}
        <div className="text-xs space-y-1 text-muted-foreground pt-1 border-t border-border/40">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-foreground">Assigned:</span>
            </span>
            <span className="font-bold text-foreground">
              {lead.assignedDate
                ? new Date(lead.assignedDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Not set'}
            </span>
          </div>

          {lead.location ? (
            <div className="flex items-center gap-1 truncate text-[11px]" title={lead.location}>
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{lead.location}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-muted-foreground">Area Sqft:</span>
            <span className="font-semibold text-foreground">
              {lead.projectSqft ? `${lead.projectSqft.toLocaleString()} sqft` : '—'}
            </span>
          </div>

          {lead.srCrmAssignee ? (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1">
                <UserRound className="h-3 w-3" />
                Sr CRM:
              </span>
              <span className="font-medium text-foreground truncate max-w-[150px]">
                {lead.srCrmAssignee.fullName}
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-muted-foreground">Submissions:</span>
            <span className="font-semibold text-foreground">
              {lead.submissions.length} round(s) • {allFiles.length} file(s)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          <Button
            asChild
            size="sm"
            variant={isWorking ? 'default' : 'outline'}
            className="flex-1 h-8 text-xs"
          >
            <Link href={`/crm/jr-architecture/leads/${lead.id}`}>
              {isWorking ? 'CAD Studio' : 'Workspace'}
            </Link>
          </Button>

          {lead.canStart ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busyId === lead.id}
              onClick={() => void onStartWork(lead.id)}
              className="h-8 text-xs font-semibold"
            >
              {busyId === lead.id ? 'Starting...' : 'Start Work'}
            </Button>
          ) : null}

          {lead.canSubmit ? (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs font-semibold"
              onClick={() => onSubmitWork(lead)}
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              Upload
            </Button>
          ) : null}

          {lead.submissions.length > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => onInspectWork(lead)}
              title="Inspect submissions"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
