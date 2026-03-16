'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  User,
  ArrowRight,
} from 'lucide-react'

type FollowUpStatus = 'PENDING' | 'DONE' | 'LATELY_DONE' | 'MISSED'

type FollowUp = {
  id: string
  leadId: string
  assignedToId: string
  followupDate: string
  status: FollowUpStatus
  notes: string | null
  createdAt: string
  lead: {
    id: string
    name: string
    email: string
    phone: string
    stage: string
    subStatus: string | null
  }
  assignedTo: {
    id: string
    fullName: string
    email: string
  }
}

const statusConfig: Record<FollowUpStatus, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  PENDING: {
    icon: <Clock className="w-4 h-4" />,
    color: 'text-yellow-700 dark:text-yellow-200',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/40',
    label: 'Pending',
  },
  DONE: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-green-700 dark:text-green-200',
    bgColor: 'bg-green-100 dark:bg-green-900/40',
    label: 'Done',
  },
  LATELY_DONE: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-blue-700 dark:text-blue-200',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    label: 'Lately Done',
  },
  MISSED: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-red-700 dark:text-red-200',
    bgColor: 'bg-red-100 dark:bg-red-900/40',
    label: 'Missed',
  },
}

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [selectedFollowup, setSelectedFollowup] = useState<FollowUp | null>(null)
  const [completionNote, setCompletionNote] = useState('')
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)

  const refreshFollowups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/followup?limit=200')
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load follow-ups.')
      }
      setFollowups(Array.isArray(data.data) ? data.data : [])
    } catch (error) {
      console.error('Error loading follow-ups:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshFollowups()
  }, [refreshFollowups])

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => setCurrentUserId(data.id ?? null))
      .catch((error) => console.error('Error fetching current user:', error))
  }, [])

  const openCompleteModal = (followup: FollowUp) => {
    setSelectedFollowup(followup)
    setCompletionNote('')
    setCompleteError(null)
    setCompleteOpen(true)
  }

  const handleCompleteFollowup = async () => {
    if (!selectedFollowup) return
    if (!currentUserId) {
      setCompleteError('Unable to determine your user id.')
      return
    }
    if (!completionNote.trim()) {
      setCompleteError('Please add completion notes.')
      return
    }

    const nextStatus: FollowUpStatus = selectedFollowup.status === 'MISSED' ? 'LATELY_DONE' : 'DONE'

    setCompleting(true)
    setCompleteError(null)
    try {
      const res = await fetch(`/api/followup/${selectedFollowup.leadId}/${selectedFollowup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          notes: completionNote.trim(),
          userId: currentUserId,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete follow-up.')
      }

      setCompleteOpen(false)
      setSelectedFollowup(null)
      setCompletionNote('')
      refreshFollowups()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete follow-up.'
      setCompleteError(message)
    } finally {
      setCompleting(false)
    }
  }

  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  const { pending, overdue, todayFollowups, completed, missed } = useMemo(() => {
    const pendingFollowups = followups.filter((f) => f.status === 'PENDING')
    const overdueFollowups = pendingFollowups.filter((f) => new Date(f.followupDate) < today)
    const todayPendingFollowups = pendingFollowups.filter((f) => {
      const fDate = new Date(f.followupDate)
      fDate.setHours(0, 0, 0, 0)
      return fDate.getTime() === today.getTime()
    })
    const upcomingFollowups = pendingFollowups.filter((f) => {
      const fDate = new Date(f.followupDate)
      fDate.setHours(0, 0, 0, 0)
      return fDate > today
    })
    const completedFollowups = followups.filter((f) => f.status === 'DONE' || f.status === 'LATELY_DONE')
    const missedFollowups = followups.filter((f) => f.status === 'MISSED')

    return {
      pending: pendingFollowups,
      overdue: overdueFollowups,
      todayFollowups: todayPendingFollowups,
      upcoming: upcomingFollowups,
      completed: completedFollowups,
      missed: missedFollowups,
    }
  }, [followups, today])

  const FollowupCard = ({ followup }: { followup: FollowUp }) => {
    const config = statusConfig[followup.status]
    const followupDateTime = new Date(followup.followupDate)
    const canComplete = followup.status === 'PENDING' || followup.status === 'MISSED'

    return (
      <Card className="hover:shadow-md transition-shadow duration-200 border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 mt-1 p-2 rounded-lg ${config.bgColor}`}>
              <div className={config.color}>{config.icon}</div>
            </div>

            <div className="flex-1 min-w-0">
              <Link href={`/crm/jr/leads/${followup.leadId}`} className="group">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {followup.lead.name}
                </h3>
              </Link>
              <div className="flex flex-col md:flex-row md:items-center gap-2 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{followup.lead.email}</span>
                </div>
                <div className="hidden md:block">•</div>
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{followup.lead.phone}</span>
                </div>
              </div>

              {followup.notes ? (
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{followup.notes}</p>
              ) : null}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {followupDateTime.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })} at{' '}
                      {followupDateTime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    <span>{followup.assignedTo.fullName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/crm/jr/leads/${followup.leadId}`}>
                    <Button size="sm" variant="outline" className="gap-1">
                      View <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  {canComplete ? (
                    <Button size="sm" onClick={() => openCompleteModal(followup)}>
                      Complete
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              <Badge className={`${config.bgColor} ${config.color} text-xs font-medium`}>
                {config.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const EmptyState = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <Card className="border-dashed">
      <CardContent className="pt-14 pb-14 text-center">
        <div className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40">{icon}</div>
        <p className="text-muted-foreground text-sm font-medium">{text}</p>
      </CardContent>
    </Card>
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-foreground">Followups</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage all your followup tasks</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? <p className="text-sm text-muted-foreground mb-4">Loading followups...</p> : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-8">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-8">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Pending</span>
              <Badge variant="secondary" className="ml-auto text-[10px] px-2 py-0">
                {pending.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="today" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Today</span>
              <Badge variant="secondary" className="ml-auto text-[10px] px-2 py-0">
                {todayFollowups.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="overdue" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Overdue</span>
              <Badge variant="secondary" className="ml-auto text-[10px] px-2 py-0">
                {overdue.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed</span>
              <Badge variant="secondary" className="ml-auto text-[10px] px-2 py-0">
                {completed.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="missed" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Missed</span>
              <Badge variant="secondary" className="ml-auto text-[10px] px-2 py-0">
                {missed.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pending.length === 0 ? (
              <EmptyState icon={<Clock className="w-12 h-12" />} text="No pending followups" />
            ) : (
              pending.map((f) => <FollowupCard key={f.id} followup={f} />)
            )}
          </TabsContent>
          <TabsContent value="today" className="space-y-4">
            {todayFollowups.length === 0 ? (
              <EmptyState icon={<Calendar className="w-12 h-12" />} text="No followups for today" />
            ) : (
              todayFollowups.map((f) => <FollowupCard key={f.id} followup={f} />)
            )}
          </TabsContent>
          <TabsContent value="overdue" className="space-y-4">
            {overdue.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="w-12 h-12" />} text="No overdue followups" />
            ) : (
              overdue.map((f) => <FollowupCard key={f.id} followup={f} />)
            )}
          </TabsContent>
          <TabsContent value="completed" className="space-y-4">
            {completed.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="w-12 h-12" />} text="No completed followups" />
            ) : (
              completed.map((f) => <FollowupCard key={f.id} followup={f} />)
            )}
          </TabsContent>
          <TabsContent value="missed" className="space-y-4">
            {missed.length === 0 ? (
              <EmptyState icon={<AlertCircle className="w-12 h-12" />} text="No missed followups" />
            ) : (
              missed.map((f) => <FollowupCard key={f.id} followup={f} />)
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete follow-up</DialogTitle>
            <DialogDescription>
              {selectedFollowup?.status === 'MISSED'
                ? 'This follow-up will be marked as lately done.'
                : 'This follow-up will be marked as done.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={completionNote}
              onChange={(event) => setCompletionNote(event.target.value)}
              placeholder="Follow-up finished successfully"
              rows={4}
            />
            {completeError ? <p className="text-sm text-destructive">{completeError}</p> : null}
          </div>
          <DialogFooter>
            <Button onClick={handleCompleteFollowup} disabled={completing}>
              {completing ? 'Saving...' : 'Complete follow-up'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
