"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  ChevronLeft,
  PlusCircle,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  Search,
  Filter,
  Users,
  RefreshCw,
  Building,
  CheckCircle2,
  Loader2,
  Sparkles,
  ShoppingBag,
  Layers,
  Box,
  DollarSign,
  Receipt,
  FileText,
} from "lucide-react"

type StockCategory =
  | "STATIONERY_OFFICE"
  | "PANTRY_HYGIENE"
  | "IT_EQUIPMENT"
  | "BOARD"
  | "LAMINATE_HPL"
  | "HARDWARE"
  | "FITTINGS"
  | "PAINT_FINISHES"
  | "LIGHTING_ELECTRICAL"
  | "GLASS_MIRROR"
  | "RAW_MATERIALS"
  | "TOOLS_CONSUMABLES"
  | "OTHER"

type StockMovementType =
  | "STOCK_IN"
  | "DEPARTMENT_ISSUE"
  | "STAFF_ISSUE"
  | "PROJECT_ISSUE"
  | "PROJECT_RETURN"
  | "VENDOR_RETURN"
  | "ADJUSTMENT"

interface StockItem {
  id: string
  sku: string
  name: string
  category: StockCategory
  unit: string
  currentStock: number
  minStockAlert: number
  unitCostPrice: number
  standardSellingPrice?: number | null
  vendorId?: string | null
  location?: string | null
  description?: string | null
  updatedAt: string
}

interface StockMovement {
  id: string
  stockItemId: string
  type: StockMovementType
  quantity: number
  unitCost: number
  totalValue: number
  referenceNo?: string | null
  department?: string | null
  notes?: string | null
  createdAt: string
  stockItem: {
    id: string
    sku: string
    name: string
    unit: string
    category: StockCategory
  }
  createdBy?: {
    id: string
    fullName: string
  } | null
  recipientUser?: {
    id: string
    fullName: string
  } | null
}

const CATEGORY_LABELS: Record<StockCategory, string> = {
  STATIONERY_OFFICE: "Stationery & Office",
  PANTRY_HYGIENE: "Pantry & Hygiene",
  IT_EQUIPMENT: "IT & Hardware",
  BOARD: "Boards & Sheet Goods",
  LAMINATE_HPL: "Laminates & HPL",
  HARDWARE: "Hardware & Accessories",
  FITTINGS: "Fittings & Locks",
  PAINT_FINISHES: "Paint & Finishes",
  LIGHTING_ELECTRICAL: "Lighting & Electrical",
  GLASS_MIRROR: "Glass & Mirror",
  RAW_MATERIALS: "Raw Materials",
  TOOLS_CONSUMABLES: "Tools & Consumables",
  OTHER: "Other Stock Items",
}

const CATEGORY_OPTIONS = [
  { key: "ALL", label: "All Categories" },
  { key: "STATIONERY_OFFICE", label: "Stationery & Office" },
  { key: "PANTRY_HYGIENE", label: "Pantry & Hygiene" },
  { key: "IT_EQUIPMENT", label: "IT & Hardware" },
  { key: "BOARD", label: "Boards & Laminates" },
  { key: "HARDWARE", label: "Hardware & Fittings" },
  { key: "TOOLS_CONSUMABLES", label: "Tools & Consumables" },
  { key: "OTHER", label: "Other Materials" },
]

export default function AccountsStocksPage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Filtering
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  // Dialog States
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [isMovementOpen, setIsMovementOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // New Item Form State
  const [newItem, setNewItem] = useState({
    sku: "",
    name: "",
    category: "STATIONERY_OFFICE" as StockCategory,
    unit: "pcs",
    currentStock: 0,
    minStockAlert: 5,
    unitCostPrice: 0,
    location: "Main Store",
    description: "",
  })

  // Movement Form State
  const [selectedItemForMove, setSelectedItemForMove] = useState<StockItem | null>(null)
  const [movementForm, setMovementForm] = useState({
    type: "STOCK_IN" as StockMovementType,
    quantity: 1,
    department: "Accounts",
    notes: "",
    createOutflowTransaction: false,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsRes, movementsRes, summaryRes] = await Promise.all([
        fetch("/api/finance/stock/items", { cache: "no-store" }),
        fetch("/api/finance/stock/movements?limit=50", { cache: "no-store" }),
        fetch("/api/finance/stock/summary", { cache: "no-store" }),
      ])

      if (itemsRes.ok) {
        const data = await itemsRes.json()
        if (data.success) setItems(data.items || [])
      }

      if (movementsRes.ok) {
        const data = await movementsRes.json()
        if (data.success) setMovements(data.movements || [])
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json()
        if (data.success) setSummary(data.summary)
      }
    } catch (err) {
      toast.error("Failed to load stock data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.name || !newItem.unit) {
      toast.error("Please fill in required fields")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/finance/stock/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Stock item "${data.item.name}" registered successfully`)
        setIsAddItemOpen(false)
        setNewItem({
          sku: "",
          name: "",
          category: "STATIONERY_OFFICE",
          unit: "pcs",
          currentStock: 0,
          minStockAlert: 5,
          unitCostPrice: 0,
          location: "Main Store",
          description: "",
        })
        loadData()
      } else {
        toast.error(data.error || "Failed to create item")
      }
    } catch (err) {
      toast.error("An error occurred while creating item")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItemForMove || movementForm.quantity <= 0) {
      toast.error("Please select a valid item and quantity")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/finance/stock/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockItemId: selectedItemForMove.id,
          type: movementForm.type,
          quantity: Number(movementForm.quantity),
          unitCost: selectedItemForMove.unitCostPrice,
          department: movementForm.department,
          notes: movementForm.notes,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success("Stock movement recorded")

        // If financial outflow transaction requested for stock purchase
        if (movementForm.createOutflowTransaction && movementForm.type === "STOCK_IN") {
          const totalCost = Number(movementForm.quantity) * selectedItemForMove.unitCostPrice
          try {
            await fetch("/api/finance/transactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "OUTFLOW",
                category: "BOARD_MATERIAL",
                amount: totalCost,
                particular: `Stock In: ${selectedItemForMove.name} (${movementForm.quantity} ${selectedItemForMove.unit})`,
              }),
            })
            toast.success(`Financial outflow of ৳${totalCost.toLocaleString()} logged in Accounts`)
          } catch (tErr) {
            console.error("Failed to auto-create outflow transaction:", tErr)
          }
        }

        setIsMovementOpen(false)
        setSelectedItemForMove(null)
        setMovementForm({
          type: "STOCK_IN",
          quantity: 1,
          department: "Accounts",
          notes: "",
          createOutflowTransaction: false,
        })
        loadData()
      } else {
        toast.error(data.error || "Failed to record stock movement")
      }
    } catch (err) {
      toast.error("An error occurred while processing movement")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Filter Items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory =
      selectedCategory === "ALL" || item.category === selectedCategory

    const matchesLowStock = !showLowStockOnly || item.currentStock <= item.minStockAlert

    return matchesSearch && matchesCategory && matchesLowStock
  })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/crm/accounts/dashboard" className="hover:underline flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />
              Accounts Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Stocks & Office Goods</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Stock & Office Goods Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor inventory valuation, office consumables, department issues, and stock-in financial disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <PlusCircle className="w-4 h-4" />
                Add Stock Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Register New Stock Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateItem} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">SKU / Item Code</label>
                  <Input
                    placeholder="e.g. ACC-STAT-001"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Item Name *</label>
                  <Input
                    placeholder="e.g. A4 Paper Rim / Toner Cartridge"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Category</label>
                    <Select
                      value={newItem.category}
                      onValueChange={(val: StockCategory) =>
                        setNewItem({ ...newItem, category: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                          <SelectItem key={catKey} value={catKey}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Unit (e.g. pcs, box, rim)</label>
                    <Input
                      placeholder="pcs"
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Initial Stock</label>
                    <Input
                      type="number"
                      min={0}
                      value={newItem.currentStock}
                      onChange={(e) =>
                        setNewItem({ ...newItem, currentStock: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Min Alert Level</label>
                    <Input
                      type="number"
                      min={0}
                      value={newItem.minStockAlert}
                      onChange={(e) =>
                        setNewItem({ ...newItem, minStockAlert: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Unit Cost (৳)</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={newItem.unitCostPrice}
                      onChange={(e) =>
                        setNewItem({ ...newItem, unitCostPrice: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Storage Location</label>
                  <Input
                    placeholder="e.g. Main Store Shelf 2"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Description / Remarks</label>
                  <Textarea
                    placeholder="Item details..."
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddItemOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                    Save Stock Item
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stock Valuation
            </CardTitle>
            <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ৳{(summary?.totalInventoryValue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active inventory asset valuation
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Department Issues
            </CardTitle>
            <div className="p-2 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg">
              <Building className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ৳{(summary?.totalDeptIssuedValueMonth || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Office consumables issued this month
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock Purchases (Month)
            </CardTitle>
            <div className="p-2 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ৳{(summary?.totalStockInValueMonth || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Shipments & stock-in value received
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Alerts
            </CardTitle>
            <div className="p-2 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary?.lowStockCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Items requiring replenishment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border border-border shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search stock by name, SKU, or location..."
              className="pl-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showLowStockOnly ? "destructive" : "outline"}
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {showLowStockOnly ? "Showing Low Stock" : "Low Stock Alerts"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="items" className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="items" className="text-xs gap-1.5">
            <Package className="w-3.5 h-3.5" />
            Stock Items ({filteredItems.length})
          </TabsTrigger>
          <TabsTrigger value="movements" className="text-xs gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Stock Movement Log ({movements.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Stock Items Grid */}
        <TabsContent value="items" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Box className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-lg">No stock items found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                No inventory items match your criteria.
              </p>
              <Button className="mt-4" onClick={() => setIsAddItemOpen(true)}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Stock Item
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const isLowStock = item.currentStock <= item.minStockAlert
                return (
                  <Card
                    key={item.id}
                    className={`border transition-all shadow-sm ${
                      isLowStock
                        ? "border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="text-[10px] mb-1 font-mono">
                            {item.sku || "NO-SKU"}
                          </Badge>
                          <CardTitle className="text-base font-semibold line-clamp-1">
                            {item.name}
                          </CardTitle>
                        </div>
                        {isLowStock ? (
                          <Badge className="bg-amber-500 text-white text-[10px] shrink-0 gap-1">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            In Stock
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs p-2 rounded bg-muted/40">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Quantity</span>
                          <span className="font-bold text-sm">
                            {item.currentStock} {item.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Unit Cost</span>
                          <span className="font-semibold text-sm">
                            ৳{item.unitCostPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {item.location ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>Loc: {item.location}</span>
                        </p>
                      ) : null}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Valuation: ৳{(item.currentStock * item.unitCostPrice).toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => {
                            setSelectedItemForMove(item)
                            setIsMovementOpen(true)
                          }}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Log Movement
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Stock Movement Ledger */}
        <TabsContent value="movements">
          <Card className="border border-border shadow-sm">
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-base font-semibold">Stock Movements Ledger</CardTitle>
              <CardDescription className="text-xs">
                History of stock additions, department issues, project dispatches, and adjustments
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No stock movement records found.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {movements.map((m) => {
                    const isStockIn = m.type === "STOCK_IN" || m.type === "PROJECT_RETURN"
                    return (
                      <div key={m.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/20">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-full ${
                              isStockIn
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {isStockIn ? (
                              <ArrowDownRight className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">
                              {m.stockItem?.name || "Unknown Stock Item"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {m.type.replace("_", " ")}{" "}
                              {m.department ? `• Dept: ${m.department}` : ""}
                              {m.notes ? ` • ${m.notes}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p
                            className={`font-bold text-sm ${
                              isStockIn ? "text-emerald-600" : "text-blue-600"
                            }`}
                          >
                            {isStockIn ? "+" : "-"}
                            {m.quantity} {m.stockItem?.unit || "units"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Movement / Outflow Dialog */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Stock Movement</DialogTitle>
          </DialogHeader>

          {selectedItemForMove ? (
            <form onSubmit={handleRecordMovement} className="space-y-4 pt-2">
              <div className="p-3 rounded bg-muted/40 text-xs space-y-1">
                <p className="font-semibold text-sm">{selectedItemForMove.name}</p>
                <p className="text-muted-foreground">
                  Current Stock: <span className="font-bold text-foreground">{selectedItemForMove.currentStock} {selectedItemForMove.unit}</span> • Unit Cost: ৳{selectedItemForMove.unitCostPrice}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Transaction Type</label>
                <Select
                  value={movementForm.type}
                  onValueChange={(val: StockMovementType) =>
                    setMovementForm({ ...movementForm, type: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STOCK_IN">Stock In / Purchase Receipt</SelectItem>
                    <SelectItem value="DEPARTMENT_ISSUE">Issue to Department (HR/Finance/Admin)</SelectItem>
                    <SelectItem value="STAFF_ISSUE">Issue to Individual Staff Member</SelectItem>
                    <SelectItem value="PROJECT_ISSUE">Dispatch to Interior Project Site</SelectItem>
                    <SelectItem value="ADJUSTMENT">Stock Adjustment / Audit Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Quantity ({selectedItemForMove.unit}) *</label>
                  <Input
                    type="number"
                    min={1}
                    value={movementForm.quantity}
                    onChange={(e) =>
                      setMovementForm({ ...movementForm, quantity: Number(e.target.value) })
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Destination / Department</label>
                  <Input
                    placeholder="e.g. Accounts / HR"
                    value={movementForm.department}
                    onChange={(e) =>
                      setMovementForm({ ...movementForm, department: e.target.value })
                    }
                  />
                </div>
              </div>

              {movementForm.type === "STOCK_IN" && (
                <div className="p-3 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-200">Financial Outflow Transaction</p>
                    <p className="text-muted-foreground text-[11px]">
                      Auto-generate ৳{(movementForm.quantity * selectedItemForMove.unitCostPrice).toLocaleString()} expense transaction in Accounts
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={movementForm.createOutflowTransaction}
                    onChange={(e) => setMovementForm({ ...movementForm, createOutflowTransaction: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Notes / Purpose</label>
                <Textarea
                  placeholder="Reason for issuance or purchase receipt..."
                  value={movementForm.notes}
                  onChange={(e) =>
                    setMovementForm({ ...movementForm, notes: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMovementOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Confirm Transaction
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
