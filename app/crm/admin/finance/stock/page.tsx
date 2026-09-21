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
  Sliders,
  DollarSign,
  FileText,
  Warehouse,
  Pencil,
  Trash2,
  Box,
  Layers,
  Wrench,
  CheckCircle2,
  Loader2,
  Building,
  Briefcase,
  User,
  Sparkles,
  Coffee,
  PenTool,
  Laptop,
} from "lucide-react"

// Types
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
  vendor?: {
    id: string
    vendorId: string
    vendorName: string
    vendorCompanyName?: string | null
  } | null
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
  leadId?: string | null
  vendorId?: string | null
  department?: string | null
  recipientUserId?: string | null
  notes?: string | null
  createdAt: string
  stockItem: {
    id: string
    sku: string
    name: string
    unit: string
    category: StockCategory
  }
  lead?: {
    id: string
    name: string
    phone?: string
    location?: string
  } | null
  vendor?: {
    id: string
    vendorName: string
    vendorCompanyName?: string | null
  } | null
  createdBy?: {
    id: string
    fullName: string
  } | null
  recipientUser?: {
    id: string
    fullName: string
    email?: string
  } | null
}

interface SummaryData {
  totalInventoryValue: number
  totalItemsCount: number
  lowStockCount: number
  totalStockInValueMonth: number
  totalProjectIssuedValueMonth: number
  totalDeptIssuedValueMonth: number
  categoryStats: Record<string, { count: number; totalValue: number }>
  departmentStats: Record<string, number>
}

interface LeadOption {
  id: string
  name: string
  phone?: string
  location?: string
}

interface VendorOption {
  id: string
  vendorId: string
  vendorName: string
  vendorCompanyName?: string | null
}

interface UserOption {
  id: string
  fullName: string
  email?: string
}

const CATEGORIES: { key: StockCategory | "ALL"; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { key: "ALL", label: "All Categories" },
  { key: "STATIONERY_OFFICE", label: "Office Stationery (Pen/Pad/Paper)", icon: PenTool },
  { key: "PANTRY_HYGIENE", label: "Pantry & Hygiene (Tissue/Soap/Tea)", icon: Coffee },
  { key: "IT_EQUIPMENT", label: "IT & Office Tech Consumables", icon: Laptop },
  { key: "BOARD", label: "Board Material (Ply/MDF)" },
  { key: "LAMINATE_HPL", label: "Laminate & HPL" },
  { key: "HARDWARE", label: "Hardware & Accessories" },
  { key: "FITTINGS", label: "Fittings & Fasteners" },
  { key: "PAINT_FINISHES", label: "Paint & Finishes" },
  { key: "LIGHTING_ELECTRICAL", label: "Lighting & Electrical" },
  { key: "GLASS_MIRROR", label: "Glass & Mirror" },
  { key: "RAW_MATERIALS", label: "Raw Materials" },
  { key: "TOOLS_CONSUMABLES", label: "Tools & Consumables" },
  { key: "OTHER", label: "Other Supplies" },
]

const DEPARTMENTS = [
  { key: "HR", label: "HR & People Operations" },
  { key: "FINANCE", label: "Finance & Accounts Department" },
  { key: "ADMIN", label: "Admin & Executive Office" },
  { key: "MARKETING", label: "Marketing & Media" },
  { key: "ARCHITECTURE_DESIGN", label: "Architecture & Interior Design" },
  { key: "SALES_CRM", label: "Sales & CRM Department" },
  { key: "SITE_OPERATIONS", label: "Site Operations & Workshop" },
]

const UNITS = ["pcs", "box", "pack", "sheet", "sqft", "meter", "set", "kg", "liter", "bottle", "roll"]

export default function StockManagementPage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [lowStockFilter, setLowStockFilter] = useState(false)
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("ALL")
  const [activeTab, setActiveTab] = useState("items")

  // Options for dropdowns
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])

  // Modal Dialog States
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [isStockInOpen, setIsStockInOpen] = useState(false)
  const [isIssueOpen, setIsIssueOpen] = useState(false)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form States
  const [itemForm, setItemForm] = useState({
    sku: "",
    name: "",
    category: "STATIONERY_OFFICE" as StockCategory,
    unit: "pcs",
    minStockAlert: "5",
    unitCostPrice: "0",
    standardSellingPrice: "",
    vendorId: "",
    location: "",
    description: "",
    initialStock: "0",
  })

  const [stockInForm, setStockInForm] = useState({
    stockItemId: "",
    quantity: "",
    unitCost: "",
    vendorId: "",
    referenceNo: "",
    notes: "",
    createFinanceTransaction: false,
    transactionCategory: "STATIONERY",
  })

  const [issueForm, setIssueForm] = useState({
    stockItemId: "",
    issueDestination: "DEPARTMENT" as "DEPARTMENT" | "STAFF" | "PROJECT",
    department: "HR",
    recipientUserId: "",
    leadId: "",
    quantity: "",
    referenceNo: "",
    notes: "",
  })

  const [adjustForm, setAdjustForm] = useState({
    stockItemId: "",
    quantity: "",
    notes: "",
  })

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsRes, summaryRes, movementsRes] = await Promise.all([
        fetch(`/api/finance/stock/items?search=${encodeURIComponent(search)}&category=${categoryFilter}&lowStockOnly=${lowStockFilter}`),
        fetch("/api/finance/stock/summary"),
        fetch(`/api/finance/stock/movements?type=${movementTypeFilter}&limit=100`),
      ])

      const itemsJson = await itemsRes.json()
      const summaryJson = await summaryRes.json()
      const movementsJson = await movementsRes.json()

      if (itemsJson.success) setItems(itemsJson.items)
      if (summaryJson.success) setSummary(summaryJson.summary)
      if (movementsJson.success) setMovements(movementsJson.movements)
    } catch (err) {
      toast.error("Failed to load stock data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, lowStockFilter, movementTypeFilter])

  // Fetch vendors, leads, and staff users for select pickers
  const loadOptions = useCallback(async () => {
    try {
      const [vendorsRes, leadsRes, usersRes] = await Promise.all([
        fetch("/api/vendors"),
        fetch("/api/finance/leads"),
        fetch("/api/finance/stock/users"),
      ])
      const vendorsJson = await vendorsRes.json()
      const leadsJson = await leadsRes.json()
      const usersJson = await usersRes.json()

      if (vendorsJson.success) setVendors(vendorsJson.vendors || [])
      if (leadsJson.success) setLeads(leadsJson.leads || [])
      if (usersJson.success) setUsers(usersJson.users || [])
    } catch (err) {
      console.error("Error loading dropdown options:", err)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  // Handlers
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemForm.name || !itemForm.category) {
      toast.error("Please fill in item name and category")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/finance/stock/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemForm),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Stock item '${data.item.name}' created!`)
        setIsAddItemOpen(false)
        setItemForm({
          sku: "",
          name: "",
          category: "STATIONERY_OFFICE",
          unit: "pcs",
          minStockAlert: "5",
          unitCostPrice: "0",
          standardSellingPrice: "",
          vendorId: "",
          location: "",
          description: "",
          initialStock: "0",
        })
        loadData()
      } else {
        toast.error(data.error || "Failed to create item")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create item")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/finance/stock/items/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedItem),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Item updated successfully!")
        setIsEditOpen(false)
        setSelectedItem(null)
        loadData()
      } else {
        toast.error(data.error || "Failed to update item")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update item")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive stock item '${name}'?`)) return
    try {
      const res = await fetch(`/api/finance/stock/items/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success(`Archived '${name}'`)
        loadData()
      } else {
        toast.error(data.error || "Failed to archive item")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to archive item")
    }
  }

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockInForm.stockItemId || !stockInForm.quantity) {
      toast.error("Please select an item and enter quantity")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/finance/stock/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...stockInForm,
          type: "STOCK_IN",
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Stock shipment received!")
        setIsStockInOpen(false)
        setStockInForm({
          stockItemId: "",
          quantity: "",
          unitCost: "",
          vendorId: "",
          referenceNo: "",
          notes: "",
          createFinanceTransaction: false,
          transactionCategory: "STATIONERY",
        })
        loadData()
      } else {
        toast.error(data.error || "Failed to record stock in")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record stock in")
    } finally {
      setSubmitting(false)
    }
  }

  const handleIssueStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueForm.stockItemId || !issueForm.quantity) {
      toast.error("Please select an item and enter quantity")
      return
    }

    let movementType: StockMovementType = "DEPARTMENT_ISSUE"
    if (issueForm.issueDestination === "STAFF") movementType = "STAFF_ISSUE"
    if (issueForm.issueDestination === "PROJECT") movementType = "PROJECT_ISSUE"

    setSubmitting(true)
    try {
      const res = await fetch("/api/finance/stock/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockItemId: issueForm.stockItemId,
          type: movementType,
          quantity: issueForm.quantity,
          referenceNo: issueForm.referenceNo,
          notes: issueForm.notes,
          department: issueForm.issueDestination === "DEPARTMENT" ? issueForm.department : undefined,
          recipientUserId: issueForm.issueDestination === "STAFF" ? issueForm.recipientUserId : undefined,
          leadId: issueForm.issueDestination === "PROJECT" ? issueForm.leadId : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Stock item issued successfully!")
        setIsIssueOpen(false)
        setIssueForm({
          stockItemId: "",
          issueDestination: "DEPARTMENT",
          department: "HR",
          recipientUserId: "",
          leadId: "",
          quantity: "",
          referenceNo: "",
          notes: "",
        })
        loadData()
      } else {
        toast.error(data.error || "Failed to issue stock")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to issue stock")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustForm.stockItemId || !adjustForm.quantity) {
      toast.error("Please select item and enter adjustment quantity")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/finance/stock/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...adjustForm,
          type: "ADJUSTMENT",
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Stock adjustment saved!")
        setIsAdjustOpen(false)
        setAdjustForm({ stockItemId: "", quantity: "", notes: "" })
        loadData()
      } else {
        toast.error(data.error || "Failed to adjust stock")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust stock")
    } finally {
      setSubmitting(false)
    }
  }

  // Helper for Movement Type Badge
  const renderMovementBadge = (m: StockMovement) => {
    switch (m.type) {
      case "STOCK_IN":
        return <Badge className="bg-emerald-600 text-white flex items-center gap-1 w-fit"><ArrowDownRight className="w-3 h-3" /> Stock In</Badge>
      case "DEPARTMENT_ISSUE":
        return <Badge className="bg-indigo-600 text-white flex items-center gap-1 w-fit"><Building className="w-3 h-3" /> Dept Issue ({m.department || "Office"})</Badge>
      case "STAFF_ISSUE":
        return <Badge className="bg-purple-600 text-white flex items-center gap-1 w-fit"><User className="w-3 h-3" /> Staff Issue</Badge>
      case "PROJECT_ISSUE":
        return <Badge className="bg-blue-600 text-white flex items-center gap-1 w-fit"><ArrowUpRight className="w-3 h-3" /> Project Issue</Badge>
      case "PROJECT_RETURN":
        return <Badge className="bg-teal-600 text-white flex items-center gap-1 w-fit"><ArrowDownRight className="w-3 h-3" /> Project Return</Badge>
      case "VENDOR_RETURN":
        return <Badge className="bg-amber-600 text-white flex items-center gap-1 w-fit"><ArrowUpRight className="w-3 h-3" /> Vendor Return</Badge>
      case "ADJUSTMENT":
        return <Badge variant="outline" className="border-slate-400 text-slate-700 flex items-center gap-1 w-fit"><Sliders className="w-3 h-3" /> Audit Adjustment</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Link href="/crm/admin/finance" prefetch={false} className="hover:text-foreground flex items-center gap-1 transition">
              <ChevronLeft className="w-4 h-4" /> Finance Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Warehouse className="w-8 h-8 text-primary" /> Stock & Office Goods Management
          </h1>
          <p className="text-muted-foreground">
            Manage office goods (pens, pads, tissue, soap), HR consumables, and interior project materials in one unified stock ledger.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Add Item Modal */}
          <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <PlusCircle className="w-4 h-4" /> New Stock Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Stock Item / Goods</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateItem} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Item / Goods Name *</label>
                    <Input
                      required
                      placeholder="e.g. Ballpoint Pen Box / Tissue Pack / 18mm Ply"
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">SKU / Code (Optional)</label>
                    <Input
                      placeholder="Auto-generated if empty"
                      value={itemForm.sku}
                      onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Category *</label>
                    <Select
                      value={itemForm.category}
                      onValueChange={(val) => setItemForm({ ...itemForm, category: val as StockCategory })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.filter((c) => c.key !== "ALL").map((c) => (
                          <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Unit of Measure *</label>
                    <Select
                      value={itemForm.unit}
                      onValueChange={(val) => setItemForm({ ...itemForm, unit: val })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Unit Cost Price (৳)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={itemForm.unitCostPrice}
                      onChange={(e) => setItemForm({ ...itemForm, unitCostPrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Min Stock Alert</label>
                    <Input
                      type="number"
                      placeholder="5"
                      value={itemForm.minStockAlert}
                      onChange={(e) => setItemForm({ ...itemForm, minStockAlert: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Initial Stock Qty</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={itemForm.initialStock}
                      onChange={(e) => setItemForm({ ...itemForm, initialStock: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Primary Supplier</label>
                    <Select
                      value={itemForm.vendorId}
                      onValueChange={(val) => setItemForm({ ...itemForm, vendorId: val === "none" ? "" : val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Vendor (Optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- None --</SelectItem>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.vendorName} ({v.vendorCompanyName || v.vendorId})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Storage Location</label>
                    <Input
                      placeholder="e.g. HR Cabinet 2 / Store Shelf B"
                      value={itemForm.location}
                      onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Description & Notes</label>
                  <Textarea
                    placeholder="Brand, size, details..."
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save Item
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Stock In Modal */}
          <Dialog open={isStockInOpen} onOpenChange={setIsStockInOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                <ArrowDownRight className="w-4 h-4" /> Stock In
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-700">
                  <ArrowDownRight className="w-5 h-5" /> Receive Stock / Purchase Shipment
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleStockIn} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Select Stock Item *</label>
                  <Select
                    value={stockInForm.stockItemId}
                    onValueChange={(val) => {
                      const item = items.find((i) => i.id === val)
                      setStockInForm({
                        ...stockInForm,
                        stockItemId: val,
                        unitCost: item ? String(item.unitCostPrice) : stockInForm.unitCost,
                        vendorId: item?.vendorId || stockInForm.vendorId,
                      })
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose Item..." /></SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          [{i.sku}] {i.name} (Current: {i.currentStock} {i.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Quantity Received *</label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 20"
                      value={stockInForm.quantity}
                      onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Unit Cost Price (৳)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={stockInForm.unitCost}
                      onChange={(e) => setStockInForm({ ...stockInForm, unitCost: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Vendor / Supplier</label>
                    <Select
                      value={stockInForm.vendorId}
                      onValueChange={(val) => setStockInForm({ ...stockInForm, vendorId: val === "none" ? "" : val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- None --</SelectItem>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.vendorName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Cash Memo / Cash Voucher #</label>
                    <Input
                      placeholder="e.g. INV-1049"
                      value={stockInForm.referenceNo}
                      onChange={(e) => setStockInForm({ ...stockInForm, referenceNo: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Remarks / Notes</label>
                  <Input
                    placeholder="Purchased for office stock / HR pantry..."
                    value={stockInForm.notes}
                    onChange={(e) => setStockInForm({ ...stockInForm, notes: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg border">
                  <input
                    type="checkbox"
                    id="txCheck"
                    className="w-4 h-4 rounded text-primary"
                    checked={stockInForm.createFinanceTransaction}
                    onChange={(e) => setStockInForm({ ...stockInForm, createFinanceTransaction: e.target.checked })}
                  />
                  <label htmlFor="txCheck" className="text-xs font-medium cursor-pointer">
                    Also record a Financial Outflow Transaction in Accounts
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsStockInOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Receive Stock
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Issue Stock / Goods Modal */}
          <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50">
                <ArrowUpRight className="w-4 h-4" /> Issue Goods / Materials
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-indigo-700">
                  <ArrowUpRight className="w-5 h-5" /> Issue Stock to Department or Staff
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleIssueStock} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Select Stock Item / Goods *</label>
                  <Select
                    value={issueForm.stockItemId}
                    onValueChange={(val) => setIssueForm({ ...issueForm, stockItemId: val })}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose Stock Item..." /></SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          [{i.sku}] {i.name} (Available: {i.currentStock} {i.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destination Selector */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Issue Destination Type *</label>
                  <Select
                    value={issueForm.issueDestination}
                    onValueChange={(val: any) => setIssueForm({ ...issueForm, issueDestination: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEPARTMENT">🏢 Issue to Department (HR, Finance, Admin, etc.)</SelectItem>
                      <SelectItem value="STAFF">👤 Issue to Individual Employee / Staff</SelectItem>
                      <SelectItem value="PROJECT">🏗️ Issue to Client Project Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Picker */}
                {issueForm.issueDestination === "DEPARTMENT" && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Select Target Department *</label>
                    <Select
                      value={issueForm.department}
                      onValueChange={(val) => setIssueForm({ ...issueForm, department: val })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Staff Member Picker */}
                {issueForm.issueDestination === "STAFF" && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Select Staff Member / Employee *</label>
                    <Select
                      value={issueForm.recipientUserId}
                      onValueChange={(val) => setIssueForm({ ...issueForm, recipientUserId: val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Employee..." /></SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.fullName} ({u.email || "Staff"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Client Lead / Project Picker */}
                {issueForm.issueDestination === "PROJECT" && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Select Client Lead / Project Site *</label>
                    <Select
                      value={issueForm.leadId}
                      onValueChange={(val) => setIssueForm({ ...issueForm, leadId: val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Project..." /></SelectTrigger>
                      <SelectContent>
                        {leads.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name} ({l.location || l.phone || "Site"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Quantity to Issue *</label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 5"
                      value={issueForm.quantity}
                      onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Requisition Slip / Ref #</label>
                    <Input
                      placeholder="e.g. REQ-HR-001"
                      value={issueForm.referenceNo}
                      onChange={(e) => setIssueForm({ ...issueForm, referenceNo: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Notes / Reason</label>
                  <Input
                    placeholder="For HR monthly stationery stock / Finance pantry..."
                    value={issueForm.notes}
                    onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsIssueOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Issue Goods
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Adjust Stock Modal */}
          <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Sliders className="w-4 h-4" /> Audit Adjust
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Audit Stock Adjustment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdjustStock} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Select Stock Item *</label>
                  <Select
                    value={adjustForm.stockItemId}
                    onValueChange={(val) => setAdjustForm({ ...adjustForm, stockItemId: val })}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose Item..." /></SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          [{i.sku}] {i.name} (Current: {i.currentStock} {i.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Adjustment Qty (+ or -) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. +5 or -2"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Audit Reason / Notes *</label>
                  <Textarea
                    required
                    placeholder="Physical audit count discrepancy..."
                    value={adjustForm.notes}
                    onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsAdjustOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save Adjustment
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="icon" onClick={loadData} title="Refresh Data">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inventory Asset Value</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-emerald-700">
              ৳{(summary?.totalInventoryValue || 0).toLocaleString("en-BD", { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Valuation of stock & office supplies</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dept Consumables Issued</CardTitle>
            <Building className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-indigo-700">
              ৳{(summary?.totalDeptIssuedValueMonth || 0).toLocaleString("en-BD", { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">HR, Finance & Office consumption this month</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Site Project Dispatches</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-blue-700">
              ৳{(summary?.totalProjectIssuedValueMonth || 0).toLocaleString("en-BD", { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Materials issued to client projects</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Warnings</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-amber-600">
              {summary?.lowStockCount || 0} Items
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires reorder from supplier</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-lg">
          <TabsTrigger value="items" className="gap-2">
            <Package className="w-4 h-4" /> Stock & Goods Catalog ({items.length})
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2">
            <FileText className="w-4 h-4" /> Movements & Issue Ledger
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Center ({summary?.lowStockCount || 0})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: STOCK ITEMS CATALOG */}
        <TabsContent value="items" className="space-y-4">
          {/* Filters Bar */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search pen, paper, tissue, ply, SKU..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[230px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant={lowStockFilter ? "default" : "outline"}
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => setLowStockFilter(!lowStockFilter)}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Only
                </Button>
              </div>
            </div>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-muted-foreground flex justify-center items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading catalog...
                </div>
              ) : items.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No stock items or office goods found matching your filters.
                </div>
              ) : (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-3 pl-4">SKU Code</th>
                      <th className="p-3">Item / Goods Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Storage Location</th>
                      <th className="p-3 text-right">Unit Cost (৳)</th>
                      <th className="p-3 text-center">Current Stock</th>
                      <th className="p-3 text-right">Asset Value</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item) => {
                      const isLow = item.currentStock <= item.minStockAlert
                      const isOut = item.currentStock <= 0
                      const totalVal = item.currentStock * item.unitCostPrice

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition">
                          <td className="p-3 pl-4 font-mono font-bold text-xs text-primary">
                            {item.sku}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-foreground">{item.name}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">{item.description}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="secondary" className="text-[11px] py-0.5 px-2 font-medium">
                              {item.category.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {item.location || "—"}
                          </td>
                          <td className="p-3 text-right font-medium">
                            ৳{item.unitCostPrice.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`font-bold ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-emerald-700"}`}>
                              {item.currentStock} {item.unit}
                            </span>
                            <div className="text-[10px] text-muted-foreground">Min: {item.minStockAlert}</div>
                          </td>
                          <td className="p-3 text-right font-semibold text-emerald-700">
                            ৳{totalVal.toLocaleString("en-BD", { minimumFractionDigits: 0 })}
                          </td>
                          <td className="p-3 text-center">
                            {isOut ? (
                              <Badge className="bg-red-600 text-white text-[11px]">Out of Stock</Badge>
                            ) : isLow ? (
                              <Badge className="bg-amber-500 text-white text-[11px] gap-1">
                                <AlertTriangle className="w-3 h-3" /> Low Stock
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px]">In Stock</Badge>
                            )}
                          </td>
                          <td className="p-3 text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                title="Stock In"
                                onClick={() => {
                                  setStockInForm({
                                    ...stockInForm,
                                    stockItemId: item.id,
                                    unitCost: String(item.unitCostPrice),
                                    vendorId: item.vendorId || "",
                                  })
                                  setIsStockInOpen(true)
                                }}
                              >
                                <ArrowDownRight className="w-3 h-3 mr-1" /> +In
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2 text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                                title="Issue Stock"
                                onClick={() => {
                                  setIssueForm({ ...issueForm, stockItemId: item.id })
                                  setIsIssueOpen(true)
                                }}
                              >
                                <ArrowUpRight className="w-3 h-3 mr-1" /> -Issue
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setSelectedItem(item)
                                  setIsEditOpen(true)
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteItem(item.id, item.name)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: MOVEMENTS LEDGER */}
        <TabsContent value="movements" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Stock Issue & Movement History</h3>
              <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Movement Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Movement Types</SelectItem>
                  <SelectItem value="STOCK_IN">Stock In</SelectItem>
                  <SelectItem value="DEPARTMENT_ISSUE">Department Issue (HR/Finance)</SelectItem>
                  <SelectItem value="STAFF_ISSUE">Staff Issue</SelectItem>
                  <SelectItem value="PROJECT_ISSUE">Project Issue</SelectItem>
                  <SelectItem value="PROJECT_RETURN">Project Return</SelectItem>
                  <SelectItem value="ADJUSTMENT">Audit Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {movements.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No stock movements recorded yet.
                </div>
              ) : (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-3 pl-4">Date & Time</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Total Value (৳)</th>
                      <th className="p-3">Issue Destination / Entity</th>
                      <th className="p-3">Ref / Voucher</th>
                      <th className="p-3">Issued By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/30 transition text-xs">
                        <td className="p-3 pl-4 text-muted-foreground whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="p-3">
                          {renderMovementBadge(m)}
                        </td>
                        <td className="p-3 font-medium">
                          <div className="font-semibold text-foreground text-sm">{m.stockItem?.name}</div>
                          <span className="font-mono text-[11px] text-muted-foreground">SKU: {m.stockItem?.sku}</span>
                        </td>
                        <td className="p-3 text-right font-bold text-sm">
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.stockItem?.unit}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-700">
                          ৳{m.totalValue.toLocaleString("en-BD", { minimumFractionDigits: 0 })}
                        </td>
                        <td className="p-3">
                          {m.department ? (
                            <div className="text-indigo-700 font-semibold flex items-center gap-1">
                              <Building className="w-3.5 h-3.5" /> Dept: {m.department}
                            </div>
                          ) : m.recipientUser ? (
                            <div className="text-purple-700 font-semibold flex items-center gap-1">
                              <User className="w-3.5 h-3.5" /> Staff: {m.recipientUser.fullName}
                            </div>
                          ) : m.lead ? (
                            <div className="text-blue-700 font-semibold flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5" /> Project: {m.lead.name}
                            </div>
                          ) : m.vendor ? (
                            <div className="text-purple-700 font-semibold">Vendor: {m.vendor.vendorName}</div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {m.referenceNo || "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {m.createdBy?.fullName || "System"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: LOW STOCK REORDER CENTER */}
        <TabsContent value="alerts" className="space-y-4">
          <Card className="border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              <div>
                <h3 className="font-bold text-base">Low Stock Reorder Alert Center</h3>
                <p className="text-xs text-amber-700">
                  Stationery, tissue, soap, and materials below their reorder threshold require replenishment.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {items.filter((i) => i.currentStock <= i.minStockAlert).length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  <p className="font-semibold text-base text-foreground">All stock levels healthy!</p>
                  <p className="text-xs">No stationery or materials currently below minimum threshold.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-3 pl-4">SKU</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Current Stock</th>
                      <th className="p-3 text-center">Min Alert Threshold</th>
                      <th className="p-3 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items
                      .filter((i) => i.currentStock <= i.minStockAlert)
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition">
                          <td className="p-3 pl-4 font-mono font-bold text-xs text-primary">{item.sku}</td>
                          <td className="p-3 font-semibold">{item.name}</td>
                          <td className="p-3">
                            <Badge variant="outline">{item.category.replace(/_/g, " ")}</Badge>
                          </td>
                          <td className="p-3 text-center font-bold text-red-600">
                            {item.currentStock} {item.unit}
                          </td>
                          <td className="p-3 text-center font-medium text-muted-foreground">
                            {item.minStockAlert} {item.unit}
                          </td>
                          <td className="p-3 text-right pr-4">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                              onClick={() => {
                                setStockInForm({
                                  ...stockInForm,
                                  stockItemId: item.id,
                                  unitCost: String(item.unitCostPrice),
                                  vendorId: item.vendorId || "",
                                })
                                setIsStockInOpen(true)
                              }}
                            >
                              <ArrowDownRight className="w-3.5 h-3.5" /> Stock In Order
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EDIT MODAL */}
      {selectedItem && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Item: {selectedItem.sku}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditItem} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Item Name</label>
                <Input
                  value={selectedItem.name}
                  onChange={(e) => setSelectedItem({ ...selectedItem, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">SKU Code</label>
                  <Input
                    value={selectedItem.sku}
                    onChange={(e) => setSelectedItem({ ...selectedItem, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Category</label>
                  <Select
                    value={selectedItem.category}
                    onValueChange={(val) => setSelectedItem({ ...selectedItem, category: val as StockCategory })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c.key !== "ALL").map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Unit Cost Price (৳)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={selectedItem.unitCostPrice}
                    onChange={(e) => setSelectedItem({ ...selectedItem, unitCostPrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Min Stock Alert</label>
                  <Input
                    type="number"
                    value={selectedItem.minStockAlert}
                    onChange={(e) => setSelectedItem({ ...selectedItem, minStockAlert: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Location</label>
                <Input
                  value={selectedItem.location || ""}
                  onChange={(e) => setSelectedItem({ ...selectedItem, location: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <Textarea
                  value={selectedItem.description || ""}
                  onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
