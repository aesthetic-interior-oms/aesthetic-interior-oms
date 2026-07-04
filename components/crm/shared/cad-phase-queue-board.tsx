'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  LayoutGrid,
  Loader2,
  MapPin,
  MoreHorizontal,
  Phone,
  Search,
  TableIcon,
  UserRound,
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
type DepartmentUsersResponse = {
  success: boolean
  users?: DepartmentUser[]
  error?: string
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
      return 'border-border bg-muted text-muted-foreground'
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
}: {
  title: string
  subtitle: string
  leadBasePath: string
  queueType?: 'cad' | 'meeting' | 'budget' | 'design'
  queueEndpoint?: string
  assigneeDepartment?: string
  assigneeLabel?: string
  showAssigneeReassign?: boolean
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
  const [quotationMemberId, setQuotationMemberId] = useState('')
  const [visualizerMemberId, setVisualizerMemberId] = useState('')
  const [loadingQuotationMembers, setLoadingQuotationMembers] = useState(false)
  const [loadingVisualizerMembers, setLoadingVisualizerMembers] =
    useState(false)
  const [reassignQuotationOpen, setReassignQuotationOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('ALL')
  const [jrArchitectFilter, setJrArchitectFilter] = useState(ALL_MEMBER_FILTER)
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
    setQuotationMemberId(lead.quotationAssignment?.user.id ?? '')
    setReassignQuotationOpen(true)
    await loadQuotationMembers()
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
          reason: 'Project dropped from CAD Queue.',
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
    if (!isCadQueue || jrArchitectFilter === ALL_MEMBER_FILTER) return leads
    return leads.filter(
      (lead) => lead.jrArchitectAssignment?.user.id === jrArchitectFilter,
    )
  }, [isCadQueue, jrArchitectFilter, leads])

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

  const statCards = useMemo(() => {
    const cards: Array<{ key: string; label: string; count: number }> = [
      { key: 'ALL', label: 'Total', count: memberFilteredLeads.length },
    ]
    const config = isMeetingQueue
      ? [
          { key: 'CAD_APPROVED', label: 'CAD Approved' },
          { key: 'FIRST_MEETING_SET', label: 'Meeting Set' },
          { key: 'PROPOSAL_SENT', label: 'Proposal Sent' },
        ]
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
      cards.push({
        key: item.key,
        label: item.label,
        count: memberFilteredLeads.filter(
          (lead) => lead.subStatus === item.key || lead.stage === item.key,
        ).length,
      })
    }

    return cards
  }, [
    isBudgetQueue,
    isDesignQueue,
    isMeetingQueue,
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by lead name, phone, or location..."
              className="pl-10"
            />
          </div>
          {isCadQueue ? (
            <div className="w-full sm:w-64">
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
          <div className="flex flex-wrap gap-2">
            {statCards.map((card) => (
              <Button
                key={card.key}
                size="sm"
                variant={activeFilter === card.key ? 'default' : 'outline'}
                onClick={() => setActiveFilter(card.key)}
                className="h-8"
              >
                {card.label}: {card.count}
              </Button>
            ))}
          </div>
        </div>

        {isCadQueue ? (
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
        ) : null}

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
        ) : isCadQueue && viewMode === 'table' ? (
          <div className="space-y-5">
            {groupedLeads.map((group) => (
              <Card key={group.month}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="text-sm font-semibold">{group.month}</h3>
                    <Badge variant="secondary">{group.leads.length} leads</Badge>
                  </div>
                  <Table className="table-fixed text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%]">Lead Name</TableHead>
                        <TableHead className="w-[15%]">Stage</TableHead>
                        <TableHead className="w-[18%]">Address</TableHead>
                        <TableHead className="w-[11%]">Visit Date</TableHead>
                        <TableHead className="w-[13%]">JR Architect</TableHead>
                        <TableHead className="w-[11%]">SR CRM</TableHead>
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
                              className="max-w-full truncate text-left hover:text-primary hover:underline"
                              title={lead.name}
                            >
                              {lead.name}
                            </button>
                          </TableCell>
                          <TableCell>{stageSubStatusBlock(lead)}</TableCell>
                          <TableCell>
                            <span
                              className="block max-w-[220px] truncate text-muted-foreground"
                              title={lead.location || 'N/A'}
                            >
                              {lead.location || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(lead.latestCompletedVisit?.scheduledAt)}</TableCell>
                          <TableCell className="truncate" title={lead.jrArchitectAssignment?.user.fullName ?? 'Unassigned'}>
                            {lead.jrArchitectAssignment?.user.fullName ?? 'Unassigned'}
                          </TableCell>
                          <TableCell className="truncate" title={lead.srCrmAssignment?.user.fullName ?? 'Unassigned'}>
                            {lead.srCrmAssignment?.user.fullName ?? 'Unassigned'}
                          </TableCell>
                          <TableCell>
                            {formatProjectSqft(lead.latestCompletedVisit?.projectSqft)}
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
                className="overflow-hidden border-border/70 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
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
                              Reassign Quotation
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
                      {isDesignQueue ? null : isCadQueue ? (
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
                    <p className="inline-flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" />
                      SR CRM:{' '}
                      {lead.srCrmAssignment?.user.fullName ?? 'Unassigned'}
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" />
                      Visit Team: {visitTeamLabel(lead.latestCompletedVisit)}
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Project Size: {formatProjectSqft(lead.latestCompletedVisit?.projectSqft)}
                    </p>
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
                className="overflow-hidden border-border/70 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
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
                              Reassign Quotation
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
                      {isDesignQueue ? null : isCadQueue ? (
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
                        {srCrmVisitTeamBlock(lead)}
                      </div>
                    </div>
                    <p className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Project Size: {formatProjectSqft(lead.latestCompletedVisit?.projectSqft)}
                    </p>
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
                className="overflow-hidden border-border/70 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
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
                              Reassign Quotation
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
                      {isDesignQueue ? null : isCadQueue ? (
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
                        {srCrmVisitTeamBlock(lead)}
                      </div>
                    </div>
                    <p className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Project Size: {formatProjectSqft(lead.latestCompletedVisit?.projectSqft)}
                    </p>
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

      <Dialog
        open={reassignQuotationOpen}
        onOpenChange={setReassignQuotationOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Quotation</DialogTitle>
            <DialogDescription>
              Select a quotation member for this lead.
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
              onClick={submitReassignQuotation}
            >
              Save
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
