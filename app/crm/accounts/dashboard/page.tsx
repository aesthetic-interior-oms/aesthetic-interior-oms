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
      // Get current month date range
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
            Accounts department overview, cash movements, and monthly balance history ledger.
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
            <Link href="/crm/admin/finance">
              <ClipboardList className="h-3.5 w-3.5" />
              Finance Log
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
          {/* ── 4 Top KPI Cards ── */}
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

                <Button size="sm" variant="outline" asChild className="text-xs h-8 gap-1.5">
                  <Link href="/crm/accounts/summary">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Full Summary View
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {data.monthlyHistory.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No monthly history recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <th className="text-left px-4 py-3">Month</th>
                        <th className="text-right px-4 py-3">Opening Balance</th>
                        <th className="text-right px-4 py-3 text-emerald-600 dark:text-emerald-400">Inflow</th>
                        <th className="text-right px-4 py-3 text-rose-500">Outflow</th>
                        <th className="text-right px-4 py-3">Net Change</th>
                        <th className="text-right px-4 py-3 font-bold">Closing Balance</th>
                        <th className="text-center px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.monthlyHistory.map((m) => {
                        const isCurrentMonth = m.month === today.getMonth() && m.year === today.getFullYear()
                        return (
                          <tr
                            key={m.monthLabel}
                            className={`hover:bg-muted/40 transition-colors ${isCurrentMonth ? "bg-primary/5 font-semibold" : ""}`}
                          >
                            <td className="px-4 py-3.5 font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <span>{m.monthLabel}</span>
                                {isCurrentMonth && (
                                  <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                                    Current Month
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums">
                              ৳{fmt(m.openingBalance)}
                            </td>
                            <td className="px-4 py-3.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                              +৳{fmt(m.inflow)}
                            </td>
                            <td className="px-4 py-3.5 text-right text-rose-500 font-semibold tabular-nums">
                              -৳{fmt(m.outflow)}
                            </td>
                            <td className={`px-4 py-3.5 text-right font-semibold tabular-nums ${m.netChange >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                              {fmtSigned(m.netChange)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-foreground tabular-nums text-base">
                              ৳{fmt(m.closingBalance)}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2.5 hover:bg-primary/10 hover:text-primary"
                                onClick={() => navigateToMonthSummary(m.year, m.month)}
                              >
                                View Summary
                              </Button>
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

          {/* ── Account Situation Table & Quick Navigation ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Account Situation */}
            <Card className="lg:col-span-2 border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-bold">Account Situation</CardTitle>
                  </div>
                  <Button size="sm" variant="ghost" asChild className="h-7 text-xs">
                    <Link href="/crm/admin/finance/settings/accounts">
                      <Settings className="h-3.5 w-3.5 mr-1" />
                      Manage Accounts
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {data.accountSummary.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No accounts found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          <th className="text-left px-4 py-2.5">Account</th>
                          <th className="text-right px-4 py-2.5">Opening</th>
                          <th className="text-right px-4 py-2.5">Inflow</th>
                          <th className="text-right px-4 py-2.5">Outflow</th>
                          <th className="text-right px-4 py-2.5">Closing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.accountSummary.map(acct => (
                          <tr key={acct.accountId} className="hover:bg-muted/40 transition-colors">
                            <td className="px-4 py-3 font-semibold text-foreground">{acct.accountName}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">৳{fmt(acct.openingBalance)}</td>
                            <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">+৳{fmt(acct.inflow)}</td>
                            <td className="px-4 py-3 text-right font-medium text-rose-600 dark:text-rose-400 tabular-nums">-৳{fmt(acct.outflow)}</td>
                            <td className={`px-4 py-3 text-right font-bold tabular-nums ${acct.closingBalance >= 0 ? "text-foreground" : "text-rose-600"}`}>
                              ৳{fmt(acct.closingBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Quick Navigation</CardTitle>
                <CardDescription className="text-xs">Accounts department tools & portals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  href="/crm/accounts/summary"
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-primary/10 text-primary">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Cash Flow Summary</div>
                      <div className="text-[11px] text-muted-foreground">Inflow/outflow breakdown</div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/crm/accounts/projects"
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Projects Ledger</div>
                      <div className="text-[11px] text-muted-foreground">Client payments & site expenses</div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/crm/accounts/overheads"
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-amber-50 text-amber-600 dark:bg-amber-950/40">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Overheads</div>
                      <div className="text-[11px] text-muted-foreground">Office expenses & bills</div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/crm/admin/finance/settings/accounts"
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-purple-50 text-purple-600 dark:bg-purple-950/40">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Manage Accounts</div>
                      <div className="text-[11px] text-muted-foreground">Bank & Cash accounts</div>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
