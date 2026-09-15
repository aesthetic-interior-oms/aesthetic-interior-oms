"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type SummaryRow = {
  accountId: string
  accountName: string
  leadId: string | null
  leadName: string
  amount: number
  txCount: number
}

type SummaryData = {
  inflow: SummaryRow[]
  outflow: SummaryRow[]
  totalInflow: number
  totalOutflow: number
  netBalance: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function fmt(n: number) {
  return n.toLocaleString("en-BD", { maximumFractionDigits: 0 })
}

function getMonthRange(year: number, month: number): DateRange {
  const from = new Date(year, month, 1)
  const to = new Date(year, month + 1, 0)
  return { from, to }
}

// Group rows by accountName for rendering
function groupByAccount(rows: SummaryRow[]): Map<string, SummaryRow[]> {
  const map = new Map<string, SummaryRow[]>()
  for (const row of rows) {
    const group = map.get(row.accountName) ?? []
    group.push(row)
    map.set(row.accountName, group)
  }
  return map
}

// ── Account colour palette ─────────────────────────────────────────────────────
const ACCOUNT_COLOURS = [
  { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  { bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200 dark:border-teal-800", badge: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300" },
  { bg: "bg-pink-50 dark:bg-pink-950/30", border: "border-pink-200 dark:border-pink-800", badge: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300" },
]

// ── Sub-components ─────────────────────────────────────────────────────────────
function AccountBlock({
  accountName,
  rows,
  colourIdx,
  type,
}: {
  accountName: string
  rows: SummaryRow[]
  colourIdx: number
  type: "inflow" | "outflow"
}) {
  const colours = ACCOUNT_COLOURS[colourIdx % ACCOUNT_COLOURS.length]
  const subtotal = rows.reduce((s, r) => s + r.amount, 0)
  const isInflow = type === "inflow"

  return (
    <div className={`rounded-lg border ${colours.border} ${colours.bg} overflow-hidden`}>
      {/* Account header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-inherit">
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">{accountName}</span>
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${colours.badge}`}>
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </Badge>
        </div>
        <span className={`text-sm font-bold ${isInflow ? "text-emerald-600" : "text-rose-600"}`}>
          {isInflow ? "+" : "-"} ৳{fmt(subtotal)}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b border-inherit">
              {isInflow ? (
                <>
                  <th className="text-left px-4 py-2 font-medium">Allocated Project</th>
                  <th className="text-right px-4 py-2 font-medium">Transactions</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                </>
              ) : (
                <>
                  <th className="text-left px-4 py-2 font-medium">Allocated Project</th>
                  <th className="text-right px-4 py-2 font-medium">Transactions</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.leadId}-${i}`} className="border-b border-inherit last:border-0 hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${isInflow ? "bg-emerald-500" : "bg-rose-500"} shrink-0`} />
                    <span className="font-medium text-foreground">{row.leadName}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">
                  {row.txCount} tx
                </td>
                <td className={`px-4 py-2.5 text-right font-semibold ${isInflow ? "text-emerald-600" : "text-rose-600"}`}>
                  ৳{fmt(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Subtotal row */}
          <tfoot>
            <tr className={`${isInflow ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-rose-50 dark:bg-rose-950/20"}`}>
              <td className="px-4 py-2 text-xs font-semibold text-muted-foreground" colSpan={2}>
                Subtotal — {accountName}
              </td>
              <td className={`px-4 py-2 text-right font-bold text-sm ${isInflow ? "text-emerald-700" : "text-rose-700"}`}>
                {isInflow ? "+" : "-"} ৳{fmt(subtotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SummaryPage() {
  const today = new Date()
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    getMonthRange(today.getFullYear(), today.getMonth())
  )
  const [selectedMonth, setSelectedMonth] = useState<string>(String(today.getMonth()))
  const [selectedYear, setSelectedYear] = useState<string>(String(today.getFullYear()))
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const years = useMemo(() => {
    const y = today.getFullYear()
    return [y - 2, y - 1, y, y + 1]
  }, [])

  // Apply month quick-select
  const applyMonthFilter = useCallback((monthStr: string, yearStr: string) => {
    const m = parseInt(monthStr, 10)
    const y = parseInt(yearStr, 10)
    if (!isNaN(m) && !isNaN(y)) {
      setDateRange(getMonthRange(y, m))
    }
  }, [])

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val)
    applyMonthFilter(val, selectedYear)
  }

  const handleYearChange = (val: string) => {
    setSelectedYear(val)
    applyMonthFilter(selectedMonth, val)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (dateRange?.from) params.set("startDate", dateRange.from.toISOString())
      if (dateRange?.to) params.set("endDate", dateRange.to.toISOString())
      const res = await fetch(`/api/finance/summary?${params.toString()}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Failed to load")
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const inflowGroups = useMemo(() => (data ? groupByAccount(data.inflow) : new Map()), [data])
  const outflowGroups = useMemo(() => (data ? groupByAccount(data.outflow) : new Map()), [data])

  const netIsPositive = data ? data.netBalance >= 0 : true

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Cash Flow Summary</h1>
            <p className="text-xs text-muted-foreground">Inflow & outflow grouped by account and project</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 self-start sm:self-auto">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Filters ── */}
      <Card className="shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2 shrink-0">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
            </div>

            {/* Month quick select */}
            <div className="flex gap-2">
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="h-9 w-[140px] text-sm">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="h-9 w-[90px] text-sm">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground hidden sm:block">or</div>

            {/* Date range picker */}
            <div className="w-full sm:w-72">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Pick custom date range"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="shadow-sm animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 w-40 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-10 bg-muted rounded" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Data ── */}
      {!loading && data && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ─── Cash Inflow ─── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              </div>
              <h2 className="text-base font-bold text-emerald-700 dark:text-emerald-400">Cash Inflow</h2>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0 text-xs">
                ৳{fmt(data.totalInflow)}
              </Badge>
            </div>

            {inflowGroups.size === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No inflow transactions for this period
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {Array.from(inflowGroups.entries()).map(([accountName, rows], idx) => (
                  <AccountBlock
                    key={accountName}
                    accountName={accountName}
                    rows={rows}
                    colourIdx={idx}
                    type="inflow"
                  />
                ))}
                {/* Inflow total footer */}
                <div className="flex justify-between items-center rounded-lg bg-emerald-600 text-white px-4 py-3 shadow">
                  <span className="font-semibold text-sm">Total Cash Inflow</span>
                  <span className="font-bold text-lg">+ ৳{fmt(data.totalInflow)}</span>
                </div>
              </div>
            )}
          </div>

          {/* ─── Cash Outflow ─── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                <ArrowDownRight className="h-4 w-4 text-rose-600" />
              </div>
              <h2 className="text-base font-bold text-rose-700 dark:text-rose-400">Cash Outflow</h2>
              <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300 border-0 text-xs">
                ৳{fmt(data.totalOutflow)}
              </Badge>
            </div>

            {outflowGroups.size === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No outflow transactions for this period
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {Array.from(outflowGroups.entries()).map(([accountName, rows], idx) => (
                  <AccountBlock
                    key={accountName}
                    accountName={accountName}
                    rows={rows}
                    colourIdx={idx}
                    type="outflow"
                  />
                ))}
                {/* Outflow total footer */}
                <div className="flex justify-between items-center rounded-lg bg-rose-600 text-white px-4 py-3 shadow">
                  <span className="font-semibold text-sm">Total Cash Outflow</span>
                  <span className="font-bold text-lg">- ৳{fmt(data.totalOutflow)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Net Balance Banner ── */}
      {!loading && data && (
        <Card className={`shadow-md border-2 ${netIsPositive ? "border-emerald-400 dark:border-emerald-700" : "border-rose-400 dark:border-rose-700"}`}>
          <CardContent className="py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Net Balance for Period</p>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 ${netIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {netIsPositive
                      ? <TrendingUp className="h-6 w-6" />
                      : <TrendingDown className="h-6 w-6" />
                    }
                    <span className="text-3xl font-extrabold tracking-tight">
                      {netIsPositive ? "+" : ""} ৳{fmt(data.netBalance)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Total Inflow</p>
                  <p className="text-lg font-bold text-emerald-600">৳{fmt(data.totalInflow)}</p>
                </div>
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 px-4 py-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Total Outflow</p>
                  <p className="text-lg font-bold text-rose-600">৳{fmt(data.totalOutflow)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
