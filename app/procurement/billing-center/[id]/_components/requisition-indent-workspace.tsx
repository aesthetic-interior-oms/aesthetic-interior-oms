'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Receipt,
  UserRound,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  Boxes,
  Truck,
  Search,
  UserCheck,
  Package,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  MaterialScopeDisplay,
  getMaterialDisplayName,
} from './material-scope-display'

export type IndentBillingRecord = {
  id: string
  quantity: any
  unitPrice: any
  total: any
  vendorName: string | null
  billedAt: string | Date
  billedBy: { fullName: string }
  indent: {
    id: string
    indentNo: string
    createdAt: string | Date
    createdBy: { fullName: string }
  }
}

export type RequisitionItemData = {
  id: string
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
  quotationLineItemId?: string | null
  indentItems?: IndentBillingRecord[]
}

export type IssuedIndentData = {
  id: string
  indentNo: string
  vendorName: string | null
  transportCost: any
  otherCosts: any
  subtotal: any
  total: any
  notes: string | null
  createdAt: string | Date
  createdBy: { fullName: string }
  items?: Array<{
    id: string
    quantity: any
    unitPrice: any
    total: any
    requisitionItemId: string
  }>
}

export type VendorOption = {
  id: string
  vendorName: string
  vendorCompanyName?: string | null
  primaryPhone?: string | null
  primaryEmail?: string | null
}

export type WallPanelingSubSection =
  | 'BOARDS'
  | 'DECORATIVE'
  | 'FASTENERS'
  | 'NAILS'
  | 'ADHESIVES'

export function classifyWallPanelingItem(item: {
  materialName: string
  specifications?: string | null
  variantAttributes?: any
}): WallPanelingSubSection {
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

export type CabinetUsageCategory = 'SHUTTER' | 'BODY' | 'BACK_PLY' | 'OTHER'

export function classifyCabinetItem(item: {
  variantAttributes?: any
  productionPhase?: string | null
}): CabinetUsageCategory {
  const attrs = (item.variantAttributes || {}) as Record<string, any>
  const usage = (attrs.functionalUsage || attrs.usage || item.productionPhase || '').toLowerCase()
  if (usage.includes('shutter')) return 'SHUTTER'
  if (usage.includes('body') || usage.includes('carcass')) return 'BODY'
  if (usage.includes('back') || usage.includes('backply')) return 'BACK_PLY'
  return 'OTHER'
}

interface RequisitionIndentWorkspaceProps {
  requisition: {
    id: string
    requisitionNo: string
    status: string
    notes: string | null
    createdAt: string | Date
    lead: {
      id: string
      name: string
      phone: string | null
      location: string | null
      assignments?: Array<{
        department?: string
        user?: {
          id?: string
          fullName?: string | null
          phone?: string | null
          email?: string | null
        } | null
      }>
    }
    createdBy: {
      fullName: string | null
    }
    procurementAssignee?: {
      id: string
      fullName: string
      email?: string | null
    } | null
    items: RequisitionItemData[]
    indents: IssuedIndentData[]
  }
  teamMembers: Array<{ id: string; fullName: string; email?: string | null }>
  isLeader: boolean
  defaultVendors?: VendorOption[]
}

function getBilledQty(item: RequisitionItemData): number {
  if (!item.indentItems) return 0
  return item.indentItems.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
}

function getRemainingQty(item: RequisitionItemData): number {
  const billed = getBilledQty(item)
  return Math.max(0, Number((item.finalQuantity - billed).toFixed(3)))
}

function getItemBillingStatus(item: RequisitionItemData): 'UNBILLED' | 'PARTIAL' | 'BILLED' {
  const billed = getBilledQty(item)
  if (billed <= 0) return 'UNBILLED'
  if (billed >= item.finalQuantity - 0.0001) return 'BILLED'
  return 'PARTIAL'
}

export function RequisitionIndentWorkspace({
  requisition,
  teamMembers,
  isLeader,
  defaultVendors = [],
}: RequisitionIndentWorkspaceProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'unbilled' | 'billed' | 'indents'>('unbilled')
  const [actionBusy, setActionBusy] = useState(false)

  // Scope Category filter (e.g. ALL, WALL_PANELING, CABINETS_CLOSETS, etc.)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  // Sub-category filter for Wall Paneling
  const [wallSubFilter, setWallSubFilter] = useState<'ALL' | WallPanelingSubSection>('ALL')
  // Sub-category filter for Cabinets
  const [cabinetSubFilter, setCabinetSubFilter] = useState<'ALL' | CabinetUsageCategory>('ALL')
  // Quick Search
  const [searchQuery, setSearchQuery] = useState('')

  // Indent Generation Form State
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({})
  const [billQuantities, setBillQuantities] = useState<Record<string, string>>({})
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({})
  const [itemVendors, setItemVendors] = useState<Record<string, string>>({})

  // Vendor selection
  const [selectedVendorId, setSelectedVendorId] = useState<string>('')
  const [vendorName, setVendorName] = useState<string>('')
  const [customVendorName, setCustomVendorName] = useState<string>('')

  // Auxiliary costs
  const [transportCost, setTransportCost] = useState<string>('')
  const [otherCosts, setOtherCosts] = useState<string>('')
  const [indentNotes, setIndentNotes] = useState<string>('')

  // Save Section & Auto-Save State (Resistant against sudden page refreshes)
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null)
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false)
  const [autoCreatePO, setAutoCreatePO] = useState(true)

  // Restore saved draft from localStorage on load
  useEffect(() => {
    try {
      const key = `indent_draft_${requisition.id}`
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.selectedItems) setSelectedItems(parsed.selectedItems)
        if (parsed.billQuantities) setBillQuantities(parsed.billQuantities)
        if (parsed.unitPrices) setUnitPrices(parsed.unitPrices)
        if (parsed.itemVendors) setItemVendors(parsed.itemVendors)
        if (parsed.vendorName) setVendorName(parsed.vendorName)
        if (parsed.customVendorName) setCustomVendorName(parsed.customVendorName)
        if (parsed.selectedVendorId) setSelectedVendorId(parsed.selectedVendorId)
        if (parsed.transportCost) setTransportCost(parsed.transportCost)
        if (parsed.otherCosts) setOtherCosts(parsed.otherCosts)
        if (parsed.indentNotes) setIndentNotes(parsed.indentNotes)
        if (parsed.savedAt) setLastSavedTime(parsed.savedAt)
        toast.info('Restored your unsaved working draft from previous session.', {
          description: `Auto-saved at ${parsed.savedAt || 'recently'}`,
        })
      }
    } catch {
      // ignore JSON parse errors
    } finally {
      setHasRestoredDraft(true)
    }
  }, [requisition.id])

  // Auto-save changes to localStorage (debounced)
  useEffect(() => {
    if (!hasRestoredDraft) return
    const hasContent =
      Object.values(selectedItems).some(Boolean) ||
      Object.keys(unitPrices).length > 0 ||
      Object.keys(itemVendors).length > 0 ||
      vendorName ||
      transportCost ||
      otherCosts ||
      indentNotes

    if (!hasContent) return

    const timer = setTimeout(() => {
      const now = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      const draft = {
        selectedItems,
        billQuantities,
        unitPrices,
        itemVendors,
        vendorName,
        customVendorName,
        selectedVendorId,
        transportCost,
        otherCosts,
        indentNotes,
        savedAt: now,
      }
      try {
        localStorage.setItem(`indent_draft_${requisition.id}`, JSON.stringify(draft))
        setLastSavedTime(now)
      } catch {
        // storage quota exceeded or disabled
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [
    hasRestoredDraft,
    selectedItems,
    billQuantities,
    unitPrices,
    itemVendors,
    vendorName,
    customVendorName,
    selectedVendorId,
    transportCost,
    otherCosts,
    indentNotes,
    requisition.id,
  ])

  // Explicit Manual Save
  const handleManualSaveDraft = () => {
    const now = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const draft = {
      selectedItems,
      billQuantities,
      unitPrices,
      itemVendors,
      vendorName,
      customVendorName,
      selectedVendorId,
      transportCost,
      otherCosts,
      indentNotes,
      savedAt: now,
    }
    try {
      localStorage.setItem(`indent_draft_${requisition.id}`, JSON.stringify(draft))
      setLastSavedTime(now)
      toast.success('Working draft saved safely!', {
        description: 'Rates, suppliers, and quantities are preserved. A sudden refresh will not lose your data.',
      })
    } catch {
      toast.error('Could not save draft locally')
    }
  }

  // Clear Draft
  const handleClearDraft = () => {
    if (confirm('Are you sure you want to clear this working draft? All entered quantities and rates will reset.')) {
      try {
        localStorage.removeItem(`indent_draft_${requisition.id}`)
      } catch {
        // ignore
      }
      setSelectedItems({})
      setBillQuantities({})
      setUnitPrices({})
      setItemVendors({})
      setVendorName('')
      setCustomVendorName('')
      setSelectedVendorId('')
      setTransportCost('')
      setOtherCosts('')
      setIndentNotes('')
      setLastSavedTime(null)
      toast.success('Working draft cleared')
    }
  }

  // Expandable Indents in Issued view
  const [expandedIndentId, setExpandedIndentId] = useState<string | null>(null)

  // Assignment state
  const [assigneeId, setAssigneeId] = useState<string>(
    requisition.procurementAssignee?.id || '',
  )

  // Site Engineer assigned to lead
  const siteEngineer = requisition.lead.assignments?.find(
    (a) => a.department === 'SITE_ENGINEER',
  )?.user

  // Distinct Work Categories in this Requisition
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(requisition.items.map((i) => i.workCategory)))
  }, [requisition.items])

  // Items count
  const unbilledItems = useMemo(
    () => requisition.items.filter((i) => getRemainingQty(i) > 0),
    [requisition.items],
  )
  const billedItems = useMemo(
    () => requisition.items.filter((i) => getBilledQty(i) > 0),
    [requisition.items],
  )

  // Sub-section counts for Wall Paneling (among unbilled or all items)
  const wallPanelingItems = useMemo(() => {
    return requisition.items.filter((i) => i.workCategory === 'WALL_PANELING')
  }, [requisition.items])

  const wallSubCounts = useMemo(() => {
    const counts: Record<WallPanelingSubSection, { total: number; unbilled: number }> = {
      BOARDS: { total: 0, unbilled: 0 },
      DECORATIVE: { total: 0, unbilled: 0 },
      FASTENERS: { total: 0, unbilled: 0 },
      NAILS: { total: 0, unbilled: 0 },
      ADHESIVES: { total: 0, unbilled: 0 },
    }
    wallPanelingItems.forEach((i) => {
      const sub = classifyWallPanelingItem(i)
      counts[sub].total += 1
      if (getRemainingQty(i) > 0) counts[sub].unbilled += 1
    })
    return counts
  }, [wallPanelingItems])

  // Sub-section counts for Cabinets
  const cabinetItems = useMemo(() => {
    return requisition.items.filter((i) => i.workCategory === 'CABINETS_CLOSETS')
  }, [requisition.items])

  const cabinetSubCounts = useMemo(() => {
    const counts: Record<CabinetUsageCategory, { total: number; unbilled: number }> = {
      SHUTTER: { total: 0, unbilled: 0 },
      BODY: { total: 0, unbilled: 0 },
      BACK_PLY: { total: 0, unbilled: 0 },
      OTHER: { total: 0, unbilled: 0 },
    }
    cabinetItems.forEach((i) => {
      const sub = classifyCabinetItem(i)
      counts[sub].total += 1
      if (getRemainingQty(i) > 0) counts[sub].unbilled += 1
    })
    return counts
  }, [cabinetItems])

  // Filtered Unbilled Items based on Category, Sub-section, and Search
  const filteredUnbilledItems = useMemo(() => {
    return unbilledItems.filter((item) => {
      // 1. Category Filter
      if (selectedCategory !== 'ALL' && item.workCategory !== selectedCategory) {
        return false
      }

      // 2. Sub-category Filter for Wall Paneling
      if (item.workCategory === 'WALL_PANELING') {
        const sub = classifyWallPanelingItem(item)
        if (wallSubFilter !== 'ALL' && sub !== wallSubFilter) return false
      }

      // 3. Sub-category Filter for Cabinets
      if (item.workCategory === 'CABINETS_CLOSETS') {
        const sub = classifyCabinetItem(item)
        if (cabinetSubFilter !== 'ALL' && sub !== cabinetSubFilter) return false
      }

      // 4. Quick Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = item.materialName.toLowerCase().includes(q)
        const matchSpec = (item.specifications || '').toLowerCase().includes(q)
        const matchPhase = (item.productionPhase || '').toLowerCase().includes(q)
        const attrs = (item.variantAttributes || {}) as Record<string, any>
        const matchAttrs = JSON.stringify(attrs).toLowerCase().includes(q)
        return matchName || matchSpec || matchPhase || matchAttrs
      }

      return true
    })
  }, [unbilledItems, selectedCategory, wallSubFilter, cabinetSubFilter, searchQuery])

  // Vendor selection handler
  const handleVendorDropdownChange = (vId: string) => {
    setSelectedVendorId(vId)
    if (!vId || vId === 'CUSTOM') {
      setVendorName(customVendorName)
      return
    }
    const found = defaultVendors.find((v) => v.id === vId)
    if (found) {
      const name = found.vendorCompanyName || found.vendorName
      setVendorName(name)
      setCustomVendorName(name)
    }
  }

  // Toggle selection
  const toggleItem = (itemId: string, remaining: number) => {
    setSelectedItems((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] }
      if (next[itemId] && !billQuantities[itemId]) {
        setBillQuantities((bPrev) => ({ ...bPrev, [itemId]: String(remaining) }))
      }
      return next
    })
  }

  // Select / Deselect all visible filtered unbilled items
  const toggleSelectFiltered = () => {
    const allSelected = filteredUnbilledItems.every((i) => selectedItems[i.id])
    const next: Record<string, boolean> = { ...selectedItems }
    const nextQtys = { ...billQuantities }

    filteredUnbilledItems.forEach((i) => {
      next[i.id] = !allSelected
      if (!allSelected && !nextQtys[i.id]) {
        nextQtys[i.id] = String(getRemainingQty(i))
      }
    })

    setSelectedItems(next)
    setBillQuantities(nextQtys)
  }

  // Delegation
  const handleAssignMember = async (newAssigneeId: string) => {
    setActionBusy(true)
    try {
      const response = await fetch('/api/procurement/requisitions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisitionId: requisition.id,
          assigneeId: newAssigneeId || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Assignment failed')
      setAssigneeId(newAssigneeId)
      toast.success(newAssigneeId ? 'Procurement task delegated' : 'Assignment cleared')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assignment failed')
    } finally {
      setActionBusy(false)
    }
  }

  // Live Indent Preview Calculation
  const indentPreview = useMemo(() => {
    const chosen = requisition.items.filter((i) => selectedItems[i.id] && getRemainingQty(i) > 0)
    let subtotal = 0

    chosen.forEach((item) => {
      const qty = Number(billQuantities[item.id] || getRemainingQty(item))
      const price = Number(unitPrices[item.id] || 0)
      if (qty > 0 && price >= 0) {
        subtotal += qty * price
      }
    })

    const transport = Number(transportCost || 0)
    const other = Number(otherCosts || 0)
    const total = subtotal + transport + other

    return {
      selectedCount: chosen.length,
      subtotal,
      transport,
      other,
      total,
      chosenItems: chosen,
    }
  }, [requisition.items, selectedItems, billQuantities, unitPrices, transportCost, otherCosts])

  // Create Indent
  const handleCreateIndent = async () => {
    if (indentPreview.selectedCount === 0) {
      toast.error('Select at least one unbilled material item')
      return
    }

    // Validate
    for (const item of indentPreview.chosenItems) {
      const qty = Number(billQuantities[item.id] || getRemainingQty(item))
      const price = unitPrices[item.id]
      const rem = getRemainingQty(item)

      if (qty <= 0 || qty > rem + 0.0001) {
        toast.error(`Invalid quantity for ${item.materialName}. Max: ${rem} ${item.unit}`)
        return
      }

      if (price === undefined || price === '' || isNaN(Number(price)) || Number(price) < 0) {
        toast.error(`Please enter a valid negotiated unit price for "${item.materialName}"`)
        return
      }
    }

    setActionBusy(true)
    try {
      const payload = {
        requisitionId: requisition.id,
        vendorName: vendorName.trim() || null,
        transportCost: Number(transportCost || 0),
        otherCosts: Number(otherCosts || 0),
        notes: indentNotes.trim() || null,
        createPurchaseOrder: autoCreatePO,
        items: indentPreview.chosenItems.map((item) => ({
          itemId: item.id,
          quantity: Number(billQuantities[item.id] || getRemainingQty(item)),
          unitPrice: Number(unitPrices[item.id]),
          vendorName: itemVendors[item.id]?.trim() || vendorName.trim() || null,
        })),
      }

      const response = await fetch('/api/procurement/indents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create Indent')
      }

      toast.success(
        autoCreatePO
          ? `Indent ${data.data?.indentNo || 'Bill'} Created & Dispatched to Accounts!`
          : `Indent ${data.data?.indentNo || 'Bill'} Created & Dispatched!`,
        {
          description: `Auto-routed to ${requisition.lead.name} site for receiving.`,
        },
      )

      // Clear saved draft from localStorage
      try {
        localStorage.removeItem(`indent_draft_${requisition.id}`)
      } catch {
        // ignore
      }

      // Reset selection and inputs
      setSelectedItems({})
      setBillQuantities({})
      setUnitPrices({})
      setItemVendors({})
      setVendorName('')
      setCustomVendorName('')
      setSelectedVendorId('')
      setTransportCost('')
      setOtherCosts('')
      setIndentNotes('')
      setLastSavedTime(null)

      router.refresh()
      setActiveTab('indents')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate Indent')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="w-full space-y-5">
      {/* 1. Site Delivery & Receiver Auto-Destination Card */}
      <div className="rounded-lg border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-foreground text-background shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground flex flex-wrap items-center gap-2">
              <span>Delivery Site: {requisition.lead.name}</span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                {requisition.lead.location || 'Site Location Not Set'}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Assigned Site Receiver:{' '}
              <strong className="text-foreground">
                {siteEngineer?.fullName || 'Designated Site Engineer'}
              </strong>
              {siteEngineer?.phone ? ` (${siteEngineer.phone})` : ''} • All purchases automatically route to this project site
            </p>
          </div>
        </div>

        {/* Assigned Procurement Officer */}
        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
          {isLeader ? (
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 shadow-2xs">
              <UserRound className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                Buyer:
              </span>
              <select
                className="h-6 text-xs bg-transparent border-0 font-medium text-foreground focus:ring-0 focus:outline-none cursor-pointer"
                value={assigneeId}
                onChange={(e) => void handleAssignMember(e.target.value)}
                disabled={actionBusy}
              >
                <option value="">Unassigned (Leader Queue)</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs bg-muted/40 border border-border rounded-md px-3 py-1.5 text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Procurement Handler:{' '}
                <strong className="text-foreground">
                  {requisition.procurementAssignee?.fullName ?? 'Procurement Team'}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Workflow Mode Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2.5">
        <button
          type="button"
          onClick={() => setActiveTab('unbilled')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'unbilled'
              ? 'bg-foreground text-background shadow-xs'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Generate Indents &amp; Sourcing</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
            activeTab === 'unbilled' ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
          }`}>
            {unbilledItems.length} unbilled
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('indents')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'indents'
              ? 'bg-foreground text-background shadow-xs'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Issued Indents &amp; Site Dispatches</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
            activeTab === 'indents' ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
          }`}>
            {requisition.indents?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('billed')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'billed'
              ? 'bg-foreground text-background shadow-xs'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Line-Item Audit (All Items)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
            activeTab === 'billed' ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
          }`}>
            {requisition.items.length}
          </span>
        </button>
      </div>

      {/* TAB 1: UNBILLED MATERIALS (HIGH-DESIGN INDENT WORKSPACE) */}
      {activeTab === 'unbilled' && (
        <div className="space-y-4">
          {unbilledItems.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
              <p className="text-base font-semibold text-foreground">
                All materials in this requisition are fully billed!
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                All items have been converted into official Indents. View issued bills under the &ldquo;Issued Indents &amp; Site Dispatches&rdquo; tab.
              </p>
            </div>
          ) : (
            <>
              {/* Category Scope Selector (Wall Paneling, Cabinets, etc.) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    Material Work Scope
                  </span>
                  <span>Filter by scope category or carpentry sub-section</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('ALL')
                      setWallSubFilter('ALL')
                      setCabinetSubFilter('ALL')
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                      selectedCategory === 'ALL'
                        ? 'bg-foreground text-background border-foreground shadow-xs'
                        : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>All Scope</span>
                    <span className={`text-[11px] px-1.5 py-0.2 rounded font-mono ${
                      selectedCategory === 'ALL' ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                    }`}>
                      {unbilledItems.length}
                    </span>
                  </button>

                  {uniqueCategories.map((cat) => {
                    const count = unbilledItems.filter((i) => i.workCategory === cat).length
                    const isSelected = selectedCategory === cat
                    const label = cat === 'WALL_PANELING' ? 'Wall Paneling' : cat === 'CABINETS_CLOSETS' ? 'Cabinets & Closets' : cat.replace(/_/g, ' ')

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat)
                          if (cat === 'WALL_PANELING') setWallSubFilter('ALL')
                          if (cat === 'CABINETS_CLOSETS') setCabinetSubFilter('ALL')
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                          isSelected
                            ? 'bg-foreground text-background border-foreground shadow-xs'
                            : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        {cat === 'CABINETS_CLOSETS' ? (
                          <Boxes className="w-3.5 h-3.5" />
                        ) : (
                          <Layers className="w-3.5 h-3.5" />
                        )}
                        <span>{label}</span>
                        <span className={`text-[11px] px-1.5 py-0.2 rounded font-mono ${
                          isSelected ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                        }`}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sub-Category Filter Bar & Search */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-foreground">
                        {selectedCategory === 'WALL_PANELING'
                          ? 'Wall Paneling Materials & Hardware'
                          : selectedCategory === 'CABINETS_CLOSETS'
                          ? 'Cabinets & Closets Components'
                          : 'Material Sourcing & Rate Entry'}
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded border border-border font-mono font-medium text-foreground bg-muted/30">
                        {filteredUnbilledItems.length} Materials Displayed
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select items to include in this indent, specify partial or full quantities, and set negotiated rates.
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search material, laminate, spec..."
                      className="pl-8 h-8 text-xs bg-background border-border"
                    />
                  </div>
                </div>

                {/* Sub-Category Pills for Wall Paneling */}
                {(selectedCategory === 'WALL_PANELING' || (selectedCategory === 'ALL' && wallPanelingItems.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
                    <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                      Wall Paneling Sub-types:
                    </span>
                    <button
                      type="button"
                      onClick={() => setWallSubFilter('ALL')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                        wallSubFilter === 'ALL'
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>All</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWallSubFilter('BOARDS')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                        wallSubFilter === 'BOARDS'
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>Boards &amp; Plywood</span>
                      <span className="text-[10px] font-mono opacity-80">({wallSubCounts.BOARDS.unbilled})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWallSubFilter('DECORATIVE')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                        wallSubFilter === 'DECORATIVE'
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>Louvers &amp; Profiles</span>
                      <span className="text-[10px] font-mono opacity-80">({wallSubCounts.DECORATIVE.unbilled})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWallSubFilter('FASTENERS')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                        wallSubFilter === 'FASTENERS'
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>Screws &amp; Fasteners</span>
                      <span className="text-[10px] font-mono opacity-80">({wallSubCounts.FASTENERS.unbilled})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWallSubFilter('NAILS')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                        wallSubFilter === 'NAILS'
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>Nails &amp; Pins</span>
                      <span className="text-[10px] font-mono opacity-80">({wallSubCounts.NAILS.unbilled})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWallSubFilter('ADHESIVES')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                        wallSubFilter === 'ADHESIVES'
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>Adhesives &amp; Chemicals</span>
                      <span className="text-[10px] font-mono opacity-80">({wallSubCounts.ADHESIVES.unbilled})</span>
                    </button>
                  </div>
                )}

                {/* Sub-Category Pills for Cabinets */}
                {(selectedCategory === 'CABINETS_CLOSETS' || (selectedCategory === 'ALL' && cabinetItems.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
                    <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                      Cabinet Usage:
                    </span>
                    <button
                      type="button"
                      onClick={() => setCabinetSubFilter('ALL')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                        cabinetSubFilter === 'ALL'
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>All</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCabinetSubFilter('SHUTTER')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                        cabinetSubFilter === 'SHUTTER'
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>Shutter</span>
                      <span className="text-[10px] font-mono opacity-80">({cabinetSubCounts.SHUTTER.unbilled})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCabinetSubFilter('BODY')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                        cabinetSubFilter === 'BODY'
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>Carcass / Body</span>
                      <span className="text-[10px] font-mono opacity-80">({cabinetSubCounts.BODY.unbilled})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCabinetSubFilter('BACK_PLY')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                        cabinetSubFilter === 'BACK_PLY'
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>Back Ply</span>
                      <span className="text-[10px] font-mono opacity-80">({cabinetSubCounts.BACK_PLY.unbilled})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCabinetSubFilter('OTHER')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                        cabinetSubFilter === 'OTHER'
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>Other / Hardware</span>
                      <span className="text-[10px] font-mono opacity-80">({cabinetSubCounts.OTHER.unbilled})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Vendor & Auxiliary Cost Entry Bar */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-xs">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Indent Batch &amp; Supplier Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Supplier dropdown */}
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Supplier / Vendor
                    </label>
                    <div className="space-y-1.5">
                      <select
                        aria-label="Select registered vendor"
                        className="w-full h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                        value={selectedVendorId}
                        onChange={(e) => handleVendorDropdownChange(e.target.value)}
                      >
                        <option value="">-- Choose Registered Vendor --</option>
                        {defaultVendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.vendorCompanyName ? `${v.vendorCompanyName} (${v.vendorName})` : v.vendorName}
                          </option>
                        ))}
                        <option value="CUSTOM">Custom / Other Vendor...</option>
                      </select>

                      {(!selectedVendorId || selectedVendorId === 'CUSTOM') && (
                        <Input
                          placeholder="Type custom vendor name..."
                          value={customVendorName}
                          onChange={(e) => {
                            setCustomVendorName(e.target.value)
                            setVendorName(e.target.value)
                          }}
                          className="h-8 text-xs bg-background"
                        />
                      )}
                    </div>
                  </div>

                  {/* Transport Cost */}
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Transport Cost (৳)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={transportCost}
                      onChange={(e) => setTransportCost(e.target.value)}
                      className="h-8 text-xs bg-background font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Direct truck/van to site</p>
                  </div>

                  {/* Other / Auxiliary Costs */}
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Auxiliary / Other Costs (৳)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={otherCosts}
                      onChange={(e) => setOtherCosts(e.target.value)}
                      className="h-8 text-xs bg-background font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Labor, loading, unloading</p>
                  </div>

                  {/* Batch Notes */}
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Batch Notes / Purpose
                    </label>
                    <Input
                      placeholder="e.g. Batch 1 - Core boards &amp; hardware"
                      value={indentNotes}
                      onChange={(e) => setIndentNotes(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Reference for site team &amp; accounts</p>
                  </div>
                </div>
              </div>

              {/* Action Bar & Selection Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-card border border-border rounded-lg text-xs shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectFiltered}
                    className="h-7 text-xs"
                  >
                    Select / Deselect Visible ({filteredUnbilledItems.length})
                  </Button>

                  {/* Save Section / Draft Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleManualSaveDraft}
                    className="h-7 text-xs gap-1 font-medium text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800"
                    title="Safely save working draft to browser storage so refresh won't remove data"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Section
                  </Button>

                  {lastSavedTime && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearDraft}
                      className="h-7 text-xs text-muted-foreground hover:text-rose-600 gap-1 px-2"
                      title="Clear working draft"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear
                    </Button>
                  )}

                  {lastSavedTime && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-mono pl-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      Saved at {lastSavedTime} (Refresh Safe)
                    </span>
                  )}

                  <span className="text-muted-foreground pl-1">
                    <strong className="text-foreground">{indentPreview.selectedCount}</strong> material(s) chosen
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {indentPreview.selectedCount > 0 && (
                    <>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          Subtotal: <strong className="text-foreground font-mono">৳{indentPreview.subtotal.toLocaleString('en-BD')}</strong>
                        </span>
                        <span>•</span>
                        <span className="text-foreground font-bold text-sm font-mono">
                          Total: ৳{indentPreview.total.toLocaleString('en-BD')}
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateIndent}
                        disabled={indentPreview.selectedCount === 0 || actionBusy}
                        className="h-7 text-xs px-3 font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 gap-1 shadow-2xs"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        {actionBusy ? 'Generating...' : 'Generate & Dispatch'}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* High-Contrast Table Container with MaterialScopeDisplay */}
              <div className="w-full rounded-lg border border-border bg-card shadow-xs overflow-hidden">
                {filteredUnbilledItems.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <Package className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <h3 className="text-xs font-semibold text-foreground">No matching materials found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {searchQuery ? 'No materials match your search keyword.' : 'No unbilled materials in this sub-section.'}
                    </p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/50 text-foreground font-semibold border-b border-border text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">Select</th>
                          <th className="py-2.5 px-3 w-10 text-center">SL</th>
                          <th className="py-2.5 px-3 min-w-[220px]">Material &amp; Scope Specification</th>
                          <th className="py-2.5 px-3 min-w-[120px]">Sub-Type / Classification</th>
                          <th className="py-2.5 px-3 min-w-[150px]">Supplier / Vendor</th>
                          <th className="py-2.5 px-3 text-center min-w-[120px]">Req / Remaining</th>
                          <th className="py-2.5 px-3 min-w-[120px]">Bill Qty</th>
                          <th className="py-2.5 px-3 min-w-[120px] text-right">Unit Rate (৳)</th>
                          <th className="py-2.5 px-3 text-right min-w-[110px]">Estimated Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredUnbilledItems.map((item, idx) => {
                          const isSelected = Boolean(selectedItems[item.id])
                          const remaining = getRemainingQty(item)
                          const currentQty = Number(billQuantities[item.id] || remaining)
                          const currentPrice = Number(unitPrices[item.id] || 0)
                          const lineTotal = currentQty * currentPrice

                          // Determine sub-type for badge display
                          let subTypeLabel = ''
                          if (item.workCategory === 'WALL_PANELING') {
                            subTypeLabel = classifyWallPanelingItem(item)
                          } else if (item.workCategory === 'CABINETS_CLOSETS') {
                            subTypeLabel = classifyCabinetItem(item)
                          } else {
                            subTypeLabel = item.workCategory.replace(/_/g, ' ')
                          }

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors hover:bg-muted/20 ${
                                isSelected ? 'bg-muted/10' : ''
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${item.materialName}`}
                                  checked={isSelected}
                                  onChange={() => toggleItem(item.id, remaining)}
                                  className="h-4 w-4 rounded border-border text-foreground focus:ring-foreground cursor-pointer"
                                />
                              </td>

                              {/* SL */}
                              <td className="py-2.5 px-3 text-center font-mono text-muted-foreground text-xs">
                                {idx + 1}
                              </td>

                              {/* Material Scope Display (Blue front laminate, orange back laminate, thickness, etc.) */}
                              <td className="py-2.5 px-3">
                                <MaterialScopeDisplay item={item} subType={subTypeLabel} />
                              </td>

                              {/* Sub-type classification */}
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                                  {subTypeLabel}
                                </span>
                              </td>

                              {/* Supplier / Vendor per item */}
                              <td className="py-2.5 px-3">
                                <input
                                  list="registered-vendors-datalist"
                                  placeholder={vendorName || 'Pick / Type Supplier'}
                                  value={itemVendors[item.id] ?? ''}
                                  onChange={(e) =>
                                    setItemVendors((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                  disabled={!isSelected}
                                  className="h-7 text-xs bg-background border border-border rounded px-2 w-36 font-medium placeholder:text-muted-foreground/60 disabled:opacity-50 disabled:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-foreground"
                                />
                              </td>

                              {/* Req / Remaining */}
                              <td className="py-2.5 px-3 text-center font-mono">
                                <div className="text-muted-foreground text-[11px]">
                                  Req: {item.finalQuantity} {item.unit}
                                </div>
                                <div className="font-semibold text-foreground">
                                  Rem: {remaining} {item.unit}
                                </div>
                              </td>

                              {/* Bill Quantity input */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0.001"
                                    max={remaining}
                                    step="any"
                                    value={billQuantities[item.id] ?? String(remaining)}
                                    onChange={(e) =>
                                      setBillQuantities((prev) => ({
                                        ...prev,
                                        [item.id]: e.target.value,
                                      }))
                                    }
                                    disabled={!isSelected}
                                    className="h-7 text-xs font-mono bg-background border-border w-20"
                                  />
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    {item.unit}
                                  </span>
                                </div>
                              </td>

                              {/* Unit Rate (৳) */}
                              <td className="py-2.5 px-3 text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="Rate (৳)"
                                  value={unitPrices[item.id] ?? ''}
                                  onChange={(e) =>
                                    setUnitPrices((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                  disabled={!isSelected}
                                  className="h-7 text-xs font-mono bg-background border-border text-right w-24 ml-auto"
                                />
                              </td>

                              {/* Estimated Total */}
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                                {isSelected && currentPrice > 0
                                  ? `৳${lineTotal.toLocaleString('en-BD')}`
                                  : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <datalist id="registered-vendors-datalist">
                      {defaultVendors.map((v) => {
                        const val = v.vendorCompanyName
                          ? `${v.vendorCompanyName} (${v.vendorName})`
                          : v.vendorName
                        return <option key={v.id} value={val}>{val}</option>
                      })}
                    </datalist>
                  </div>
                )}
              </div>

              {/* Accounts Summary & Dispatch Card */}
              <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Indent Spend Summary
                      </span>
                      <span className="text-xs text-muted-foreground">• Ready to Dispatch to Accounts &amp; Site</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                      <span>Total Indent Value:</span>
                      <span className="font-mono">৳{indentPreview.total.toLocaleString('en-BD')}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                      <span>Materials: <strong className="text-foreground">৳{indentPreview.subtotal.toLocaleString('en-BD')}</strong></span>
                      <span>Transport: <strong className="text-foreground">৳{indentPreview.transport.toLocaleString('en-BD')}</strong></span>
                      <span>Other: <strong className="text-foreground">৳{indentPreview.other.toLocaleString('en-BD')}</strong></span>
                      <span>({indentPreview.selectedCount} material(s) chosen)</span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground select-none pt-1">
                      <input
                        type="checkbox"
                        checked={autoCreatePO}
                        onChange={(e) => setAutoCreatePO(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-foreground focus:ring-foreground cursor-pointer"
                      />
                      <span>Auto-create Purchase Order and dispatch to Accounts for approval</span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleManualSaveDraft}
                      className="h-10 px-4 gap-1.5 font-medium border-border"
                      title="Safely save working draft to browser storage so refresh won't remove data"
                    >
                      <Save className="w-4 h-4 text-emerald-600" />
                      Save Section
                    </Button>

                    <Button
                      type="button"
                      onClick={handleCreateIndent}
                      disabled={indentPreview.selectedCount === 0 || actionBusy}
                      className="h-10 px-5 gap-2 font-semibold shadow-xs bg-foreground text-background hover:bg-foreground/90"
                    >
                      <Receipt className="w-4 h-4" />
                      {actionBusy
                        ? 'Generating & Dispatching...'
                        : `Generate Indent & Dispatch (৳${indentPreview.total.toLocaleString('en-BD')})`}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: ISSUED INDENTS & SITE DISPATCHES */}
      {activeTab === 'indents' && (
        <div className="space-y-4">
          {!requisition.indents || requisition.indents.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground text-xs space-y-2 shadow-xs">
              <Receipt className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="font-semibold text-foreground text-sm">No Indents Issued Yet</p>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Select materials in the &ldquo;Generate Indents &amp; Sourcing&rdquo; tab and click generate to create your first Indent bill.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requisition.indents.map((indent, idx) => {
                const isExpanded = expandedIndentId === indent.id

                return (
                  <Card key={indent.id} className="shadow-xs border border-border bg-card overflow-hidden">
                    <CardHeader className="p-3.5 pb-2.5 bg-muted/20 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-foreground">
                          <Receipt className="w-3.5 h-3.5" />
                          <span>{indent.indentNo}</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                          Batch #{requisition.indents.length - idx}
                        </span>
                      </div>
                      <CardDescription className="text-[11px] text-muted-foreground mt-1">
                        Issued by <strong className="text-foreground">{indent.createdBy.fullName}</strong> on{' '}
                        {new Date(indent.createdAt).toLocaleDateString('en-GB')}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-3.5 space-y-2.5 text-xs">
                      {/* Destination & Site Engineer Banner */}
                      <div className="p-2 rounded bg-muted/30 border border-border space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Delivery Site:</span>
                          <span className="font-semibold text-foreground truncate max-w-[160px]">
                            {requisition.lead.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Site Receiver:</span>
                          <span className="font-medium text-foreground">
                            {siteEngineer?.fullName || 'Assigned Site Engineer'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px]">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                            <Truck className="w-3 h-3" />
                            Dispatched to Site
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Vendor:</span>
                        <span className="font-semibold text-foreground">
                          {indent.vendorName || 'Direct / Local Supplier'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Material Items:</span>
                        <span className="font-medium text-foreground font-mono">
                          {indent.items?.length || 0} line items
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Material Cost:</span>
                        <span className="font-mono">
                          ৳{Number(indent.subtotal).toLocaleString('en-BD')}
                        </span>
                      </div>

                      {(Number(indent.transportCost) > 0 || Number(indent.otherCosts) > 0) && (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Transport &amp; Aux:</span>
                          <span className="font-mono">
                            +৳{(Number(indent.transportCost) + Number(indent.otherCosts)).toLocaleString('en-BD')}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border font-semibold text-foreground">
                        <span>Total Indent:</span>
                        <span className="font-mono text-sm font-bold text-foreground">
                          ৳{Number(indent.total).toLocaleString('en-BD')}
                        </span>
                      </div>

                      {indent.notes && (
                        <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border">
                          &ldquo;{indent.notes}&rdquo;
                        </p>
                      )}

                      {/* Expand line items */}
                      {indent.items && indent.items.length > 0 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setExpandedIndentId(isExpanded ? null : indent.id)}
                            className="w-full flex items-center justify-center gap-1 py-1 text-[11px] text-muted-foreground hover:text-foreground font-medium rounded hover:bg-muted/50 transition-colors"
                          >
                            <span>{isExpanded ? 'Hide Items' : `View ${indent.items.length} Items Breakdown`}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 text-[11px]">
                              {indent.items.map((row) => {
                                const original = requisition.items.find((i) => i.id === row.requisitionItemId)
                                return (
                                  <div
                                    key={row.id}
                                    className="p-1.5 rounded bg-muted/40 border border-border flex items-center justify-between"
                                  >
                                    <div className="truncate mr-2">
                                      <div className="font-medium text-foreground truncate">
                                        {original?.materialName || 'Material Item'}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground font-mono">
                                        {Number(row.quantity)} {original?.unit || 'units'} @ ৳{Number(row.unitPrice)}
                                      </div>
                                    </div>
                                    <div className="font-mono font-semibold text-foreground shrink-0">
                                      ৳{Number(row.total).toLocaleString('en-BD')}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LINE-ITEM AUDIT */}
      {activeTab === 'billed' && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/50 text-foreground font-semibold border-b border-border text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Material Name &amp; Spec</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Total Requested</th>
                  <th className="py-2.5 px-3">Billed / Remaining</th>
                  <th className="py-2.5 px-3 min-w-[240px]">Linked Indent Number(s) &amp; Rate History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requisition.items.map((item) => {
                  const billed = getBilledQty(item)
                  const remaining = getRemainingQty(item)
                  const status = getItemBillingStatus(item)

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-3">
                        <MaterialScopeDisplay item={item} />
                      </td>

                      <td className="py-3 px-3">
                        {status === 'BILLED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            <Check className="w-3 h-3 stroke-[3]" />
                            Fully Billed
                          </span>
                        ) : status === 'PARTIAL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                            Partial Billed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                            Pending / Unbilled
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono font-semibold text-foreground">
                        {item.finalQuantity} {item.unit}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="text-emerald-600 font-semibold">
                          Billed: {billed} {item.unit}
                        </span>
                        {remaining > 0 && (
                          <div className="text-foreground font-medium">
                            Rem: {remaining} {item.unit}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {!item.indentItems || item.indentItems.length === 0 ? (
                          <span className="text-muted-foreground italic text-[11px]">
                            Not billed yet (available for next indent)
                          </span>
                        ) : (
                          <div className="space-y-1.5">
                            {item.indentItems.map((record) => (
                              <div
                                key={record.id}
                                className="flex flex-wrap items-center gap-2 bg-muted/40 border border-border rounded px-2 py-1 text-[11px]"
                              >
                                <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-background border border-border flex items-center gap-1">
                                  <Receipt className="w-3 h-3" />
                                  {record.indent.indentNo}
                                </span>

                                <span className="font-mono font-medium">
                                  {Number(record.quantity)} {item.unit} @ ৳{Number(record.unitPrice)}
                                </span>

                                <span className="font-mono font-bold text-foreground">
                                  = ৳{Number(record.total).toLocaleString('en-BD')}
                                </span>

                                <span className="text-muted-foreground text-[10px]">
                                  by {record.indent.createdBy.fullName} (
                                  {new Date(record.billedAt).toLocaleDateString('en-GB')})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
