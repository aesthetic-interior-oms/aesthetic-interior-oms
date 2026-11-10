import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type QuotationPerformanceRow = {
  userId: string
  fullName: string
  email: string
  detailSqft: number
  shortSqft: number
  totalSqft: number
  completedCount: number
  avgWorkingHours: number
  performanceScore: number
  isEnabled?: boolean
}

export type QuotationPerformancePdfProps = {
  monthKey: string
  members: QuotationPerformanceRow[]
  generatedBy?: string
}

async function loadImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function formatMonthTitle(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  const [yearStr, monthStr] = monthKey.split('-')
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1)
  return isNaN(date.getTime())
    ? monthKey
    : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export async function generateQuotationTeamPerformancePdf({
  monthKey,
  members,
  generatedBy = 'Admin',
}: QuotationPerformancePdfProps) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const monthLabel = formatMonthTitle(monthKey)
  const logoBase64 = await loadImageBase64('/Logo/HeaderLogo.png')
  const watermarkBase64 = await loadImageBase64('/android-chrome-512x512.png')

  const activeMembers = members.filter((m) => m.isEnabled !== false)

  const totalMembers = activeMembers.length
  const totalCompletedQuotes = activeMembers.reduce((sum, m) => sum + (m.completedCount || 0), 0)
  const totalSqftSum = activeMembers.reduce((sum, m) => sum + (m.totalSqft || 0), 0)
  const totalDetailSqft = activeMembers.reduce((sum, m) => sum + (m.detailSqft || 0), 0)
  const totalShortSqft = activeMembers.reduce((sum, m) => sum + (m.shortSqft || 0), 0)
  const avgPerformance = totalMembers
    ? Math.round(activeMembers.reduce((sum, m) => sum + (m.performanceScore || 0), 0) / totalMembers)
    : 0

  // Watermark
  const drawWatermark = () => {
    if (!watermarkBase64) return
    try {
      const doc2 = doc as unknown as {
        GState?: new (opts: { opacity: number }) => unknown
        setGState: (state: unknown) => void
      }
      if (doc2.GState) {
        doc2.setGState(new doc2.GState({ opacity: 0.06 }))
      }
      const wmSize = 90
      const wmX = (pageWidth - wmSize) / 2
      const wmY = (pageHeight - wmSize) / 2
      doc.addImage(watermarkBase64, 'PNG', wmX, wmY, wmSize, wmSize)
      if (doc2.GState) {
        doc2.setGState(new doc2.GState({ opacity: 1.0 }))
      }
    } catch {
      // skip
    }
  }

  // Header
  const drawHeader = (customTitle?: string) => {
    doc.setFillColor(31, 54, 61)
    doc.rect(0, 0, pageWidth, 5, 'F')

    const y = 12

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, y, 40, 10)
      } catch {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.setTextColor(31, 54, 61)
        doc.text('AESTHETIC', 14, y + 7)
      }
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(31, 54, 61)
      doc.text('AESTHETIC', 14, y + 7)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(30, 41, 59)
    doc.text(
      customTitle || `Quotation Department – ${monthLabel} Performance Report`,
      pageWidth / 2,
      y + 5,
      { align: 'center' }
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    const generatedDate = new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    doc.text(`Generated: ${generatedDate}`, pageWidth - 14, y + 3, { align: 'right' })
    if (generatedBy) {
      doc.text(`By: ${generatedBy}`, pageWidth - 14, y + 8, { align: 'right' })
    }

    doc.setDrawColor(31, 54, 61)
    doc.setLineWidth(0.5)
    doc.line(14, y + 13, pageWidth - 14, y + 13)

    return y + 18
  }

  drawWatermark()
  let yPos = drawHeader()

  // KPI Summary Cards
  const cardWidth = (pageWidth - 28 - 16) / 5
  const cardHeight = 15
  const kpis = [
    { label: 'Active Estimators', value: String(totalMembers), color: [240, 253, 250] as [number,number,number], border: [204, 251, 241] as [number,number,number], text: [15, 118, 110] as [number,number,number] },
    { label: 'Total Quotes Done', value: String(totalCompletedQuotes), color: [239, 246, 255] as [number,number,number], border: [219, 234, 254] as [number,number,number], text: [29, 78, 216] as [number,number,number] },
    { label: 'Detail Quotes SQFT', value: `${totalDetailSqft.toLocaleString()} SFT`, color: [248, 250, 252] as [number,number,number], border: [226, 232, 240] as [number,number,number], text: [51, 65, 85] as [number,number,number] },
    { label: 'Short Quotes SQFT', value: `${totalShortSqft.toLocaleString()} SFT`, color: [236, 253, 245] as [number,number,number], border: [167, 243, 208] as [number,number,number], text: [5, 150, 105] as [number,number,number] },
    { label: 'Team Avg Score', value: `${avgPerformance} / 100`, color: [254, 243, 199] as [number,number,number], border: [253, 230, 138] as [number,number,number], text: [180, 83, 9] as [number,number,number] },
  ]

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 4)
    doc.setFillColor(...kpi.color)
    doc.setDrawColor(...kpi.border)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text(kpi.label, x + 4, yPos + 5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...kpi.text)
    doc.text(kpi.value, x + 4, yPos + 11.5)
  })

  yPos += cardHeight + 5

  // Section title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 41, 59)
  doc.text(`Quotation Team Estimation Leaderboard & Metrics – ${monthLabel}`, 14, yPos)
  yPos += 3

  // Performance Table
  autoTable(doc, {
    startY: yPos,
    head: [[
      'Rank',
      'Estimator Name',
      'Detail SQFT',
      'Short SQFT',
      'Total SQFT',
      'Completed Quotes',
      'Avg Working Hours',
      'Performance (/100)',
    ]],
    body: activeMembers.length === 0
      ? [['-', 'No active Quotation records for this month', '-', '-', '-', '-', '-', '-']]
      : activeMembers.map((m, idx) => [
          String(idx + 1),
          m.fullName,
          `${(m.detailSqft || 0).toLocaleString()} SFT`,
          `${(m.shortSqft || 0).toLocaleString()} SFT`,
          `${(m.totalSqft || 0).toLocaleString()} SFT`,
          String(m.completedCount || 0),
          `${(m.avgWorkingHours || 0).toFixed(1)} hrs`,
          `${m.performanceScore || 0} / 100`,
        ]),
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [31, 54, 61],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 60, fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center', fontStyle: 'bold' },
    },
    didDrawPage: () => {
      drawWatermark()
    },
  })

  // Page 2: Analytics & Comparative Charts
  doc.addPage('a4', 'landscape')
  drawWatermark()
  let p2Y = drawHeader('Quotation Department – Performance Analytics & Graphical Overview')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(`Estimation Speed, Volume Ratios & SQFT Breakdown (${monthLabel})`, 14, p2Y)
  p2Y += 5

  const chartColWidth = (pageWidth - 28 - 8) / 2
  const chartHeight = 66

  // Chart 1: Performance Score Horizontal Bars
  const c1X = 14
  const c1Y = p2Y

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(c1X, c1Y, chartColWidth, chartHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(31, 54, 61)
  doc.text('ESTIMATOR PERFORMANCE SCORE (/100)', c1X + 4, c1Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Calculated from quotation volume, sqft accuracy & completion time', c1X + 4, c1Y + 10)

  const maxItemsChart1 = Math.min(activeMembers.length, 6)
  const barAreaTop = c1Y + 14
  const barRowHeight = (chartHeight - 17) / Math.max(maxItemsChart1, 1)

  for (let i = 0; i < maxItemsChart1; i++) {
    const member = activeMembers[i]
    const rowY = barAreaTop + i * barRowHeight

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(51, 65, 85)
    const displayName = member.fullName.length > 18 ? member.fullName.slice(0, 17) + '…' : member.fullName
    doc.text(displayName, c1X + 4, rowY + 4.5)

    const barX = c1X + 42
    const maxBarW = chartColWidth - 42 - 20
    const barY = rowY + 1.2
    const barH = Math.min(barRowHeight - 3, 5)

    doc.setFillColor(241, 245, 249)
    doc.roundedRect(barX, barY, maxBarW, barH, 1, 1, 'F')

    const score = Math.max(0, Math.min(100, member.performanceScore || 0))
    const fillW = Math.max((score / 100) * maxBarW, 1)

    if (score >= 80) {
      doc.setFillColor(13, 148, 136)
    } else if (score >= 55) {
      doc.setFillColor(59, 130, 246)
    } else {
      doc.setFillColor(245, 158, 11)
    }
    doc.roundedRect(barX, barY, fillW, barH, 1, 1, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(30, 41, 59)
    doc.text(`${score}%`, barX + maxBarW + 2, rowY + 4.5)
  }

  // Chart 2: Total SQFT Calculated (Detail vs Short)
  const c2X = 14 + chartColWidth + 8
  const c2Y = p2Y

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(c2X, c2Y, chartColWidth, chartHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(5, 150, 105)
  doc.text('TOTAL ESTIMATED AREA (SQFT)', c2X + 4, c2Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Detail quotation area (Green) vs Short budget area (Teal)', c2X + 4, c2Y + 10)

  const maxSqft = Math.max(...activeMembers.map((m) => m.totalSqft || 0), 1000)
  const maxItemsChart2 = Math.min(activeMembers.length, 6)
  const barRowHeight2 = (chartHeight - 17) / Math.max(maxItemsChart2, 1)

  for (let i = 0; i < maxItemsChart2; i++) {
    const member = activeMembers[i]
    const rowY = c2Y + 14 + i * barRowHeight2

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(51, 65, 85)
    const displayName = member.fullName.length > 18 ? member.fullName.slice(0, 17) + '…' : member.fullName
    doc.text(displayName, c2X + 4, rowY + 4.5)

    const barX = c2X + 42
    const maxBarW = chartColWidth - 42 - 26
    const barY = rowY + 1.2
    const barH = Math.min(barRowHeight2 - 3, 5)

    doc.setFillColor(241, 245, 249)
    doc.roundedRect(barX, barY, maxBarW, barH, 1, 1, 'F')

    const detailW = (Math.max(0, member.detailSqft || 0) / maxSqft) * maxBarW
    const shortW = (Math.max(0, member.shortSqft || 0) / maxSqft) * maxBarW

    if (detailW > 0) {
      doc.setFillColor(16, 185, 129)
      doc.rect(barX, barY, detailW, barH, 'F')
    }
    if (shortW > 0) {
      doc.setFillColor(13, 148, 136)
      doc.rect(barX + detailW, barY, shortW, barH, 'F')
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(30, 41, 59)
    doc.text(`${(member.totalSqft || 0).toLocaleString()} sft`, barX + maxBarW + 2, rowY + 4.5)
  }

  p2Y += chartHeight + 6

  // Bottom Section
  const bottomHeight = pageHeight - p2Y - 14

  const b1X = 14
  const b1Y = p2Y
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(b1X, b1Y, chartColWidth, bottomHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(31, 54, 61)
  doc.text('ESTIMATION COMPONENT RATIOS', b1X + 4, b1Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Distribution between full detailed specifications and quick budget drafts', b1X + 4, b1Y + 10.5)

  const detailRatio = totalSqftSum > 0 ? Math.round((totalDetailSqft / totalSqftSum) * 100) : 0
  const shortRatio = totalSqftSum > 0 ? Math.round((totalShortSqft / totalSqftSum) * 100) : 0
  const avgSqftPerQuote = totalCompletedQuotes > 0 ? Math.round(totalSqftSum / totalCompletedQuotes).toLocaleString() : '0'

  const ratioBoxes = [
    { label: 'Detail Estimation Ratio', value: `${detailRatio}%`, sub: 'Detailed bill of quantities' },
    { label: 'Short Estimate Ratio', value: `${shortRatio}%`, sub: 'Initial budget previews' },
    { label: 'Avg SQFT / Quote', value: `${avgSqftPerQuote} SFT`, sub: 'Scope per completed file' },
  ]

  const rWidth = (chartColWidth - 12) / 3
  ratioBoxes.forEach((rb, idx) => {
    const rx = b1X + 4 + idx * (rWidth + 2)
    const ry = b1Y + 16
    const rHeight = bottomHeight - 20
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(rx, ry, rWidth, rHeight, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text(rb.label, rx + 3, ry + 5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(31, 54, 61)
    doc.text(rb.value, rx + 3, ry + 13)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.8)
    doc.setTextColor(148, 163, 184)
    doc.text(rb.sub, rx + 3, ry + 18)
  })

  // Bottom Box 2: Quality & Efficiency Benchmarks
  const b2X = 14 + chartColWidth + 8
  const b2Y = p2Y
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(b2X, b2Y, chartColWidth, bottomHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(180, 83, 9)
  doc.text('OPERATIONAL SPEED & BENCHMARKS', b2X + 4, b2Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Estimator working speed and production turnaround', b2X + 4, b2Y + 10)

  const avgWorkingHoursOverall = activeMembers.length
    ? (activeMembers.reduce((sum, m) => sum + (m.avgWorkingHours || 0), 0) / activeMembers.length).toFixed(1)
    : '0'

  const miniW = (chartColWidth - 12) / 2
  const miniH = (bottomHeight - 18) / 2

  const quoteMiniCards = [
    { label: 'Avg Working Hours', value: `${avgWorkingHoursOverall} hrs`, sub: 'Average time logged', fill: [240, 253, 250] as [number,number,number], stroke: [204, 251, 241] as [number,number,number], tc: [15, 118, 110] as [number,number,number] },
    { label: 'SQFT / Estimator', value: totalMembers ? `${Math.round(totalSqftSum / totalMembers).toLocaleString()} SFT` : '0 SFT', sub: 'Average portfolio handled', fill: [239, 246, 255] as [number,number,number], stroke: [219, 234, 254] as [number,number,number], tc: [29, 78, 216] as [number,number,number] },
    { label: 'Quotes / Estimator', value: totalMembers ? (totalCompletedQuotes / totalMembers).toFixed(1) : '0', sub: 'Volume per team member', fill: [254, 243, 199] as [number,number,number], stroke: [253, 230, 138] as [number,number,number], tc: [180, 83, 9] as [number,number,number] },
    { label: 'Top Estimator Score', value: activeMembers.length ? `${Math.max(...activeMembers.map((m) => m.performanceScore || 0))} / 100` : '0', sub: 'Top score recorded', fill: [248, 250, 252] as [number,number,number], stroke: [226, 232, 240] as [number,number,number], tc: [51, 65, 85] as [number,number,number] },
  ]

  quoteMiniCards.forEach((mc, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const mx = b2X + 4 + col * (miniW + 4)
    const my = b2Y + 14 + row * (miniH + 2)

    doc.setFillColor(...mc.fill)
    doc.setDrawColor(...mc.stroke)
    doc.setLineWidth(0.2)
    doc.roundedRect(mx, my, miniW, miniH, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text(mc.label, mx + 3, my + 4)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...mc.tc)
    doc.text(mc.value, mx + 3, my + 10)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.8)
    doc.setTextColor(148, 163, 184)
    doc.text(mc.sub, mx + 3, my + 14)
  })

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Aesthetic Interior • Quotation Department Performance Report • ${monthLabel}`,
      14,
      pageHeight - 6,
    )
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - 14,
      pageHeight - 6,
      { align: 'right' },
    )
  }

  const safeMonth = monthKey.replace(/[^0-9-]/g, '')
  doc.save(`Quotation-Team-Performance-${safeMonth || 'monthly'}.pdf`)
}
