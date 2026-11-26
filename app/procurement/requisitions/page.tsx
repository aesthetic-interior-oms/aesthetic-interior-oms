'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  FileText,
  RefreshCw,
  Receipt,
  UserRound,
  Check,
  Search,
  ArrowRight,
  Clock,
  CheckCircle2,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Truck,
  Hash,
  DollarSign,
  History,
  ShieldCheck,
  UserCheck,
  Lock,
  Trash2,
} from 'lucide-react'

type IndentBillingRecord = {
  id: string
  quantity: string
  unitPrice: string
  total: string
  vendorName: string | null
  billedAt: string
  billedBy: { fullName: string }
  indent: {
    id: string
    indentNo: string
    createdAt: string
    createdBy: { fullName: string }
  }
}

type RequisitionItem = {
  id: string
  workCategory: string
  materialName: string
  specifications: string | null
  netQuantity: number
  wastagePercent: number
  finalQuantity: number
  unit: string
  productionPhase: string | null
  remarks: string | null
  indentItems: IndentBillingRecord[]
}

type IssuedIndent = {
  id: string
  indentNo: string
  vendorName: string | null
  transportCost: string
  otherCosts: string
  subtotal: string
  total: string
  notes: string | null
  createdAt: string
  createdBy: { fullName: string }
  items: Array<{
    id: string
    quantity: string
    unitPrice: string
    total: string
    vendorName?: string | null
    requisitionItemId: string
  }>
}

type Requisition = {
  id: string
  requisitionNo: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  lead: {
    id: string
    name: string
    phone: string | null
    location: string | null
  }
  createdBy: { fullName: string }
  procurementAssignee: { id: string; fullName: string; email?: string } | null
  items: RequisitionItem[]
  indents: IssuedIndent[]
}

type TeamMember = {
  id: string
  fullName: string
  email?: string
}

function getBilledQty(item: RequisitionItem): number {
  return item.indentItems.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
}

function getRemainingQty(item: RequisitionItem): number {
  const billed = getBilledQty(item)
  return Math.max(0, Number((item.finalQuantity - billed).toFixed(3)))
}

function getItemBillingStatus(item: RequisitionItem): 'UNBILLED' | 'PARTIAL' | 'BILLED' {
  const billed = getBilledQty(item)
  if (billed <= 0) return 'UNBILLED'
  if (billed >= item.finalQuantity - 0.0001) return 'BILLED'
  return 'PARTIAL'
}

export default function ProcurementRequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLeader, setIsLeader] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'IN_PROCUREMENT' | 'FULFILLED'>('ALL')
  const [expandedReqs, setExpandedReqs] = useState<Record<string, boolean>>({})
  const [activeTabPerReq, setActiveTabPerReq] = useState<Record<string, 'unbilled' | 'billed' | 'indents'>>({})

  // Indent Form State (per item & per requisition)
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({})
  const [billQuantities, setBillQuantities] = useState<Record<string, string>>({})
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({})
  const [reqVendors, setReqVendors] = useState<Record<string, string>>({})
  const [reqTransportCosts, setReqTransportCosts] = useState<Record<string, string>>({})
  const [reqOtherCosts, setReqOtherCosts] = useState<Record<string, string>>({})
  const [reqNotes, setReqNotes] = useState<Record<string, string>>({})

  // Indent confirmation dialog
  const [confirmModalReq, setConfirmModalReq] = useState<Requisition | null>(null)
  const [reqTargetIndentMode, setReqTargetIndentMode] = useState<Record<string, 'NEW' | 'EXISTING'>>({})
  const [reqTargetIndentId, setReqTargetIndentId] = useState<Record<string, string>>({})
  const [removingIndentItemId, setRemovingIndentItemId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/procurement/requisitions', { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Failed to load requisitions')
      }
      setRequisitions(json.data ?? [])
      setTeamMembers(json.members ?? [])
      setIsLeader(Boolean(json.leader))

      // Auto-expand first 3 requisitions
      const initialExpanded: Record<string, boolean> = {}
      ;(json.data ?? []).slice(0, 3).forEach((r: Requisition) => {
        initialExpanded[r.id] = true
      })
      setExpandedReqs((prev) => ({ ...initialExpanded, ...prev }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error loading requisitions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Handle Leader Delegating / Assigning Requisition
  const handleAssignMember = async (requisitionId: string, assigneeId: string) => {
    setActionBusy(requisitionId)
    try {
      const response = await fetch('/api/procurement/requisitions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisitionId,
          assigneeId: assigneeId || null,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Assignment update failed')
      }
      toast.success(assigneeId ? 'Procurement task delegated successfully' : 'Assignment cleared')
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assignment failed')
    } finally {
      setActionBusy(null)
    }
  }

  // Handle Item Checkbox Selection
  const toggleItemSelection = (itemId: string, remaining: number) => {
    setSelectedItems((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] }
      // Initialize bill quantity to remaining quantity if being checked
      if (next[itemId] && !billQuantities[itemId]) {
        setBillQuantities((bPrev) => ({ ...bPrev, [itemId]: String(remaining) }))
      }
      return next
    })
  }

  // Select all unbilled items for a requisition
  const selectAllUnbilledForReq = (req: Requisition) => {
    const unbilledItems = req.items.filter((i) => getRemainingQty(i) > 0)
    const allSelected = unbilledItems.every((i) => selectedItems[i.id])

    setSelectedItems((prev) => {
      const next = { ...prev }
      unbilledItems.forEach((i) => {
        next[i.id] = !allSelected
      })
      return next
    })

    if (!allSelected) {
      setBillQuantities((prev) => {
        const next = { ...prev }
        unbilledItems.forEach((i) => {
          if (!next[i.id]) {
            next[i.id] = String(getRemainingQty(i))
          }
        })
        return next
      })
    }
  }

  // Calculate live preview for an indent to be created
  const calculateReqIndentPreview = (req: Requisition) => {
    const chosen = req.items.filter((i) => selectedItems[i.id] && getRemainingQty(i) > 0)
    let subtotal = 0
    let validCount = 0

    chosen.forEach((item) => {
      const qty = Number(billQuantities[item.id] || getRemainingQty(item))
      const price = Number(unitPrices[item.id] || 0)
      if (qty > 0 && price >= 0) {
        subtotal += qty * price
        validCount++
      }
    })

    const transport = Number(reqTransportCosts[req.id] || 0)
    const other = Number(reqOtherCosts[req.id] || 0)
    const total = subtotal + transport + other

    return {
      selectedCount: chosen.length,
      validCount,
      subtotal,
      transport,
      other,
      total,
      chosenItems: chosen,
    }
  }

  // Create Indent Action
  const handleCreateIndent = async (req: Requisition) => {
    const preview = calculateReqIndentPreview(req)
    if (preview.selectedCount === 0) {
      toast.error('Please select at least one unbilled item')
      return
    }

    // Validation
    for (const item of preview.chosenItems) {
      const qty = Number(billQuantities[item.id] || getRemainingQty(item))
      const price = unitPrices[item.id]
      const rem = getRemainingQty(item)

      if (qty <= 0 || qty > rem + 0.0001) {
        toast.error(`Invalid quantity for ${item.materialName}. Max allowed: ${rem} ${item.unit}`)
        return
      }

      if (price === undefined || price === '' || isNaN(Number(price)) || Number(price) < 0) {
        toast.error(`Please enter a valid unit price for "${item.materialName}"`)
        return
      }
    }

    setActionBusy(req.id)
    try {
      const payload = {
        requisitionId: req.id,
        vendorName: reqVendors[req.id]?.trim() || null,
        transportCost: Number(reqTransportCosts[req.id] || 0),
        otherCosts: Number(reqOtherCosts[req.id] || 0),
        notes: reqNotes[req.id]?.trim() || null,
        items: preview.chosenItems.map((item) => ({
          itemId: item.id,
          quantity: Number(billQuantities[item.id] || getRemainingQty(item)),
          unitPrice: Number(unitPrices[item.id]),
        })),
      }

      const mode = reqTargetIndentMode[req.id] || 'NEW'
      const existingIndentId = reqTargetIndentId[req.id] || req.indents?.[0]?.id
      const isAddingToExisting = mode === 'EXISTING' && Boolean(existingIndentId)

      const response = isAddingToExisting
        ? await fetch(`/api/procurement/indents/${existingIndentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'ADD_ITEMS',
              ...payload,
            }),
          })
        : await fetch('/api/procurement/indents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save Indent')
      }

      toast.success(
        isAddingToExisting
          ? `Added ${preview.selectedCount} item(s) to Indent ${data.data?.indentNo || ''}!`
          : `Indent ${data.data?.indentNo || 'Bill'} Created Successfully!`,
        {
          description: `${preview.selectedCount} item(s) billed for ৳${preview.total.toLocaleString()}`,
        },
      )

      // Clean selection for this req
      setSelectedItems((prev) => {
        const next = { ...prev }
        preview.chosenItems.forEach((i) => delete next[i.id])
        return next
      })

      // Switch tab to indents
      setActiveTabPerReq((prev) => ({ ...prev, [req.id]: 'indents' }))
      setConfirmModalReq(null)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error creating indent')
    } finally {
      setActionBusy(null)
    }
  }

  const handleRemoveIndentItem = async (indentId: string, itemId: string, matName: string) => {
    setRemovingIndentItemId(itemId)
    try {
      const response = await fetch(`/api/procurement/indents/${indentId}/items/${itemId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove product from indent')
      }
      toast.success(`Removed "${matName}" from indent and unlocked it in requisition list`)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove product')
    } finally {
      setRemovingIndentItemId(null)
    }
  }

  // Filter requisitions
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((req) => {
      const matchStatus =
        statusFilter === 'ALL' || req.status === statusFilter
      const matchSearch =
        !searchTerm ||
        req.requisitionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.lead.location && req.lead.location.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchStatus && matchSearch
    })
  }, [requisitions, statusFilter, searchTerm])

  // Overall Stats
  const stats = useMemo(() => {
    let totalItems = 0
    let totalBilledItems = 0
    let totalIndentsIssued = 0

    requisitions.forEach((r) => {
      totalItems += r.items.length
      totalBilledItems += r.items.filter((i) => getBilledQty(i) >= i.finalQuantity - 0.0001).length
      totalIndentsIssued += r.indents.length
    })

    return {
      totalReqs: requisitions.length,
      totalItems,
      unbilledItems: totalItems - totalBilledItems,
      totalIndentsIssued,
    }
  }, [requisitions])

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 font-medium">
            <Link href="/procurement/dashboard" className="hover:text-foreground transition-colors">
              Procurement
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Requisitions &amp; Indents</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Receipt className="w-7 h-7 text-primary shrink-0" />
              Requisitions &amp; Indents (Billing)
            </h1>
            {isLeader ? (
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800 gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Leader Oversight &amp; Delegation
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <UserCheck className="w-3.5 h-3.5" />
                Team Member View
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Delegate incoming material requisitions, input unit prices against line items, and generate sequential partial indents with complete item tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="h-9"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/procurement/billing-center">
              Billing Center
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              Total Requisitions
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">{stats.totalReqs}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            In system workflow
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              Total Material Items
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">{stats.totalItems}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Across all requisitions
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              Pending / Unbilled Items
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-amber-600">
              {stats.unbilledItems}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Eligible for upcoming indents
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              Indents Issued
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-600">
              {stats.totalIndentsIssued}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sequential bills generated
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border rounded-lg p-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requisition #, client, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'SUBMITTED', 'IN_PROCUREMENT', 'FULFILLED'] as const).map((filterKey) => {
            const labels = {
              ALL: 'All Statuses',
              SUBMITTED: 'Awaiting Billing',
              IN_PROCUREMENT: 'In Procurement',
              FULFILLED: 'Fulfilled / Billed',
            }
            return (
              <Button
                key={filterKey}
                variant={statusFilter === filterKey ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(filterKey)}
                className="h-8 text-xs shrink-0"
              >
                {labels[filterKey]}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Requisitions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl border p-12 text-center text-muted-foreground bg-card">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm">Loading material requisitions &amp; indents...</p>
          </div>
        ) : filteredRequisitions.length === 0 ? (
          <div className="rounded-xl border p-12 text-center text-muted-foreground bg-card">
            <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">No requisitions found</p>
            <p className="text-xs mt-1">
              {isLeader
                ? 'No incoming requisitions match your search criteria.'
                : 'No requisitions are assigned to you currently.'}
            </p>
          </div>
        ) : (
          filteredRequisitions.map((req) => {
            const isExpanded = Boolean(expandedReqs[req.id])
            const activeTab = activeTabPerReq[req.id] || 'unbilled'
            const preview = calculateReqIndentPreview(req)

            const unbilledCount = req.items.filter((i) => getRemainingQty(i) > 0).length
            const billedCount = req.items.filter((i) => getBilledQty(i) > 0).length
            const indentsCount = req.indents.length

            return (
              <div
                key={req.id}
                className="rounded-xl border bg-card shadow-xs overflow-hidden transition-all"
              >
                {/* Requisition Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border-b">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedReqs((prev) => ({ ...prev, [req.id]: !prev[req.id] }))
                      }
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Toggle requisition details"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm sm:text-base text-foreground">
                          {req.requisitionNo}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="font-semibold text-sm text-foreground">
                          {req.lead.name}
                        </span>

                        <Badge
                          variant="secondary"
                          className={
                            req.status === 'FULFILLED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                              : req.status === 'IN_PROCUREMENT'
                              ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                          }
                        >
                          {req.status === 'FULFILLED'
                            ? 'Fulfilled'
                            : req.status === 'IN_PROCUREMENT'
                            ? 'In Procurement'
                            : 'Submitted'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span>{req.lead.location || 'Location not specified'}</span>
                        <span>•</span>
                        <span>{req.items.length} materials total</span>
                        <span>•</span>
                        <span>
                          Created by{' '}
                          <span className="font-medium text-foreground">
                            {req.createdBy.fullName}
                          </span>{' '}
                          on {new Date(req.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delegation / Assignment Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    {isLeader ? (
                      <div className="flex items-center gap-2 bg-background border rounded-lg px-2.5 py-1.5 shadow-2xs">
                        <UserRound className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                          Delegated to:
                        </span>
                        <select
                          className="h-7 text-xs bg-transparent border-0 font-medium text-foreground focus:ring-0 focus:outline-none cursor-pointer"
                          value={req.procurementAssignee?.id ?? ''}
                          onChange={(e) => void handleAssignMember(req.id, e.target.value)}
                          disabled={actionBusy === req.id}
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
                      <div className="text-xs bg-muted/50 border rounded-md px-2.5 py-1 text-muted-foreground flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Assigned to:{' '}
                          <span className="font-semibold text-foreground">
                            {req.procurementAssignee?.fullName ?? 'You'}
                          </span>
                        </span>
                      </div>
                    )}

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Link href={`/procurement/billing-center/${req.id}`}>
                        Full Bill Maker
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div>
                    {/* View Tabs: Unbilled vs Billed Items vs Indents History */}
                    <div className="flex items-center gap-2 px-4 pt-3 border-b bg-muted/5">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTabPerReq((prev) => ({ ...prev, [req.id]: 'unbilled' }))
                        }
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                          activeTab === 'unbilled'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Unbilled Materials (Pricing)</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {unbilledCount}
                        </Badge>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveTabPerReq((prev) => ({ ...prev, [req.id]: 'billed' }))
                        }
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                          activeTab === 'billed'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Line-Item Audit (Billed)</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {billedCount}
                        </Badge>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveTabPerReq((prev) => ({ ...prev, [req.id]: 'indents' }))
                        }
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                          activeTab === 'indents'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Indent Bills History</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {indentsCount}
                        </Badge>
                      </button>
                    </div>

                    {/* TAB 1: REQUISITION ITEMS & INDENT GENERATOR */}
                    {activeTab === 'unbilled' && (
                      <div>
                        {unbilledCount === 0 && (
                          <div className="px-4 py-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                            <span className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              All materials in this requisition have been added to indents and are locked below.
                            </span>
                          </div>
                        )}
                        <div>
                            {/* Indent Header Parameters */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-muted/10 border-b text-xs">
                              <div>
                                <label className="font-semibold text-foreground block mb-1">
                                  Vendor / Supplier
                                </label>
                                <Input
                                  placeholder="e.g. Partex, Hafele, Local"
                                  value={reqVendors[req.id] ?? ''}
                                  onChange={(e) =>
                                    setReqVendors((prev) => ({
                                      ...prev,
                                      [req.id]: e.target.value,
                                    }))
                                  }
                                  className="h-8 text-xs bg-background"
                                />
                              </div>

                              <div>
                                <label className="font-semibold text-foreground block mb-1">
                                  Transport Cost (৳)
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={reqTransportCosts[req.id] ?? ''}
                                  onChange={(e) =>
                                    setReqTransportCosts((prev) => ({
                                      ...prev,
                                      [req.id]: e.target.value,
                                    }))
                                  }
                                  className="h-8 text-xs bg-background"
                                />
                              </div>

                              <div>
                                <label className="font-semibold text-foreground block mb-1">
                                  Other Auxiliary Costs (৳)
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={reqOtherCosts[req.id] ?? ''}
                                  onChange={(e) =>
                                    setReqOtherCosts((prev) => ({
                                      ...prev,
                                      [req.id]: e.target.value,
                                    }))
                                  }
                                  className="h-8 text-xs bg-background"
                                />
                              </div>

                              <div>
                                <label className="font-semibold text-foreground block mb-1">
                                  Batch / Indent Notes
                                </label>
                                <Input
                                  placeholder="e.g. Batch 1 - Core boards"
                                  value={reqNotes[req.id] ?? ''}
                                  onChange={(e) =>
                                    setReqNotes((prev) => ({
                                      ...prev,
                                      [req.id]: e.target.value,
                                    }))
                                  }
                                  className="h-8 text-xs bg-background"
                                />
                              </div>
                            </div>

                            {/* Batch Action Bar */}
                            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b text-xs">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => selectAllUnbilledForReq(req)}
                                  className="h-7 text-xs"
                                >
                                  Select / Deselect All ({unbilledCount})
                                </Button>
                                <span className="text-muted-foreground">
                                  {preview.selectedCount} item(s) selected
                                </span>
                              </div>

                              {preview.selectedCount > 0 && (
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-foreground">
                                    Subtotal: ৳{preview.subtotal.toLocaleString()}
                                  </span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="font-bold text-primary">
                                    Total Indent: ৳{preview.total.toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Unbilled Items Table */}
                            <div className="divide-y overflow-x-auto">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-muted/40 text-foreground font-semibold border-b text-[11px]">
                                  <tr>
                                    <th className="py-2.5 px-4 w-10 text-center">Select</th>
                                    <th className="py-2.5 px-4">Material Details</th>
                                    <th className="py-2.5 px-4">Category</th>
                                    <th className="py-2.5 px-4">Requested / Remaining</th>
                                    <th className="py-2.5 px-4 w-32">Bill Quantity</th>
                                    <th className="py-2.5 px-4 w-36">Unit Price (৳)</th>
                                    <th className="py-2.5 px-4 text-right w-32">Total (৳)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {[...req.items]
                                    .sort((a, b) => {
                                      const aLocked = getRemainingQty(a) <= 0 ? 1 : 0
                                      const bLocked = getRemainingQty(b) <= 0 ? 1 : 0
                                      return aLocked - bLocked
                                    })
                                    .map((item) => {
                                      const remaining = getRemainingQty(item)
                                      const isLocked = remaining <= 0
                                      const isSelected = !isLocked && Boolean(selectedItems[item.id])
                                      const currentQty = Number(
                                        billQuantities[item.id] || remaining,
                                      )
                                      const currentPrice = Number(unitPrices[item.id] || 0)
                                      const lineTotal = currentQty * currentPrice
                                      const linkedIndentNos = Array.from(
                                        new Set(item.indentItems.map((r) => r.indent.indentNo)),
                                      )

                                      return (
                                        <tr
                                          key={item.id}
                                          className={`transition-colors ${
                                            isLocked
                                              ? 'opacity-55 bg-muted/30 cursor-not-allowed'
                                              : isSelected
                                                ? 'bg-primary/5 hover:bg-muted/30'
                                                : 'hover:bg-muted/30'
                                          }`}
                                        >
                                          <td className="py-3 px-4 text-center">
                                            {isLocked ? (
                                              <span
                                                title="Added to Indent (Locked)"
                                                className="inline-flex items-center justify-center w-5 h-5 rounded bg-muted text-muted-foreground border"
                                              >
                                                <Lock className="w-3 h-3" />
                                              </span>
                                            ) : (
                                              <input
                                                type="checkbox"
                                                aria-label={`Select ${item.materialName}`}
                                                checked={isSelected}
                                                onChange={() =>
                                                  toggleItemSelection(item.id, remaining)
                                                }
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                              />
                                            )}
                                          </td>

                                          <td className="py-3 px-4">
                                            <div className="font-semibold text-foreground">
                                              {item.materialName}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                              {item.specifications || 'Standard specification'}
                                            </div>
                                            {isLocked && (
                                              <div className="mt-1">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                                  <Lock className="w-2.5 h-2.5" />
                                                  Added to Indent{linkedIndentNos.length > 0 ? `: ${linkedIndentNos.join(', ')}` : ''}
                                                </span>
                                              </div>
                                            )}
                                          </td>

                                          <td className="py-3 px-4">
                                            <Badge variant="outline" className="text-[10px]">
                                              {item.workCategory.replace(/_/g, ' ')}
                                            </Badge>
                                          </td>

                                          <td className="py-3 px-4 font-mono">
                                            <div>
                                              <span className="text-muted-foreground">Req:</span>{' '}
                                              {item.finalQuantity} {item.unit}
                                            </div>
                                            {isLocked ? (
                                              <div className="font-semibold text-emerald-600">
                                                Billed: {item.finalQuantity} {item.unit}
                                              </div>
                                            ) : (
                                              <div className="font-semibold text-amber-600">
                                                <span>Rem:</span> {remaining} {item.unit}
                                              </div>
                                            )}
                                          </td>

                                          <td className="py-3 px-4">
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="number"
                                                min="0.001"
                                                max={remaining}
                                                step="any"
                                                value={isLocked ? '0' : (billQuantities[item.id] ?? String(remaining))}
                                                onChange={(e) =>
                                                  setBillQuantities((prev) => ({
                                                    ...prev,
                                                    [item.id]: e.target.value,
                                                  }))
                                                }
                                                disabled={isLocked || !isSelected}
                                                className="h-8 text-xs font-mono bg-background"
                                              />
                                              <span className="text-[11px] text-muted-foreground">
                                                {item.unit}
                                              </span>
                                            </div>
                                          </td>

                                          <td className="py-3 px-4">
                                            <div className="relative">
                                              <Input
                                                type="number"
                                                min="0"
                                                step="any"
                                                placeholder={isLocked ? 'Locked' : 'Unit price'}
                                                value={isLocked ? '' : (unitPrices[item.id] ?? '')}
                                                onChange={(e) =>
                                                  setUnitPrices((prev) => ({
                                                    ...prev,
                                                    [item.id]: e.target.value,
                                                  }))
                                                }
                                                disabled={isLocked || !isSelected}
                                                className="h-8 text-xs font-mono bg-background"
                                              />
                                            </div>
                                          </td>

                                          <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                                            {isLocked
                                              ? `৳${item.indentItems.reduce((s, r) => s + Number(r.total), 0).toLocaleString()}`
                                              : isSelected && currentPrice > 0
                                                ? `৳${lineTotal.toLocaleString()}`
                                                : '—'}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                </tbody>
                              </table>
                            </div>

                            {/* Generate Indent Footer Action */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border-t">
                              <div className="text-xs text-muted-foreground">
                                {preview.selectedCount > 0 ? (
                                  <span>
                                    Ready to issue Indent for{' '}
                                    <strong className="text-foreground">
                                      {preview.selectedCount} material(s)
                                    </strong>
                                    . Remaining items will remain unbilled for future indents.
                                  </span>
                                ) : (
                                  <span>
                                    Check the box next to materials to include them in this Indent.
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {req.indents.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <select
                                      value={reqTargetIndentMode[req.id] || 'NEW'}
                                      onChange={(e) =>
                                        setReqTargetIndentMode((prev) => ({
                                          ...prev,
                                          [req.id]: e.target.value as 'NEW' | 'EXISTING',
                                        }))
                                      }
                                      className="h-9 text-xs bg-background border rounded px-2 font-medium"
                                    >
                                      <option value="NEW">+ New Indent</option>
                                      <option value="EXISTING">Add to Existing Indent</option>
                                    </select>

                                    {(reqTargetIndentMode[req.id] || 'NEW') === 'EXISTING' && (
                                      <select
                                        value={reqTargetIndentId[req.id] || req.indents[0]?.id || ''}
                                        onChange={(e) =>
                                          setReqTargetIndentId((prev) => ({
                                            ...prev,
                                            [req.id]: e.target.value,
                                          }))
                                        }
                                        className="h-9 text-xs bg-background border rounded px-2 font-medium max-w-[220px]"
                                      >
                                        {req.indents.map((ind) => (
                                          <option key={ind.id} value={ind.id}>
                                            {ind.indentNo} — {ind.vendorName || 'No Supplier'} (৳{Number(ind.total).toLocaleString()})
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                )}

                                <Button
                                  type="button"
                                  onClick={() => handleCreateIndent(req)}
                                  disabled={preview.selectedCount === 0 || actionBusy === req.id}
                                  className="h-9 gap-1.5 font-medium shadow-sm"
                                >
                                  <Receipt className="w-4 h-4" />
                                  {actionBusy === req.id
                                    ? 'Saving...'
                                    : (reqTargetIndentMode[req.id] || 'NEW') === 'EXISTING'
                                      ? `Add to Indent (+৳${preview.total.toLocaleString()})`
                                      : `Generate Indent (৳${preview.total.toLocaleString()})`}
                                </Button>
                              </div>
                            </div>
                          </div>
                      </div>
                    )}

                    {/* TAB 2: LINE-ITEM AUDIT (BILLED ITEMS STATE TRACKING) */}
                    {activeTab === 'billed' && (
                      <div className="divide-y overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-muted/40 text-foreground font-semibold border-b text-[11px]">
                            <tr>
                              <th className="py-2.5 px-4">Material Details</th>
                              <th className="py-2.5 px-4">Status</th>
                              <th className="py-2.5 px-4">Total Requested</th>
                              <th className="py-2.5 px-4">Billed / Remaining</th>
                              <th className="py-2.5 px-4">Linked Indent ID(s) &amp; Pricing History</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {req.items.map((item) => {
                              const billed = getBilledQty(item)
                              const remaining = getRemainingQty(item)
                              const status = getItemBillingStatus(item)

                              return (
                                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-foreground">
                                      {item.materialName}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {item.specifications || 'Standard specification'}
                                    </div>
                                  </td>

                                  <td className="py-3 px-4">
                                    {status === 'BILLED' ? (
                                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 gap-1 text-[10px]">
                                        <Check className="w-3 h-3" />
                                        Fully Billed
                                      </Badge>
                                    ) : status === 'PARTIAL' ? (
                                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 gap-1 text-[10px]">
                                        Partial Billed
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                        Pending / Unbilled
                                      </Badge>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 font-mono">
                                    {item.finalQuantity} {item.unit}
                                  </td>

                                  <td className="py-3 px-4 font-mono text-[11px]">
                                    <span className="text-emerald-600 font-semibold">
                                      Billed: {billed} {item.unit}
                                    </span>
                                    {remaining > 0 && (
                                      <div className="text-amber-600 font-medium">
                                        Rem: {remaining} {item.unit}
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-3 px-4">
                                    {item.indentItems.length === 0 ? (
                                      <span className="text-muted-foreground italic text-[11px]">
                                        Not billed yet (available for next indent)
                                      </span>
                                    ) : (
                                      <div className="space-y-1.5">
                                        {item.indentItems.map((record) => (
                                          <div
                                            key={record.id}
                                            className="flex flex-wrap items-center gap-2 bg-muted/40 border rounded px-2 py-1 text-[11px]"
                                          >
                                            <Badge
                                              variant="secondary"
                                              className="font-mono text-[10px] gap-1 bg-background"
                                            >
                                              <Receipt className="w-3 h-3 text-primary" />
                                              {record.indent.indentNo}
                                            </Badge>

                                            <span className="font-mono font-medium">
                                              Qty: {record.quantity} {item.unit} @ ৳{record.unitPrice}
                                            </span>

                                            <span className="font-mono font-bold text-foreground">
                                              = ৳{Number(record.total).toLocaleString()}
                                            </span>

                                            <span className="text-muted-foreground">
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
                    )}

                    {/* TAB 3: INDENTS BILLS HISTORY */}
                    {activeTab === 'indents' && (
                      <div className="p-4 space-y-4">
                        {req.indents.length === 0 ? (
                          <div className="p-6 text-center text-muted-foreground text-xs">
                            No indents have been issued for this requisition yet. Use the &ldquo;Unbilled Materials&rdquo; tab to price items and generate Indent #1.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {req.indents.map((indent, idx) => (
                              <Card key={indent.id} className="shadow-2xs border overflow-hidden">
                                <CardHeader className="p-3 pb-2 bg-muted/20 border-b">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-primary">
                                          <Receipt className="w-3.5 h-3.5" />
                                          {indent.indentNo}
                                        </div>
                                        <Badge variant="outline" className="text-[10px]">
                                          Batch #{req.indents.length - idx}
                                        </Badge>
                                      </div>
                                      <CardDescription className="text-[11px] mt-0.5">
                                        Issued by {indent.createdBy.fullName} on{' '}
                                        {new Date(indent.createdAt).toLocaleDateString('en-GB')} • Supplier:{' '}
                                        <strong className="text-foreground">{indent.vendorName || 'Multiple / Direct'}</strong>
                                      </CardDescription>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <div className="text-[10px] text-muted-foreground">Total Indent Amount</div>
                                        <div className="font-mono text-sm text-primary font-bold">
                                          ৳{Number(indent.total).toLocaleString()}
                                        </div>
                                      </div>
                                      <Link href={`/procurement/billing-center/${req.id}`}>
                                        <Button type="button" size="sm" variant="outline" className="h-7 text-xs">
                                          Open Billing Center
                                        </Button>
                                      </Link>
                                    </div>
                                  </div>
                                </CardHeader>

                                <CardContent className="p-0">
                                  <div className="w-full overflow-x-auto">
                                    <table className="w-full text-xs text-left border-collapse">
                                      <thead className="bg-muted/40 text-muted-foreground font-semibold border-b text-[11px]">
                                        <tr>
                                          <th className="py-2 px-3">Materials</th>
                                          <th className="py-2 px-3">Supplier Name</th>
                                          <th className="py-2 px-3 text-right">Qty</th>
                                          <th className="py-2 px-3 text-right">Unit Price</th>
                                          <th className="py-2 px-3 text-right">Total Price</th>
                                          <th className="py-2 px-3 text-center w-14">Remove</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y">
                                        {indent.items.length === 0 ? (
                                          <tr>
                                            <td colSpan={6} className="py-4 text-center text-muted-foreground italic">
                                              No products in this indent.
                                            </td>
                                          </tr>
                                        ) : (
                                          indent.items.map((row) => {
                                            const original = req.items.find((i) => i.id === row.requisitionItemId)
                                            const matName = original?.materialName || 'Material Item'
                                            const isRemoving = removingIndentItemId === row.id
                                            return (
                                              <tr key={row.id} className="hover:bg-muted/20">
                                                <td className="py-2 px-3 font-medium text-foreground">
                                                  {matName}
                                                </td>
                                                <td className="py-2 px-3 text-muted-foreground">
                                                  {row.vendorName || indent.vendorName || '—'}
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono">
                                                  {Number(row.quantity)} {original?.unit || ''}
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono">
                                                  ৳{Number(row.unitPrice).toLocaleString()}
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono font-semibold text-foreground">
                                                  ৳{Number(row.total).toLocaleString()}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={isRemoving}
                                                    title="Remove product from indent"
                                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => void handleRemoveIndentItem(indent.id, row.id, matName)}
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </Button>
                                                </td>
                                              </tr>
                                            )
                                          })
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
