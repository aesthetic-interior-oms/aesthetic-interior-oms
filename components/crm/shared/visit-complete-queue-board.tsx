'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-gradient-to-r from-slate-50 via-white to-slate-50">
            <div>
              <CardTitle className="text-base">Visit Complete Queue</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{items.length} data on this page</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading queue...</p>
            ) : null}

            {!loading && items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No leads are waiting in visit completed queue.
              </div>
            ) : null}

            {!loading && items.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow className="border-slate-800 hover:bg-slate-950">
                      <TableHead className="min-w-[240px] py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Client Name</TableHead>
                      <TableHead className="min-w-[210px] py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Visit / Complete Date</TableHead>
                      <TableHead className="min-w-[260px] py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Visit Team</TableHead>
                      <TableHead className="w-[80px] py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const visitLead = item.latestCompletedVisit?.assignedVisitLead
                      const supportMembers = item.latestCompletedVisit?.supportMembers ?? []
                      return (
                        <TableRow key={item.leadId} className="border-slate-100 transition-colors hover:bg-slate-50/80">
                          <TableCell className="py-5 align-top">
                            <button
                              type="button"
                              onClick={() => openRenameDialog(item.leadId, item.leadName)}
                              className="text-left text-base font-semibold text-slate-950 transition hover:text-primary hover:underline"
                            >
                              {item.leadName}
                            </button>
                          </TableCell>
                          <TableCell className="py-5 align-top">
                            <div className="space-y-1">
                              <p className="text-base font-semibold text-slate-950">
                                {formatDate(item.latestCompletedVisit?.scheduledAt ?? null)}
                              </p>
                              <p className="text-xs font-medium text-slate-500">
                                Complete: {formatDate(item.latestCompletedVisit?.completedAt ?? null)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-5 align-top">
                            <div className="space-y-1">
                              <p className="text-base font-bold text-slate-950">{visitLead?.fullName ?? 'N/A'}</p>
                              <p className="text-xs font-normal text-slate-500">
                                {supportMembers.length > 0
                                  ? supportMembers.map((member) => member.fullName).join(', ')
                                  : 'No support member'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-5 text-right align-top">
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
