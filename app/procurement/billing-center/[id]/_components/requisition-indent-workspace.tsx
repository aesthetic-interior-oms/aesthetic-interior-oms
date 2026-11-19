'use client'

import React, { useState, useMemo } from 'react'
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
  RefreshCw,
  UserCheck,
  ShieldCheck,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  netQuantity: number
  wastagePercent: number
  finalQuantity: number
  unit: string
  productionPhase: string | null
  remarks: string | null
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
  defaultVendors?: Array<{ id: string; vendorName: string }>
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

  // Indent Generation Form State
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({})
  const [billQuantities, setBillQuantities] = useState<Record<string, string>>({})
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({})
  const [vendorName, setVendorName] = useState<string>('')
  const [transportCost, setTransportCost] = useState<string>('')
  const [otherCosts, setOtherCosts] = useState<string>('')
  const [indentNotes, setIndentNotes] = useState<string>('')

  // Assignment state
  const [assigneeId, setAssigneeId] = useState<string>(
    requisition.procurementAssignee?.id || '',
  )

  // Items count
  const unbilledItems = useMemo(
    () => requisition.items.filter((i) => getRemainingQty(i) > 0),
    [requisition.items],
  )
  const billedItems = useMemo(
    () => requisition.items.filter((i) => getBilledQty(i) > 0),
    [requisition.items],
  )

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

  // Select / Deselect all unbilled
  const toggleSelectAll = () => {
    const allSelected = unbilledItems.every((i) => selectedItems[i.id])
    const next: Record<string, boolean> = {}
    const nextQtys = { ...billQuantities }

    unbilledItems.forEach((i) => {
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
      toast.error('Select at least one unbilled item')
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
        toast.error(`Please enter a valid unit price for "${item.materialName}"`)
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
        items: indentPreview.chosenItems.map((item) => ({
          itemId: item.id,
          quantity: Number(billQuantities[item.id] || getRemainingQty(item)),
          unitPrice: Number(unitPrices[item.id]),
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

      toast.success(`Indent ${data.data?.indentNo || 'Bill'} Created!`, {
        description: `${indentPreview.selectedCount} material(s) billed for ৳${indentPreview.total.toLocaleString()}`,
      })

      // Reset selection
      setSelectedItems({})
      setUnitPrices({})
      setVendorName('')
      setTransportCost('')
      setOtherCosts('')
      setIndentNotes('')

      setActiveTab('indents')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create indent')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
      {/* Delegation & Requisition Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border-b">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <span className="font-bold text-base text-foreground">
              Partial Indent (Billing) Workspace
            </span>
            <Badge variant="outline" className="text-xs font-mono">
              {requisition.requisitionNo}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select materials, enter negotiated unit rates, and issue sequential Indents (`IND-YYYY-NNN`).
          </p>
        </div>

        {/* Leader Delegation Dropdown */}
        <div className="flex items-center gap-2">
          {isLeader ? (
            <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-1.5 shadow-2xs">
              <UserRound className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground shrink-0">
                Assigned Officer:
              </span>
              <select
                className="h-7 text-xs bg-transparent border-0 font-medium text-foreground focus:ring-0 focus:outline-none cursor-pointer"
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
            <div className="text-xs bg-muted/50 border rounded-md px-3 py-1.5 text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Assigned to:{' '}
                <strong className="text-foreground">
                  {requisition.procurementAssignee?.fullName ?? 'Procurement Team'}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 px-4 pt-3 border-b bg-muted/5">
        <button
          type="button"
          onClick={() => setActiveTab('unbilled')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'unbilled'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Unbilled Materials (Pricing &amp; Indent)</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {unbilledItems.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('billed')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'billed'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Line-Item Audit (Billed vs Pending)</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {billedItems.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('indents')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'indents'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-indigo-600" />
          <span>Indent Bills Issued</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {requisition.indents?.length || 0}
          </Badge>
        </button>
      </div>

      {/* TAB 1: UNBILLED MATERIALS (PRICING & INDENT CREATION) */}
      {activeTab === 'unbilled' && (
        <div>
          {unbilledItems.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
              <p className="text-base font-semibold text-foreground">
                All materials in this requisition are fully billed!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                View the issued bills under the &ldquo;Indent Bills Issued&rdquo; or &ldquo;Line-Item Audit&rdquo; tabs.
              </p>
            </div>
          ) : (
            <div>
              {/* Batch Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-muted/10 border-b text-xs">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Vendor / Supplier
                  </label>
                  <Input
                    placeholder="e.g. Partex, Akij, Local Vendor"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
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
                    value={transportCost}
                    onChange={(e) => setTransportCost(e.target.value)}
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>

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
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Batch / Indent Notes
                  </label>
                  <Input
                    placeholder="e.g. Batch 1 - Core boards"
                    value={indentNotes}
                    onChange={(e) => setIndentNotes(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-muted/20 border-b text-xs">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="h-7 text-xs"
                  >
                    Select / Deselect All ({unbilledItems.length})
                  </Button>
                  <span className="text-muted-foreground">
                    {indentPreview.selectedCount} material(s) selected
                  </span>
                </div>

                {indentPreview.selectedCount > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      Subtotal: <strong className="text-foreground font-mono">৳{indentPreview.subtotal.toLocaleString()}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-primary font-bold text-sm font-mono">
                      Total Indent: ৳{indentPreview.total.toLocaleString()}
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
                      <th className="py-2.5 px-4">Material Name &amp; Spec</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Requested / Remaining</th>
                      <th className="py-2.5 px-4 w-32">Bill Quantity</th>
                      <th className="py-2.5 px-4 w-36">Unit Price (৳)</th>
                      <th className="py-2.5 px-4 text-right w-32">Total (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {unbilledItems.map((item) => {
                      const isSelected = Boolean(selectedItems[item.id])
                      const remaining = getRemainingQty(item)
                      const currentQty = Number(billQuantities[item.id] || remaining)
                      const currentPrice = Number(unitPrices[item.id] || 0)
                      const lineTotal = currentQty * currentPrice

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-muted/30 transition-colors ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              aria-label={`Select ${item.materialName}`}
                              checked={isSelected}
                              onChange={() => toggleItem(item.id, remaining)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">
                              {item.materialName}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {item.specifications || 'Standard specification'}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px]">
                              {item.workCategory.replace(/_/g, ' ')}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 font-mono">
                            <div className="text-muted-foreground">
                              Req: {item.finalQuantity} {item.unit}
                            </div>
                            <div className="font-semibold text-amber-600">
                              Rem: {remaining} {item.unit}
                            </div>
                          </td>

                          <td className="py-3 px-4">
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
                                className="h-8 text-xs font-mono bg-background"
                              />
                              <span className="text-[11px] text-muted-foreground">
                                {item.unit}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="Price (৳)"
                              value={unitPrices[item.id] ?? ''}
                              onChange={(e) =>
                                setUnitPrices((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              disabled={!isSelected}
                              className="h-8 text-xs font-mono bg-background"
                            />
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                            {isSelected && currentPrice > 0
                              ? `৳${lineTotal.toLocaleString()}`
                              : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer Generate Indent Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border-t">
                <div className="text-xs text-muted-foreground">
                  {indentPreview.selectedCount > 0 ? (
                    <span>
                      Generating an Indent for{' '}
                      <strong className="text-foreground">
                        {indentPreview.selectedCount} material(s)
                      </strong>
                      . Unselected materials remain unbilled for future indents.
                    </span>
                  ) : (
                    <span>Check the boxes for materials you wish to include in this bill.</span>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleCreateIndent}
                  disabled={indentPreview.selectedCount === 0 || actionBusy}
                  className="h-9 gap-1.5 font-medium shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Receipt className="w-4 h-4" />
                  {actionBusy
                    ? 'Generating Indent...'
                    : `Generate Indent (৳${indentPreview.total.toLocaleString()})`}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LINE-ITEM AUDIT */}
      {activeTab === 'billed' && (
        <div className="divide-y overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/40 text-foreground font-semibold border-b text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Material Name &amp; Spec</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Total Requested</th>
                <th className="py-2.5 px-4">Billed / Remaining</th>
                <th className="py-2.5 px-4">Linked Indent ID(s) &amp; Pricing History</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requisition.items.map((item) => {
                const billed = getBilledQty(item)
                const remaining = getRemainingQty(item)
                const status = getItemBillingStatus(item)

                return (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{item.materialName}</div>
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
                      {!item.indentItems || item.indentItems.length === 0 ? (
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
                                Qty: {Number(record.quantity)} {item.unit} @ ৳{Number(record.unitPrice)}
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

      {/* TAB 3: INDENT BILLS ISSUED */}
      {activeTab === 'indents' && (
        <div className="p-4 space-y-3">
          {!requisition.indents || requisition.indents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No indents have been issued for this requisition yet. Use the &ldquo;Unbilled Materials&rdquo; tab to price items and generate Indent #1.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {requisition.indents.map((indent, idx) => (
                <Card key={indent.id} className="shadow-2xs border">
                  <CardHeader className="p-3 pb-2 bg-muted/20 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-primary">
                        <Receipt className="w-3.5 h-3.5" />
                        {indent.indentNo}
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Batch #{idx + 1}
                      </Badge>
                    </div>
                    <CardDescription className="text-[11px]">
                      Issued by {indent.createdBy.fullName} on{' '}
                      {new Date(indent.createdAt).toLocaleDateString('en-GB')}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Vendor:</span>
                      <span className="font-medium text-foreground">
                        {indent.vendorName || 'Not specified'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Items in Indent:</span>
                      <span className="font-medium text-foreground font-mono">
                        {indent.items?.length || 0} items
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-mono">
                        ৳{Number(indent.subtotal).toLocaleString()}
                      </span>
                    </div>

                    {(Number(indent.transportCost) > 0 || Number(indent.otherCosts) > 0) && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Auxiliary Costs:</span>
                        <span className="font-mono">
                          +৳{(Number(indent.transportCost) + Number(indent.otherCosts)).toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t font-semibold text-foreground">
                      <span>Total Amount:</span>
                      <span className="font-mono text-sm text-primary font-bold">
                        ৳{Number(indent.total).toLocaleString()}
                      </span>
                    </div>

                    {indent.notes && (
                      <p className="text-[11px] text-muted-foreground italic pt-1">
                        &ldquo;{indent.notes}&rdquo;
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
