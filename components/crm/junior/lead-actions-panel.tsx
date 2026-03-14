'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import dynamic from 'next/dynamic'
import { MapPin, User, TrendingUp, Plus } from 'lucide-react'

type Assignment = {
  id: string
  leadId: string
  userId: string
  department: string
  createdAt: string
  user: {
    id: string
    fullName: string
    email: string
  }
}

interface LeadActionsPanelProps {
  leadId: string
  assignments: Assignment[]
  assignmentsLoading: boolean
  stage: string
  subStatus: string | null
  onStageChange: (value: string) => void
  onSubStatusChange: (value: string | null) => void
  onUpdateStage: (reason: string) => Promise<void>
  onAssignmentsRefresh: () => void
  hasPendingFollowup: boolean
  onAddFollowup: () => void
}

export function LeadActionsPanel({
  leadId,
  assignments,
  assignmentsLoading,
  stage,
  subStatus,
  onStageChange,
  onSubStatusChange,
  onUpdateStage,
  onAssignmentsRefresh,
  hasPendingFollowup,
  onAddFollowup,
}: LeadActionsPanelProps) {
  const [assignOpen, setAssignOpen] = useState(false)
  const [department, setDepartment] = useState('')
  const [departmentUsers, setDepartmentUsers] = useState<Assignment['user'][]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [stageError, setStageError] = useState<string | null>(null)
  const [savingStage, setSavingStage] = useState(false)

  const stageSubStatusMap: Record<string, string[]> = useMemo(
    () => ({
      NEW: [],
      CONTACT_ATTEMPTED: ['NUMBER_COLLECTED', 'NO_ANSWER'],
      NURTURING: ['WARM_LEAD', 'FUTURE_CLIENT', 'SMALL_BUDGET'],
      VISIT_SCHEDULED: [],
      CLOSED: ['INVALID', 'NOT_INTERESTED', 'LOST', 'DEAD_LEAD'],
    }),
    [],
  )

  const subStatusOptions = stageSubStatusMap[stage] ?? []
  const requiresSubStatus = subStatusOptions.length > 0
  const canUpdateStage = !requiresSubStatus || Boolean(subStatus)

  const validDepartments = [
    'SR_CRM',
    'JR_CRM',
    'QUOTATION',
    'VISIT_TEAM',
    'JR_ARCHITECT',
    'VISUALIZER_3D',
  ]

  const DUMMY_LAT = 23.8041425
  const DUMMY_LNG = 90.3700876

  const LeadMapPreview = dynamic(
    () =>
      import('@/components/maps/lead-map-preview').then((mod) => mod.LeadMapPreview),
    { ssr: false },
  )

  const formatLabel = (value: string) => value.replace(/_/g, ' ')

  const handleStageChange = (value: string) => {
    setStageError(null)
    onStageChange(value)
    const nextOptions = stageSubStatusMap[value] ?? []
    if (nextOptions.length === 0) {
      onSubStatusChange(null)
    } else {
      onSubStatusChange('')
    }
  }

  const openReasonDialog = () => {
    setStageError(null)
    if (!canUpdateStage) {
      setStageError('Select a substatus to continue.')
      return
    }
    setReasonOpen(true)
  }

  const handleStageSubmit = async () => {
    if (!reason.trim()) {
      setStageError('Please enter a reason.')
      return
    }

    setSavingStage(true)
    setStageError(null)
    try {
      await onUpdateStage(reason.trim())
      setReasonOpen(false)
      setReason('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update stage.'
      setStageError(message)
    } finally {
      setSavingStage(false)
    }
  }

  const handleDepartmentChange = async (value: string) => {
    setDepartment(value)
    setSelectedUserId('')
    setAssignError(null)
    setDepartmentUsers([])

    if (!value) return

    setUsersLoading(true)
    try {
      const response = await fetch(`/api/department/available/${value}`)
      const data = await response.json()
      if (data.success && Array.isArray(data.data?.users)) {
        setDepartmentUsers(data.data.users)
      } else {
        throw new Error(data.error || 'Failed to load users for department.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load users.'
      setAssignError(message)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!department) {
      setAssignError('Please select a department.')
      return
    }

    if (!selectedUserId) {
      setAssignError('Please select a user.')
      return
    }

    setAssigning(true)
    setAssignError(null)

    try {
      const response = await fetch(`/api/lead/${leadId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          department,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save assignment.')
      }

      setAssignOpen(false)
      setDepartment('')
      setSelectedUserId('')
      setDepartmentUsers([])
      onAssignmentsRefresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save assignment.'
      setAssignError(message)
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Department Assignments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Department Assignments
          </CardTitle>
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Add assignment">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add assignment</DialogTitle>
                <DialogDescription>
                  Select a department and assign a user for this lead.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={department} onValueChange={handleDepartmentChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {validDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>User</Label>
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    disabled={!department || usersLoading || departmentUsers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          usersLoading
                            ? 'Loading users...'
                            : department
                              ? 'Select user'
                              : 'Select department first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {assignError ? (
                  <p className="text-sm text-destructive">{assignError}</p>
                ) : null}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAssign}
                  disabled={assigning || !department || !selectedUserId}
                >
                  {assigning ? 'Saving...' : 'Save assignment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <div className="text-center text-muted-foreground text-sm py-4">
              <div className="inline-block w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="mt-2">Loading assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments yet</p>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="p-3 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{assignment.department}</p>
                      <p className="font-semibold text-foreground mt-1 text-sm">{assignment.user.fullName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{assignment.user.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Change Stage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={stage} onValueChange={handleStageChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="CONTACT_ATTEMPTED">Contact Attempted</SelectItem>
              <SelectItem value="NURTURING">Nurturing</SelectItem>
              <SelectItem value="VISIT_SCHEDULED">Visit Scheduled</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>

          {requiresSubStatus ? (
            <Select
              value={subStatus ?? ''}
              onValueChange={(value) => {
                setStageError(null)
                onSubStatusChange(value)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select substatus" />
              </SelectTrigger>
              <SelectContent>
                {subStatusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">
              No substatus required for this stage.
            </p>
          )}

          {stageError ? <p className="text-xs text-destructive">{stageError}</p> : null}

          <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
            <Button className="w-full" onClick={openReasonDialog} disabled={!canUpdateStage}>
              Update Stage
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reason for change</DialogTitle>
                <DialogDescription>
                  Add a short reason for updating the stage/substatus.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Type the reason for this change..."
                  rows={4}
                />
              </div>
              {stageError ? <p className="text-xs text-destructive">{stageError}</p> : null}
              <DialogFooter>
                <Button onClick={handleStageSubmit} disabled={savingStage}>
                  {savingStage ? 'Saving...' : 'Confirm update'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full justify-start gap-2" variant="outline">
            <Plus className="w-4 h-4" />
            Schedule Visit
          </Button>
          <Button
            className="w-full justify-start gap-2"
            variant="outline"
            onClick={onAddFollowup}
            disabled={hasPendingFollowup}
          >
            <Plus className="w-4 h-4" />
            Add Followup
          </Button>
          <Button className="w-full justify-start gap-2" variant="outline">
            <Plus className="w-4 h-4" />
            Send Email
          </Button>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-4 h-4" />
              Lead location (dummy)
            </div>
            <LeadMapPreview lat={DUMMY_LAT} lng={DUMMY_LNG} heightClassName="h-36" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
