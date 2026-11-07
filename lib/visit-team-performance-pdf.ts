import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { VisitPerformanceRow } from '@/lib/visit-performance-types'

export type VisitTeamPerformancePdfProps = {
  monthKey: string
  members: VisitPerformanceRow[]
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

export async function generateVisitTeamPerformancePdf({
  monthKey,
  members,
  generatedBy,
}: VisitTeamPerformancePdfProps) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const monthLabel = formatMonthTitle(monthKey)
  const logoBase64 = await loadImageBase64('/Logo/HeaderLogo.png')
  const watermarkBase64 = await loadImageBase64('/android-chrome-512x512.png')

  const activeMembers = members.filter((m) => m.isEnabled !== false)

  const totalMembers = activeMembers.length
  const totalCompletedVisits = activeMembers.reduce((sum, m) => sum + (m.completed || 0), 0)
  const totalSqftSum = activeMembers.reduce((sum, m) => sum + (m.totalSqft || 0), 0)
  const avgPerformance = totalMembers
    ? Math.round(activeMembers.reduce((sum, m) => sum + (m.performance || 0), 0) / totalMembers)
    : 0

  // ── Draw watermark background (low opacity) ─────────────────────────────
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
      // watermark optional — silently skip
    }
  }

  // ── Header ───────────────────────────────────────────────────────────────
  const drawHeader = (customTitle?: string) => {
    // Top teal accent bar
    doc.setFillColor(13, 148, 136)
    doc.rect(0, 0, pageWidth, 5, 'F')

    const y = 12

    // Logo (top-left)
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, y, 40, 10)
      } catch {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.setTextColor(13, 148, 136)
        doc.text('AESTHETIC', 14, y + 7)
      }
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(13, 148, 136)
      doc.text('AESTHETIC', 14, y + 7)
    }

    // Centered title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(30, 41, 59)
    doc.text(
      customTitle || `Visit Department – ${monthLabel} Performance Report`,
      pageWidth / 2,
      y + 5,
      { align: 'center' }
    )

    // Right meta
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

    // Divider line
    doc.setDrawColor(13, 148, 136)
    doc.setLineWidth(0.5)
    doc.line(14, y + 13, pageWidth - 14, y + 13)

    return y + 18
  }

  drawWatermark()
  let yPos = drawHeader()

  // ── KPI Summary Cards ────────────────────────────────────────────────────
  const cardWidth = (pageWidth - 28 - 12) / 4
  const cardHeight = 15
  const kpis = [
    { label: 'Total Members', value: String(totalMembers), color: [240, 253, 250] as [number,number,number], border: [204, 251, 241] as [number,number,number], text: [15, 118, 110] as [number,number,number] },
    { label: 'Completed Visits', value: String(totalCompletedVisits), color: [239, 246, 255] as [number,number,number], border: [219, 234, 254] as [number,number,number], text: [29, 78, 216] as [number,number,number] },
    { label: 'Total Site SQFT', value: totalSqftSum.toLocaleString(), color: [248, 250, 252] as [number,number,number], border: [226, 232, 240] as [number,number,number], text: [51, 65, 85] as [number,number,number] },
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
    doc.setFontSize(10)
    doc.setTextColor(...kpi.text)
    doc.text(kpi.value, x + 4, yPos + 11.5)
  })

  yPos += cardHeight + 5

  // Section title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 41, 59)
  doc.text(`Consultant Performance – ${monthLabel}`, 14, yPos)
  yPos += 3

  // ── Performance Table ────────────────────────────────────────────────────
  autoTable(doc, {
    startY: yPos,
    head: [[
      'Rank',
      'Consultant Name',
      'Visits (Done/Total)',
      'Lead / Support',
      'Total SQFT',
      'Attendance',
      'Behaviour',
      'Score (/100)',
    ]],
    body: activeMembers.length === 0
      ? [['-', 'No Visit Team records for this month', '-', '-', '-', '-', '-', '-']]
      : activeMembers.map((m, idx) => {
          const attendanceDisplay = m.absentDays > 0 ? `${m.absentDays}d abs` : 'Full'
          const behaviourDisplay = m.behaviourTag ? m.behaviourTag.toUpperCase() : 'Normal'
          return [
            String(idx + 1),
            m.name,
            `${m.completed} / ${m.totalVisits}`,
            `${m.leadVisits}L / ${m.supportVisits}S`,
            (m.totalSqft || 0).toLocaleString(),
            attendanceDisplay,
            behaviourDisplay,
            `${m.performance || 0} / 100`,
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
      fillColor: [13, 148, 136],
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
      1: { cellWidth: 55, fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center', fontStyle: 'bold' },
    },
    didDrawPage: () => {
      // Watermark on each new page
      drawWatermark()
    },
  })

  // ── Page 2: Graphical Performance Visualizations ─────────────────────────
  doc.addPage('a4', 'landscape')
  drawWatermark()
  let p2Y = drawHeader('Visit Department – Performance Analytics & Graphical Overview')

  // Top sub-header for Page 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(`Consultant Comparative Analysis & Site Visit Metrics (${monthLabel})`, 14, p2Y)
  p2Y += 5

  const chartColWidth = (pageWidth - 28 - 8) / 2 // ~131mm each
  const chartHeight = 66

  // ── Chart 1: Performance Score Comparison (Horizontal Bar Chart) ─────────
  const c1X = 14
  const c1Y = p2Y

  // Card container
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(c1X, c1Y, chartColWidth, chartHeight, 2, 2, 'FD')

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 118, 110)
  doc.text('CONSULTANT OVERALL PERFORMANCE SCORE (/100)', c1X + 4, c1Y + 6)

  // Subtitle / note
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Benchmark: Target >= 80 | Passing >= 55', c1X + 4, c1Y + 10)

  const maxItemsChart1 = Math.min(activeMembers.length, 6)
  const barAreaTop = c1Y + 14
  const barRowHeight = (chartHeight - 17) / Math.max(maxItemsChart1, 1)

  for (let i = 0; i < maxItemsChart1; i++) {
    const member = activeMembers[i]
    const rowY = barAreaTop + i * barRowHeight

    // Label
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(51, 65, 85)
    const displayName = member.name.length > 18 ? member.name.slice(0, 17) + '…' : member.name
    doc.text(displayName, c1X + 4, rowY + 4.5)

    // Bar background
    const barX = c1X + 42
    const maxBarW = chartColWidth - 42 - 20
    const barY = rowY + 1.2
    const barH = Math.min(barRowHeight - 3, 5)

    doc.setFillColor(241, 245, 249)
    doc.roundedRect(barX, barY, maxBarW, barH, 1, 1, 'F')

    // Colored bar fill
    const score = Math.max(0, Math.min(100, member.performance || 0))
    const fillW = Math.max((score / 100) * maxBarW, 1)

    if (score >= 80) {
      doc.setFillColor(13, 148, 136) // Teal
    } else if (score >= 55) {
      doc.setFillColor(59, 130, 246) // Blue
    } else {
      doc.setFillColor(245, 158, 11) // Amber
    }
    doc.roundedRect(barX, barY, fillW, barH, 1, 1, 'F')

    // Value text
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(30, 41, 59)
    doc.text(`${score}%`, barX + maxBarW + 2, rowY + 4.5)
  }

  // ── Chart 2: Completed Site Area SQFT (Horizontal Bar Chart) ──────────────
  const c2X = 14 + chartColWidth + 8
  const c2Y = p2Y

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(c2X, c2Y, chartColWidth, chartHeight, 2, 2, 'FD')

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(29, 78, 216)
  doc.text('TOTAL SITE AREA MEASURED & EXECUTED (SQFT)', c2X + 4, c2Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Room dimensions & area quantification by consultant', c2X + 4, c2Y + 10)

  const maxSqft = Math.max(...activeMembers.map((m) => m.totalSqft || 0), 1000)
  const maxItemsChart2 = Math.min(activeMembers.length, 6)
  const barRowHeight2 = (chartHeight - 17) / Math.max(maxItemsChart2, 1)

  for (let i = 0; i < maxItemsChart2; i++) {
    const member = activeMembers[i]
    const rowY = c2Y + 14 + i * barRowHeight2

    // Label
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(51, 65, 85)
    const displayName = member.name.length > 18 ? member.name.slice(0, 17) + '…' : member.name
    doc.text(displayName, c2X + 4, rowY + 4.5)

    // Bar background
    const barX = c2X + 42
    const maxBarW = chartColWidth - 42 - 24
    const barY = rowY + 1.2
    const barH = Math.min(barRowHeight2 - 3, 5)

    doc.setFillColor(241, 245, 249)
    doc.roundedRect(barX, barY, maxBarW, barH, 1, 1, 'F')

    // Colored bar fill
    const sqft = member.totalSqft || 0
    const fillW = Math.max((sqft / maxSqft) * maxBarW, 1)

    doc.setFillColor(79, 70, 229) // Indigo
    doc.roundedRect(barX, barY, fillW, barH, 1, 1, 'F')

    // Value text
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(30, 41, 59)
    doc.text(`${sqft.toLocaleString()} sft`, barX + maxBarW + 2, rowY + 4.5)
  }

  p2Y += chartHeight + 6

  // ── Bottom Section: Visit Breakdown & Work Quality Observations ──────────
  const bottomHeight = pageHeight - p2Y - 14 // Remaining height (~60mm)

  // Bottom Box 1: Lead vs Support Visit Distribution
  const b1X = 14
  const b1Y = p2Y
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(b1X, b1Y, chartColWidth, bottomHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 118, 110)
  doc.text('SITE VISIT WORKLOAD BREAKDOWN (LEAD VS SUPPORT)', b1X + 4, b1Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Lead Consultant (site assessment & measurements) vs Support Staff', b1X + 4, b1Y + 10)

  // Legend
  doc.setFillColor(13, 148, 136)
  doc.rect(b1X + chartColWidth - 55, b1Y + 5, 3.5, 3.5, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(51, 65, 85)
  doc.text('Lead Visits', b1X + chartColWidth - 50, b1Y + 7.5)

  doc.setFillColor(148, 163, 184)
  doc.rect(b1X + chartColWidth - 28, b1Y + 5, 3.5, 3.5, 'F')
  doc.text('Support Visits', b1X + chartColWidth - 23, b1Y + 7.5)

  const b1Items = Math.min(activeMembers.length, 5)
  const b1RowHeight = (bottomHeight - 16) / Math.max(b1Items, 1)
  const maxTotalVisits = Math.max(...activeMembers.map((m) => (m.leadVisits || 0) + (m.supportVisits || 0)), 1)

  for (let i = 0; i < b1Items; i++) {
    const member = activeMembers[i]
    const rowY = b1Y + 14 + i * b1RowHeight

    // Label
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(51, 65, 85)
    const displayName = member.name.length > 18 ? member.name.slice(0, 17) + '…' : member.name
    doc.text(displayName, b1X + 4, rowY + 4)

    // Stacked Bar
    const barX = b1X + 42
    const maxBarW = chartColWidth - 42 - 25
    const barY = rowY + 1
    const barH = Math.min(b1RowHeight - 2.8, 4.5)

    const totalV = (member.leadVisits || 0) + (member.supportVisits || 0)
    const leadW = (member.leadVisits / Math.max(maxTotalVisits, 1)) * maxBarW
    const supportW = (member.supportVisits / Math.max(maxTotalVisits, 1)) * maxBarW

    // Background track
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(barX, barY, maxBarW, barH, 0.8, 0.8, 'F')

    // Lead segment
    if (leadW > 0) {
      doc.setFillColor(13, 148, 136)
      doc.rect(barX, barY, leadW, barH, 'F')
    }
    // Support segment
    if (supportW > 0) {
      doc.setFillColor(148, 163, 184)
      doc.rect(barX + leadW, barY, supportW, barH, 'F')
    }

    // Value text
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(30, 41, 59)
    doc.text(`${member.leadVisits}L + ${member.supportVisits}S (${member.completed} done)`, barX + maxBarW + 2, rowY + 4)
  }

  // Bottom Box 2: Site Quality & Field Observations Summary
  const b2X = 14 + chartColWidth + 8
  const b2Y = p2Y
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(b2X, b2Y, chartColWidth, bottomHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(180, 83, 9)
  doc.text('FIELD QUALITY & ATTENDANCE / BEHAVIOUR SUMMARY', b2X + 4, b2Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Site readiness, punctuality, client interaction & report accuracy', b2X + 4, b2Y + 10)

  // 4 mini summary cards inside right box
  const miniW = (chartColWidth - 12) / 2
  const miniH = (bottomHeight - 18) / 2
  const positiveBehaviours = activeMembers.filter((m) => ['BEST', 'BETTER', 'GOOD'].includes((m.behaviourTag || '').toUpperCase())).length
  const fullAttendance = activeMembers.filter((m) => (m.absentDays || 0) === 0).length

  const miniCards = [
    { label: 'Exemplary Conduct', value: `${positiveBehaviours} / ${totalMembers}`, sub: 'Positive behavior tags', fill: [240, 253, 250] as [number,number,number], stroke: [204, 251, 241] as [number,number,number], tc: [15, 118, 110] as [number,number,number] },
    { label: '100% Attendance', value: `${fullAttendance} / ${totalMembers}`, sub: 'No reported absences', fill: [239, 246, 255] as [number,number,number], stroke: [219, 234, 254] as [number,number,number], tc: [29, 78, 216] as [number,number,number] },
    { label: 'Avg Area per Member', value: totalMembers ? `${Math.round(totalSqftSum / totalMembers).toLocaleString()} sft` : '0 sft', sub: 'Site measurement avg', fill: [254, 243, 199] as [number,number,number], stroke: [253, 230, 138] as [number,number,number], tc: [180, 83, 9] as [number,number,number] },
    { label: 'Avg Visits Executed', value: totalMembers ? (totalCompletedVisits / totalMembers).toFixed(1) : '0', sub: 'Visits done per consultant', fill: [248, 250, 252] as [number,number,number], stroke: [226, 232, 240] as [number,number,number], tc: [51, 65, 85] as [number,number,number] },
  ]

  miniCards.forEach((mc, idx) => {
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

  // ── Add page numbers and footer to all pages ─────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Aesthetic Interior • Visit Department Performance Report • ${monthLabel}`,
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

  // Save the PDF
  const safeMonth = monthKey.replace(/[^0-9-]/g, '')
  doc.save(`Visit-Team-Performance-${safeMonth || 'monthly'}.pdf`)
}
