'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileDown, Loader2, MapPin, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const CATEGORY_LABELS: Record<string, string> = {
  CLIENT_DEPOSIT: 'Client Deposit',
  MATERIAL_COST: 'Material Cost',
  LABOR_COST: 'Labor Cost',
  CONVEYANCE: 'Conveyance',
  OFFICE_EXPENSE: 'Office Expense',
  MISC: 'Miscellaneous',
  FEE_COLLECTION: 'Fee Collection',
  OFFICE_RENT: 'Office Rent',
  SALARY: 'Staff Salary',
  SALARY_ADVANCE: 'Salary Advance',
  BONUS: 'Bonus',
  ELECTRICITY_BILL: 'Electricity Bill',
  WATER_BILL: 'Water Bill',
  INTERNET_BILL: 'Internet Bill',
  FOOD_ALLOWANCE: 'Food Allowance',
  CLIENT_ENTERTAINMENT: 'Client Food & Entertainment',
  PROMOTION: 'Marketing & Promotion',
  MOBILE_RECHARGE: 'Mobile Recharge',
  OCTANE_FUEL: 'Octane & Fuel',
  DONATION: 'Donation',
  BOARD_MATERIAL: 'Board Material (Site/Factory)',
  PASTING_BILL: 'Pasting Bill',
  FARING: 'Faring',
  HPL: 'HPL',
  LINER: 'Liner',
  LUBER: 'Luber',
  ACRYLIC: 'Acrylic',
  HARDWARE: 'Hardware',
  ELECTRIC_ITEM: 'Electric Items',
  LIGHTING: 'Lighting',
  GLASS: 'Glass',
  TRANSPORT_COST: 'Transport & Labor Cost',
  SITE_EXPENSE: 'Site Expense',
  FACTORY_PAYMENT: 'Factory Payment',
  CARPENTER_PAYMENT: 'Carpenter Payment',
  PAINT_MATERIALS: 'Paint Materials',
  PAINT_PAYMENT: 'Paint Payment',
  CEILING_PAYMENT: 'Ceiling Payment',
  DOOR: 'Door Purchase',
  PLUMBER_PAYMENT: 'Plumber Payment',
  TILES_PURCHASE: 'Tiles Purchase',
  FOLDING_DOOR: 'Folding Door',
  GLASS_PROFILE: 'Glass Profile',
  CIVIL_WORK: 'Civil Work',
  OTHERS: 'Other Expenses',
}

function formatCategory(cat: string) {
  return CATEGORY_LABELS[cat] || cat
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modalFilter, setModalFilter] = useState<{ type: 'CATEGORY' | 'INFLOW' | 'OUTFLOW', value?: string } | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/finance/reports?mode=project&leadId=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setReport(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const totalExpense = report
    ? ((Object.values(report.categoryTotals || {}) as number[]).reduce((a, b) => a + b, 0))
    : 0

  const agreementValue = report?.project?.agreementValue ?? report?.project?.budget ?? null
  const totalPaid = report?.totalPaid ?? 0
  const due = agreementValue !== null ? agreementValue - totalPaid : null
  const profit = agreementValue !== null ? agreementValue - totalExpense : null

  const project = report?.project ?? null

  const totalInflow = totalPaid
  const totalOutflow = totalExpense
  const netResult = totalInflow - totalOutflow

  const filteredTransactions = modalFilter
    ? report?.transactions?.filter((tx: any) => {
        if (modalFilter.type === 'CATEGORY') return tx.category === modalFilter.value
        if (modalFilter.type === 'INFLOW') return tx.type === 'INFLOW'
        if (modalFilter.type === 'OUTFLOW') return tx.type === 'OUTFLOW'
        return false
      }) || []
    : []

  const modalTotalInflow = filteredTransactions
    .filter((tx: any) => tx.type === 'INFLOW')
    .reduce((sum: number, tx: any) => sum + tx.amount, 0)

  const modalTotalOutflow = filteredTransactions
    .filter((tx: any) => tx.type === 'OUTFLOW')
    .reduce((sum: number, tx: any) => sum + tx.amount, 0)

  const handleDownloadModalPDF = async () => {
    if (!modalFilter) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'portrait' })
    const pageW = doc.internal.pageSize.getWidth()
    const clientName = project?.name || 'Unknown Client'
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    let filterTitle = ''
    if (modalFilter.type === 'CATEGORY') filterTitle = `Transactions for ${formatCategory(modalFilter.value || '')}`
    if (modalFilter.type === 'INFLOW') filterTitle = 'Inflow Transactions'
    if (modalFilter.type === 'OUTFLOW') filterTitle = 'Outflow Transactions'

    const logoImg = new Image()
    logoImg.src = "/Logo/HeaderLogo.png"
    await new Promise((resolve) => {
      logoImg.onload = resolve
      logoImg.onerror = resolve
    })

    // Header Logo
    doc.addImage(logoImg, "PNG", 14, 14, 43.2, 8)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('PROJECT LEDGER', pageW - 14, 18, { align: 'right' })

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(`Date: ${today}`, pageW - 14, 23, { align: 'right' })

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(clientName, 14, 35)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    let detailsY = 41
    doc.text(`Filter: ${filterTitle}`, 14, detailsY)
    
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(14, detailsY + 2, pageW - 14, detailsY + 2)

    let afterCatY = detailsY + 5

    const bodyRows = filteredTransactions.map((tx: any) => {
      const isInflow = tx.type === 'INFLOW'
      return [
        { content: new Date(tx.date).toLocaleDateString('en-GB') },
        { content: formatCategory(tx.category) },
        { content: tx.particular || '—' },
        {
          content: isInflow ? tx.amount.toLocaleString() : '—',
          styles: { textColor: isInflow ? [5, 150, 105] : [160, 160, 160], fontStyle: isInflow ? 'bold' : 'normal', halign: 'right' },
        },
        {
          content: !isInflow ? tx.amount.toLocaleString() : '—',
          styles: { textColor: !isInflow ? [220, 38, 38] : [160, 160, 160], fontStyle: !isInflow ? 'bold' : 'normal', halign: 'right' },
        },
      ]
    })

    autoTable(doc, {
      startY: afterCatY + 10,
      head: [['Date', 'Category', 'Particulars', 'Inflow', 'Outflow']],
      body: bodyRows,
      foot: [
        [
          { content: 'Total Inflow', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: modalTotalInflow.toLocaleString(), styles: { halign: 'right', textColor: [5, 150, 105], fontStyle: 'bold' } },
          { content: '—', styles: { halign: 'right', textColor: [160, 160, 160] } },
        ],
        [
          { content: 'Total Outflow', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: '—', styles: { halign: 'right', textColor: [160, 160, 160] } },
          { content: modalTotalOutflow.toLocaleString(), styles: { halign: 'right', textColor: [220, 38, 38], fontStyle: 'bold' } },
        ]
      ],
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 3, right: 3 } },
      bodyStyles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
      footStyles: { fillColor: [241, 245, 249], fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 3, right: 3 } },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
      },
    })
    
    doc.save(`project-ledger-${filterTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`)
  }

  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'portrait' })
    const pageW = doc.internal.pageSize.getWidth()
    const clientName = project?.name || 'Unknown Client'
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

    const logoImg = new Image()
    logoImg.src = "/Logo/HeaderLogo.png"
    await new Promise((resolve) => {
      logoImg.onload = resolve
      logoImg.onerror = resolve
    })

    // Header Logo
    doc.addImage(logoImg, "PNG", 14, 14, 43.2, 8)

    // Bill Title / Info right aligned
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('PROJECT LEDGER', pageW - 14, 18, { align: 'right' })

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(`Date: ${today}`, pageW - 14, 23, { align: 'right' })

    // Client Info Section
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(clientName, 14, 35)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    let detailsY = 41
    if (project?.location) {
      doc.text(`Location: ${project.location}`, 14, detailsY)
      detailsY += 5
    }
    if (project?.phone) {
      doc.text(`Phone: ${project.phone}`, 14, detailsY)
      detailsY += 5
    }

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(14, detailsY + 2, pageW - 14, detailsY + 2)

    let afterCatY = detailsY + 8

    // ── Section 1: Category-wise Spending ────────────────────────────────────
    const catEntries = Object.entries(report.categoryTotals || {}) as [string, number][]
    if (catEntries.length > 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('CATEGORY SUMMARY', 14, afterCatY + 5)

      autoTable(doc, {
        startY: afterCatY + 8,
        head: [['Category', 'Amount (BDT)']],
        body: catEntries
          .sort((a, b) => b[1] - a[1])
          .map(([cat, val]) => [
            formatCategory(cat),
            { content: val.toLocaleString(), styles: { textColor: [30, 41, 59], fontStyle: 'bold', halign: 'right' } },
          ]),
        foot: [[
          { content: 'TOTAL EXPENSE', styles: { fontStyle: 'bold' } },
          { content: totalExpense.toLocaleString(), styles: { fontStyle: 'bold', halign: 'right' } },
        ]],
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        footStyles: { fillColor: [241, 245, 249], fontSize: 8.5 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 50, halign: 'right' },
        },
      })
      afterCatY = (doc as any).lastAutoTable?.finalY ?? (afterCatY + 8)
    }

    // ── Section 2: Full Transaction Table ────────────────────────────────────
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('TRANSACTIONS', 14, afterCatY + 10)

    const txs: any[] = report.transactions || []
    // Sort: INFLOW first, then by date
    const sorted = [...txs].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'INFLOW' ? -1 : 1
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

    const bodyRows: any[] = []
    let lastGroupKey = ''
    sorted.forEach((tx, idx) => {
      const groupKey = tx.type
      if (groupKey !== lastGroupKey) {
        lastGroupKey = groupKey
        bodyRows.push([{
          content: `${tx.type === 'INFLOW' ? '▲ INFLOW' : '▼ OUTFLOW'}`,
          colSpan: 5,
          styles: {
            fillColor: [241, 245, 249],
            textColor: [71, 85, 105],
            fontStyle: 'bold',
            fontSize: 7.5,
          },
        }])
      }
      const isInflow = tx.type === 'INFLOW'
      bodyRows.push([
        { content: new Date(tx.date).toLocaleDateString('en-GB') },
        { content: formatCategory(tx.category) },
        { content: tx.particular || '—' },
        {
          content: isInflow ? tx.amount.toLocaleString() : '—',
          styles: { textColor: isInflow ? [5, 150, 105] : [160, 160, 160], fontStyle: isInflow ? 'bold' : 'normal', halign: 'right' },
        },
        {
          content: !isInflow ? tx.amount.toLocaleString() : '—',
          styles: { textColor: !isInflow ? [220, 38, 38] : [160, 160, 160], fontStyle: !isInflow ? 'bold' : 'normal', halign: 'right' },
        },
      ])
    })

    autoTable(doc, {
      startY: afterCatY + 14,
      head: [['Date', 'Category', 'Particulars', 'Inflow', 'Outflow']],
      body: bodyRows,
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 3, right: 3 } },
      bodyStyles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
      },
      didDrawPage: () => {
        const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber
        if (pageNum > 1) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(30, 41, 59)
          doc.text('PROJECT LEDGER', 14, 10)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 116, 139)
          doc.text(`${clientName}  |  Page ${pageNum}`, pageW - 14, 10, { align: 'right' })
          doc.setDrawColor(226, 232, 240)
          doc.setLineWidth(0.5)
          doc.line(14, 12, pageW - 14, 12)
        }
      },
    })

    // ── Summary — last page only ──────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable.finalY + 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('FINANCIAL SUMMARY', 14, finalY + 5)

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(14, finalY + 7, pageW - 14, finalY + 7)

    let summaryY = finalY + 12

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text('Agreement Value:', 14, summaryY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(agreementValue !== null ? `${agreementValue.toLocaleString()} BDT` : 'Not Defined', 60, summaryY)

    summaryY += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text('Total Inflow:', 14, summaryY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(5, 150, 105)
    doc.text(`${totalInflow.toLocaleString()} BDT`, 60, summaryY)

    summaryY += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text('Total Outflow:', 14, summaryY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38)
    doc.text(`${totalOutflow.toLocaleString()} BDT`, 60, summaryY)

    summaryY += 8
    doc.setDrawColor(226, 232, 240)
    doc.line(14, summaryY - 3, 100, summaryY - 3)

    const pc: [number, number, number] = netResult >= 0 ? [5, 150, 105] : [220, 38, 38]
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...pc)
    doc.text(netResult >= 0 ? 'Net Profit:' : 'Net Loss:', 14, summaryY)
    doc.setFont('helvetica', 'bold')
    doc.text(`${netResult.toLocaleString()} BDT`, 60, summaryY)

    if (due !== null) {
      summaryY += 6
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(due > 0 ? 220 : 5, due > 0 ? 38 : 150, due > 0 ? 38 : 105)
      doc.text('Payment Due:', 14, summaryY)
      doc.setFont('helvetica', 'bold')
      doc.text(`${due.toLocaleString()} BDT`, 60, summaryY)
    }

    doc.setTextColor(0, 0, 0)
    const safeClientName = clientName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    doc.save(`project-ledger-${safeClientName}.pdf`)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Custom Project Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {project?.name ?? 'Project Ledger'}
            </h1>
            {project && (
              <div className="mt-1 flex flex-col gap-0.5">
                {project.phone && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3 shrink-0" />
                    {project.phone}
                  </span>
                )}
                {project.location && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {project.location}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
            </span>
            {report && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => void handleDownloadPDF()}
              >
                <FileDown className="w-4 h-4" />
                Download PDF
              </Button>
            )}
          </div>
        </div>
      </header>
      <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-8 flex-1 w-full mx-auto">
        {/* Back button */}
        <div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Button>
        </div>

        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Loading ledger...</p>
          </div>
        ) : !report ? (
          <div className="text-center py-12 text-muted-foreground">Failed to load project data.</div>
        ) : (
          <>
            {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground mb-1">Agreement Value / Budget</div>
                <div className="text-xl font-bold">
                  {agreementValue !== null ? `${agreementValue.toLocaleString()} BDT` : 'Not Defined'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground mb-1">Total Paid (Deposits)</div>
                <div className="text-xl font-bold text-emerald-500">
                  {totalPaid.toLocaleString()} BDT
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground mb-1">Payment Due</div>
                <div className={`text-xl font-bold ${due !== null && due > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {due !== null ? `${due.toLocaleString()} BDT` : 'N/A'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground mb-1">Site Expense Logged</div>
                <div className="text-xl font-bold text-rose-500">
                  {totalExpense.toLocaleString()} BDT
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <div className="text-xs text-muted-foreground">Profit Margin Estimate</div>
                  {profit !== null && profit < 0 && (
                    <Badge variant="destructive" className="h-5 text-[10px] uppercase font-bold px-1.5 py-0">LOSS</Badge>
                  )}
                </div>
                <div className={`text-xl font-bold ${profit !== null && profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {profit !== null ? `${profit.toLocaleString()} BDT` : 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          {Object.keys(report.categoryTotals || {}).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category-wise Spending Breakdown</CardTitle>
                <CardDescription>Total amount spent per expense category.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Object.entries(report.categoryTotals || {}).map(([cat, val]: any) => (
                    <div
                      key={cat}
                      className="p-3 border border-border rounded-lg bg-muted/30 flex flex-col gap-1 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setModalFilter({ type: 'CATEGORY', value: cat })}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-muted-foreground font-medium leading-tight">
                          {formatCategory(cat)}
                        </span>
                        {totalExpense > 0 && (
                          <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                            {((val / totalExpense) * 100).toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-bold tabular-nums">{val.toLocaleString()} BDT</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw Transaction Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Raw Logs for this Site</CardTitle>
              <CardDescription>All transactions recorded for this project.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto rounded-b-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Particulars</th>
                      <th className="p-3">Account</th>
                      <th className="p-3">Recorder</th>
                      <th className="p-3 text-center">Image</th>
                      <th 
                        className="p-3 text-right text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline"
                        onClick={() => setModalFilter({ type: 'INFLOW' })}
                      >
                        Inflow
                      </th>
                      <th 
                        className="p-3 text-right text-rose-600 dark:text-rose-400 cursor-pointer hover:underline"
                        onClick={() => setModalFilter({ type: 'OUTFLOW' })}
                      >
                        Outflow
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.transactions?.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No transaction logs found for this project.
                        </td>
                      </tr>
                    ) : (
                      report.transactions?.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="p-3">
                            <Badge 
                              variant="outline" 
                              className="font-normal text-xs cursor-pointer hover:bg-muted transition-colors"
                              onClick={() => setModalFilter({ type: 'CATEGORY', value: tx.category })}
                            >
                              {formatCategory(tx.category)}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm max-w-[150px] lg:max-w-[250px] truncate" title={tx.particular}>
                            {tx.particular}
                          </td>
                          <td className="p-3 text-xs">{tx.financeAccount?.name || 'Unknown'}</td>
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{tx.recordedBy?.fullName || 'Unknown'}</td>
                          <td className="p-3 text-xs text-center">
                            {tx.imageUrl ? (
                              <a href={tx.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center text-blue-500 hover:text-blue-700 transition-colors">
                                View
                              </a>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {tx.type === 'INFLOW' ? `${tx.amount.toLocaleString()} BDT` : '-'}
                          </td>
                          <td className="p-3 text-right font-bold tabular-nums text-rose-500">
                            {tx.type === 'OUTFLOW' ? `${tx.amount.toLocaleString()} BDT` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {report.transactions?.length > 0 && (
                    <tfoot className="border-t-2 border-border bg-muted/50">
                      <tr className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setModalFilter({ type: 'INFLOW' })}>
                        <td colSpan={6} className="p-3 font-bold text-sm text-right">Total Inflow</td>
                        <td className="p-3 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400 text-sm">
                          {totalPaid.toLocaleString()} BDT
                        </td>
                        <td className="p-3 text-right text-muted-foreground">-</td>
                      </tr>
                      <tr className="border-t border-border cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setModalFilter({ type: 'OUTFLOW' })}>
                        <td colSpan={6} className="p-3 font-bold text-sm text-right">Total Outflow</td>
                        <td className="p-3 text-right text-muted-foreground">-</td>
                        <td className="p-3 text-right font-bold tabular-nums text-rose-500 text-sm">
                          {totalExpense.toLocaleString()} BDT
                        </td>
                      </tr>
                      {profit !== null && (
                        <tr className="border-t-2 border-border">
                          <td colSpan={6} className="p-3 font-bold text-sm text-right">
                            {profit >= 0 ? 'Total Profit' : 'Total Loss'}
                          </td>
                          <td colSpan={2} className={`p-3 text-right font-bold tabular-nums text-sm ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {profit.toLocaleString()} BDT
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      </div>

      <Dialog open={!!modalFilter} onOpenChange={(open) => !open && setModalFilter(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
            <DialogTitle>
              {modalFilter?.type === 'CATEGORY' && `Transactions for ${formatCategory(modalFilter.value || '')}`}
              {modalFilter?.type === 'INFLOW' && 'Inflow Transactions'}
              {modalFilter?.type === 'OUTFLOW' && 'Outflow Transactions'}
            </DialogTitle>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => void handleDownloadModalPDF()}>
              <FileDown className="w-4 h-4" />
              Download PDF
            </Button>
          </DialogHeader>
          <div className="overflow-x-auto rounded-lg border border-border mt-4">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Particulars</th>
                  <th className="p-3">Account</th>
                  <th className="p-3 text-center">Image</th>
                  <th className="p-3 text-right">Inflow (BDT)</th>
                  <th className="p-3 text-right">Outflow (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant="outline" 
                          className="font-normal text-xs cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setModalFilter({ type: 'CATEGORY', value: tx.category })}
                        >
                          {formatCategory(tx.category)}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm max-w-[150px] lg:max-w-[250px] truncate" title={tx.particular}>
                        {tx.particular}
                      </td>
                      <td className="p-3 text-xs">{tx.financeAccount?.name || 'Unknown'}</td>
                      <td className="p-3 text-xs text-center">
                        {tx.imageUrl ? (
                          <a href={tx.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center text-blue-500 hover:text-blue-700 transition-colors">
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {tx.type === 'INFLOW' ? `${tx.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-right font-bold tabular-nums text-rose-500">
                        {tx.type === 'OUTFLOW' ? `${tx.amount.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredTransactions.length > 0 && (
                <tfoot className="border-t-2 border-border bg-muted/50">
                  <tr>
                    <td colSpan={5} className="p-3 font-bold text-sm text-right">Total Inflow</td>
                    <td className="p-3 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400 text-sm">
                      {modalTotalInflow.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">-</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td colSpan={5} className="p-3 font-bold text-sm text-right">Total Outflow</td>
                    <td className="p-3 text-right text-muted-foreground">-</td>
                    <td className="p-3 text-right font-bold tabular-nums text-rose-500 text-sm">
                      {modalTotalOutflow.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
