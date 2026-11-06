'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { toast } from '@/components/ui/sonner'
import {
  Boxes,
  Loader2,
  PackageMinus,
  PackagePlus,
  Plus,
  RotateCcw,
  Sparkles,
  TrendingDown,
  Warehouse,
} from 'lucide-react'

type StockItem = {
  id: string
  sku: string
  name: string
  category: string
  unit: string
  currentStock: number
  unitCostPrice: number
  location?: string | null
}

type StockMovement = {
  id: string
  stockItemId: string
  type: string
  quantity: number
  unitCost: number
  totalValue: number
  referenceNo?: string | null
  notes?: string | null
  createdAt: string
  stockItem: {
    id: string
    sku: string
    name: string
    unit: string
    category: string
  }
  createdBy?: {
    id: string
    fullName: string
  } | null
  transaction?: {
    id: string
    voucherNo?: string | null
    amount: number
  } | null
}

const EXPENSE_CATEGORIES: { key: string; label: string }[] = [
  { key: 'BOARD_MATERIAL', label: 'Board Material (Site/Factory)' },
  { key: 'HPL', label: 'HPL / Laminates' },
  { key: 'HARDWARE', label: 'Hardware & Accessories' },
  { key: 'PAINT_MATERIALS', label: 'Paint Materials' },
  { key: 'ELECTRIC_ITEM', label: 'Electric Items' },
  { key: 'LIGHTING', label: 'Lighting' },
  { key: 'GLASS', label: 'Glass & Mirror' },
  { key: 'DOOR', label: 'Door Purchase' },
  { key: 'TILES_PURCHASE', label: 'Tiles Purchase' },
  { key: 'SITE_EXPENSE', label: 'Site Expense & Consumables' },
  { key: 'MATERIAL_COST', label: 'General Material Cost' },
  { key: 'OTHERS', label: 'Other Expenses' },
]

function defaultCategoryForItem(category?: string): string {
  switch (category) {
    case 'BOARD':
      return 'BOARD_MATERIAL'
    case 'LAMINATE_HPL':
      return 'HPL'
    case 'HARDWARE':
    case 'FITTINGS':
      return 'HARDWARE'
    case 'PAINT_FINISHES':
      return 'PAINT_MATERIALS'
    case 'LIGHTING_ELECTRICAL':
      return 'ELECTRIC_ITEM'
    case 'GLASS_MIRROR':
      return 'GLASS'
    case 'TOOLS_CONSUMABLES':
      return 'SITE_EXPENSE'
    default:
      return 'MATERIAL_COST'
  }
}

interface ProjectVirtualInventoryTabProps {
  leadId: string
  leadName?: string
  onCostUpdated?: () => void
}

export default function ProjectVirtualInventoryTab({
  leadId,
  leadName,
  onCostUpdated,
}: ProjectVirtualInventoryTabProps) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
  const [submittingIssue, setSubmittingIssue] = useState(false)

  // Return Unused Modal state
  const [returnTargetMovement, setReturnTargetMovement] = useState<StockMovement | null>(null)
  const [returnQty, setReturnQty] = useState('')
  const [returnNotes, setReturnNotes] = useState('')
  const [submittingReturn, setSubmittingReturn] = useState(false)

  // Issue Form state
  const [selectedStockItemId, setSelectedStockItemId] = useState('')
  const [issueQuantity, setIssueQuantity] = useState('')
  const [issueUnitCost, setIssueUnitCost] = useState('')
  const [issueCategory, setIssueCategory] = useState('BOARD_MATERIAL')
  const [issueReferenceNo, setIssueReferenceNo] = useState('')
  const [issueNotes, setIssueNotes] = useState('')

  const loadMovements = useCallback(async () => {
    if (!leadId) return
    try {
      const res = await fetch(`/api/finance/stock/movements?leadId=${leadId}&limit=100`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (data.success) {
        setMovements(data.movements || [])
      }
    } catch (err) {
      console.error('Failed to load project stock movements:', err)
    }
  }, [leadId])

  const loadStockItems = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/stock/items', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        setStockItems(data.items || [])
      }
    } catch (err) {
      console.error('Failed to load stock items:', err)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function init() {
      setLoading(true)
      await Promise.all([loadMovements(), loadStockItems()])
      if (mounted) setLoading(false)
    }
    void init()
    return () => {
      mounted = false
    }
  }, [loadMovements, loadStockItems])

  const selectedStockItem = stockItems.find((i) => i.id === selectedStockItemId)

  const handleSelectItemChange = (itemId: string) => {
    setSelectedStockItemId(itemId)
    const item = stockItems.find((i) => i.id === itemId)
    if (item) {
      setIssueUnitCost(String(item.unitCostPrice || 0))
      setIssueCategory(defaultCategoryForItem(item.category))
    }
  }

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStockItem) {
      toast.error('Please select an item from Virtual Inventory')
      return
    }

    const qty = parseFloat(issueQuantity)
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid positive quantity')
      return
    }

    if (qty > selectedStockItem.currentStock) {
      toast.error(
        `Insufficient stock! Only ${selectedStockItem.currentStock} ${selectedStockItem.unit} available in Virtual Inventory.`,
      )
      return
    }

    const cost = issueUnitCost ? parseFloat(issueUnitCost) : selectedStockItem.unitCostPrice

    setSubmittingIssue(true)
    try {
      const res = await fetch('/api/finance/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockItemId: selectedStockItem.id,
          type: 'PROJECT_ISSUE',
          quantity: qty,
          unitCost: cost,
          leadId,
          referenceNo: issueReferenceNo.trim() || undefined,
          notes: issueNotes.trim() || undefined,
          transactionCategory: issueCategory,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(
          `Issued ${qty} ${selectedStockItem.unit} of "${selectedStockItem.name}". Project cost auto-added!`,
        )
        setIsIssueModalOpen(false)
        setSelectedStockItemId('')
        setIssueQuantity('')
        setIssueUnitCost('')
        setIssueReferenceNo('')
        setIssueNotes('')
        await Promise.all([loadMovements(), loadStockItems()])
        if (onCostUpdated) onCostUpdated()
      } else {
        toast.error(data.error || 'Failed to issue material')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Error occurred while issuing material')
    } finally {
      setSubmittingIssue(false)
    }
  }

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!returnTargetMovement) return

    const qty = parseFloat(returnQty)
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid return quantity')
      return
    }

    if (qty > returnTargetMovement.quantity) {
      toast.error(`Cannot return more than issued quantity (${returnTargetMovement.quantity})`)
      return
    }

    setSubmittingReturn(true)
    try {
      const res = await fetch('/api/finance/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockItemId: returnTargetMovement.stockItemId,
          type: 'PROJECT_RETURN',
          quantity: qty,
          unitCost: returnTargetMovement.unitCost,
          leadId,
          notes: returnNotes.trim() || `Unused material returned from site (${leadName || 'Project'})`,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(
          `Returned ${qty} ${returnTargetMovement.stockItem.unit} to Virtual Inventory. Project cost credited!`,
        )
        setReturnTargetMovement(null)
        setReturnQty('')
        setReturnNotes('')
        await Promise.all([loadMovements(), loadStockItems()])
        if (onCostUpdated) onCostUpdated()
      } else {
        toast.error(data.error || 'Failed to process return')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Error occurred while returning material')
    } finally {
      setSubmittingReturn(false)
    }
  }

  // Calculate Net Material Cost from inventory
  const totalIssuedCost = movements.reduce((sum, m) => {
    if (m.type === 'PROJECT_ISSUE') return sum + (m.totalValue || 0)
    if (m.type === 'PROJECT_RETURN') return sum - (m.totalValue || 0)
    return sum
  }, 0)

  const issuedItemsCount = movements.filter((m) => m.type === 'PROJECT_ISSUE').length

  const calculatedTotal =
    parseFloat(issueQuantity || '0') *
    parseFloat(issueUnitCost || (selectedStockItem ? String(selectedStockItem.unitCostPrice) : '0'))

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Virtual Inventory & Materials Issued
            </CardTitle>
            <CardDescription>
              Allocate purchased materials from company stock / virtual inventory to this project.
              Costs are automatically added to the project outflow & ledger.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsIssueModalOpen(true)}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm"
            >
              <PackagePlus className="w-4 h-4" />
              Issue from Virtual Inventory
            </Button>
          </div>
        </div>

        {/* Quick stats banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 mt-2 border-t border-border/60">
          <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800">
            <div className="text-[11px] font-medium text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> Net Material Cost from Inventory
            </div>
            <div className="text-lg font-bold text-indigo-950 dark:text-indigo-100 tabular-nums">
              ৳{totalIssuedCost.toLocaleString()}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5" /> Total Items Allocated
            </div>
            <div className="text-lg font-bold tabular-nums">
              {issuedItemsCount} <span className="text-xs font-normal text-muted-foreground">records</span>
            </div>
          </div>
          <div className="hidden sm:block p-2.5 rounded-lg bg-muted/40 border border-border">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Auto-Accounting Status
            </div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              ✓ Synchronized to Project Outflow
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 sm:p-6 pt-0 sm:pt-0">
        {loading ? (
          <div className="flex h-36 items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading inventory logs...
          </div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center border-t rounded-b-xl bg-muted/10">
            <Warehouse className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-foreground">No materials issued from Virtual Inventory yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              When materials from company buffer stock or unused purchases are allocated to this site,
              click "Issue from Virtual Inventory" above to automatically track materials and sync costs.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsIssueModalOpen(true)}
              className="mt-4 gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Issue First Material
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto border-t">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Material Name & SKU</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3 text-right">Unit Rate</th>
                  <th className="p-3 text-right">Total Cost</th>
                  <th className="p-3">Particulars & Ref</th>
                  <th className="p-3">Issued By</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.map((m) => {
                  const isIssue = m.type === 'PROJECT_ISSUE'
                  const isReturn = m.type === 'PROJECT_RETURN'
                  return (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3">
                        {isIssue ? (
                          <Badge className="bg-blue-600 text-white font-normal text-[11px] gap-1">
                            <PackageMinus className="w-3 h-3" /> Issued to Site
                          </Badge>
                        ) : isReturn ? (
                          <Badge className="bg-emerald-600 text-white font-normal text-[11px] gap-1">
                            <RotateCcw className="w-3 h-3" /> Returned to Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px]">
                            {m.type}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{m.stockItem?.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {m.stockItem?.sku} • {m.stockItem?.category?.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="p-3 text-right font-semibold tabular-nums">
                        {isReturn ? `-${m.quantity}` : m.quantity} {m.stockItem?.unit}
                      </td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">
                        ৳{m.unitCost.toLocaleString()}
                      </td>
                      <td
                        className={`p-3 text-right font-bold tabular-nums ${
                          isReturn
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isReturn ? `-৳${m.totalValue.toLocaleString()}` : `৳${m.totalValue.toLocaleString()}`}
                      </td>
                      <td className="p-3 text-xs max-w-[200px] truncate" title={m.notes || m.referenceNo || ''}>
                        {m.referenceNo && (
                          <span className="font-semibold text-foreground mr-1">
                            [{m.referenceNo}]
                          </span>
                        )}
                        <span className="text-muted-foreground">{m.notes || '—'}</span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {m.createdBy?.fullName || 'System'}
                      </td>
                      <td className="p-3 text-center">
                        {isIssue ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => {
                              setReturnTargetMovement(m)
                              setReturnQty(String(m.quantity))
                              setReturnNotes(`Unused ${m.stockItem.name} returned from ${leadName || 'project'}`)
                            }}
                            title="Return unused leftover quantity back to Virtual Inventory"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Return Leftover
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* ── Issue Material from Virtual Inventory Modal ───────────────────────── */}
      <Dialog open={isIssueModalOpen} onOpenChange={setIsIssueModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <PackagePlus className="w-5 h-5" /> Issue Material from Virtual Inventory
            </DialogTitle>
            <DialogDescription>
              Select an item from company inventory to allocate to{' '}
              <span className="font-semibold text-foreground">{leadName || 'this project'}</span>.
              The calculated cost will be automatically recorded in the project expense ledger.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleIssueSubmit} className="space-y-4 pt-1">
            {/* Stock Item Picker */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Select Virtual Inventory Item *
              </label>
              <Select value={selectedStockItemId} onValueChange={handleSelectItemChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose material from inventory..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {stockItems.map((item) => (
                    <SelectItem key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span className="font-medium">
                          [{item.sku}] {item.name}
                        </span>
                        <span
                          className={`text-xs tabular-nums ml-2 ${
                            item.currentStock <= 0 ? 'text-rose-500 font-bold' : 'text-muted-foreground'
                          }`}
                        >
                          Stock: {item.currentStock} {item.unit} (৳{item.unitCostPrice}/{item.unit})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStockItem && (
              <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border text-xs">
                <div>
                  <span className="text-muted-foreground">Category: </span>
                  <span className="font-semibold">{selectedStockItem.category.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Available Stock: </span>
                  <Badge variant={selectedStockItem.currentStock > 0 ? 'secondary' : 'destructive'}>
                    {selectedStockItem.currentStock} {selectedStockItem.unit}
                  </Badge>
                </div>
              </div>
            )}

            {/* Quantity and Unit Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Quantity to Issue * {selectedStockItem ? `(${selectedStockItem.unit})` : ''}
                </label>
                <Input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 10"
                  value={issueQuantity}
                  onChange={(e) => setIssueQuantity(e.target.value)}
                  max={selectedStockItem?.currentStock}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Unit Cost Price (৳)</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={issueUnitCost}
                  onChange={(e) => setIssueUnitCost(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Expense Category Mapping */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Project Cost / Expense Category *
              </label>
              <Select value={issueCategory} onValueChange={setIssueCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voucher Ref & Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Reference / Memo #</label>
                <Input
                  placeholder="e.g. MR-0941"
                  value={issueReferenceNo}
                  onChange={(e) => setIssueReferenceNo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Purpose / Remarks</label>
                <Input
                  placeholder="e.g. Master Bedroom"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Auto-accounting summary callout */}
            <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-indigo-950 dark:text-indigo-100">
                <span>Total Cost to be Added:</span>
                <span className="text-base text-rose-600 dark:text-rose-400 tabular-nums">
                  ৳{isNaN(calculatedTotal) ? 0 : calculatedTotal.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-indigo-900/80 dark:text-indigo-200/80">
                ⚡ Automatically creates an Outflow Transaction under this project and deducts{' '}
                {issueQuantity || 0} {selectedStockItem?.unit || 'units'} from Virtual Inventory.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsIssueModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingIssue || !selectedStockItem || !issueQuantity}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submittingIssue && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                Issue & Add Cost to Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Return Unused Material Modal ───────────────────────── */}
      <Dialog
        open={Boolean(returnTargetMovement)}
        onOpenChange={(open) => !open && setReturnTargetMovement(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <RotateCcw className="w-5 h-5" /> Return Leftover Material to Virtual Inventory
            </DialogTitle>
            <DialogDescription>
              Return unused materials from site back into company stock. This will credit and reduce
              the project's total expense.
            </DialogDescription>
          </DialogHeader>

          {returnTargetMovement && (
            <form onSubmit={handleReturnSubmit} className="space-y-4 pt-1">
              <div className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1">
                <div className="font-semibold text-foreground text-sm">
                  {returnTargetMovement.stockItem.name}
                </div>
                <div className="text-muted-foreground">
                  Original Issue: {returnTargetMovement.quantity} {returnTargetMovement.stockItem.unit} @ ৳
                  {returnTargetMovement.unitCost.toLocaleString()}/{returnTargetMovement.stockItem.unit}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Quantity Returning to Stock * ({returnTargetMovement.stockItem.unit})
                </label>
                <Input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 2"
                  value={returnQty}
                  onChange={(e) => setReturnQty(e.target.value)}
                  max={returnTargetMovement.quantity}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Return Remarks / Reason</label>
                <Input
                  placeholder="e.g. Leftover boards from living room"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-950 dark:text-emerald-100">
                  <span>Credit / Cost Reduction:</span>
                  <span className="text-base text-emerald-600 dark:text-emerald-400 tabular-nums">
                    -৳
                    {(
                      parseFloat(returnQty || '0') * returnTargetMovement.unitCost
                    ).toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900/80 dark:text-emerald-200/80">
                  ⚡ Restores stock in Virtual Inventory and adjusts project ledger.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setReturnTargetMovement(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReturn || !returnQty}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submittingReturn && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                  Confirm Return & Credit Project
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
