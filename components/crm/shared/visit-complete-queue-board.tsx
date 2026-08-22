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

type QueueItem = {
  leadId: string
  leadName: string
  leadPhone: string | null
  leadLocation: string | null
  stage: string
  subStatus: string | null
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

type JrArchitectUser = {
  id: string
  fullName: string
  email: string
}

type DepartmentUser = {
  id: string
  fullName: string
  email: string
}

type QueueResponse = {
  success: boolean
  data?: QueueItem[]
  jrArchitectUsers?: JrArchitectUser[]
  permissions?: {
    canView: boolean
    canAssign: boolean
    canRequest: boolean
    isJrArchitectureLeader?: boolean
  }
  error?: string
}

type DepartmentUsersResponse = {
  success: boolean
  users?: Array<{ id: string; fullName: string; email: string }>
  error?: string
}

type VisitCompleteQueueBoardProps = {
  title: string
  subtitle: string
  leadHrefPrefix?: string | null
}

function formatLabel(value: string | null | undefined) {
  if (!value) return 'N/A'
  if (value === 'PROPOSAL_SENT') return 'Quotation Sent'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value: string | null): string {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getDateKey(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type DateGroup = {
  dateKey: string
  items: QueueItem[]
  pendingCount: number
  assignedCount: number
}

export function VisitCompleteQueueBoard({
  title,
  subtitle,
  leadHrefPrefix = null,
}: VisitCompleteQueueBoardProps) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<QueueItem[]>([])
  const [jrArchitectUsers, setJrArchitectUsers] = useState<JrArchitectUser[]>([])
  const [srCrmUsers, setSrCrmUsers] = useState<DepartmentUser[]>([])
  const [canAssign, setCanAssign] = useState(false)
  const [canRequest, setCanRequest] = useState(false)
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameLeadId, setRenameLeadId] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [srCrmOpen, setSrCrmOpen] = useState(false)
  const [srCrmLeadId, setSrCrmLeadId] = useState('')
  const [srCrmMemberId, setSrCrmMemberId] = useState('')
  const [loadingSrCrmUsers, setLoadingSrCrmUsers] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [dropLeadId, setDropLeadId] = useState('')
  const [dropLeadName, setDropLeadName] = useState('')
  const [dropSubStatus, setDropSubStatus] = useState('')

  const closedSubStatusOptions = [
    'PROJECT_DROPPED',
    'REJECTED_OFFER',
    'SMALL_BUDGET',
    'INVALID',
    'NOT_INTERESTED',
    'LOST',
    'DEAD_LEAD',
  ]

  const loadQueue = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/visit-complete-queue', { cache: 'no-store' })
      const payload = (await response.json()) as QueueResponse
      if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
        throw new Error(payload.error ?? 'Failed to load queue')
      }

      setItems(payload.data)
      const canAssignFlag = Boolean(payload.permissions?.canAssign)
      let nextJrArchitectUsers = payload.jrArchitectUsers ?? []
      if (canAssignFlag && nextJrArchitectUsers.length === 0) {
        const usersResponse = await fetch('/api/department/available/JR_ARCHITECT', {
          cache: 'no-store',
        })
        const usersPayload = (await usersResponse.json()) as DepartmentUsersResponse
        if (usersResponse.ok && usersPayload.success && Array.isArray(usersPayload.users)) {
          nextJrArchitectUsers = usersPayload.users
        }
      }

      setJrArchitectUsers(nextJrArchitectUsers)
      setCanAssign(canAssignFlag)
      setCanRequest(Boolean(payload.permissions?.canRequest))
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to load queue')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const dateGroups = useMemo<DateGroup[]>(() => {
    const map = new Map<string, QueueItem[]>()

    for (const item of items) {
      const dateKey = getDateKey(item.latestCompletedVisit?.scheduledAt ?? null)
      if (!dateKey) {
        const key = 'no-date'
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(item)
        continue
      }
      const [year, month] = dateKey.split('-').map(Number)
      if (year !== viewYear || month - 1 !== viewMonth) continue
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(item)
    }

    const sortedKeys = Array.from(map.keys())
      .filter(k => k !== 'no-date')
      .sort((a, b) => b.localeCompare(a))

    const groups: DateGroup[] = sortedKeys.map((dateKey) => {
      const dayItems = map.get(dateKey)!
      return {
        dateKey,
        items: dayItems,
        pendingCount: dayItems.filter(i => !i.jrArchitectAssignee).length,
        assignedCount: dayItems.filter(i => !!i.jrArchitectAssignee).length,
      }
    })

    const noDateItems = map.get('no-date')
    if (noDateItems && noDateItems.length > 0) {
      groups.push({
        dateKey: 'no-date',
        items: noDateItems,
        pendingCount: noDateItems.filter(i => !i.jrArchitectAssignee).length,
        assignedCount: noDateItems.filter(i => !!i.jrArchitectAssignee).length,
      })
    }

    return groups
  }, [items, viewMonth, viewYear])

  const totalInView = useMemo(() => dateGroups.reduce((acc, g) => acc + g.items.length, 0), [dateGroups])
  const totalPending = useMemo(() => dateGroups.reduce((acc, g) => acc + g.pendingCount, 0), [dateGroups])
  const totalAssigned = useMemo(() => dateGroups.reduce((acc, g) => acc + g.assignedCount, 0), [dateGroups])

  const toggleDate = (dateKey: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }

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
    const n = new Date()
    setViewMonth(n.getMonth())
    setViewYear(n.getFullYear())
    setExpandedDates(new Set())
  }

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  const requestLead = useCallback(async (leadId: string) => {
    setBusyLeadId(leadId)
    try {
      const response = await fetch('/api/visit-complete-queue/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Failed to submit request')
      toast.success(payload.message ?? 'Request submitted')
      await loadQueue()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit request')
    } finally {
      setBusyLeadId(null)
    }
  }, [loadQueue])

  const assignLead = useCallback(async (leadId: string, requestId?: string, assigneeId?: string) => {
    let selectedUserId = assigneeId
    if (!selectedUserId && requestId) {
      for (const item of items) {
        const req = item.pendingRequests.find(r => r.id === requestId)
        if (req) { selectedUserId = req.requestedById; break }
      }
    }
    if (!selectedUserId) { toast.error('Select a JR Architect first'); return }

    setBusyLeadId(leadId)
    try {
      const response = await fetch('/api/visit-complete-queue/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, jrArchitectUserId: selectedUserId, requestId: requestId ?? null }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Failed to assign JR Architect')
      toast.success(payload.message ?? 'JR Architect assigned')
      await loadQueue()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign JR Architect')
    } finally {
      setBusyLeadId(null)
    }
  }, [items, loadQueue])

  const loadSrCrmUsers = async () => {
    if (srCrmUsers.length > 0) return
    setLoadingSrCrmUsers(true)
    try {
      const response = await fetch('/api/department/available/SR_CRM', { cache: 'no-store' })
      const payload = (await response.json()) as DepartmentUsersResponse
      if (!response.ok || !payload.success) throw new Error(payload.error ?? 'Failed to load SR CRM members')
      setSrCrmUsers(Array.isArray(payload.users) ? payload.users : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load SR CRM members')
    } finally {
      setLoadingSrCrmUsers(false)
    }
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
      const response = await fetch(`/api/lead/${srCrmLeadId}/assignments/SR_CRM`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: srCrmMemberId }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Failed to update SR CRM')
      toast.success('SR CRM updated')
      setSrCrmOpen(false)
      setSrCrmLeadId('')
      await loadQueue()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update SR CRM')
    } finally {
      setBusyLeadId(null)
    }
  }

  const openRenameDialog = (leadId: string, currentName: string) => {
    setRenameLeadId(leadId)
    setRenameValue(currentName)
    setRenameOpen(true)
  }

  const openDropDialog = (leadId: string, leadName: string) => {
    setDropLeadId(leadId)
    setDropLeadName(leadName)
    setDropSubStatus('')
    setDropOpen(true)
  }

  const submitDropProject = async () => {
    if (!dropLeadId || !dropSubStatus) return
    setBusyLeadId(dropLeadId)
    try {
      const response = await fetch(`/api/lead/${dropLeadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'CLOSED', subStatus: dropSubStatus, reason: 'Project dropped from Visit Complete Queue.' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Failed to drop project')
      toast.success('Project moved to Closed')
      setDropOpen(false)
      setDropLeadId('')
      setDropLeadName('')
      await loadQueue()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to drop project')
    } finally {
      setBusyLeadId(null)
    }
  }

  const submitRenameLead = async () => {
    if (!renameLeadId || !renameValue.trim()) return
    setBusyLeadId(renameLeadId)
    try {
      const response = await fetch(`/api/lead/${renameLeadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Failed to update lead name')
      toast.success('Lead name updated')
      setRenameOpen(false)
      await loadQueue()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update lead name')
    } finally {
      setBusyLeadId(null)
    }
  }

  const renderItemRow = (item: QueueItem) => {
    const visitLead = item.latestCompletedVisit?.assignedVisitLead
    const supportMembers = item.latestCompletedVisit?.supportMembers ?? []
    const location = item.latestCompletedVisit?.location ?? item.leadLocation ?? 'N/A'
    const isAssigned = Boolean(item.jrArchitectAssignee)

    return (
      <div
        key={item.leadId}
        className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:gap-5 sm:flex-wrap">
          <div className="min-w-[160px]">
            <button
              type="button"
              onClick={() => openRenameDialog(item.leadId, item.leadName)}
              className="text-left text-sm font-semibold text-foreground transition hover:text-primary hover:underline"
            >
              {item.leadName}
            </button>
            <div className="mt-1">
              {isAssigned ? (
                <Badge variant="secondary" className="text-xs text-emerald-700 bg-emerald-50 border-emerald-200">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Assigned
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs text-amber-700 bg-amber-50 border-amber-200">
                  <Clock className="mr-1 h-3 w-3" />
                  Pending
                </Badge>
              )}
            </div>
          </div>

          <div className="min-w-[140px]">
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="text-sm text-foreground truncate max-w-[200px]" title={location}>{location}</p>
          </div>

          <div className="min-w-[140px]">
            <p className="text-xs text-muted-foreground">Visit Lead</p>
            <p className="text-sm text-foreground">{visitLead?.fullName ?? 'N/A'}</p>
            {supportMembers.length > 0 && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {supportMembers.map(m => m.fullName).join(', ')}
              </p>
            )}
          </div>

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

          <div className="min-w-[120px]">
            <p className="text-xs text-muted-foreground">JR Architect</p>
            <p className="text-sm text-foreground">{item.jrArchitectAssignee?.fullName ?? '—'}</p>
          </div>

          <div className="min-w-[100px]">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-sm text-foreground">{formatDate(item.latestCompletedVisit?.completedAt ?? null)}</p>
          </div>
        </div>

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
                      {jrArchitectUsers.length > 0 ? jrArchitectUsers.map((user) => (
                        <DropdownMenuItem
                          key={user.id}
                          onClick={() => assignLead(item.leadId, undefined, user.id)}
                        >
                          {user.fullName}
                        </DropdownMenuItem>
                      )) : (
                        <DropdownMenuItem disabled>No JR Architects</DropdownMenuItem>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {item.pendingRequests.length > 0 ? (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Approve Request</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        {item.pendingRequests.map((request) => (
                          <DropdownMenuItem
                            key={request.id}
                            onClick={() => assignLead(item.leadId, request.id)}
                          >
                            {request.requestedByName}
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

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader title={title} subtitle={subtitle} />

      <main className="mx-auto max-w-[1440px] px-4 py-6 space-y-4 sm:px-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={goToPrevMonth} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center min-w-[160px]">
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

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>{totalInView} total</span>
                </div>
                <Badge variant="secondary" className="text-amber-700 bg-amber-50 border-amber-200">
                  <Clock className="mr-1 h-3 w-3" />
                  {totalPending} pending
                </Badge>
                <Badge variant="secondary" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {totalAssigned} assigned
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : null}

            {!loading && dateGroups.length === 0 ? (
              <div className="m-6 rounded-lg border border-dashed p-8 text-center">
                <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  No completed visits in {MONTH_NAMES[viewMonth]} {viewYear}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try navigating to a different month or check back later.
                </p>
              </div>
            ) : null}

            {!loading && dateGroups.length > 0 ? (
              <div className="divide-y divide-border">
                {dateGroups.map((group) => {
                  const isExpanded = expandedDates.has(group.dateKey)
                  const todayKey = getDateKey(new Date().toISOString())
                  const isToday = group.dateKey === todayKey

                  return (
                    <div key={group.dateKey}>
                      <button
                        type="button"
                        onClick={() => toggleDate(group.dateKey)}
                        className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                            {group.dateKey === 'no-date' ? 'No Visit Date' : formatDayLabel(group.dateKey)}
                          </span>
                          {isToday && (
                            <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              Today
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {group.pendingCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                              <Clock className="h-3 w-3" />
                              {group.pendingCount} pending
                            </span>
                          )}
                          {group.assignedCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              {group.assignedCount} assigned
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {group.items.length} visit{group.items.length !== 1 ? 's' : ''}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2">
                          {group.items.map(item => renderItemRow(item))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>

      <Dialog open={dropOpen} onOpenChange={setDropOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Drop Project</DialogTitle>
            <DialogDescription>
              Move {dropLeadName || 'this lead'} to Closed. Select the Closed substatus to save with the project.
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
                <SelectTrigger><SelectValue placeholder="Select Closed substatus" /></SelectTrigger>
                <SelectContent>
                  {closedSubStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>{formatLabel(status)}</SelectItem>
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
                <SelectValue placeholder={loadingSrCrmUsers ? 'Loading members...' : 'Select SR CRM member'} />
              </SelectTrigger>
              <SelectContent>
                {srCrmUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
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

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Client Name</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
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
