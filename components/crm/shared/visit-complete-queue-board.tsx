'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { MoreHorizontal } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

export function VisitCompleteQueueBoard({
  title,
  subtitle,
  leadHrefPrefix = null,
}: VisitCompleteQueueBoardProps) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<QueueItem[]>([])
  const [jrArchitectUsers, setJrArchitectUsers] = useState<JrArchitectUser[]>([])
  const [canAssign, setCanAssign] = useState(false)
  const [canRequest, setCanRequest] = useState(false)
  const [selectedByLead, setSelectedByLead] = useState<Record<string, string>>({})
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameLeadId, setRenameLeadId] = useState('')
  const [renameValue, setRenameValue] = useState('')
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
      setSelectedByLead((prev) => {
        const next: Record<string, string> = { ...prev }
        for (const item of payload.data ?? []) {
          const preferred = item.pendingRequests[0]?.requestedById
            ?? item.jrArchitectAssignee?.id
            ?? nextJrArchitectUsers[0]?.id
            ?? ''
          if (!next[item.leadId] && preferred) {
            next[item.leadId] = preferred
          }
        }
        return next
      })
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


  const requestLead = useCallback(async (leadId: string) => {
    setBusyLeadId(leadId)
    try {
      const response = await fetch('/api/visit-complete-queue/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to submit request')
      }
      toast.success(payload.message ?? 'Request submitted')
      await loadQueue()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit request')
    } finally {
      setBusyLeadId(null)
    }
  }, [loadQueue])

  const assignLead = useCallback(async (leadId: string, requestId?: string, assigneeId?: string) => {
    const selectedUserId = assigneeId
      ?? (requestId
        ? items.find((item) => item.leadId === leadId)?.pendingRequests.find((req) => req.id === requestId)?.requestedById
        : selectedByLead[leadId])

    if (!selectedUserId) {
      toast.error('Select a JR Architect first')
      return
    }

    setBusyLeadId(leadId)
    try {
      const response = await fetch('/api/visit-complete-queue/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          jrArchitectUserId: selectedUserId,
          requestId: requestId ?? null,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to assign JR Architect')
      }
      toast.success(payload.message ?? 'JR Architect assigned')
      await loadQueue()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign JR Architect')
    } finally {
      setBusyLeadId(null)
    }
  }, [items, loadQueue, selectedByLead])



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
        body: JSON.stringify({
          stage: 'CLOSED',
          subStatus: dropSubStatus,
          reason: 'Project dropped from Visit Complete Queue.',
        }),
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

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader title={title} subtitle={subtitle} />

      <main className="mx-auto max-w-[1440px] px-6 py-6 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
            <div>
              <CardTitle className="text-base text-card-foreground">Visit Complete Queue</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{items.length} items on this page</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            {loading ? (
              <p className="px-6 py-4 text-sm text-muted-foreground">Loading queue...</p>
            ) : null}

            {!loading && items.length === 0 ? (
              <div className="m-6 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No leads are waiting in visit completed queue.
              </div>
            ) : null}

            {!loading && items.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-[240px] pl-6">Client Name</TableHead>
                      <TableHead className="min-w-[210px]">Visit / Complete Date</TableHead>
                      <TableHead className="min-w-[260px]">Visit Team</TableHead>
                      <TableHead className="w-[80px] pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const visitLead = item.latestCompletedVisit?.assignedVisitLead
                      const supportMembers = item.latestCompletedVisit?.supportMembers ?? []
                      return (
                        <TableRow key={item.leadId}>
                          <TableCell className="py-4 pl-6 align-top">
                            <button
                              type="button"
                              onClick={() => openRenameDialog(item.leadId, item.leadName)}
                              className="text-left font-medium text-foreground transition hover:text-primary hover:underline"
                            >
                              {item.leadName}
                            </button>
                          </TableCell>
                          <TableCell className="py-4 align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {formatDate(item.latestCompletedVisit?.scheduledAt ?? null)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Complete: {formatDate(item.latestCompletedVisit?.completedAt ?? null)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{visitLead?.fullName ?? 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">
                                {supportMembers.length > 0
                                  ? supportMembers.map((member) => member.fullName).join(', ')
                                  : 'No support member'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 pr-6 text-right align-top">
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
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
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
            <Button variant="outline" onClick={() => setDropOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDropProject} disabled={!dropSubStatus || busyLeadId === dropLeadId}>
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
