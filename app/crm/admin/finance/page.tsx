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
} from "lucide-react"

// Category display mapping
const CATEGORY_LABELS: Record<string, string> = {
  OFFICE_RENT: "Office Rent",
  SALARY: "Staff Salary",
  SALARY_ADVANCE: "Salary Advance",
  BONUS: "Bonus",
  ELECTRICITY_BILL: "Electricity Bill",
  WATER_BILL: "Water Bill",
  INTERNET_BILL: "Internet Bill",
  FOOD_ALLOWANCE: "Food Allowance",
  CLIENT_ENTERTAINMENT: "Client Food & Entertainment",
  PROMOTION: "Marketing & Promotion",
  MOBILE_RECHARGE: "Mobile Recharge",
  OCTANE_FUEL: "Octane & Fuel",
  DONATION: "Donation",
  BOARD_MATERIAL: "Board Material (Site/Factory)",
  PASTING_BILL: "Pasting Bill",
  FARING: "Faring",
  HPL: "HPL",
  LINER: "Liner",
  LUBER: "Luber",
  ACRYLIC: "Acrylic",
  HARDWARE: "Hardware",
  ELECTRIC_ITEM: "Electric Items",
  LIGHTING: "Lighting",
  GLASS: "Glass",
  TRANSPORT_COST: "Transport & Labor Cost",
  SITE_EXPENSE: "Site Expense",
  FACTORY_PAYMENT: "Factory Payment",
  CARPENTER_PAYMENT: "Carpenter Payment",
  PAINT_MATERIALS: "Paint Materials",
  PAINT_PAYMENT: "Paint Payment",
  CEILING_PAYMENT: "Ceiling Payment",
  DOOR: "Door Purchase",
  PLUMBER_PAYMENT: "Plumber Payment",
  TILES_PURCHASE: "Tiles Purchase",
  FOLDING_DOOR: "Folding Door",
  GLASS_PROFILE: "Glass Profile",
  CIVIL_WORK: "Civil Work",
  OTHERS: "Other Expenses",
}

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
  const [type, setType] = useState<string>("OUTFLOW")
  const [category, setCategory] = useState<string>("OFFICE_RENT")
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
  }, [])

  useEffect(() => {
    loadMonthlyReport(selectedMonth)
  }, [selectedMonth])

  useEffect(() => {
    if (selectedProject) {
      loadProjectReport(selectedProject)
    }
  }, [selectedProject])

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
                  onClick={() => setType("OUTFLOW")}
                  className="w-full"
                >
                  <TrendingDown className="w-4 h-4 mr-2" /> Outflow (Expense)
                </Button>
                <Button
                  type="button"
                  variant={type === "INFLOW" ? "default" : "outline"}
                  onClick={() => setType("INFLOW")}
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
                <label className="text-xs font-semibold">Expense/Income Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
