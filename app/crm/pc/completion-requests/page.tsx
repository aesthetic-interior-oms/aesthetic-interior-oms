'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  HardHat,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  User,
  XCircle,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'

type CompletionRequestItem = {
  id: string
  leadId: string
  draftId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  lineIds: string[]
  itemsSnapshot: Array<{
    lineId: string
    description: string
    floorName?: string
    areaName?: string
    quantity?: number | null
    unit?: string | null
  }>
  note: string | null
  rejectionReason: string | null
  createdAt: string
  reviewedAt: string | null
  lead: {
    id: string
    name: string
    location: string | null
    phone: string | null
  }
  requestedBy: {
    id: string
    fullName: string
    email: string
  }
  reviewedBy: {
    id: string
    fullName: string
    email: string
  } | null
}

export default function PCCompletionRequestsPage() {
  const [requests, setRequests] = useState<CompletionRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [searchQuery, setSearchQuery] = useState('')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<CompletionRequestItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const fetchRequests = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const res = await fetch('/api/pc/completion-requests?status=ALL', { cache: 'no-store' })
      const json = (await res.json()) as {
        success: boolean
        data?: CompletionRequestItem[]
        error?: string
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load completion requests')
      }

      setRequests(Array.isArray(json.data) ? json.data : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load completion requests')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchRequests()
  }, [fetchRequests])

  const counts = useMemo(() => {
    let pending = 0
    let approved = 0
    let rejected = 0
    for (const r of requests) {
      if (r.status === 'PENDING') pending++
      else if (r.status === 'APPROVED') approved++
      else if (r.status === 'REJECTED') rejected++
    }
    return { pending, approved, rejected, total: requests.length }
  }, [requests])

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return requests.filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false
      if (!q) return true
      const inProject = req.lead?.name?.toLowerCase().includes(q)
      const inLocation = req.lead?.location?.toLowerCase().includes(q)
      const inEngineer = req.requestedBy?.fullName?.toLowerCase().includes(q)
      const inItems = Array.isArray(req.itemsSnapshot)
        ? req.itemsSnapshot.some((item) => item.description?.toLowerCase().includes(q))
        : false
      return Boolean(inProject || inLocation || inEngineer || inItems)
    })
  }, [requests, statusFilter, searchQuery])

  const handleApprove = async (requestId: string) => {
    setReviewingId(requestId)
    try {
      const res = await fetch(`/api/pc/completion-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to approve completion request')
      }
      toast.success(json.message || 'Completion request approved and project progress updated.')
      await fetchRequests(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve completion request')
    } finally {
      setReviewingId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    const trimmed = rejectionReason.trim()
    if (!trimmed) {
      toast.error('Please enter a rejection reason')
      return
    }
    setReviewingId(rejectTarget.id)
    try {
      const res = await fetch(`/api/pc/completion-requests/${rejectTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', rejectionReason: trimmed }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to reject completion request')
      }
      toast.success('Completion request rejected')
      setRejectTarget(null)
      setRejectionReason('')
      await fetchRequests(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject completion request')
    } finally {
      setReviewingId(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CrmPageHeader
        title="Site Engineer Completion Requests"
        subtitle="Review, approve, or reject project work item completion requests submitted by Site Engineers."
      />

      <div className="flex flex-col gap-6 p-4 md:gap-6 md:p-8 w-full flex-1">
        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card
            className={`cursor-pointer transition-colors ${statusFilter === 'PENDING' ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20' : ''}`}
            onClick={() => setStatusFilter('PENDING')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pending Approval</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {counts.pending}
                </p>
              </div>
              <Clock className="w-6 h-6 text-amber-500/70" />
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${statusFilter === 'APPROVED' ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}
            onClick={() => setStatusFilter('APPROVED')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Approved</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {counts.approved}
                </p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-500/70" />
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${statusFilter === 'REJECTED' ? 'border-destructive bg-destructive/5' : ''}`}
            onClick={() => setStatusFilter('REJECTED')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Rejected</p>
                <p className="text-2xl font-bold text-destructive mt-0.5">{counts.rejected}</p>
              </div>
              <XCircle className="w-6 h-6 text-destructive/70" />
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${statusFilter === 'ALL' ? 'border-primary bg-primary/5' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Requests</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{counts.total}</p>
              </div>
              <HardHat className="w-6 h-6 text-muted-foreground/60" />
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((status) => (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={statusFilter === status ? 'default' : 'outline'}
                className="text-xs h-8"
                onClick={() => setStatusFilter(status)}
              >
                {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search project, engineer, or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => void fetchRequests(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading completion requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold">No completion requests found</h3>
              <p className="text-xs text-muted-foreground">
                {statusFilter === 'PENDING'
                  ? 'All Site Engineer completion requests have been reviewed.'
                  : 'Try changing the status filter or search query.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const itemsList = Array.isArray(req.itemsSnapshot) ? req.itemsSnapshot : []
              const isReviewing = reviewingId === req.id
              return (
                <Card key={req.id} className="overflow-hidden">
                  <CardHeader className="pb-3 bg-muted/30 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={`text-[10px] h-5 font-semibold ${
                              req.status === 'APPROVED'
                                ? 'bg-emerald-600 text-white'
                                : req.status === 'REJECTED'
                                  ? 'bg-destructive text-destructive-foreground'
                                  : 'bg-amber-500 text-white'
                            }`}
                          >
                            {req.status}
                          </Badge>
                          <Link
                            href={`/crm/pc/projects/${req.lead.id}`}
                            className="font-bold text-sm hover:underline flex items-center gap-1 text-foreground"
                          >
                            {req.lead.name}
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                          </Link>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            Requested by <strong className="text-foreground">{req.requestedBy.fullName}</strong>
                          </span>
                          {req.lead.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {req.lead.location}
                            </span>
                          )}
                          <span>• {new Date(req.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {req.status === 'PENDING' ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isReviewing}
                            className="text-xs h-8 border-destructive/40 text-destructive hover:bg-destructive/10 gap-1"
                            onClick={() => {
                              setRejectTarget(req)
                              setRejectionReason('')
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isReviewing}
                            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold"
                            onClick={() => void handleApprove(req.id)}
                          >
                            {isReviewing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Approve &amp; Mark Completed
                          </Button>
                        </div>
                      ) : (
                        req.reviewedBy && (
                          <div className="text-xs text-muted-foreground text-right">
                            Reviewed by <strong className="text-foreground">{req.reviewedBy.fullName}</strong>
                            {req.reviewedAt && (
                              <div className="text-[11px]">{new Date(req.reviewedAt).toLocaleString()}</div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    {req.note && (
                      <p className="text-xs text-muted-foreground italic bg-muted/30 p-2.5 rounded-lg border">
                        <strong>Site Engineer Note:</strong> &ldquo;{req.note}&rdquo;
                      </p>
                    )}

                    {req.status === 'REJECTED' && req.rejectionReason && (
                      <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                        <strong>Rejection Reason:</strong> {req.rejectionReason}
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        Selected Work Items ({itemsList.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {itemsList.map((item) => (
                          <div
                            key={item.lineId}
                            className="p-2.5 rounded-lg border bg-card text-xs flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{item.description}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {item.floorName || 'Floor'} • {item.areaName || 'Area'}
                              </p>
                            </div>
                            {item.quantity != null && (
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {item.quantity} {item.unit || ''}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setRejectionReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-4 h-4" />
              Reject Completion Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide a reason so the Site Engineer knows what needs to be fixed before resubmitting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">Rejection Reason *</Label>
            <Textarea
              placeholder="e.g. Finishing work on kitchen cabinets is incomplete."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectTarget(null)
                setRejectionReason('')
              }}
              disabled={Boolean(reviewingId)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={Boolean(reviewingId) || !rejectionReason.trim()}
              onClick={() => void handleReject()}
            >
              {reviewingId ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Confirm Rejection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
