'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Package,
  Receipt,
  CheckCircle2,
  Clock,
  Printer,
  Building2,
  Calendar,
  Layers,
  Send,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  X,
  FileCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'

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

export type ItemBillRecord = {
  isBought: boolean
  billQuantity: number
  unitPrice: number
  totalAmount: number
  vendorName: string
  invoiceNo: string
  notes?: string
}

export type WallPanelingSubSection =
  | 'BOARDS'
  | 'DECORATIVE'
  | 'FASTENERS'
  | 'NAILS'
  | 'ADHESIVES'

interface WallPanelingBillMakerProps {
  requisition: {
    id: string
    requisitionNo: string
    status: string
    createdAt: Date | string
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
    notes: string | null
    items: RequisitionItemData[]
  }
}

// Helper to classify Wall Paneling items into sub-sections
function classifyWallPanelingItem(item: RequisitionItemData): WallPanelingSubSection {
  const attrs = (item.variantAttributes || {}) as Record<string, any>
  const wpSub = String(attrs.wpSubType || '').toUpperCase()
  const matName = String(item.materialName || '').toLowerCase()

  // 1. Boards
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

  // 2. Decorative Panels / Louvers / Profiles
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

  // 3. Screws & Fasteners
  if (
    wpSub === 'SCREWS_FASTENERS' ||
    attrs.fastenerType ||
    attrs.lengthInches ||
    matName.includes('screw') ||
    matName.includes('fastener')
  ) {
    return 'FASTENERS'
  }

  // 4. Nails, Pins & Anchors
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

  // 5. Adhesives & Chemical Solvents
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

export function WallPanelingBillMaker({ requisition }: WallPanelingBillMakerProps) {
  // Major section tabs
  const [selectedMainSection, setSelectedMainSection] = useState<'WALL_PANELING' | 'CABINETS_CLOSETS' | 'ACCESSORIES' | 'OTHER'>('WALL_PANELING')

  // Wall Paneling sub-section filter
  const [activeSubSection, setActiveSubSection] = useState<'ALL' | WallPanelingSubSection>('ALL')

  // Search query inside Wall Paneling items
  const [searchQuery, setSearchQuery] = useState('')

  // Billing state keyed by item.id
  const [bills, setBills] = useState<Record<string, ItemBillRecord>>({})

  // Modal states for adding/editing bill
  const [editingItem, setEditingItem] = useState<RequisitionItemData | null>(null)
  const [formBillQty, setFormBillQty] = useState<string>('')
  const [formUnitPrice, setFormUnitPrice] = useState<string>('')
  const [formTotalAmount, setFormTotalAmount] = useState<string>('')
  const [formVendorName, setFormVendorName] = useState<string>('')
  const [formInvoiceNo, setFormInvoiceNo] = useState<string>('')
  const [formNotes, setFormNotes] = useState<string>('')

  // Order submission modal & status
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [orderSubmittedSuccess, setOrderSubmittedSuccess] = useState<string | null>(null)
  const [orderNotes, setOrderNotes] = useState('')

  // Filter Wall Paneling items
  const wallPanelingItems = useMemo(() => {
    return requisition.items.filter((i) => i.workCategory === 'WALL_PANELING')
  }, [requisition.items])

  // Sub-section items
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
      if (bills[item.id]?.isBought) {
        counts[sub].bought += 1
      }
    })

    return counts
  }, [wallPanelingItems, bills])

  // Display items filtered by active sub-section & search
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

  // Overall Wall Paneling bill summary
  const orderSummary = useMemo(() => {
    let totalBilledItems = 0
    let totalBilledCost = 0

    wallPanelingItems.forEach((item) => {
      const b = bills[item.id]
      if (b && b.isBought) {
        totalBilledItems += 1
        totalBilledCost += b.totalAmount || 0
      }
    })

    return {
      totalItems: wallPanelingItems.length,
      totalBilledItems,
      unbilledItems: wallPanelingItems.length - totalBilledItems,
      totalBilledCost,
    }
  }, [wallPanelingItems, bills])

  // Open Add/Edit Bill Modal
  const handleOpenBillModal = (item: RequisitionItemData) => {
    const existing = bills[item.id]
    setEditingItem(item)
    if (existing) {
      setFormBillQty(String(existing.billQuantity))
      setFormUnitPrice(String(existing.unitPrice || ''))
      setFormTotalAmount(String(existing.totalAmount || ''))
      setFormVendorName(existing.vendorName || '')
      setFormInvoiceNo(existing.invoiceNo || '')
      setFormNotes(existing.notes || '')
    } else {
      setFormBillQty(String(item.finalQuantity))
      setFormUnitPrice('')
      setFormTotalAmount('')
      setFormVendorName('')
      setFormInvoiceNo('')
      setFormNotes('')
    }
  }

  // Handle Qty or Unit Price change -> auto calc total
  const handleUnitPriceChange = (val: string) => {
    setFormUnitPrice(val)
    const unitP = parseFloat(val)
    const qty = parseFloat(formBillQty)
    if (!isNaN(unitP) && !isNaN(qty)) {
      setFormTotalAmount(String(Math.round(unitP * qty)))
    }
  }

  const handleBillQtyChange = (val: string) => {
    setFormBillQty(val)
    const qty = parseFloat(val)
    const unitP = parseFloat(formUnitPrice)
    if (!isNaN(unitP) && !isNaN(qty)) {
      setFormTotalAmount(String(Math.round(unitP * qty)))
    }
  }

  // Save Bill for Item
  const handleSaveBill = () => {
    if (!editingItem) return
    const qty = parseFloat(formBillQty) || editingItem.finalQuantity
    const unitP = parseFloat(formUnitPrice) || 0
    const total = parseFloat(formTotalAmount) || (qty * unitP)

    setBills((prev) => ({
      ...prev,
      [editingItem.id]: {
        isBought: true,
        billQuantity: qty,
        unitPrice: unitP,
        totalAmount: total,
        vendorName: formVendorName.trim(),
        invoiceNo: formInvoiceNo.trim(),
        notes: formNotes.trim(),
      },
    }))

    setEditingItem(null)
  }

  // Remove Bill
  const handleRemoveBill = (itemId: string) => {
    setBills((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  // Finalize Order & Forward to Accounts
  const handleConfirmOrder = () => {
    const poNumber = `PO-WP-${Date.now().toString().slice(-6)}`
    setOrderSubmittedSuccess(poNumber)
    setIsOrderModalOpen(false)
  }

  return (
    <div className="w-full space-y-6">
      {/* Success Banner when Order is Created */}
      {orderSubmittedSuccess && (
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-base text-foreground flex items-center gap-2">
                <span>Order Created & Dispatched to Accounts!</span>
                <Badge className="bg-emerald-600 text-white text-xs">{orderSubmittedSuccess}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {orderSummary.totalBilledItems} items totaling ৳{orderSummary.totalBilledCost.toLocaleString('en-BD')} have been submitted to Accounts department for voucher clearance.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            onClick={() => setOrderSubmittedSuccess(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Top Main Section Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Select Requisition Scope
          </span>
          <span className="text-xs text-muted-foreground">
            Starting with Wall Paneling first as requested
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedMainSection('WALL_PANELING')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
              selectedMainSection === 'WALL_PANELING'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-500 ring-offset-2'
                : 'bg-card border hover:border-indigo-400 text-foreground'
            }`}
          >
            <span>🖼️ Wall Paneling</span>
            <Badge className={selectedMainSection === 'WALL_PANELING' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}>
              {wallPanelingItems.length} Materials
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMainSection('CABINETS_CLOSETS')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-muted/40 border border-dashed text-muted-foreground hover:bg-muted/60 transition-all opacity-70"
          >
            <span>🚪 Cabinets & Closets</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">Next Step</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMainSection('ACCESSORIES')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-muted/40 border border-dashed text-muted-foreground hover:bg-muted/60 transition-all opacity-70"
          >
            <span>🧰 Accessories</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">Next Step</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMainSection('OTHER')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-muted/40 border border-dashed text-muted-foreground hover:bg-muted/60 transition-all opacity-70"
          >
            <span>✨ Other Categories</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">Next Step</span>
          </button>
        </div>
      </div>

      {/* Main Section Content Area */}
      {selectedMainSection !== 'WALL_PANELING' ? (
        <div className="rounded-2xl border bg-card p-12 text-center space-y-3">
          <Layers className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-semibold text-foreground">Next Stage Development</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            As requested, we are focusing on and perfecting the <strong>Wall Paneling</strong> bill maker first. Once finalized, this section will be activated.
          </p>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setSelectedMainSection('WALL_PANELING')}
          >
            Return to Wall Paneling
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sub-section Filter Strip & Bill Maker Progress */}
          <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>🖼️ Wall Paneling Material Scope</span>
                  </h2>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {orderSummary.totalBilledItems} / {orderSummary.totalItems} Bought
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select items being purchased, add supplier bill/rates, and mark them as bought
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Wall Paneling material..."
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {/* Sub-Section Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setActiveSubSection('ALL')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSubSection === 'ALL'
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>All Wall Paneling</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 font-mono">
                  {wallPanelingItems.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubSection('BOARDS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSubSection === 'BOARDS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>🪵 Boards</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeSubSection === 'BOARDS' ? 'bg-white/20 text-white' : 'bg-background text-muted-foreground'
                }`}>
                  {subSectionCounts.BOARDS.bought}/{subSectionCounts.BOARDS.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubSection('DECORATIVE')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSubSection === 'DECORATIVE'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>✨ Decorative Panels</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeSubSection === 'DECORATIVE' ? 'bg-white/20 text-white' : 'bg-background text-muted-foreground'
                }`}>
                  {subSectionCounts.DECORATIVE.bought}/{subSectionCounts.DECORATIVE.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubSection('FASTENERS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSubSection === 'FASTENERS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>🔩 Hardware (Screws)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeSubSection === 'FASTENERS' ? 'bg-white/20 text-white' : 'bg-background text-muted-foreground'
                }`}>
                  {subSectionCounts.FASTENERS.bought}/{subSectionCounts.FASTENERS.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubSection('NAILS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSubSection === 'NAILS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>📌 Nails, Pins & Anchors</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeSubSection === 'NAILS' ? 'bg-white/20 text-white' : 'bg-background text-muted-foreground'
                }`}>
                  {subSectionCounts.NAILS.bought}/{subSectionCounts.NAILS.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubSection('ADHESIVES')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSubSection === 'ADHESIVES'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>🧪 Adhesives & Chemicals</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeSubSection === 'ADHESIVES' ? 'bg-white/20 text-white' : 'bg-background text-muted-foreground'
                }`}>
                  {subSectionCounts.ADHESIVES.bought}/{subSectionCounts.ADHESIVES.total}
                </span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full rounded-2xl border bg-card shadow-sm overflow-hidden">
            {displayedItems.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Package className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <h3 className="text-sm font-semibold text-foreground">No Wall Paneling materials found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery ? 'No materials match your search query.' : 'There are currently no items in this sub-section.'}
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-muted/70 text-muted-foreground uppercase text-[11px] font-bold border-b tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Status</th>
                      <th className="py-3 px-4 w-12 text-center">SL</th>
                      <th className="py-3 px-4 min-w-[180px]">Material & Description</th>
                      <th className="py-3 px-4 min-w-[160px]">Specifications / Attributes</th>
                      <th className="py-3 px-4 text-center">Required Qty</th>
                      <th className="py-3 px-4 text-center">Billed Qty</th>
                      <th className="py-3 px-4 text-right">Unit Rate</th>
                      <th className="py-3 px-4 text-right">Total Bill</th>
                      <th className="py-3 px-4 min-w-[140px]">Vendor & Memo</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedItems.map((item, idx) => {
                      const bill = bills[item.id]
                      const isBought = Boolean(bill?.isBought)
                      const attrs = (item.variantAttributes || {}) as Record<string, any>
                      const subType = classifyWallPanelingItem(item)

                      // Format specific details based on sub-section
                      let detailDisplay = null
                      if (subType === 'BOARDS') {
                        detailDisplay = (
                          <div className="space-y-0.5 text-[11px] text-muted-foreground">
                            {attrs.coreThickness && <div>Thickness: <span className="text-foreground font-medium">{attrs.coreThickness}</span></div>}
                            {attrs.laminateTopSurface && <div>Front: <span className="text-foreground">{attrs.laminateTopSurface}</span></div>}
                            {attrs.surfaceCodeFinish && <div>Back: <span className="text-foreground">{attrs.surfaceCodeFinish}</span></div>}
                            {attrs.edgingTapeQty && <div>Edging Tape: <span className="text-foreground">{attrs.edgingTapeQty}</span></div>}
                          </div>
                        )
                      } else if (subType === 'DECORATIVE') {
                        detailDisplay = (
                          <div className="space-y-0.5 text-[11px] text-muted-foreground">
                            {attrs.decorativeType && <div>Type: <span className="text-foreground capitalize">{attrs.decorativeType}</span></div>}
                            {attrs.accentFinish && <div>Accent: <span className="text-foreground">{attrs.accentFinish}</span></div>}
                            {attrs.codeVariant && <div>Code: <span className="text-foreground font-mono">{attrs.codeVariant}</span></div>}
                          </div>
                        )
                      } else if (subType === 'FASTENERS') {
                        detailDisplay = (
                          <div className="space-y-0.5 text-[11px] text-muted-foreground">
                            {attrs.lengthInches && <div>Length: <span className="text-foreground font-medium">{attrs.lengthInches} inches</span></div>}
                            {attrs.fastenerType && <div>Type: <span className="text-foreground">{attrs.fastenerType}</span></div>}
                          </div>
                        )
                      } else if (subType === 'NAILS') {
                        detailDisplay = (
                          <div className="space-y-0.5 text-[11px] text-muted-foreground">
                            {attrs.lengthSpec && <div>Spec: <span className="text-foreground">{attrs.lengthSpec}</span></div>}
                          </div>
                        )
                      } else {
                        detailDisplay = (
                          <div className="text-[11px] text-muted-foreground">
                            {item.specifications || 'Standard specifications'}
                          </div>
                        )
                      }

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isBought
                              ? 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]'
                              : 'hover:bg-muted/30'
                          }`}
                        >
                          {/* Bought Checkmark Status */}
                          <td className="py-3 px-4 text-center">
                            {isBought ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shadow-xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground/40 text-[10px]">
                                —
                              </span>
                            )}
                          </td>

                          {/* SL No */}
                          <td className="py-3 px-4 text-center font-mono text-muted-foreground text-xs">
                            {idx + 1}
                          </td>

                          {/* Material & Description */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground text-sm">
                              {item.materialName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {subType}
                              </Badge>
                              {item.productionPhase && (
                                <span className="text-[10px] text-muted-foreground">
                                  Phase: {item.productionPhase}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Specific Attributes */}
                          <td className="py-3 px-4">
                            {detailDisplay}
                          </td>

                          {/* Required Qty */}
                          <td className="py-3 px-4 text-center font-semibold text-foreground">
                            {item.finalQuantity} <span className="text-xs text-muted-foreground">{item.unit}</span>
                          </td>

                          {/* Billed Qty */}
                          <td className="py-3 px-4 text-center">
                            {isBought ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {bill.billQuantity} {item.unit}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">Not Billed</span>
                            )}
                          </td>

                          {/* Unit Rate */}
                          <td className="py-3 px-4 text-right">
                            {isBought && bill.unitPrice > 0 ? (
                              <span className="font-medium text-foreground">
                                ৳{bill.unitPrice.toLocaleString('en-BD')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Total Bill */}
                          <td className="py-3 px-4 text-right">
                            {isBought ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                ৳{bill.totalAmount.toLocaleString('en-BD')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Vendor & Memo */}
                          <td className="py-3 px-4 text-xs">
                            {isBought && (bill.vendorName || bill.invoiceNo) ? (
                              <div className="space-y-0.5">
                                {bill.vendorName && <div className="font-medium text-foreground">{bill.vendorName}</div>}
                                {bill.invoiceNo && <div className="text-muted-foreground text-[10px]">Memo: {bill.invoiceNo}</div>}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-4 text-right">
                            {isBought ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  onClick={() => handleOpenBillModal(item)}
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit Bill
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-7 h-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  onClick={() => handleRemoveBill(item.id)}
                                  title="Clear Bill"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 shadow-xs"
                                onClick={() => handleOpenBillModal(item)}
                              >
                                <Plus className="w-3 h-3" />
                                Add Bill
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

          {/* Bottom Fixed Order Creation Card */}
          <div className="rounded-2xl border-2 border-indigo-500/20 bg-card p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  Bill Maker Order Dispatch
                </span>
                <span className="text-xs text-muted-foreground">
                  Connects Procurement to Accounts
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
                <span>Total Billed Amount:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ৳{orderSummary.totalBilledCost.toLocaleString('en-BD')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>{orderSummary.totalBilledItems}</strong> of <strong>{orderSummary.totalItems}</strong> Wall Paneling items have bills entered. Unbilled items will remain in the requisition for subsequent orders.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="lg"
                disabled={orderSummary.totalBilledItems === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold shadow-md px-6 disabled:opacity-50"
                onClick={() => setIsOrderModalOpen(true)}
              >
                <Send className="w-4 h-4" />
                Create Order (Send to Accounts)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT BILL PER ITEM */}
      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Receipt className="w-5 h-5 text-indigo-600" />
              {bills[editingItem?.id || '']?.isBought ? 'Edit Purchase Bill' : 'Add Bill for Material'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter purchase and vendor billing details for this item. Marking as billed will automatically flag it as Bought.
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-2">
              {/* Item Info Strip */}
              <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                <div className="font-semibold text-sm text-foreground">{editingItem.materialName}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Required Quantity: <strong>{editingItem.finalQuantity} {editingItem.unit}</strong></span>
                  {editingItem.productionPhase && <span>Phase: {editingItem.productionPhase}</span>}
                </div>
              </div>

              {/* Quantity to Buy */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Quantity to Buy ({editingItem.unit})
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={formBillQty}
                    onChange={(e) => handleBillQtyChange(e.target.value)}
                    placeholder={String(editingItem.finalQuantity)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Unit Price (৳)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={formUnitPrice}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    placeholder="e.g. 1450"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {/* Total Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Total Bill Amount (৳)
                </label>
                <Input
                  type="number"
                  step="any"
                  value={formTotalAmount}
                  onChange={(e) => setFormTotalAmount(e.target.value)}
                  placeholder="Total calculated price"
                  className="text-xs h-9 font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              {/* Vendor & Invoice */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Supplier / Vendor Name
                  </label>
                  <Input
                    value={formVendorName}
                    onChange={(e) => setFormVendorName(e.target.value)}
                    placeholder="e.g. Partex Depot"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Bill / Memo No.
                  </label>
                  <Input
                    value={formInvoiceNo}
                    onChange={(e) => setFormInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-2026-09"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Billing Notes / Specifications
                </label>
                <Input
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional billing remarks"
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingItem(null)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5" onClick={handleSaveBill}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save Bill & Mark Bought
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CREATE ORDER (CONNECT TO ACCOUNTS) */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Send className="w-5 h-5 text-indigo-600" />
              Dispatch Order to Accounts
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review billed items before creating the purchase order and forwarding it to Accounts for payment approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Project info card */}
            <div className="p-3.5 rounded-xl bg-muted/40 border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Project:</span>
                <span className="font-bold text-sm text-foreground">{requisition.lead.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Requisition #:</span>
                <span className="font-mono text-xs font-semibold">{requisition.requisitionNo}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-1.5">
                <span className="text-xs font-semibold text-foreground">Total Order Amount:</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  ৳{orderSummary.totalBilledCost.toLocaleString('en-BD')}
                </span>
              </div>
            </div>

            {/* Billed Items List Preview */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Billed Items ({orderSummary.totalBilledItems})
              </span>
              <div className="max-h-48 overflow-y-auto divide-y divide-border border rounded-xl p-2 bg-background text-xs">
                {wallPanelingItems
                  .filter((item) => bills[item.id]?.isBought)
                  .map((item) => {
                    const b = bills[item.id]
                    return (
                      <div key={item.id} className="py-2 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-foreground">{item.materialName}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {b.billQuantity} {item.unit} @ ৳{b.unitPrice} {b.vendorName ? `• ${b.vendorName}` : ''}
                          </div>
                        </div>
                        <div className="font-bold text-emerald-600 text-right shrink-0">
                          ৳{b.totalAmount.toLocaleString('en-BD')}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Order Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Order Notes for Accounts Team
              </label>
              <Input
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Urgent site delivery requested by Saturday"
                className="text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOrderModalOpen(false)} className="text-xs">
              Back to Editing
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm" onClick={handleConfirmOrder}>
              <ShieldCheck className="w-3.5 h-3.5" />
              Confirm & Send to Accounts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
