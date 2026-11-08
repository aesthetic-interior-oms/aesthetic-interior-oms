'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react'
import {
  Package,
  Receipt,
  CheckCircle2,
  Printer,
  Layers,
  Send,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  FileText,
  Boxes,
  Hammer,
  Paperclip,
  UploadCloud,
  FileCheck,
  ExternalLink,
  Truck,
  Phone,
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
  saveItemPurchaseRecordAction,
  removeItemPurchaseRecordAction,
  attachItemDocumentAction,
  removeAttachedDocumentAction,
  dispatchBillingToAccountsAction,
  recordPurchaseTeamPaymentAction,
  ItemPurchaseRecord,
  AttachedDocument,
} from '../actions'
import {
  MaterialScopeDisplay,
  getMaterialDisplayName,
} from './material-scope-display'
import { CabinetBillMaker } from './cabinet-bill-maker'

export type RequisitionItemData = {
  id: string
  requisitionId: string
  quotationLineItemId: string | null
  stockItemId: string | null
  workCategory: string
  materialName: string
  specifications: string | null
  variantAttributes: any
  netQuantity: number
  wastagePercent: number
  finalQuantity: number
  unit: string
  productionPhase: string | null
  remarks: string | null
}

export type WallPanelingSubSection =
  | 'BOARDS'
  | 'DECORATIVE'
  | 'FASTENERS'
  | 'NAILS'
  | 'ADHESIVES'

export type VendorOption = {
  id: string
  vendorName: string
  vendorCompanyName: string | null
  primaryPhone: string | null
  primaryEmail: string | null
}

interface WallPanelingBillMakerProps {
  requisition: {
    id: string
    requisitionNo: string
    status: string
    createdAt: Date | string
    notes: string | null
    lead: {
      id: string
      name: string
      phone: string | null
      location: string | null
      stage: string
    }
    createdBy: {
      fullName: string | null
      email?: string | null
    }
    items: RequisitionItemData[]
  }
  vendors: VendorOption[]
}

const SETTLEMENT_OPTIONS: { id: ItemPurchaseRecord['settlementMethod']; label: string; procurementOnly?: boolean }[] = [
  { id: 'PURCHASE_TEAM', label: 'Purchase Team Fund (Pay Now — Pending Auth)', procurementOnly: true },
  { id: 'PETTY_CASH', label: 'Petty Cash — Accounts will process' },
  { id: 'COMPANY_ACCOUNT', label: 'Office Bank / Cheque — Accounts will process' },
  { id: 'VENDOR_CREDIT', label: 'Vendor Credit (Pay Later) — Accounts will process' },
  { id: 'OTHER', label: 'Other — Accounts will process' },
]

// Settlement methods that procurement can pay directly; others are Accounts-side only
const PROCUREMENT_PAYABLE_METHODS: ItemPurchaseRecord['settlementMethod'][] = ['PURCHASE_TEAM']

function classifyWallPanelingItem(item: RequisitionItemData): WallPanelingSubSection {
  const attrs = (item.variantAttributes || {}) as Record<string, any>
  const wpSub = String(attrs.wpSubType || '').toUpperCase()
  const matName = String(item.materialName || '').toLowerCase()

  if (
    wpSub === 'CORE_BOARDS' ||
    attrs.baseMaterial ||
    attrs.laminateTopSurface ||
    attrs.coreThickness ||
    attrs.boardLaminateType ||
    attrs.edgingTapeQty ||
    matName.includes('board') ||
    matName.includes('plywood') ||
    matName.includes('mdf') ||
    matName.includes('hdf')
  ) {
    return 'BOARDS'
  }

  if (
    wpSub === 'LOUVERS_PROFILES' ||
    attrs.codeVariant ||
    attrs.accentFinish ||
    attrs.decorativeType ||
    matName.includes('louver') ||
    matName.includes('fluted') ||
    matName.includes('panel') ||
    matName.includes('profile') ||
    matName.includes('acrylic') ||
    matName.includes('trim')
  ) {
    return 'DECORATIVE'
  }

  if (
    wpSub === 'SCREWS_FASTENERS' ||
    attrs.fastenerType ||
    attrs.lengthInches ||
    matName.includes('screw') ||
    matName.includes('fastener')
  ) {
    return 'FASTENERS'
  }

  if (
    wpSub === 'NAILS_PINS' ||
    attrs.lengthSpec ||
    matName.includes('nail') ||
    matName.includes('pin') ||
    matName.includes('anchor') ||
    matName.includes('rawle')
  ) {
    return 'NAILS'
  }

  if (
    wpSub === 'ADHESIVES' ||
    attrs.chemicalClass ||
    matName.includes('adhesive') ||
    matName.includes('glue') ||
    matName.includes('solvent') ||
    matName.includes('silicone') ||
    matName.includes('fevicol')
  ) {
    return 'ADHESIVES'
  }

  return 'BOARDS'
}


export function WallPanelingBillMaker({ requisition, vendors }: WallPanelingBillMakerProps) {
  const [selectedMainSection, setSelectedMainSection] = useState<'WALL_PANELING' | 'CABINETS_CLOSETS' | 'ACCESSORIES' | 'OTHER'>('WALL_PANELING')
  const [activeSubSection, setActiveSubSection] = useState<'ALL' | WallPanelingSubSection>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Purchases keyed by item.id
  const [purchases, setPurchases] = useState<Record<string, ItemPurchaseRecord>>(() => {
    const initial: Record<string, ItemPurchaseRecord> = {}
    requisition.items.forEach((item) => {
      const attrs = (item.variantAttributes || {}) as Record<string, any>
      const p = attrs.purchaseRecord || attrs.billingRecord
      if (p && p.isBought) {
        initial[item.id] = p
      }
    })
    return initial
  })

  // Modal 1: Record / Edit Purchase
  const [editingItem, setEditingItem] = useState<RequisitionItemData | null>(null)
  const [selectedVendorId, setSelectedVendorId] = useState<string>('')
  const [formVendorName, setFormVendorName] = useState<string>('')
  const [formVendorPhone, setFormVendorPhone] = useState<string>('')
  const [formVendorEmail, setFormVendorEmail] = useState<string>('')
  const [formInvoiceNo, setFormInvoiceNo] = useState<string>('')
  const [formBillQty, setFormBillQty] = useState<string>('')
  const [formUnitPrice, setFormUnitPrice] = useState<string>('')
  const [formNotes, setFormNotes] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Modal 2: Documents & Invoices per item
  const [documentItem, setDocumentItem] = useState<RequisitionItemData | null>(null)
  const [newDocName, setNewDocName] = useState('')
  const [newDocUrl, setNewDocUrl] = useState('')
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)

  // Modal 3: Dispatch to Accounts
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [orderSubmittedSuccess, setOrderSubmittedSuccess] = useState<string | null>(null)
  const [orderNotes, setOrderNotes] = useState('')

  // Modal 4: Print Slip
  const [isPrintSlipOpen, setIsPrintSlipOpen] = useState(false)

  // Filter Wall Paneling items
  const wallPanelingItems = useMemo(() => {
    return requisition.items.filter((i) => i.workCategory === 'WALL_PANELING')
  }, [requisition.items])

  // Filter Cabinet / Closet items
  const cabinetItems = useMemo(() => {
    return requisition.items.filter((i) => i.workCategory === 'CABINETS_CLOSETS')
  }, [requisition.items])

  // Sub-section counts
  const subSectionCounts = useMemo(() => {
    const counts: Record<WallPanelingSubSection, { total: number; bought: number }> = {
      BOARDS: { total: 0, bought: 0 },
      DECORATIVE: { total: 0, bought: 0 },
      FASTENERS: { total: 0, bought: 0 },
      NAILS: { total: 0, bought: 0 },
      ADHESIVES: { total: 0, bought: 0 },
    }

    wallPanelingItems.forEach((item) => {
      const sub = classifyWallPanelingItem(item)
      counts[sub].total += 1
      if (purchases[item.id]?.isBought) {
        counts[sub].bought += 1
      }
    })

    return counts
  }, [wallPanelingItems, purchases])

  // Display items
  const displayedItems = useMemo(() => {
    return wallPanelingItems.filter((item) => {
      const sub = classifyWallPanelingItem(item)
      if (activeSubSection !== 'ALL' && sub !== activeSubSection) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = item.materialName.toLowerCase().includes(q)
        const matchSpec = (item.specifications || '').toLowerCase().includes(q)
        return matchName || matchSpec
      }
      return true
    })
  }, [wallPanelingItems, activeSubSection, searchQuery])

  // Dynamic calculations for the Record Bill Modal
  const calculatedTotalSpend = useMemo(() => {
    const qty = parseFloat(formBillQty) || 0
    const price = parseFloat(formUnitPrice) || 0
    return Math.round(qty * price)
  }, [formBillQty, formUnitPrice])

  // Overall Wall Paneling purchases summary
  const orderSummary = useMemo(() => {
    let totalBilledItems = 0
    let totalMaterialSpend = 0
    let totalPaidToSuppliers = 0
    let totalDueAmount = 0
    const settlementTotals = {
      pettyCash: 0,
      purchaseTeam: 0,
      companyAccount: 0,
      vendorCredit: 0,
      other: 0,
    }

    wallPanelingItems.forEach((item) => {
      const p = purchases[item.id]
      if (p && p.isBought) {
        totalBilledItems += 1
        const total = Number(p.totalAmount) || 0
        const paid = Number(p.paidAmount) || 0
        const due = Number(p.dueAmount) || 0

        totalMaterialSpend += total
        totalPaidToSuppliers += paid
        totalDueAmount += due

        const method = p.settlementMethod || 'PETTY_CASH'
        if (method === 'PETTY_CASH') settlementTotals.pettyCash += total
        else if (method === 'PURCHASE_TEAM') settlementTotals.purchaseTeam += total
        else if (method === 'COMPANY_ACCOUNT') settlementTotals.companyAccount += total
        else if (method === 'VENDOR_CREDIT') settlementTotals.vendorCredit += total
        else settlementTotals.other += total
      }
    })

    return {
      totalItems: wallPanelingItems.length,
      totalBilledItems,
      unbilledItems: wallPanelingItems.length - totalBilledItems,
      totalMaterialSpend,
      totalPaidToSuppliers,
      totalDueAmount,
      settlementTotals,
    }
  }, [wallPanelingItems, purchases])

  // Cabinet / Closet order summary
  const cabinetOrderSummary = useMemo(() => {
    let totalBilledItems = 0
    let totalMaterialSpend = 0
    let totalPaidToSuppliers = 0
    let totalDueAmount = 0
    const settlementTotals = {
      pettyCash: 0,
      purchaseTeam: 0,
      companyAccount: 0,
      vendorCredit: 0,
      other: 0,
    }

    cabinetItems.forEach((item) => {
      const p = purchases[item.id]
      if (p && p.isBought) {
        totalBilledItems += 1
        const total = Number(p.totalAmount) || 0
        const paid = Number(p.paidAmount) || 0
        const due = Number(p.dueAmount) || 0
        totalMaterialSpend += total
        totalPaidToSuppliers += paid
        totalDueAmount += due
        const method = p.settlementMethod || 'PETTY_CASH'
        if (method === 'PETTY_CASH') settlementTotals.pettyCash += total
        else if (method === 'PURCHASE_TEAM') settlementTotals.purchaseTeam += total
        else if (method === 'COMPANY_ACCOUNT') settlementTotals.companyAccount += total
        else if (method === 'VENDOR_CREDIT') settlementTotals.vendorCredit += total
        else settlementTotals.other += total
      }
    })

    return {
      totalItems: cabinetItems.length,
      totalBilledItems,
      unbilledItems: cabinetItems.length - totalBilledItems,
      totalMaterialSpend,
      totalPaidToSuppliers,
      totalDueAmount,
      settlementTotals,
    }
  }, [cabinetItems, purchases])

  // Active summary (based on selected main section)
  const activeSummary = selectedMainSection === 'CABINETS_CLOSETS' ? cabinetOrderSummary : orderSummary
  const activeItems = selectedMainSection === 'CABINETS_CLOSETS' ? cabinetItems : wallPanelingItems

  const handleVendorSelect = (vendorId: string) => {
    setSelectedVendorId(vendorId)
    if (!vendorId || vendorId === 'CUSTOM') {
      return
    }
    const found = vendors.find((v) => v.id === vendorId)
    if (found) {
      setFormVendorName(found.vendorCompanyName || found.vendorName)
      setFormVendorPhone(found.primaryPhone || '')
      setFormVendorEmail(found.primaryEmail || '')
    }
  }

  // Open "Record Purchase" Modal
  const handleOpenPurchaseModal = (item: RequisitionItemData) => {
    const existing = purchases[item.id]
    setEditingItem(item)

    if (existing) {
      setSelectedVendorId(existing.vendorId || 'CUSTOM')
      setFormVendorName(existing.vendorName || '')
      setFormVendorPhone(existing.vendorPhone || '')
      setFormVendorEmail(existing.vendorEmail || '')
      setFormInvoiceNo(existing.invoiceNo || '')
      setFormBillQty(String(existing.billQuantity || item.finalQuantity))
      setFormUnitPrice(String(existing.unitPrice || ''))
      setFormNotes(existing.notes || '')
    } else {
      setSelectedVendorId('')
      setFormVendorName('')
      setFormVendorPhone('')
      setFormVendorEmail('')
      setFormInvoiceNo('')
      setFormBillQty(String(item.finalQuantity))
      setFormUnitPrice('')
      setFormNotes('')
    }
  }

  // Save Bill Record
  const handleSavePurchase = async () => {
    if (!editingItem) return
    const qty = parseFloat(formBillQty) || editingItem.finalQuantity
    const price = parseFloat(formUnitPrice) || 0
    const total = qty * price

    const existingDocs = purchases[editingItem.id]?.documents || []

    const record: ItemPurchaseRecord = {
      isBought: true,
      vendorId: selectedVendorId === 'CUSTOM' ? null : selectedVendorId,
      vendorName: formVendorName.trim() || 'Direct Supplier',
      vendorPhone: formVendorPhone.trim(),
      vendorEmail: formVendorEmail.trim(),
      invoiceNo: formInvoiceNo.trim(),
      billDate: new Date().toISOString().split('T')[0],
      billQuantity: qty,
      unitPrice: price,
      materialTotal: total,
      transportCost: 0,
      otherCost: 0,
      totalAmount: total,
      paidAmount: 0,
      dueAmount: total,
      paymentStatus: 'UNPAID',
      settlementMethod: 'PETTY_CASH',
      purchasedBy: '',
      notes: formNotes.trim(),
      documents: existingDocs,
    }

    setIsSaving(true)
    try {
      await saveItemPurchaseRecordAction({
        itemId: editingItem.id,
        requisitionId: requisition.id,
        record,
      })
      setPurchases((prev) => ({
        ...prev,
        [editingItem.id]: record,
      }))
      setEditingItem(null)
    } catch (err) {
      console.error(err)
      alert('Could not save purchase record.')
    } finally {
      setIsSaving(false)
    }
  }

  // Remove Purchase
  const handleRemovePurchase = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this purchase record?')) return
    setIsSaving(true)
    try {
      await removeItemPurchaseRecordAction({
        itemId,
        requisitionId: requisition.id,
      })
      setPurchases((prev) => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
    } catch (err) {
      console.error(err)
      alert('Could not remove purchase record.')
    } finally {
      setIsSaving(false)
    }
  }

  // Attach Document
  const handleAttachDocument = async () => {
    if (!documentItem || !newDocName.trim() || !newDocUrl.trim()) {
      alert('Please enter document name and URL or attach file')
      return
    }

    const doc: AttachedDocument = {
      id: `DOC-${Date.now().toString().slice(-6)}`,
      name: newDocName.trim(),
      url: newDocUrl.trim(),
      uploadedAt: new Date().toISOString(),
    }

    setIsUploadingDoc(true)
    try {
      await attachItemDocumentAction({
        itemId: documentItem.id,
        requisitionId: requisition.id,
        target: 'PURCHASE',
        document: doc,
      })

      // Update state
      setPurchases((prev) => {
        const p = prev[documentItem.id]
        if (!p) return prev
        const docs = [...(p.documents || []), doc]
        return {
          ...prev,
          [documentItem.id]: { ...p, documents: docs },
        }
      })

      setNewDocName('')
      setNewDocUrl('')
    } catch (err) {
      console.error(err)
      alert('Failed to attach document')
    } finally {
      setIsUploadingDoc(false)
    }
  }

  // Remove Document
  const handleRemoveDocument = async (docId: string) => {
    if (!documentItem) return
    try {
      await removeAttachedDocumentAction({
        itemId: documentItem.id,
        requisitionId: requisition.id,
        target: 'PURCHASE',
        documentId: docId,
      })

      setPurchases((prev) => {
        const p = prev[documentItem.id]
        if (!p) return prev
        const docs = (p.documents || []).filter((d) => d.id !== docId)
        return {
          ...prev,
          [documentItem.id]: { ...p, documents: docs },
        }
      })
    } catch (err) {
      console.error(err)
      alert('Failed to remove document')
    }
  }

  // Dispatch to Accounts
  const handleConfirmOrder = async () => {
    setIsSaving(true)
    try {
      const res = await dispatchBillingToAccountsAction({
        requisitionId: requisition.id,
        orderNotes,
        totalBilledAmount: activeSummary.totalMaterialSpend,
        totalBilledItems: activeSummary.totalBilledItems,
        settlementBreakdown: activeSummary.settlementTotals,
      })
      setOrderSubmittedSuccess(res.dispatchRef)
      setIsOrderModalOpen(false)
    } catch (err) {
      console.error(err)
      alert('Failed to dispatch order to accounts.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Success Notification Banner */}
      {orderSubmittedSuccess && (
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-md bg-foreground text-background shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                <span>Billing Records Dispatched to Accounts</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-foreground border border-border font-medium">
                  {orderSubmittedSuccess}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {orderSummary.totalBilledItems} items totaling ৳{orderSummary.totalMaterialSpend.toLocaleString('en-BD')} have been submitted to Accounts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => setIsPrintSlipOpen(true)}
            >
              <Printer className="w-3.5 h-3.5" />
              Print Voucher Slip
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => setOrderSubmittedSuccess(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Requisition Scope Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wider">
            Requisition Work Scope
          </span>
          <span>Starting with Wall Paneling as requested</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedMainSection('WALL_PANELING')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors border ${
              selectedMainSection === 'WALL_PANELING'
                ? 'bg-foreground text-background border-foreground shadow-xs'
                : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Wall Paneling</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded font-mono ${
              selectedMainSection === 'WALL_PANELING' ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
            }`}>
              {wallPanelingItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMainSection('CABINETS_CLOSETS')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors border ${
              selectedMainSection === 'CABINETS_CLOSETS'
                ? 'bg-foreground text-background border-foreground shadow-xs'
                : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Cabinets &amp; Closets</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded font-mono ${
              selectedMainSection === 'CABINETS_CLOSETS' ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
            }`}>
              {cabinetItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMainSection('ACCESSORIES')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium bg-card border border-border border-dashed text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Accessories</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">Next</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMainSection('OTHER')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium bg-card border border-border border-dashed text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Other Categories</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">Next</span>
          </button>
        </div>
      </div>

      {/* Main Section Area */}
      {selectedMainSection === 'ACCESSORIES' || selectedMainSection === 'OTHER' ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center space-y-3">
          <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">Coming Soon</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Accessories &amp; Other categories will be enabled in a future update. Use Wall Paneling or Cabinets &amp; Closets for now.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setSelectedMainSection('WALL_PANELING')}>
              Wall Paneling
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setSelectedMainSection('CABINETS_CLOSETS')}>
              Cabinets &amp; Closets
            </Button>
          </div>
        </div>
      ) : selectedMainSection === 'CABINETS_CLOSETS' ? (
        <CabinetBillMaker
          items={cabinetItems}
          purchases={purchases}
          isSaving={isSaving}
          onOpenPurchaseModal={handleOpenPurchaseModal}
          onRemovePurchase={handleRemovePurchase}
          onOpenDocumentModal={setDocumentItem}
          onOpenOrderModal={() => setIsOrderModalOpen(true)}
          onOpenPrintSlip={() => setIsPrintSlipOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {/* Sub-Section Filter Bar & Search */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">
                    Wall Paneling Purchases & Vendor Billing
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded border border-border font-mono font-medium text-foreground bg-muted/30">
                    {orderSummary.totalBilledItems} of {orderSummary.totalItems} Purchases Logged
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select supplier, record quoted bill quantity and unit rate to estimate the material cost
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter material by name or spec..."
                  className="pl-8 h-8 text-xs bg-background border-border"
                />
              </div>
            </div>

            {/* Sub-Category Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveSubSection('ALL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeSubSection === 'ALL'
                    ? 'bg-foreground text-background font-semibold'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>All Materials</span>
                <span className="text-[11px] font-mono opacity-80">({wallPanelingItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubSection('BOARDS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeSubSection === 'BOARDS'
                    ? 'bg-foreground text-background font-semibold'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>Boards & Plywood</span>
                <span className="text-[11px] font-mono opacity-80">
                  ({subSectionCounts.BOARDS.bought}/{subSectionCounts.BOARDS.total})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubSection('DECORATIVE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeSubSection === 'DECORATIVE'
                    ? 'bg-foreground text-background font-semibold'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>Louvers & Decorative</span>
                <span className="text-[11px] font-mono opacity-80">
                  ({subSectionCounts.DECORATIVE.bought}/{subSectionCounts.DECORATIVE.total})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubSection('FASTENERS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeSubSection === 'FASTENERS'
                    ? 'bg-foreground text-background font-semibold'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>Screws & Hardware</span>
                <span className="text-[11px] font-mono opacity-80">
                  ({subSectionCounts.FASTENERS.bought}/{subSectionCounts.FASTENERS.total})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubSection('NAILS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeSubSection === 'NAILS'
                    ? 'bg-foreground text-background font-semibold'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>Nails, Pins & Anchors</span>
                <span className="text-[11px] font-mono opacity-80">
                  ({subSectionCounts.NAILS.bought}/{subSectionCounts.NAILS.total})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubSection('ADHESIVES')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeSubSection === 'ADHESIVES'
                    ? 'bg-foreground text-background font-semibold'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>Adhesives & Chemicals</span>
                <span className="text-[11px] font-mono opacity-80">
                  ({subSectionCounts.ADHESIVES.bought}/{subSectionCounts.ADHESIVES.total})
                </span>
              </button>
            </div>
          </div>

          {/* Table Container: High Contrast, Clean Monochrome Design */}
          <div className="w-full rounded-lg border border-border bg-card shadow-xs overflow-hidden">
            {displayedItems.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Package className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <h3 className="text-xs font-semibold text-foreground">No materials found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery ? 'No materials match your search keyword.' : 'No materials in this sub-section.'}
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/50 text-foreground font-semibold border-b border-border text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Status</th>
                      <th className="py-2.5 px-3 w-10 text-center">SL</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Material & Scope</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Supplier & Contacts</th>
                      <th className="py-2.5 px-3 text-center">Req. Qty</th>
                      <th className="py-2.5 px-3 text-center">Bill Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-right">Estimated Cost</th>
                      <th className="py-2.5 px-3 text-center">Docs</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedItems.map((item, idx) => {
                      const p = purchases[item.id]
                      const isBought = Boolean(p?.isBought)
                      const subType = classifyWallPanelingItem(item)
                      const docCount = p?.documents?.length || 0

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors hover:bg-muted/20 ${
                            isBought ? 'bg-muted/10' : ''
                          }`}
                        >
                          {/* Status Check Indicator */}
                          <td className="py-2.5 px-3 text-center">
                            {isBought ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-border text-muted-foreground/40 text-[10px]">
                                —
                              </span>
                            )}
                          </td>

                          {/* SL */}
                          <td className="py-2.5 px-3 text-center font-mono text-muted-foreground text-xs">
                            {idx + 1}
                          </td>

                          {/* Material & Scope: thickness front laminate (blue) back laminate (orange) base material */}
                          <td className="py-2.5 px-3">
                            <MaterialScopeDisplay item={item} subType={subType} />
                          </td>

                          {/* Supplier & Contact Info */}
                          <td className="py-2.5 px-3 text-xs">
                            {isBought && p.vendorName ? (
                              <div className="space-y-0.5">
                                <div className="font-semibold text-foreground">{p.vendorName}</div>
                                {p.vendorPhone && (
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Phone className="w-2.5 h-2.5" />
                                    <span>{p.vendorPhone}</span>
                                  </div>
                                )}
                                {p.invoiceNo && (
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    Memo: {p.invoiceNo}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Required Qty */}
                          <td className="py-2.5 px-3 text-center font-semibold text-foreground">
                            {item.finalQuantity} <span className="text-xs text-muted-foreground font-normal">{item.unit}</span>
                          </td>

                          {/* Purchased Qty */}
                          <td className="py-2.5 px-3 text-center">
                            {isBought ? (
                              <span className="font-semibold text-foreground">
                                {p.billQuantity} {item.unit}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Unit Rate */}
                          <td className="py-2.5 px-3 text-right">
                            {isBought && p.unitPrice > 0 ? (
                              <span className="font-medium text-foreground">
                                ৳{p.unitPrice.toLocaleString('en-BD')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Total Spend */}
                          <td className="py-2.5 px-3 text-right">
                            {isBought ? (
                              <div className="font-bold text-foreground text-xs sm:text-sm font-mono">
                                ৳{p.totalAmount.toLocaleString('en-BD')}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Documents Button */}
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                              onClick={() => setDocumentItem(item)}
                              title="Attach / View Invoices"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span className="font-mono text-[11px]">{docCount}</span>
                            </Button>
                          </td>

                          {/* Action Button: "Record Purchase" */}
                          <td className="py-2.5 px-3 text-right">
                            {isBought ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2 gap-1 font-medium"
                                  onClick={() => handleOpenPurchaseModal(item)}
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-7 h-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleRemovePurchase(item.id)}
                                  title="Clear record"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2.5 gap-1 bg-background hover:bg-muted font-medium text-foreground"
                                onClick={() => handleOpenPurchaseModal(item)}
                              >
                                <Plus className="w-3 h-3" />
                                Record Bill
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Accounts Summary & Dispatch Card */}
          <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Purchase Line Spend Summary
                  </span>
                  <span className="text-xs text-muted-foreground">• Ready for Accounts</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                  <span>Total Material Spend:</span>
                  <span className="font-mono">৳{orderSummary.totalMaterialSpend.toLocaleString('en-BD')}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-3">
                  <span>Paid: <strong className="text-foreground">৳{orderSummary.totalPaidToSuppliers.toLocaleString('en-BD')}</strong></span>
                  <span>Due: <strong className="text-foreground">৳{orderSummary.totalDueAmount.toLocaleString('en-BD')}</strong></span>
                  <span>({orderSummary.totalBilledItems} of {orderSummary.totalItems} logged)</span>
                </div>
              </div>

              {/* Settlement Adjustment Breakdown Chips */}
              <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-2.5 rounded-lg border border-border text-xs">
                <div className="px-2 py-1 bg-card rounded border border-border">
                  <span className="text-muted-foreground">Petty Cash: </span>
                  <strong className="text-foreground">৳{orderSummary.settlementTotals.pettyCash.toLocaleString('en-BD')}</strong>
                </div>
                <div className="px-2 py-1 bg-card rounded border border-border">
                  <span className="text-muted-foreground">Purchase Team: </span>
                  <strong className="text-foreground">৳{orderSummary.settlementTotals.purchaseTeam.toLocaleString('en-BD')}</strong>
                </div>
                {(orderSummary.settlementTotals.companyAccount > 0 || orderSummary.settlementTotals.vendorCredit > 0) && (
                  <div className="px-2 py-1 bg-card rounded border border-border">
                    <span className="text-muted-foreground">Bank/Credit: </span>
                    <strong className="text-foreground">
                      ৳{(orderSummary.settlementTotals.companyAccount + orderSummary.settlementTotals.vendorCredit).toLocaleString('en-BD')}
                    </strong>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 text-xs font-medium"
                  disabled={orderSummary.totalBilledItems === 0}
                  onClick={() => setIsPrintSlipOpen(true)}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Voucher
                </Button>

                <Button
                  size="sm"
                  disabled={orderSummary.totalBilledItems === 0 || isSaving}
                  className="h-9 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 gap-1.5 font-medium text-xs px-4"
                  onClick={() => setIsOrderModalOpen(true)}
                >
                  <Send className="w-3.5 h-3.5" />
                  Dispatch to Accounts
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Receipt className="w-4 h-4" />
              Record Material Bill
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select supplier, enter quantity and unit rate to record the estimated bill cost.
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-3.5 py-1 text-xs">
              {/* Item Info Summary */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
                <MaterialScopeDisplay item={editingItem} />
                <div className="text-muted-foreground flex items-center justify-between text-xs pt-1 border-t border-border">
                  <span>Required: <strong className="text-foreground">{editingItem.finalQuantity} {editingItem.unit}</strong></span>
                  {editingItem.productionPhase && <span>Phase: {editingItem.productionPhase}</span>}
                </div>
              </div>

              {/* Supplier Selection with Dropdown */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Supplier / Vendor (Select from Dropdown)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Auto-fills contact details</span>
                </label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => handleVendorSelect(e.target.value)}
                  className="w-full h-8 text-xs rounded-md border border-border bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  <option value="">-- Choose Supplier from list --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vendorCompanyName ? `${v.vendorCompanyName} (${v.vendorName})` : v.vendorName}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Custom / Other Supplier</option>
                </select>
              </div>

              {/* Supplier Contact Fields (Auto-filled or Custom) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground text-[11px]">Supplier Name</label>
                  <Input
                    value={formVendorName}
                    onChange={(e) => setFormVendorName(e.target.value)}
                    placeholder="Supplier name"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground text-[11px]">Phone</label>
                  <Input
                    value={formVendorPhone}
                    onChange={(e) => setFormVendorPhone(e.target.value)}
                    placeholder="Phone number"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground text-[11px]">Email</label>
                  <Input
                    value={formVendorEmail}
                    onChange={(e) => setFormVendorEmail(e.target.value)}
                    placeholder="Email address"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Purchase Qty & Unit Rate */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Bill Qty ({editingItem.unit})
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={formBillQty}
                    onChange={(e) => setFormBillQty(e.target.value)}
                    placeholder={String(editingItem.finalQuantity)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Unit Rate (৳)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={formUnitPrice}
                    onChange={(e) => setFormUnitPrice(e.target.value)}
                    placeholder="Rate per unit"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Estimated Bill Cost */}
              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground">Estimated Bill Cost:</span>
                  <span className="font-mono text-base font-bold text-foreground">
                    ৳{calculatedTotalSpend.toLocaleString('en-BD')}
                  </span>
                </div>
              </div>

              {/* Bill Notes */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Bill Notes / Remarks</label>
                <Input
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Quoted price from supplier"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingItem(null)}
              className="text-xs h-8"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs h-8 gap-1.5"
              onClick={handleSavePurchase}
              disabled={isSaving}
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save Bill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: DOCUMENTS & INVOICES */}
      <Dialog open={Boolean(documentItem)} onOpenChange={(open) => !open && setDocumentItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Paperclip className="w-4 h-4" />
              Documents & Invoices
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Attach or view supplier cash memos, invoices, and payment slips for {documentItem?.materialName}.
            </DialogDescription>
          </DialogHeader>

          {documentItem && (
            <div className="space-y-4 py-2 text-xs">
              {/* Existing Documents List */}
              <div className="space-y-2">
                <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Attached Files ({purchases[documentItem.id]?.documents?.length || 0})
                </span>
                {(!purchases[documentItem.id]?.documents || purchases[documentItem.id]?.documents?.length === 0) ? (
                  <div className="p-6 text-center border border-dashed border-border rounded-lg text-muted-foreground space-y-1">
                    <FileText className="w-6 h-6 mx-auto opacity-40" />
                    <div>No invoices or documents attached yet</div>
                  </div>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-lg max-h-48 overflow-y-auto">
                    {purchases[documentItem.id]?.documents?.map((doc) => (
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

              {/* Add Document Link or Memo */}
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                  Attach New Document
                </span>
                <div className="space-y-2">
                  <Input
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="Document Title (e.g. Partex Cash Memo #4829)"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={newDocUrl}
                    onChange={(e) => setNewDocUrl(e.target.value)}
                    placeholder="File URL or Cloud storage link (https://...)"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  onClick={handleAttachDocument}
                  disabled={isUploadingDoc}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  {isUploadingDoc ? 'Attaching...' : 'Attach Document'}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDocumentItem(null)} className="h-8 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: DISPATCH TO ACCOUNTS CONFIRMATION */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Send className="w-4 h-4" />
              Dispatch Purchases to Accounts
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirm compiled material purchases to forward to Accounts for voucher clearance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1 text-xs">
            {/* Project info card */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Project / Client:</span>
                <span className="font-semibold text-foreground">{requisition.lead.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Requisition #:</span>
                <span className="font-mono font-medium text-foreground">{requisition.requisitionNo}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="font-semibold text-foreground">Total Material Spend:</span>
                <span className="text-base font-bold font-mono text-foreground">
                  ৳{activeSummary.totalMaterialSpend.toLocaleString('en-BD')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Already Paid: ৳{activeSummary.totalPaidToSuppliers.toLocaleString('en-BD')}</span>
                <span>Due Balance: ৳{activeSummary.totalDueAmount.toLocaleString('en-BD')}</span>
              </div>
            </div>

            {/* Settlement Split Preview */}
            <div className="space-y-1.5">
              <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Accounts Settlement Split
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded border border-border bg-card">
                  <div className="text-muted-foreground">Petty Cash Adjustment:</div>
                  <div className="font-bold text-foreground font-mono">
                    ৳{activeSummary.settlementTotals.pettyCash.toLocaleString('en-BD')}
                  </div>
                </div>
                <div className="p-2 rounded border border-border bg-card">
                  <div className="text-muted-foreground">Purchase Team Advance:</div>
                  <div className="font-bold text-foreground font-mono">
                    ৳{activeSummary.settlementTotals.purchaseTeam.toLocaleString('en-BD')}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Notes */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                Note for Accounts Department
              </label>
              <Input
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Invoices verified and attached for petty cash clearance"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOrderModalOpen(false)}
              className="text-xs h-8"
              disabled={isSaving}
            >
              Back
            </Button>
            <Button
              size="sm"
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs h-8 gap-1.5"
              onClick={handleConfirmOrder}
              disabled={isSaving}
            >
              <Send className="w-3.5 h-3.5" />
              {isSaving ? 'Submitting...' : 'Confirm & Forward to Accounts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: PRINTABLE VOUCHER */}
      <Dialog open={isPrintSlipOpen} onOpenChange={setIsPrintSlipOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Printer className="w-4 h-4" />
              Purchase & Billing Summary Voucher
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 border border-border rounded-lg bg-card text-foreground space-y-4 text-xs font-sans">
            <div className="flex justify-between items-start border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold tracking-tight">AESTHETIC INTERIOR</h3>
                <p className="text-[11px] text-muted-foreground">Procurement Material Purchase Voucher</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Requisition #: <strong className="font-mono text-foreground">{requisition.requisitionNo}</strong>
                </p>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground">Date: {new Date().toLocaleDateString('en-GB')}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Client: <strong className="text-foreground">{requisition.lead.name}</strong>
                </div>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-semibold text-foreground">
                <tr>
                  <th className="py-1.5 px-2">SL</th>
                  <th className="py-1.5 px-2">Material</th>
                  <th className="py-1.5 px-2">Supplier & Memo</th>
                  <th className="py-1.5 px-2 text-right">Spend (৳)</th>
                  <th className="py-1.5 px-2 text-right">Paid (৳)</th>
                  <th className="py-1.5 px-2 text-right">Due (৳)</th>
                  <th className="py-1.5 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeItems
                  .filter((item) => purchases[item.id]?.isBought)
                  .map((item, idx) => {
                    const p = purchases[item.id]
                    return (
                      <tr key={item.id}>
                        <td className="py-1.5 px-2 font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="py-1.5 px-2 font-medium">{getMaterialDisplayName(item)}</td>
                        <td className="py-1.5 px-2 text-[11px] text-muted-foreground">
                          {p.vendorName} {p.invoiceNo ? `(#${p.invoiceNo})` : ''}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold">৳{p.totalAmount.toLocaleString('en-BD')}</td>
                        <td className="py-1.5 px-2 text-right font-mono">৳{p.paidAmount.toLocaleString('en-BD')}</td>
                        <td className="py-1.5 px-2 text-right font-mono">৳{p.dueAmount.toLocaleString('en-BD')}</td>
                        <td className="py-1.5 px-2 text-center text-[10px] font-semibold">{p.paymentStatus}</td>
                      </tr>
                    )
                  })}
              </tbody>
              <tfoot className="border-t-2 border-border font-bold">
                <tr>
                  <td colSpan={3} className="py-2 px-2 text-right uppercase tracking-wider text-[11px]">
                    Total Spend:
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-sm">
                    ৳{orderSummary.totalMaterialSpend.toLocaleString('en-BD')}
                  </td>
                  <td className="py-2 px-2 text-right font-mono">
                    ৳{orderSummary.totalPaidToSuppliers.toLocaleString('en-BD')}
                  </td>
                  <td className="py-2 px-2 text-right font-mono">
                    ৳{orderSummary.totalDueAmount.toLocaleString('en-BD')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <div className="flex justify-between items-end pt-8 text-[10px] text-muted-foreground border-t border-border">
              <div className="text-center">
                <div className="w-24 border-b border-border pb-1"></div>
                <span className="mt-1 block">Prepared By (Procurement)</span>
              </div>
              <div className="text-center">
                <div className="w-24 border-b border-border pb-1"></div>
                <span className="mt-1 block">Adjusted By (Accounts)</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPrintSlipOpen(false)} className="text-xs h-8">
              Close
            </Button>
            <Button
              size="sm"
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs h-8 gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
