'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
import { Input } from '@/components/ui/input'
import { Clock, MapPin, AlertCircle, Loader2 } from 'lucide-react'

type VisitRecord = {
  id: string
  scheduledAt: string
  location: string
  notes: string | null
  status: string
  projectSqft: number | null
  projectStatus: string | null
  lead: {
    id: string
    name: string
    phone: string
    location: string | null
  }
}

type ApiResponse = {
  success: boolean
  data?: VisitRecord[]
  error?: string
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatHourLabel(hour: number) {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:00 ${suffix}`
}

function getStatusBadgeColor(status: string) {
  const statusLower = status.toLowerCase()
  if (statusLower.includes('confirmed')) return 'bg-green-500/20 text-green-700 dark:text-green-400'
  if (statusLower.includes('pending')) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
  if (statusLower.includes('completed')) return 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
  return 'bg-muted text-foreground'
}

export default function VisitTodayPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null)
  const [requestType, setRequestType] = useState<'RESCHEDULE' | 'CANCEL'>('RESCHEDULE')
  const [requestReason, setRequestReason] = useState('')
  const [requestScheduleAt, setRequestScheduleAt] = useState('')
  const [requestError, setRequestError] = useState<string | null>(null)
  const [sendingRequest, setSendingRequest] = useState(false)

  useEffect(() => {
    const loadVisits = async () => {
      try {
        const response = await fetch('/api/visit-schedule')
        const payload = (await response.json()) as ApiResponse

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Failed to load visits')
        }

        setVisits(payload.data ?? [])
        setError(null)
      } catch (err) {
        setVisits([])
        setError(err instanceof Error ? err.message : 'Failed to load visits')
      } finally {
        setLoading(false)
      }
    }

    loadVisits()
  }, [])

  const todayKey = formatDateKey(new Date())
  const todayVisits = useMemo(() => {
    return visits
      .filter((visit) => {
        const parsed = new Date(visit.scheduledAt)
        return !Number.isNaN(parsed.getTime()) && formatDateKey(parsed) === todayKey
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      )
  }, [todayKey, visits])

  const visitsByHour = useMemo(() => {
    const grouped: Record<number, VisitRecord[]> = {}
    for (let hour = 0; hour < 24; hour += 1) {
      grouped[hour] = []
    }

    todayVisits.forEach((visit) => {
      const parsed = new Date(visit.scheduledAt)
      grouped[parsed.getHours()].push(visit)
    })

    return grouped
  }, [todayVisits])

  // Show all 24 hours instead of filtering
  const allHours = Array.from({ length: 24 }, (_, i) => i)

  const openRequestDialog = (visit: VisitRecord, type: 'RESCHEDULE' | 'CANCEL') => {
    setSelectedVisit(visit)
    setRequestType(type)
    setRequestReason('')
    setRequestScheduleAt('')
    setRequestError(null)
    setRequestOpen(true)
  }

  const handleSendRequest = async () => {
    if (!selectedVisit) return
    if (!requestReason.trim()) {
      setRequestError('Please add a reason.')
      return
    }
    if (requestType === 'RESCHEDULE' && !requestScheduleAt) {
      setRequestError('Please select the requested date/time.')
      return
    }

    setSendingRequest(true)
    setRequestError(null)
    try {
      const response = await fetch(`/api/visit-schedule/${selectedVisit.id}/update-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: requestType,
          reason: requestReason.trim(),
          requestedScheduleAt: requestType === 'RESCHEDULE' ? requestScheduleAt : undefined,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to send update request')
      }
      setRequestOpen(false)
      setSelectedVisit(null)
      setRequestReason('')
      setRequestScheduleAt('')
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Failed to send update request')
    } finally {
      setSendingRequest(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold text-foreground">Today&apos;s Visits</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 px-4 py-2">
                <p className="text-sm font-medium text-primary">
                  {todayVisits.length} {todayVisits.length === 1 ? 'visit' : 'visits'} scheduled
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">Loading your visits...</p>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-destructive">Error loading visits</h3>
                  <p className="mt-1 text-sm text-destructive/80">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && todayVisits.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-muted bg-muted/50 py-16 text-center">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">No visits today</h3>
              <p className="mt-1 text-sm text-muted-foreground">You have a free day ahead!</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-0">
              {allHours.map((hour, idx) => {
                const hasVisits = visitsByHour[hour].length > 0
                return (
                  <div key={hour}>
                    <div className="flex gap-6">
                      {/* Time column */}
                      <div className={`sticky left-0 w-24 flex-shrink-0 py-4 text-right ${
                        hasVisits ? 'bg-card' : 'bg-muted/30'
                      }`}>
                        <span className={`inline-block rounded-md px-3 py-1 text-xs font-semibold border ${
                          hasVisits 
                            ? 'bg-card text-foreground border-border' 
                            : 'bg-muted text-muted-foreground border-border'
                        }`}>
                          {formatHourLabel(hour)}
                        </span>
                      </div>

                      {/* Visits column */}
                      <div className={`flex-1 py-4 pr-6 ${hasVisits ? 'bg-card' : 'bg-muted/30'}`}>
                        {hasVisits ? (
                          <div className="space-y-3">
                            {visitsByHour[hour].map((visit) => {
                              const visitDate = new Date(visit.scheduledAt)
                              return (
                                <div
                                  key={visit.id}
                                  className="group rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/50"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-base font-semibold text-foreground truncate">
                                          {visit.lead?.name || 'Unknown Lead'}
                                        </h3>
                                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(visit.status)}`}>
                                          {visit.status}
                                        </span>
                                      </div>

                                      <div className="space-y-1.5 text-sm">
                                        <div className="flex items-center gap-2 text-foreground/70">
                                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                          <span className="truncate">{visit.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-foreground/70">
                                          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                          <span>
                                            {visitDate.toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                        </div>
                                      </div>

                                      {(visit.projectSqft || visit.projectStatus || visit.notes) && (
                                        <div className="mt-3 space-y-1 text-xs text-foreground/70 bg-muted rounded p-2">
                                          {visit.projectSqft && (
                                            <div>📐 <span className="font-medium">{visit.projectSqft.toLocaleString()} sqft</span></div>
                                          )}
                                          {visit.projectStatus && (
                                            <div>📊 <span className="font-medium">{visit.projectStatus.replace(/_/g, ' ')}</span></div>
                                          )}
                                          {visit.notes && (
                                            <div className="italic">💬 {visit.notes}</div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex gap-2 flex-shrink-0">
                                      <Button size="sm" variant="outline" asChild className="text-xs">
                                        <Link href={`/visit-team/leads/${visit.lead.id}`}>
                                          Open Lead
                                        </Link>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openRequestDialog(visit, 'RESCHEDULE')}
                                        className="text-xs"
                                      >
                                        Reschedule
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openRequestDialog(visit, 'CANCEL')}
                                        className="text-xs text-destructive hover:text-destructive"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-6">
                            <p className="text-sm text-muted-foreground">No visits scheduled</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {idx < allHours.length - 1 && (
                      <div className="flex gap-6">
                        <div className="w-24 flex-shrink-0" />
                        <div className="flex-1 border-b border-border/50" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {requestType === 'RESCHEDULE' ? 'Reschedule Visit' : 'Cancel Visit'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedVisit?.lead?.name ? `Request for ${selectedVisit.lead.name}` : 'Update visit request'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {requestType === 'RESCHEDULE' && (
              <div className="space-y-2">
                <Label htmlFor="reschedule-date" className="text-sm font-medium">
                  New Date & Time
                </Label>
                <Input
                  id="reschedule-date"
                  type="datetime-local"
                  value={requestScheduleAt}
                  onChange={(event) => setRequestScheduleAt(event.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Reason
              </Label>
              <Textarea
                id="reason"
                value={requestReason}
                onChange={(event) => setRequestReason(event.target.value)}
                rows={4}
                placeholder="Please explain why this visit needs to be updated..."
                className="text-sm resize-none"
              />
            </div>

            {requestError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {requestError}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRequestOpen(false)}
              className="text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendRequest}
              disabled={sendingRequest}
              className="text-sm gap-2"
            >
              {sendingRequest && <Loader2 className="h-4 w-4 animate-spin" />}
              {sendingRequest ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
