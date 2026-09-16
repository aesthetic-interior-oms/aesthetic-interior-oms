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
  FileDown, Wallet, History, Scale, Paperclip,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type TxDetail = {
  id: string
  date: string
  particular: string
  category: string
  categoryLabel: string
  amount: number
  accountName: string
  voucherNo: string | null
  recordedBy: string
  collectedBy: string | null
  imageUrl?: string | null
}

type SummaryRow = {
  groupKey: string
  leadId: string | null
  leadName: string
  amount: number
  txCount: number
  transactions: TxDetail[]
}

type AccountStat = {
  accountId: string
  accountName: string
  openingBalance: number
  inflow: number
  outflow: number
  closingBalance: number
}

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

type SummaryData = {
  inflow: SummaryRow[]
  outflow: SummaryRow[]
  accountSummary: AccountStat[]
  monthlyHistory: MonthlyHistoryRow[]
  openingBalance: number
  totalInflow: number
  totalOutflow: number
  netBalance: number
  closingBalance: number
}

// ── Constants & Helpers ────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

function fmt(n: number) {
  return Math.abs(n).toLocaleString("en-BD", { maximumFractionDigits: 0 })
}

function fmtSigned(n: number) {
  const formatted = fmt(n)
  if (n > 0) return `+৳${formatted}`
  if (n < 0) return `-৳${formatted}`
  return `৳0`
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
    if (!isNaN(mi) && !isNaN(yi)) {
      setSelectedMonth(String(mi))
      setSelectedYear(String(yi))
      setDateRange(getMonthRange(yi, mi))
    }
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

  // Filter Monthly Balance History to ONLY show month(s) covered by the date range
  const displayMonthlyHistory = useMemo(() => {
    if (!data?.monthlyHistory) return []
    if (!dateRange?.from) return data.monthlyHistory

    const fromMonth = dateRange.from.getMonth()
    const fromYear  = dateRange.from.getFullYear()
    const toMonth   = dateRange.to ? dateRange.to.getMonth() : fromMonth
    const toYear    = dateRange.to ? dateRange.to.getFullYear() : fromYear

    const startDate = new Date(fromYear, fromMonth, 1)
    const endDate   = new Date(toYear, toMonth, 1)

    return data.monthlyHistory.filter(m => {
      const mDate = new Date(m.year, m.month, 1)
      return mDate >= startDate && mDate <= endDate
    })
  }, [data?.monthlyHistory, dateRange])

  // Computed Totals for Balanced Ledger Accounting
  const totalAvailableInflow = useMemo(() => {
    if (!data) return 0
    return data.openingBalance + data.totalInflow
  }, [data])

  const totalOutflowAndClosingAllocation = useMemo(() => {
    if (!data) return 0
    return data.totalOutflow + data.closingBalance
  }, [data])

  // ── Main Page PDF Download ────────────────────────────────────────────────
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

    let y = 38

    // Account situation table
    if (data.accountSummary.length > 0) {
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59)
      doc.text("ACCOUNT SITUATION", 14, y); y += 4
      autoTable(doc, {
        startY: y,
        head: [["Account", "Opening (BDT)", "Inflow (BDT)", "Outflow (BDT)", "Closing (BDT)"]],
        body: data.accountSummary.map(a => [
          a.accountName,
          a.openingBalance.toLocaleString(),
          { content: a.inflow.toLocaleString(), styles: { halign: "right", textColor: [5,150,105] as [number,number,number] } },
          { content: a.outflow.toLocaleString(), styles: { halign: "right", textColor: [220,38,38] as [number,number,number] } },
          { content: a.closingBalance.toLocaleString(), styles: { halign: "right", fontStyle: "bold" as const } },
        ]),
        theme: "grid",
        headStyles: { fillColor: [15,23,42], textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8 },
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }

    // Monthly Balance History (Filtered for selected date range)
    if (displayMonthlyHistory.length > 0) {
      if (y > 230) { doc.addPage(); y = 20 }
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59)
      doc.text("MONTHLY BALANCE HISTORY", 14, y); y += 4
      autoTable(doc, {
        startY: y,
        head: [["Month", "Opening Balance", "Inflow", "Outflow", "Net Change", "Closing Balance"]],
        body: displayMonthlyHistory.map(m => [
          m.monthLabel,
          m.openingBalance.toLocaleString(),
          m.inflow.toLocaleString(),
          m.outflow.toLocaleString(),
          (m.netChange >= 0 ? "+" : "") + m.netChange.toLocaleString(),
          { content: m.closingBalance.toLocaleString(), styles: { fontStyle: "bold" as const } },
        ]),
        theme: "grid",
        headStyles: { fillColor: [30,41,59], textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8 },
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }

    // Side-by-Side Tables for PDF Export (Left: Inflow & Opening, Right: Outflow & Closing)
    const leftMargin = 14
    const rightMargin = 14
    const gap = 6
    const columnW = (pageW - leftMargin - rightMargin - gap) / 2

    // Left Table Body: Opening Balances + Cash Inflows
    const inflowBody: any[] = [
      ...data.accountSummary.map(a => [
        `Opening: ${a.accountName}`,
        "Opening",
        { content: a.openingBalance.toLocaleString(), styles: { halign: "right", fontStyle: "bold" } }
      ]),
      [{ content: "SUBTOTAL OPENING", colSpan: 2, styles: { fontStyle: "bold", fillColor: [236,253,245] } }, { content: data.openingBalance.toLocaleString(), styles: { halign: "right", fontStyle: "bold", textColor: [5,150,105] } }],
      ...data.inflow.map(r => [
        r.leadName,
        `${r.txCount} tx`,
        { content: r.amount.toLocaleString(), styles: { halign: "right", textColor: [5,150,105], fontStyle: "bold" } }
      ]),
      [{ content: "SUBTOTAL INFLOW", colSpan: 2, styles: { fontStyle: "bold", fillColor: [240,253,244] } }, { content: data.totalInflow.toLocaleString(), styles: { halign: "right", fontStyle: "bold", textColor: [5,150,105] } }],
    ]

    // Right Table Body: Cash Outflows + Closing Balances
    const outflowBody: any[] = [
      ...data.outflow.map(r => [
        r.leadName,
        `${r.txCount} tx`,
        { content: r.amount.toLocaleString(), styles: { halign: "right", textColor: [220,38,38], fontStyle: "bold" } }
      ]),
      [{ content: "SUBTOTAL OUTFLOW", colSpan: 2, styles: { fontStyle: "bold", fillColor: [254,242,242] } }, { content: data.totalOutflow.toLocaleString(), styles: { halign: "right", fontStyle: "bold", textColor: [220,38,38] } }],
      ...data.accountSummary.map(a => [
        `Closing: ${a.accountName}`,
        "Closing",
        { content: a.closingBalance.toLocaleString(), styles: { halign: "right", fontStyle: "bold" } }
      ]),
      [{ content: "SUBTOTAL CLOSING", colSpan: 2, styles: { fontStyle: "bold", fillColor: [241,245,249] } }, { content: data.closingBalance.toLocaleString(), styles: { halign: "right", fontStyle: "bold" } }],
    ]

    if (y > 180) { doc.addPage(); y = 20 }
    const startYForBoth = y

    // Render Left Table: Cash Inflow & Opening Funds
    autoTable(doc, {
      startY: startYForBoth,
      margin: { left: leftMargin, right: pageW - leftMargin - columnW },
      tableWidth: columnW,
      head: [["Inflow & Opening Funds", "Details", "BDT"]],
      body: inflowBody,
      foot: [[
        { content: "TOTAL AVAILABLE CASH", colSpan: 2, styles: { fontStyle: "bold" as const, halign: "right" as const } },
        { content: totalAvailableInflow.toLocaleString(), styles: { halign: "right" as const, fontStyle: "bold" as const, textColor: [5,150,105] as [number,number,number] } },
      ]],
      theme: "grid",
      headStyles: { fillColor: [5,150,105], textColor: [255,255,255], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 },
      footStyles: { fillColor: [236,253,245], fontSize: 8 },
    })
    const leftFinalY = (doc as any).lastAutoTable.finalY

    // Render Right Table: Cash Outflow & Closing Allocation
    autoTable(doc, {
      startY: startYForBoth,
      margin: { left: leftMargin + columnW + gap, right: rightMargin },
      tableWidth: columnW,
      head: [["Outflow & Allocation", "Details", "BDT"]],
      body: outflowBody,
      foot: [[
        { content: "TOTAL ALLOCATION", colSpan: 2, styles: { fontStyle: "bold" as const, halign: "right" as const } },
        { content: totalOutflowAndClosingAllocation.toLocaleString(), styles: { halign: "right" as const, fontStyle: "bold" as const, textColor: [30,41,59] as [number,number,number] } },
      ]],
      theme: "grid",
      headStyles: { fillColor: [220,38,38], textColor: [255,255,255], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 },
      footStyles: { fillColor: [241,245,249], fontSize: 8 },
    })
    const rightFinalY = (doc as any).lastAutoTable.finalY

    y = Math.max(leftFinalY, rightFinalY) + 10

    // ── End of Document: Financial Summary Stat Box with Equation ─────────────
    if (y > 200) { doc.addPage(); y = 20 }

    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(30, 41, 59)
    doc.text("BALANCED PERIOD RECONCILIATION & EQUATION", 14, y)

    const summaryRows = [
      ["Total Opening Balance (A)", `${data.openingBalance.toLocaleString()} BDT`],
      ["Total Cash Inflow (+ B)", `+${data.totalInflow.toLocaleString()} BDT`],
      ["TOTAL AVAILABLE CASH (A + B)", `${totalAvailableInflow.toLocaleString()} BDT`],
      ["Total Cash Outflow (- C)", `-${data.totalOutflow.toLocaleString()} BDT`],
      ["Total Closing Balance (D)", `${data.closingBalance.toLocaleString()} BDT`],
      ["TOTAL ALLOCATION (C + D)", `${totalOutflowAndClosingAllocation.toLocaleString()} BDT`],
    ]

    autoTable(doc, {
      startY: y + 4,
      head: [["Financial Ledger Metric", "Amount (BDT)"]],
      body: summaryRows,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 110, fontStyle: "bold" },
        1: { cellWidth: 70, halign: "right", fontStyle: "bold" },
      },
      didParseCell: (dataCell: any) => {
        if (dataCell.section === "body") {
          if (dataCell.row.index === 0) dataCell.cell.styles.textColor = [100, 116, 139]
          if (dataCell.row.index === 1) dataCell.cell.styles.textColor = [5, 150, 105]
          if (dataCell.row.index === 2) dataCell.cell.styles.textColor = [5, 150, 105]
          if (dataCell.row.index === 3) dataCell.cell.styles.textColor = [220, 38, 38]
          if (dataCell.row.index === 4) dataCell.cell.styles.textColor = [15, 23, 42]
          if (dataCell.row.index === 5) dataCell.cell.styles.textColor = [30, 41, 59]
        }
      }
    })

    const finalTableY = (doc as any).lastAutoTable.finalY + 8
    let notifyY = finalTableY
    if (notifyY > 260) { doc.addPage(); notifyY = 20 }

    // ── Standalone Notification Banner Callout Box ──
    const isBalanced = totalAvailableInflow === totalOutflowAndClosingAllocation
    const boxHeight = 15
    const boxW = pageW - 28

    if (isBalanced) {
      doc.setFillColor(236, 253, 245) // Emerald 50
      doc.setDrawColor(167, 243, 208) // Emerald 200
    } else {
      doc.setFillColor(254, 242, 242) // Rose 50
      doc.setDrawColor(254, 202, 202) // Rose 200
    }

    doc.setLineWidth(0.5)
    doc.roundedRect(14, notifyY, boxW, boxHeight, 2, 2, "FD")

    if (isBalanced) {
      doc.setFontSize(9.5)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(4, 120, 87) // Emerald 700
      doc.text("✓ EQUATION BALANCED & RECONCILED", pageW / 2, notifyY + 5.5, { align: "center" })

      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 41, 59)
      doc.text(
        `Total Available Cash (${totalAvailableInflow.toLocaleString()} BDT)  =  Total Allocation (${totalOutflowAndClosingAllocation.toLocaleString()} BDT)`,
        pageW / 2,
        notifyY + 11,
        { align: "center" }
      )
    } else {
      doc.setFontSize(9.5)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(185, 28, 28) // Rose 700
      doc.text("⚠️ UNBALANCED CASH FLOW LEDGER", pageW / 2, notifyY + 5.5, { align: "center" })

      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 41, 59)
      doc.text(
        `Total Available Cash (${totalAvailableInflow.toLocaleString()} BDT)  ≠  Total Allocation (${totalOutflowAndClosingAllocation.toLocaleString()} BDT)`,
        pageW / 2,
        notifyY + 11,
        { align: "center" }
      )
    }

    doc.save(`cash-flow-summary-${periodLabel.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`)
  }

  // ── Modal Specific PDF Download ───────────────────────────────────────────
  const handleDownloadModalPDF = async () => {
    if (!modalRow) return
    const { default: jsPDF }     = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
    const doc   = new jsPDF({ orientation: "portrait" })
    const pageW = doc.internal.pageSize.getWidth()
    const today2 = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

    // Logo
    const logoImg = new Image(); logoImg.src = "/Logo/HeaderLogo.png"
    await new Promise(r => { logoImg.onload = r; logoImg.onerror = r })
    doc.addImage(logoImg, "PNG", 14, 14, 43.2, 8)

    const titleText = `${modalRow.leadName.toUpperCase()} — CASH ${modalType.toUpperCase()} STATEMENT`

    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59)
    doc.text(titleText, pageW - 14, 18, { align: "right" })
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139)
    doc.text(`Period: ${periodLabel}`, pageW - 14, 24, { align: "right" })
    doc.text(`Generated: ${today2}`, pageW - 14, 29, { align: "right" })

    let y = 38

    // Stat banner box
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.4)
    doc.roundedRect(14, y, pageW - 28, 10, 1.5, 1.5, "FD")

    const color: [number, number, number] = modalType === "inflow" ? [5, 150, 105] : [220, 38, 38]

    doc.setFontSize(8.5); doc.setFont("helvetica", "bold")
    doc.setTextColor(30, 41, 59)
    doc.text(`Total Amount (${modalType === "inflow" ? "Inflow" : "Outflow"}):`, 18, y + 6.5)
    doc.setFontSize(9.5)
    doc.setTextColor(...color)
    doc.text(`${modalRow.amount.toLocaleString()} BDT`, 80, y + 6.5)

    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139)
    doc.text(`Transactions: ${modalRow.txCount}`, pageW - 20, y + 6.5, { align: "right" })

    y += 16

    // Transactions table
    autoTable(doc, {
      startY: y,
      head: [["Date", "Particulars", "Account", "Category", "Voucher", "Amount (BDT)"]],
      body: modalRow.transactions.map(tx => [
        fmtDate(tx.date),
        tx.particular + (tx.collectedBy ? ` (Collector: ${tx.collectedBy})` : ""),
        tx.accountName,
        tx.categoryLabel,
        tx.voucherNo || "—",
        { content: tx.amount.toLocaleString(), styles: { halign: "right" as const, fontStyle: "bold" as const, textColor: color } }
      ]),
      foot: [[
        { content: "Total Amount", colSpan: 5, styles: { fontStyle: "bold" as const, halign: "right" as const } },
        { content: `${modalRow.amount.toLocaleString()} BDT`, styles: { halign: "right" as const, fontStyle: "bold" as const, textColor: color } }
      ]],
      theme: "grid",
      headStyles: { fillColor: modalType === "inflow" ? [5, 150, 105] : [220, 38, 38], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      footStyles: { fillColor: modalType === "inflow" ? [240, 253, 244] : [255, 241, 242], fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 32 },
        3: { cellWidth: 32 },
        4: { cellWidth: 22 },
        5: { cellWidth: 30, halign: "right" },
      }
    })

    const safeName = modalRow.leadName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()
    doc.save(`statement-${safeName}-${modalType}-${periodLabel.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`)
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
            {/* ── 4 Top Financial Metric Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                    <span>Opening Balance</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">Period Start</Badge>
                  </div>
                  <div className={`text-2xl font-bold tabular-nums ${data.openingBalance >= 0 ? "text-foreground" : "text-rose-500"}`}>
                    ৳{fmt(data.openingBalance)}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">Prior closing balance</p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground mb-1">Cash Inflow</div>
                  <div className="text-2xl font-bold text-emerald-500 tabular-nums">
                    +৳{fmt(data.totalInflow)}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Total received in period</p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground mb-1">Cash Outflow</div>
                  <div className="text-2xl font-bold text-rose-500 tabular-nums">
                    -৳{fmt(data.totalOutflow)}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Total spent in period</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                    <span className="font-semibold text-foreground">Closing Balance</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold bg-primary/10 text-primary border-0">Period End</Badge>
                  </div>
                  <div className={`text-2xl font-extrabold tabular-nums ${data.closingBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    ৳{fmt(data.closingBalance)}
                  </div>
                  <div className="text-[11px] font-medium mt-1 flex items-center gap-1">
                    <span className="text-muted-foreground">Net change:</span>
                    <span className={netPositive ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                      {fmtSigned(data.netBalance)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Monthly Balance History Ledger (Filtered for selected date range) ── */}
            {displayMonthlyHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      Monthly Balance History
                      <span className="text-xs font-normal text-muted-foreground">
                        — Opening balance carries forward from previous month&apos;s closing ({periodLabel})
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          <th className="text-left px-4 py-2.5">Month</th>
                          <th className="text-right px-4 py-2.5">Opening Balance</th>
                          <th className="text-right px-4 py-2.5 text-emerald-600 dark:text-emerald-400">Inflow</th>
                          <th className="text-right px-4 py-2.5 text-rose-500">Outflow</th>
                          <th className="text-right px-4 py-2.5">Net Change</th>
                          <th className="text-right px-4 py-2.5">Closing Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {displayMonthlyHistory.map((m) => {
                          const isSelected = selectedMonth === String(m.month) && isFiltered
                          return (
                            <tr
                              key={m.monthLabel}
                              className={`hover:bg-muted/50 transition-colors cursor-pointer ${isSelected ? "bg-primary/5 font-semibold" : ""}`}
                              onClick={() => applyMonth(String(m.month), String(m.year))}
                            >
                              <td className="px-4 py-3 font-medium text-foreground">
                                <div className="flex items-center gap-2">
                                  <span>{m.monthLabel}</span>
                                  {isSelected && <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">Selected</Badge>}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                                ৳{fmt(m.openingBalance)}
                              </td>
                              <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                                +৳{fmt(m.inflow)}
                              </td>
                              <td className="px-4 py-3 text-right text-rose-500 font-medium tabular-nums">
                                -৳{fmt(m.outflow)}
                              </td>
                              <td className={`px-4 py-3 text-right font-medium tabular-nums ${m.netChange >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                {fmtSigned(m.netChange)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                                ৳{fmt(m.closingBalance)}
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

            {/* ── Account Situation Table ── */}
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
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opening</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inflow</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Outflow</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Closing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.accountSummary.map(acct => {
                          return (
                            <tr key={acct.accountId} className="hover:bg-muted/40 transition-colors">
                              <td className="px-4 py-3 font-semibold text-foreground">{acct.accountName}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">৳{fmt(acct.openingBalance)}</td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">+৳{fmt(acct.inflow)}</td>
                              <td className="px-4 py-3 text-right font-medium text-rose-600 dark:text-rose-400 tabular-nums">-৳{fmt(acct.outflow)}</td>
                              <td className={`px-4 py-3 text-right font-bold tabular-nums ${acct.closingBalance >= 0 ? "text-foreground" : "text-rose-600"}`}>
                                ৳{fmt(acct.closingBalance)}
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

            {/* ── Balanced Inflow & Outflow Allocation Tables (Side by Side) ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Cash Inflow & Available Funds — Left Table */}
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3 bg-emerald-50/30 dark:bg-emerald-950/20 border-b border-border">
                  <CardTitle className="flex items-center justify-between gap-2 text-base flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span>Cash Inflow & Available Funds</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 border-0 font-bold text-xs py-1 px-2.5">
                      Total Available: ৳{fmt(totalAvailableInflow)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-border bg-muted/30">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source / Account / Project</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {/* Section Header 1: Opening Balances */}
                        <tr className="bg-emerald-50/40 dark:bg-emerald-950/30">
                          <td colSpan={2} className="px-4 py-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wider">
                            Opening Balances Brought Forward (By Account)
                          </td>
                        </tr>

                        {data.accountSummary.map((acct) => (
                          <tr key={`opening-${acct.accountId}`} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2 text-xs pl-6">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-medium text-foreground">{acct.accountName}</span>
                                <span className="text-[10px] text-muted-foreground">(Opening)</span>
                              </div>
                            </td>
                            <td className={`px-4 py-2 text-right font-semibold tabular-nums text-xs ${acct.openingBalance >= 0 ? "text-foreground" : "text-rose-600"}`}>
                              ৳{fmt(acct.openingBalance)}
                            </td>
                          </tr>
                        ))}

                        {/* Subtotal Opening Balance */}
                        <tr className="bg-emerald-50/60 dark:bg-emerald-950/40 font-bold border-t border-border">
                          <td className="px-4 py-2 text-xs text-emerald-900 dark:text-emerald-100">Total Opening Balance</td>
                          <td className="px-4 py-2 text-right text-xs text-emerald-700 dark:text-emerald-300 tabular-nums">৳{fmt(data.openingBalance)}</td>
                        </tr>

                        {/* Section Header 2: Cash Inflows */}
                        <tr className="bg-muted/50 border-t border-border">
                          <td colSpan={2} className="px-4 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            Cash Inflows Received (Projects & Sources)
                          </td>
                        </tr>

                        {data.inflow.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-4 py-4 text-center text-xs text-muted-foreground">No inflow transactions for this period.</td>
                          </tr>
                        ) : (
                          data.inflow.map((row) => (
                            <tr
                              key={row.groupKey}
                              className="hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => openModal(row, "inflow")}
                            >
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="font-semibold text-foreground">{row.leadName}</span>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                    {row.txCount} tx
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                                +৳{fmt(row.amount)}
                              </td>
                            </tr>
                          ))
                        )}

                        {/* Subtotal Cash Inflow */}
                        <tr className="bg-emerald-50/60 dark:bg-emerald-950/40 font-bold border-t border-border">
                          <td className="px-4 py-2 text-xs text-emerald-800 dark:text-emerald-200">Total Cash Inflow</td>
                          <td className="px-4 py-2 text-right text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">+৳{fmt(data.totalInflow)}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-emerald-100/50 dark:bg-emerald-950/60">
                          <td className="px-4 py-3 font-extrabold text-sm text-foreground">
                            Total Available Cash <span className="text-xs font-normal text-muted-foreground">(Opening + Cash Inflow)</span>
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-emerald-700 dark:text-emerald-300 text-base tabular-nums">
                            ৳{fmt(totalAvailableInflow)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Cash Outflow & Closing Allocation — Right Table */}
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3 bg-rose-50/30 dark:bg-rose-950/20 border-b border-border">
                  <CardTitle className="flex items-center justify-between gap-2 text-base flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shrink-0">
                        <ArrowDownRight className="h-4 w-4 text-rose-600" />
                      </div>
                      <span>Cash Outflow & Closing Allocation</span>
                    </div>
                    {/* Total Allocation Badge (Total Outflow + Closing Balance) */}
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs py-1 px-2.5">
                      Total Allocation: ৳{fmt(totalOutflowAndClosingAllocation)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-border bg-muted/30">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Allocated Project / Account</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {/* Section Header 1: Cash Outflows */}
                        <tr className="bg-rose-50/40 dark:bg-rose-950/30">
                          <td colSpan={2} className="px-4 py-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                            Cash Outflows (Expenses & Payments)
                          </td>
                        </tr>

                        {data.outflow.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-4 py-4 text-center text-xs text-muted-foreground">No outflow transactions for this period.</td>
                          </tr>
                        ) : (
                          data.outflow.map((row) => (
                            <tr
                              key={row.groupKey}
                              className="hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => openModal(row, "outflow")}
                            >
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                                  <span className="font-semibold text-foreground">{row.leadName}</span>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                    {row.txCount} tx
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums text-sm">
                                -৳{fmt(row.amount)}
                              </td>
                            </tr>
                          ))
                        )}

                        {/* Subtotal Cash Outflow */}
                        <tr className="bg-rose-50/60 dark:bg-rose-950/40 font-bold border-t border-border">
                          <td className="px-4 py-2 text-xs text-rose-800 dark:text-rose-200">Total Cash Outflow</td>
                          <td className="px-4 py-2 text-right text-xs text-rose-600 dark:text-rose-400 tabular-nums">-৳{fmt(data.totalOutflow)}</td>
                        </tr>

                        {/* Section Header 2: Closing Balances By Account */}
                        <tr className="bg-muted/50 border-t border-border">
                          <td colSpan={2} className="px-4 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            Closing Balances Remaining (By Account)
                          </td>
                        </tr>

                        {data.accountSummary.map((acct) => (
                          <tr key={`closing-${acct.accountId}`} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2 text-xs pl-6">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                                <span className="font-medium text-foreground">{acct.accountName}</span>
                                <span className="text-[10px] text-muted-foreground">(Closing)</span>
                              </div>
                            </td>
                            <td className={`px-4 py-2 text-right font-semibold tabular-nums text-xs ${acct.closingBalance >= 0 ? "text-foreground" : "text-rose-600"}`}>
                              ৳{fmt(acct.closingBalance)}
                            </td>
                          </tr>
                        ))}

                        {/* Subtotal Closing Balance */}
                        <tr className="bg-muted/60 font-bold border-t border-border">
                          <td className="px-4 py-2 text-xs text-foreground">Total Closing Balance</td>
                          <td className="px-4 py-2 text-right text-xs text-foreground tabular-nums">৳{fmt(data.closingBalance)}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-primary/10">
                          <td className="px-4 py-3 font-extrabold text-sm text-foreground">
                            Total Allocation <span className="text-xs font-normal text-muted-foreground">(Outflow + Closing Balance)</span>
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-primary text-base tabular-nums">
                            ৳{fmt(totalOutflowAndClosingAllocation)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Net Balance & Balanced Equation Banner ── */}
            <Card className="border-2 border-emerald-500/30 shadow-sm bg-card">
              <CardContent className="py-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm text-foreground font-bold">Balanced Cash Flow Equation — {periodLabel}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium flex-wrap text-muted-foreground mt-1">
                      <span>Opening (<strong>৳{fmt(data.openingBalance)}</strong>)</span>
                      <span>+</span>
                      <span>Inflow (<strong className="text-emerald-600">৳{fmt(data.totalInflow)}</strong>)</span>
                      <span>=</span>
                      <span className="font-extrabold text-emerald-600">Total Available (৳{fmt(totalAvailableInflow)})</span>
                      <span className="mx-1.5 text-foreground font-bold">≡</span>
                      <span>Outflow (<strong className="text-rose-600">৳{fmt(data.totalOutflow)}</strong>)</span>
                      <span>+</span>
                      <span>Closing (<strong>৳{fmt(data.closingBalance)}</strong>)</span>
                      <span>=</span>
                      <span className="font-extrabold text-primary">Total Allocation (৳{fmt(totalOutflowAndClosingAllocation)})</span>
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-center border border-emerald-200 dark:border-emerald-800">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Total Available Cash</p>
                      <p className="text-base font-extrabold text-emerald-600 tabular-nums">৳{fmt(totalAvailableInflow)}</p>
                    </div>
                    <div className="rounded-lg bg-primary/10 px-4 py-2.5 text-center border border-primary/20">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Total Allocation</p>
                      <p className="text-base font-extrabold text-primary tabular-nums">৳{fmt(totalOutflowAndClosingAllocation)}</p>
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
        <DialogContent className="max-w-6xl w-full max-h-[92vh] overflow-y-auto">
          {modalRow && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4 w-full pr-6">
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${modalType === "inflow" ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-rose-100 dark:bg-rose-900/50"}`}>
                      {modalType === "inflow"
                        ? <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        : <ArrowDownRight className="h-4 w-4 text-rose-600" />}
                    </div>
                    <span>{modalRow.leadName}</span>
                    <Badge variant="outline" className="ml-2 font-normal text-xs">
                      {modalRow.txCount} {modalRow.txCount === 1 ? "transaction" : "transactions"}
                    </Badge>
                  </DialogTitle>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs shrink-0"
                    onClick={() => void handleDownloadModalPDF()}
                  >
                    <FileDown className="w-3.5 h-3.5 text-primary" />
                    Download PDF
                  </Button>
                </div>
              </DialogHeader>

              {/* Modal summary header */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border my-2">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Amount ({modalType === "inflow" ? "Inflow" : "Outflow"})</p>
                  <p className={`text-2xl font-extrabold tabular-nums ${modalType === "inflow" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    ৳{fmt(modalRow.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="text-xs font-semibold">{periodLabel}</p>
                </div>
              </div>

              {/* Transactions table */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="px-3.5 py-2.5 text-left">Date</th>
                      <th className="px-3.5 py-2.5 text-left">Particulars</th>
                      <th className="px-3.5 py-2.5 text-left">Account</th>
                      <th className="px-3.5 py-2.5 text-left">Category</th>
                      <th className="px-3.5 py-2.5 text-left">Voucher</th>
                      <th className="px-3.5 py-2.5 text-center">Attachment</th>
                      <th className="px-3.5 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {modalRow.transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3.5 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(tx.date)}</td>
                        <td className="px-3.5 py-2.5 font-medium text-foreground max-w-[240px]">
                          <div className="truncate" title={tx.particular}>{tx.particular}</div>
                          {tx.collectedBy && (
                            <div className="text-[11px] text-muted-foreground">Collector: {tx.collectedBy}</div>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-xs text-foreground">
                          {tx.accountName}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-normal">
                            {tx.categoryLabel}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-2.5 text-xs text-muted-foreground font-mono">
                          {tx.voucherNo ?? "—"}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {tx.imageUrl ? (
                            <a
                              href={tx.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded transition-colors hover:underline"
                            >
                              <Paperclip className="h-3 w-3" />
                              View Attachment
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className={`px-3.5 py-2.5 text-right font-bold tabular-nums ${modalType === "inflow" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          ৳{fmt(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`border-t-2 border-border ${modalType === "inflow" ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-rose-50 dark:bg-rose-950/30"}`}>
                      <td className="px-3.5 py-2.5 font-bold text-sm" colSpan={6}>Total</td>
                      <td className={`px-3.5 py-2.5 text-right font-bold tabular-nums text-base ${modalType === "inflow" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
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
