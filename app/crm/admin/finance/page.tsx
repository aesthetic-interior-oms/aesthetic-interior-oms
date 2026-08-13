"use client"

import React, { useEffect, useState } from "react"
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
} from "lucide-react"

// Category display mapping
const EXPENSE_CATEGORIES = [
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

const INCOME_CATEGORIES = [
  { key: "CLIENT_PAYMENT", label: "Client Payment", icon: Wallet },
  { key: "PROJECT_ADVANCE", label: "Project Advance", icon: HandCoins },
  { key: "DESIGN_FEE", label: "Design Fee", icon: FileText },
  { key: "CONSULTANCY_FEE", label: "Consultancy Fee", icon: Briefcase },
  { key: "BANK_INTEREST", label: "Bank Interest", icon: Landmark },
  { key: "OTHER_INCOME", label: "Other Income", icon: TrendingUp },
]

type TransactionCategoryType = "OUTFLOW" | "INFLOW"

type TransactionCategory = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isCustom?: boolean
}

const CATEGORY_LABELS: Record<string, string> = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].reduce(
  (labels, item) => ({ ...labels, [item.key]: item.label }),
  {} as Record<string, string>
)

const CUSTOM_CATEGORY_STORAGE_KEY = "finance-custom-transaction-categories"

const formatCustomCategoryKey = (name: string, type: TransactionCategoryType) =>
  `CUSTOM_${type}_${name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`

export default function FinanceDashboard() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [balances, setBalances] = useState({ cash: 0, bank: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  // Report States
  const [selectedMonth, setSelectedMonth] = useState("2026-06")
  const [monthlyReport, setMonthlyReport] = useState<any>(null)
  
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [projectReport, setProjectReport] = useState<any>(null)

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

  // Filter States
  const [filterLeadId, setFilterLeadId] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  const loadData = async () => {
    setLoading(true)
    try {
      // Load active leads/projects for drop downs
      const leadsRes = await fetch("/api/lead")
      const leadsData = await leadsRes.json()
      if (leadsData.success) {
        setLeads(leadsData.data || [])
      }

      // Load all transactions
      const txRes = await fetch("/api/finance/transactions")
      const txData = await txRes.json()
      if (txData.success) {
        setTransactions(txData.data)
        setBalances(txData.balances)
      }
    } catch (e: any) {
      toast.error("Failed to load transactions: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMonthlyReport = async (month: string) => {
    try {
      const res = await fetch(`/api/finance/reports?mode=monthly&month=${month}`)
      const data = await res.json()
      if (data.success) {
        setMonthlyReport(data)
      }
    } catch (e: any) {
      console.error(e)
    }
  }

  const loadProjectReport = async (projId: string) => {
    if (!projId) return
    try {
      const res = await fetch(`/api/finance/reports?mode=project&leadId=${projId}`)
      const data = await res.json()
      if (data.success) {
        setProjectReport(data)
      }
    } catch (e: any) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
    loadMonthlyReport(selectedMonth)

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

  useEffect(() => {
    loadMonthlyReport(selectedMonth)
  }, [selectedMonth])

  useEffect(() => {
    if (selectedProject) {
      loadProjectReport(selectedProject)
    }
  }, [selectedProject])

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
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category,
          particular,
          amount: parseFloat(amount),
          account,
          leadId: leadId === "none" ? null : leadId,
          date,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success("Transaction logged successfully")
        setIsLogOpen(false)
        setParticular("")
        setAmount("")
        loadData()
        loadMonthlyReport(selectedMonth)
        if (selectedProject) loadProjectReport(selectedProject)
      } else {
        toast.error(data.error || "Failed to log transaction")
      }
    } catch (err: any) {
      toast.error("Error logging transaction: " + err.message)
    }
  }

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesLead = filterLeadId === "all" || tx.leadId === filterLeadId
    const matchesType = filterType === "all" || tx.type === filterType
    const matchesSearch =
      tx.particular.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.lead?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    return matchesLead && matchesType && matchesSearch
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Finance & Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage cash flow, project budgets, and office overheads.</p>
        </div>

        {/* LOG TRANSACTION TRIGGER */}
        <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
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
                    <SelectItem value="CASH">Cash Drawer</SelectItem>
                    <SelectItem value="BANK_EBL">Eastern Bank Ltd (EBL)</SelectItem>
                    <SelectItem value="BANK_OTHER">Other Bank Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">{type === "OUTFLOW" ? "Expense Category" : "Income Category"}</label>
                <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
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
                  <DialogContent className="max-w-2xl bg-card border border-border">
                    <DialogHeader>
                      <DialogTitle>{type === "OUTFLOW" ? "Choose Expense Category" : "Choose Income Category"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="Search category..."
                          value={categorySearch}
                          onChange={(event) => setCategorySearch(event.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                        <div className="col-span-2 md:col-span-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-3">
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              placeholder={`Add new ${type === "OUTFLOW" ? "expense" : "income"} category`}
                              value={newCategoryName}
                              onChange={(event) => setNewCategoryName(event.target.value)}
                            />
                            <Button type="button" onClick={handleAddCategory} className="shrink-0 gap-2">
                              <PlusCircle className="w-4 h-4" /> Add New Category
                            </Button>
                          </div>
                        </div>

                        {filteredCategories.map((item) => (
                          <Button
                            key={item.key}
                            type="button"
                            variant={category === item.key ? "default" : "outline"}
                            onClick={() => handleSelectCategory(item.key)}
                            className="h-24 flex-col items-start justify-between gap-2 whitespace-normal p-3 text-left"
                          >
                            {React.createElement(item.icon, { className: "w-5 h-5" })}
                            <span className="text-sm font-medium leading-tight">{item.label}</span>
                            {item.isCustom && <Badge variant="secondary" className="text-[10px]">New item</Badge>}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Project/Client Allocation (Optional)</label>
                <Select value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project allocation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Office (Overhead / General)</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name} ({lead.stage})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
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

              <Button type="submit" className="w-full mt-4">
                Confirm Entry
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
            <FileText className="w-4 h-4" /> Daily Ledger Logs
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <Briefcase className="w-4 h-4" /> Project Budgets & Matrix
          </TabsTrigger>
          <TabsTrigger value="overhead" className="gap-2">
            <PieChart className="w-4 h-4" /> Monthly Overhead & Salary
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DAILY LEDGER LOGS */}
        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Cash Flow ledger</CardTitle>
                <CardDescription>Real-time transaction tracker covering all inflows and outflows.</CardDescription>
              </div>

              {/* FILTERING CONTROLS */}
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search ledger..."
                    className="pl-9 w-60"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="INFLOW">Inflow Only</SelectItem>
                    <SelectItem value="OUTFLOW">Outflow Only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterLeadId} onValueChange={setFilterLeadId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Allocated To" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Allocations</SelectItem>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No transactions found. Log one to get started!</div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="p-3">Date</th>
                        <th className="p-3">Particulars</th>
                        <th className="p-3">Allocated Project</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Account</th>
                        <th className="p-3">Recorder</th>
                        <th className="p-3 text-right">Inflow (BDT)</th>
                        <th className="p-3 text-right">Outflow (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/20">
                          <td className="p-3 text-xs whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="p-3 font-medium">{tx.particular}</td>
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
                            <Badge variant="outline">{tx.account.replace("_", " ")}</Badge>
                          </td>
                          <td className="p-3 text-xs">{tx.recordedBy?.fullName}</td>
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

        {/* TAB 2: PROJECT BUDGETS & MATRIX */}
        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Expenses Ledger Allocation</CardTitle>
              <CardDescription>Breakdown of construction and material expenses per site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4 items-center">
                <span className="text-sm font-semibold">Select Project Site:</span>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="Choose project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProject && projectReport ? (
                <div className="space-y-6 pt-4 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted border border-border">
                      <div className="text-xs text-muted-foreground">Total Budget</div>
                      <div className="text-xl font-bold mt-1">
                        {projectReport.project?.budget ? `${projectReport.project.budget.toLocaleString()} BDT` : "Not Defined"}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted border border-border">
                      <div className="text-xs text-muted-foreground">Total Site Expense Logged</div>
                      <div className="text-xl font-bold mt-1 text-rose-500">
                        {((Object.values(projectReport.categoryTotals || {}) as number[]) || []).reduce((a: number, b: number) => a + b, 0).toLocaleString()} BDT
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted border border-border">
                      <div className="text-xs text-muted-foreground">Profit margin estimation</div>
                      <div className="text-xl font-bold mt-1 text-emerald-500">
                        {projectReport.project?.budget
                          ? `${(projectReport.project.budget - ((Object.values(projectReport.categoryTotals || {}) as number[]) || []).reduce((a: number, b: number) => a + b, 0)).toLocaleString()} BDT`
                          : "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-md font-bold">Category-wise Spending Breakdown</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {Object.entries(projectReport.categoryTotals || {}).map(([cat, val]: any) => (
                        <div key={cat} className="p-3 border border-border rounded-lg bg-card flex flex-col justify-between">
                          <span className="text-xs text-muted-foreground font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                          <span className="text-md font-bold mt-1">{val.toLocaleString()} BDT</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-md font-bold">Raw Logs for this Site</h3>
                    <div className="border border-border rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground font-bold">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Particulars</th>
                            <th className="p-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {projectReport.transactions?.map((tx: any) => (
                            <tr key={tx.id} className="hover:bg-muted/10">
                              <td className="p-3 text-xs">
                                {new Date(tx.date).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-xs">{CATEGORY_LABELS[tx.category] || tx.category}</td>
                              <td className="p-3">{tx.particular}</td>
                              <td className="p-3 text-right font-bold text-rose-500">
                                {tx.amount.toLocaleString()} BDT
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">Select a project above to inspect its material cost sheets.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MONTHLY OVERHEAD & SALARY */}
        <TabsContent value="overhead" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Monthly Office Overheads & Site Summaries</CardTitle>
                <CardDescription>Rent, salary payments, electricity bills and total cost metrics.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Select Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-card text-foreground border border-border p-2 rounded-md"
                />
              </div>
            </CardHeader>
            <CardContent>
              {monthlyReport ? (
                <div className="space-y-8">
                  {/* Totals Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 border border-border rounded-lg">
                      <div className="text-xs text-muted-foreground">Total Income this Month</div>
                      <div className="text-2xl font-bold mt-1 text-emerald-500">
                        {monthlyReport.totals.inflow.toLocaleString()} BDT
                      </div>
                    </div>
                    <div className="p-4 border border-border rounded-lg">
                      <div className="text-xs text-muted-foreground">Total Office Overhead Expenses</div>
                      <div className="text-2xl font-bold mt-1 text-rose-500">
                        {monthlyReport.totals.overhead.toLocaleString()} BDT
                      </div>
                    </div>
                    <div className="p-4 border border-border rounded-lg">
                      <div className="text-xs text-muted-foreground">Total Site Construction Expenses</div>
                      <div className="text-2xl font-bold mt-1 text-orange-500">
                        {monthlyReport.totals.projectExpenses.toLocaleString()} BDT
                      </div>
                    </div>
                    <div className="p-4 border border-border rounded-lg bg-muted">
                      <div className="text-xs text-muted-foreground">Net Monthly Balance</div>
                      <div className={`text-2xl font-bold mt-1 ${monthlyReport.totals.net >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {monthlyReport.totals.net.toLocaleString()} BDT
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Office Expenses Detail */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold">Office Overheads Detail</h3>
                      <div className="border border-border rounded-lg divide-y divide-border">
                        {Object.entries(monthlyReport.overheadBreakdown || {}).length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground text-sm">No overheads logged this month.</div>
                        ) : (
                          Object.entries(monthlyReport.overheadBreakdown || {}).map(([cat, amount]: any) => (
                            <div key={cat} className="p-3 flex justify-between items-center text-sm">
                              <span className="font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                              <span className="font-bold">{amount.toLocaleString()} BDT</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Site Expenses Detail */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold">Active Sites Construction Spending</h3>
                      <div className="border border-border rounded-lg divide-y divide-border">
                        {monthlyReport.siteExpensesBreakdown?.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground text-sm">No project expenditures logged this month.</div>
                        ) : (
                          monthlyReport.siteExpensesBreakdown?.map((site: any) => (
                            <div key={site.name} className="p-3 flex justify-between items-center text-sm">
                              <span className="font-medium">{site.name}</span>
                              <span className="font-bold text-rose-500">{site.amount.toLocaleString()} BDT</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Processing report...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
