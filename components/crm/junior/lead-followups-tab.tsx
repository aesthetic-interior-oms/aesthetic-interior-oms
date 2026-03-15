'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, User } from 'lucide-react'

type Followup = {
  id: string
  followupDate: string
  notes: string
  status: string
  assignedTo: {
    id: string
    fullName: string
    email: string
  }
}

interface LeadFollowupsTabProps {
  followups: Followup[]
  leadId: string
  currentUserId: string | null
  hasPendingFollowup: boolean
  onRefreshFollowups: () => void
  onAddFollowup: () => void
}

export function LeadFollowupsTab({
  followups,
  leadId,
  currentUserId,
  hasPendingFollowup,
  onRefreshFollowups,
  onAddFollowup,
}: LeadFollowupsTabProps) {
  const [completeOpen, setCompleteOpen] = useState(false)
  const [selectedFollowup, setSelectedFollowup] = useState<Followup | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openCompleteModal = (followup: Followup) => {
    setSelectedFollowup(followup)
    setNote('')
    setError(null)
    setCompleteOpen(true)
  }

  const pendingOrMissed = useMemo(
    () => new Set(['PENDING', 'MISSED']),
    [],
  )

  const handleComplete = async () => {
    if (!selectedFollowup) return
    if (!currentUserId) {
      setError('Unable to determine your user id.')
      return
    }
    if (!note.trim()) {
      setError('Please add a note for the follow-up completion.')
      return
    }

    setSubmitting(true)
    setError(null)

    const completionStatus = selectedFollowup.status === 'MISSED' ? 'LATELY_DONE' : 'DONE'

    try {
      const followupRes = await fetch(
        `/api/followup/${leadId}/${selectedFollowup.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: completionStatus,
            notes: note.trim(),
            userId: currentUserId,
          }),
        },
      )
      const followupData = await followupRes.json()
      if (!followupRes.ok || !followupData.success) {
        throw new Error(followupData.error || 'Failed to update follow-up.')
      }

      setCompleteOpen(false)
      setSelectedFollowup(null)
      setNote('')
      onRefreshFollowups()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete follow-up.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (followups.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground text-sm">No followups scheduled.</p>
          <Button
            className="mt-4"
            onClick={onAddFollowup}
            disabled={hasPendingFollowup}
          >
            Add Followup
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {followups.map((followup) => (
        <Card
          key={followup.id}
          className="border-border hover:shadow-sm transition-shadow"
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-foreground">
                    {new Date(followup.followupDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{followup.notes}</p>
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{followup.assignedTo.fullName}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge
                  className={
                    followup.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                      : followup.status === 'MISSED'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                  }
                >
                  {followup.status}
                </Badge>
                {pendingOrMissed.has(followup.status) ? (
                  <Button size="sm" variant="outline" onClick={() => openCompleteModal(followup)}>
                    Complete
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete follow-up</DialogTitle>
            <DialogDescription>
              Mark this follow-up as done and add a note.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedFollowup?.status === 'MISSED'
                ? 'This follow-up will be marked as lately done.'
                : 'This follow-up will be marked as done.'}
            </p>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add completion note..."
                rows={4}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button onClick={handleComplete} disabled={submitting}>
              {submitting ? 'Saving...' : 'Complete follow-up'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
