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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Check,
  CheckCircle2,
  Loader2,
  MapPin,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Wallet,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

type PORecord = {
  id: string
  poNo: string
  indentId: string
  leadId: string
  status: 'PENDING_ACCOUNTS_APPROVAL' | 'APPROVED' | 'REJECTED' | 'FULFILLED'
  totalAmount: number
  supplierName: string | null
  notes: string | null
  accountsNote: string | null
  rejectionReason: string | null
  createdAt: string
  lead?: { id: string; name: string; location: string | null }
  indent: {
    id: string
    indentNo: string
    items: Array<{
      id: string
      quantity: string | number
      unitPrice: string | number
      total: string | number
      vendorName?: string | null
      requisitionItem: {
        materialName: string
        unit: string
      }
    }>
  }
  createdBy: { fullName: string }
  leadVerifiedBy?: { fullName: string } | null
  approvedBy?: { fullName: string } | null
}

type FinanceAccount = {
  id: string
  name: string
}

export default function AccountsPurchaseOrdersPage() {
  const [orders, setOrders] = useState<PORecord[]>([])
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_ACCOUNTS_APPROVAL')
  const [searchQuery, setSearchQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const [approveTarget, setApproveTarget] = useState<PORecord | null>(null)
  const [accountsNote, setAccountsNote] = useState('')
  const [disburseAccountId, setDisburseAccountId] = useState<string>('NONE')
  const [disburseCharge, setDisburseCharge] = useState('')
  const [disburseMethod, setDisburseMethod] = useState('BANK_TRANSFER')

  const [rejectTarget, setRejectTarget] = useState<PORecord | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const [poRes, walletRes] = await Promise.all([
        fetch('/api/procurement/purchase-orders?status=ALL', { cache: 'no-store' }),
        fetch('/api/procurement/wallet?mode=all', { cache: 'no-store' }),
      ])

      const poJson = await poRes.json()
      const walletJson = await walletRes.json()

      if (poRes.ok && poJson.success) {
        const list = Array.isArray(poJson.data) ? poJson.data : []
        // Accounts only handles POs that have passed Leader/PC verification
        setOrders(list.filter((o: any) => o.status !== 'PENDING_LEAD_APPROVAL'))
      }
      if (walletRes.ok && walletJson.success && Array.isArray(walletJson.data?.financeAccounts)) {
        setAccounts(walletJson.data.financeAccounts)
      }
    } catch {
      toast.error('Failed to load Purchase Orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

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

  const handleApprove = async () => {
    if (!approveTarget) return
    setBusyId(approveTarget.id)
    try {
      const res = await fetch(`/api/procurement/purchase-orders/${approveTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVED',
          accountsNote: accountsNote.trim() || undefined,
          ...(disburseAccountId !== 'NONE'
            ? {
                disburseFromAccountId: disburseAccountId,
                disburseCharge: Number(disburseCharge || 0),
                disbursePaymentMethod: disburseMethod,
              }
            : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to approve PO')

      toast.success(
        disburseAccountId !== 'NONE'
          ? `${approveTarget.poNo} approved & funds added to ${approveTarget.createdBy.fullName}'s wallet!`
          : `${approveTarget.poNo} approved!`,
      )
      setApproveTarget(null)
      setAccountsNote('')
      setDisburseAccountId('NONE')
      setDisburseCharge('')
      await fetchData(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve PO')
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
          action: 'REJECTED',
          rejectionReason: reason,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to reject PO')
      toast.success(`${rejectTarget.poNo} rejected`)
      setRejectTarget(null)
      setRejectionReason('')
      await fetchData(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject PO')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Verified Purchase Orders (Accounts)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Review Purchase Orders verified by Procurement Leader / PC and optionally disburse funds directly to the Procurement Member&apos;s wallet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/crm/accounts/procurement-wallets">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Manage Procurement Wallets
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={() => void fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'PENDING_ACCOUNTS_APPROVAL', label: 'Pending Approval' },
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
            placeholder="Search PO, indent, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* List */}
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
              Only Purchase Orders verified by Procurement Leader / PC / Admin appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((po) => (
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
                          po.status === 'PENDING_ACCOUNTS_APPROVAL'
                            ? 'bg-amber-500 text-white'
                            : po.status === 'APPROVED' || po.status === 'FULFILLED'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-destructive text-destructive-foreground'
                        }`}
                      >
                        {po.status.replace(/_/g, ' ')}
                      </Badge>
                      {po.lead?.name && (
                        <span className="text-xs font-bold text-foreground">{po.lead.name}</span>
                      )}
                    </div>

                    <CardDescription className="text-[11px] flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Requested by <strong className="text-foreground">{po.createdBy.fullName}</strong>
                      </span>
                      {po.leadVerifiedBy && (
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <ShieldCheck className="w-3 h-3" />
                          Verified by {po.leadVerifiedBy.fullName}
                        </span>
                      )}
                      {po.lead?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {po.lead.location}
                        </span>
                      )}
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="text-right mr-2">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Total Amount
                      </p>
                      <p className="font-mono text-base font-bold text-foreground">
                        ৳{Number(po.totalAmount).toLocaleString('en-BD')}
                      </p>
                    </div>

                    {po.status === 'PENDING_ACCOUNTS_APPROVAL' && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === po.id}
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
                          disabled={busyId === po.id}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold"
                          onClick={() => {
                            setApproveTarget(po)
                            setAccountsNote('')
                            setDisburseAccountId('NONE')
                            setDisburseCharge('')
                          }}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve PO
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
                        <tr key={item.id}>
                          <td className="py-2 px-4 font-medium">{item.requisitionItem.materialName}</td>
                          <td className="py-2 px-3 text-muted-foreground">
                            {item.vendorName || po.supplierName || '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {Number(item.quantity)} {item.requisitionItem.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            ৳{Number(item.unitPrice).toLocaleString('en-BD')}
                          </td>
                          <td className="py-2 px-4 text-right font-mono font-semibold">
                            ৳{Number(item.total).toLocaleString('en-BD')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve + Optional Wallet Disbursement Dialog */}
      <Dialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Approve {approveTarget?.poNo}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Approve this Purchase Order for ৳{Number(approveTarget?.totalAmount || 0).toLocaleString('en-BD')}. Optionally disburse funds straight into{' '}
              <strong>{approveTarget?.createdBy.fullName}</strong>&apos;s Procurement Wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Add Funds to Procurement Wallet (Optional)</Label>
              <Select value={disburseAccountId} onValueChange={setDisburseAccountId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Do not disburse now (Approve only)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" className="text-xs">
                    Do not disburse now (Approve PO only)
                  </SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                      Disburse from: {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {disburseAccountId !== 'NONE' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={disburseMethod} onValueChange={setDisburseMethod}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER" className="text-xs">Bank Transfer</SelectItem>
                      <SelectItem value="BKASH" className="text-xs">bKash</SelectItem>
                      <SelectItem value="NAGAD" className="text-xs">Nagad</SelectItem>
                      <SelectItem value="CASH" className="text-xs">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Transfer Charge (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={disburseCharge}
                    onChange={(e) => setDisburseCharge(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Accounts Note (Optional)</Label>
              <Textarea
                placeholder="Optional note..."
                value={accountsNote}
                onChange={(e) => setAccountsNote(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setApproveTarget(null)}
              disabled={Boolean(busyId)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => void handleApprove()}
              disabled={Boolean(busyId)}
            >
              {busyId ? 'Processing...' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Reject {rejectTarget?.poNo}</DialogTitle>
            <DialogDescription className="text-xs">
              Provide a reason for rejecting this Purchase Order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">Rejection Reason *</Label>
            <Textarea
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
