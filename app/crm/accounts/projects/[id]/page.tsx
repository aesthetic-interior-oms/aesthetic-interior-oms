'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileDown, Loader2, MapPin, Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker'

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

  // Date range filter state
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    setLoading(true)

    let url = `/api/finance/reports?mode=project&leadId=${id}`
    if (dateRange?.from) {
      const fromStr = `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, '0')}-${String(dateRange.from.getDate()).padStart(2, '0')}`
      url += `&startDate=${fromStr}`
    }
    if (dateRange?.to) {
      const toStr = `${dateRange.to.getFullYear()}-${String(dateRange.to.getMonth() + 1).padStart(2, '0')}-${String(dateRange.to.getDate()).padStart(2, '0')}`
      url += `&endDate=${toStr}`
    }

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setReport(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id, dateRange])

  // All financial values and filtered transactions are pre-calculated by backend API
  const isDateFiltered = Boolean(report?.isFiltered || dateRange?.from || dateRange?.to)
  const agreementValue = report?.agreementValue ?? report?.project?.agreementValue ?? report?.project?.budget ?? null
  const displayTotalPaid = report?.totalPaid ?? 0
  const displayTotalExpense = report?.totalOutflow ?? 0
  const displayDue = report?.paymentDue ?? (agreementValue !== null ? agreementValue - displayTotalPaid : null)
  const displayProfit = report?.profitEstimate ?? (agreementValue !== null ? agreementValue - displayTotalExpense : null)

  const activeCategoryTotals = report?.categoryTotals || {}
  const filteredTransactionsByDate = report?.transactions || []
  const activeTotalInflow = report?.totalInflow ?? 0
  const activeTotalOutflow = report?.totalOutflow ?? 0

  const project = report?.project ?? null
  const netResult = displayTotalPaid - displayTotalExpense

  const setPresetRange = (preset: 'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_7_DAYS' | 'LAST_30_DAYS') => {
    const today = new Date()
    if (preset === 'ALL') {
      setDateRange(undefined)
      return
    }
    if (preset === 'TODAY') {
      const from = new Date(today)
      from.setHours(0, 0, 0, 0)
      const to = new Date(today)
      to.setHours(23, 59, 59, 999)
      setDateRange({ from, to })
      return
    }
    if (preset === 'THIS_MONTH') {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      const to = new Date(today)
      to.setHours(23, 59, 59, 999)
      setDateRange({ from, to })
      return
    }
    if (preset === 'LAST_7_DAYS') {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      from.setHours(0, 0, 0, 0)
      const to = new Date(today)
      to.setHours(23, 59, 59, 999)
      setDateRange({ from, to })
      return
    }
    if (preset === 'LAST_30_DAYS') {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      from.setHours(0, 0, 0, 0)
      const to = new Date(today)
      to.setHours(23, 59, 59, 999)
      setDateRange({ from, to })
      return
    }
  }

  const filteredTransactions = modalFilter
    ? filteredTransactionsByDate.filter((tx: any) => {
        if (modalFilter.type === 'CATEGORY') return tx.category === modalFilter.value
        if (modalFilter.type === 'INFLOW') return tx.type === 'INFLOW'
        if (modalFilter.type === 'OUTFLOW') return tx.type === 'OUTFLOW'
        return false
      })
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
    if (project?.location) {
      doc.text(`Location: ${project.location}`, 14, detailsY)
      detailsY += 5
    }
    if (project?.phone) {
      doc.text(`Phone: ${project.phone}`, 14, detailsY)
      detailsY += 5
    }
    doc.text(`Filter: ${filterTitle}`, 14, detailsY)
    detailsY += 5

    // Agreement Value / Budget at top in bold
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    const formattedAgreement = agreementValue !== null ? `${agreementValue.toLocaleString()} BDT` : 'Not Defined'
    doc.text(`Agreement Value / Budget: ${formattedAgreement}`, 14, detailsY)
    detailsY += 6

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(14, detailsY + 2, pageW - 14, detailsY + 2)

    let afterCatY = detailsY + 5

    const bodyRows = filteredTransactions.map((tx: any) => {
      const isInflow = tx.type === 'INFLOW'
      const accountName = tx.financeAccount?.name || '—'
      return [
        { content: new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
        { content: formatCategory(tx.category) },
        { content: accountName },
        {
          content: isInflow ? tx.amount.toLocaleString() : '—',
          styles: { textColor: isInflow ? [5, 150, 105] : [100, 100, 100], fontStyle: isInflow ? 'bold' : 'normal', halign: 'right' },
        },
        {
          content: !isInflow ? tx.amount.toLocaleString() : '—',
          styles: { textColor: !isInflow ? [220, 38, 38] : [100, 100, 100], fontStyle: !isInflow ? 'bold' : 'normal', halign: 'right' },
        },
      ]
    })

    const modalInflowPercent = agreementValue && agreementValue > 0 ? ((modalTotalInflow / agreementValue) * 100).toFixed(1) : null

    autoTable(doc, {
      startY: afterCatY + 10,
      head: [['Date', 'Category', 'Account', 'Inflow', 'Outflow']],
      body: bodyRows as any[],
      theme: 'grid',
      foot: [
        [
          { content: 'Total Inflow (Period)', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: [30, 41, 59] } },
          {
            content: `${modalTotalInflow.toLocaleString()} BDT${modalInflowPercent ? ` (${modalInflowPercent}% of Agreement)` : ''}`,
            colSpan: 2,
            styles: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] }
          },
        ],
        [
          { content: 'Total Outflow (Period)', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: [30, 41, 59] } },
          {
            content: `${modalTotalOutflow.toLocaleString()} BDT`,
            colSpan: 2,
            styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] }
          },
        ],
        [
          { content: 'Payment Due', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: [30, 41, 59] } },
          {
            content: displayDue !== null ? `${displayDue.toLocaleString()} BDT` : 'N/A',
            colSpan: 2,
            styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] }
          },
        ],
      ],
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold', 
        fontSize: 9,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      bodyStyles: { 
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 8.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      footStyles: { 
        fillColor: [248, 250, 252],
        textColor: [0, 0, 0],
        fontSize: 8.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 1) {
          data.cell.text = [] // Hide text for custom badge drawing
        }
      },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 1) {
          const rawContent = data.cell.raw.content || data.cell.raw
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          const textW = doc.getTextWidth(rawContent)
          const badgeH = 5
          const badgeW = textW + 4
          const x = data.cell.x + 2
          const y = data.cell.y + (data.cell.height - badgeH) / 2
          
          doc.setFillColor(241, 245, 249)
          doc.setDrawColor(203, 213, 225)
          doc.setLineWidth(0.3)
          doc.roundedRect(x, y, badgeW, badgeH, 1, 1, 'FD')
          
          doc.setTextColor(71, 85, 105)
          doc.text(rawContent, x + 2, y + 3.5)
        }
      }
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

    // Build date filter label for header
    const fmtD = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

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
    doc.text(`Generated Date: ${today}`, pageW - 14, 23, { align: 'right' })

    // Start Date & End Date Box on Right Side Header
    const startDateText = dateRange?.from ? fmtD(dateRange.from) : 'All Time'
    const endDateText = dateRange?.to ? fmtD(dateRange.to) : 'All Time'
    const boxW = 56
    const boxH = 13
    const boxX = pageW - 14 - boxW
    const boxY = 26

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.4)
    doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, 'FD')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('Start Date:', boxX + 3.5, boxY + 4.5)
    doc.setFont('helvetica', 'normal')
    doc.text(startDateText, boxX + boxW - 3.5, boxY + 4.5, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.text('End Date:', boxX + 3.5, boxY + 9.5)
    doc.setFont('helvetica', 'normal')
    doc.text(endDateText, boxX + boxW - 3.5, boxY + 9.5, { align: 'right' })

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

    // Agreement Value / Budget at top in bold
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    const formattedAgreement = agreementValue !== null ? `${agreementValue.toLocaleString()} BDT` : 'Not Defined'
    doc.text(`Agreement Value / Budget: ${formattedAgreement}`, 14, detailsY)
    detailsY += 6

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(14, detailsY + 2, pageW - 14, detailsY + 2)

    let afterCatY = detailsY + 8

    // ── Date-filtered transactions ──────────────────────────────────────────
    const filteredByDate = filteredTransactionsByDate
    const filteredCatTotals = activeCategoryTotals
    const filteredTotalExpense = displayTotalExpense

    // ── Section 1: Category-wise Spending ───────────────────────────────────
    const catEntries = Object.entries(filteredCatTotals) as [string, number][]
    if (catEntries.length > 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('CATEGORY SUMMARY', 14, afterCatY + 5)

      autoTable(doc, {
        startY: afterCatY + 8,
        head: [['Category', 'Amount (BDT)', '% of Total']],
        body: catEntries
          .sort((a, b) => b[1] - a[1])
          .map(([cat, val]) => [
            formatCategory(cat),
            { content: val.toLocaleString(), styles: { textColor: [0, 0, 0], fontStyle: 'bold', halign: 'right' } },
            {
              content: filteredTotalExpense > 0 ? `${((val / filteredTotalExpense) * 100).toFixed(1)}%` : '—',
              styles: { halign: 'right', textColor: [0, 0, 0] }
            },
          ]),
        theme: 'grid',
        foot: [[
          { content: 'TOTAL EXPENSE', styles: { fontStyle: 'bold', textColor: [0, 0, 0] } },
          { content: filteredTotalExpense.toLocaleString(), styles: { fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0] } },
          { content: '100%', styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] } },
        ]],
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 8,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 8.5,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 30, halign: 'right' },
        },
      })
      afterCatY = (doc as any).lastAutoTable?.finalY ?? (afterCatY + 8)
    }

    // ── Section 2: Full Transaction Table ───────────────────────────────────
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('TRANSACTIONS', 14, afterCatY + 10)

    // Sort by date oldest to newest
    const sorted = [...filteredByDate].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const bodyRows = sorted.map((tx: any) => {
      const isInflow = tx.type === 'INFLOW'
      return [
        { content: new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
        { content: formatCategory(tx.category) },
        { content: tx.particular || '—' },
        {
          content: isInflow ? tx.amount.toLocaleString() : '—',
          styles: { textColor: isInflow ? [5, 150, 105] : [100, 100, 100], fontStyle: isInflow ? 'bold' : 'normal', halign: 'right' },
        },
        {
          content: !isInflow ? tx.amount.toLocaleString() : '—',
          styles: { textColor: !isInflow ? [220, 38, 38] : [100, 100, 100], fontStyle: !isInflow ? 'bold' : 'normal', halign: 'right' },
        },
      ]
    })

    const inflowPercentStr = agreementValue && agreementValue > 0 ? `${((activeTotalInflow / agreementValue) * 100).toFixed(1)}%` : null
    const allTimePaid = report?.allTimeTotalPaid ?? displayTotalPaid
    const paidPercentStr = agreementValue && agreementValue > 0 ? `${((allTimePaid / agreementValue) * 100).toFixed(1)}%` : null
    const netDifference = activeTotalInflow - activeTotalOutflow

    autoTable(doc, {
      startY: afterCatY + 14,
      head: [['Date', 'Category', 'Particulars', 'Inflow', 'Outflow']],
      body: bodyRows as any[],
      theme: 'grid',
      foot: [
        [
          { content: 'Total Inflow (Period)', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: [30, 41, 59] } },
          { content: `${activeTotalInflow.toLocaleString()}${inflowPercentStr ? ` (${inflowPercentStr})` : ''}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] } },
          { content: '—', styles: { halign: 'right', textColor: [100, 100, 100] } },
        ],
        [
          { content: 'Total Outflow (Period)', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: [30, 41, 59] } },
          { content: '—', styles: { halign: 'right', textColor: [100, 100, 100] } },
          { content: activeTotalOutflow.toLocaleString(), styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } },
        ],
        [
          { content: 'Total Net Profit / Loss (Difference)', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: [30, 41, 59] } },
          {
            content: `${netDifference >= 0 ? '+' : ''}${netDifference.toLocaleString()} BDT`,
            colSpan: 2,
            styles: { halign: 'right', fontStyle: 'bold', textColor: netDifference >= 0 ? [5, 150, 105] : [220, 38, 38] }
          },
        ],
        [
          { content: 'Total Paid (Deposits)', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: [30, 41, 59] } },
          {
            content: `${allTimePaid.toLocaleString()} BDT${paidPercentStr ? ` (${paidPercentStr} Deposited)` : ''}`,
            colSpan: 2,
            styles: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] }
          },
        ]
      ],
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold', 
        fontSize: 8, 
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      bodyStyles: { 
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 7.5, 
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      footStyles: { 
        fillColor: [248, 250, 252],
        textColor: [0, 0, 0],
        fontSize: 8, 
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 1) {
          data.cell.text = [] // Hide text for custom badge drawing
        }
      },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 1) {
          const rawContent = data.cell.raw.content || data.cell.raw
          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'normal')
          const textW = doc.getTextWidth(rawContent)
          const badgeH = 5
          const badgeW = textW + 4
          const x = data.cell.x + 2
          const y = data.cell.y + (data.cell.height - badgeH) / 2
          
          doc.setFillColor(241, 245, 249)
          doc.setDrawColor(203, 213, 225)
          doc.setLineWidth(0.3)
          doc.roundedRect(x, y, badgeW, badgeH, 1, 1, 'FD')
          
          doc.setTextColor(0, 0, 0)
          doc.text(rawContent, x + 2, y + 3.5)
        }
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

    const summaryTableRows = [
      [
        'Total Inflow (Period)',
        `${activeTotalInflow.toLocaleString()} BDT${inflowPercentStr !== null ? ` (${inflowPercentStr} of Agreement)` : ''}`
      ],
      [
        'Total Outflow (Period)',
        `${activeTotalOutflow.toLocaleString()} BDT`
      ],
      [
        'Total Net Profit / Loss (Difference)',
        `${netDifference >= 0 ? '+' : ''}${netDifference.toLocaleString()} BDT`
      ],
      [
        'Total Paid (Deposits)',
        `${allTimePaid.toLocaleString()} BDT${paidPercentStr !== null ? ` (${paidPercentStr} Deposited)` : ''}`
      ],
      [
        'Payment Due',
        displayDue !== null ? `${displayDue.toLocaleString()} BDT` : 'N/A'
      ],
      [
        'Profit Margin Estimate (All Time)',
        displayProfit !== null ? `${displayProfit.toLocaleString()} BDT` : 'N/A'
      ],
    ]

    autoTable(doc, {
      startY: finalY + 8,
      head: [['Financial Metric', 'Amount']],
      body: summaryTableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: 'bold',
        fontSize: 8.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 8.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 90, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.row.index === 0) {
            data.cell.styles.textColor = [5, 150, 105]
          } else if (data.row.index === 1) {
            data.cell.styles.textColor = (displayDue !== null && displayDue > 0) ? [220, 38, 38] : [5, 150, 105]
          } else if (data.row.index === 2) {
            data.cell.styles.textColor = [220, 38, 38]
          } else if (data.row.index === 3) {
            data.cell.styles.textColor = (displayProfit !== null && displayProfit >= 0) ? [5, 150, 105] : [220, 38, 38]
          }
        }
      }
    })

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
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
            </span>
            {report && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
                  <Button
                    size="sm"
                    variant={!dateRange ? "secondary" : "ghost"}
                    className="h-7 text-xs px-2"
                    onClick={() => setPresetRange('ALL')}
                  >
                    All Time
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2"
                    onClick={() => setPresetRange('TODAY')}
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2"
                    onClick={() => setPresetRange('THIS_MONTH')}
                  >
                    This Month
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2"
                    onClick={() => setPresetRange('LAST_7_DAYS')}
                  >
                    7 Days
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2"
                    onClick={() => setPresetRange('LAST_30_DAYS')}
                  >
                    30 Days
                  </Button>
                </div>

                <div className="w-56 sm:w-64">
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder="Filter by date range"
                    className="h-8 text-xs"
                  />
                </div>

                {isDateFiltered && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setDateRange(undefined)}
                    title="Clear date filter"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Reset Filter
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-2 text-xs"
                  onClick={() => void handleDownloadPDF()}
                >
                  <FileDown className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>
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
                  {displayTotalPaid.toLocaleString()} BDT
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground mb-1">Payment Due</div>
                <div className={`text-xl font-bold ${displayDue !== null && displayDue > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {displayDue !== null ? `${displayDue.toLocaleString()} BDT` : 'N/A'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground mb-1">Site Expense Logged</div>
                <div className="text-xl font-bold text-rose-500">
                  {displayTotalExpense.toLocaleString()} BDT
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <div className="text-xs text-muted-foreground">Profit Margin Estimate</div>
                  {displayProfit !== null && displayProfit < 0 && (
                    <Badge variant="destructive" className="h-5 text-[10px] uppercase font-bold px-1.5 py-0">LOSS</Badge>
                  )}
                </div>
                <div className={`text-xl font-bold ${displayProfit !== null && displayProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {displayProfit !== null ? `${displayProfit.toLocaleString()} BDT` : 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          {Object.keys(activeCategoryTotals).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category-wise Spending Breakdown</CardTitle>
                <CardDescription>Total amount spent per expense category.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Object.entries(activeCategoryTotals).map(([cat, val]: any) => (
                    <div
                      key={cat}
                      className="p-3 border border-border rounded-lg bg-muted/30 flex flex-col gap-1 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setModalFilter({ type: 'CATEGORY', value: cat })}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-muted-foreground font-medium leading-tight">
                          {formatCategory(cat)}
                        </span>
                        {displayTotalExpense > 0 && (
                          <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                            {((val / displayTotalExpense) * 100).toFixed(1)}%
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
              <CardDescription>
                {isDateFiltered ? 'Filtered transactions for selected date range.' : 'All transactions recorded for this project.'}
              </CardDescription>
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
                    {filteredTransactionsByDate.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No transaction logs found for this project in the selected period.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactionsByDate.map((tx: any) => (
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
                  {filteredTransactionsByDate.length > 0 && (
                    <tfoot className="border-t-2 border-border bg-muted/50">
                      <tr className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setModalFilter({ type: 'INFLOW' })}>
                        <td colSpan={6} className="p-3 font-bold text-sm text-right">Total Inflow</td>
                        <td className="p-3 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400 text-sm">
                          {activeTotalInflow.toLocaleString()} BDT
                        </td>
                        <td className="p-3 text-right text-muted-foreground">-</td>
                      </tr>
                      <tr className="border-t border-border cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setModalFilter({ type: 'OUTFLOW' })}>
                        <td colSpan={6} className="p-3 font-bold text-sm text-right">Total Outflow</td>
                        <td className="p-3 text-right text-muted-foreground">-</td>
                        <td className="p-3 text-right font-bold tabular-nums text-rose-500 text-sm">
                          {activeTotalOutflow.toLocaleString()} BDT
                        </td>
                      </tr>
                      {displayProfit !== null && (
                        <tr className="border-t-2 border-border">
                          <td colSpan={6} className="p-3 font-bold text-sm text-right">
                            {displayProfit >= 0 ? 'Total Profit' : 'Total Loss'}
                          </td>
                          <td colSpan={2} className={`p-3 text-right font-bold tabular-nums text-sm ${displayProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {displayProfit.toLocaleString()} BDT
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
