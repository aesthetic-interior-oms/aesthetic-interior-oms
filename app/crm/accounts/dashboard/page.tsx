"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  History,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ClipboardList,
  FolderKanban,
  Receipt,
  Settings,
  PlusCircle,
  Loader2,
  Calendar,
  Building2,
  RefreshCw,
  Users,
  HandCoins,
  FileText,
  Clock,
  ChevronRight,
  ShieldCheck,
  Package,
} from "lucide-react"

type MonthlyHistoryRow = {
  year: number
  month: number
  monthLabel: string
  openingBalance: number
  inflow: number
  outflow: number
  netChange: number
  closingBalance: number
}

type AccountStat = {
  accountId: string
  accountName: string
  openingBalance: number
  inflow: number
  outflow: number
  closingBalance: number
}

type SummaryData = {
  inflow: any[]
  outflow: any[]
  accountSummary: AccountStat[]
  monthlyHistory: MonthlyHistoryRow[]
  openingBalance: number
  totalInflow: number
  totalOutflow: number
  netBalance: number
  closingBalance: number
  // AP & AR pre-computed server metrics
  totalAP?: number
  totalAR?: number
  totalProjectAgreements?: number
  totalClientCollected?: number
  totalVendorContracts?: number
  totalVendorPaid?: number
}

function fmt(n: number) {
  return Math.abs(n).toLocaleString("en-BD", { maximumFractionDigits: 0 })
}

function fmtSigned(n: number) {
  const formatted = fmt(n)
  if (n > 0) return `+৳${formatted}`
  if (n < 0) return `-৳${formatted}`
  return `৳0`
}

export default function AccountsDashboardPage() {
  const router = useRouter()
  const today = new Date()
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentMonthName = useMemo(() => {
    return today.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
  }, [])

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()
      const res = await fetch(`/api/finance/summary?startDate=${start}&endDate=${end}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Failed to load dashboard data")
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const netPositive = data ? data.netBalance >= 0 : true

  const navigateToMonthSummary = (year: number, month: number) => {
    const from = new Date(year, month, 1).toISOString()
    const to = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString()
    router.push(`/crm/accounts/summary?startDate=${encodeURIComponent(from)}&endDate=${encodeURIComponent(to)}`)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Accounts Dashboard
            </h1>
            <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border-0">
              {currentMonthName}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Accounts department overview, cash movements, Accounts Payable (AP), and Accounts Receivable (AR).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" asChild className="gap-1.5 text-xs">
            <Link href="/crm/accounts/summary">
              <BarChart3 className="h-3.5 w-3.5" />
              Cash Flow Summary
            </Link>
          </Button>
          <Button size="sm" variant="secondary" asChild className="gap-1.5 text-xs">
            <Link href="/crm/admin/finance/vendors">
              <Users className="h-3.5 w-3.5" />
              Vendor AP Dashboard
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950">
            <Link href="/crm/accounts/stocks">
              <Package className="h-3.5 w-3.5" />
              Stocks & Office Goods
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {loading && (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading accounts dashboard...</p>
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── Accounts Receivable & Accounts Payable Banner Block ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Accounts Receivable Card */}
            <Card className="border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-transparent">
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      <HandCoins className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">Accounts Receivable (AR)</h3>
                      <p className="text-xs text-muted-foreground">Client payments due across projects</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                    Client Outstanding
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                    ৳{fmt(data.totalAR ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ৳{fmt(data.totalClientCollected ?? 0)} collected out of ৳{fmt(data.totalProjectAgreements ?? 0)} contracted value
                  </p>
                </div>

                <div className="pt-2 border-t border-blue-500/20 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Collection Rate: {data.totalProjectAgreements && data.totalProjectAgreements > 0 ? Math.round(((data.totalClientCollected ?? 0) / data.totalProjectAgreements) * 100) : 0}%
                  </span>
                  <Link href="/crm/accounts/projects" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                    View Projects <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Accounts Payable Card */}
            <Card className="border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent">
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">Accounts Payable (AP)</h3>
                      <p className="text-xs text-muted-foreground">Vendor balances owed across sites</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                    Vendor Owed
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                    ৳{fmt(data.totalAP ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ৳{fmt(data.totalVendorPaid ?? 0)} paid out of ৳{fmt(data.totalVendorContracts ?? 0)} total vendor contracts
                  </p>
                </div>

                <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Disbursement Rate: {data.totalVendorContracts && data.totalVendorContracts > 0 ? Math.round(((data.totalVendorPaid ?? 0) / data.totalVendorContracts) * 100) : 0}%
                  </span>
                  <Link href="/crm/admin/finance/vendors" className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
                    Vendor AP Dashboard <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── 4 Top Cash Flow KPI Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                  <span>Opening Balance</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">Start of Month</Badge>
                </div>
                <div className={`text-2xl font-bold tabular-nums ${data.openingBalance >= 0 ? "text-foreground" : "text-rose-500"}`}>
                  ৳{fmt(data.openingBalance)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                  Carried forward from previous month closing
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                  <span>Inflow ({currentMonthName})</span>
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-emerald-500 tabular-nums">
                  +৳{fmt(data.totalInflow)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Total received this month
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                  <span>Outflow ({currentMonthName})</span>
                  <ArrowDownRight className="h-4 w-4 text-rose-500" />
                </div>
                <div className="text-2xl font-bold text-rose-500 tabular-nums">
                  -৳{fmt(data.totalOutflow)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Total spent this month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                  <span className="font-semibold text-foreground">Current Closing Balance</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold bg-primary/10 text-primary border-0">Live Total</Badge>
                </div>
                <div className={`text-2xl font-extrabold tabular-nums ${data.closingBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  ৳{fmt(data.closingBalance)}
                </div>
                <div className="text-[11px] font-medium mt-1 flex items-center gap-1">
                  <span className="text-muted-foreground">Month Net:</span>
                  <span className={netPositive ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                    {fmtSigned(data.netBalance)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Featured Block: Monthly Balance History Ledger ── */}
          <Card className="border-2 border-primary/20 shadow-sm">
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <History className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Monthly Balance History</CardTitle>
                    <CardDescription className="text-xs">
                      Opening balance carries forward from previous month&apos;s closing
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {data.monthlyHistory.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No monthly history recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="p-3">Month</th>
                        <th className="p-3 text-right">Opening Balance</th>
                        <th className="p-3 text-right text-emerald-600 dark:text-emerald-400">Inflow</th>
                        <th className="p-3 text-right text-rose-600 dark:text-rose-400">Outflow</th>
                        <th className="p-3 text-right">Net Change</th>
                        <th className="p-3 text-right font-bold">Closing Balance</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {data.monthlyHistory.map((row) => (
                        <tr key={`${row.year}-${row.month}`} className="hover:bg-muted/30 transition">
                          <td className="p-3 font-semibold text-foreground">{row.monthLabel}</td>
                          <td className="p-3 text-right font-mono">৳{fmt(row.openingBalance)}</td>
                          <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">+৳{fmt(row.inflow)}</td>
                          <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">-৳{fmt(row.outflow)}</td>
                          <td className={`p-3 text-right font-mono font-semibold ${row.netChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {fmtSigned(row.netChange)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-foreground">৳{fmt(row.closingBalance)}</td>
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] gap-1"
                              onClick={() => navigateToMonthSummary(row.year, row.month)}
                            >
                              View Ledger
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Cash & Bank Account Distribution ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-3 border-border">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Cash & Bank Account Valuation
                </CardTitle>
                <CardDescription className="text-xs">
                  Live closing balance per finance account
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.accountSummary.map((acc) => (
                    <div key={acc.accountId} className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm truncate">{acc.accountName}</span>
                        <Badge variant="outline" className="text-[10px]">Active</Badge>
                      </div>
                      <div className={`text-xl font-bold tabular-nums ${acc.closingBalance >= 0 ? "text-foreground" : "text-rose-500"}`}>
                        ৳{fmt(acc.closingBalance)}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex justify-between pt-1 border-t border-border/50">
                        <span className="text-emerald-600">+৳{fmt(acc.inflow)}</span>
                        <span className="text-rose-500">-৳{fmt(acc.outflow)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
