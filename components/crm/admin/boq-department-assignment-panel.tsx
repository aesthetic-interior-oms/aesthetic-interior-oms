'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Loader2, UserRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/sonner'

type Props = {
  leadId: string
  accountStatus: string | null
  subStatus: string | null
  assignments: Array<{ id: string; userId: string; department: string; user: { id: string; fullName: string; email: string } }>
  canManage: boolean
  onRefresh: () => void
}

type BoqStatus = {
  accountStatus: string | null
  subStatus: string | null
  detailQuotationStatus: string | null
  requisitionStatus: string
  requisitionItemCount: number
  assignment: { id: string; userId: string; user: { id: string; fullName: string; email: string } } | null
}

export function BoqDepartmentAssignmentPanel({ leadId, accountStatus, subStatus, assignments, canManage, onRefresh }: Props) {
  const [staff, setStaff] = useState<Array<{ id: string; fullName: string; email: string }>>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<BoqStatus | null>(null)

  const currentAssignment = useMemo(
    () => assignments.find((item) => item.department === 'BOQ') ?? status?.assignment ?? null,
    [assignments, status],
  )
  const effectiveSubStatus = status?.subStatus ?? subStatus
  const eligible = (accountStatus === 'PARTIAL_PAID' || accountStatus === 'FULL_PAID') &&
    (effectiveSubStatus === 'QUOTATION_APPROVED' || ['BOQ_ASSIGNED', 'BOQ_WORKING', 'BOQ_COMPLETED', 'BOQ_CORRECTION'].includes(String(effectiveSubStatus)))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [staffRes, statusRes] = await Promise.all([
        fetch('/api/department/available/BOQ', { cache: 'no-store' }),
        fetch('/api/lead/' + leadId + '/boq-assignment', { cache: 'no-store' }),
      ])
      const [staffData, statusData] = await Promise.all([staffRes.json(), statusRes.json()])
      if (!staffRes.ok || !staffData.success) throw new Error(staffData.error ?? 'Failed to load BOQ staff')
      if (!statusRes.ok || !statusData.success) throw new Error(statusData.error ?? 'Failed to load BOQ status')
      setStaff(staffData.users ?? [])
      setStatus(statusData.data)
      setSelectedUserId(statusData.data?.assignment?.userId ?? currentAssignment?.userId ?? '')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load BOQ assignment')
    } finally {
      setLoading(false)
    }
  }, [leadId, currentAssignment?.userId])

  useEffect(() => { void load() }, [load])

  const assign = async () => {
    if (!selectedUserId) return
    setSaving(true)
    try {
      const response = await fetch('/api/lead/' + leadId + '/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, department: 'BOQ' }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Failed to assign BOQ member')
      toast.success(currentAssignment ? 'BOQ member reassigned.' : 'BOQ member assigned.')
      onRefresh()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign BOQ member')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4" />
          BOQ Department Assignment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!eligible ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            BOQ assignment unlocks after <b>Partial Paid / Full Paid</b> and <b>Quotation Approved</b>.
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium">Assign BOQ Member</p>
          <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={!canManage || !eligible || loading || saving}>
            <SelectTrigger><SelectValue placeholder="Select BOQ staff" /></SelectTrigger>
            <SelectContent>
              {staff.map((user) => <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {currentAssignment ? (
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-2 min-w-0">
              <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Currently Assigned: {currentAssignment.user.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{currentAssignment.user.email}</p>
              </div>
            </div>
            <Badge variant="secondary">{status?.subStatus?.startsWith('BOQ_') ? status.subStatus.replace('BOQ_', '') : 'ASSIGNED'}</Badge>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Requisition Status</p>
            <p className="text-xs text-muted-foreground">{status?.requisitionItemCount ?? 0} items</p>
          </div>
          <Badge>{status?.requisitionStatus ?? 'NOT_STARTED'}</Badge>
        </div>

        {canManage ? (
          <Button onClick={assign} disabled={!eligible || !selectedUserId || saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {currentAssignment ? 'Reassign BOQ Member' : 'Assign BOQ Member'}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
