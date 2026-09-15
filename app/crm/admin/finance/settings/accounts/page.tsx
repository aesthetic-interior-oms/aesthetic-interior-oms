"use client"

import React, { useEffect, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  PlusCircle,
  Trash2,
  ChevronLeft,
  Banknote,
  Landmark,
  Eye,
  Loader2,
  FileDown,
  Pencil,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react"

type FinanceAccount = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  balance: number
}

type Transaction = {
  id: string
  serialNo: number
  voucherNo: string | null
  date: string
  type: string
  category: string
  particular: string
  amount: number
  financeAccountId?: string
  leadId?: string | null
  lead?: { name: string } | null
  recordedBy?: { fullName: string } | null
}

const CATEGORY_LABELS: Record<string, string> = {
  OFFICE_RENT: "Office Rent", SALARY: "Staff Salary", SALARY_ADVANCE: "Salary Advance",
  BONUS: "Bonus", ELECTRICITY_BILL: "Electricity Bill", WATER_BILL: "Water Bill",
  INTERNET_BILL: "Internet Bill", FOOD_ALLOWANCE: "Food Allowance",
  CLIENT_ENTERTAINMENT: "Client Food & Entertainment", PROMOTION: "Marketing & Promotion",
  MOBILE_RECHARGE: "Mobile Recharge", OCTANE_FUEL: "Octane & Fuel", DONATION: "Donation",
  SITE_VISIT_PAYMENT: "Site Visit Fee", CLIENT_PAYMENT: "Client Payment",
  PROJECT_ADVANCE: "Project Advance", DESIGN_FEE: "Design Fee",
  CONSULTANCY_FEE: "Consultancy Fee", BANK_INTEREST: "Bank Interest",
  OTHER_INCOME: "Other Income", OTHERS: "Other Expenses",
  OPENING_BALANCE: "Opening Balance",
}

function getDefaultMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function AccountsSettingsPage() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [newAccountName, setNewAccountName] = useState("")
  const [openingBalance, setOpeningBalance] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)

  // Statement modal state
  const [selectedAccount, setSelectedAccount] = useState<FinanceAccount | null>(null)
  const [accountTxs, setAccountTxs] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth())

  // Edit Transaction state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [editParticular, setEditParticular] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editType, setEditType] = useState("INFLOW")
  const [editAccountId, setEditAccountId] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Fix Negative Balance modal state
  const [fixModalAccount, setFixModalAccount] = useState<FinanceAccount | null>(null)
  const [fixAmount, setFixAmount] = useState("")
  const [fixParticular, setFixParticular] = useState("")
  const [isFixing, setIsFixing] = useState(false)

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/finance/accounts')
      const data = await res.json()
      if (data.success) setAccounts(data.data)
    } catch {
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAccounts() }, [])

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newAccountName.trim()
    if (!trimmed) return toast.error('Account name is required')

    setIsCreating(true)
    try {
      const res = await fetch('/api/finance/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error)
        return
      }

      const newAccount: FinanceAccount = data.data

      const balanceAmount = parseFloat(openingBalance)
      if (balanceAmount > 0) {
        const txRes = await fetch('/api/finance/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'INFLOW',
            category: 'OPENING_BALANCE',
            particular: `Opening balance for ${trimmed}`,
            amount: balanceAmount,
            financeAccountId: newAccount.id,
            date: new Date().toISOString(),
          })
        })
        const txData = await txRes.json()
        if (!txData.success) {
          toast.warning('Account created but opening balance failed: ' + txData.error)
        } else {
          toast.success(`Account "${trimmed}" created with balance of ৳${balanceAmount.toLocaleString()}!`)
        }
      } else {
        toast.success('Account created!')
      }

      setNewAccountName("")
      setOpeningBalance("")
      fetchAccounts()
    } catch {
      toast.error('Failed to add account')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return
    try {
      const res = await fetch(`/api/finance/accounts/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        if (data.disabled) {
          toast.info(data.message || 'Account disabled to preserve transaction records.')
        } else {
          toast.success('Account deleted')
        }
        fetchAccounts()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Failed to delete account')
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/finance/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Account updated')
        fetchAccounts()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Failed to update account')
    }
  }

  const fetchModalTransactions = async (acc: FinanceAccount, month: string) => {
    setTxLoading(true)
    setAccountTxs([])
    try {
      const [year, m] = month.split('-')
      const startDate = new Date(parseInt(year), parseInt(m) - 1, 1).toISOString()
      const endDate = new Date(parseInt(year), parseInt(m), 0, 23, 59, 59, 999).toISOString()
      const url = `/api/finance/transactions?financeAccountId=${acc.id}&startDate=${startDate}&endDate=${endDate}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setAccountTxs(data.data)
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setTxLoading(false)
    }
  }

  const viewTransactions = async (acc: FinanceAccount) => {
    setSelectedAccount(acc)
    setModalOpen(true)
    fetchModalTransactions(acc, selectedMonth)
  }

  useEffect(() => {
    if (modalOpen && selectedAccount) {
      fetchModalTransactions(selectedAccount, selectedMonth)
    }
  }, [selectedMonth])

  // Delete individual transaction
  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return
    try {
      const res = await fetch(`/api/finance/transactions/${txId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Transaction deleted')
        if (selectedAccount) fetchModalTransactions(selectedAccount, selectedMonth)
        fetchAccounts()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Failed to delete transaction')
    }
  }

  // Start editing transaction
  const openEditTxModal = (tx: Transaction) => {
    setEditingTx(tx)
    setEditAmount(String(tx.amount))
    setEditParticular(tx.particular)
    setEditCategory(tx.category)
    setEditType(tx.type)
    setEditAccountId(tx.financeAccountId || selectedAccount?.id || "")
  }

  const handleSaveTransactionEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTx) return
    const numAmount = parseFloat(editAmount)
    if (isNaN(numAmount) || numAmount <= 0) return toast.error('Valid amount is required')

    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/finance/transactions/${editingTx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          particular: editParticular,
          category: editCategory,
          type: editType,
          financeAccountId: editAccountId,
        })
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error)
        return
      }
      toast.success('Transaction updated successfully!')
      setEditingTx(null)
      if (selectedAccount) fetchModalTransactions(selectedAccount, selectedMonth)
      fetchAccounts()
    } catch {
      toast.error('Failed to update transaction')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Handle Quick Fix Negative Balance
  const openFixBalanceModal = (acc: FinanceAccount) => {
    setFixModalAccount(acc)
    const neededAmount = Math.abs(acc.balance)
    setFixAmount(String(neededAmount))
    setFixParticular(`Opening balance / Deposit to reconcile ${acc.name}`)
  }

  const handleSaveFixBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fixModalAccount) return
    const numAmount = parseFloat(fixAmount)
    if (isNaN(numAmount) || numAmount <= 0) return toast.error('Valid amount is required')

    setIsFixing(true)
    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'INFLOW',
          category: 'OPENING_BALANCE',
          particular: fixParticular,
          amount: numAmount,
          financeAccountId: fixModalAccount.id,
          date: new Date().toISOString(),
        })
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error)
        return
      }
      toast.success(`Inflow of ৳${numAmount.toLocaleString()} added to ${fixModalAccount.name}!`)
      setFixModalAccount(null)
      fetchAccounts()
      if (selectedAccount?.id === fixModalAccount.id) {
        fetchModalTransactions(selectedAccount, selectedMonth)
      }
    } catch {
      toast.error('Failed to add inflow')
    } finally {
      setIsFixing(false)
    }
  }

  const totalInflow = accountTxs.filter(t => t.type === 'INFLOW').reduce((s, t) => s + t.amount, 0)
  const totalOutflow = accountTxs.filter(t => t.type === 'OUTFLOW').reduce((s, t) => s + t.amount, 0)
  const balance = totalInflow - totalOutflow

  const handleDownloadPDF = async () => {
    if (!selectedAccount) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape' })
    const pageW = doc.internal.pageSize.getWidth()
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const monthLabel = new Date(selectedMonth + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

    const logoImg = new Image()
    logoImg.src = "/Logo/HeaderLogo.png"
    await new Promise((resolve) => { logoImg.onload = resolve; logoImg.onerror = resolve })
    doc.addImage(logoImg, "PNG", 14, 8, 43.2, 8)

    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59)
    doc.text('ACCOUNT STATEMENT', pageW - 14, 13, { align: 'right' })
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139)
    doc.text(`${selectedAccount.name}  ·  ${monthLabel}  ·  Generated: ${today}`, pageW - 14, 19, { align: 'right' })

    doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4)
    doc.roundedRect(14, 22, pageW - 28, 8, 1.5, 1.5, 'FD')
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.setTextColor(5, 150, 105); doc.text(`INFLOW: ${totalInflow.toLocaleString()} BDT`, 20, 27.5)
    doc.setTextColor(220, 38, 38); doc.text(`OUTFLOW: ${totalOutflow.toLocaleString()} BDT`, 100, 27.5)
    const netColor: [number, number, number] = balance >= 0 ? [5, 150, 105] : [220, 38, 38]
    doc.setTextColor(...netColor); doc.text(`NET BALANCE: ${balance.toLocaleString()} BDT`, 200, 27.5)

    const bodyRows = accountTxs.map((tx) => {
      const isInflow = tx.type === 'INFLOW'
      return [
        { content: tx.voucherNo || '—' },
        { content: new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
        { content: tx.type, styles: { textColor: isInflow ? [5, 150, 105] : [220, 38, 38], fontStyle: 'bold' } },
        { content: CATEGORY_LABELS[tx.category] || tx.category },
        { content: tx.particular },
        { content: tx.lead?.name || 'Office / Overhead' },
        { content: tx.recordedBy?.fullName || '—' },
        {
          content: isInflow ? tx.amount.toLocaleString() : '—',
          styles: { halign: 'right', textColor: isInflow ? [5, 150, 105] : [100, 100, 100], fontStyle: isInflow ? 'bold' : 'normal' }
        },
        {
          content: !isInflow ? tx.amount.toLocaleString() : '—',
          styles: { halign: 'right', textColor: !isInflow ? [220, 38, 38] : [100, 100, 100], fontStyle: !isInflow ? 'bold' : 'normal' }
        },
      ]
    })

    autoTable(doc, {
      startY: 34,
      head: [['Voucher', 'Date', 'Type', 'Category', 'Particulars', 'Project', 'Recorder', 'Inflow', 'Outflow']],
      body: bodyRows as any[],
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, lineColor: [200, 200, 200], lineWidth: 0.1 },
      bodyStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 7.5, lineColor: [200, 200, 200], lineWidth: 0.1 },
      foot: [
        [
          { content: 'Total Inflow', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] } },
          { content: totalInflow.toLocaleString(), styles: { halign: 'right', textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: '—', styles: { halign: 'right' } },
        ],
        [
          { content: 'Total Outflow', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] } },
          { content: '—', styles: { halign: 'right' } },
          { content: totalOutflow.toLocaleString(), styles: { halign: 'right', textColor: [0, 0, 0], fontStyle: 'bold' } },
        ],
        [
          { content: 'Net Balance', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] } },
          { content: balance >= 0 ? balance.toLocaleString() : '—', styles: { halign: 'right', textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: balance < 0 ? Math.abs(balance).toLocaleString() : '—', styles: { halign: 'right', textColor: [0, 0, 0], fontStyle: 'bold' } },
        ],
      ],
      footStyles: { fillColor: [248, 250, 252], textColor: [0, 0, 0], fontSize: 8, lineColor: [200, 200, 200], lineWidth: 0.1 },
    })

    doc.save(`${selectedAccount.name.replace(/[^a-zA-Z0-9]/g, '-')}-${selectedMonth}-statement.pdf`)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Link href="/crm/admin/finance/settings" prefetch={false} className="hover:text-foreground flex items-center gap-1 transition">
            <ChevronLeft className="w-4 h-4" /> Back to Finance Settings
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Accounts</h1>
        <p className="text-muted-foreground">Create, manage balances, edit/delete transactions, and review account statements.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Form */}
        <Card className="md:col-span-1 h-fit border border-border">
          <CardHeader>
            <CardTitle>Add New Account</CardTitle>
            <CardDescription>Accounts appear in the transaction log as payment methods. An opening balance creates an initial INFLOW transaction.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold">Account Name</label>
                <Input
                  placeholder="e.g. Bkash, Dutch Bangla Bank, Petty Cash"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold">Opening Balance (BDT) <span className="text-muted-foreground font-normal">— optional</span></label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 50000"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Logged as an &quot;Opening Balance&quot; inflow transaction for this account.</p>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Accounts List */}
        <Card className="md:col-span-2 border border-border">
          <CardHeader>
            <CardTitle>Current Accounts</CardTitle>
            <CardDescription>Accounts must have sufficient positive balance before outflow expenses can be logged.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading accounts...
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-lg text-sm text-muted-foreground">
                No accounts found. Create one to get started.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {accounts.map((acc) => {
                  const isNegative = acc.balance < 0
                  return (
                    <div
                      key={acc.id}
                      className={`flex flex-col justify-between p-3.5 rounded-lg border bg-card transition gap-2 ${isNegative ? 'border-rose-300 bg-rose-50/20 dark:bg-rose-950/20' : ''} ${!acc.isActive ? 'opacity-60 grayscale' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded shrink-0 ${isNegative ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40' : 'bg-muted/60 text-muted-foreground'}`}>
                            {acc.name.toLowerCase().includes('bank') || acc.name.toLowerCase().includes('ebl') || acc.name.toLowerCase().includes('dutch') || acc.name.toLowerCase().includes('dbbl')
                              ? <Landmark className="w-4 h-4" />
                              : <Banknote className="w-4 h-4" />
                            }
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{acc.name}</span>
                            <span className={`text-xs font-extrabold tabular-nums ${isNegative ? 'text-rose-600 dark:text-rose-400 flex items-center gap-1' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {isNegative && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                              ৳{acc.balance.toLocaleString()}
                            </span>
                            {!acc.isActive && (
                              <Badge variant="destructive" className="text-[10px] w-fit py-0 px-1 h-4 mt-0.5">Disabled</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 gap-1 text-xs"
                            onClick={() => viewTransactions(acc)}
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 px-2 text-xs"
                            onClick={() => toggleStatus(acc.id, acc.isActive)}
                          >
                            {acc.isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 h-8 w-8"
                            onClick={() => handleDeleteAccount(acc.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Quick Fix Button for negative balance accounts */}
                      {isNegative && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 gap-1 mt-1"
                          onClick={() => openFixBalanceModal(acc)}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                          Fix Balance / Add Opening Balance (+৳{Math.abs(acc.balance).toLocaleString()})
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setSelectedAccount(null) }}>
        <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                {selectedAccount?.name.toLowerCase().includes('bank') ? <Landmark className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                {selectedAccount?.name} — Statement
              </DialogTitle>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-card text-foreground border border-border p-1.5 rounded-md h-9 text-sm"
                />
                <Button size="sm" variant="outline" className="gap-2 h-9" onClick={() => void handleDownloadPDF()}>
                  <FileDown className="w-4 h-4" /> Download PDF
                </Button>
              </div>
            </div>
          </DialogHeader>

          {txLoading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading...
            </div>
          ) : (
            <>
              {/* Balance summary */}
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Total Inflow</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">৳{totalInflow.toLocaleString()}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Total Outflow</div>
                  <div className="text-lg font-bold text-rose-500">৳{totalOutflow.toLocaleString()}</div>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="text-xs text-muted-foreground">Net Balance</div>
                  <div className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    ৳{balance.toLocaleString()}
                  </div>
                </div>
              </div>

              {accountTxs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No transactions found for this account in the selected month.</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border mt-3">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                      <tr>
                        <th className="p-3">Voucher</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 max-w-[180px]">Particulars</th>
                        <th className="p-3">Project</th>
                        <th className="p-3">Recorder</th>
                        <th className="p-3 text-right text-emerald-600 dark:text-emerald-400">Inflow</th>
                        <th className="p-3 text-right text-rose-500">Outflow</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {accountTxs.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/20">
                          <td className="p-3 font-mono text-xs">{tx.voucherNo || '—'}</td>
                          <td className="p-3 text-xs whitespace-nowrap text-muted-foreground">
                            {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={tx.type === 'INFLOW' ? 'default' : 'destructive'}
                              className={`text-[10px] ${tx.type === 'INFLOW' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : ''}`}
                            >
                              {tx.type}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs">{CATEGORY_LABELS[tx.category] || tx.category}</td>
                          <td className="p-3 text-sm max-w-[180px] truncate font-medium" title={tx.particular}>{tx.particular}</td>
                          <td className="p-3 text-xs text-muted-foreground">{tx.lead?.name || 'Office / Overhead'}</td>
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{tx.recordedBy?.fullName || '—'}</td>
                          <td className="p-3 text-right font-bold tabular-nums text-sm text-emerald-600 dark:text-emerald-400">
                            {tx.type === 'INFLOW' ? `৳${tx.amount.toLocaleString()}` : '—'}
                          </td>
                          <td className="p-3 text-right font-bold tabular-nums text-sm text-rose-500">
                            {tx.type === 'OUTFLOW' ? `৳${tx.amount.toLocaleString()}` : '—'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Edit Transaction"
                                onClick={() => openEditTxModal(tx)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                title="Delete Transaction"
                                onClick={() => handleDeleteTransaction(tx.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-border bg-muted/50">
                      <tr>
                        <td colSpan={7} className="p-3 text-right font-bold text-sm">Total Inflow</td>
                        <td className="p-3 text-right font-bold tabular-nums text-sm text-emerald-600 dark:text-emerald-400">৳{totalInflow.toLocaleString()}</td>
                        <td className="p-3 text-right text-muted-foreground" colSpan={2}>—</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td colSpan={7} className="p-3 text-right font-bold text-sm">Total Outflow</td>
                        <td className="p-3 text-right text-muted-foreground">—</td>
                        <td className="p-3 text-right font-bold tabular-nums text-sm text-rose-500">৳{totalOutflow.toLocaleString()}</td>
                        <td></td>
                      </tr>
                      <tr className="border-t border-border">
                        <td colSpan={7} className="p-3 text-right font-bold text-sm">Net Balance</td>
                        <td colSpan={2} className={`p-3 text-right font-bold tabular-nums text-sm ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          ৳{balance.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Modal */}
      <Dialog open={!!editingTx} onOpenChange={(open) => { if (!open) setEditingTx(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editingTx && (
            <form onSubmit={handleSaveTransactionEdit} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold">Transaction Type</label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFLOW">INFLOW (Money Received)</SelectItem>
                    <SelectItem value="OUTFLOW">OUTFLOW (Expense / Payment)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Amount (BDT)</label>
                <Input
                  type="number"
                  min={1}
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Particulars / Description</label>
                <Input
                  value={editParticular}
                  onChange={(e) => setEditParticular(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Account</label>
                <Select value={editAccountId} onValueChange={setEditAccountId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingTx(null)}>Cancel</Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Fix Negative Balance Modal */}
      <Dialog open={!!fixModalAccount} onOpenChange={(open) => { if (!open) setFixModalAccount(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              Fix Balance — {fixModalAccount?.name}
            </DialogTitle>
          </DialogHeader>
          {fixModalAccount && (
            <form onSubmit={handleSaveFixBalance} className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground">
                Account current balance is <strong className="text-rose-600">৳{fixModalAccount.balance.toLocaleString()}</strong>. Log an opening balance or deposit inflow to bring it to positive.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Inflow Amount (BDT)</label>
                <Input
                  type="number"
                  min={1}
                  value={fixAmount}
                  onChange={(e) => setFixAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Particulars</label>
                <Input
                  value={fixParticular}
                  onChange={(e) => setFixParticular(e.target.value)}
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setFixModalAccount(null)}>Cancel</Button>
                <Button type="submit" disabled={isFixing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isFixing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Add Inflow Deposit
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
