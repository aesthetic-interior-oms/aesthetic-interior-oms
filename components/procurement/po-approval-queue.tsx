'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
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
  Loader2,
  MapPin,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

type POItem = {
  id: string
  quantity: string | number
  unitPrice: string | number
  total: string | number
  vendorName?: string | null
  requisitionItem: {
    materialName: string
    unit: string
    workCategory: string
  }
}

type PORecord = {
  id: string
  poNo: string
  indentId: string
  leadId: string
  status:
    | 'PENDING_LEAD_APPROVAL'
    | 'PENDING_ACCOUNTS_APPROVAL'
    | 'APPROVED'
    | 'REJECTED'
    | 'FULFILLED'
  totalAmount: number
  supplierName: string | null
  notes: string | null
  leadVerificationNote: string | null
  rejectionReason: string | null
  createdAt: string
  leadVerifiedAt: string | null
  approvedAt: string | null
  lead?: {
    id: string
    name: string
    location: string | null
    phone: string | null
  }
  indent: {
    id: string
    indentNo: string
    requisitionId: string
    items: POItem[]
  }
  createdBy: { fullName: string }
  leadVerifiedBy?: { fullName: string } | null
  approvedBy?: { fullName: string } | null
  rejectedBy?: { fullName: string } | null
}

export function POApprovalQueue({
  title = 'Purchase Order Approvals',
  subtitle = 'Verify and approve Purchase Orders created by Procurement before forwarding them to Accounts.',
}: {
  title?: string
  subtitle?: string
}) {
  const [orders, setOrders] = useState<PORecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_LEAD_APPROVAL')
  const [searchQuery, setSearchQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const [verifyTarget, setVerifyTarget] = useState<PORecord | null>(null)
  const [verifyNote, setVerifyNote] = useState('')
  const [rejectTarget, setRejectTarget] = useState<PORecord | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const fetchOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const res = await fetch('/api/procurement/purchase-orders?status=ALL', {
        cache: 'no-store',
      })
      const json = (await res.json()) as {
        success?: boolean
        data?: PORecord[]
        error?: string
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load Purchase Orders')
      }

      setOrders(Array.isArray(json.data) ? json.data : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load Purchase Orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  const counts = useMemo(() => {
    let pendingLead = 0
    let pendingAccounts = 0
    let approved = 0
    let fulfilled = 0
    let rejected = 0
    for (const o of orders) {
      if (o.status === 'PENDING_LEAD_APPROVAL') pendingLead++
      else if (o.status === 'PENDING_ACCOUNTS_APPROVAL') pendingAccounts++
      else if (o.status === 'APPROVED') approved++
      else if (o.status === 'FULFILLED') fulfilled++
      else if (o.status === 'REJECTED') rejected++
    }
    return { pendingLead, pendingAccounts, approved, fulfilled, rejected, total: orders.length }
  }, [orders])

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return orders.filter((po) => {
      if (statusFilter !== 'ALL' && po.status !== statusFilter) return false
      if (!q) return true
      return (
        po.poNo.toLowerCase().includes(q) ||
        po.indent.indentNo.toLowerCase().includes(q) ||
        (po.lead?.name || '').toLowerCase().includes(q) ||
        (po.supplierName || '').toLowerCase().includes(q) ||
        (po.createdBy?.fullName || '').toLowerCase().includes(q)
      )
    })
  }, [orders, statusFilter, searchQuery])

  const handleVerifyAndForward = async () => {
    if (!verifyTarget) return
    setBusyId(verifyTarget.id)
    try {
      const res = await fetch(`/api/procurement/purchase-orders/${verifyTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LEAD_VERIFY',
          note: verifyNote.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to verify Purchase Order')
      }
      toast.success(`${verifyTarget.poNo} verified & forwarded to Accounts!`)
      setVerifyTarget(null)
      setVerifyNote('')
      await fetchOrders(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify Purchase Order')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    const reason = rejectionReason.trim()
    if (!reason) {
      toast.error('Please enter a rejection reason')
      return
    }
    setBusyId(rejectTarget.id)
    try {
      const res = await fetch(`/api/procurement/purchase-orders/${rejectTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LEAD_REJECT',
          rejectionReason: reason,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to reject Purchase Order')
      }
      toast.success(`${rejectTarget.poNo} rejected`)
      setRejectTarget(null)
      setRejectionReason('')
      await fetchOrders(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject Purchase Order')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1.5 self-start sm:self-auto"
          onClick={() => void fetchOrders(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'PENDING_LEAD_APPROVAL' ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20' : ''}`}
          onClick={() => setStatusFilter('PENDING_LEAD_APPROVAL')}
        >
          <CardContent className="p-3.5">
            <p className="text-[11px] text-muted-foreground font-medium">Awaiting Verification</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {counts.pendingLead}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'PENDING_ACCOUNTS_APPROVAL' ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20' : ''}`}
          onClick={() => setStatusFilter('PENDING_ACCOUNTS_APPROVAL')}
        >
          <CardContent className="p-3.5">
            <p className="text-[11px] text-muted-foreground font-medium">Forwarded to Accounts</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {counts.pendingAccounts}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'APPROVED' ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}
          onClick={() => setStatusFilter('APPROVED')}
        >
          <CardContent className="p-3.5">
            <p className="text-[11px] text-muted-foreground font-medium">Accounts Approved</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {counts.approved}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'FULFILLED' ? 'border-primary bg-primary/5' : ''}`}
          onClick={() => setStatusFilter('FULFILLED')}
        >
          <CardContent className="p-3.5">
            <p className="text-[11px] text-muted-foreground font-medium">Fulfilled / Purchased</p>
            <p className="text-2xl font-bold mt-0.5">{counts.fulfilled}</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'REJECTED' ? 'border-destructive bg-destructive/5' : ''}`}
          onClick={() => setStatusFilter('REJECTED')}
        >
          <CardContent className="p-3.5">
            <p className="text-[11px] text-muted-foreground font-medium">Rejected</p>
            <p className="text-2xl font-bold text-destructive mt-0.5">{counts.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'PENDING_LEAD_APPROVAL', label: 'Pending Verification' },
            { key: 'PENDING_ACCOUNTS_APPROVAL', label: 'With Accounts' },
            { key: 'APPROVED', label: 'Approved' },
            { key: 'FULFILLED', label: 'Fulfilled' },
            { key: 'REJECTED', label: 'Rejected' },
            { key: 'ALL', label: 'All' },
          ].map((tab) => (
            <Button
              key={tab.key}
              type="button"
              size="sm"
              variant={statusFilter === tab.key ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search PO, indent, project, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* PO List */}
      {loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading Purchase Orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-sm font-semibold">No Purchase Orders found</h3>
            <p className="text-xs text-muted-foreground">
              {statusFilter === 'PENDING_LEAD_APPROVAL'
                ? 'All Purchase Orders have been verified.'
                : 'Try switching status tabs or clearing your search.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((po) => {
            const isBusy = busyId === po.id
            return (
              <Card key={po.id} className="overflow-hidden border-border">
                <CardHeader className="p-4 pb-3 bg-muted/25 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-primary" />
                          {po.poNo}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {po.indent.indentNo}
                        </Badge>
                        <Badge
                          className={`text-[10px] h-5 font-semibold ${
                            po.status === 'PENDING_LEAD_APPROVAL'
                              ? 'bg-amber-500 text-white'
                              : po.status === 'PENDING_ACCOUNTS_APPROVAL'
                                ? 'bg-blue-600 text-white'
                                : po.status === 'APPROVED' || po.status === 'FULFILLED'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-destructive text-destructive-foreground'
                          }`}
                        >
                          {po.status.replace(/_/g, ' ')}
                        </Badge>
                        {po.lead?.name && (
                          <Link
                            href={`/procurement/billing-center/${po.indent.requisitionId}`}
                            className="text-xs font-bold text-foreground hover:underline flex items-center gap-1"
                          >
                            {po.lead.name}
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          </Link>
                        )}
                      </div>

                      <CardDescription className="text-[11px] flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Created by <strong className="text-foreground">{po.createdBy.fullName}</strong>
                        </span>
                        {po.lead?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {po.lead.location}
                          </span>
                        )}
                        <span>
                          Supplier: <strong className="text-foreground">{po.supplierName || 'Multiple / Direct'}</strong>
                        </span>
                        <span>• {new Date(po.createdAt).toLocaleString()}</span>
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="text-right mr-2">
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Total PO Amount
                        </p>
                        <p className="font-mono text-base font-bold text-foreground">
                          ৳{Number(po.totalAmount).toLocaleString('en-BD')}
                        </p>
                      </div>

                      {po.status === 'PENDING_LEAD_APPROVAL' && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 gap-1"
                            onClick={() => {
                              setRejectTarget(po)
                              setRejectionReason('')
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isBusy}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold"
                            onClick={() => {
                              setVerifyTarget(po)
                              setVerifyNote('')
                            }}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Verify &amp; Forward to Accounts
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/40 text-muted-foreground font-semibold border-b text-[11px]">
                        <tr>
                          <th className="py-2 px-4">Materials</th>
                          <th className="py-2 px-3">Supplier Name</th>
                          <th className="py-2 px-3 text-right">Qty</th>
                          <th className="py-2 px-3 text-right">Unit Price</th>
                          <th className="py-2 px-4 text-right">Total Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {po.indent.items.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/20">
                            <td className="py-2 px-4 font-medium text-foreground">
                              {item.requisitionItem.materialName}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {item.vendorName || po.supplierName || '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {Number(item.quantity)} {item.requisitionItem.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              ৳{Number(item.unitPrice).toLocaleString('en-BD')}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-semibold text-foreground">
                              ৳{Number(item.total).toLocaleString('en-BD')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(po.notes || po.leadVerifiedBy || po.rejectionReason) && (
                    <div className="px-4 py-2.5 bg-muted/20 border-t text-xs space-y-1">
                      {po.leadVerifiedBy && (
                        <p className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verified by <strong>{po.leadVerifiedBy.fullName}</strong>
                          {po.leadVerifiedAt && ` on ${new Date(po.leadVerifiedAt).toLocaleString()}`}
                          {po.leadVerificationNote && ` — "${po.leadVerificationNote}"`}
                        </p>
                      )}
                      {po.rejectionReason && (
                        <p className="text-destructive">
                          <strong>Rejection Reason:</strong> {po.rejectionReason}
                        </p>
                      )}
                      {po.notes && (
                        <p className="text-muted-foreground italic">Note: &ldquo;{po.notes}&rdquo;</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Verify & Forward Modal */}
      <Dialog
        open={Boolean(verifyTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setVerifyTarget(null)
            setVerifyNote('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verify &amp; Forward {verifyTarget?.poNo} to Accounts
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm that you have verified the materials, supplier, and pricing. Once approved, this Purchase Order will be forwarded to Accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">Verification Note (Optional)</Label>
            <Textarea
              placeholder="e.g. Verified prices and supplier, approved for Accounts."
              value={verifyNote}
              onChange={(e) => setVerifyNote(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVerifyTarget(null)}
              disabled={Boolean(busyId)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => void handleVerifyAndForward()}
              disabled={Boolean(busyId)}
            >
              {busyId ? 'Forwarding...' : 'Approve & Forward to Accounts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
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
              Reject Purchase Order {rejectTarget?.poNo}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide a reason so Procurement knows what needs to be corrected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">Rejection Reason *</Label>
            <Textarea
              placeholder="e.g. Unit price is higher than agreed rate."
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
              onClick={() => setRejectTarget(null)}
              disabled={Boolean(busyId)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={Boolean(busyId) || !rejectionReason.trim()}
              onClick={() => void handleReject()}
            >
              {busyId ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
