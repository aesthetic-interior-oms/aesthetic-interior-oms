'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  FileCheck2,
  HardHat,
  PlusCircle,
  Building2,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  Loader2,
  Calendar,
} from 'lucide-react'

export type CeilingVendorAgreement = {
  id: string
  workOrderNo?: string | null
  workCategory?: string | null
  quotationLineItemId?: string | null
  agreementValue: number
  workScope: string | null
  workStatus: string
  retentionPercent: number
  retentionReleased: boolean
  notes: string | null
  createdAt?: string
  totalPaid: number
  balance: number
  paidPercent: number
  retentionHeld: number
  vendor: {
    id: string
    vendorId: string
    vendorName: string
    vendorCompanyName: string | null
    vendorType: string
    primaryPhone: string | null
    primaryEmail: string | null
  }
  createdBy?: { id: string; fullName: string } | null
  milestones: Array<{
    id: string
    title: string
    amount: number
    dueDate: string | null
    isPaid: boolean
    paidAt: string | null
    notes: string | null
  }>
  payments: Array<{
    id: string
    amount: number
    paymentDate: string
    paymentMethod: string
    voucherNo: string | null
    note: string | null
    milestone: { id: string; title: string } | null
  }>
}

type VendorOption = {
  id: string
  vendorId: string
  vendorName: string
  vendorCompanyName: string | null
  vendorType: string
  status: string
  primaryPhone: string | null
}

const WORK_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  NOT_STARTED: { label: 'Not Started', className: 'bg-muted text-muted-foreground' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  WORK_DONE: { label: 'Work Done', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  CLOSED: { label: 'Closed / Paid', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
}

interface CeilingVendorWorkOrderCardProps {
  leadId: string
  lineItemId?: string
  lineItemTitle: string
  lineItemAmount: number
  lineItemQuantity?: number
  lineItemUnit?: string
  lineItemMaterials?: string | null
  areaName?: string
  activeWorkOrder?: CeilingVendorAgreement | null
  canManage: boolean
  isBoqLeader?: boolean
  isPc?: boolean
  executionMode: 'REQUISITION' | 'WORK_ORDER'
  onChangeExecutionMode: (mode: 'REQUISITION' | 'WORK_ORDER') => void
  onWorkOrderSaved: () => void
}

export function CeilingVendorWorkOrderCard({
  leadId,
  lineItemId,
  lineItemTitle,
  lineItemAmount,
  lineItemQuantity,
  lineItemUnit,
  lineItemMaterials,
  areaName,
  activeWorkOrder,
  canManage,
  isBoqLeader,
  isPc,
  executionMode,
  onChangeExecutionMode,
  onWorkOrderSaved,
}: CeilingVendorWorkOrderCardProps) {
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Work Order Form State
  const [formVendorId, setFormVendorId] = useState('')
  const [formAgreementValue, setFormAgreementValue] = useState('')
  const [formWorkScope, setFormWorkScope] = useState('')
  const [formRetentionPercent, setFormRetentionPercent] = useState('5')
  const [formNotes, setFormNotes] = useState('')
  const [formMilestoneAdvance, setFormMilestoneAdvance] = useState('')
  const [formMilestoneRunning, setFormMilestoneRunning] = useState('')
  const [formMilestoneFinal, setFormMilestoneFinal] = useState('')

  useEffect(() => {
    async function loadVendors() {
      try {
        setLoadingVendors(true)
        const res = await fetch('/api/vendors')
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setVendors(json.data.filter((v: VendorOption) => v.status === 'ACTIVE'))
        }
      } catch (err) {
        console.error('Failed to load vendors', err)
      } finally {
        setLoadingVendors(false)
      }
    }
    loadVendors()
  }, [])

  const handleOpenCreateModal = () => {
    setFormVendorId(activeWorkOrder?.vendor.id || '')
    const targetValue = activeWorkOrder ? activeWorkOrder.agreementValue : Math.round(lineItemAmount * 0.85)
    setFormAgreementValue(String(targetValue))
    setFormWorkScope(
      activeWorkOrder?.workScope ||
        `Ceiling execution for ${lineItemTitle}${areaName ? ` (${areaName})` : ''}. Specs: ${lineItemMaterials || 'Gypsum / Grid Ceiling as per approved drawings'}. Scope includes framing, boards, finishing, and coordination with site engineers.`
    )
    setFormRetentionPercent(String(activeWorkOrder?.retentionPercent ?? 5))
    setFormNotes(activeWorkOrder?.notes || '')

    // Default 30% / 50% / 20% milestones
    if (!activeWorkOrder) {
      const adv = Math.round(targetValue * 0.3)
      const run = Math.round(targetValue * 0.5)
      const fin = targetValue - adv - run
      setFormMilestoneAdvance(String(adv))
      setFormMilestoneRunning(String(run))
      setFormMilestoneFinal(String(fin))
    }
    setIsModalOpen(true)
  }

  const handleSaveWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formVendorId) {
      toast.error('Please choose a vendor / contractor')
      return
    }
    const val = parseFloat(formAgreementValue)
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid agreement value')
      return
    }

    try {
      setIsSubmitting(true)

      const milestones = [
        { title: '1st Milestone: Advance / Mobilization', amount: parseFloat(formMilestoneAdvance) || 0 },
        { title: '2nd Milestone: Framing & Boarding Completion', amount: parseFloat(formMilestoneRunning) || 0 },
        { title: '3rd Milestone: Final Inspection & Handover', amount: parseFloat(formMilestoneFinal) || 0 },
      ].filter((m) => m.amount > 0)

      if (activeWorkOrder) {
        // Update existing agreement
        const res = await fetch(`/api/vendors/agreements/${activeWorkOrder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agreementValue: val,
            workScope: formWorkScope.trim(),
            retentionPercent: parseFloat(formRetentionPercent) || 0,
            notes: formNotes.trim() || null,
            quotationLineItemId: lineItemId,
          }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error || 'Failed to update work order')
        toast.success('Ceiling Work Order updated successfully!')
      } else {
        // Create new agreement
        const res = await fetch('/api/vendors/agreements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            vendorId: formVendorId,
            agreementValue: val,
            workScope: formWorkScope.trim(),
            retentionPercent: parseFloat(formRetentionPercent) || 0,
            notes: formNotes.trim() || null,
            workCategory: 'CEILING',
            quotationLineItemId: lineItemId,
            milestones,
          }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error || 'Failed to create work order')
        toast.success('Ceiling Vendor Work Order issued and synced with Accounts!')
      }

      setIsModalOpen(false)
      onChangeExecutionMode('WORK_ORDER')
      onWorkOrderSaved()
    } catch (err: any) {
      toast.error(err.message || 'Error saving work order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!activeWorkOrder) return
    try {
      const res = await fetch(`/api/vendors/agreements/${activeWorkOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workStatus: newStatus }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(`Work order status updated to ${newStatus}`)
      onWorkOrderSaved()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  const handleDeleteWorkOrder = async () => {
    if (!activeWorkOrder) return
    if (!confirm('Are you sure you want to cancel and remove this vendor work order? Any recorded payments must be removed first.')) return
    try {
      const res = await fetch(`/api/vendors/agreements/${activeWorkOrder.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Ceiling work order removed')
      onChangeExecutionMode('REQUISITION')
      onWorkOrderSaved()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete work order')
    }
  }

  // Margin calculation vs Quotation Line Item
  const variance = useMemo(() => {
    if (!activeWorkOrder || !lineItemAmount) return null
    const diff = lineItemAmount - activeWorkOrder.agreementValue
    const percent = ((diff / lineItemAmount) * 100).toFixed(1)
    return { diff, percent, isPositive: diff >= 0 }
  }, [activeWorkOrder, lineItemAmount])

  const statusConfig = activeWorkOrder
    ? WORK_STATUS_BADGES[activeWorkOrder.workStatus] || WORK_STATUS_BADGES.NOT_STARTED
    : null

  return (
    <div className="space-y-4">
      {/* ─── Workflow Switcher Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border-2 border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-background shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-600 text-white shadow-2xs">
              <HardHat className="w-3 h-3" /> Ceiling Scope Workflow
            </span>
            {activeWorkOrder && (
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 font-mono">
                {activeWorkOrder.workOrderNo || 'WO-CEIL'}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Execute either through internal material requisitions or contract directly via a Vendor Work Order.
          </p>
        </div>

        {/* Segmented Controller */}
        <div className="inline-flex rounded-xl bg-muted/80 p-1 border border-border/60 shadow-2xs">
          <button
            type="button"
            onClick={() => onChangeExecutionMode('REQUISITION')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              executionMode === 'REQUISITION'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Standard Material Requisition
          </button>
          <button
            type="button"
            onClick={() => onChangeExecutionMode('WORK_ORDER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              executionMode === 'WORK_ORDER'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            Direct Vendor Work Order
            {activeWorkOrder && <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* ─── Mode: Direct Vendor Work Order View ─────────────────────────────── */}
      {executionMode === 'WORK_ORDER' && (
        <div>
          {activeWorkOrder ? (
            <Card className="border-2 border-purple-500/40 bg-card overflow-hidden shadow-sm">
              <CardHeader className="bg-purple-500/10 pb-4 border-b border-purple-500/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-extrabold text-foreground flex items-center gap-1.5">
                        <FileCheck2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        {activeWorkOrder.vendor.vendorName}
                      </span>
                      {activeWorkOrder.vendor.vendorCompanyName && (
                        <span className="text-xs text-muted-foreground font-medium">
                          ({activeWorkOrder.vendor.vendorCompanyName})
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs font-mono">
                        {activeWorkOrder.vendor.vendorId}
                      </Badge>
                      {activeWorkOrder.workOrderNo && (
                        <Badge className="bg-purple-700 text-white text-xs font-mono font-bold">
                          {activeWorkOrder.workOrderNo}
                        </Badge>
                      )}
                      <Badge className={`text-xs font-semibold ${statusConfig?.className}`}>
                        {statusConfig?.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {activeWorkOrder.vendor.primaryPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {activeWorkOrder.vendor.primaryPhone}
                        </span>
                      )}
                      {activeWorkOrder.createdBy && (
                        <span className="bg-background/80 px-2 py-0.5 rounded border border-border/60 text-[11px]">
                          Issued by:{' '}
                          <strong className="text-foreground">{activeWorkOrder.createdBy.fullName}</strong>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <ShieldCheck className="w-3.5 h-3.5" /> Synced to Accounts & Finance
                      </span>
                    </div>
                  </div>

                  {/* Actions for Authorized Managers */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {canManage && (
                      <>
                        <Select
                          value={activeWorkOrder.workStatus}
                          onValueChange={(val) => void handleUpdateStatus(val)}
                        >
                          <SelectTrigger className="h-8 text-xs w-[140px] bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="WORK_DONE">Work Done</SelectItem>
                            <SelectItem value="CLOSED">Closed / Paid</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleOpenCreateModal}
                          className="h-8 text-xs gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit Order
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleDeleteWorkOrder()}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                          title="Delete / cancel work order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                {/* Commercial Terms Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/50 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">
                      Work Order Value
                    </span>
                    <p className="text-base font-extrabold text-foreground mt-0.5">
                      ৳{activeWorkOrder.agreementValue.toLocaleString('en-BD')}
                    </p>
                    {variance && (
                      <span
                        className={`text-[11px] font-semibold flex items-center gap-0.5 mt-0.5 ${
                          variance.isPositive ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {variance.isPositive ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                        {variance.isPositive ? 'Saved' : 'Cost +'} ৳{Math.abs(variance.diff).toLocaleString('en-BD')} ({variance.percent}%)
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">
                      Quoted Scope Amount
                    </span>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      ৳{lineItemAmount.toLocaleString('en-BD')}
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      Client quotation baseline
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">
                      Paid to Date
                    </span>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ৳{activeWorkOrder.totalPaid.toLocaleString('en-BD')}
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {activeWorkOrder.paidPercent.toFixed(0)}% disbursed
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">
                      Outstanding Payable
                    </span>
                    <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      ৳{activeWorkOrder.balance.toLocaleString('en-BD')}
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      Retention: {activeWorkOrder.retentionPercent}% (৳{activeWorkOrder.retentionHeld.toLocaleString('en-BD')})
                    </span>
                  </div>
                </div>

                {/* Scope & Description */}
                {activeWorkOrder.workScope && (
                  <div className="rounded-xl border border-border/60 bg-muted/15 p-3.5 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Contract Scope & Technical Details
                    </span>
                    <p className="text-xs leading-relaxed text-foreground whitespace-pre-line">
                      {activeWorkOrder.workScope}
                    </p>
                  </div>
                )}

                {/* Payment Milestones Breakdown */}
                {activeWorkOrder.milestones && activeWorkOrder.milestones.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-purple-600" /> Payment Terms & Milestones
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {activeWorkOrder.milestones.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-background text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold truncate text-foreground">{m.title}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {m.dueDate ? `Due: ${new Date(m.dueDate).toLocaleDateString()}` : 'Scheduled'}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold tabular-nums">৳{m.amount.toLocaleString('en-BD')}</span>
                            <span
                              className={`block text-[10px] font-bold ${
                                m.isPaid ? 'text-emerald-600' : 'text-muted-foreground'
                              }`}
                            >
                              {m.isPaid ? '✓ Paid' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notice for BOQ Team Member Reconciliation */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-500/25 bg-blue-500/5 text-xs text-blue-900 dark:text-blue-200">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">BOQ Reconciliation Note</p>
                    <p className="text-[11px] text-blue-800/90 dark:text-blue-300/90 leading-relaxed">
                      Ceiling execution for this quoted line item is handled directly by vendor{' '}
                      <strong>{activeWorkOrder.vendor.vendorName}</strong>. Standard internal raw-material
                      requisition is bypassed to avoid redundant purchasing. Track vendor milestone progress and
                      coordinate site inspections with Accounts and Site Engineers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* No Work Order issued yet */
            <div className="rounded-2xl border-2 border-dashed border-purple-400/40 bg-purple-500/[0.03] p-8 text-center space-y-3">
              <HardHat className="w-9 h-9 mx-auto text-purple-600/60 dark:text-purple-400/60" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  Direct Vendor Work Order Mode Selected
                </h4>
                <p className="text-xs text-muted-foreground max-w-lg mx-auto">
                  Outsource this ceiling scope item directly to an external contractor. Financial terms will
                  automatically surface to Accounts for billing and milestone disbursements.
                </p>
              </div>

              {canManage ? (
                <Button
                  onClick={handleOpenCreateModal}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" /> Issue Ceiling Vendor Work Order
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg max-w-md mx-auto border border-border/60">
                  <span className="font-bold text-foreground">Pending Work Order Issuance:</span>
                  <br />
                  Only the <strong>BOQ Team Leader</strong> or <strong>Project Coordinator</strong> can generate and
                  finalize the vendor agreement for this item.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Create / Edit Work Order Modal ─────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleSaveWorkOrder}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <HardHat className="w-5 h-5 text-purple-600" />
                {activeWorkOrder ? 'Edit Ceiling Work Order' : 'Generate Ceiling Vendor Work Order'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Issue a direct contractor work order for <strong>{lineItemTitle}</strong>. Contract value and
                milestone terms will automatically sync to Accounts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Vendor Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="vendor" className="font-bold">
                  Ceiling Vendor / Contractor *
                </Label>
                {loadingVendors ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading active vendors...
                  </div>
                ) : (
                  <Select value={formVendorId} onValueChange={setFormVendorId}>
                    <SelectTrigger id="vendor" className="h-9 text-xs">
                      <SelectValue placeholder="Select contractor / vendor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.vendorName} {v.vendorCompanyName ? `(${v.vendorCompanyName})` : ''} — {v.vendorType} [
                          {v.vendorId}]
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Value & Retention */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="val" className="font-bold">
                    Agreed Work Order Value (৳) *
                  </Label>
                  <Input
                    id="val"
                    type="number"
                    value={formAgreementValue}
                    onChange={(e) => {
                      const v = e.target.value
                      setFormAgreementValue(v)
                      const num = parseFloat(v) || 0
                      if (num > 0) {
                        const adv = Math.round(num * 0.3)
                        const run = Math.round(num * 0.5)
                        const fin = num - adv - run
                        setFormMilestoneAdvance(String(adv))
                        setFormMilestoneRunning(String(run))
                        setFormMilestoneFinal(String(fin))
                      }
                    }}
                    placeholder="e.g. 45000"
                    className="h-9 text-xs font-bold"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Quoted budget: ৳{lineItemAmount.toLocaleString('en-BD')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ret" className="font-bold">
                    Retention Withheld (%)
                  </Label>
                  <Input
                    id="ret"
                    type="number"
                    value={formRetentionPercent}
                    onChange={(e) => setFormRetentionPercent(e.target.value)}
                    placeholder="5"
                    className="h-9 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Held until defect liability completion
                  </span>
                </div>
              </div>

              {/* Scope of Work */}
              <div className="space-y-1.5">
                <Label htmlFor="scope" className="font-bold">
                  Work Scope & Specifications *
                </Label>
                <Textarea
                  id="scope"
                  rows={3}
                  value={formWorkScope}
                  onChange={(e) => setFormWorkScope(e.target.value)}
                  placeholder="Detail ceiling execution, materials, framework, and deliverables..."
                  className="text-xs"
                  required
                />
              </div>

              {/* Milestones (if creating new) */}
              {!activeWorkOrder && (
                <div className="space-y-2 rounded-xl bg-muted/30 p-3 border border-border/60">
                  <Label className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground block">
                    Standard Payment Milestones
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Advance (30%)</span>
                      <Input
                        type="number"
                        value={formMilestoneAdvance}
                        onChange={(e) => setFormMilestoneAdvance(e.target.value)}
                        className="h-8 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Running (50%)</span>
                      <Input
                        type="number"
                        value={formMilestoneRunning}
                        onChange={(e) => setFormMilestoneRunning(e.target.value)}
                        className="h-8 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Final (20%)</span>
                      <Input
                        type="number"
                        value={formMilestoneFinal}
                        onChange={(e) => setFormMilestoneFinal(e.target.value)}
                        className="h-8 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Terms / Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="font-bold">
                  Special Notes & Terms
                </Label>
                <Input
                  id="notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Site access rules, penalty clauses, milestone deadlines..."
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </span>
                ) : activeWorkOrder ? (
                  'Update Work Order'
                ) : (
                  'Issue & Sync with Accounts'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
