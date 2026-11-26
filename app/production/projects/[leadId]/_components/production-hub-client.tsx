'use client'

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, Package,
  Truck, FileText, Users, ChevronDown, ChevronUp,
  AlertCircle, ExternalLink, PlusCircle, ShieldCheck, Building2,
  MapPin, Phone, Loader2, Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

type POStatus = 'PENDING_LEAD_APPROVAL' | 'PENDING_ACCOUNTS_APPROVAL' | 'APPROVED' | 'REJECTED' | 'FULFILLED'

type PurchaseOrder = {
  id: string
  poNo: string
  status: POStatus
  totalAmount: number
  supplierName: string | null
  notes: string | null
  accountsNote: string | null
  rejectionReason: string | null
  createdAt: string
  approvedAt: string | null
  createdBy: { fullName: string }
  approvedBy: { fullName: string } | null
  rejectedBy: { fullName: string } | null
}

type Indent = {
  id: string
  indentNo: string
  vendorName: string | null
  total: string | number
  transportCost: string | number
  otherCosts: string | number
  notes: string | null
  createdAt: string
  createdBy: { fullName: string }
  purchaseOrder: PurchaseOrder | null
}

type Requisition = {
  id: string
  requisitionNo: string
  status: string
  notes: string | null
  createdAt: string
  createdBy: { fullName: string }
  procurementAssignee: { id: string; fullName: string } | null
  _count: { items: number }
  indents: Indent[]
}

type Assignment = {
  department: string
  user: { fullName: string; phone?: string }
}

type DeliveryLog = {
  id: string
  challanNo: string | null
  vendorName: string | null
  itemsSummary: string
  quantity: number | null
  unit: string | null
  deliveryDate: string
  condition: string
  receivedBy: { fullName: string }
}

type CeilingWorkOrder = {
  id: string
  workOrderNo: string | null
  agreementValue: number
  workStatus: string
  workScope: string | null
  notes: string | null
  vendor: { vendorName: string; vendorCompanyName: string | null } | null
  createdBy: { fullName: string } | null
}

type HubData = {
  id: string
  name: string
  phone: string | null
  location: string | null
  stage: string
  agreementValue: number | null
  agreementType: string | null
  assignments: Assignment[]
  materialRequisitions: Requisition[]
  siteDeliveryLogs: DeliveryLog[]
  vendorAgreements: CeilingWorkOrder[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function poStatusBadge(status: POStatus) {
  switch (status) {
    case 'PENDING_LEAD_APPROVAL':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800"><Clock className="w-3 h-3" />Pending Leader/PC Verification</span>
    case 'PENDING_ACCOUNTS_APPROVAL':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"><Clock className="w-3 h-3" />Pending Accounts Approval</span>
    case 'APPROVED':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><CheckCircle2 className="w-3 h-3" />Approved</span>
    case 'REJECTED':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800"><XCircle className="w-3 h-3" />Rejected</span>
    case 'FULFILLED':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"><ShieldCheck className="w-3 h-3" />Fulfilled</span>
  }
}

function reqStatusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-muted text-muted-foreground border-border',
    SUBMITTED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    IN_PROCUREMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    FULFILLED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800',
    CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-400 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${map[status] ?? map.DRAFT}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function fmt(val: string | number): string {
  return Number(val).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = 'requisitions' | 'indents_pos' | 'deliveries' | 'team' | 'ceiling'

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'requisitions', label: 'Requisitions', icon: <Package className="w-4 h-4" /> },
  { key: 'indents_pos', label: 'Indents & POs', icon: <FileText className="w-4 h-4" /> },
  { key: 'deliveries', label: 'Deliveries', icon: <Truck className="w-4 h-4" /> },
  { key: 'ceiling', label: 'Ceiling Work Orders', icon: <Building2 className="w-4 h-4" /> },
  { key: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> },
]

// ─── PO Action Modal ──────────────────────────────────────────────────────────

function POApprovalCard({
  po,
  canApprove,
  onDone,
}: {
  po: PurchaseOrder
  canApprove: boolean
  onDone: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')

  async function act(action: 'APPROVED' | 'REJECTED') {
    if (action === 'REJECTED' && !reason.trim()) {
      toast.error('Enter a rejection reason')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/procurement/purchase-orders/${po.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason: reason, accountsNote: note }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(action === 'APPROVED' ? 'PO Approved' : 'PO Rejected')
      onDone()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-sm">{po.poNo}</span>
            {poStatusBadge(po.status)}
          </div>
          {po.supplierName && <div className="text-xs text-muted-foreground mt-0.5">Supplier: {po.supplierName}</div>}
          <div className="text-xs text-muted-foreground">Created by {po.createdBy.fullName} · {new Date(po.createdAt).toLocaleDateString('en-GB')}</div>
          {po.notes && <div className="text-xs text-muted-foreground italic">{po.notes}</div>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-foreground">৳{fmt(po.totalAmount)}</div>
        </div>
      </div>

      {po.status === 'REJECTED' && po.rejectionReason && (
        <div className="text-xs rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-2 text-red-700 dark:text-red-300">
          <span className="font-semibold">Rejected:</span> {po.rejectionReason}
          {po.rejectedBy && <span className="ml-1">— {po.rejectedBy.fullName}</span>}
        </div>
      )}
      {po.status === 'APPROVED' && (
        <div className="text-xs rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2 text-emerald-700 dark:text-emerald-300">
          <span className="font-semibold">Approved</span>{po.approvedBy ? ` by ${po.approvedBy.fullName}` : ''}
          {po.approvedAt ? ` · ${new Date(po.approvedAt).toLocaleDateString('en-GB')}` : ''}
          {po.accountsNote && <div className="mt-0.5">{po.accountsNote}</div>}
        </div>
      )}

      {/* Approval actions — Accounts only, pending POs only */}
      {canApprove && po.status === 'PENDING_ACCOUNTS_APPROVAL' && (
        <div className="space-y-2 pt-1 border-t border-border">
          <Input
            placeholder="Accounts note (optional)"
            className="h-8 text-xs"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {showReject && (
            <Textarea
              placeholder="Rejection reason (required)"
              className="text-xs min-h-[60px] resize-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              disabled={loading}
              onClick={() => act('APPROVED')}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Approve PO
            </Button>
            {!showReject ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950 gap-1"
                onClick={() => setShowReject(true)}
                disabled={loading}
              >
                <XCircle className="w-3 h-3" />
                Reject
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                  disabled={loading || !reason.trim()}
                  onClick={() => act('REJECTED')}
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                  Confirm Reject
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowReject(false)}>Cancel</Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Generate PO Button (Procurement) ────────────────────────────────────────

function GeneratePOButton({ indent, onDone }: { indent: Indent; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supplier, setSupplier] = useState(indent.vendorName ?? '')
  const [notes, setNotes] = useState('')

  async function create() {
    setLoading(true)
    try {
      const res = await fetch('/api/procurement/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indentId: indent.id, supplierName: supplier, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create PO')
      toast.success(`Purchase Order ${data.data.poNo} created — sent to Accounts for approval`)
      setOpen(false)
      onDone()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setOpen(true)}>
        <PlusCircle className="w-3 h-3" />
        Generate PO
      </Button>
    )
  }

  return (
    <div className="border border-border rounded p-3 space-y-2 bg-muted/40">
      <p className="text-xs font-medium">Generate Purchase Order for <span className="font-mono">{indent.indentNo}</span></p>
      <Input placeholder="Supplier name (optional)" className="h-7 text-xs" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
      <Textarea placeholder="Notes (optional)" className="text-xs min-h-[48px] resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" disabled={loading} onClick={create}>
          {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
          Create PO → Accounts
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── Main Hub Client Component ────────────────────────────────────────────────

export default function ProductionHubClient({
  data,
  leadId,
  permissions,
}: {
  data: HubData
  leadId: string
  permissions: {
    isAccounts: boolean
    isBOQLeader: boolean
    isBOQMember: boolean
    isPC: boolean
    isProcurement: boolean
    isProcurementLeader: boolean
    isSiteEngineer: boolean
    isAdmin: boolean
    currentUserId: string
    canViewPO: boolean
  }
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    // Default tab based on role
    if (permissions.isAccounts) return 'indents_pos'
    if (permissions.isSiteEngineer) return 'deliveries'
    if (permissions.isProcurement) return 'indents_pos'
    return 'requisitions'
  })

  const refresh = useCallback(() => router.refresh(), [router])

  const { data: lead } = { data }

  // Flatten all indents across requisitions
  const allIndents = data.materialRequisitions.flatMap((r) =>
    r.indents.map((indent) => ({ ...indent, requisitionNo: r.requisitionNo, requisitionId: r.id }))
  )
  const pendingPOs = allIndents.filter((i) => i.purchaseOrder?.status === 'PENDING_ACCOUNTS_APPROVAL')

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Back + header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Button asChild variant="ghost" size="sm" className="self-start -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/production/projects">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            All Projects
          </Link>
        </Button>
      </div>

      {/* Project Card */}
      <div className="rounded-xl border bg-card shadow-sm p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{data.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {data.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{data.location}</span>
              )}
              {data.phone && (
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{data.phone}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {data.stage.replace(/_/g, ' ')}
            </span>
            {data.agreementValue && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                ৳{data.agreementValue.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Accounts-specific alert for pending POs */}
        {permissions.isAccounts && pendingPOs.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <span className="font-semibold">{pendingPOs.length} Purchase Order{pendingPOs.length !== 1 ? 's' : ''}</span> awaiting your approval
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto h-7 text-xs border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
              onClick={() => setActiveTab('indents_pos')}
            >
              Review POs
            </Button>
          </div>
        )}

        {/* Quick links based on role */}
        <div className="flex flex-wrap gap-2 pt-1">
          {(permissions.isBOQLeader || permissions.isBOQMember || permissions.isAdmin) && (
            <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
              <Link href={`/crm/boq/builder/${leadId}`} target="_blank">
                <ExternalLink className="w-3.5 h-3.5" />
                BOQ Builder
              </Link>
            </Button>
          )}
          {permissions.isProcurement && (
            <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
              <Link href="/procurement/billing-center" target="_blank">
                <ExternalLink className="w-3.5 h-3.5" />
                Billing Center
              </Link>
            </Button>
          )}
          {permissions.isAccounts && (
            <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
              <Link href={`/crm/accounts/projects/${leadId}`} target="_blank">
                <ExternalLink className="w-3.5 h-3.5" />
                Financial Detail
              </Link>
            </Button>
          )}
          {permissions.isSiteEngineer && (
            <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
              <Link href="/site-engineer/delivery" target="_blank">
                <ExternalLink className="w-3.5 h-3.5" />
                Log Delivery
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'indents_pos' && pendingPOs.length > 0 && permissions.isAccounts && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                  {pendingPOs.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Requisitions ───────────────────────────────────────────────── */}
      {activeTab === 'requisitions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Material Requisitions</h2>
            <span className="text-xs text-muted-foreground">{data.materialRequisitions.length} total</span>
          </div>

          {data.materialRequisitions.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center space-y-2">
              <Package className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No requisitions created yet</p>
              {(permissions.isBOQLeader || permissions.isBOQMember) && (
                <Button asChild size="sm" variant="outline" className="mt-2 text-xs">
                  <Link href={`/crm/boq/builder/${leadId}`}>Create in BOQ Builder</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {data.materialRequisitions.map((req) => {
                const isLocked = req.indents.some((i) => i.purchaseOrder && ['APPROVED', 'FULFILLED'].includes(i.purchaseOrder.status))
                return (
                  <div key={req.id} className="rounded-xl border bg-card shadow-sm p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-sm">{req.requisitionNo}</span>
                          {reqStatusBadge(req.status)}
                          {isLocked && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                              🔒 PO Issued — Locked
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {req._count.items} items · Created by {req.createdBy.fullName} · {new Date(req.createdAt).toLocaleDateString('en-GB')}
                        </div>
                        {req.procurementAssignee && (
                          <div className="text-xs text-muted-foreground">Procurement: {req.procurementAssignee.fullName}</div>
                        )}
                        {req.notes && <div className="text-xs italic text-muted-foreground">{req.notes}</div>}
                      </div>
                      <div className="text-right text-xs text-muted-foreground shrink-0">
                        {req.indents.length} indent{req.indents.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Indent mini-list */}
                    {req.indents.length > 0 && (
                      <div className="pt-1 border-t border-border space-y-1">
                        {req.indents.map((indent) => (
                          <div key={indent.id} className="flex items-center justify-between gap-2 text-xs py-1">
                            <span className="font-mono text-muted-foreground">{indent.indentNo}</span>
                            <span className="text-muted-foreground">{indent.vendorName || 'No vendor'}</span>
                            <span className="font-semibold">৳{fmt(indent.total)}</span>
                            {indent.purchaseOrder
                              ? poStatusBadge(indent.purchaseOrder.status)
                              : <span className="text-muted-foreground italic">No PO</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick link to billing center for procurement */}
                    {permissions.isProcurement && ['SUBMITTED', 'IN_PROCUREMENT'].includes(req.status) && (
                      <div className="pt-1">
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                          <Link href={`/procurement/billing-center/${req.id}`}>
                            <ExternalLink className="w-3 h-3" />
                            Open Bill Maker
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Indents & POs ───────────────────────────────────────────────── */}
      {activeTab === 'indents_pos' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Indents & Purchase Orders</h2>
            <span className="text-xs text-muted-foreground">{allIndents.length} indent{allIndents.length !== 1 ? 's' : ''}</span>
          </div>

          {allIndents.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center space-y-2">
              <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No indents created yet</p>
              <p className="text-xs text-muted-foreground">Procurement creates indents from the Billing Center after pricing materials.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allIndents.map((indent) => (
                <div key={indent.id} className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
                  {/* Indent header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm">{indent.indentNo}</span>
                        <span className="text-xs text-muted-foreground">← {indent.requisitionNo}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {indent.vendorName || 'No vendor'} · {new Date(indent.createdAt).toLocaleDateString('en-GB')} · {indent.createdBy.fullName}
                      </div>
                      {indent.notes && <div className="text-xs italic text-muted-foreground">{indent.notes}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold">৳{fmt(indent.total)}</div>
                      <div className="text-xs text-muted-foreground">subtotal + transport + other</div>
                    </div>
                  </div>

                  {/* PO section */}
                  {indent.purchaseOrder ? (
                    <POApprovalCard
                      po={indent.purchaseOrder}
                      canApprove={permissions.isAccounts}
                      onDone={refresh}
                    />
                  ) : (
                    <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">No Purchase Order yet for this indent</p>
                      {permissions.isProcurement && (
                        <GeneratePOButton indent={indent} onDone={refresh} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Deliveries ──────────────────────────────────────────────────── */}
      {activeTab === 'deliveries' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Site Deliveries</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{data.siteDeliveryLogs.length} log{data.siteDeliveryLogs.length !== 1 ? 's' : ''}</span>
              {permissions.isSiteEngineer && (
                <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <Link href="/site-engineer/delivery">
                    <PlusCircle className="w-3 h-3" />
                    Log Delivery
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {data.siteDeliveryLogs.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center space-y-2">
              <Truck className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No delivery logs yet</p>
              <p className="text-xs text-muted-foreground">Site Engineer logs deliveries from the Site Engineer portal.</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-[11px] uppercase font-medium text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Qty / Unit</th>
                    <th className="px-4 py-3">Condition</th>
                    <th className="px-4 py-3">Received By</th>
                    <th className="px-4 py-3">Challan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.siteDeliveryLogs.map((log) => {
                    const conditionMap: Record<string, string> = {
                      GOOD: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                      PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                      DAMAGED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
                      REJECTED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                    }
                    return (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{new Date(log.deliveryDate).toLocaleDateString('en-GB')}</td>
                        <td className="px-4 py-3 text-muted-foreground">{log.vendorName || '—'}</td>
                        <td className="px-4 py-3">{log.itemsSummary}</td>
                        <td className="px-4 py-3 text-muted-foreground">{log.quantity ? `${log.quantity} ${log.unit ?? ''}`.trim() : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${conditionMap[log.condition] ?? ''}`}>
                            {log.condition}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{log.receivedBy.fullName}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{log.challanNo || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Ceiling Work Orders ─────────────────────────────────────────── */}
      {activeTab === 'ceiling' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Ceiling Work Orders</h2>
            <span className="text-xs text-muted-foreground">{data.vendorAgreements.length} work order{data.vendorAgreements.length !== 1 ? 's' : ''}</span>
          </div>

          {data.vendorAgreements.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center space-y-2">
              <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No ceiling work orders yet</p>
              {(permissions.isBOQLeader || permissions.isPC || permissions.isAdmin) && (
                <p className="text-xs text-muted-foreground">Create ceiling work orders from the BOQ Builder.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {data.vendorAgreements.map((wo) => {
                const statusMap: Record<string, string> = {
                  NOT_STARTED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
                  WORK_DONE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                  CLOSED: 'bg-muted text-muted-foreground',
                }
                return (
                  <div key={wo.id} className="rounded-xl border bg-card shadow-sm p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {wo.workOrderNo && <span className="font-mono font-semibold text-sm">WO: {wo.workOrderNo}</span>}
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusMap[wo.workStatus] ?? ''}`}>
                            {wo.workStatus.replace(/_/g, ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">CEILING</span>
                        </div>
                        {wo.vendor && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {wo.vendor.vendorCompanyName || wo.vendor.vendorName}
                          </div>
                        )}
                        {wo.workScope && <div className="text-xs text-muted-foreground">{wo.workScope}</div>}
                        {wo.notes && <div className="text-xs italic text-muted-foreground">{wo.notes}</div>}
                        {wo.createdBy && <div className="text-xs text-muted-foreground">Created by {wo.createdBy.fullName}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold">৳{wo.agreementValue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Agreement Value</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Team ────────────────────────────────────────────────────────── */}
      {activeTab === 'team' && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Project Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.assignments.length === 0 ? (
              <div className="col-span-full rounded-xl border bg-card p-10 text-center space-y-2">
                <Users className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">No team assignments yet</p>
              </div>
            ) : (
              (() => {
                const grouped: Record<string, { fullName: string; phone?: string }[]> = {}
                for (const a of data.assignments) {
                  if (!grouped[a.department]) grouped[a.department] = []
                  grouped[a.department].push(a.user)
                }
                return Object.entries(grouped).map(([dept, members]) => (
                  <div key={dept} className="rounded-xl border bg-card shadow-sm p-4 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {dept.replace(/_/g, ' ')}
                    </div>
                    <div className="space-y-1">
                      {members.map((m, i) => (
                        <div key={i} className="text-sm font-medium text-foreground">{m.fullName}</div>
                      ))}
                    </div>
                  </div>
                ))
              })()
            )}
          </div>
        </div>
      )}
    </div>
  )
}
