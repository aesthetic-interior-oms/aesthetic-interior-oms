import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type JrArchitectPerformanceRow = {
  id?: string
  userId?: string
  totalWork: number
  totalSqft: number
  totalTimeMinutes: number
  performanceScore: number
  user: {
    fullName: string
  }
  isEnabled?: boolean
}

export type JrArchitectPerformancePdfProps = {
  monthKey: string
  members: JrArchitectPerformanceRow[]
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

export async function generateJrArchitectPerformancePdf({
  monthKey,
  members,
  generatedBy = 'Admin',
}: JrArchitectPerformancePdfProps) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const monthLabel = formatMonthTitle(monthKey)
  const logoBase64 = await loadImageBase64('/Logo/HeaderLogo.png')
  const watermarkBase64 = await loadImageBase64('/android-chrome-512x512.png')

  const activeMembers = members.filter((m) => m.isEnabled !== false)

  const totalMembers = activeMembers.length
  const totalTasksCompleted = activeMembers.reduce((sum, m) => sum + (m.totalWork || 0), 0)
  const totalSqftSum = activeMembers.reduce((sum, m) => sum + (m.totalSqft || 0), 0)
  const totalMinutesSum = activeMembers.reduce((sum, m) => sum + (m.totalTimeMinutes || 0), 0)
  const totalHoursSum = Math.round(totalMinutesSum / 60)
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
      // silently skip
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
      customTitle || `JR Architect Department – ${monthLabel} Performance Report`,
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
  const cardWidth = (pageWidth - 28 - 12) / 4
  const cardHeight = 15
  const kpis = [
    { label: 'Active JR Architects', value: String(totalMembers), color: [240, 253, 250] as [number,number,number], border: [204, 251, 241] as [number,number,number], text: [15, 118, 110] as [number,number,number] },
    { label: 'Completed CAD Tasks', value: String(totalTasksCompleted), color: [239, 246, 255] as [number,number,number], border: [219, 234, 254] as [number,number,number], text: [29, 78, 216] as [number,number,number] },
    { label: 'Total CAD Floor SQFT', value: `${totalSqftSum.toLocaleString()} SFT`, color: [248, 250, 252] as [number,number,number], border: [226, 232, 240] as [number,number,number], text: [51, 65, 85] as [number,number,number] },
    { label: 'Department Avg Score', value: `${avgPerformance} / 100`, color: [254, 243, 199] as [number,number,number], border: [253, 230, 138] as [number,number,number], text: [180, 83, 9] as [number,number,number] },
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
    doc.setFontSize(10)
    doc.setTextColor(...kpi.text)
    doc.text(kpi.value, x + 4, yPos + 11.5)
  })

  yPos += cardHeight + 5

  // Section title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 41, 59)
  doc.text(`CAD Drafting Leaderboard & Production Evaluation – ${monthLabel}`, 14, yPos)
  yPos += 3

  // Performance Table
  autoTable(doc, {
    startY: yPos,
    head: [[
      'Rank',
      'Junior Architect',
      'Tasks Done',
      'Total Project SQFT',
      'Total Time (Hours)',
      'Avg Hours / Task',
      'Performance (/100)',
    ]],
    body: activeMembers.length === 0
      ? [['-', 'No Junior Architect records for this month', '-', '-', '-', '-', '-']]
      : activeMembers.map((m, idx) => {
          const hours = ((m.totalTimeMinutes || 0) / 60).toFixed(1)
          const avgHours = m.totalWork > 0 ? ((m.totalTimeMinutes || 0) / m.totalWork / 60).toFixed(1) : '0'
          return [
            String(idx + 1),
            m.user.fullName,
            String(m.totalWork),
            `${(m.totalSqft || 0).toLocaleString()} SFT`,
            `${hours} hrs`,
            `${avgHours} hrs`,
            `${m.performanceScore || 0} / 100`,
          ]
        }),
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
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center', fontStyle: 'bold' },
    },
    didDrawPage: () => {
      drawWatermark()
    },
  })

  // Page 2: Analytics & Comparative Charts
  doc.addPage('a4', 'landscape')
  drawWatermark()
  let p2Y = drawHeader('JR Architect Department – Performance Analytics & Graphical Overview')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(`Architect Production Metrics & Turnaround Benchmarks (${monthLabel})`, 14, p2Y)
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
  doc.text('JR ARCHITECT PERFORMANCE SCORE (/100)', c1X + 4, c1Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Formula: Volume (40%) + SQFT Scale (40%) + Turnaround Speed (20%)', c1X + 4, c1Y + 10)

  const maxItemsChart1 = Math.min(activeMembers.length, 6)
  const barAreaTop = c1Y + 14
  const barRowHeight = (chartHeight - 17) / Math.max(maxItemsChart1, 1)

  for (let i = 0; i < maxItemsChart1; i++) {
    const member = activeMembers[i]
    const rowY = barAreaTop + i * barRowHeight

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(51, 65, 85)
    const displayName = member.user.fullName.length > 18 ? member.user.fullName.slice(0, 17) + '…' : member.user.fullName
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

  // Chart 2: Total Floor SQFT Drafted
  const c2X = 14 + chartColWidth + 8
  const c2Y = p2Y

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(c2X, c2Y, chartColWidth, chartHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(29, 78, 216)
  doc.text('TOTAL CAD FLOOR AREA DRAWN (SQFT)', c2X + 4, c2Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Cumulative architectural floorplan square footage delivered', c2X + 4, c2Y + 10)

  const maxSqft = Math.max(...activeMembers.map((m) => m.totalSqft || 0), 1000)
  const maxItemsChart2 = Math.min(activeMembers.length, 6)
  const barRowHeight2 = (chartHeight - 17) / Math.max(maxItemsChart2, 1)

  for (let i = 0; i < maxItemsChart2; i++) {
    const member = activeMembers[i]
    const rowY = c2Y + 14 + i * barRowHeight2

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(51, 65, 85)
    const displayName = member.user.fullName.length > 18 ? member.user.fullName.slice(0, 17) + '…' : member.user.fullName
    doc.text(displayName, c2X + 4, rowY + 4.5)

    const barX = c2X + 42
    const maxBarW = chartColWidth - 42 - 24
    const barY = rowY + 1.2
    const barH = Math.min(barRowHeight2 - 3, 5)

    doc.setFillColor(241, 245, 249)
    doc.roundedRect(barX, barY, maxBarW, barH, 1, 1, 'F')

    const sqft = member.totalSqft || 0
    const fillW = Math.max((sqft / maxSqft) * maxBarW, 1)

    doc.setFillColor(99, 102, 241)
    doc.roundedRect(barX, barY, fillW, barH, 1, 1, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(30, 41, 59)
    doc.text(`${sqft.toLocaleString()} sft`, barX + maxBarW + 2, rowY + 4.5)
  }

  p2Y += chartHeight + 6

  // Bottom Section: Speed & Efficiency Observations
  const bottomHeight = pageHeight - p2Y - 14

  const b1X = 14
  const b1Y = p2Y
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(b1X, b1Y, chartColWidth, bottomHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 118, 110)
  doc.text('DRAFTING SPEED & WORKLOAD RATIOS', b1X + 4, b1Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Average turnaround hours per drawing package', b1X + 4, b1Y + 10.5)

  const avgHoursOverall = totalTasksCompleted > 0 ? (totalHoursSum / totalTasksCompleted).toFixed(1) : '0'
  const avgSqftPerTask = totalTasksCompleted > 0 ? Math.round(totalSqftSum / totalTasksCompleted).toLocaleString() : '0'
  const avgTasksPerArchitect = totalMembers > 0 ? (totalTasksCompleted / totalMembers).toFixed(1) : '0'

  const statBoxes = [
    { label: 'Avg Turnaround Speed', value: `${avgHoursOverall} hrs`, sub: 'Hours spent per task' },
    { label: 'Avg SQFT / Task', value: `${avgSqftPerTask} SFT`, sub: 'Average project footprint' },
    { label: 'Tasks / Architect', value: String(avgTasksPerArchitect), sub: 'Production capacity load' },
  ]

  const sWidth = (chartColWidth - 12) / 3
  statBoxes.forEach((sb, idx) => {
    const sx = b1X + 4 + idx * (sWidth + 2)
    const sy = b1Y + 16
    const sHeight = bottomHeight - 20
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(sx, sy, sWidth, sHeight, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text(sb.label, sx + 3, sy + 5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(31, 54, 61)
    doc.text(sb.value, sx + 3, sy + 13)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.8)
    doc.setTextColor(148, 163, 184)
    doc.text(sb.sub, sx + 3, sy + 18)
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
  doc.text('ARCHITECTURAL QUALITY & DELIVERY SUMMARY', b2X + 4, b2Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('CAD drafting accuracy, drawing clarity and review approval rates', b2X + 4, b2Y + 10)

  const miniW = (chartColWidth - 12) / 2
  const miniH = (bottomHeight - 18) / 2

  const archMiniCards = [
    { label: 'Total Hours Invested', value: `${totalHoursSum} hrs`, sub: 'Drafting time logged', fill: [240, 253, 250] as [number,number,number], stroke: [204, 251, 241] as [number,number,number], tc: [15, 118, 110] as [number,number,number] },
    { label: 'SQFT / Architect', value: totalMembers ? `${Math.round(totalSqftSum / totalMembers).toLocaleString()} SFT` : '0 SFT', sub: 'Average floor area drafted', fill: [239, 246, 255] as [number,number,number], stroke: [219, 234, 254] as [number,number,number], tc: [29, 78, 216] as [number,number,number] },
    { label: 'Target Completion Rate', value: '100%', sub: 'Completed without backlog', fill: [254, 243, 199] as [number,number,number], stroke: [253, 230, 138] as [number,number,number], tc: [180, 83, 9] as [number,number,number] },
    { label: 'Top Architect Score', value: activeMembers.length ? `${Math.max(...activeMembers.map((m) => m.performanceScore || 0))} / 100` : '0', sub: 'Highest score recorded', fill: [248, 250, 252] as [number,number,number], stroke: [226, 232, 240] as [number,number,number], tc: [51, 65, 85] as [number,number,number] },
  ]

  archMiniCards.forEach((mc, idx) => {
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

  // Footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Aesthetic Interior • JR Architect Performance Report • ${monthLabel}`,
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
  doc.save(`JR-Architect-Performance-${safeMonth || 'monthly'}.pdf`)
}
