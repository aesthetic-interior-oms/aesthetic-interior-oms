'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Wallet,
  PlusCircle,
  Receipt,
  Building2,
  RefreshCw,
  Coins,
  CreditCard,
  Eye,
  Upload,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

type WalletData = {
  id: string
  userId: string
  advanceBalance: number
  pendingReimbursement: number
  totalSpent: number
  user: {
    id: string
    fullName: string
    email: string
    phone: string
  }
}

type WalletTransaction = {
  id: string
  walletId: string
  type: 'DISBURSEMENT' | 'EXPENSE' | 'REIMBURSEMENT' | 'RETURN_TO_ACCOUNTS'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SETTLED'
  date: string
  amount: number
  charge: number
  totalAmount: number
  paymentMethod: string
  paidFrom: 'COMPANY_ADVANCE' | 'PERSONAL_POCKET'
  category: string
  particular: string
  voucherNo: string | null
  receiptUrl: string | null
  leadId: string | null
  lead?: { id: string; name: string; location: string | null } | null
  materialRequisition?: { id: string; requisitionNo: string } | null
  financeAccount?: { id: string; name: string } | null
  rejectionReason?: string | null
  accountsNote?: string | null
}

type Project = {
  id: string
  name: string
  location: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  RAW_MATERIALS: 'Raw Materials (Wood, Board, etc.)',
  HARDWARE: 'Hardware & Fittings',
  TRANSPORT_LABOR: 'Transport & Labor (Coolie/Van)',
  EMERGENCY_PURCHASE: 'Emergency Site Purchase',
  SITE_EXPENSE: 'Site Tools & Consumables',
  VENDOR_PAYMENT: 'Vendor Partial Advance',
  OTHER: 'Other General Expense',
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash in Hand' },
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'ROCKET', label: 'Rocket' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'PERSONAL_POCKET', label: 'Personal Pocket Cash' },
]

function fmt(n: number) {
  return Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })
}

export default function ProcurementFinancePage() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [activeProjects, setActiveProjects] = useState<Project[]>([])
  const [isAccountsOrAdmin, setIsAccountsOrAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Expense Dialog
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount] = useState('')
  const [charge, setCharge] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('BKASH')
  const [paidFrom, setPaidFrom] = useState<'COMPANY_ADVANCE' | 'PERSONAL_POCKET'>('COMPANY_ADVANCE')
  const [category, setCategory] = useState('RAW_MATERIALS')
  const [leadId, setLeadId] = useState('')
  const [particular, setParticular] = useState('')
  const [voucherNo, setVoucherNo] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  // Receipt Preview Dialog
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null)

  const numAmount = parseFloat(amount) || 0
  const numCharge = parseFloat(charge) || 0
  const totalEntered = numAmount + numCharge

  const fetchWalletData = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/procurement/wallet')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load wallet data')
      setWallet(json.data.wallet)
      setTransactions(json.data.transactions || [])
      setActiveProjects(json.data.activeProjects || [])
      setIsAccountsOrAdmin(Boolean(json.data.isAccountsOrAdmin))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error loading wallet data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchWalletData()
  }, [fetchWalletData])

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingReceipt(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('context', 'procurement-receipt')

      const res = await fetch('/api/gcs/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.fileUrl) {
        setReceiptUrl(json.fileUrl)
        toast.success('Receipt memo uploaded successfully!')
      } else {
        toast.error('Upload succeeded but no URL returned')
      }
    } catch {
      toast.error('Failed to upload receipt slip')
    } finally {
      setUploadingReceipt(false)
    }
  }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (numAmount <= 0) {
      toast.error('Please enter a valid expense amount')
      return
    }
    if (!particular.trim()) {
      toast.error('Please provide a description or particular')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/procurement/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          charge: numCharge,
          paymentMethod,
          paidFrom,
          category,
          particular: particular.trim(),
          voucherNo: voucherNo.trim() || undefined,
          receiptUrl: receiptUrl.trim() || undefined,
          leadId: leadId || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to record expense')

      toast.success(
        paidFrom === 'COMPANY_ADVANCE'
          ? `Expense of ৳${fmt(totalEntered)} deducted from advance float`
          : `Expense of ৳${fmt(totalEntered)} logged for reimbursement`,
      )

      setExpenseDialogOpen(false)
      // Reset form
      setAmount('')
      setCharge('')
      setParticular('')
      setVoucherNo('')
      setReceiptUrl('')
      setLeadId('')
      fetchWalletData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record expense')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter === 'EXPENSE_ADVANCE' && !(tx.type === 'EXPENSE' && tx.paidFrom === 'COMPANY_ADVANCE')) return false
    if (typeFilter === 'EXPENSE_PERSONAL' && !(tx.type === 'EXPENSE' && tx.paidFrom === 'PERSONAL_POCKET')) return false
    if (typeFilter === 'DISBURSEMENT' && tx.type !== 'DISBURSEMENT') return false
    if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false
    return true
  })

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/procurement/dashboard" className="hover:text-foreground">
              Procurement
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Finance & Wallet</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="w-7 h-7 text-indigo-600 shrink-0" />
            Procurement Wallet
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage company cash advances, personal out-of-pocket expenses, and settlement with Accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWalletData}
            disabled={refreshing}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {isAccountsOrAdmin && (
            <Button asChild size="sm" variant="secondary" className="text-xs gap-1.5">
              <Link href="/crm/accounts/procurement-wallets">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Accounts Hub
              </Link>
            </Button>
          )}

          <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                <PlusCircle className="w-4 h-4" />
                Record Spend / Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                  Record Procurement Expense
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Enter payment amount and transaction charge together. Tag the project and voucher slip.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleExpenseSubmit} className="space-y-4 pt-2">
                {/* 1. Paid From (Advance vs Personal) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Whose Money Was Spent?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaidFrom('COMPANY_ADVANCE')}
                      className={`p-3 rounded-lg border text-left transition ${
                        paidFrom === 'COMPANY_ADVANCE'
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                          : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                        Company Advance
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Deducts from company cash in your hand
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaidFrom('PERSONAL_POCKET')}
                      className={`p-3 rounded-lg border text-left transition ${
                        paidFrom === 'PERSONAL_POCKET'
                          ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
                          : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        My Personal Money
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Claim reimbursement from Accounts
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Amount + Charge (Entered Together!) */}
                <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Payment & Charge (Combined)</span>
                    <Badge variant="outline" className="text-[10px]">
                      Payment + Fee
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Payment Amount (৳) *</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 5000"
                        min="1"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Charge / Fee (৳)
                        <span className="text-[10px] text-muted-foreground ml-1">(bKash/cash-out)</span>
                      </Label>
                      <Input
                        type="number"
                        placeholder="e.g. 95"
                        min="0"
                        step="any"
                        value={charge}
                        onChange={(e) => setCharge(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <span className="text-muted-foreground">Total Outflow / Claim:</span>
                    <span className="font-mono font-bold text-base text-foreground">
                      ৳{fmt(totalEntered)}
                    </span>
                  </div>
                </div>

                {/* 3. Payment Method & Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Expense Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 4. Project Tagging */}
                <div className="space-y-1">
                  <Label className="text-xs">Tag Client Project / Site (Optional)</Label>
                  <Select value={leadId} onValueChange={setLeadId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="General / No specific project" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="GENERAL_EXPENSE" className="text-xs">
                        None / General Warehouse & Office
                      </SelectItem>
                      {activeProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.name} {p.location ? `(${p.location})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 5. Description / Particular */}
                <div className="space-y-1">
                  <Label className="text-xs">Particular / Description *</Label>
                  <Textarea
                    placeholder="e.g. 5 boxes 2-inch stainless steel screws and board edge-banding for Master Bedroom"
                    value={particular}
                    onChange={(e) => setParticular(e.target.value)}
                    rows={2}
                    required
                    className="text-xs"
                  />
                </div>

                {/* 6. Memo / Voucher No & Receipt Upload */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Challan / Memo No.</Label>
                    <Input
                      placeholder="e.g. INV-8921"
                      value={voucherNo}
                      onChange={(e) => setVoucherNo(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Receipt / Memo Slip</Label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-md cursor-pointer text-xs hover:bg-muted/40 w-full truncate border-dashed">
                        {uploadingReceipt ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="truncate">
                          {receiptUrl ? 'Slip Uploaded ✓' : 'Upload photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={handleReceiptUpload}
                          disabled={uploadingReceipt}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setExpenseDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting || uploadingReceipt}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Expense'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Advance Balance Held */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Company Advance in Hand
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-emerald-600">
              ৳{fmt(wallet?.advanceBalance || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Current petty cash float held by you
            </p>
          </CardContent>
        </Card>

        {/* Due to Employee (Pending Reimbursement) */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Due to Me (Out-of-Pocket)
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
                <Coins className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-amber-600">
              ৳{fmt(wallet?.pendingReimbursement || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Personal money spent awaiting Accounts payout
            </p>
          </CardContent>
        </Card>

        {/* Lifetime Spend */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Lifetime Spend
              </span>
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              ৳{fmt(wallet?.totalSpent || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Across all projects and site purchases
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Transaction Ledger Section ── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                Wallet Transactions & Expense Ledger
              </CardTitle>
              <CardDescription className="text-xs">
                All disbursements, expenses, and reimbursement logs with payment + charge breakdown
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-auto">
                <TabsList className="h-8 text-xs">
                  <TabsTrigger value="ALL" className="text-xs h-7 px-2.5">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="EXPENSE_ADVANCE" className="text-xs h-7 px-2.5">
                    Advance Spends
                  </TabsTrigger>
                  <TabsTrigger value="EXPENSE_PERSONAL" className="text-xs h-7 px-2.5">
                    Personal Pocket
                  </TabsTrigger>
                  <TabsTrigger value="DISBURSEMENT" className="text-xs h-7 px-2.5">
                    Float Received
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Status</SelectItem>
                  <SelectItem value="PENDING" className="text-xs">Pending Review</SelectItem>
                  <SelectItem value="APPROVED" className="text-xs">Approved</SelectItem>
                  <SelectItem value="SETTLED" className="text-xs">Settled</SelectItem>
                  <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center p-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading wallet transactions...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Wallet className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">No transactions found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You haven&apos;t recorded any expenses or received any advances matching the current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type & Source</th>
                    <th className="p-3">Particulars / Project</th>
                    <th className="p-3">Method</th>
                    <th className="p-3 text-right">Base Amount</th>
                    <th className="p-3 text-right">Charge</th>
                    <th className="p-3 text-right font-bold">Total (৳)</th>
                    <th className="p-3 text-center">Receipt</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTransactions.map((tx) => {
                    const isDisbursement = tx.type === 'DISBURSEMENT'
                    const isReimbursement = tx.type === 'REIMBURSEMENT'
                    const isReturn = tx.type === 'RETURN_TO_ACCOUNTS'
                    const isPersonal = tx.paidFrom === 'PERSONAL_POCKET'

                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition">
                        {/* Date */}
                        <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Type & Source */}
                        <td className="p-3 whitespace-nowrap">
                          {isDisbursement ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]">
                              Float Advance
                            </Badge>
                          ) : isReimbursement ? (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-0 text-[10px]">
                              Reimbursed
                            </Badge>
                          ) : isReturn ? (
                            <Badge variant="outline" className="text-[10px]">
                              Float Return
                            </Badge>
                          ) : isPersonal ? (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px]">
                              Personal Pocket
                            </Badge>
                          ) : (
                            <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-0 text-[10px]">
                              Advance Spend
                            </Badge>
                          )}
                        </td>

                        {/* Particulars & Project */}
                        <td className="p-3 max-w-xs">
                          <div className="font-medium text-foreground line-clamp-1">{tx.particular}</div>
                          <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                            {tx.lead && (
                              <span className="font-semibold text-primary">
                                Project: {tx.lead.name}
                              </span>
                            )}
                            {tx.voucherNo && (
                              <span className="font-mono">Memo: {tx.voucherNo}</span>
                            )}
                            {tx.accountsNote && (
                              <span className="text-indigo-600 dark:text-indigo-400">
                                Note: {tx.accountsNote}
                              </span>
                            )}
                            {tx.rejectionReason && (
                              <span className="text-rose-600 font-medium">
                                Rejected: {tx.rejectionReason}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Payment Method */}
                        <td className="p-3 whitespace-nowrap font-medium text-muted-foreground">
                          {tx.paymentMethod}
                        </td>

                        {/* Base Amount */}
                        <td className="p-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                          ৳{fmt(tx.amount)}
                        </td>

                        {/* Charge */}
                        <td className="p-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {tx.charge > 0 ? (
                            <span className="text-amber-600">+৳{fmt(tx.charge)}</span>
                          ) : (
                            '৳0'
                          )}
                        </td>

                        {/* Total Amount */}
                        <td
                          className={`p-3 text-right font-mono font-bold whitespace-nowrap ${
                            isDisbursement
                              ? 'text-emerald-600'
                              : isReturn
                              ? 'text-rose-600'
                              : 'text-foreground'
                          }`}
                        >
                          {isDisbursement ? '+' : isReturn ? '-' : ''}৳{fmt(tx.totalAmount)}
                        </td>

                        {/* Receipt Slip */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {tx.receiptUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] gap-1 text-indigo-600"
                              onClick={() => setPreviewReceiptUrl(tx.receiptUrl)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Slip
                            </Button>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {tx.status === 'SETTLED' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]">
                              Settled
                            </Badge>
                          ) : tx.status === 'APPROVED' ? (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-0 text-[10px]">
                              Approved
                            </Badge>
                          ) : tx.status === 'REJECTED' ? (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-0 text-[10px]">
                              Rejected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                              Pending Review
                            </Badge>
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
      </Card>

      {/* ── Receipt Preview Dialog ── */}
      <Dialog
        open={Boolean(previewReceiptUrl)}
        onOpenChange={(open) => !open && setPreviewReceiptUrl(null)}
      >
        <DialogContent className="sm:max-w-[650px] p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Receipt / Voucher Slip Memo</span>
              {previewReceiptUrl && (
                <a
                  href={previewReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  Open Original <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg overflow-hidden border bg-muted/20 flex items-center justify-center min-h-[300px] max-h-[70vh]">
            {previewReceiptUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewReceiptUrl}
                alt="Receipt Voucher"
                className="max-h-[68vh] w-auto object-contain mx-auto"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
