"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  TrendingUp, TrendingDown, X, Loader2, ArrowUpRight, ArrowDownRight,
  FileDown, Wallet,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type TxDetail = {
  id: string
  date: string
  particular: string
  category: string
  categoryLabel: string
  amount: number
  voucherNo: string | null
  recordedBy: string
  collectedBy: string | null
}

type SummaryRow = {
  groupKey: string
  accountId: string
  accountName: string
  leadId: string | null
  leadName: string
  amount: number
  txCount: number
  transactions: TxDetail[]
}

type AccountStat = {
  accountId: string
  accountName: string
  inflow: number
  outflow: number
}

type SummaryData = {
  inflow: SummaryRow[]
  outflow: SummaryRow[]
  accountSummary: AccountStat[]
  totalInflow: number
  totalOutflow: number
  netBalance: number
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

function fmt(n: number) {
  return Math.abs(n).toLocaleString("en-BD", { maximumFractionDigits: 0 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function getMonthRange(year: number, month: number): DateRange {
  return { from: new Date(year, month, 1), to: new Date(year, month + 1, 0) }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SummaryPage() {
  const today = new Date()
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    getMonthRange(today.getFullYear(), today.getMonth())
  )
  const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth()))
  const [selectedYear,  setSelectedYear]  = useState(String(today.getFullYear()))
  const [data,    setData]    = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Modal state
  const [modalRow,  setModalRow]  = useState<SummaryRow | null>(null)
  const [modalType, setModalType] = useState<"inflow" | "outflow">("inflow")

  const years = useMemo(() => {
    const y = today.getFullYear()
    return [y - 2, y - 1, y, y + 1]
  }, [])

  const applyMonth = (m: string, y: string) => {
    const mi = parseInt(m, 10), yi = parseInt(y, 10)
    if (!isNaN(mi) && !isNaN(yi)) setDateRange(getMonthRange(yi, mi))
  }

  const setPreset = (p: "TODAY"|"THIS_MONTH"|"LAST_7"|"LAST_30"|"ALL") => {
    const t = new Date()
    if (p === "ALL") { setDateRange(undefined); return }
    if (p === "TODAY") {
      setDateRange({ from: new Date(t.getFullYear(), t.getMonth(), t.getDate()), to: new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59) })
      return
    }
    if (p === "THIS_MONTH") {
      const r = getMonthRange(t.getFullYear(), t.getMonth())
      setSelectedMonth(String(t.getMonth())); setSelectedYear(String(t.getFullYear()))
      setDateRange(r); return
    }
    if (p === "LAST_7") {
      const from = new Date(t); from.setDate(from.getDate() - 6); from.setHours(0,0,0,0)
      setDateRange({ from, to: new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59) }); return
    }
    if (p === "LAST_30") {
      const from = new Date(t); from.setDate(from.getDate() - 29); from.setHours(0,0,0,0)
      setDateRange({ from, to: new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59) }); return
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
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

  const isFiltered  = Boolean(dateRange?.from || dateRange?.to)
  const netPositive = data ? data.netBalance >= 0 : true

  const periodLabel = useMemo(() => {
    if (!dateRange?.from) return "All Time"
    const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }
    const from = dateRange.from.toLocaleDateString("en-GB", opts)
    const to   = dateRange.to ? dateRange.to.toLocaleDateString("en-GB", opts) : from
    return `${from} – ${to}`
  }, [dateRange])

  // ── PDF Download ─────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!data) return
    const { default: jsPDF }     = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
    const doc   = new jsPDF({ orientation: "portrait" })
    const pageW = doc.internal.pageSize.getWidth()
    const today2 = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

    // Logo
    const logoImg = new Image(); logoImg.src = "/Logo/HeaderLogo.png"
    await new Promise(r => { logoImg.onload = r; logoImg.onerror = r })
    doc.addImage(logoImg, "PNG", 14, 14, 43.2, 8)

    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59)
    doc.text("CASH FLOW SUMMARY", pageW - 14, 18, { align: "right" })
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139)
    doc.text(`Period: ${periodLabel}`, pageW - 14, 24, { align: "right" })
    doc.text(`Generated: ${today2}`, pageW - 14, 29, { align: "right" })

    // Summary box
    let y = 40
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59)
    doc.text(`Total Cash Inflow : ${data.totalInflow.toLocaleString()} BDT`, 14, y); y += 6
    doc.text(`Total Cash Outflow: ${data.totalOutflow.toLocaleString()} BDT`, 14, y); y += 6
    doc.text(`Net Balance       : ${data.netBalance >= 0 ? "+" : ""}${data.netBalance.toLocaleString()} BDT`, 14, y); y += 10

    // Account situation
    if (data.accountSummary.length > 0) {
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59)
      doc.text("ACCOUNT SITUATION", 14, y); y += 4
      autoTable(doc, {
        startY: y,
        head: [["Account", "Inflow (BDT)", "Outflow (BDT)", "Net (BDT)"]],
        body: data.accountSummary.map(a => [
          a.accountName,
          { content: a.inflow.toLocaleString(), styles: { halign: "right", textColor: [5,150,105] as [number,number,number] } },
          { content: a.outflow.toLocaleString(), styles: { halign: "right", textColor: [220,38,38] as [number,number,number] } },
          { content: (a.inflow - a.outflow >= 0 ? "+" : "") + (a.inflow - a.outflow).toLocaleString(), styles: { halign: "right", fontStyle: "bold" as const } },
        ]),
        theme: "grid",
        headStyles: { fillColor: [15,23,42], textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8 },
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }

    // Cash Inflow table
    if (data.inflow.length > 0) {
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59)
      doc.text("CASH INFLOW", 14, y); y += 4
      autoTable(doc, {
        startY: y,
        head: [["Allocated Project", "Account", "Transactions", "Amount (BDT)"]],
        body: data.inflow.map(r => [
          r.leadName, r.accountName,
          String(r.txCount),
          { content: r.amount.toLocaleString(), styles: { halign: "right", textColor: [5,150,105] as [number,number,number], fontStyle: "bold" as const } },
        ]),
        foot: [[
          { content: "Total Inflow", colSpan: 3, styles: { fontStyle: "bold" as const, halign: "right" as const } },
          { content: data.totalInflow.toLocaleString(), styles: { halign: "right" as const, fontStyle: "bold" as const, textColor: [5,150,105] as [number,number,number] } },
        ]],
        theme: "grid",
        headStyles: { fillColor: [5,150,105], textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        footStyles: { fillColor: [240,253,244], fontSize: 8.5 },
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }

    // Cash Outflow table
    if (data.outflow.length > 0) {
      if (y > 230) { doc.addPage(); y = 20 }
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59)
      doc.text("CASH OUTFLOW", 14, y); y += 4
      autoTable(doc, {
        startY: y,
        head: [["Account", "Allocated Project", "Transactions", "Amount (BDT)"]],
        body: data.outflow.map(r => [
          r.accountName, r.leadName,
          String(r.txCount),
          { content: r.amount.toLocaleString(), styles: { halign: "right", textColor: [220,38,38] as [number,number,number], fontStyle: "bold" as const } },
        ]),
        foot: [[
          { content: "Total Outflow", colSpan: 3, styles: { fontStyle: "bold" as const, halign: "right" as const } },
          { content: data.totalOutflow.toLocaleString(), styles: { halign: "right" as const, fontStyle: "bold" as const, textColor: [220,38,38] as [number,number,number] } },
        ]],
        theme: "grid",
        headStyles: { fillColor: [220,38,38], textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        footStyles: { fillColor: [255,241,242], fontSize: 8.5 },
      })
    }

    doc.save(`cash-flow-summary-${periodLabel.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`)
  }

  // ── Modal open helpers ────────────────────────────────────────────────────
  const openModal = (row: SummaryRow, type: "inflow" | "outflow") => {
    setModalRow(row); setModalType(type)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full items-center justify-between px-4 py-3 sm:px-6 sm:py-4 gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Cash Flow Summary</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{periodLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
              <Button size="sm" variant={!isFiltered ? "secondary" : "ghost"} className="h-7 text-xs px-2" onClick={() => setPreset("ALL")}>All Time</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setPreset("TODAY")}>Today</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setPreset("THIS_MONTH")}>This Month</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setPreset("LAST_7")}>7 Days</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setPreset("LAST_30")}>30 Days</Button>
            </div>

            <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); applyMonth(v, selectedYear) }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); applyMonth(selectedMonth, v) }}>
              <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>

            <div className="w-52 sm:w-60">
              <DateRangePicker value={dateRange} onChange={setDateRange} placeholder="Custom range" className="h-8 text-xs" />
            </div>

            {isFiltered && (
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setDateRange(undefined)}>
                <X className="w-3.5 h-3.5 mr-1" />Reset
              </Button>
            )}

            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => void handleDownloadPDF()} disabled={!data}>
              <FileDown className="w-3.5 h-3.5" />PDF
            </Button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-col gap-5 p-4 md:gap-6 md:p-8 flex-1 w-full">

        {loading && (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" /><p>Loading summary...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
        )}

        {!loading && data && (
          <>
            {/* ── 3 Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground mb-1">Total Cash Inflow</div>
                  <div className="text-2xl font-bold text-emerald-500">৳{fmt(data.totalInflow)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground mb-1">Total Cash Outflow</div>
                  <div className="text-2xl font-bold text-rose-500">৳{fmt(data.totalOutflow)}</div>
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

            {/* ── Account Situation ── */}
            {data.accountSummary.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    Account Situation
                    <span className="text-xs font-normal text-muted-foreground ml-1">— {periodLabel}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-border bg-muted/30">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inflow</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Outflow</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.accountSummary.map(acct => {
                          const net = acct.inflow - acct.outflow
                          return (
                            <tr key={acct.accountId} className="hover:bg-muted/40 transition-colors">
                              <td className="px-4 py-3 font-semibold text-foreground">{acct.accountName}</td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">৳{fmt(acct.inflow)}</td>
                              <td className="px-4 py-3 text-right font-medium text-rose-600 dark:text-rose-400 tabular-nums">৳{fmt(acct.outflow)}</td>
                              <td className={`px-4 py-3 text-right font-bold tabular-nums ${net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {net >= 0 ? "+" : "-"}৳{fmt(net)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Inflow & Outflow Tables ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Cash Inflow — Allocated Project | Account | Amount */}
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
                    <div className="py-12 text-center text-sm text-muted-foreground">No inflow transactions for this period.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-t border-border bg-muted/30">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Allocated Project</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {data.inflow.map((row) => (
                            <tr
                              key={row.groupKey}
                              className="hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => openModal(row, "inflow")}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="font-medium text-foreground">{row.leadName}</span>
                                  <span className="text-[11px] text-muted-foreground/60">({row.txCount} tx)</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{row.accountName}</td>
                              <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                ৳{fmt(row.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border bg-emerald-50 dark:bg-emerald-950/30">
                            <td className="px-4 py-3 font-bold text-sm" colSpan={2}>Total Cash Inflow</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-base tabular-nums">৳{fmt(data.totalInflow)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cash Outflow — Account | Allocated Project | Amount */}
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
                    <div className="py-12 text-center text-sm text-muted-foreground">No outflow transactions for this period.</div>
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
                          {data.outflow.map((row) => (
                            <tr
                              key={row.groupKey}
                              className="hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => openModal(row, "outflow")}
                            >
                              <td className="px-4 py-3 text-muted-foreground">{row.accountName}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                  <span className="font-medium text-foreground">{row.leadName}</span>
                                  <span className="text-[11px] text-muted-foreground/60">({row.txCount} tx)</span>
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
                            <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400 text-base tabular-nums">৳{fmt(data.totalOutflow)}</td>
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

      {/* ── Transaction Detail Modal ── */}
      <Dialog open={!!modalRow} onOpenChange={open => { if (!open) setModalRow(null) }}>
        <DialogContent className="max-w-5xl w-full max-h-[92vh] overflow-y-auto">
          {modalRow && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${modalType === "inflow" ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-rose-100 dark:bg-rose-900/50"}`}>
                    {modalType === "inflow"
                      ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                      : <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />}
                  </div>
                  <span>{modalRow.leadName}</span>
                  <span className="text-muted-foreground font-normal text-sm">— {modalRow.accountName}</span>
                </DialogTitle>
              </DialogHeader>

              {/* Modal summary */}
              <div className="flex items-center gap-4 py-2 border-b border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className={`text-xl font-bold tabular-nums ${modalType === "inflow" ? "text-emerald-600" : "text-rose-600"}`}>
                    ৳{fmt(modalRow.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="text-xl font-bold">{modalRow.txCount}</p>
                </div>
              </div>

              {/* Transactions table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Particulars</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Voucher</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {modalRow.transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(tx.date)}</td>
                        <td className="px-3 py-2.5 font-medium text-foreground max-w-[200px]">
                          <div className="truncate">{tx.particular}</div>
                          {tx.collectedBy && (
                            <div className="text-[11px] text-muted-foreground">by {tx.collectedBy}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                            {tx.categoryLabel}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-muted-foreground font-mono">
                          {tx.voucherNo ?? "—"}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${modalType === "inflow" ? "text-emerald-600" : "text-rose-600"}`}>
                          ৳{fmt(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`border-t-2 border-border ${modalType === "inflow" ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-rose-50 dark:bg-rose-950/30"}`}>
                      <td className="px-3 py-2.5 font-bold text-sm" colSpan={4}>Total</td>
                      <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${modalType === "inflow" ? "text-emerald-600" : "text-rose-600"}`}>
                        ৳{fmt(modalRow.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
