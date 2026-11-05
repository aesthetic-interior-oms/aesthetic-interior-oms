'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Wallet,
  Coins,
  Receipt,
  RefreshCw,
  Eye,
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

type WalletUser = {
  id: string
  fullName: string
  email: string
  phone: string
}

type WalletRow = {
  id: string
  userId: string
  advanceBalance: number
  pendingReimbursement: number
  totalSpent: number
  user: WalletUser
}

type FinanceAccount = {
  id: string
  name: string
}

type TransactionItem = {
  id: string
  walletId: string
  type: string
  status: string
  date: string
  amount: number
  charge: number
  totalAmount: number
  paymentMethod: string
  paidFrom: string
  category: string
  particular: string
  voucherNo: string | null
  receiptUrl: string | null
  lead?: { id: string; name: string } | null
  submittedBy?: { id: string; fullName: string } | null
  reviewedBy?: { id: string; fullName: string } | null
  financeAccount?: { id: string; name: string } | null
  rejectionReason?: string | null
  accountsNote?: string | null
}

function fmt(n: number) {
  return Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })
}

export default function AccountsProcurementWalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([])
  const [procurementUsers, setProcurementUsers] = useState<WalletUser[]>([])
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccount[]>([])
  const [metrics, setMetrics] = useState({
    totalAdvanceHeld: 0,
    totalPendingReimbursement: 0,
    totalSpentAcrossTeam: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Selected User Ledger Modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userTransactions, setUserTransactions] = useState<TransactionItem[]>([])
  const [loadingUserLedger, setLoadingUserLedger] = useState(false)
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false)

  // Disbursement Modal
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [disburseUserId, setDisburseUserId] = useState('')
  const [disburseAccountId, setDisburseAccountId] = useState('')
  const [disburseAmount, setDisburseAmount] = useState('')
  const [disburseCharge, setDisburseCharge] = useState('')
  const [disburseMethod, setDisburseMethod] = useState('BKASH')
  const [disburseParticular, setDisburseParticular] = useState('')
  const [submittingDisburse, setSubmittingDisburse] = useState(false)

  // Reimbursement Modal
  const [reimburseOpen, setReimburseOpen] = useState(false)
  const [reimburseUserId, setReimburseUserId] = useState('')
  const [reimburseAccountId, setReimburseAccountId] = useState('')
  const [reimburseAmount, setReimburseAmount] = useState('')
  const [reimburseCharge, setReimburseCharge] = useState('')
  const [reimburseMethod, setReimburseMethod] = useState('BKASH')
  const [reimburseParticular, setReimburseParticular] = useState('')
  const [reimburseTxId, setReimburseTxId] = useState<string | undefined>(undefined)
  const [submittingReimburse, setSubmittingReimburse] = useState(false)

  // Return Float Modal
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnUserId, setReturnUserId] = useState('')
  const [returnAccountId, setReturnAccountId] = useState('')
  const [returnAmount, setReturnAmount] = useState('')
  const [returnMethod, setReturnMethod] = useState('CASH')
  const [returnParticular, setReturnParticular] = useState('')
  const [submittingReturn, setSubmittingReturn] = useState(false)

  // Receipt Preview
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null)

  const fetchAccountsData = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/procurement/wallet?mode=all')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load procurement wallets')
      setWallets(json.data.wallets || [])
      setProcurementUsers(json.data.procurementUsers || [])
      setFinanceAccounts(json.data.financeAccounts || [])
      setMetrics(
        json.data.metrics || {
          totalAdvanceHeld: 0,
          totalPendingReimbursement: 0,
          totalSpentAcrossTeam: 0,
        },
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error loading accounts data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAccountsData()
  }, [fetchAccountsData])

  // Open user ledger
  const openUserLedger = async (userId: string) => {
    setSelectedUserId(userId)
    setLedgerModalOpen(true)
    setLoadingUserLedger(true)
    try {
      const res = await fetch(`/api/procurement/wallet?userId=${userId}`)
      const json = await res.json()
      if (json.success) {
        setUserTransactions(json.data.transactions || [])
      }
    } catch {
      toast.error('Failed to load user ledger')
    } finally {
      setLoadingUserLedger(false)
    }
  }

  // Handle Disburse Float submit
  const handleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(disburseAmount) || 0
    const chg = parseFloat(disburseCharge) || 0
    if (amt <= 0) return toast.error('Enter a valid amount')
    if (!disburseUserId) return toast.error('Select a procurement user')
    if (!disburseAccountId) return toast.error('Select a source finance account')

    setSubmittingDisburse(true)
    try {
      const res = await fetch('/api/procurement/wallet/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: disburseUserId,
          financeAccountId: disburseAccountId,
          amount: amt,
          charge: chg,
          paymentMethod: disburseMethod,
          particular: disburseParticular,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Disbursement failed')
      toast.success(json.message || 'Advance disbursed successfully!')
      setDisburseOpen(false)
      setDisburseAmount('')
      setDisburseCharge('')
      setDisburseParticular('')
      fetchAccountsData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Disbursement failed')
    } finally {
      setSubmittingDisburse(false)
    }
  }

  // Handle Reimbursement submit
  const handleReimburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(reimburseAmount) || 0
    const chg = parseFloat(reimburseCharge) || 0
    if (amt <= 0) return toast.error('Enter a valid reimbursement amount')
    if (!reimburseUserId) return toast.error('Select a procurement user')
    if (!reimburseAccountId) return toast.error('Select a finance account')

    setSubmittingReimburse(true)
    try {
      const res = await fetch('/api/procurement/wallet/reimburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: reimburseUserId,
          transactionId: reimburseTxId,
          financeAccountId: reimburseAccountId,
          amount: amt,
          charge: chg,
          paymentMethod: reimburseMethod,
          particular: reimburseParticular,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Reimbursement failed')
      toast.success(json.message || 'Reimbursement paid successfully!')
      setReimburseOpen(false)
      setReimburseAmount('')
      setReimburseCharge('')
      setReimburseParticular('')
      setReimburseTxId(undefined)
      fetchAccountsData()
      if (selectedUserId) openUserLedger(selectedUserId)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reimbursement failed')
    } finally {
      setSubmittingReimburse(false)
    }
  }

  // Handle Float Return submit
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(returnAmount) || 0
    if (amt <= 0) return toast.error('Enter a valid return amount')
    if (!returnUserId) return toast.error('Select a procurement user')
    if (!returnAccountId) return toast.error('Select a destination finance account')

    setSubmittingReturn(true)
    try {
      const res = await fetch('/api/procurement/wallet/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: returnUserId,
          financeAccountId: returnAccountId,
          amount: amt,
          paymentMethod: returnMethod,
          particular: returnParticular,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Return failed')
      toast.success(json.message || 'Advance float returned successfully!')
      setReturnOpen(false)
      setReturnAmount('')
      setReturnParticular('')
      fetchAccountsData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Return failed')
    } finally {
      setSubmittingReturn(false)
    }
  }

  // Handle Review (Approve/Reject)
  const handleReviewAction = async (
    transactionId: string,
    decision: 'APPROVED' | 'REJECTED',
  ) => {
    try {
      const res = await fetch('/api/procurement/wallet/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, decision }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Action failed')
      toast.success(`Transaction ${decision.toLowerCase()} successfully`)
      fetchAccountsData()
      if (selectedUserId) openUserLedger(selectedUserId)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed')
    }
  }

  // Combined users list (wallets + eligible users)
  const allUsersMap = new Map<string, { id: string; fullName: string }>()
  wallets.forEach((w) => allUsersMap.set(w.user.id, { id: w.user.id, fullName: w.user.fullName }))
  procurementUsers.forEach((u) => allUsersMap.set(u.id, { id: u.id, fullName: u.fullName }))
  const selectableUsers = Array.from(allUsersMap.values())

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/crm/accounts/dashboard" className="hover:text-foreground">
              Accounts
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Procurement Wallets Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="w-7 h-7 text-indigo-600 shrink-0" />
            Procurement Team Wallets
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage field buyer float advances, verify vouchers, and settle out-of-pocket reimbursements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccountsData}
            disabled={refreshing}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setDisburseUserId(selectableUsers[0]?.id || '')
              setDisburseAccountId(financeAccounts[0]?.id || '')
              setDisburseOpen(true)
            }}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ArrowUpRight className="w-4 h-4" />
            Disburse Advance Float
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setReimburseUserId(selectableUsers[0]?.id || '')
              setReimburseAccountId(financeAccounts[0]?.id || '')
              setReimburseOpen(true)
            }}
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <HandCoins className="w-4 h-4" />
            Reimburse Personal Pocket
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Float in Hands of Team */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Float Advances Held
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-emerald-600">
              ৳{fmt(metrics.totalAdvanceHeld)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Company cash currently distributed across procurement buyers
            </p>
          </CardContent>
        </Card>

        {/* Total Pending Reimbursement (Liability) */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pending Reimbursements Due
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
                <Coins className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-amber-600">
              ৳{fmt(metrics.totalPendingReimbursement)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Company liability to pay back to staff out-of-pocket spends
            </p>
          </CardContent>
        </Card>

        {/* Total Spend */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Team Spend
              </span>
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              ৳{fmt(metrics.totalSpentAcrossTeam)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Total reconciled procurement expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Wallets Table ── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Procurement Staff Wallet Balances
          </CardTitle>
          <CardDescription className="text-xs">
            Live overview of every buyer&apos;s company advance float and pending out-of-pocket claims
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center p-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading wallets...
            </div>
          ) : wallets.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Wallet className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold">No procurement wallets active yet</h3>
              <p className="text-xs text-muted-foreground">
                Disburse an advance float above to initialize a buyer&apos;s wallet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Buyer Name</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3 text-right">Advance Float (Asset)</th>
                    <th className="p-3 text-right">Due to Buyer (Liability)</th>
                    <th className="p-3 text-right">Total Spent</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {wallets.map((w) => (
                    <tr key={w.id} className="hover:bg-muted/30 transition">
                      {/* Name */}
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                        {w.user.fullName}
                      </td>

                      {/* Contact */}
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {w.user.phone || w.user.email}
                      </td>

                      {/* Advance Float */}
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                        ৳{fmt(w.advanceBalance)}
                      </td>

                      {/* Due to Buyer */}
                      <td className="p-3 text-right font-mono font-bold text-amber-600 whitespace-nowrap">
                        ৳{fmt(w.pendingReimbursement)}
                      </td>

                      {/* Total Spent */}
                      <td className="p-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                        ৳{fmt(w.totalSpent)}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => openUserLedger(w.userId)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ledger
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1 text-emerald-700 dark:text-emerald-300"
                            onClick={() => {
                              setDisburseUserId(w.userId)
                              setDisburseAccountId(financeAccounts[0]?.id || '')
                              setDisburseOpen(true)
                            }}
                          >
                            + Float
                          </Button>

                          {w.pendingReimbursement > 0 && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 px-2 text-[11px] gap-1 text-amber-700 dark:text-amber-300"
                              onClick={() => {
                                setReimburseUserId(w.userId)
                                setReimburseAccountId(financeAccounts[0]?.id || '')
                                setReimburseAmount(String(w.pendingReimbursement))
                                setReimburseOpen(true)
                              }}
                            >
                              Reimburse
                            </Button>
                          )}

                          {w.advanceBalance > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] gap-1 text-muted-foreground"
                              onClick={() => {
                                setReturnUserId(w.userId)
                                setReturnAccountId(financeAccounts[0]?.id || '')
                                setReturnAmount(String(w.advanceBalance))
                                setReturnOpen(true)
                              }}
                            >
                              Return Float
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Disburse Float Dialog ── */}
      <Dialog open={disburseOpen} onOpenChange={setDisburseOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              Disburse Advance Float to Buyer
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Transfers company money from a Finance Account to the buyer&apos;s wallet. Enter amount and transaction charge together.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDisburseSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Procurement User</Label>
              <Select value={disburseUserId} onValueChange={setDisburseUserId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {selectableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Source Company Finance Account</Label>
              <Select value={disburseAccountId} onValueChange={setDisburseAccountId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select account (Cash / Bank)" />
                </SelectTrigger>
                <SelectContent>
                  {financeAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount + Charge Together */}
            <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Disburse Amount (৳) *</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 10000"
                    value={disburseAmount}
                    onChange={(e) => setDisburseAmount(e.target.value)}
                    required
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Cash-out / Transfer Fee (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 185"
                    value={disburseCharge}
                    onChange={(e) => setDisburseCharge(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-border/50">
                <span className="text-muted-foreground">Total Accounts Outflow:</span>
                <span className="font-mono font-bold text-foreground">
                  ৳{fmt((parseFloat(disburseAmount) || 0) + (parseFloat(disburseCharge) || 0))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Payment Method</Label>
                <Select value={disburseMethod} onValueChange={setDisburseMethod}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BKASH" className="text-xs">bKash</SelectItem>
                    <SelectItem value="NAGAD" className="text-xs">Nagad</SelectItem>
                    <SelectItem value="CASH" className="text-xs">Cash in Hand</SelectItem>
                    <SelectItem value="BANK_TRANSFER" className="text-xs">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Note / Memo</Label>
                <Input
                  placeholder="e.g. Weekly field petty cash"
                  value={disburseParticular}
                  onChange={(e) => setDisburseParticular(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDisburseOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingDisburse}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submittingDisburse ? 'Disbursing...' : 'Disburse Advance'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Reimbursement Dialog ── */}
      <Dialog open={reimburseOpen} onOpenChange={setReimburseOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-amber-600" />
              Reimburse Employee Out-of-Pocket Expense
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pays back personal money spent by the buyer. Creates an OUTFLOW transaction in Accounts and clears pending claims.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReimburseSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Procurement User</Label>
              <Select value={reimburseUserId} onValueChange={setReimburseUserId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {selectableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Pay From Finance Account</Label>
              <Select value={reimburseAccountId} onValueChange={setReimburseAccountId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {financeAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Reimbursement Amount (৳) *</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 2500"
                    value={reimburseAmount}
                    onChange={(e) => setReimburseAmount(e.target.value)}
                    required
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Payment Fee / Charge (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 45"
                    value={reimburseCharge}
                    onChange={(e) => setReimburseCharge(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-border/50">
                <span className="text-muted-foreground">Total Accounts Outflow:</span>
                <span className="font-mono font-bold text-foreground">
                  ৳{fmt((parseFloat(reimburseAmount) || 0) + (parseFloat(reimburseCharge) || 0))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Payment Method</Label>
                <Select value={reimburseMethod} onValueChange={setReimburseMethod}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BKASH" className="text-xs">bKash</SelectItem>
                    <SelectItem value="NAGAD" className="text-xs">Nagad</SelectItem>
                    <SelectItem value="CASH" className="text-xs">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER" className="text-xs">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Memo</Label>
                <Input
                  placeholder="e.g. Site purchase reimbursement"
                  value={reimburseParticular}
                  onChange={(e) => setReimburseParticular(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setReimburseOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingReimburse}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {submittingReimburse ? 'Paying...' : 'Confirm Reimbursement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Return Float Dialog ── */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-indigo-600" />
              Receive Unspent Float Return
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Buyer returns leftover advance cash to Accounts. Records an INFLOW in Accounts and clears advance float balance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReturnSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Deposit Into Finance Account</Label>
              <Select value={returnAccountId} onValueChange={setReturnAccountId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {financeAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Returned Amount (৳) *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 3000"
                  value={returnAmount}
                  onChange={(e) => setReturnAmount(e.target.value)}
                  required
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Method</Label>
                <Select value={returnMethod} onValueChange={setReturnMethod}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH" className="text-xs">Cash in Hand</SelectItem>
                    <SelectItem value="BKASH" className="text-xs">bKash</SelectItem>
                    <SelectItem value="NAGAD" className="text-xs">Nagad</SelectItem>
                    <SelectItem value="BANK_TRANSFER" className="text-xs">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Memo</Label>
              <Input
                placeholder="e.g. Return of unused site cash"
                value={returnParticular}
                onChange={(e) => setReturnParticular(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setReturnOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingReturn}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submittingReturn ? 'Saving...' : 'Record Return'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── User Ledger Modal ── */}
      <Dialog open={ledgerModalOpen} onOpenChange={setLedgerModalOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-600" />
              Procurement User Ledger & Claims Review
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review individual expense submissions, slips, and approve or settle claims.
            </DialogDescription>
          </DialogHeader>

          {loadingUserLedger ? (
            <div className="flex justify-center items-center p-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading ledger...
            </div>
          ) : userTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No transactions recorded for this user yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Type & Source</th>
                    <th className="p-2.5">Particulars / Project</th>
                    <th className="p-2.5 text-right">Payment</th>
                    <th className="p-2.5 text-right">Fee</th>
                    <th className="p-2.5 text-right font-bold">Total (৳)</th>
                    <th className="p-2.5 text-center">Slip</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {userTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/30">
                      <td className="p-2.5 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>

                      <td className="p-2.5 whitespace-nowrap">
                        {tx.type === 'DISBURSEMENT' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">
                            Disbursement
                          </Badge>
                        ) : tx.paidFrom === 'PERSONAL_POCKET' ? (
                          <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">
                            Personal Pocket
                          </Badge>
                        ) : (
                          <Badge className="bg-indigo-100 text-indigo-800 border-0 text-[10px]">
                            Advance Float
                          </Badge>
                        )}
                      </td>

                      <td className="p-2.5 max-w-[200px]">
                        <div className="font-medium text-foreground truncate">{tx.particular}</div>
                        <div className="text-[10px] text-muted-foreground flex gap-1 mt-0.5">
                          {tx.lead && <span className="text-primary font-medium">{tx.lead.name}</span>}
                          {tx.voucherNo && <span>· Memo: {tx.voucherNo}</span>}
                        </div>
                      </td>

                      <td className="p-2.5 text-right font-mono text-muted-foreground whitespace-nowrap">
                        ৳{fmt(tx.amount)}
                      </td>

                      <td className="p-2.5 text-right font-mono text-muted-foreground whitespace-nowrap">
                        {tx.charge > 0 ? `+৳${fmt(tx.charge)}` : '৳0'}
                      </td>

                      <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap">
                        ৳{fmt(tx.totalAmount)}
                      </td>

                      <td className="p-2.5 text-center whitespace-nowrap">
                        {tx.receiptUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[10px] text-indigo-600 gap-1"
                            onClick={() => setPreviewSlipUrl(tx.receiptUrl)}
                          >
                            <Eye className="w-3 h-3" />
                            Slip
                          </Button>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      <td className="p-2.5 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            tx.status === 'SETTLED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : tx.status === 'APPROVED'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : tx.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'text-amber-600 border-amber-300'
                          }`}
                        >
                          {tx.status}
                        </Badge>
                      </td>

                      <td className="p-2.5 text-center whitespace-nowrap">
                        {tx.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-1">
                            {tx.paidFrom === 'PERSONAL_POCKET' ? (
                              <Button
                                size="sm"
                                className="h-6 px-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white"
                                onClick={() => {
                                  setReimburseUserId(selectedUserId || '')
                                  setReimburseTxId(tx.id)
                                  setReimburseAccountId(financeAccounts[0]?.id || '')
                                  setReimburseAmount(String(tx.totalAmount))
                                  setReimburseParticular(`Reimburse Memo: ${tx.voucherNo || tx.particular}`)
                                  setReimburseOpen(true)
                                }}
                              >
                                Reimburse
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleReviewAction(tx.id, 'APPROVED')}
                              >
                                Approve
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[10px] text-rose-600 hover:bg-rose-50"
                              onClick={() => handleReviewAction(tx.id, 'REJECTED')}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Reconciled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Receipt Slip Preview Dialog ── */}
      <Dialog open={Boolean(previewSlipUrl)} onOpenChange={(open) => !open && setPreviewSlipUrl(null)}>
        <DialogContent className="sm:max-w-[650px] p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Challan / Voucher Slip</span>
              {previewSlipUrl && (
                <a
                  href={previewSlipUrl}
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
            {previewSlipUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewSlipUrl}
                alt="Receipt Slip"
                className="max-h-[68vh] w-auto object-contain mx-auto"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
