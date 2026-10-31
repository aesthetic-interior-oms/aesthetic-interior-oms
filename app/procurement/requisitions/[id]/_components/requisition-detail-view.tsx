'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Package,
  Plus,
  Truck,
  Calendar,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit2,
  Building,
  Phone,
  Mail,
  Receipt,
  FileCheck2,
  ChevronDown,
  Layers,
  ShieldCheck,
  XCircle,
  FileQuestion,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type {
  ProcurementRequisitionDetail,
  DetailedRequisitionItem,
  PurchaseLineData,
} from '@/lib/procurement-service'
import {
  upsertPurchaseLine,
  deletePurchaseLine,
  addDeliveryBatch,
  logDeliveryDate,
  addPurchaseDocument,
  deletePurchaseDocument,
  reviewRequisition,
  acknowledgeRequisitionAmendment,
} from '@/lib/procurement-service'
import {
  PurchaseStockSource,
  PurchasePaymentStatus,
  PurchaseDeliveryStatus,
  PurchaseDocumentType,
} from '@/generated/prisma/client'

interface RequisitionDetailViewProps {
  initialData: ProcurementRequisitionDetail
}

export function RequisitionDetailView({ initialData }: RequisitionDetailViewProps) {
  const [data, setData] = useState<ProcurementRequisitionDetail>(initialData)
  const [isPending, startTransition] = useTransition()

  // Modal states
  const [editingPurchaseLine, setEditingPurchaseLine] = useState<{
    itemId: string
    line?: PurchaseLineData
  } | null>(null)

  const [activeBatchModal, setActiveBatchModal] = useState<PurchaseLineData | null>(null)
  const [activeDateModal, setActiveDateModal] = useState<PurchaseLineData | null>(null)
  const [activeDocModal, setActiveDocModal] = useState<PurchaseLineData | null>(null)
  const [reviewDialog, setReviewDialog] = useState<{
    action: 'ACCEPT' | 'REJECT' | 'CANCEL' | 'FULFILL'
  } | null>(null)
  const [reviewReason, setReviewReason] = useState('')

  // Form states for PurchaseLine modal
  const [plStockSource, setPlStockSource] = useState<PurchaseStockSource>('PURCHASED')
  const [plSupplierName, setPlSupplierName] = useState('')
  const [plSupplierPhone, setPlSupplierPhone] = useState('')
  const [plSupplierEmail, setPlSupplierEmail] = useState('')
  const [plQuantityOrdered, setPlQuantityOrdered] = useState('1')
  const [plQuotedPrice, setPlQuotedPrice] = useState('')
  const [plNegotiatedPrice, setPlNegotiatedPrice] = useState('')
  const [plTransportCost, setPlTransportCost] = useState('0')
  const [plLoadingCost, setPlLoadingCost] = useState('0')
  const [plTaxAmount, setPlTaxAmount] = useState('0')
  const [plOtherCosts, setPlOtherCosts] = useState('0')
  const [plPaidAmount, setPlPaidAmount] = useState('0')
  const [plPaymentStatus, setPlPaymentStatus] = useState<PurchasePaymentStatus>('UNPAID')
  const [plExpectedDate, setPlExpectedDate] = useState('')
  const [plNotes, setPlNotes] = useState('')

  // Delivery Batch form
  const [batchQty, setBatchQty] = useState('')
  const [batchNotes, setBatchNotes] = useState('')

  // Delivery Date Log form
  const [logPromisedDate, setLogPromisedDate] = useState('')
  const [logReason, setLogReason] = useState('')

  // Document form
  const [docType, setDocType] = useState<PurchaseDocumentType>('RECEIPT')
  const [docFileUrl, setDocFileUrl] = useState('')
  const [docFileName, setDocFileName] = useState('')
  const [docNotes, setDocNotes] = useState('')

  // Open modal for adding/editing PurchaseLine
  const openPurchaseLineModal = (itemId: string, line?: PurchaseLineData) => {
    setEditingPurchaseLine({ itemId, line })
    if (line) {
      setPlStockSource(line.stockSource)
      setPlSupplierName(line.supplierName || '')
      setPlSupplierPhone(line.supplierPhone || '')
      setPlSupplierEmail(line.supplierEmail || '')
      setPlQuantityOrdered(String(line.quantityOrdered || 1))
      setPlQuotedPrice(line.quotedUnitPrice != null ? String(line.quotedUnitPrice) : '')
      setPlNegotiatedPrice(line.negotiatedUnitPrice != null ? String(line.negotiatedUnitPrice) : '')
      setPlTransportCost(String(line.transportCost || 0))
      setPlLoadingCost(String(line.loadingCost || 0))
      setPlTaxAmount(String(line.taxAmount || 0))
      setPlOtherCosts(String(line.otherCosts || 0))
      setPlPaidAmount(String(line.paidAmount || 0))
      setPlPaymentStatus(line.paymentStatus)
      setPlExpectedDate(
        line.expectedDeliveryDate ? new Date(line.expectedDeliveryDate).toISOString().slice(0, 10) : ''
      )
      setPlNotes(line.notes || '')
    } else {
      setPlStockSource('PURCHASED')
      setPlSupplierName('')
      setPlSupplierPhone('')
      setPlSupplierEmail('')
      const item = data.items.find((i) => i.id === itemId)
      setPlQuantityOrdered(item ? String(item.finalQuantity) : '1')
      setPlQuotedPrice('')
      setPlNegotiatedPrice('')
      setPlTransportCost('0')
      setPlLoadingCost('0')
      setPlTaxAmount('0')
      setPlOtherCosts('0')
      setPlPaidAmount('0')
      setPlPaymentStatus('UNPAID')
      setPlExpectedDate('')
      setPlNotes('')
    }
  }

  // Handle Save PurchaseLine
  const handleSavePurchaseLine = () => {
    if (!editingPurchaseLine) return
    startTransition(async () => {
      const res = await upsertPurchaseLine({
        id: editingPurchaseLine.line?.id,
        requisitionItemId: editingPurchaseLine.itemId,
        stockSource: plStockSource,
        supplierName: plSupplierName.trim() || null,
        supplierPhone: plSupplierPhone.trim() || null,
        supplierEmail: plSupplierEmail.trim() || null,
        quantityOrdered: parseFloat(plQuantityOrdered) || 1,
        quotedUnitPrice: plQuotedPrice ? parseFloat(plQuotedPrice) : null,
        negotiatedUnitPrice: plNegotiatedPrice ? parseFloat(plNegotiatedPrice) : null,
        transportCost: parseFloat(plTransportCost) || 0,
        loadingCost: parseFloat(plLoadingCost) || 0,
        taxAmount: parseFloat(plTaxAmount) || 0,
        otherCosts: parseFloat(plOtherCosts) || 0,
        paidAmount: parseFloat(plPaidAmount) || 0,
        paymentStatus: plPaymentStatus,
        expectedDeliveryDate: plExpectedDate ? new Date(plExpectedDate) : null,
        notes: plNotes.trim() || null,
      })

      if (res.success) {
        toast.success('Purchase details saved successfully.')
        setEditingPurchaseLine(null)
        window.location.reload()
      } else {
        toast.error(res.error || 'Failed to save purchase details.')
      }
    })
  }

  // Handle Delete PurchaseLine
  const handleDeletePurchaseLine = (lineId: string) => {
    if (!confirm('Are you sure you want to remove this purchase line?')) return
    startTransition(async () => {
      const res = await deletePurchaseLine(lineId)
      if (res.success) {
        toast.success('Purchase line removed.')
        window.location.reload()
      } else {
        toast.error(res.error || 'Failed to delete line.')
      }
    })
  }

  // Handle Save Delivery Batch
  const handleSaveBatch = () => {
    if (!activeBatchModal) return
    const qty = parseFloat(batchQty)
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid delivered quantity.')
      return
    }

    startTransition(async () => {
      const res = await addDeliveryBatch(activeBatchModal.id, qty, new Date(), batchNotes)
      if (res.success) {
        toast.success(`Recorded batch: ${qty} received.`)
        setActiveBatchModal(null)
        setBatchQty('')
        setBatchNotes('')
        window.location.reload()
      } else {
        toast.error(res.error || 'Failed to record batch.')
      }
    })
  }

  // Handle Save Delivery Date
  const handleSaveDateLog = () => {
    if (!activeDateModal || !logPromisedDate) {
      toast.error('Please choose a delivery date.')
      return
    }

    startTransition(async () => {
      const res = await logDeliveryDate(activeDateModal.id, new Date(logPromisedDate), logReason)
      if (res.success) {
        toast.success('Delivery date recorded in timeline.')
        setActiveDateModal(null)
        setLogPromisedDate('')
        setLogReason('')
        window.location.reload()
      } else {
        toast.error(res.error || 'Failed to log date.')
      }
    })
  }

  // Handle Save Document
  const handleSaveDoc = () => {
    if (!activeDocModal || !docFileUrl) {
      toast.error('Please enter a file link or invoice URL.')
      return
    }

    startTransition(async () => {
      const res = await addPurchaseDocument(activeDocModal.id, {
        documentType: docType,
        fileUrl: docFileUrl,
        fileName: docFileName || 'Invoice Document',
        notes: docNotes,
      })
      if (res.success) {
        toast.success('Document attached.')
        setActiveDocModal(null)
        setDocFileUrl('')
        setDocFileName('')
        setDocNotes('')
        window.location.reload()
      } else {
        toast.error(res.error || 'Failed to attach document.')
      }
    })
  }

  // Handle Review Actions
  const handleReviewAction = () => {
    if (!reviewDialog) return
    startTransition(async () => {
      const res = await reviewRequisition(data.id, reviewDialog.action, reviewReason)
      if (res.success) {
        toast.success(`Requisition status updated: ${reviewDialog.action}`)
        setReviewDialog(null)
        setReviewReason('')
        window.location.reload()
      } else {
        toast.error(res.error || 'Failed to update status.')
      }
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Under Review</Badge>
      case 'IN_PROCUREMENT':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">In Procurement</Badge>
      case 'FULFILLED':
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Fulfilled</Badge>
      case 'REJECTED':
        return <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">Rejected</Badge>
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/procurement/dashboard" className="hover:text-foreground">
              Procurement
            </Link>
            <span>/</span>
            <Link href="/procurement/requisitions" className="hover:text-foreground">
              Requisitions
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{data.requisitionNo}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {data.requisitionNo}
            </h1>
            {getStatusBadge(data.status)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Submitted by {data.createdBy.fullName || 'BOQ Team'} on{' '}
            {new Date(data.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/procurement/requisitions">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>

          {data.status === 'SUBMITTED' && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setReviewDialog({ action: 'ACCEPT' })}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Accept Requisition
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setReviewDialog({ action: 'REJECT' })}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </>
          )}

          {data.status === 'IN_PROCUREMENT' && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setReviewDialog({ action: 'FULFILL' })}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Fulfilled
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-rose-600 border-rose-300 hover:bg-rose-50"
                onClick={() => setReviewDialog({ action: 'CANCEL' })}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Cancel Project Requisition
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Rejection / Cancellation notices */}
      {data.rejectionReason && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Rejection Reason:</h4>
            <p className="text-xs mt-0.5">{data.rejectionReason}</p>
          </div>
        </div>
      )}

      {data.cancellationReason && (
        <div className="p-4 rounded-xl border border-gray-300 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Cancellation Reason:</h4>
            <p className="text-xs mt-0.5">{data.cancellationReason}</p>
          </div>
        </div>
      )}

      {/* BOQ Amendment Banner (Question 9) */}
      {data.amendments.some((a) => a.status === 'PENDING') && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">BOQ Requisition Amendment Requested</h4>
              <p className="text-xs mt-0.5">
                {data.amendments.find((a) => a.status === 'PENDING')?.changeDescription}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 bg-amber-100 hover:bg-amber-200 text-amber-900 shrink-0"
            onClick={() => {
              const pending = data.amendments.find((a) => a.status === 'PENDING')
              if (pending) {
                startTransition(async () => {
                  await acknowledgeRequisitionAmendment(pending.id)
                  toast.success('Amendment acknowledged.')
                  window.location.reload()
                })
              }
            }}
          >
            Acknowledge & Adjust
          </Button>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Client / Project
          </span>
          <div className="font-semibold text-foreground text-sm truncate">{data.lead.name}</div>
          <p className="text-xs text-muted-foreground">{data.lead.location || 'Location not set'}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Material Spend
          </span>
          <div className="font-bold text-foreground text-lg">
            ৳{data.totalEstimatedCost.toLocaleString('en-BD')}
          </div>
          <p className="text-xs text-muted-foreground">All purchase lines + overheads</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Paid to Suppliers
          </span>
          <div className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
            ৳{data.totalPaidAmount.toLocaleString('en-BD')}
          </div>
          <p className="text-xs text-muted-foreground">
            Due: ৳{Math.max(0, data.totalEstimatedCost - data.totalPaidAmount).toLocaleString('en-BD')}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Items In Requisition
          </span>
          <div className="font-bold text-foreground text-lg">
            {data.items.length} materials
          </div>
          <p className="text-xs text-muted-foreground">
            {data.allDelivered ? 'All items delivered ✓' : 'Fulfillment in progress'}
          </p>
        </div>
      </div>

      {/* Main Material Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" />
            Material Requisition Items ({data.items.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Enter purchase, supplier quote, delivery batch & invoice per item
          </span>
        </div>

        {data.items.map((item, idx) => {
          const totalOrdered = item.purchaseLines.reduce((s, p) => s + p.quantityOrdered, 0)
          const totalDelivered = item.purchaseLines.reduce((s, p) => s + p.quantityDelivered, 0)
          const itemTotalCost = item.purchaseLines.reduce((s, p) => s + p.totalPurchaseCost, 0)

          return (
            <div
              key={item.id}
              className="rounded-xl border bg-card shadow-sm overflow-hidden border-border/80"
            >
              {/* Item Header */}
              <div className="p-4 bg-muted/30 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {item.workCategory.replace(/_/g, ' ')}
                    </Badge>
                    <h3 className="font-semibold text-foreground text-base">
                      {item.materialName}
                    </h3>
                  </div>
                  {item.specifications && (
                    <p className="text-xs text-muted-foreground">
                      Specs: <span className="text-foreground">{item.specifications}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Required Quantity</div>
                    <div className="font-bold text-foreground text-sm">
                      {item.finalQuantity} {item.unit}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Purchased / Delivered</div>
                    <div className="font-bold text-sm">
                      <span className="text-indigo-600 dark:text-indigo-400">{totalOrdered}</span> /{' '}
                      <span className={totalDelivered >= item.finalQuantity ? 'text-emerald-600' : 'text-amber-600'}>
                        {totalDelivered} {item.unit}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
                    onClick={() => openPurchaseLineModal(item.id)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Record Purchase
                  </Button>
                </div>
              </div>

              {/* Purchase Lines Table (Question 7: Split Purchase / Multi-supplier) */}
              <div className="p-4 space-y-3">
                {item.purchaseLines.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-border">
                    No purchase or stock record yet. Click &quot;Record Purchase&quot; above to log supplier quotes, stock check, or orders.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {item.purchaseLines.map((line) => (
                      <div
                        key={line.id}
                        className="rounded-lg border bg-background p-4 space-y-3 shadow-xs hover:border-border transition-colors"
                      >
                        {/* Line summary top row */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {line.stockSource === 'FROM_STOCK' ? (
                              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                From Stock
                              </Badge>
                            ) : (
                              <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                Purchased
                              </Badge>
                            )}

                            <span className="font-bold text-foreground text-sm">
                              {line.supplierName || 'Unspecified Supplier'}
                            </span>

                            {line.supplierPhone && (
                              <span className="inline-flex items-center text-xs text-muted-foreground gap-1 bg-muted/60 px-2 py-0.5 rounded">
                                <Phone className="w-3 h-3" />
                                {line.supplierPhone}
                              </span>
                            )}

                            {line.supplierEmail && (
                              <span className="inline-flex items-center text-xs text-muted-foreground gap-1 bg-muted/60 px-2 py-0.5 rounded">
                                <Mail className="w-3 h-3" />
                                {line.supplierEmail}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                line.deliveryStatus === 'DELIVERED'
                                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                                  : line.deliveryStatus === 'PARTIALLY_DELIVERED'
                                  ? 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                                  : 'border-muted text-muted-foreground'
                              }
                            >
                              {line.deliveryStatus.replace(/_/g, ' ')} ({line.quantityDelivered}/{line.quantityOrdered})
                            </Badge>

                            <Badge
                              variant="outline"
                              className={
                                line.paymentStatus === 'PAID'
                                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                                  : line.paymentStatus === 'PARTIALLY_PAID'
                                  ? 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40'
                                  : 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40'
                              }
                            >
                              {line.paymentStatus.replace(/_/g, ' ')}
                            </Badge>

                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-7 h-7"
                              onClick={() => openPurchaseLineModal(item.id, line)}
                            >
                              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-7 h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDeletePurchaseLine(line.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Cost & Price Breakdown (Question 8: Price breakdown) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs bg-muted/20 p-2.5 rounded-md">
                          <div>
                            <span className="text-muted-foreground block">Order Qty</span>
                            <span className="font-semibold text-foreground">
                              {line.quantityOrdered} {item.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Unit Negotiated</span>
                            <span className="font-semibold text-foreground">
                              {line.negotiatedUnitPrice != null ? `৳${line.negotiatedUnitPrice}` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Material Subtotal</span>
                            <span className="font-semibold text-foreground">
                              ৳{line.materialTotal.toLocaleString('en-BD')}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Transport / VAT</span>
                            <span className="font-semibold text-foreground">
                              ৳{(line.transportCost + line.taxAmount + line.loadingCost + line.otherCosts).toLocaleString('en-BD')}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Total Net Cost</span>
                            <span className="font-bold text-foreground">
                              ৳{line.totalPurchaseCost.toLocaleString('en-BD')}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Amount Paid</span>
                            <span className="font-semibold text-emerald-600">
                              ৳{line.paidAmount.toLocaleString('en-BD')}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Sub-actions Strip: Batches, Date Timeline, Invoices */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Record Delivery Batch button (Question 1: Partial delivery) */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                setActiveBatchModal(line)
                                setBatchQty(String(Math.max(0, line.quantityOrdered - line.quantityDelivered)))
                              }}
                            >
                              <Truck className="w-3 h-3 text-indigo-500" />
                              Log Delivery Batch ({line.deliveryBatches.length})
                            </Button>

                            {/* Delivery Date Log button (Question 11: Date changes) */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                setActiveDateModal(line)
                                setLogPromisedDate(
                                  line.expectedDeliveryDate
                                    ? new Date(line.expectedDeliveryDate).toISOString().slice(0, 10)
                                    : ''
                                )
                              }}
                            >
                              <Calendar className="w-3 h-3 text-amber-500" />
                              Expected: {line.expectedDeliveryDate ? new Date(line.expectedDeliveryDate).toLocaleDateString() : 'Set Date'}
                              {line.deliveryDateLogs.length > 1 && (
                                <span className="ml-1 px-1 rounded bg-amber-100 text-amber-900 text-[10px]">
                                  {line.deliveryDateLogs.length} updates
                                </span>
                              )}
                            </Button>

                            {/* Purchase Documents button (Question 5: Multiple invoices) */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setActiveDocModal(line)}
                            >
                              <FileText className="w-3 h-3 text-emerald-500" />
                              Documents & Invoices ({line.documents.length})
                            </Button>
                          </div>

                          {line.notes && (
                            <span className="text-muted-foreground text-xs italic">
                              Note: {line.notes}
                            </span>
                          )}
                        </div>

                        {/* Render active delivery batches if any */}
                        {line.deliveryBatches.length > 0 && (
                          <div className="bg-muted/10 p-2 rounded text-xs space-y-1">
                            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                              Delivery Batches History:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {line.deliveryBatches.map((b) => (
                                <span
                                  key={b.id}
                                  className="inline-flex items-center gap-1 bg-background border px-2 py-0.5 rounded text-[11px]"
                                >
                                  <strong>+{b.quantityDelivered} {item.unit}</strong> on{' '}
                                  {new Date(b.deliveredAt).toLocaleDateString()}
                                  {b.notes && <em className="text-muted-foreground">({b.notes})</em>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL 1: UPSERT PURCHASE LINE */}
      <Dialog
        open={!!editingPurchaseLine}
        onOpenChange={(open) => !open && setEditingPurchaseLine(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPurchaseLine?.line ? 'Edit Purchase Details' : 'Record Purchase or Stock Allocation'}
            </DialogTitle>
            <DialogDescription>
              Record material sourcing, negotiated prices, supplier phone, and overhead costs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Material Sourcing</label>
                <Select
                  value={plStockSource}
                  onValueChange={(val) => setPlStockSource(val as PurchaseStockSource)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PURCHASED">Purchase From Supplier</SelectItem>
                    <SelectItem value="FROM_STOCK">Allocate From Existing Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Quantity Ordered</label>
                <Input
                  type="number"
                  value={plQuantityOrdered}
                  onChange={(e) => setPlQuantityOrdered(e.target.value)}
                  placeholder="e.g. 50"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-semibold">Supplier / Shop Name</label>
                <Input
                  value={plSupplierName}
                  onChange={(e) => setPlSupplierName(e.target.value)}
                  placeholder="e.g. Bashir Building Materials"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-semibold">Supplier Phone Number</label>
                <Input
                  value={plSupplierPhone}
                  onChange={(e) => setPlSupplierPhone(e.target.value)}
                  placeholder="01700-000000"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-semibold">Supplier Email (optional)</label>
                <Input
                  value={plSupplierEmail}
                  onChange={(e) => setPlSupplierEmail(e.target.value)}
                  placeholder="vendor@mail.com"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Quoted Unit Price (৳)</label>
                <Input
                  type="number"
                  value={plQuotedPrice}
                  onChange={(e) => setPlQuotedPrice(e.target.value)}
                  placeholder="First quote"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Negotiated Unit Price (৳) *</label>
                <Input
                  type="number"
                  value={plNegotiatedPrice}
                  onChange={(e) => setPlNegotiatedPrice(e.target.value)}
                  placeholder="Agreed price per unit"
                  className="text-xs font-bold"
                />
              </div>
            </div>

            {/* Overheads (Question 8) */}
            <div className="p-3 rounded-lg border bg-muted/20 space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Additional Costs (Transportation, Tax, Loading)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Transport (৳)</label>
                  <Input
                    type="number"
                    value={plTransportCost}
                    onChange={(e) => setPlTransportCost(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Loading (৳)</label>
                  <Input
                    type="number"
                    value={plLoadingCost}
                    onChange={(e) => setPlLoadingCost(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">VAT / Tax (৳)</label>
                  <Input
                    type="number"
                    value={plTaxAmount}
                    onChange={(e) => setPlTaxAmount(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Other (৳)</label>
                  <Input
                    type="number"
                    value={plOtherCosts}
                    onChange={(e) => setPlOtherCosts(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* Payment & Expected Date */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Amount Paid (৳)</label>
                <Input
                  type="number"
                  value={plPaidAmount}
                  onChange={(e) => setPlPaidAmount(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Payment Status</label>
                <Select
                  value={plPaymentStatus}
                  onValueChange={(val) => setPlPaymentStatus(val as PurchasePaymentStatus)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                    <SelectItem value="PAID">Fully Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-semibold">Promised Delivery Date</label>
                <Input
                  type="date"
                  value={plExpectedDate}
                  onChange={(e) => setPlExpectedDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Procurement Notes</label>
              <Textarea
                rows={2}
                value={plNotes}
                onChange={(e) => setPlNotes(e.target.value)}
                placeholder="Remarks regarding delivery arrangement or vendor terms"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingPurchaseLine(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSavePurchaseLine} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Purchase Details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: LOG DELIVERY BATCH (PARTIAL DELIVERY Q1) */}
      <Dialog
        open={!!activeBatchModal}
        onOpenChange={(open) => !open && setActiveBatchModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-500" />
              Record Delivery Batch
            </DialogTitle>
            <DialogDescription>
              Log partial or full material arrival at the site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 rounded bg-muted/40 text-xs space-y-1">
              <div>Supplier: <strong>{activeBatchModal?.supplierName || 'N/A'}</strong></div>
              <div>Ordered: <strong>{activeBatchModal?.quantityOrdered}</strong> | Previously Delivered: <strong>{activeBatchModal?.quantityDelivered}</strong></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Quantity Received In This Batch *</label>
              <Input
                type="number"
                value={batchQty}
                onChange={(e) => setBatchQty(e.target.value)}
                placeholder="e.g. 30"
                className="text-xs"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Batch Notes (Condition / Gate pass / Delivery note #)</label>
              <Input
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                placeholder="e.g. Challan #104, 30 bags in good condition"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveBatchModal(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveBatch} disabled={isPending}>
              {isPending ? 'Saving...' : 'Record Delivery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: LOG DELIVERY DATE PROMISE (DATE CHANGES Q11) */}
      <Dialog
        open={!!activeDateModal}
        onOpenChange={(open) => !open && setActiveDateModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Delivery Date Promise & Timeline
            </DialogTitle>
            <DialogDescription>
              Keep a record of every time supplier changes promised delivery date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {activeDateModal && activeDateModal.deliveryDateLogs.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Previous Date Updates:
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {activeDateModal.deliveryDateLogs.map((l) => (
                    <div
                      key={l.id}
                      className="p-2 border rounded text-xs bg-muted/20 flex items-center justify-between"
                    >
                      <div>
                        <strong>{new Date(l.promisedDate).toLocaleDateString()}</strong>
                        {l.reason && <p className="text-muted-foreground text-[11px]">{l.reason}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(l.loggedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">New Promised Delivery Date *</label>
              <Input
                type="date"
                value={logPromisedDate}
                onChange={(e) => setLogPromisedDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Reason for Date Change</label>
              <Input
                value={logReason}
                onChange={(e) => setLogReason(e.target.value)}
                placeholder="e.g. Factory production delay, truck breakdown"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveDateModal(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveDateLog} disabled={isPending}>
              {isPending ? 'Logging...' : 'Update Delivery Date'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: DOCUMENTS & INVOICES (Q5: MULTIPLE DOCUMENTS) */}
      <Dialog
        open={!!activeDocModal}
        onOpenChange={(open) => !open && setActiveDocModal(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Documents & Invoices
            </DialogTitle>
            <DialogDescription>
              Attach delivery notes, tax invoices, receipts or replacement bills.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {activeDocModal && activeDocModal.documents.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Existing Attached Files:
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {activeDocModal.documents.map((d) => (
                    <div
                      key={d.id}
                      className="p-2 border rounded text-xs bg-muted/20 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1 truncate">
                        <Badge variant="outline" className="text-[10px] mr-1.5">
                          {d.documentType.replace(/_/g, ' ')}
                        </Badge>
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium hover:underline text-indigo-600 dark:text-indigo-400"
                        >
                          {d.fileName || d.fileUrl}
                        </a>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-6 h-6 text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          startTransition(async () => {
                            await deletePurchaseDocument(d.id)
                            toast.success('Document removed.')
                            window.location.reload()
                          })
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-3 space-y-3">
              <span className="text-xs font-semibold">Attach New Document / Bill</span>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Document Type</label>
                  <Select
                    value={docType}
                    onValueChange={(val) => setDocType(val as PurchaseDocumentType)}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TAX_INVOICE">Tax Invoice</SelectItem>
                      <SelectItem value="DELIVERY_NOTE">Delivery Note (Challan)</SelectItem>
                      <SelectItem value="RECEIPT">Cash Receipt</SelectItem>
                      <SelectItem value="REPLACEMENT_RECEIPT">Replacement Receipt</SelectItem>
                      <SelectItem value="OTHER">Other Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Document Name</label>
                  <Input
                    value={docFileName}
                    onChange={(e) => setDocFileName(e.target.value)}
                    placeholder="e.g. Invoice #2034"
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Document URL / Cloud Link *</label>
                <Input
                  value={docFileUrl}
                  onChange={(e) => setDocFileUrl(e.target.value)}
                  placeholder="https://... or /uploads/..."
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Notes (optional)</label>
                <Input
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="e.g. Paid in cash on site"
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveDocModal(null)}
              disabled={isPending}
            >
              Close
            </Button>
            <Button size="sm" onClick={handleSaveDoc} disabled={isPending}>
              {isPending ? 'Saving...' : 'Attach Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: REVIEW ACTION DIALOG (ACCEPT, REJECT, CANCEL, FULFILL) */}
      <Dialog open={!!reviewDialog} onOpenChange={(open) => !open && setReviewDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {reviewDialog?.action.toLowerCase()} Requisition
            </DialogTitle>
            <DialogDescription>
              {reviewDialog?.action === 'ACCEPT' &&
                'Move this requisition to IN_PROCUREMENT to begin purchasing and vendor sourcing.'}
              {reviewDialog?.action === 'REJECT' &&
                'Reject this requisition back to the BOQ team with comments for correction.'}
              {reviewDialog?.action === 'CANCEL' &&
                'Cancel this requisition if the project is suspended or client withdrew.'}
              {reviewDialog?.action === 'FULFILL' &&
                'Confirm all materials have been received on site and mark requisition completed.'}
            </DialogDescription>
          </DialogHeader>

          {(reviewDialog?.action === 'REJECT' || reviewDialog?.action === 'CANCEL') && (
            <div className="space-y-1.5 py-2">
              <label className="text-xs font-semibold">Reason *</label>
              <Textarea
                rows={3}
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                placeholder="Specify the reason so team members understand what happened"
                className="text-xs"
                autoFocus
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReviewDialog(null)
                setReviewReason('')
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={
                reviewDialog?.action === 'REJECT' || reviewDialog?.action === 'CANCEL'
                  ? 'destructive'
                  : 'default'
              }
              onClick={handleReviewAction}
              disabled={
                isPending ||
                ((reviewDialog?.action === 'REJECT' || reviewDialog?.action === 'CANCEL') &&
                  !reviewReason.trim())
              }
            >
              {isPending ? 'Processing...' : `Confirm ${reviewDialog?.action}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
