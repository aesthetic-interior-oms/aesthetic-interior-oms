'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  CalendarDays,
  Eye,
  MapPin,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

type ScheduledVisit = {
  id: string
  leadId: string
  scheduledAt: string
  location: string
  status: string
  lead: {
    id: string
    name: string
    phone: string
    location: string | null
  }
  assignedTo: { id: string; fullName: string } | null
  supportAssignments?: Array<{ supportUser: { id: string; fullName: string } }>
}

type QueueItem = {
  leadId: string
  leadName: string
  leadPhone: string | null
  leadLocation: string | null
  jrArchitectAssignee: { id: string; fullName: string; email: string } | null
  srCrmAssignee: { id: string; fullName: string; email: string } | null
  latestCompletedVisit: {
    id: string
    scheduledAt: string
    completedAt: string | null
    location: string
    projectSqft: number | null
    projectStatus: string | null
    assignedVisitLead: { id: string; fullName: string } | null
    supportMembers?: Array<{ id: string; fullName: string }>
    summary: string | null
    budgetRange: string | null
    timelineUrgency: string | null
  } | null
  pendingRequests: Array<{
    id: string
    requestedById: string
    requestedByName: string
    requestedByEmail: string
    note: string | null
    createdAt: string
    status: string
  }>
}

type JrArchitectUser = { id: string; fullName: string; email: string }
type DepartmentUser = { id: string; fullName: string; email: string }

type QueueResponse = {
  success: boolean
  data?: QueueItem[]
  jrArchitectUsers?: JrArchitectUser[]
  permissions?: { canView: boolean; canAssign: boolean; canRequest: boolean }
  error?: string
}

type VisitsResponse = {
  success: boolean
  data?: ScheduledVisit[]
  error?: string
}

type DepartmentUsersResponse = {
  success: boolean
  users?: Array<{ id: string; fullName: string; email: string }>
  error?: string
}

export type VisitQueueCalendarProps = {
  title: string
  subtitle: string
  leadHrefPrefix?: string | null
  visitScope?: 'all' | 'default'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function getLocalDateKey(value: string | Date | null): string | null {
  if (!value) return null
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m-1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(value: string | null): string {
  if (!value) return 'N/A'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })
}

function formatLabel(value: string | null | undefined) {
  if (!value) return 'N/A'
  if (value === 'PROPOSAL_SENT') return 'Quotation Sent'
  return value.replace(/_/g,' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

type DayData = {
  dateKey: string
  scheduledVisits: ScheduledVisit[]     // observe-only
  queueItems: QueueItem[]               // actionable (completed, need JR assignment)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VisitQueueCalendar({
  title,
  subtitle,
  leadHrefPrefix = null,
  visitScope = 'all',
}: VisitQueueCalendarProps) {
  const now = new Date()
  const todayKey = getLocalDateKey(now)!

  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // Data
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [scheduledVisits, setScheduledVisits] = useState<ScheduledVisit[]>([])
  const [jrArchitectUsers, setJrArchitectUsers] = useState<JrArchitectUser[]>([])
  const [srCrmUsers, setSrCrmUsers] = useState<DepartmentUser[]>([])
  const [loading, setLoading] = useState(true)

  // Permissions
  const [canAssign, setCanAssign] = useState(false)
  const [canRequest, setCanRequest] = useState(false)

  // Busy state
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null)

  // Dialog: rename
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameLeadId, setRenameLeadId] = useState('')
  const [renameValue, setRenameValue] = useState('')

  // Dialog: SR CRM
  const [srCrmOpen, setSrCrmOpen] = useState(false)
  const [srCrmLeadId, setSrCrmLeadId] = useState('')
  const [srCrmMemberId, setSrCrmMemberId] = useState('')
  const [loadingSrCrmUsers, setLoadingSrCrmUsers] = useState(false)

  // Dialog: drop
  const [dropOpen, setDropOpen] = useState(false)
  const [dropLeadId, setDropLeadId] = useState('')
  const [dropLeadName, setDropLeadName] = useState('')
  const [dropSubStatus, setDropSubStatus] = useState('')

  const closedSubStatusOptions = [
    'PROJECT_DROPPED','REJECTED_OFFER','SMALL_BUDGET',
    'INVALID','NOT_INTERESTED','LOST','DEAD_LEAD',
  ]

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const visitUrl = visitScope === 'all'
        ? '/api/visit-schedule?scope=all&accessContext=queue'
        : '/api/visit-schedule'

      const [queueRes, visitsRes] = await Promise.all([
        fetch('/api/visit-complete-queue', { cache: 'no-store' }),
        fetch(visitUrl, { cache: 'no-store' }),
      ])

      const [queuePayload, visitsPayload] = await Promise.all([
        queueRes.json() as Promise<QueueResponse>,
        visitsRes.json() as Promise<VisitsResponse>,
      ])

      if (!queueRes.ok || !queuePayload.success) throw new Error(queuePayload.error ?? 'Failed to load queue')

      const nextQueue = queuePayload.data ?? []
      setQueueItems(nextQueue)

      // Scheduled visits — only show SCHEDULED status
      const nextVisits = (visitsPayload.data ?? []).filter(v => v.status === 'SCHEDULED')
      setScheduledVisits(nextVisits)

      const canAssignFlag = Boolean(queuePayload.permissions?.canAssign)
      let nextJrUsers = queuePayload.jrArchitectUsers ?? []
      if (canAssignFlag && nextJrUsers.length === 0) {
        const usersRes = await fetch('/api/department/available/JR_ARCHITECT', { cache: 'no-store' })
        const usersPayload = (await usersRes.json()) as DepartmentUsersResponse
        if (usersRes.ok && usersPayload.success && Array.isArray(usersPayload.users)) {
          nextJrUsers = usersPayload.users
        }
      }
      setJrArchitectUsers(nextJrUsers)
      setCanAssign(canAssignFlag)
      setCanRequest(Boolean(queuePayload.permissions?.canRequest))
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to load data')
      setQueueItems([])
      setScheduledVisits([])
    } finally {
      setLoading(false)
    }
  }, [visitScope])

  useEffect(() => { loadData() }, [loadData])

  // ── Build all-day calendar rows for selected month ─────────────────────────

  const daysInMonth = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0).getDate(),
    [viewYear, viewMonth],
  )

  const allDayRows = useMemo<DayData[]>(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const dateKey = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`

      const dayScheduled = scheduledVisits.filter(v => getLocalDateKey(v.scheduledAt) === dateKey)
      const dayQueue = queueItems.filter(q => getLocalDateKey(q.latestCompletedVisit?.scheduledAt ?? null) === dateKey)

      return { dateKey, scheduledVisits: dayScheduled, queueItems: dayQueue }
    })
  }, [daysInMonth, viewYear, viewMonth, scheduledVisits, queueItems])

  // Summary counts for the selected month
  const totalScheduled = useMemo(() => allDayRows.reduce((a, d) => a + d.scheduledVisits.length, 0), [allDayRows])
  const totalQueuePending = useMemo(() => allDayRows.reduce((a, d) => a + d.queueItems.filter(q => !q.jrArchitectAssignee).length, 0), [allDayRows])
  const totalQueueAssigned = useMemo(() => allDayRows.reduce((a, d) => a + d.queueItems.filter(q => !!q.jrArchitectAssignee).length, 0), [allDayRows])

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
    setExpandedDates(new Set())
  }
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
    setExpandedDates(new Set())
  }
  const goToCurrentMonth = () => {
    setViewMonth(now.getMonth()); setViewYear(now.getFullYear())
    setExpandedDates(new Set())
  }

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  const toggleDate = (dateKey: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }

  // ── Queue actions ──────────────────────────────────────────────────────────

  const requestLead = useCallback(async (leadId: string) => {
    setBusyLeadId(leadId)
    try {
      const res = await fetch('/api/visit-complete-queue/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) throw new Error(payload?.error ?? 'Failed to submit request')
      toast.success(payload.message ?? 'Request submitted')
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit request')
    } finally { setBusyLeadId(null) }
  }, [loadData])

  const assignLead = useCallback(async (leadId: string, requestId?: string, assigneeId?: string) => {
    let selectedUserId = assigneeId
    if (!selectedUserId && requestId) {
      for (const item of queueItems) {
        const req = item.pendingRequests.find(r => r.id === requestId)
        if (req) { selectedUserId = req.requestedById; break }
      }
    }
    if (!selectedUserId) { toast.error('Select a JR Architect first'); return }

    setBusyLeadId(leadId)
    try {
      const res = await fetch('/api/visit-complete-queue/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, jrArchitectUserId: selectedUserId, requestId: requestId ?? null }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) throw new Error(payload?.error ?? 'Failed to assign JR Architect')
      toast.success(payload.message ?? 'JR Architect assigned')
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign JR Architect')
    } finally { setBusyLeadId(null) }
  }, [queueItems, loadData])

  const loadSrCrmUsers = async () => {
    if (srCrmUsers.length > 0) return
    setLoadingSrCrmUsers(true)
    try {
      const res = await fetch('/api/department/available/SR_CRM', { cache: 'no-store' })
      const payload = (await res.json()) as DepartmentUsersResponse
      if (!res.ok || !payload.success) throw new Error(payload.error ?? 'Failed to load SR CRM members')
      setSrCrmUsers(Array.isArray(payload.users) ? payload.users : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load SR CRM members')
    } finally { setLoadingSrCrmUsers(false) }
  }

  const openSrCrmDialog = async (item: QueueItem) => {
    setSrCrmLeadId(item.leadId)
    setSrCrmMemberId(item.srCrmAssignee?.id ?? '')
    setSrCrmOpen(true)
    await loadSrCrmUsers()
  }

  const submitSrCrmChange = async () => {
    if (!srCrmLeadId || !srCrmMemberId) return
    setBusyLeadId(srCrmLeadId)
    try {
      const res = await fetch(`/api/lead/${srCrmLeadId}/assignments/SR_CRM`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: srCrmMemberId }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) throw new Error(payload?.error ?? 'Failed to update SR CRM')
      toast.success('SR CRM updated')
      setSrCrmOpen(false); setSrCrmLeadId('')
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update SR CRM')
    } finally { setBusyLeadId(null) }
  }

  const openRenameDialog = (leadId: string, currentName: string) => {
    setRenameLeadId(leadId); setRenameValue(currentName); setRenameOpen(true)
  }
  const openDropDialog = (leadId: string, leadName: string) => {
    setDropLeadId(leadId); setDropLeadName(leadName); setDropSubStatus(''); setDropOpen(true)
  }

  const submitDropProject = async () => {
    if (!dropLeadId || !dropSubStatus) return
    setBusyLeadId(dropLeadId)
    try {
      const res = await fetch(`/api/lead/${dropLeadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'CLOSED', subStatus: dropSubStatus, reason: 'Project dropped from Visit Queue.' }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) throw new Error(payload?.error ?? 'Failed to drop project')
      toast.success('Project moved to Closed')
      setDropOpen(false); setDropLeadId(''); setDropLeadName('')
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to drop project')
    } finally { setBusyLeadId(null) }
  }

  const submitRenameLead = async () => {
    if (!renameLeadId || !renameValue.trim()) return
    setBusyLeadId(renameLeadId)
    try {
      const res = await fetch(`/api/lead/${renameLeadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) throw new Error(payload?.error ?? 'Failed to update lead name')
      toast.success('Lead name updated')
      setRenameOpen(false)
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update lead name')
    } finally { setBusyLeadId(null) }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderScheduledVisitCard = (visit: ScheduledVisit) => {
    const location = visit.location || visit.lead?.location || 'N/A'
    const supportNames = (visit.supportAssignments ?? []).map(s => s.supportUser.fullName)
    return (
      <div
        key={visit.id}
        className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:gap-5 sm:flex-wrap">
          {/* Client + observe badge */}
          <div className="min-w-[160px]">
            {leadHrefPrefix ? (
              <Link
                href={`${leadHrefPrefix}/${visit.leadId}`}
                className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
              >
                {visit.lead.name}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-foreground">{visit.lead.name}</span>
            )}
            <div className="mt-1">
              <Badge variant="secondary" className="text-xs text-blue-700 bg-blue-100 border-blue-200">
                <Eye className="mr-1 h-3 w-3" />
                Scheduled
              </Badge>
            </div>
          </div>

          {/* Time */}
          <div className="min-w-[80px]">
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="text-sm font-medium text-foreground">{formatTime(visit.scheduledAt)}</p>
          </div>

          {/* Location */}
          <div className="min-w-[140px]">
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="flex items-center gap-1 text-sm text-foreground truncate max-w-[200px]" title={location}>
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
              {location}
            </p>
          </div>

          {/* Visit lead */}
          <div className="min-w-[140px]">
            <p className="text-xs text-muted-foreground">Visit Lead</p>
            <p className="flex items-center gap-1 text-sm text-foreground">
              <User className="h-3 w-3 shrink-0 text-muted-foreground" />
              {visit.assignedTo?.fullName ?? 'Unassigned'}
            </p>
            {supportNames.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                Support: {supportNames.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Observe-only label */}
        <div className="flex shrink-0 items-center">
          <span className="text-xs text-muted-foreground italic">Observe only</span>
        </div>
      </div>
    )
  }

  const renderQueueItemCard = (item: QueueItem) => {
    const visitLead = item.latestCompletedVisit?.assignedVisitLead
    const supportMembers = item.latestCompletedVisit?.supportMembers ?? []
    const location = item.latestCompletedVisit?.location ?? item.leadLocation ?? 'N/A'
    const isAssigned = Boolean(item.jrArchitectAssignee)

    return (
      <div
        key={item.leadId}
        className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:gap-5 sm:flex-wrap">
          {/* Client name + status */}
          <div className="min-w-[160px]">
            <button
              type="button"
              onClick={() => openRenameDialog(item.leadId, item.leadName)}
              className="text-left text-sm font-semibold text-foreground transition hover:text-primary hover:underline"
            >
              {item.leadName}
            </button>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <Badge variant="secondary" className="text-xs text-emerald-700 bg-emerald-100 border-emerald-200">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Visit Completed
              </Badge>
              {isAssigned ? (
                <Badge variant="secondary" className="text-xs text-indigo-700 bg-indigo-50 border-indigo-200">
                  JR: {item.jrArchitectAssignee?.fullName}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs text-amber-700 bg-amber-50 border-amber-200">
                  <Clock className="mr-1 h-3 w-3" />
                  Needs JR
                </Badge>
              )}
            </div>
          </div>

          {/* Completed date */}
          <div className="min-w-[100px]">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-sm text-foreground">{formatDate(item.latestCompletedVisit?.completedAt ?? null)}</p>
          </div>

          {/* Location */}
          <div className="min-w-[140px]">
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="flex items-center gap-1 text-sm text-foreground truncate max-w-[200px]" title={location}>
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
              {location}
            </p>
          </div>

          {/* Visit lead */}
          <div className="min-w-[140px]">
            <p className="text-xs text-muted-foreground">Visit Lead</p>
            <p className="text-sm text-foreground">{visitLead?.fullName ?? 'N/A'}</p>
            {supportMembers.length > 0 && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {supportMembers.map(m => m.fullName).join(', ')}
              </p>
            )}
          </div>

          {/* SR CRM */}
          <div className="min-w-[120px]">
            <p className="text-xs text-muted-foreground">SR CRM</p>
            <button
              type="button"
              onClick={() => void openSrCrmDialog(item)}
              className="text-sm font-medium text-foreground transition hover:text-primary hover:underline text-left"
            >
              {item.srCrmAssignee?.fullName ?? 'Unassigned'}
            </button>
          </div>
        </div>

        {/* Actions dropdown */}
        <div className="flex shrink-0 items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={busyLeadId === item.leadId}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{item.leadName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {leadHrefPrefix ? (
                <DropdownMenuItem asChild>
                  <Link href={`${leadHrefPrefix}/${item.leadId}`}>Open Lead</Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => openRenameDialog(item.leadId, item.leadName)}>
                Change Client Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void openSrCrmDialog(item)}>
                Change SR CRM
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => openDropDialog(item.leadId, item.leadName)}
              >
                Drop Project
              </DropdownMenuItem>
              {canRequest ? (
                <DropdownMenuItem
                  disabled={Boolean(item.jrArchitectAssignee)}
                  onClick={() => requestLead(item.leadId)}
                >
                  {item.jrArchitectAssignee ? 'Already Assigned' : 'Request to Work'}
                </DropdownMenuItem>
              ) : null}
              {canAssign ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Assign JR Architect</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56">
                      {jrArchitectUsers.length > 0
                        ? jrArchitectUsers.map(user => (
                          <DropdownMenuItem key={user.id} onClick={() => assignLead(item.leadId, undefined, user.id)}>
                            {user.fullName}
                          </DropdownMenuItem>
                        ))
                        : <DropdownMenuItem disabled>No JR Architects</DropdownMenuItem>}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {item.pendingRequests.length > 0 ? (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Approve Request</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        {item.pendingRequests.map(req => (
                          <DropdownMenuItem key={req.id} onClick={() => assignLead(item.leadId, req.id)}>
                            {req.requestedByName}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ) : null}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader title={title} subtitle={subtitle} />

      <main className="mx-auto max-w-[1440px] px-4 py-6 space-y-4 sm:px-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Month navigation */}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={goToPrevMonth} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[160px] text-center">
                  <CardTitle className="text-lg font-semibold">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </CardTitle>
                </div>
                <Button variant="outline" size="icon" onClick={goToNextMonth} aria-label="Next month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {!isCurrentMonth && (
                  <Button variant="ghost" size="sm" onClick={goToCurrentMonth} className="text-xs text-muted-foreground">
                    Today
                  </Button>
                )}
              </div>

              {/* Summary */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>{daysInMonth} days</span>
                </div>
                <Badge variant="secondary" className="text-blue-700 bg-blue-50 border-blue-200">
                  <Eye className="mr-1 h-3 w-3" />
                  {totalScheduled} scheduled
                </Badge>
                <Badge variant="secondary" className="text-amber-700 bg-amber-50 border-amber-200">
                  <Clock className="mr-1 h-3 w-3" />
                  {totalQueuePending} needs JR
                </Badge>
                <Badge variant="secondary" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {totalQueueAssigned} assigned
                </Badge>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-blue-200 border border-blue-300" />
                Scheduled visit (observe only — not completed yet)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-emerald-200 border border-emerald-300" />
                Visit completed (action required — assign JR Architect)
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 bg-muted/20">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-card border" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {allDayRows.map(day => {
                  const isToday = day.dateKey === todayKey
                  const hasData = day.scheduledVisits.length > 0 || day.queueItems.length > 0
                  const isExpanded = expandedDates.has(day.dateKey)
                  const pendingQueue = day.queueItems.filter(q => !q.jrArchitectAssignee).length
                  const assignedQueue = day.queueItems.filter(q => !!q.jrArchitectAssignee).length

                  const [y, m, d] = day.dateKey.split('-').map(Number)
                  const dateObj = new Date(y, m - 1, d)
                  const formattedDate = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                  const formattedDay = dateObj.toLocaleDateString('en-US', { weekday: 'short' })

                  return (
                    <div 
                      key={day.dateKey}
                      className={`rounded-xl border bg-card transition-all overflow-hidden ${
                        isToday ? 'border-primary shadow-sm' : 'border-border/60 hover:border-border'
                      }`}
                    >
                      {/* Day row (Clickable Header) */}
                      <button
                        type="button"
                        onClick={() => hasData && toggleDate(day.dateKey)}
                        className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:px-6 sm:py-5 text-left focus-visible:outline-none transition-colors ${
                          hasData ? 'hover:bg-muted/40 cursor-pointer' : 'cursor-default opacity-80'
                        }`}
                        aria-expanded={isExpanded}
                        disabled={!hasData}
                      >
                        {/* Left side: Date stack */}
                        <div className="flex flex-col gap-1 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <span className={`text-base font-bold tracking-tight ${isToday ? 'text-primary' : 'text-foreground'}`}>
                              {formattedDate}
                            </span>
                            {isToday && (
                              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">TODAY</Badge>
                            )}
                          </div>
                          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                            {formattedDay}
                          </span>
                          
                          {/* "No visits" exactly as requested */}
                          {!hasData && (
                            <span className="text-sm text-muted-foreground/70 mt-0.5">
                              No visits
                            </span>
                          )}
                        </div>

                        {/* Right side: Status badges & chevron */}
                        <div className="flex items-center gap-3 self-start sm:self-center">
                          {hasData && (
                            <div className="flex flex-wrap items-center gap-2">
                              {day.scheduledVisits.length > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/80 px-3 py-1 text-xs font-semibold text-blue-800">
                                  <Eye className="h-3.5 w-3.5" />
                                  {day.scheduledVisits.length} scheduled
                                </span>
                              )}
                              {pendingQueue > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-800">
                                  <Clock className="h-3.5 w-3.5" />
                                  {pendingQueue} needs JR
                                </span>
                              )}
                              {assignedQueue > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-semibold text-emerald-800">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {assignedQueue} assigned
                                </span>
                              )}
                            </div>
                          )}
                          
                          {hasData && (
                            <div className="ml-2 bg-background p-1.5 rounded-full border shadow-sm group-hover:bg-muted transition-colors">
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-foreground" /> : <ChevronDown className="h-4 w-4 text-foreground" />}
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && hasData && (
                        <div className="border-t border-border/60 bg-muted/10 p-5 sm:p-6 space-y-5">
                          {/* Scheduled visits section */}
                          {day.scheduledVisits.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-blue-700/80">
                                Scheduled Visits (Observe Only) — {day.scheduledVisits.length}
                              </h4>
                              <div className="grid gap-3">
                                {day.scheduledVisits.map(v => renderScheduledVisitCard(v))}
                              </div>
                            </div>
                          )}

                          {/* Queue items section */}
                          {day.queueItems.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700/80">
                                Visit Completed (Action Required) — {day.queueItems.length}
                              </h4>
                              <div className="grid gap-3">
                                {day.queueItems.map(q => renderQueueItemCard(q))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Drop dialog */}
      <Dialog open={dropOpen} onOpenChange={setDropOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Drop Project</DialogTitle>
            <DialogDescription>
              Move {dropLeadName || 'this lead'} to Closed. Select the Closed substatus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Stage</Label>
              <Select value="CLOSED" disabled>
                <SelectTrigger><SelectValue placeholder="Closed" /></SelectTrigger>
                <SelectContent><SelectItem value="CLOSED">Closed</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Substatus</Label>
              <Select value={dropSubStatus} onValueChange={setDropSubStatus}>
                <SelectTrigger><SelectValue placeholder="Select substatus" /></SelectTrigger>
                <SelectContent>
                  {closedSubStatusOptions.map(s => (
                    <SelectItem key={s} value={s}>{formatLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDropOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDropProject} disabled={!dropSubStatus || busyLeadId === dropLeadId}>
              Confirm Drop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SR CRM dialog */}
      <Dialog open={srCrmOpen} onOpenChange={setSrCrmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change SR CRM</DialogTitle>
            <DialogDescription>Select the Senior CRM for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>SR CRM Member</Label>
            <Select value={srCrmMemberId} onValueChange={setSrCrmMemberId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingSrCrmUsers ? 'Loading...' : 'Select SR CRM member'} />
              </SelectTrigger>
              <SelectContent>
                {srCrmUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSrCrmOpen(false)}>Cancel</Button>
            <Button onClick={submitSrCrmChange} disabled={loadingSrCrmUsers || !srCrmMemberId || busyLeadId === srCrmLeadId}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Client Name</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={submitRenameLead} disabled={!renameValue.trim() || busyLeadId === renameLeadId}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
