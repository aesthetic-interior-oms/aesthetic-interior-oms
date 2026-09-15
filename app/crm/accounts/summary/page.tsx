"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
  X,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
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
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

function fmt(n: number) {
  return Math.abs(n).toLocaleString("en-BD", { maximumFractionDigits: 0 })
}

function getMonthRange(year: number, month: number): DateRange {
  return {
    from: new Date(year, month, 1),
    to: new Date(year, month + 1, 0),
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SummaryPage() {
  const today = new Date()
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    getMonthRange(today.getFullYear(), today.getMonth())
  )
  const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth()))
  const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()))
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const years = useMemo(() => {
    const y = today.getFullYear()
    return [y - 2, y - 1, y, y + 1]
  }, [])

  const applyMonth = (m: string, y: string) => {
    const mi = parseInt(m, 10)
    const yi = parseInt(y, 10)
    if (!isNaN(mi) && !isNaN(yi)) setDateRange(getMonthRange(yi, mi))
  }

  const setPreset = (preset: "TODAY" | "THIS_MONTH" | "LAST_7" | "LAST_30" | "ALL") => {
    const t = new Date()
    if (preset === "ALL") { setDateRange(undefined); return }
    if (preset === "TODAY") {
      setDateRange({ from: new Date(t.getFullYear(), t.getMonth(), t.getDate()), to: new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59) })
      return
    }
    if (preset === "THIS_MONTH") {
      const r = getMonthRange(t.getFullYear(), t.getMonth())
      setSelectedMonth(String(t.getMonth()))
      setSelectedYear(String(t.getFullYear()))
      setDateRange(r)
      return
    }
    if (preset === "LAST_7") {
      const from = new Date(t); from.setDate(from.getDate() - 6); from.setHours(0,0,0,0)
      setDateRange({ from, to: new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59) })
      return
    }
    if (preset === "LAST_30") {
      const from = new Date(t); from.setDate(from.getDate() - 29); from.setHours(0,0,0,0)
      setDateRange({ from, to: new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59) })
      return
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const p = new URLSearchParams()
      if (dateRange?.from) p.set("startDate", dateRange.from.toISOString())
      if (dateRange?.to)   p.set("endDate",   dateRange.to.toISOString())
      const res  = await fetch(`/api/finance/summary?${p}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Failed to load")
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => { void fetchData() }, [fetchData])

  const netPositive = data ? data.netBalance >= 0 : true

  const isFiltered = Boolean(dateRange?.from || dateRange?.to)

  // ── Date label ────────────────────────────────────────────────────────────
  const periodLabel = useMemo(() => {
    if (!dateRange?.from) return "All Time"
    const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }
    const from = dateRange.from.toLocaleDateString("en-GB", opts)
    const to   = dateRange.to ? dateRange.to.toLocaleDateString("en-GB", opts) : from
    return `${from} – ${to}`
  }, [dateRange])

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full items-center justify-between px-4 py-3 sm:px-6 sm:py-4 gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Cash Flow Summary
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{periodLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Preset buttons */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
              <Button size="sm" variant={!isFiltered ? "secondary" : "ghost"} className="h-7 text-xs px-2" onClick={() => setPreset("ALL")}>All Time</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setPreset("TODAY")}>Today</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setPreset("THIS_MONTH")}>This Month</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setPreset("LAST_7")}>7 Days</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setPreset("LAST_30")}>30 Days</Button>
            </div>

            {/* Month / Year quick-select */}
            <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); applyMonth(v, selectedYear) }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); applyMonth(selectedMonth, v) }}>
              <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Custom date range */}
            <div className="w-52 sm:w-60">
              <DateRangePicker value={dateRange} onChange={setDateRange} placeholder="Custom range" className="h-8 text-xs" />
            </div>

            {isFiltered && (
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setDateRange(undefined)}>
                <X className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-col gap-5 p-4 md:gap-6 md:p-8 flex-1 w-full">

        {/* ── Loading ── */}
        {loading && (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Loading summary...</p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ── Data ── */}
        {!loading && data && (
          <>
            {/* Summary stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground mb-1">Total Cash Inflow</div>
                  <div className="text-2xl font-bold text-emerald-500">
                    ৳{fmt(data.totalInflow)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground mb-1">Total Cash Outflow</div>
                  <div className="text-2xl font-bold text-rose-500">
                    ৳{fmt(data.totalOutflow)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-xs text-muted-foreground">Net Balance</div>
                    {!netPositive && <Badge variant="destructive" className="h-4 text-[10px] px-1.5 py-0">LOSS</Badge>}
                  </div>
                  <div className={`text-2xl font-bold flex items-center gap-1.5 ${netPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {netPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    {netPositive ? "+" : "-"}৳{fmt(data.netBalance)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* ── Cash Inflow Table ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                      <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                    </div>
                    Cash Inflow
                    <Badge className="ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0">
                      ৳{fmt(data.totalInflow)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {data.inflow.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No inflow transactions for this period.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-t border-border bg-muted/30">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Allocated Project</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {data.inflow.map((row, i) => (
                            <tr key={`in-${i}`} className="hover:bg-muted/40 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-medium text-foreground">{row.accountName}</span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  {row.leadName}
                                  <span className="text-[11px] text-muted-foreground/60 ml-1">({row.txCount} tx)</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                ৳{fmt(row.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border bg-emerald-50 dark:bg-emerald-950/30">
                            <td className="px-4 py-3 font-bold text-sm" colSpan={2}>Total Cash Inflow</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-base tabular-nums">
                              ৳{fmt(data.totalInflow)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Cash Outflow Table ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="h-7 w-7 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shrink-0">
                      <ArrowDownRight className="h-4 w-4 text-rose-600" />
                    </div>
                    Cash Outflow
                    <Badge className="ml-auto bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300 border-0">
                      ৳{fmt(data.totalOutflow)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {data.outflow.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No outflow transactions for this period.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-t border-border bg-muted/30">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Allocated Project</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {data.outflow.map((row, i) => (
                            <tr key={`out-${i}`} className="hover:bg-muted/40 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-medium text-foreground">{row.accountName}</span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                  {row.leadName}
                                  <span className="text-[11px] text-muted-foreground/60 ml-1">({row.txCount} tx)</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                                ৳{fmt(row.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border bg-rose-50 dark:bg-rose-950/30">
                            <td className="px-4 py-3 font-bold text-sm" colSpan={2}>Total Cash Outflow</td>
                            <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400 text-base tabular-nums">
                              ৳{fmt(data.totalOutflow)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Net Balance Banner ── */}
            <Card className={`border-2 ${netPositive ? "border-emerald-400 dark:border-emerald-700" : "border-rose-400 dark:border-rose-700"}`}>
              <CardContent className="py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Net Balance — {periodLabel}</p>
                    <div className={`flex items-center gap-2 ${netPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {netPositive ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                      <span className="text-3xl font-extrabold tracking-tight tabular-nums">
                        {netPositive ? "+" : "-"}৳{fmt(data.netBalance)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-5 py-3 text-center">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Inflow</p>
                      <p className="text-lg font-bold text-emerald-600 tabular-nums">৳{fmt(data.totalInflow)}</p>
                    </div>
                    <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 px-5 py-3 text-center">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Outflow</p>
                      <p className="text-lg font-bold text-rose-600 tabular-nums">৳{fmt(data.totalOutflow)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
