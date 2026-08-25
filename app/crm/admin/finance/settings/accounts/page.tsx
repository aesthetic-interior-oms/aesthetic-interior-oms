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
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  PlusCircle,
  Trash2,
  ChevronLeft,
  Banknote,
  Landmark,
  Eye,
  Loader2,
} from "lucide-react"

type FinanceAccount = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
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
}

export default function AccountsSettingsPage() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [newAccountName, setNewAccountName] = useState("")
  const [loading, setLoading] = useState(true)

  // Transactions modal state
  const [selectedAccount, setSelectedAccount] = useState<FinanceAccount | null>(null)
  const [accountTxs, setAccountTxs] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

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

    try {
      const res = await fetch('/api/finance/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Account created!')
        setNewAccountName("")
        fetchAccounts()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Failed to add account')
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/finance/accounts/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Account deleted')
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

  const viewTransactions = async (acc: FinanceAccount) => {
    setSelectedAccount(acc)
    setModalOpen(true)
    setTxLoading(true)
    setAccountTxs([])
    try {
      const res = await fetch(`/api/finance/transactions?financeAccountId=${acc.id}`)
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

  const totalInflow = accountTxs.filter(t => t.type === 'INFLOW').reduce((s, t) => s + t.amount, 0)
  const totalOutflow = accountTxs.filter(t => t.type === 'OUTFLOW').reduce((s, t) => s + t.amount, 0)
  const balance = totalInflow - totalOutflow

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Link href="/crm/admin/finance/settings" className="hover:text-foreground flex items-center gap-1 transition">
            <ChevronLeft className="w-4 h-4" /> Back to Finance Settings
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Accounts</h1>
        <p className="text-muted-foreground">Create, enable/disable accounts and review their transaction history.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Form */}
        <Card className="md:col-span-1 h-fit border border-border">
          <CardHeader>
            <CardTitle>Add New Account</CardTitle>
            <CardDescription>Accounts appear in the transaction log form as a payment method.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <Input
                placeholder="e.g. Bkash, Dutch Bangla Bank, Petty Cash"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                maxLength={50}
              />
              <Button type="submit" className="w-full gap-2">
                <PlusCircle className="w-4 h-4" /> Create Account
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Accounts List */}
        <Card className="md:col-span-2 border border-border">
          <CardHeader>
            <CardTitle>Current Accounts</CardTitle>
            <CardDescription>Click "View" to inspect all transactions linked to that account.</CardDescription>
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
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`flex items-center justify-between p-3 rounded-lg border bg-card transition ${!acc.isActive ? 'opacity-60 grayscale' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-muted/60 text-muted-foreground shrink-0">
                        {acc.name.toLowerCase().includes('bank') || acc.name.toLowerCase().includes('ebl') || acc.name.toLowerCase().includes('dutch') || acc.name.toLowerCase().includes('dbbl')
                          ? <Landmark className="w-4 h-4" />
                          : <Banknote className="w-4 h-4" />
                        }
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{acc.name}</span>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setSelectedAccount(null) }}>
        <DialogContent className="max-w-[95vw] md:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAccount?.name.toLowerCase().includes('bank') ? <Landmark className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
              Transactions — {selectedAccount?.name}
            </DialogTitle>
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
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalInflow.toLocaleString()} BDT</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Total Outflow</div>
                  <div className="text-lg font-bold text-rose-500">{totalOutflow.toLocaleString()} BDT</div>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="text-xs text-muted-foreground">Net Balance</div>
                  <div className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {balance.toLocaleString()} BDT
                  </div>
                </div>
              </div>

              {accountTxs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No transactions found for this account.</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border mt-3">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                      <tr>
                        <th className="p-3">Voucher</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 max-w-[200px]">Particulars</th>
                        <th className="p-3">Project</th>
                        <th className="p-3">Recorder</th>
                        <th className="p-3 text-right">Amount (BDT)</th>
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
                          <td className="p-3 text-sm max-w-[200px] truncate font-medium" title={tx.particular}>{tx.particular}</td>
                          <td className="p-3 text-xs text-muted-foreground">{tx.lead?.name || 'Office / Overhead'}</td>
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{tx.recordedBy?.fullName || '—'}</td>
                          <td className={`p-3 text-right font-bold tabular-nums text-sm ${tx.type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                            {tx.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-border bg-muted/50">
                      <tr>
                        <td colSpan={7} className="p-3 text-right font-bold text-sm">Net Balance</td>
                        <td className={`p-3 text-right font-bold tabular-nums text-sm ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          {balance.toLocaleString()} BDT
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
