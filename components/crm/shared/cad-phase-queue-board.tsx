'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  DraftingCompass,
  LayoutGrid,
  ListFilter,
  Loader2,
  MapPin,
  MoreHorizontal,
  Phone,
  Search,
  Send,
  Sparkles,
  TableIcon,
  UserRound,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

type LeadRecord = {
  id: string
  name: string
  phone: string | null
  location: string | null
  stage: string
  subStatus: string | null
  updatedAt: string
  budget: number | null
  jrArchitectAssignment: {
    id: string
    user: { id: string; fullName: string; email: string }
  } | null
  srCrmAssignment: {
    id: string
    user: { id: string; fullName: string; email: string }
  } | null
  quotationAssignment: {
    id: string
    user: { id: string; fullName: string; email: string }
  } | null
  latestCompletedVisit?: {
    id: string
    scheduledAt: string
    projectSqft: number | null
    assignedVisitLead: { id: string; fullName: string } | null
    supportMembers: Array<{ id: string; fullName: string }>
  } | null
  latestFirstMeeting: {
    id: string
    title: string
    startsAt: string
    notes: string | null
  } | null
  canSetMeeting: boolean
  canSubmitMeetingData: boolean
  canReassignJrArchitect?: boolean
  canReassignQuotation?: boolean
}

type QueueResponse = {
  success: boolean
  data?: LeadRecord[]
  error?: string
}

type DepartmentUser = { id: string; fullName: string; email: string }

const ALL_MEMBER_FILTER = 'ALL_MEMBERS'
const ALL_MONTH_FILTER = 'ALL_MONTHS'
type DepartmentUsersResponse = {
  success: boolean
  users?: DepartmentUser[]
  error?: string
}

type StatCardConfig = {
  key: string
  label: string
  count: number
  Icon: ComponentType<{ className?: string }>
  className: string
  iconClassName: string
  accentClassName: string
}

const CAD_PHASE_STAT_META: Record<
  string,
  { label: string; Icon: ComponentType<{ className?: string }>; className: string; iconClassName: string; accentClassName: string }
> = {
  ALL: {
    label: 'Total CAD Phase',
    Icon: DraftingCompass,
    className: 'border-slate-200/80 from-slate-900 via-slate-800 to-slate-950 text-white dark:border-white/10 dark:from-slate-100 dark:via-white dark:to-slate-200 dark:text-slate-950',
    iconClassName: 'bg-white/15 text-white ring-white/25 dark:bg-slate-950/10 dark:text-slate-950 dark:ring-slate-950/15',
    accentClassName: 'from-primary to-amber-400',
  },
  CAD_ASSIGNED: {
    label: 'CAD Assigned',
    Icon: Send,
    className: 'border-sky-200/70 from-sky-50 via-white to-cyan-50 text-sky-800 dark:border-sky-500/30 dark:from-sky-950/60 dark:via-slate-950 dark:to-cyan-950/40 dark:text-sky-100',
    iconClassName: 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/20',
    accentClassName: 'from-sky-500 to-cyan-500',
  },
  CAD_WORKING: {
    label: 'CAD Working',
    Icon: Wrench,
    className: 'border-amber-200/70 from-amber-50 via-white to-orange-50 text-amber-800 dark:border-amber-500/30 dark:from-amber-950/60 dark:via-slate-950 dark:to-orange-950/40 dark:text-amber-100',
    iconClassName: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/20',
    accentClassName: 'from-amber-500 to-orange-500',
  },
  CAD_COMPLETED: {
    label: 'CAD Completed',
    Icon: ClipboardCheck,
    className: 'border-violet-200/70 from-violet-50 via-white to-fuchsia-50 text-violet-800 dark:border-violet-500/30 dark:from-violet-950/60 dark:via-slate-950 dark:to-fuchsia-950/40 dark:text-violet-100',
    iconClassName: 'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/20',
    accentClassName: 'from-violet-500 to-fuchsia-500',
  },
  CAD_APPROVED: {
    label: 'CAD Approved',
    Icon: CheckCircle2,
    className: 'border-emerald-200/70 from-emerald-50 via-white to-teal-50 text-emerald-800 dark:border-emerald-500/30 dark:from-emerald-950/60 dark:via-slate-950 dark:to-teal-950/40 dark:text-emerald-100',
    iconClassName: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20',
    accentClassName: 'from-emerald-500 to-teal-500',
  },
}

const TOTAL_QUEUE_STAT_META = {
  Icon: ListFilter,
  className:
    'border-slate-200/80 from-slate-900 via-slate-800 to-slate-950 text-white dark:border-white/10 dark:from-slate-100 dark:via-white dark:to-slate-200 dark:text-slate-950',
  iconClassName: 'bg-white/15 text-white ring-white/25 dark:bg-slate-950/10 dark:text-slate-950 dark:ring-slate-950/15',
  accentClassName: 'from-primary to-amber-400',
}

const DEFAULT_STAT_META = {
  Icon: ListFilter,
  className:
    'border-indigo-200/70 from-indigo-50 via-white to-sky-50 text-indigo-800 dark:border-indigo-500/30 dark:from-indigo-950/60 dark:via-slate-950 dark:to-sky-950/40 dark:text-indigo-100',
  iconClassName: 'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-400/20',
  accentClassName: 'from-indigo-500 to-sky-500',
}

function formatLabel(value: string | null | undefined) {
  if (!value) return 'N/A'
  if (value === 'DISCOVERY') return 'Consulting Phase'
  if (value === 'PROPOSAL_SENT') return 'Quotation Sent'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatProjectSqft(value: number | null | undefined) {
  if (value === null || value === undefined) return 'N/A'
  return `${value.toLocaleString()} sqft`
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatMonth(value: string | null | undefined) {
  if (!value) return 'No Visit Date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No Visit Date'
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function subStatusBadgeClass(value: string | null | undefined) {
  switch (value) {
    case 'CAD_ASSIGNED':
      return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200'
    case 'CAD_WORKING':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
    case 'CAD_COMPLETED':
      return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200'
    case 'CAD_APPROVED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
    default:
      return ''
  }
}

function getCardBgColor(subStatus: string | null | undefined, stage: string) {
  switch (subStatus) {
    // CAD/Design Phases
    case 'CAD_ASSIGNED':
    case 'VISUAL_ASSIGNED':
      return 'bg-sky-50/50 border-sky-200/80 dark:bg-sky-950/10 dark:border-sky-900/50'
    case 'CAD_WORKING':
    case 'VISUAL_WORKING':
      return 'bg-amber-50/50 border-amber-200/80 dark:bg-amber-950/10 dark:border-amber-900/50'
    case 'CAD_COMPLETED':
    case 'VISUAL_COMPLETED':
      return 'bg-violet-50/50 border-violet-200/80 dark:bg-violet-950/10 dark:border-violet-900/50'
    case 'CAD_APPROVED':
    case 'CLIENT_APPROVED':
      return 'bg-emerald-50/50 border-emerald-200/80 dark:bg-emerald-950/10 dark:border-emerald-900/50'
      
    // Quotation / Budget Phases
    case 'QUOTATION_ASSIGNED':
      return 'bg-blue-50/50 border-blue-200/80 dark:bg-blue-950/10 dark:border-blue-900/50'
    case 'QUOTATION_WORKING':
      return 'bg-orange-50/50 border-orange-200/80 dark:bg-orange-950/10 dark:border-orange-900/50'
    case 'QUOTATION_COMPLETED':
      return 'bg-indigo-50/50 border-indigo-200/80 dark:bg-indigo-950/10 dark:border-indigo-900/50'
    case 'QUOTATION_APPROVED':
      return 'bg-teal-50/50 border-teal-200/80 dark:bg-teal-950/10 dark:border-teal-900/50'
    case 'BUDGET_MEETING_SET':
      return 'bg-purple-50/50 border-purple-200/80 dark:bg-purple-950/10 dark:border-purple-900/50'
    
    // Default fallback
    default:
      if (stage === 'DISCOVERY') {
        return 'bg-slate-50/50 border-slate-200/80 dark:bg-slate-900/50 dark:border-slate-800'
      }
      return 'bg-card border-border/70'
  }
}

function stageSubStatusBlock(lead: LeadRecord) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold text-foreground">
        {formatLabel(lead.stage)}
      </div>
      <Badge
        variant="outline"
        className={`whitespace-nowrap px-2 py-0.5 text-[11px] font-medium ${subStatusBadgeClass(lead.subStatus)}`}
      >
        {formatLabel(lead.subStatus)}
      </Badge>
    </div>
  )
}

function visitTeamLabel(visit: LeadRecord['latestCompletedVisit']) {
  if (!visit) return 'N/A'
  const names = [
    visit.assignedVisitLead?.fullName,
    ...(visit.supportMembers ?? []).map((member) => member.fullName),
  ].filter(Boolean)
  return names.length > 0 ? names.join(' + ') : 'N/A'
}

function srCrmVisitTeamBlock(lead: LeadRecord) {
  const srCrmName = lead.srCrmAssignment?.user.fullName ?? 'Unassigned'
  const visitTeamNames = visitTeamLabel(lead.latestCompletedVisit)

  return (
    <div className="min-w-0 space-y-1" title={`SR CRM: ${srCrmName} | Visit Team: ${visitTeamNames}`}>
      <div className="truncate text-sm font-medium text-foreground">
        {srCrmName}
      </div>
      <div className="truncate text-xs text-muted-foreground">
        Visit: {visitTeamNames}
      </div>
    </div>
  )
}

function toDateTimeLocalInput(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

export function CadPhaseQueueBoard({
  title,
  subtitle,
  leadBasePath,
  queueType = 'cad',
  queueEndpoint = '/api/cad-work/jr-architect-queue',
  assigneeDepartment = 'JR_ARCHITECT',
  assigneeLabel = 'JR Architect',
  showAssigneeReassign = true,
  showSrCrmFilter = false,
}: {
  title: string
  subtitle: string
  leadBasePath: string
  queueType?: 'cad' | 'meeting' | 'budget' | 'design'
  queueEndpoint?: string
  assigneeDepartment?: string
  assigneeLabel?: string
  showAssigneeReassign?: boolean
  showSrCrmFilter?: boolean
}) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [memberOptions, setMemberOptions] = useState<DepartmentUser[]>([])
  const [activeLead, setActiveLead] = useState<LeadRecord | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [reassignOpen, setReassignOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [meetingOpen, setMeetingOpen] = useState(false)
  const [meetingKind, setMeetingKind] = useState<'FIRST' | 'BUDGET'>('FIRST')
  const [meetingAt, setMeetingAt] = useState(toDateTimeLocalInput(new Date()))
  const [meetingMode, setMeetingMode] = useState<'ONLINE' | 'OFFLINE'>('ONLINE')
  const [meetingNote, setMeetingNote] = useState('')
  const [completeMeetingOpen, setCompleteMeetingOpen] = useState(false)
  const [completeMeetingLead, setCompleteMeetingLead] =
    useState<LeadRecord | null>(null)
  const [completeMeetingNote, setCompleteMeetingNote] = useState('')
  const [clientApproval, setClientApproval] = useState<
    'DESIGN_AGREEMENT' | 'FITOUT_AGREEMENT' | 'NO_APPROVAL'
  >('NO_APPROVAL')
  const [quotationMembers, setQuotationMembers] = useState<DepartmentUser[]>([])
  const [visualizerMembers, setVisualizerMembers] = useState<DepartmentUser[]>(
    [],
  )
  const [srCrmMembers, setSrCrmMembers] = useState<DepartmentUser[]>([])
  const [quotationMemberId, setQuotationMemberId] = useState('')
  const [visualizerMemberId, setVisualizerMemberId] = useState('')
  const [srCrmMemberId, setSrCrmMemberId] = useState('')
  const [loadingQuotationMembers, setLoadingQuotationMembers] = useState(false)
  const [loadingVisualizerMembers, setLoadingVisualizerMembers] =
    useState(false)
  const [loadingSrCrmMembers, setLoadingSrCrmMembers] = useState(false)
  const [reassignQuotationOpen, setReassignQuotationOpen] = useState(false)
  const [reassignSrCrmOpen, setReassignSrCrmOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('ALL')
  const [jrArchitectFilter, setJrArchitectFilter] = useState(ALL_MEMBER_FILTER)
  const [srCrmFilter, setSrCrmFilter] = useState(ALL_MEMBER_FILTER)
  const [visitMonthFilter, setVisitMonthFilter] = useState(ALL_MONTH_FILTER)
  const [dropOpen, setDropOpen] = useState(false)
  const [dropSubStatus, setDropSubStatus] = useState('')
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [projectSizeOpen, setProjectSizeOpen] = useState(false)
  const [projectSizeValue, setProjectSizeValue] = useState('')

  const closedSubStatusOptions = [
    'PROJECT_DROPPED',
    'REJECTED_OFFER',
    'SMALL_BUDGET',
    'INVALID',
    'NOT_INTERESTED',
    'LOST',
    'DEAD_LEAD',
  ]

  const isMeetingQueue = queueType === 'meeting'
  const isBudgetQueue = queueType === 'budget'
  const isDesignQueue = queueType === 'design'
  const isCadQueue = !isMeetingQueue && !isBudgetQueue && !isDesignQueue
  const canDropFromQueue = isCadQueue || isMeetingQueue || isBudgetQueue

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 400)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        queueType,
      })
      if (search) params.set('search', search)
      const response = await fetch(`${queueEndpoint}?${params.toString()}`, {
        cache: 'no-store',
      })
      const payload = (await response.json()) as QueueResponse
      if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
        throw new Error(payload.error ?? 'Failed to load queue')
      }
      setLeads(payload.data)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load queue',
      )
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [queueEndpoint, queueType, search])

  useEffect(() => {
    void loadLeads()
  }, [loadLeads])

  const loadAssigneeMembers = async () => {
    if (memberOptions.length > 0) return
    const response = await fetch(
      `/api/department/available/${assigneeDepartment}`,
      { cache: 'no-store' },
    )
    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      throw new Error(
        payload?.error ?? `Failed to load ${assigneeLabel} members`,
      )
    }
    const users = Array.isArray(payload.users) ? payload.users : []
    setMemberOptions(users)
  }

  const loadQuotationMembers = async () => {
    if (quotationMembers.length > 0) return
    setLoadingQuotationMembers(true)
    try {
      const response = await fetch('/api/department/available/QUOTATION_TEAM', {
        cache: 'no-store',
      })
      const payload = (await response.json()) as DepartmentUsersResponse
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to load quotation members')
      }
      setQuotationMembers(Array.isArray(payload.users) ? payload.users : [])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to load quotation members',
      )
    } finally {
      setLoadingQuotationMembers(false)
    }
  }

  const loadVisualizerMembers = async () => {
    if (visualizerMembers.length > 0) return
    setLoadingVisualizerMembers(true)
    try {
      const response = await fetch('/api/department/available/3D_VISUALIZER', {
        cache: 'no-store',
      })
      const payload = (await response.json()) as DepartmentUsersResponse
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to load 3D Visualizer members')
      }
      setVisualizerMembers(Array.isArray(payload.users) ? payload.users : [])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to load 3D Visualizer members',
      )
    } finally {
      setLoadingVisualizerMembers(false)
    }
  }

  const loadSrCrmMembers = async () => {
    if (srCrmMembers.length > 0) return
    setLoadingSrCrmMembers(true)
    try {
      const response = await fetch('/api/department/available/SR_CRM', {
        cache: 'no-store',
      })
      const payload = (await response.json()) as DepartmentUsersResponse
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to load SR CRM members')
      }
      setSrCrmMembers(Array.isArray(payload.users) ? payload.users : [])
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load SR CRM members',
      )
    } finally {
      setLoadingSrCrmMembers(false)
    }
  }

  const openReassignSrCrm = async (lead: LeadRecord) => {
    setActiveLead(lead)
    setSrCrmMemberId(lead.srCrmAssignment?.user.id ?? '')
    setReassignSrCrmOpen(true)
    await loadSrCrmMembers()
  }

  const submitReassignSrCrm = async () => {
    if (!activeLead || !srCrmMemberId) return
    setSaving(true)
    try {
      const response = await fetch(
        `/api/lead/${activeLead.id}/assignments/SR_CRM`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: srCrmMemberId }),
        },
      )
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to reassign SR CRM')
      }
      toast.success('SR CRM reassigned successfully')
      setReassignSrCrmOpen(false)
      setActiveLead(null)
      await loadLeads()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reassign SR CRM')
    } finally {
      setSaving(false)
    }
  }

  const openReassign = async (lead: LeadRecord) => {
    if (lead.canReassignJrArchitect === false) {
      toast.error(
        `${assigneeLabel} reassignment is disabled after CAD approval.`,
      )
      toast.error(
        `${assigneeLabel} reassignment is disabled after CAD approval.`,
      )
      return
    }
    setActiveLead(lead)
    setSelectedMemberId(lead.jrArchitectAssignment?.user.id ?? '')
    setReassignOpen(true)
    try {
      await loadAssigneeMembers()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to load ${assigneeLabel} members`,
      )
    }
  }

  const submitReassign = async () => {
    if (!activeLead || !selectedMemberId) return
    if (activeLead.canReassignJrArchitect === false) {
      toast.error(
        `${assigneeLabel} reassignment is disabled after CAD approval.`,
      )
      return
    }
    setSaving(true)
    try {
      const response = await fetch(
        `/api/lead/${activeLead.id}/assignments/${assigneeDepartment}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedMemberId }),
        },
      )
      const payload = await response.json()
      if (!response.ok || !payload?.success)
        throw new Error(payload?.error ?? `Failed to reassign ${assigneeLabel}`)
      toast.success(`${assigneeLabel} reassigned successfully`)
      setReassignOpen(false)
      setActiveLead(null)
      await loadLeads()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to reassign ${assigneeLabel}`,
      )
    } finally {
      setSaving(false)
    }
  }

  const openReassignQuotation = async (lead: LeadRecord) => {
    if (!lead.canReassignQuotation) {
      toast.error(
        'Quotation reassignment is only available during quotation phase.',
      )
      return
    }
    setActiveLead(lead)
    setQuotationMemberId(
      lead.subStatus === 'QUOTATION_APPROVED'
        ? ''
        : lead.quotationAssignment?.user.id ?? '',
    )
    setReassignQuotationOpen(true)
    await loadQuotationMembers()
  }

  const submitNewQuotation = async () => {
    if (!activeLead || !quotationMemberId) return
    setSaving(true)
    try {
      const response = await fetch(
        `/api/lead/${activeLead.id}/assignments/QUOTATION`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: quotationMemberId }),
        },
      )
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to assign new quotation')
      }
      toast.success('New quotation assigned successfully')
      setReassignQuotationOpen(false)
      setActiveLead(null)
      await loadLeads()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to assign new quotation',
      )
    } finally {
      setSaving(false)
    }
  }

  const submitReassignQuotation = async () => {
    if (!activeLead || !quotationMemberId) return
    if (!activeLead.canReassignQuotation) {
      toast.error(
        'Quotation reassignment is only available during quotation phase.',
      )
      return
    }
    setSaving(true)
    try {
      const response = await fetch(
        `/api/lead/${activeLead.id}/assignments/QUOTATION`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: quotationMemberId }),
        },
      )
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to reassign quotation')
      }
      toast.success('Quotation reassigned successfully')
      setReassignQuotationOpen(false)
      setActiveLead(null)
      await loadLeads()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reassign quotation',
      )
    } finally {
      setSaving(false)
    }
  }

  const openFirstMeetingDialog = (lead: LeadRecord) => {
    setActiveLead(lead)
    setMeetingKind('FIRST')
    setMeetingAt(toDateTimeLocalInput(new Date()))
    setMeetingMode('ONLINE')
    setMeetingNote('')
    setMeetingOpen(true)
  }

  const openBudgetMeetingDialog = (lead: LeadRecord) => {
    setActiveLead(lead)
    setMeetingKind('BUDGET')
    setMeetingAt(toDateTimeLocalInput(new Date()))
    setMeetingMode('ONLINE')
    setMeetingNote('')
    setMeetingOpen(true)
  }

  const submitMeeting = async () => {
    if (!activeLead) return
    setSaving(true)
    try {
      const startsAt = new Date(meetingAt)
      if (Number.isNaN(startsAt.getTime()))
        throw new Error('Valid meeting date/time is required')
      const startsAtIso = startsAt.toISOString()
      const notes = [`Meeting mode: ${meetingMode}`, meetingNote.trim()]
        .filter(Boolean)
        .join('\n')

      const meetingRes = await fetch(`/api/lead/${activeLead.id}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: meetingKind === 'FIRST' ? 'FIRST_MEETING' : 'BUDGET_MEETING',
          startsAt: startsAtIso,
          notes: notes || null,
        }),
      })
      const meetingPayload = await meetingRes.json()
      if (!meetingRes.ok || !meetingPayload?.success) {
        throw new Error(
          meetingPayload?.error ?? 'Failed to schedule first meeting',
        )
      }

      const stageRes = await fetch(`/api/lead/${activeLead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: meetingKind === 'FIRST' ? 'DISCOVERY' : 'BUDGET_PHASE',
          subStatus:
            meetingKind === 'FIRST'
              ? 'FIRST_MEETING_SET'
              : 'BUDGET_MEETING_SET',
          reason:
            meetingKind === 'FIRST'
              ? 'First meeting scheduled from Meeting Queue.'
              : 'Budget meeting scheduled from Budget Queue after quotation approval.',
        }),
      })
      const stagePayload = await stageRes.json()
      if (!stageRes.ok || !stagePayload?.success) {
        throw new Error(
          stagePayload?.error ?? 'Meeting saved, but stage update failed',
        )
      }

      toast.success(
        meetingKind === 'FIRST'
          ? 'First meeting created and added to calendar'
          : 'Budget meeting scheduled',
      )
      setMeetingOpen(false)
      setActiveLead(null)
      await loadLeads()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to schedule meeting',
      )
    } finally {
      setSaving(false)
    }
  }

  const openCompleteMeetingDialog = async (lead: LeadRecord) => {
    const isBudgetMeeting =
      lead.stage === 'BUDGET_PHASE' &&
      lead.subStatus === 'BUDGET_MEETING_SET'

    setCompleteMeetingLead(lead)
    setCompleteMeetingNote('')
    setQuotationMemberId('')
    setVisualizerMemberId('')
    setClientApproval(isBudgetMeeting ? 'DESIGN_AGREEMENT' : 'NO_APPROVAL')
    setCompleteMeetingOpen(true)
    if (lead.stage === 'DISCOVERY' && lead.subStatus === 'FIRST_MEETING_SET') {
      await loadQuotationMembers()
    }
    if (isBudgetMeeting) {
      await loadVisualizerMembers()
    }
  }

  const openDropDialog = (lead: LeadRecord) => {
    setActiveLead(lead)
    setDropSubStatus('')
    setDropOpen(true)
  }

  const openProjectSizeDialog = (lead: LeadRecord) => {
    if (!lead.latestCompletedVisit?.id) {
      toast.error('No completed visit found for this lead to update project size')
      return
    }
    setActiveLead(lead)
    setProjectSizeValue(
      lead.latestCompletedVisit.projectSqft
        ? String(lead.latestCompletedVisit.projectSqft)
        : '',
    )
    setProjectSizeOpen(true)
  }

  const submitProjectSize = async () => {
    if (!activeLead?.latestCompletedVisit?.id) return
    const parsedSqft = Number(projectSizeValue.trim().replace(/,/g, ''))
    if (!Number.isFinite(parsedSqft) || parsedSqft <= 0) {
      toast.error('Project size must be greater than 0')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(
        `/api/visit-schedule/${activeLead.latestCompletedVisit.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectSqft: parsedSqft }),
        },
      )
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to update project size')
      }
      toast.success('Project size updated')
      setProjectSizeOpen(false)
      setActiveLead(null)
      await loadLeads()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update project size',
      )
    } finally {
      setSaving(false)
    }
  }
  const openRenameDialog = (lead: LeadRecord) => {
    setActiveLead(lead)
    setRenameValue(lead.name ?? '')
    setRenameOpen(true)
  }
  const submitRenameLead = async () => {
    if (!activeLead || !renameValue.trim()) return
    setSaving(true)
    try {
      const response = await fetch(`/api/lead/${activeLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success)
        throw new Error(payload?.error ?? 'Failed to update lead name')
      toast.success('Lead name updated')
      setRenameOpen(false)
      setActiveLead(null)
      await loadLeads()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update lead name',
      )
    } finally {
      setSaving(false)
    }
  }

  const submitDropProject = async () => {
    if (!activeLead || !dropSubStatus) return
    setSaving(true)
    try {
      const response = await fetch(`/api/lead/${activeLead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'CLOSED',
          subStatus: dropSubStatus,
          reason: `Project dropped from ${isMeetingQueue ? 'Meeting Queue' : isBudgetQueue ? 'Budget Queue' : 'CAD Queue'}.`,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to drop project')
      }
      toast.success('Project moved to Closed')
      setDropOpen(false)
      setActiveLead(null)
      await loadLeads()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to drop project',
      )
    } finally {
      setSaving(false)
    }
  }

  const submitCompleteMeeting = async () => {
    if (!completeMeetingLead) return
    setSaving(true)
    try {
      if (
        completeMeetingLead.stage === 'DISCOVERY' &&
        completeMeetingLead.subStatus === 'FIRST_MEETING_SET'
      ) {
        if (!quotationMemberId) {
          toast.error('Select a quotation member to complete meeting')
          return
        }
        const response = await fetch(
          `/api/lead/${completeMeetingLead.id}/meetings/complete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              note: completeMeetingNote.trim() || null,
              quotationMemberId: quotationMemberId || null,
            }),
          },
        )
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error ?? 'Failed to complete first meeting')
        }
        toast.success(payload?.message ?? 'First meeting completed')
      } else if (
        completeMeetingLead.stage === 'BUDGET_PHASE' &&
        completeMeetingLead.subStatus === 'BUDGET_MEETING_SET'
      ) {
        if (clientApproval !== 'NO_APPROVAL' && !visualizerMemberId) {
          toast.error('Select a 3D Visualizer to complete budget meeting')
          return
        }

        if (clientApproval !== 'NO_APPROVAL') {
          const assignmentRes = await fetch(
            `/api/lead/${completeMeetingLead.id}/assignments/VISUALIZER_3D`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: visualizerMemberId }),
            },
          )
          const assignmentPayload = await assignmentRes.json()
          if (!assignmentRes.ok || !assignmentPayload?.success) {
            throw new Error(
              assignmentPayload?.error ?? 'Failed to assign 3D Visualizer',
            )
          }
        }

        const response = await fetch(
          `/api/lead/${completeMeetingLead.id}/stage`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stage:
                clientApproval === 'NO_APPROVAL'
                  ? 'BUDGET_PHASE'
                  : 'VISUALIZATION_PHASE',
              subStatus:
                clientApproval === 'NO_APPROVAL'
                  ? 'REJECTED_OFFER'
                  : 'VISUAL_ASSIGNED',
              reason:
                clientApproval === 'NO_APPROVAL'
                  ? `Budget meeting completed: no approval. ${completeMeetingNote.trim()}`
                  : `Budget meeting completed with ${clientApproval.replace('_', ' ').toLowerCase()} and assigned to 3D Visualizer. ${completeMeetingNote.trim()}`,
            }),
          },
        )
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error ?? 'Failed to complete budget meeting')
        }
        toast.success(
          clientApproval === 'NO_APPROVAL'
            ? 'Budget meeting completed'
            : 'Lead sent to Design Queue',
        )
      } else {
        throw new Error('This lead is not eligible for meeting completion')
      }
      setCompleteMeetingOpen(false)
      setCompleteMeetingLead(null)
      await loadLeads()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to complete first meeting',
      )
    } finally {
      setSaving(false)
    }
  }

  const memberFilteredLeads = useMemo(() => {
    let nextLeads = leads
    if (isCadQueue && jrArchitectFilter !== ALL_MEMBER_FILTER) {
      nextLeads = nextLeads.filter(
        (lead) => lead.jrArchitectAssignment?.user.id === jrArchitectFilter,
      )
    }
    if (showSrCrmFilter && srCrmFilter !== ALL_MEMBER_FILTER) {
      nextLeads = nextLeads.filter(
        (lead) => lead.srCrmAssignment?.user.id === srCrmFilter,
      )
    }
    if (visitMonthFilter !== ALL_MONTH_FILTER) {
      nextLeads = nextLeads.filter((lead) => {
        const visitDate = lead.latestCompletedVisit?.scheduledAt
        if (!visitDate) return visitMonthFilter === 'NO_VISIT_DATE'
        const date = new Date(visitDate)
        if (Number.isNaN(date.getTime())) return visitMonthFilter === 'NO_VISIT_DATE'
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === visitMonthFilter
      })
    }
    return nextLeads
  }, [isCadQueue, jrArchitectFilter, leads, showSrCrmFilter, srCrmFilter, visitMonthFilter])

  const jrArchitectFilterOptions = useMemo(() => {
    const options = new Map<string, DepartmentUser>()
    for (const lead of leads) {
      const user = lead.jrArchitectAssignment?.user
      if (user) options.set(user.id, user)
    }
    return Array.from(options.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    )
  }, [leads])

  const srCrmFilterOptions = useMemo(() => {
    const options = new Map<string, DepartmentUser>()
    for (const lead of leads) {
      const user = lead.srCrmAssignment?.user
      if (user) options.set(user.id, user)
    }
    return Array.from(options.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    )
  }, [leads])

  const visitMonthFilterOptions = useMemo(() => {
    const options = new Map<string, string>()
    let hasNoVisitDate = false
    for (const lead of leads) {
      const visitDate = lead.latestCompletedVisit?.scheduledAt
      if (!visitDate) {
        hasNoVisitDate = true
        continue
      }
      const date = new Date(visitDate)
      if (Number.isNaN(date.getTime())) {
        hasNoVisitDate = true
        continue
      }
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      options.set(value, formatMonth(visitDate))
    }
    const sorted = Array.from(options.entries()).sort(([a], [b]) => b.localeCompare(a))
    if (hasNoVisitDate) sorted.push(['NO_VISIT_DATE', 'No Visit Date'])
    return sorted
  }, [leads])

  const statCards = useMemo(() => {
    const totalMeta = isCadQueue ? CAD_PHASE_STAT_META.ALL : TOTAL_QUEUE_STAT_META
    const cards: StatCardConfig[] = [
      {
        key: 'ALL',
        label: isCadQueue ? CAD_PHASE_STAT_META.ALL.label : 'Total',
        count: memberFilteredLeads.length,
        Icon: isBudgetQueue || isMeetingQueue ? FilePlus2 : totalMeta.Icon,
        className: totalMeta.className,
        iconClassName: totalMeta.iconClassName,
        accentClassName: totalMeta.accentClassName,
      },
    ]
    const config = isMeetingQueue
      ? Array.from(
          new Map(
            memberFilteredLeads
              .flatMap((lead) => [lead.subStatus, lead.stage])
              .filter((value): value is string => Boolean(value))
              .map((value) => [value, { key: value, label: formatLabel(value) }]),
          ).values(),
        )
      : isBudgetQueue
        ? [
            { key: 'QUOTATION_ASSIGNED', label: 'Quotation Assigned' },
            { key: 'QUOTATION_WORKING', label: 'Quotation Working' },
            { key: 'QUOTATION_APPROVED', label: 'Quotation Approved' },
            { key: 'BUDGET_MEETING_SET', label: 'Budget Meeting Set' },
          ]
        : isDesignQueue
          ? [
              { key: 'VISUAL_ASSIGNED', label: 'Visual Assigned' },
              { key: 'VISUAL_WORKING', label: 'Visual Working' },
            ]
          : [
              { key: 'CAD_ASSIGNED', label: 'CAD Assigned' },
              { key: 'CAD_WORKING', label: 'CAD Working' },
              { key: 'CAD_COMPLETED', label: 'CAD Completed' },
              { key: 'CAD_APPROVED', label: 'CAD Approved' },
            ]

    for (const item of config) {
      const meta = isCadQueue ? CAD_PHASE_STAT_META[item.key] : undefined
      cards.push({
        key: item.key,
        label: meta?.label ?? item.label,
        count: memberFilteredLeads.filter(
          (lead) => lead.subStatus === item.key || lead.stage === item.key,
        ).length,
        Icon: meta?.Icon ?? DEFAULT_STAT_META.Icon,
        className: meta?.className ?? DEFAULT_STAT_META.className,
        iconClassName: meta?.iconClassName ?? DEFAULT_STAT_META.iconClassName,
        accentClassName: meta?.accentClassName ?? DEFAULT_STAT_META.accentClassName,
      })
    }

    return cards
  }, [
    isBudgetQueue,
    isDesignQueue,
    isMeetingQueue,
    isCadQueue,
    memberFilteredLeads,
  ])

  const filteredLeads = useMemo(() => {
    if (activeFilter === 'ALL') return memberFilteredLeads
    return memberFilteredLeads.filter(
      (lead) => lead.subStatus === activeFilter || lead.stage === activeFilter,
    )
  }, [activeFilter, memberFilteredLeads])

  const groupedLeads = useMemo(() => {
    const groups = new Map<string, LeadRecord[]>()
    for (const lead of filteredLeads) {
      const month = formatMonth(lead.latestCompletedVisit?.scheduledAt)
      const groupLeads = groups.get(month) ?? []
      groupLeads.push(lead)
      groups.set(month, groupLeads)
    }
    return Array.from(groups.entries()).map(([month, monthLeads]) => ({
      month,
      leads: monthLeads,
    }))
  }, [filteredLeads])

  const getLeadCardClassName = (lead: LeadRecord) => {
    const bgBorderColors = getCardBgColor(lead.subStatus, lead.stage)
    const base = canDropFromQueue
      ? 'relative overflow-hidden shadow-[0_18px_45px_-28px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:shadow-xl'
      : 'overflow-hidden shadow-sm transition hover:shadow-md'
    return `${base} ${bgBorderColors} hover:border-primary/45`
  }

  const renderLeadActionMenu = (lead: LeadRecord) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={`Actions for ${lead.name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`${leadBasePath}/${lead.id}`}>Open Lead</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openProjectSizeDialog(lead)}>
          {lead.latestCompletedVisit?.projectSqft ? 'Change' : 'Add'} Project Size
        </DropdownMenuItem>
        {showAssigneeReassign &&
        lead.canReassignJrArchitect !== false &&
        lead.stage !== 'DISCOVERY' ? (
          <DropdownMenuItem onClick={() => void openReassign(lead)}>
            Reassign {assigneeLabel}
          </DropdownMenuItem>
        ) : null}
        {isCadQueue ? (
          <DropdownMenuItem onClick={() => void openReassignSrCrm(lead)}>
            Reassign SR CRM
          </DropdownMenuItem>
        ) : null}
        {canDropFromQueue ? (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => openDropDialog(lead)}
          >
            Drop Project
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader title={title} subtitle={subtitle} />

      <main className="mx-auto max-w-[1440px] px-4 py-6">
        <Card className="mb-4 border-border/70">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-[180px] items-center gap-2 text-sm font-semibold text-foreground">
                <ListFilter className="h-4 w-4 text-primary" />
                Filter CAD Queue
              </div>
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by lead name, phone, or location..."
                  className="pl-10"
                />
              </div>
              {isCadQueue ? (
                <div className="w-full sm:w-56">
                  <Select value={activeFilter} onValueChange={setActiveFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by CAD status" />
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
              ) : null}
              {isCadQueue ? (
                <div className="w-full sm:w-56">
                  <Select
                    value={jrArchitectFilter}
                    onValueChange={setJrArchitectFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by JR Architect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_MEMBER_FILTER}>
                        All JR Architects
                      </SelectItem>
                      {jrArchitectFilterOptions.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
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
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-gradient-to-br from-background via-muted/20 to-background p-3 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Queue Intelligence
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Premium snapshot of the active queue and workflow status.
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  Live queue metrics
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {statCards.map((card) => {
                  const Icon = card.Icon
                  const percentage = memberFilteredLeads.length > 0 ? Math.round((card.count / memberFilteredLeads.length) * 100) : 0
                  const isActive = activeFilter === card.key

                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => setActiveFilter(card.key)}
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
                        {card.key === 'ALL' ? 'All leads in view' : 'Share of current queue'}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 flex justify-end gap-2">
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
          >
            <TableIcon className="mr-1 h-4 w-4" />
            Table View
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'card' ? 'default' : 'outline'}
            onClick={() => setViewMode('card')}
          >
            <LayoutGrid className="mr-1 h-4 w-4" />
            Card View
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card py-14">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No leads found.
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <div className="space-y-5">
            {groupedLeads.map((group) => (
              <Card key={group.month}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="text-sm font-semibold">{group.month}</h3>
                    <Badge variant="secondary">{group.leads.length} leads</Badge>
                  </div>
                  <Table className="table-fixed text-sm w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%]">Lead Name</TableHead>
                        <TableHead className="w-[15%]">Stage</TableHead>
                        <TableHead className="w-[18%]">Address</TableHead>
                        <TableHead className="w-[11%]">Visit Date</TableHead>
                        <TableHead className="w-[13%]">
                          {isCadQueue ? 'JR Architect' : isDesignQueue ? '3D Visualizer' : 'Quotation'}
                        </TableHead>
                        <TableHead className="w-[11%]">SR CRM / Visit</TableHead>
                        <TableHead className="w-[10%]">Project Size</TableHead>
                        <TableHead className="w-[7%] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">
                            <button
                              type="button"
                              onClick={() => openRenameDialog(lead)}
                              className="max-w-full truncate text-left hover:text-primary hover:underline font-semibold"
                              title={lead.name}
                            >
                              {lead.name}
                            </button>
                          </TableCell>
                          <TableCell>{stageSubStatusBlock(lead)}</TableCell>
                          <TableCell className="max-w-[200px] overflow-hidden truncate" title={lead.location || 'N/A'}>
                            <span className="text-muted-foreground">
                              {lead.location || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(lead.latestCompletedVisit?.scheduledAt)}</TableCell>
                          <TableCell className="truncate" title={
                            isCadQueue || isDesignQueue
                              ? (lead.jrArchitectAssignment?.user.fullName ?? 'Unassigned')
                              : (lead.quotationAssignment?.user.fullName ?? 'Unassigned')
                          }>
                            {isCadQueue || isDesignQueue
                              ? (lead.jrArchitectAssignment?.user.fullName ?? 'Unassigned')
                              : (lead.quotationAssignment?.user.fullName ?? 'Unassigned')}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => void openReassignSrCrm(lead)}
                              className="max-w-full text-left transition hover:text-primary hover:underline"
                            >
                              {srCrmVisitTeamBlock(lead)}
                            </button>
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => openProjectSizeDialog(lead)}
                              className="text-left transition hover:text-primary hover:underline"
                            >
                              {formatProjectSqft(lead.latestCompletedVisit?.projectSqft)}
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            {renderLeadActionMenu(lead)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isCadQueue ? (
          <div className="space-y-5">
            {groupedLeads.map((group) => (
              <section key={group.month} className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                  <h3 className="text-sm font-semibold">{group.month}</h3>
                  <Badge variant="secondary">{group.leads.length} leads</Badge>
                </div>
                {group.leads.map((lead) => (
              <Card
                key={lead.id}
                className={getLeadCardClassName(lead)}
              >
                {canDropFromQueue ? (
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-rose-400/70 to-amber-400/80" />
                ) : null}
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => openRenameDialog(lead)}
                        className="text-left text-base font-semibold hover:text-primary hover:underline"
                      >
                        {lead.name}
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        {stageSubStatusBlock(lead)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`${leadBasePath}/${lead.id}`}>
                          Open Lead
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openProjectSizeDialog(lead)}
                      >
                        {lead.latestCompletedVisit?.projectSqft ? 'Change' : 'Add'} Project Size
                      </Button>
                      {showAssigneeReassign &&
                      lead.canReassignJrArchitect !== false &&
                      lead.stage !== 'DISCOVERY' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReassign(lead)}
                        >
                          Reassign {assigneeLabel}
                        </Button>
                      ) : null}
                      {isCadQueue ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void openReassignSrCrm(lead)}
                        >
                          Reassign SR CRM
                        </Button>
                      ) : null}
                      {isMeetingQueue ? (
                        lead.canSetMeeting ? (
                          <Button
                            size="sm"
                            onClick={() => openFirstMeetingDialog(lead)}
                          >
                            <CalendarClock className="mr-1 h-4 w-4" />
                            Set Meeting
                          </Button>
                        ) : lead.canSubmitMeetingData ? (
                          <Button
                            size="sm"
                            onClick={() => void openCompleteMeetingDialog(lead)}
                          >
                            <CalendarClock className="mr-1 h-4 w-4" />
                            Complete Meeting
                          </Button>
                        ) : lead.canReassignQuotation ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void openReassignQuotation(lead)}
                          >
                            Reassign Quotation
                          </Button>
                        ) : null
                      ) : isBudgetQueue ? (
                        <>
                          {lead.stage === 'QUOTATION_PHASE' &&
                          lead.canReassignQuotation ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void openReassignQuotation(lead)}
                            >
                              {lead.subStatus === 'QUOTATION_APPROVED' ? 'New Quotation' : 'Reassign Quotation'}
                            </Button>
                          ) : null}
                          {lead.stage === 'QUOTATION_PHASE' &&
                          lead.subStatus === 'QUOTATION_APPROVED' ? (
                            <Button
                              size="sm"
                              onClick={() => openBudgetMeetingDialog(lead)}
                            >
                              <CalendarClock className="mr-1 h-4 w-4" />
                              Set Budget Meeting
                            </Button>
                          ) : lead.stage === 'BUDGET_PHASE' &&
                            lead.subStatus === 'BUDGET_MEETING_SET' ? (
                            <Button
                              size="sm"
                              onClick={() =>
                                void openCompleteMeetingDialog(lead)
                              }
                            >
                              <CalendarClock className="mr-1 h-4 w-4" />
                              Complete Meeting
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                      {canDropFromQueue ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDropDialog(lead)}
                        >
                          Drop Project
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <p className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {lead.phone || 'No phone'}
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Visit Date: {formatDate(lead.latestCompletedVisit?.scheduledAt)}
                    </p>
                    <p className="inline-flex min-w-0 items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate" title={lead.location || 'No location'}>
                        {lead.location || 'No location'}
                      </span>
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" />
                      JR Architect:{' '}
                      {lead.jrArchitectAssignment?.user.fullName ??
                        'Unassigned'}
                    </p>
                    <div className="flex min-w-0 items-start gap-1">
                      <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          SR CRM / Visit Team
                        </span>
                        {isCadQueue ? (
                          <button
                            type="button"
                            onClick={() => void openReassignSrCrm(lead)}
                            className="max-w-full text-left transition hover:text-primary hover:underline"
                          >
                            {srCrmVisitTeamBlock(lead)}
                          </button>
                        ) : (
                          srCrmVisitTeamBlock(lead)
                        )}
                      </div>
                    </div>
                    {isCadQueue ? (
                      <button
                        type="button"
                        onClick={() => openProjectSizeDialog(lead)}
                        className="inline-flex items-center gap-1 text-left transition hover:text-primary hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Project Size: {formatProjectSqft(lead.latestCompletedVisit?.projectSqft)}
                      </button>
                    ) : (
                      <p className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        Project Size: {formatProjectSqft(lead.latestCompletedVisit?.projectSqft)}
                      </p>
                    )}
                    {isMeetingQueue || isBudgetQueue || isDesignQueue ? (
                      <p className="inline-flex items-center gap-1">
                        <UserRound className="h-3.5 w-3.5" />
                        {isDesignQueue ? '3D Visualizer' : 'Quotation'}:{' '}
                        {isDesignQueue
                          ? (lead.jrArchitectAssignment?.user.fullName ??
                            'Unassigned')
                          : (lead.quotationAssignment?.user.fullName ??
                            'Unassigned')}
                      </p>
                    ) : null}
                    {isMeetingQueue && lead.latestFirstMeeting ? (
                      <p className="inline-flex items-center gap-1 md:col-span-2">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Latest First Meeting:{' '}
                        {new Date(
                          lead.latestFirstMeeting.startsAt,
                        ).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <Card
                key={lead.id}
                className={getLeadCardClassName(lead)}
              >
                {canDropFromQueue ? (
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-rose-400/70 to-amber-400/80" />
                ) : null}
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => openRenameDialog(lead)}
                        className="text-left text-base font-semibold hover:text-primary hover:underline"
                      >
                        {lead.name}
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        {stageSubStatusBlock(lead)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`${leadBasePath}/${lead.id}`}>
                          Open Lead
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openProjectSizeDialog(lead)}
                      >
                        {lead.latestCompletedVisit?.projectSqft ? 'Change' : 'Add'} Project Size
                      </Button>
                      {showAssigneeReassign &&
                      lead.canReassignJrArchitect !== false &&
                      lead.stage !== 'DISCOVERY' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReassign(lead)}
                        >
                          Reassign {assigneeLabel}
                        </Button>
                      ) : null}
                      {isCadQueue ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void openReassignSrCrm(lead)}
                        >
                          Reassign SR CRM
                        </Button>
                      ) : null}
                      {isMeetingQueue ? (
                        lead.canSetMeeting ? (
                          <Button
                            size="sm"
                            onClick={() => openFirstMeetingDialog(lead)}
                          >
                            <CalendarClock className="mr-1 h-4 w-4" />
                            Set Meeting
                          </Button>
                        ) : lead.canSubmitMeetingData ? (
                          <Button
                            size="sm"
                            onClick={() => void openCompleteMeetingDialog(lead)}
                          >
                            <CalendarClock className="mr-1 h-4 w-4" />
                            Complete Meeting
                          </Button>
                        ) : lead.canReassignQuotation ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void openReassignQuotation(lead)}
                          >
                            Reassign Quotation
                          </Button>
                        ) : null
                      ) : isBudgetQueue ? (
                        <>
                          {lead.stage === 'QUOTATION_PHASE' &&
                          lead.canReassignQuotation ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void openReassignQuotation(lead)}
                            >
                              {lead.subStatus === 'QUOTATION_APPROVED' ? 'New Quotation' : 'Reassign Quotation'}
                            </Button>
                          ) : null}
                          {lead.stage === 'QUOTATION_PHASE' &&
                          lead.subStatus === 'QUOTATION_APPROVED' ? (
                            <Button
                              size="sm"
                              onClick={() => openBudgetMeetingDialog(lead)}
                            >
                              <CalendarClock className="mr-1 h-4 w-4" />
                              Set Budget Meeting
                            </Button>
                          ) : lead.stage === 'BUDGET_PHASE' &&
                            lead.subStatus === 'BUDGET_MEETING_SET' ? (
                            <Button
                              size="sm"
                              onClick={() =>
                                void openCompleteMeetingDialog(lead)
                              }
                            >
                              <CalendarClock className="mr-1 h-4 w-4" />
                              Complete Meeting
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                      {canDropFromQueue ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDropDialog(lead)}
                        >
                          Drop Project
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <p className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {lead.phone || 'No phone'}
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Visit Date: {formatDate(lead.latestCompletedVisit?.scheduledAt)}
                    </p>
                    <p className="inline-flex min-w-0 items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate" title={lead.location || 'No location'}>
                        {lead.location || 'No location'}
                      </span>
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" />
                      JR Architect:{' '}
                      {lead.jrArchitectAssignment?.user.fullName ??
                        'Unassigned'}
                    </p>
                    <div className="flex min-w-0 items-start gap-1">
                      <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          SR CRM / Visit Team
                        </span>
                        {isCadQueue ? (
                          <button
                            type="button"
                            onClick={() => void openReassignSrCrm(lead)}
                            className="max-w-full text-left transition hover:text-primary hover:underline"
                          >
                            {srCrmVisitTeamBlock(lead)}
                          </button>
                        ) : (
                          srCrmVisitTeamBlock(lead)
                        )}
                      </div>
                    </div>
                    {isCadQueue ? (
                      <button
                        type="button"
                        onClick={() => openProjectSizeDialog(lead)}
                        className="inline-flex items-center gap-1 text-left transition hover:text-primary hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Project Size: {formatProjectSqft(lead.latestCompletedVisit?.projectSqft)}
                      </button>
                    ) : (
                      <p className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        Project Size: {formatProjectSqft(lead.latestCompletedVisit?.projectSqft)}
                      </p>
                    )}
                    {isMeetingQueue || isBudgetQueue || isDesignQueue ? (
                      <p className="inline-flex items-center gap-1">
                        <UserRound className="h-3.5 w-3.5" />
                        {isDesignQueue ? '3D Visualizer' : 'Quotation'}:{' '}
                        {isDesignQueue
                          ? (lead.jrArchitectAssignment?.user.fullName ??
                            'Unassigned')
                          : (lead.quotationAssignment?.user.fullName ??
                            'Unassigned')}
                      </p>
                    ) : null}
                    {isMeetingQueue && lead.latestFirstMeeting ? (
                      <p className="inline-flex items-center gap-1 md:col-span-2">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Latest First Meeting:{' '}
                        {new Date(
                          lead.latestFirstMeeting.startsAt,
                        ).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={projectSizeOpen} onOpenChange={setProjectSizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeLead?.latestCompletedVisit?.projectSqft
                ? 'Change Project Size'
                : 'Add Project Size'}
            </DialogTitle>
            <DialogDescription>
              Update the project size in sqft for this lead&apos;s latest completed
              visit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Project Size (sqft)</Label>
            <Input
              type="number"
              min="1"
              inputMode="decimal"
              value={projectSizeValue}
              onChange={(event) => setProjectSizeValue(event.target.value)}
              placeholder="Enter project size"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProjectSizeOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={saving || !projectSizeValue} onClick={submitProjectSize}>
              Save Project Size
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`Reassign ${assigneeLabel}`}</DialogTitle>
            <DialogDescription>{`Select a new ${assigneeLabel} for this CAD lead.`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{`${assigneeLabel} Member`}</Label>
            <Select
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {memberOptions.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={saving || !selectedMemberId}
              onClick={submitReassign}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {meetingKind === 'FIRST'
                ? 'Set First Meeting'
                : 'Set Budget Meeting'}
            </DialogTitle>
            <DialogDescription>
              {meetingKind === 'FIRST'
                ? 'Creates first meeting and adds it to the Senior CRM calendar.'
                : 'Creates budget meeting and moves lead to Budget Meeting Set.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={meetingAt}
                onChange={(event) => setMeetingAt(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Meeting Type</Label>
              <Select
                value={meetingMode}
                onValueChange={(value) =>
                  setMeetingMode(value as 'ONLINE' | 'OFFLINE')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="OFFLINE">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={3}
                value={meetingNote}
                onChange={(event) => setMeetingNote(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={saving || !meetingAt} onClick={submitMeeting}>
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dropOpen} onOpenChange={setDropOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Drop Project</DialogTitle>
            <DialogDescription>
              Stage is locked to Closed. Select a substatus under Closed to
              continue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Stage</Label>
              <Select value="CLOSED" disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Closed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Substatus</Label>
              <Select value={dropSubStatus} onValueChange={setDropSubStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Closed substatus" />
                </SelectTrigger>
                <SelectContent>
                  {closedSubStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDropOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!dropSubStatus || saving}
              onClick={submitDropProject}
            >
              Confirm Drop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Client Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitRenameLead}
              disabled={saving || !renameValue.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignSrCrmOpen} onOpenChange={setReassignSrCrmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign SR CRM</DialogTitle>
            <DialogDescription>
              Select the Senior CRM who should own this CAD phase lead.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>SR CRM Member</Label>
            <Select value={srCrmMemberId} onValueChange={setSrCrmMemberId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingSrCrmMembers
                      ? 'Loading members...'
                      : srCrmMembers.length === 0
                        ? 'No SR CRM members available'
                        : 'Select SR CRM member'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {srCrmMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={saving || loadingSrCrmMembers || !srCrmMemberId}
              onClick={submitReassignSrCrm}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reassignQuotationOpen}
        onOpenChange={setReassignQuotationOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeLead?.subStatus === 'QUOTATION_APPROVED' ? 'Assign New Quotation' : 'Reassign Quotation'}</DialogTitle>
            <DialogDescription>
              {activeLead?.subStatus === 'QUOTATION_APPROVED'
                ? 'Create a fresh quotation assignment while keeping previous quotation creators and files intact.'
                : 'Select a quotation member for this lead.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Quotation Member</Label>
            <Select
              value={quotationMemberId}
              onValueChange={setQuotationMemberId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingQuotationMembers
                      ? 'Loading members...'
                      : quotationMembers.length === 0
                        ? 'No quotation members available'
                        : 'Select quotation member'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {quotationMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={saving || !quotationMemberId}
              onClick={
                activeLead?.subStatus === 'QUOTATION_APPROVED'
                  ? submitNewQuotation
                  : submitReassignQuotation
              }
            >
              {activeLead?.subStatus === 'QUOTATION_APPROVED' ? 'Assign New Quotation' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeMeetingOpen} onOpenChange={setCompleteMeetingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {completeMeetingLead?.stage === 'BUDGET_PHASE'
                ? 'Complete Budget Meeting'
                : 'Complete First Meeting'}
            </DialogTitle>
            <DialogDescription>
              {completeMeetingLead?.stage === 'BUDGET_PHASE'
                ? 'Complete budget meeting, select client approval, and assign a 3D Visualizer.'
                : 'Complete first meeting and assign quotation member.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {completeMeetingLead?.stage === 'BUDGET_PHASE' ? (
              <>
                <div className="space-y-1">
                  <Label>Client Approval</Label>
                  <Select
                    value={clientApproval}
                    onValueChange={(value) =>
                      setClientApproval(
                        value as
                          | 'DESIGN_AGREEMENT'
                          | 'FITOUT_AGREEMENT'
                          | 'NO_APPROVAL',
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select approval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DESIGN_AGREEMENT">
                        Design Agreement
                      </SelectItem>
                      <SelectItem value="FITOUT_AGREEMENT">
                        Fitout Agreement
                      </SelectItem>
                      <SelectItem value="NO_APPROVAL">No Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {clientApproval !== 'NO_APPROVAL' ? (
                  <div className="space-y-1">
                    <Label>Assign 3D Visualizer</Label>
                    <Select
                      value={visualizerMemberId}
                      onValueChange={setVisualizerMemberId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingVisualizerMembers
                              ? 'Loading members...'
                              : visualizerMembers.length === 0
                                ? 'No 3D Visualizer members available'
                                : 'Select 3D Visualizer'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {visualizerMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="space-y-1">
                <Label>Quotation Member</Label>
                <Select
                  value={quotationMemberId}
                  onValueChange={setQuotationMemberId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingQuotationMembers
                          ? 'Loading members...'
                          : quotationMembers.length === 0
                            ? 'No quotation members available'
                            : 'Select quotation member'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {quotationMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Note (optional)</Label>
              <Textarea
                rows={3}
                value={completeMeetingNote}
                onChange={(event) => setCompleteMeetingNote(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={saving} onClick={submitCompleteMeeting}>
              Complete Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
