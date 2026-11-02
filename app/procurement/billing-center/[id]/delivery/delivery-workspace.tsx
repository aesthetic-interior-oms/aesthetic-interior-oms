'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react'
import {
  Truck,
  Calendar,
  Paperclip,
  FileText,
  Search,
  ExternalLink,
  History,
  FileCheck,
  Trash2,
  UploadCloud,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  saveItemDeliveryDateAction,
  logDeliveryBatchAction,
  attachItemDocumentAction,
  removeAttachedDocumentAction,
  ItemPurchaseRecord,
  ItemDeliveryRecord,
  DeliveryBatch,
  AttachedDocument,
} from '../actions'
import {
  MaterialScopeDisplay,
  getMaterialDisplayName,
} from '../_components/material-scope-display'

export type RequisitionItemWithRecords = {
  id: string
  requisitionId: string
  materialName: string
  workCategory: string
  specifications: string | null
  variantAttributes: any
  netQuantity: number
  finalQuantity: number
  unit: string
  productionPhase: string | null
  remarks: string | null
}

interface DeliveryWorkspaceProps {
  requisition: {
    id: string
    requisitionNo: string
    status: string
    lead: {
      id: string
      name: string
      location: string | null
      phone: string | null
      stage: string
    }
    createdBy: {
      fullName: string | null
    }
    items: RequisitionItemWithRecords[]
  }
}

export function DeliveryWorkspace({ requisition }: DeliveryWorkspaceProps) {
  const [items, setItems] = useState<RequisitionItemWithRecords[]>(requisition.items)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'DELIVERED'>('ALL')

  // Modal 1: Log Delivery Batch
  const [batchModalItem, setBatchModalItem] = useState<RequisitionItemWithRecords | null>(null)
  const [batchQty, setBatchQty] = useState<string>('')
  const [batchDate, setBatchDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [batchChallan, setBatchChallan] = useState<string>('')
  const [batchReceiver, setBatchReceiver] = useState<string>('')
  const [batchNotes, setBatchNotes] = useState<string>('')
  const [isSavingBatch, setIsSavingBatch] = useState(false)

  // Modal 2: Expected Date / Set Date
  const [dateModalItem, setDateModalItem] = useState<RequisitionItemWithRecords | null>(null)
  const [newExpectedDate, setNewExpectedDate] = useState<string>('')
  const [dateChangeReason, setDateChangeReason] = useState<string>('')
  const [isSavingDate, setIsSavingDate] = useState(false)

  // Modal 3: Documents & Invoices (Delivery Challans / Invoices)
  const [docModalItem, setDocModalItem] = useState<RequisitionItemWithRecords | null>(null)
  const [newDocName, setNewDocName] = useState('')
  const [newDocUrl, setNewDocUrl] = useState('')
  const [isAttachingDoc, setIsAttachingDoc] = useState(false)

  // Calculations for purchase costs across all line items
  const costSummary = useMemo(() => {
    let totalMaterialSpend = 0
    let totalPaidToSuppliers = 0
    let totalRequiredUnits = 0
    let totalDeliveredUnits = 0

    items.forEach((item) => {
      const attrs = (item.variantAttributes || {}) as Record<string, any>
      const p: ItemPurchaseRecord = attrs.purchaseRecord || attrs.billingRecord
      const d: ItemDeliveryRecord = attrs.deliveryRecord

      totalRequiredUnits += item.finalQuantity || 0
      totalDeliveredUnits += d?.totalDelivered || 0

      if (p && p.isBought) {
        totalMaterialSpend += Number(p.totalAmount) || 0
        totalPaidToSuppliers += Number(p.paidAmount) || 0
      }
    })

    const totalDueAmount = Math.max(0, totalMaterialSpend - totalPaidToSuppliers)
    const deliveryPercent = totalRequiredUnits > 0
      ? Math.min(100, Math.round((totalDeliveredUnits / totalRequiredUnits) * 100))
      : 0

    return {
      totalMaterialSpend,
      totalPaidToSuppliers,
      totalDueAmount,
      totalRequiredUnits,
      totalDeliveredUnits,
      deliveryPercent,
    }
  }, [items])

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const attrs = (item.variantAttributes || {}) as Record<string, any>
      const d: ItemDeliveryRecord = attrs.deliveryRecord
      const delStatus = d?.deliveryStatus || 'PENDING'

      if (statusFilter === 'PENDING' && delStatus !== 'PENDING') return false
      if (statusFilter === 'PARTIAL' && delStatus !== 'PARTIALLY_DELIVERED') return false
      if (statusFilter === 'DELIVERED' && delStatus !== 'FULLY_DELIVERED') return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = item.materialName.toLowerCase().includes(q)
        const matchCat = item.workCategory.toLowerCase().includes(q)
        return matchName || matchCat
      }
      return true
    })
  }, [items, statusFilter, searchQuery])

  // Open Log Batch Modal
  const handleOpenBatchModal = (item: RequisitionItemWithRecords) => {
    const attrs = (item.variantAttributes || {}) as Record<string, any>
    const d: ItemDeliveryRecord = attrs.deliveryRecord
    const remaining = Math.max(0, item.finalQuantity - (d?.totalDelivered || 0))

    setBatchModalItem(item)
    setBatchQty(String(remaining > 0 ? remaining : item.finalQuantity))
    setBatchDate(new Date().toISOString().split('T')[0])
    setBatchChallan('')
    setBatchReceiver('')
    setBatchNotes('')
  }

  // Save Delivery Batch
  const handleSaveDeliveryBatch = async () => {
    if (!batchModalItem) return
    const qty = parseFloat(batchQty)
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid delivered quantity')
      return
    }

    setIsSavingBatch(true)
    try {
      const res = await logDeliveryBatchAction({
        itemId: batchModalItem.id,
        requisitionId: requisition.id,
        quantity: qty,
        deliveryDate: batchDate,
        challanNo: batchChallan,
        receivedBy: batchReceiver,
        notes: batchNotes,
      })

      // Update state in place
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== batchModalItem.id) return it
          const attrs = (it.variantAttributes || {}) as Record<string, any>
          return {
            ...it,
            variantAttributes: {
              ...attrs,
              deliveryRecord: res.delivery,
            },
          }
        })
      )
      setBatchModalItem(null)
    } catch (err) {
      console.error(err)
      alert('Failed to log delivery batch')
    } finally {
      setIsSavingBatch(false)
    }
  }

  // Open Expected Date Modal
  const handleOpenDateModal = (item: RequisitionItemWithRecords) => {
    const attrs = (item.variantAttributes || {}) as Record<string, any>
    const d: ItemDeliveryRecord = attrs.deliveryRecord

    setDateModalItem(item)
    setNewExpectedDate(d?.expectedDeliveryDate || '')
    setDateChangeReason('')
  }

  // Save Expected Date
  const handleSaveExpectedDate = async () => {
    if (!dateModalItem || !newExpectedDate) {
      alert('Please select an expected delivery date')
      return
    }

    setIsSavingDate(true)
    try {
      const res = await saveItemDeliveryDateAction({
        itemId: dateModalItem.id,
        requisitionId: requisition.id,
        expectedDeliveryDate: newExpectedDate,
        reason: dateChangeReason,
      })

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== dateModalItem.id) return it
          const attrs = (it.variantAttributes || {}) as Record<string, any>
          return {
            ...it,
            variantAttributes: {
              ...attrs,
              deliveryRecord: res.delivery,
            },
          }
        })
      )
      setDateModalItem(null)
    } catch (err) {
      console.error(err)
      alert('Failed to update expected delivery date')
    } finally {
      setIsSavingDate(false)
    }
  }

  // Attach Document (Delivery Challan / Invoice)
  const handleAttachDocument = async () => {
    if (!docModalItem || !newDocName.trim() || !newDocUrl.trim()) {
      alert('Please provide document title and URL')
      return
    }

    const doc: AttachedDocument = {
      id: `DOC-DEL-${Date.now().toString().slice(-6)}`,
      name: newDocName.trim(),
      url: newDocUrl.trim(),
      uploadedAt: new Date().toISOString(),
    }

    setIsAttachingDoc(true)
    try {
      await attachItemDocumentAction({
        itemId: docModalItem.id,
        requisitionId: requisition.id,
        target: 'DELIVERY',
        document: doc,
      })

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== docModalItem.id) return it
          const attrs = (it.variantAttributes || {}) as Record<string, any>
          const dRec: ItemDeliveryRecord = attrs.deliveryRecord || {
            batches: [],
            totalDelivered: 0,
            deliveryStatus: 'PENDING',
          }
          const docs = [...(dRec.documents || []), doc]
          return {
            ...it,
            variantAttributes: {
              ...attrs,
              deliveryRecord: { ...dRec, documents: docs },
            },
          }
        })
      )

      setNewDocName('')
      setNewDocUrl('')
    } catch (err) {
      console.error(err)
      alert('Failed to attach document')
    } finally {
      setIsAttachingDoc(false)
    }
  }

  // Remove Document
  const handleRemoveDocument = async (docId: string) => {
    if (!docModalItem) return
    try {
      await removeAttachedDocumentAction({
        itemId: docModalItem.id,
        requisitionId: requisition.id,
        target: 'DELIVERY',
        documentId: docId,
      })

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== docModalItem.id) return it
          const attrs = (it.variantAttributes || {}) as Record<string, any>
          const dRec: ItemDeliveryRecord = attrs.deliveryRecord
          if (!dRec || !dRec.documents) return it
          const docs = dRec.documents.filter((d) => d.id !== docId)
          return {
            ...it,
            variantAttributes: {
              ...attrs,
              deliveryRecord: { ...dRec, documents: docs },
            },
          }
        })
      )
    } catch (err) {
      console.error(err)
      alert('Failed to remove document')
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Cost KPI Cards: All Purchase Line Costs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Material Spend */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Material Spend
          </span>
          <div className="font-bold font-mono text-foreground text-xl sm:text-2xl">
            ৳{costSummary.totalMaterialSpend.toLocaleString('en-BD')}
          </div>
          <p className="text-xs text-muted-foreground">Base + Transport + Other</p>
        </div>

        {/* Paid to Suppliers */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Paid to Suppliers
          </span>
          <div className="font-bold font-mono text-foreground text-xl sm:text-2xl">
            ৳{costSummary.totalPaidToSuppliers.toLocaleString('en-BD')}
          </div>
          <p className="text-xs text-muted-foreground">Disbursed by Accounts</p>
        </div>

        {/* Due Amount */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Due / Payable Amount
          </span>
          <div className="font-bold font-mono text-foreground text-xl sm:text-2xl">
            ৳{costSummary.totalDueAmount.toLocaleString('en-BD')}
          </div>
          <p className="text-xs text-muted-foreground">Pending supplier payment</p>
        </div>

        {/* Overall Delivery Progress */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Site Delivery Progress
            </span>
            <span className="text-xs font-mono font-bold text-foreground">
              {costSummary.deliveryPercent}%
            </span>
          </div>
          <div className="font-bold text-foreground text-xl sm:text-2xl">
            {costSummary.totalDeliveredUnits} / {costSummary.totalRequiredUnits} units
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className="bg-foreground h-1.5 rounded-full transition-all"
              style={{ width: `${costSummary.deliveryPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Delivery Search & Status Filters */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <span>Material Delivery & Logistics Tracking</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track expected delivery dates, log partial batches with challan #, and view auto-selected payment status
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search material..."
              className="pl-8 h-8 text-xs bg-background border-border"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            All Items ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              statusFilter === 'PENDING'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending Delivery
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PARTIAL')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              statusFilter === 'PARTIAL'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Partially Received
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DELIVERED')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              statusFilter === 'DELIVERED'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Fully Delivered
          </button>
        </div>
      </div>

      {/* Main Delivery Table */}
      <div className="w-full rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Truck className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <h3 className="text-xs font-semibold text-foreground">No line items match filter</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No material line items found with the current search query or status.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/50 text-foreground font-semibold border-b border-border text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">SL</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Material Item</th>
                  <th className="py-2.5 px-3 text-center">Required Qty</th>
                  <th className="py-2.5 px-3 text-center">Delivered Qty</th>
                  <th className="py-2.5 px-3 text-center">Delivery Status</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Expected Date</th>
                  <th className="py-2.5 px-3 text-center">Payment Status</th>
                  <th className="py-2.5 px-3 text-center">Docs</th>
                  <th className="py-2.5 px-3 text-right min-w-[220px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item, idx) => {
                  const attrs = (item.variantAttributes || {}) as Record<string, any>
                  const p: ItemPurchaseRecord = attrs.purchaseRecord || attrs.billingRecord
                  const d: ItemDeliveryRecord = attrs.deliveryRecord || {
                    batches: [],
                    totalDelivered: 0,
                    deliveryStatus: 'PENDING',
                  }

                  const totalDelivered = d.totalDelivered || 0
                  const deliveredPercent = item.finalQuantity > 0
                    ? Math.min(100, Math.round((totalDelivered / item.finalQuantity) * 100))
                    : 0

                  // Auto payment status
                  const paymentStatus = p?.paymentStatus || 'UNPAID'

                  // Expected date logic
                  const expDate = d.expectedDeliveryDate
                  let dateLabel = 'Not set'
                  let isOverdue = false

                  if (expDate) {
                    const today = new Date().toISOString().split('T')[0]
                    dateLabel = new Date(expDate).toLocaleDateString('en-GB')
                    if (expDate < today && d.deliveryStatus !== 'FULLY_DELIVERED') {
                      isOverdue = true
                    }
                  }

                  const docCount = (d.documents?.length || 0) + (p?.documents?.length || 0)

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      {/* SL */}
                      <td className="py-3 px-3 text-center font-mono text-muted-foreground text-xs">
                        {idx + 1}
                      </td>

                      {/* Material Item: thickness front laminate (blue) back laminate (orange) base material */}
                      <td className="py-3 px-3">
                        <MaterialScopeDisplay item={item} subType={item.workCategory} />
                        {p?.vendorName && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Supplier: <span className="font-medium text-foreground">{p.vendorName}</span>
                          </div>
                        )}
                      </td>

                      {/* Required Qty */}
                      <td className="py-3 px-3 text-center font-semibold text-foreground">
                        {item.finalQuantity} <span className="text-xs text-muted-foreground font-normal">{item.unit}</span>
                      </td>

                      {/* Delivered Qty with mini progress */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-semibold text-foreground font-mono">
                          {totalDelivered} / {item.finalQuantity} {item.unit}
                        </div>
                        <div className="w-16 mx-auto bg-muted rounded-full h-1 mt-1 overflow-hidden">
                          <div
                            className="bg-foreground h-1 rounded-full"
                            style={{ width: `${deliveredPercent}%` }}
                          ></div>
                        </div>
                      </td>

                      {/* Delivery Status */}
                      <td className="py-3 px-3 text-center">
                        {d.deliveryStatus === 'FULLY_DELIVERED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <Check className="w-3 h-3 stroke-[3]" />
                            Delivered
                          </span>
                        ) : d.deliveryStatus === 'PARTIALLY_DELIVERED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                            Partial ({deliveredPercent}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-border bg-muted/40 text-muted-foreground">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Expected Delivery Date */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground">{dateLabel}</span>
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                            Overdue
                          </span>
                        )}
                        {(d.dateChangeHistory?.length || 0) > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                            <History className="w-2.5 h-2.5" />
                            {d.dateChangeHistory?.length} date changes
                          </span>
                        )}
                      </td>

                      {/* Payment Status (Auto Selected) */}
                      <td className="py-3 px-3 text-center">
                        {paymentStatus === 'PAID' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            PAID
                          </span>
                        ) : paymentStatus === 'PARTIALLY_PAID' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                            PARTIAL
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            UNPAID
                          </span>
                        )}
                      </td>

                      {/* Documents / Invoices */}
                      <td className="py-3 px-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setDocModalItem(item)}
                          title="View / Attach Invoices & Challans"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="font-mono text-[11px]">{docCount}</span>
                        </Button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Log Delivery Batch */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2 gap-1 font-medium bg-background hover:bg-muted"
                            onClick={() => handleOpenBatchModal(item)}
                          >
                            <Truck className="w-3 h-3" />
                            Log Batch
                          </Button>

                          {/* Expected Date / Set Date */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2 gap-1 font-medium bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenDateModal(item)}
                          >
                            <Calendar className="w-3 h-3" />
                            Set Date
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: LOG DELIVERY BATCH */}
      <Dialog open={Boolean(batchModalItem)} onOpenChange={(open) => !open && setBatchModalItem(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Truck className="w-4 h-4" />
              Log Delivery Batch
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record received materials, delivery challan number, and site receiving notes for {batchModalItem?.materialName}.
            </DialogDescription>
          </DialogHeader>

          {batchModalItem && (
            <div className="space-y-3.5 py-1 text-xs">
              {/* Material Info */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
                <MaterialScopeDisplay item={batchModalItem} />
                <div className="text-muted-foreground flex items-center justify-between text-xs pt-1 border-t border-border">
                  <span>Required: <strong className="text-foreground">{batchModalItem.finalQuantity} {batchModalItem.unit}</strong></span>
                  <span>
                    Received so far: <strong className="text-foreground">{batchModalItem.variantAttributes?.deliveryRecord?.totalDelivered || 0} {batchModalItem.unit}</strong>
                  </span>
                </div>
              </div>

              {/* Delivered Qty & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Delivered in this Batch ({batchModalItem.unit})
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={batchQty}
                    onChange={(e) => setBatchQty(e.target.value)}
                    placeholder="e.g. 5"
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Delivery Date
                  </label>
                  <Input
                    type="date"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Challan & Receiver */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Delivery Challan / Gate Pass #
                  </label>
                  <Input
                    value={batchChallan}
                    onChange={(e) => setBatchChallan(e.target.value)}
                    placeholder="e.g. CH-9902"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Received By (Site Staff)
                  </label>
                  <Input
                    value={batchReceiver}
                    onChange={(e) => setBatchReceiver(e.target.value)}
                    placeholder="Site Engineer name"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Inspection Remarks / Site Condition
                </label>
                <Input
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="e.g. Good condition, stacked on floor 2"
                  className="h-8 text-xs"
                />
              </div>

              {/* Previous Batches Log */}
              {((batchModalItem.variantAttributes?.deliveryRecord?.batches?.length || 0) > 0) && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                    Past Batches ({batchModalItem.variantAttributes?.deliveryRecord?.batches?.length})
                  </span>
                  <div className="max-h-36 overflow-y-auto divide-y divide-border border border-border rounded-lg p-2 bg-background">
                    {batchModalItem.variantAttributes?.deliveryRecord?.batches?.map((b: DeliveryBatch) => (
                      <div key={b.id} className="py-1.5 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-semibold text-foreground font-mono">+{b.quantity} {batchModalItem.unit}</span>
                          <span className="text-muted-foreground ml-1.5">on {new Date(b.deliveryDate).toLocaleDateString('en-GB')}</span>
                          {b.challanNo && <span className="text-muted-foreground ml-1 font-mono">(Challan #{b.challanNo})</span>}
                        </div>
                        <span className="text-muted-foreground">{b.receivedBy}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchModalItem(null)}
              className="text-xs h-8"
              disabled={isSavingBatch}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs h-8 gap-1.5"
              onClick={handleSaveDeliveryBatch}
              disabled={isSavingBatch}
            >
              <Check className="w-3.5 h-3.5" />
              {isSavingBatch ? 'Saving...' : 'Confirm Delivery Batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EXPECTED DATE / SET DATE */}
      <Dialog open={Boolean(dateModalItem)} onOpenChange={(open) => !open && setDateModalItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Calendar className="w-4 h-4" />
              Expected Delivery Date
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set or reschedule the target arrival date for {dateModalItem?.materialName}.
            </DialogDescription>
          </DialogHeader>

          {dateModalItem && (
            <div className="space-y-3.5 py-1 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                <MaterialScopeDisplay item={dateModalItem} />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Expected Delivery Date
                </label>
                <Input
                  type="date"
                  value={newExpectedDate}
                  onChange={(e) => setNewExpectedDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Reason for Date Setting / Rescheduling
                </label>
                <Input
                  value={dateChangeReason}
                  onChange={(e) => setDateChangeReason(e.target.value)}
                  placeholder="e.g. Supplier factory delay / requested by site engineer"
                  className="h-8 text-xs"
                />
              </div>

              {/* History of Date Changes */}
              {((dateModalItem.variantAttributes?.deliveryRecord?.dateChangeHistory?.length || 0) > 0) && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1">
                    <History className="w-3 h-3" />
                    Date Change History
                  </span>
                  <div className="max-h-36 overflow-y-auto divide-y divide-border border border-border rounded-lg p-2 bg-background">
                    {dateModalItem.variantAttributes?.deliveryRecord?.dateChangeHistory?.map((h: any, i: number) => (
                      <div key={i} className="py-1 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between font-medium text-foreground">
                          <span>Set to {new Date(h.newDate).toLocaleDateString('en-GB')}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(h.changedAt).toLocaleDateString('en-GB')}</span>
                        </div>
                        <div className="text-muted-foreground">{h.reason} • {h.changedBy}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateModalItem(null)}
              className="text-xs h-8"
              disabled={isSavingDate}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs h-8 gap-1.5"
              onClick={handleSaveExpectedDate}
              disabled={isSavingDate}
            >
              <Check className="w-3.5 h-3.5" />
              {isSavingDate ? 'Saving...' : 'Save Date'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: DOCUMENTS & INVOICES */}
      <Dialog open={Boolean(docModalItem)} onOpenChange={(open) => !open && setDocModalItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Paperclip className="w-4 h-4" />
              Delivery Challans & Invoices
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              View or attach delivery challans, receiving slips, and receipts for {docModalItem?.materialName}.
            </DialogDescription>
          </DialogHeader>

          {docModalItem && (
            <div className="space-y-4 py-2 text-xs">
              {/* Document List */}
              <div className="space-y-2">
                <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Attached Documents
                </span>
                {(!docModalItem.variantAttributes?.deliveryRecord?.documents || docModalItem.variantAttributes?.deliveryRecord?.documents?.length === 0) ? (
                  <div className="p-6 text-center border border-dashed border-border rounded-lg text-muted-foreground space-y-1">
                    <FileText className="w-6 h-6 mx-auto opacity-40" />
                    <div>No delivery challans or documents attached yet</div>
                  </div>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-lg max-h-48 overflow-y-auto">
                    {docModalItem.variantAttributes?.deliveryRecord?.documents?.map((doc: AttachedDocument) => (
                      <div key={doc.id} className="p-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="truncate">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-foreground hover:underline flex items-center gap-1"
                            >
                              <span>{doc.name}</span>
                              <ExternalLink className="w-3 h-3 text-muted-foreground" />
                            </a>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(doc.uploadedAt).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-6 h-6 text-muted-foreground hover:text-foreground"
                          onClick={() => handleRemoveDocument(doc.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attach Document */}
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                  Attach New Challan / Document
                </span>
                <div className="space-y-2">
                  <Input
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="Document Title (e.g. Delivery Challan #CH-992)"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={newDocUrl}
                    onChange={(e) => setNewDocUrl(e.target.value)}
                    placeholder="Document URL (https://...)"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  onClick={handleAttachDocument}
                  disabled={isAttachingDoc}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  {isAttachingDoc ? 'Attaching...' : 'Attach Challan / Receipt'}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDocModalItem(null)} className="h-8 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
