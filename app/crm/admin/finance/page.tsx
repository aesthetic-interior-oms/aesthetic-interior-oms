"use client"

import React, { useCallback, useEffect, useState } from "react"
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
  PlusCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building,
  FileText,
  PieChart,
  Calendar,
  Briefcase,
  Search,
  Filter,
  Tag,
  Receipt,
  Wallet,
  Landmark,
  HandCoins,
  Package,
  Wrench,
  Sparkles,
  MapPin,
  Phone,
  User,
  Image as ImageIcon,
  Upload,
  Loader2,
} from "lucide-react"
import { uploadDirectBlobFile } from "@/lib/client-blob-upload"

// Category display mapping
type TransactionCategoryType = "OUTFLOW" | "INFLOW"

type TransactionCategory = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isCustom?: boolean
}

const EXPENSE_CATEGORIES: TransactionCategory[] = [
  { key: "OFFICE_RENT", label: "Office Rent", icon: Building },
  { key: "SALARY", label: "Staff Salary", icon: HandCoins },
  { key: "SALARY_ADVANCE", label: "Salary Advance", icon: HandCoins },
  { key: "BONUS", label: "Bonus", icon: Sparkles },
  { key: "ELECTRICITY_BILL", label: "Electricity Bill", icon: Receipt },
  { key: "WATER_BILL", label: "Water Bill", icon: Receipt },
  { key: "INTERNET_BILL", label: "Internet Bill", icon: Receipt },
  { key: "FOOD_ALLOWANCE", label: "Food Allowance", icon: Receipt },
  { key: "CLIENT_ENTERTAINMENT", label: "Client Food & Entertainment", icon: Receipt },
  { key: "PROMOTION", label: "Marketing & Promotion", icon: TrendingUp },
  { key: "MOBILE_RECHARGE", label: "Mobile Recharge", icon: Receipt },
  { key: "OCTANE_FUEL", label: "Octane & Fuel", icon: Receipt },
  { key: "DONATION", label: "Donation", icon: HandCoins },
  { key: "BOARD_MATERIAL", label: "Board Material (Site/Factory)", icon: Package },
  { key: "PASTING_BILL", label: "Pasting Bill", icon: Wrench },
  { key: "FARING", label: "Faring", icon: Wrench },
  { key: "HPL", label: "HPL", icon: Package },
  { key: "LINER", label: "Liner", icon: Package },
  { key: "LUBER", label: "Luber", icon: Package },
  { key: "ACRYLIC", label: "Acrylic", icon: Package },
  { key: "HARDWARE", label: "Hardware", icon: Wrench },
  { key: "ELECTRIC_ITEM", label: "Electric Items", icon: Receipt },
  { key: "LIGHTING", label: "Lighting", icon: Sparkles },
  { key: "GLASS", label: "Glass", icon: Package },
  { key: "TRANSPORT_COST", label: "Transport & Labor Cost", icon: Receipt },
  { key: "SITE_EXPENSE", label: "Site Expense", icon: Receipt },
  { key: "FACTORY_PAYMENT", label: "Factory Payment", icon: Building },
  { key: "CARPENTER_PAYMENT", label: "Carpenter Payment", icon: Wrench },
  { key: "PAINT_MATERIALS", label: "Paint Materials", icon: Package },
  { key: "PAINT_PAYMENT", label: "Paint Payment", icon: Wrench },
  { key: "CEILING_PAYMENT", label: "Ceiling Payment", icon: Wrench },
  { key: "DOOR", label: "Door Purchase", icon: Package },
  { key: "PLUMBER_PAYMENT", label: "Plumber Payment", icon: Wrench },
  { key: "TILES_PURCHASE", label: "Tiles Purchase", icon: Package },
  { key: "FOLDING_DOOR", label: "Folding Door", icon: Package },
  { key: "GLASS_PROFILE", label: "Glass Profile", icon: Package },
  { key: "CIVIL_WORK", label: "Civil Work", icon: Wrench },
  { key: "OTHERS", label: "Other Expenses", icon: Tag },
]

const INCOME_CATEGORIES: TransactionCategory[] = [
  { key: "SITE_VISIT_PAYMENT", label: "Site Visit Fee", icon: MapPin },
  { key: "CLIENT_PAYMENT", label: "Client Payment", icon: Wallet },
  { key: "PROJECT_ADVANCE", label: "Project Advance", icon: HandCoins },
  { key: "DESIGN_FEE", label: "Design Fee", icon: FileText },
  { key: "CONSULTANCY_FEE", label: "Consultancy Fee", icon: Briefcase },
  { key: "BANK_INTEREST", label: "Bank Interest", icon: Landmark },
  { key: "OTHER_INCOME", label: "Other Income", icon: TrendingUp },
]

const CATEGORY_LABELS: Record<string, string> = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].reduce(
  (labels, item) => ({ ...labels, [item.key]: item.label }),
  {} as Record<string, string>
)

const CUSTOM_CATEGORY_STORAGE_KEY = "finance-custom-transaction-categories"

const formatCustomCategoryKey = (name: string, type: TransactionCategoryType) =>
  `CUSTOM_${type}_${name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`

// ── Date preset helpers ──────────────────────────────────────────────────────
type DatePreset = "today" | "yesterday" | "this_week" | "this_month" | "custom"

function getTodayStr() {
  return new Date().toISOString().split("T")[0]
}

function getDateRange(preset: DatePreset, customStart: string, customEnd: string): { start: string; end: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (preset === "today") {
    const t = fmt(now)
    return { start: t, end: t }
  }
  if (preset === "yesterday") {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    const s = fmt(y)
    return { start: s, end: s }
  }
  if (preset === "this_week") {
    const day = now.getDay() // 0=Sun
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    return { start: fmt(monday), end: fmt(now) }
  }
  if (preset === "this_month") {
    return { start: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, end: fmt(now) }
  }
  // custom
  return { start: customStart, end: customEnd }
}

export default function FinanceDashboard() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [balances, setBalances] = useState({ cash: 0, bank: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  // Journal date filter states
  const [datePreset, setDatePreset] = useState<DatePreset>("today")
  const [customStart, setCustomStart] = useState(getTodayStr())
  const [customEnd, setCustomEnd] = useState(getTodayStr())

  // Transaction Log Form States
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [type, setType] = useState<TransactionCategoryType>("OUTFLOW")
  const [category, setCategory] = useState<string>("OFFICE_RENT")
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [categorySearch, setCategorySearch] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [customCategories, setCustomCategories] = useState<Record<TransactionCategoryType, TransactionCategory[]>>({
    OUTFLOW: [],
    INFLOW: [],
  })
  const [particular, setParticular] = useState("")
  const [amount, setAmount] = useState("")
  const [account, setAccount] = useState<string>("CASH")
  const [leadId, setLeadId] = useState<string>("none")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])

  // Visit Picker States (for SITE_VISIT_PAYMENT category)
  const [visitId, setVisitId] = useState<string | null>(null)
  const [visitSearch, setVisitSearch] = useState("")
  const [visitSearchResults, setVisitSearchResults] = useState<any[]>([])
  const [visitSearchLoading, setVisitSearchLoading] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null)
  const [isVisitPickerOpen, setIsVisitPickerOpen] = useState(false)

  // Collected-by (visit team leader) state
  const [collectedById, setCollectedById] = useState<string | null>(null)
  const [visitTeamMembers, setVisitTeamMembers] = useState<{ id: string; fullName: string }[]>([])

  // Project Picker Dialog States
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false)
  const [financeLeads, setFinanceLeads] = useState<any[]>([])
  const [srCrmOptions, setSrCrmOptions] = useState<{ id: string; name: string }[]>([])
  const [pickerSearch, setPickerSearch] = useState("")
  const [pickerSrCrmFilter, setPickerSrCrmFilter] = useState("all")
  const [financeLeadsLoading, setFinanceLeadsLoading] = useState(false)

  // Filter States
  const [filterLeadId, setFilterLeadId] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Image Upload States
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const loadJournalData = useCallback(async (preset: DatePreset, cStart: string, cEnd: string) => {
    setLoading(true)
    try {
      const { start, end } = getDateRange(preset, cStart, cEnd)
      const params = new URLSearchParams({ startDate: start, endDate: end })
      if (filterType !== "all") params.set("type", filterType)
      if (filterLeadId !== "all") params.set("leadId", filterLeadId)

      // Load transactions
      const txRes = await fetch(`/api/finance/transactions?${params.toString()}`)
      const txData = await txRes.json()

      if (txData.success) {
        setTransactions(txData.data)
        setBalances(txData.balances)
      }
    } catch (e: unknown) {
      toast.error("Failed to load journal: " + (e instanceof Error ? e.message : "Unknown error"))
    } finally {
      setLoading(false)
    }
  }, [filterType, filterLeadId])

  // Keep old name as alias for places that still call loadData (e.g. after posting)
  const loadData = useCallback(() => loadJournalData(datePreset, customStart, customEnd), [loadJournalData, datePreset, customStart, customEnd])

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/finance/accounts')
      const data = await res.json()
      if (data.success) {
        setAccounts(data.data.filter((a: any) => a.isActive))
        if (data.data.length > 0 && !account) {
          setAccount(data.data[0].id)
        }
      }
    } catch (e) {
      console.error("Failed to load accounts", e)
    }
  }

  const loadFinanceLeads = async (search = "", srCrmId = "all") => {
    setFinanceLeadsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (srCrmId && srCrmId !== "all") params.set("srCrmId", srCrmId)
      const res = await fetch(`/api/finance/leads?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setFinanceLeads(data.data || [])
        if (data.srCrms?.length) setSrCrmOptions(data.srCrms)
      }
    } catch (e: any) {
      toast.error("Failed to load projects: " + e.message)
    } finally {
      setFinanceLeadsLoading(false)
    }
  }

  const loadVisitSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setVisitSearchResults([])
      return
    }
    setVisitSearchLoading(true)
    try {
      const res = await fetch(`/api/finance/visit-search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (data.success) {
        setVisitSearchResults(data.data || [])
      }
    } catch (e: any) {
      toast.error("Failed to load visits: " + e.message)
    } finally {
      setVisitSearchLoading(false)
    }
  }

  const loadVisitTeamMembers = async () => {
    try {
      const res = await fetch('/api/user?department=VISIT_TEAM')
      const data = await res.json()
      if (Array.isArray(data)) {
        setVisitTeamMembers(data)
      } else if (data.success && Array.isArray(data.data)) {
        setVisitTeamMembers(data.data)
      } else {
        setVisitTeamMembers([])
      }
    } catch (e) {
      console.error("Failed to load visit team members", e)
    }
  }

  useEffect(() => {
    void loadJournalData(datePreset, customStart, customEnd)
    void loadVisitTeamMembers()
    void loadAccounts()

    const storedCategories = window.localStorage.getItem(CUSTOM_CATEGORY_STORAGE_KEY)
    if (storedCategories) {
      try {
        const parsedCategories = JSON.parse(storedCategories) as Record<string, Omit<TransactionCategory, "icon">[]>
        setCustomCategories({
          OUTFLOW: (parsedCategories.OUTFLOW || []).map((item) => ({ ...item, icon: Tag, isCustom: true })),
          INFLOW: (parsedCategories.INFLOW || []).map((item) => ({ ...item, icon: Tag, isCustom: true })),
        })
      } catch (error) {
        console.error("Failed to load custom finance categories", error)
      }
    }
  }, [])

  const activeCategories = type === "OUTFLOW"
    ? [...customCategories.OUTFLOW, ...EXPENSE_CATEGORIES]
    : [...customCategories.INFLOW, ...INCOME_CATEGORIES]

  const selectedCategory = activeCategories.find((item) => item.key === category)

  const filteredCategories = activeCategories.filter((item) =>
    item.label.toLowerCase().includes(categorySearch.toLowerCase())
  )

  const persistCustomCategories = (nextCategories: Record<TransactionCategoryType, TransactionCategory[]>) => {
    const serializableCategories = {
      OUTFLOW: nextCategories.OUTFLOW.map(({ key, label, isCustom }) => ({ key, label, isCustom })),
      INFLOW: nextCategories.INFLOW.map(({ key, label, isCustom }) => ({ key, label, isCustom })),
    }
    window.localStorage.setItem(CUSTOM_CATEGORY_STORAGE_KEY, JSON.stringify(serializableCategories))
  }

  const handleTypeChange = (nextType: TransactionCategoryType) => {
    setType(nextType)
    setCategory(nextType === "OUTFLOW" ? EXPENSE_CATEGORIES[0].key : INCOME_CATEGORIES[0].key)
    setCategorySearch("")
  }

  const handleSelectCategory = (nextCategory: string) => {
    setCategory(nextCategory)
    setIsCategoryOpen(false)
    setCategorySearch("")
  }

  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      toast.error("Please enter a category name")
      return
    }

    const newCategory = {
      key: formatCustomCategoryKey(trimmedName, type),
      label: trimmedName,
      icon: Tag,
      isCustom: true,
    }

    if (activeCategories.some((item) => item.key === newCategory.key || item.label.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("This category already exists")
      return
    }

    const nextCategories = {
      ...customCategories,
      [type]: [newCategory, ...customCategories[type]],
    }

    setCustomCategories(nextCategories)
    persistCustomCategories(nextCategories)
    setCategory(newCategory.key)
    setNewCategoryName("")
    setIsCategoryOpen(false)
    toast.success("Category added")
  }

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!particular || !amount) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      setIsUploading(true)
      let uploadedImageUrl = null
      
      if (imageFile) {
        const tempId = `receipt-${Date.now()}`
        const uploaded = await uploadDirectBlobFile({
          file: imageFile,
          context: 'transaction-receipt',
          ownerId: tempId,
        })
        uploadedImageUrl = uploaded.url
      }

      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category,
          particular,
          amount: parseFloat(amount),
          financeAccountId: account,
          leadId: leadId === "none" ? null : leadId,
          visitId,
          collectedById,
          date,
          imageUrl: uploadedImageUrl,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success("Transaction logged successfully")
        setIsLogOpen(false)
        setParticular("")
        setAmount("")
        setImageFile(null)
        setPreviewUrl(null)
        loadData()
      } else {
        toast.error(data.error || "Failed to log transaction")
      }
    } catch (err: any) {
      toast.error("Error logging transaction: " + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  // Client-side search filter only (type/date filters go to the API)
  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm) return true
    return (
      tx.particular.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.lead?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset)
    void loadJournalData(preset, customStart, customEnd)
  }

  const handleCustomDateApply = () => {
    setDatePreset("custom")
    void loadJournalData("custom", customStart, customEnd)
  }

  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Finance & Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage cash flow, project budgets, and office overheads.</p>
        </div>

        {/* LOG TRANSACTION TRIGGER */}
        <Dialog open={isLogOpen} onOpenChange={(open) => {
          setIsLogOpen(open)
          if (!open) {
            setLeadId("none")
            setPickerSearch("")
            setPickerSrCrmFilter("all")
            setVisitId(null)
            setSelectedVisit(null)
            setCollectedById(null)
            setVisitSearch("")
            setVisitSearchResults([])
          }
        }}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <PlusCircle className="w-5 h-5" /> Log Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card border border-border">
            <DialogHeader>
              <DialogTitle>Log New Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTransaction} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={type === "OUTFLOW" ? "default" : "outline"}
                  onClick={() => handleTypeChange("OUTFLOW")}
                  className="w-full"
                >
                  <TrendingDown className="w-4 h-4 mr-2" /> Outflow (Expense)
                </Button>
                <Button
                  type="button"
                  variant={type === "INFLOW" ? "default" : "outline"}
                  onClick={() => handleTypeChange("INFLOW")}
                  className="w-full"
                >
                  <TrendingUp className="w-4 h-4 mr-2" /> Inflow (Income)
                </Button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Payment Account</label>
                <Select value={account} onValueChange={setAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">{type === "OUTFLOW" ? "Expense Category" : "Income Category"}</label>
                  <Dialog open={isCategoryOpen} onOpenChange={(open) => {
                    setIsCategoryOpen(open)
                    if (open) {
                      const storedCategories = window.localStorage.getItem(CUSTOM_CATEGORY_STORAGE_KEY)
                      if (storedCategories) {
                        try {
                          const parsedCategories = JSON.parse(storedCategories) as Record<string, Omit<TransactionCategory, "icon">[]>
                          setCustomCategories({
                            OUTFLOW: (parsedCategories.OUTFLOW || []).map((item) => ({ ...item, icon: Tag, isCustom: true })),
                            INFLOW: (parsedCategories.INFLOW || []).map((item) => ({ ...item, icon: Tag, isCustom: true })),
                          })
                        } catch (error) {
                          console.error("Failed to sync custom categories", error)
                        }
                      }
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-between h-auto min-h-10 px-3 py-2">
                        <span className="flex items-center gap-2 text-left">
                          {selectedCategory ? (
                            <>
                              {React.createElement(selectedCategory.icon, { className: "w-4 h-4 text-muted-foreground" })}
                              <span>{selectedCategory.label}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Select category</span>
                          )}
                        </span>
                        <Search className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] md:max-w-4xl lg:max-w-5xl bg-card border border-border h-[80vh] md:h-auto flex flex-col">
                      <DialogHeader className="shrink-0">
                        <DialogTitle>{type === "OUTFLOW" ? "Choose Expense Category" : "Choose Income Category"}</DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4 pt-2 flex-1 flex flex-col min-h-0">
                        <div className="relative shrink-0">
                          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            className="pl-9"
                            placeholder="Search category..."
                            value={categorySearch}
                            onChange={(event) => setCategorySearch(event.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto pr-1 flex-1 min-h-0 max-h-[55vh] pb-4">
                          {filteredCategories.map((item) => (
                            <Button
                              key={item.key}
                              type="button"
                              variant={category === item.key ? "default" : "outline"}
                              onClick={() => handleSelectCategory(item.key)}
                              className="h-24 flex-col items-start justify-between gap-2 whitespace-normal p-3 text-left w-full transition duration-200"
                            >
                              {React.createElement(item.icon, { className: "w-5 h-5" })}
                              <span className="text-sm font-medium leading-tight">{item.label}</span>
                              {item.isCustom && <Badge variant="secondary" className="text-[10px]">Custom</Badge>}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Project/Client Allocation (Optional)</label>
                {/* Project Picker Trigger Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between h-auto min-h-10 px-3 py-2"
                  onClick={() => {
                    setIsProjectPickerOpen(true)
                    loadFinanceLeads(pickerSearch, pickerSrCrmFilter)
                  }}
                >
                  <span className="flex items-center gap-2 text-left">
                    {leadId === "none" ? (
                      <span className="text-muted-foreground">Office (Overhead / General)</span>
                    ) : (
                      <span>{financeLeads.find((l) => l.id === leadId)?.name ?? leads.find((l: any) => l.id === leadId)?.name ?? leadId}</span>
                    )}
                  </span>
                  <Search className="w-4 h-4 text-muted-foreground" />
                </Button>

                {/* Project Picker Dialog */}
                <Dialog open={isProjectPickerOpen} onOpenChange={setIsProjectPickerOpen}>
                  <DialogContent className="max-w-[95vw] md:max-w-4xl lg:max-w-5xl bg-card border border-border flex flex-col h-[85vh] md:h-[75vh]">
                    <DialogHeader className="shrink-0">
                      <DialogTitle>Select Project / Client Allocation</DialogTitle>
                    </DialogHeader>

                    {/* Search + Filter bar */}
                    <div className="flex flex-col gap-2 sm:flex-row shrink-0 pt-1">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="Search by name, location, phone..."
                          value={pickerSearch}
                          onChange={(e) => {
                            setPickerSearch(e.target.value)
                            loadFinanceLeads(e.target.value, pickerSrCrmFilter)
                          }}
                        />
                      </div>
                      {srCrmOptions.length > 0 && (
                        <Select
                          value={pickerSrCrmFilter}
                          onValueChange={(val) => {
                            setPickerSrCrmFilter(val)
                            loadFinanceLeads(pickerSearch, val)
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-52">
                            <SelectValue placeholder="Filter by Sr. CRM" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sr. CRM</SelectItem>
                            {srCrmOptions.map((sr) => (
                              <SelectItem key={sr.id} value={sr.id}>{sr.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Cards grid */}
                    <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                      {financeLeadsLoading ? (
                        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading projects...</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
                          {/* Office / General overhead card */}
                          <button
                            type="button"
                            onClick={() => { setLeadId("none"); setIsProjectPickerOpen(false) }}
                            className={`group text-left rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                              leadId === "none"
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="p-2 rounded-lg bg-muted">
                                <Building className="w-5 h-5 text-muted-foreground" />
                              </div>
                              {leadId === "none" && (
                                <Badge className="text-[10px] bg-primary text-primary-foreground">Selected</Badge>
                              )}
                            </div>
                            <p className="font-semibold text-sm text-foreground">Office / General Overhead</p>
                            <p className="text-xs text-muted-foreground mt-1">Not project-specific</p>
                          </button>

                          {financeLeads.map((lead) => (
                            <button
                              key={lead.id}
                              type="button"
                              onClick={() => { setLeadId(lead.id); setIsProjectPickerOpen(false) }}
                              className={`group text-left rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                                leadId === lead.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-card hover:border-primary/50"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] font-semibold ${
                                    lead.stage === "CONVERSION" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" :
                                    lead.stage === "QUOTATION_PHASE" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200" :
                                    lead.stage === "BUDGET_PHASE" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" :
                                    lead.stage === "VISUALIZATION_PHASE" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200" :
                                    lead.stage === "CLOSED" ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
                                    ""
                                  }`}
                                >
                                  {lead.stage === "QUOTATION_PHASE" ? "Quotation" :
                                   lead.stage === "BUDGET_PHASE" ? "Budget" :
                                   lead.stage === "VISUALIZATION_PHASE" ? "Visualization" :
                                   lead.stage === "CONVERSION" ? "Conversion" :
                                   lead.stage === "CLOSED" ? "Closed" : lead.stage}
                                </Badge>
                                {leadId === lead.id && (
                                  <Badge className="text-[10px] bg-primary text-primary-foreground">Selected</Badge>
                                )}
                              </div>
                              <p className="font-semibold text-sm text-foreground leading-snug mb-2">{lead.name}</p>
                              <div className="space-y-1">
                                {lead.location && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{lead.location}</span>
                                  </p>
                                )}
                                {lead.phone && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="w-3 h-3 shrink-0" />
                                    {lead.phone}
                                  </p>
                                )}
                                {lead.srCrm && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3 shrink-0" />
                                    {lead.srCrm}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}

                          {!financeLeadsLoading && financeLeads.length === 0 && (
                            <div className="col-span-full text-center py-10 text-sm text-muted-foreground">
                              No projects found matching your search.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {category === "SITE_VISIT_PAYMENT" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Select Site Visit</label>
                    <Dialog open={isVisitPickerOpen} onOpenChange={setIsVisitPickerOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-between h-auto min-h-10 px-3 py-2">
                          <span className="flex items-center gap-2 text-left">
                            {selectedVisit ? (
                              <span>
                                {selectedVisit.lead.name} - {new Date(selectedVisit.scheduledAt).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Search and select a visit</span>
                            )}
                          </span>
                          <Search className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] md:max-w-2xl bg-card flex flex-col h-[70vh]">
                        <DialogHeader className="shrink-0">
                          <DialogTitle>Select Visit to Pay For</DialogTitle>
                        </DialogHeader>
                        <div className="p-1 shrink-0">
                          <Input
                            placeholder="Search by Lead Name (min 2 chars)..."
                            value={visitSearch}
                            onChange={(e) => {
                              setVisitSearch(e.target.value)
                              loadVisitSearch(e.target.value)
                            }}
                          />
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1">
                          {visitSearchLoading ? (
                            <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">Searching...</div>
                          ) : visitSearchResults.length === 0 ? (
                            <div className="text-center py-10 text-sm text-muted-foreground">
                              {visitSearch.length < 2 ? "Type at least 2 characters to search" : "No visits found with a fee."}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {visitSearchResults.map((v) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  className="w-full text-left rounded-xl border-2 p-3 transition-all duration-200 bg-card hover:border-primary/50"
                                  onClick={() => {
                                    setVisitId(v.id)
                                    setSelectedVisit(v)
                                    setLeadId(v.lead.id) // Auto-fill lead
                                    if (v.visitFee && !amount) {
                                      // Suggest remaining amount
                                      const remaining = v.visitFee - v.feePaidAmount
                                      if (remaining > 0) setAmount(remaining.toString())
                                    }
                                    if (v.assignedTo?.id && visitTeamMembers.some(m => m.id === v.assignedTo.id)) {
                                      setCollectedById(v.assignedTo.id) // Auto-fill collectedBy
                                    }
                                    setIsVisitPickerOpen(false)
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="font-semibold">{v.lead.name}</p>
                                    <div className="text-right flex items-center gap-2">
                                      <span className="text-sm font-medium">{v.visitFee} BDT</span>
                                      {v.feeIsPaid ? (
                                        <Badge className="bg-success text-success-foreground">Paid</Badge>
                                      ) : v.feeIsPartiallyPaid ? (
                                        <Badge className="bg-warning text-warning-foreground">Partial ({v.feePaidAmount})</Badge>
                                      ) : (
                                        <Badge variant="destructive">Unpaid</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground flex justify-between">
                                    <span>{new Date(v.scheduledAt).toLocaleDateString()}</span>
                                    <span>Team: {v.assignedTo?.fullName || 'Unassigned'}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Collected By (Visit Team)</label>
                    <Select value={collectedById || "none"} onValueChange={(val) => setCollectedById(val === "none" ? null : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not Applicable / None</SelectItem>
                        {visitTeamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>{member.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Amount (BDT)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Date</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Particulars / Description</label>
                <Textarea
                  placeholder="Details of the payment (e.g. Chowkath purchase, Eid Bonus)"
                  value={particular}
                  onChange={(e) => setParticular(e.target.value)}
                  rows={2}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Attachment / Receipt (Optional)</label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="relative w-full"
                    onClick={() => document.getElementById('receipt-upload')?.click()}
                  >
                    {imageFile ? (
                      <span className="truncate">{imageFile.name}</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Upload Image
                      </span>
                    )}
                  </Button>
                  <input
                    id="receipt-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImageFile(e.target.files[0])
                        setPreviewUrl(URL.createObjectURL(e.target.files[0]))
                      }
                    }}
                  />
                  {previewUrl && (
                    <div className="w-10 h-10 shrink-0 border rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {previewUrl && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setImageFile(null)
                        setPreviewUrl(null)
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full mt-4" disabled={isUploading}>
                {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading & Saving...</> : "Confirm Entry"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* STATS HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-transparent border border-indigo-500/20 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-400">Total Net Assets</CardTitle>
            <DollarSign className="w-5 h-5 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              {balances.total.toLocaleString("en-US")} BDT
            </div>
            <p className="text-xs text-muted-foreground mt-1">Consolidated Cash & Bank valuation</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent border border-emerald-500/20 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-400">Cash Drawer Balance</CardTitle>
            <Building className="w-5 h-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              {balances.cash.toLocaleString("en-US")} BDT
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready cash available in office vault</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-500/10 via-sky-600/5 to-transparent border border-sky-500/20 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-sky-400">Bank Accounts Valuation</CardTitle>
            <Building className="w-5 h-5 text-sky-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              {balances.bank.toLocaleString("en-US")} BDT
            </div>
            <p className="text-xs text-muted-foreground mt-1">Eastern Bank & other bank reserves</p>
          </CardContent>
        </Card>
      </div>

      {/* TABS MODULE */}
      <Tabs defaultValue="ledger" className="space-y-6">
        <TabsList className="bg-muted p-1 border border-border">
          <TabsTrigger value="ledger" className="gap-2">
            <FileText className="w-4 h-4" /> Daily Journal
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DAILY JOURNAL */}
        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 pb-4">
              <div className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Daily Journal</CardTitle>
                  <CardDescription>Real-time transaction tracker covering all inflows and outflows.</CardDescription>
                </div>
                {/* Search */}
                <div className="relative shrink-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search journal..."
                    className="pl-9 w-56"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* DATE FILTER TAGS */}
              <div className="flex flex-wrap items-center gap-2">
                {([
                  { key: "today", label: "Today" },
                  { key: "yesterday", label: "Yesterday" },
                  { key: "this_week", label: "This Week" },
                  { key: "this_month", label: "This Month" },
                ] as { key: DatePreset; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handlePresetChange(key)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition-all ${
                      datePreset === key
                        ? "bg-foreground text-background border-foreground shadow-sm"
                        : "bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}

                {/* Custom Date Picker */}
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    className={`h-8 w-36 text-xs ${
                      datePreset === "custom" ? "border-foreground ring-1 ring-foreground" : ""
                    }`}
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">→</span>
                  <Input
                    type="date"
                    className={`h-8 w-36 text-xs ${
                      datePreset === "custom" ? "border-foreground ring-1 ring-foreground" : ""
                    }`}
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                  <button
                    onClick={handleCustomDateApply}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold border border-border bg-muted hover:bg-accent hover:text-accent-foreground transition-all"
                  >
                    Apply
                  </button>
                </div>

                {/* Type filter */}
                <Select
                  value={filterType}
                  onValueChange={(v) => {
                    setFilterType(v)
                    void loadJournalData(datePreset, customStart, customEnd)
                  }}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="INFLOW">Inflow Only</SelectItem>
                    <SelectItem value="OUTFLOW">Outflow Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                // ── Skeleton ────────────────────────────────────────────────
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="p-3">S/L</th>
                        <th className="p-3">Voucher No.</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Particulars</th>
                        <th className="p-3">Allocated Project</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Account</th>
                        <th className="p-3">Recorder</th>
                        <th className="p-3 text-center">Receipt</th>
                        <th className="p-3 text-right">Inflow (BDT)</th>
                        <th className="p-3 text-right">Outflow (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="p-3"><div className="h-3 w-8 rounded bg-muted" /></td>
                          <td className="p-3"><div className="h-3 w-16 rounded bg-muted" /></td>
                          <td className="p-3"><div className="h-3 w-20 rounded bg-muted" /></td>
                          <td className="p-3"><div className="h-3 w-40 rounded bg-muted" /></td>
                          <td className="p-3"><div className="h-3 w-24 rounded bg-muted" /></td>
                          <td className="p-3"><div className="h-3 w-28 rounded bg-muted" /></td>
                          <td className="p-3"><div className="h-5 w-16 rounded-full bg-muted" /></td>
                          <td className="p-3"><div className="h-3 w-20 rounded bg-muted" /></td>
                          <td className="p-3"><div className="h-6 w-6 rounded bg-muted mx-auto" /></td>
                          <td className="p-3"><div className="h-3 w-16 rounded bg-muted ml-auto" /></td>
                          <td className="p-3"><div className="h-3 w-16 rounded bg-muted ml-auto" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Calendar className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No transactions found for this period.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="p-3">S/L</th>
                        <th className="p-3">Voucher No.</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Particulars</th>
                        <th className="p-3">Allocated Project</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Account</th>
                        <th className="p-3">Recorder</th>
                        <th className="p-3 text-center">Receipt</th>
                        <th className="p-3 text-right">Inflow (BDT)</th>
                        <th className="p-3 text-right">Outflow (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {filteredTransactions.map((tx, idx) => (
                        <tr key={tx.id} className="hover:bg-muted/20">
                          <td className="p-3 text-xs font-medium text-muted-foreground">
                            {tx.serialNo || idx + 1}
                          </td>
                          <td className="p-3 text-xs font-mono font-medium">
                            {tx.voucherNo || "-"}
                          </td>
                          <td className="p-3 text-xs whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="p-3 font-medium max-w-[150px] lg:max-w-[250px] truncate" title={tx.particular}>
                            {tx.particular}
                          </td>
                          <td className="p-3 text-xs">
                            {tx.lead ? (
                              <Badge variant="secondary" className="font-semibold">
                                {tx.lead.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">Office (Overhead)</span>
                            )}
                          </td>
                          <td className="p-3 text-xs">
                            {CATEGORY_LABELS[tx.category] || tx.category}
                          </td>
                          <td className="p-3 text-xs">
                            <Badge variant="outline">{tx.financeAccount?.name || "Unknown Account"}</Badge>
                          </td>
                          <td className="p-3 text-xs">{tx.recordedBy?.fullName}</td>
                          <td className="p-3 text-center">
                            {tx.imageUrl ? (
                              <button
                                type="button"
                                className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-muted transition-colors text-primary"
                                onClick={() => setLightboxImage(tx.imageUrl)}
                                title="View Receipt"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </button>
                            ) : (
                              <div className="inline-flex items-center justify-center w-8 h-8 text-muted-foreground/30" title="No Receipt">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-500">
                            {tx.type === "INFLOW" ? `${tx.amount.toLocaleString()} BDT` : "-"}
                          </td>
                          <td className="p-3 text-right font-bold text-rose-500">
                            {tx.type === "OUTFLOW" ? `${tx.amount.toLocaleString()} BDT` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lightbox for Receipt Image */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-3xl bg-transparent border-none p-0 overflow-hidden flex flex-col items-center justify-center">
          <DialogTitle className="sr-only">Receipt Image View</DialogTitle>
          {lightboxImage && (
            <div className="relative w-full max-h-[85vh] flex items-center justify-center bg-black/40 rounded-xl overflow-hidden backdrop-blur-sm p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage}
                alt="Receipt Full View"
                className="max-w-full max-h-[80vh] object-contain rounded-md shadow-2xl"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
