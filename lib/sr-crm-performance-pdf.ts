import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type SrCrmPerformanceRow = {
  userId: string
  name: string
  activeProjectSqft: number
  totalAgreementValue: number
  agreementSqft: number
  review: { score: number; count: number; best: number; better: number; good: number }
  meeting: { score: number; count: number; best: number; better: number; good: number }
  conversion: { score: number; count: number }
  sqftScore: number
  agreementScore: number
  totalPerformance: number
  isEnabled?: boolean
}

export type SrCrmPerformancePdfProps = {
  monthKey: string
  members: SrCrmPerformanceRow[]
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

export async function generateSrCrmPerformancePdf({
  monthKey,
  members,
  generatedBy = 'Admin',
}: SrCrmPerformancePdfProps) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const monthLabel = formatMonthTitle(monthKey)
  const logoBase64 = await loadImageBase64('/Logo/HeaderLogo.png')
  const watermarkBase64 = await loadImageBase64('/android-chrome-512x512.png')

  const activeMembers = members.filter((m) => m.isEnabled !== false)

  const totalMembers = activeMembers.length
  const totalActiveSqft = activeMembers.reduce((sum, m) => sum + (m.activeProjectSqft || 0), 0)
  const totalAgreementSqft = activeMembers.reduce((sum, m) => sum + (m.agreementSqft || 0), 0)
  const totalAgreementValue = activeMembers.reduce((sum, m) => sum + (m.totalAgreementValue || 0), 0)
  const avgPerformance = totalMembers
    ? Math.round(activeMembers.reduce((sum, m) => sum + (m.totalPerformance || 0), 0) / totalMembers)
    : 0

  // ── Draw watermark background ──────────────────────────────────────────
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
      // silently skip watermark on error
    }
  }

  // ── Draw Header ──────────────────────────────────────────────────────────
  const drawHeader = (customTitle?: string) => {
    // Top teal accent bar
    doc.setFillColor(31, 54, 61)
    doc.rect(0, 0, pageWidth, 5, 'F')

    const y = 12

    // Logo (top-left)
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

    // Centered title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(30, 41, 59)
    doc.text(
      customTitle || `Senior CRM Department – ${monthLabel} Performance Report`,
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
    doc.setDrawColor(31, 54, 61)
    doc.setLineWidth(0.5)
    doc.line(14, y + 13, pageWidth - 14, y + 13)

    return y + 18
  }

  drawWatermark()
  let yPos = drawHeader()

  // ── KPI Summary Cards ───────────────────────────────────────────────────
  const cardWidth = (pageWidth - 28 - 16) / 5
  const cardHeight = 15
  const kpis = [
    { label: 'Active CRM Members', value: String(totalMembers), color: [240, 253, 250] as [number,number,number], border: [204, 251, 241] as [number,number,number], text: [15, 118, 110] as [number,number,number] },
    { label: 'Active Project SQFT', value: `${totalActiveSqft.toLocaleString()} SFT`, color: [239, 246, 255] as [number,number,number], border: [219, 234, 254] as [number,number,number], text: [29, 78, 216] as [number,number,number] },
    { label: 'Agreement SQFT', value: `${totalAgreementSqft.toLocaleString()} SFT`, color: [248, 250, 252] as [number,number,number], border: [226, 232, 240] as [number,number,number], text: [51, 65, 85] as [number,number,number] },
    { label: 'Total Agreement Value', value: `BDT ${(totalAgreementValue / 100000).toFixed(1)}L`, color: [236, 253, 245] as [number,number,number], border: [167, 243, 208] as [number,number,number], text: [5, 150, 105] as [number,number,number] },
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
  doc.text(`Senior CRM Monthly Leaderboard & Evaluation – ${monthLabel}`, 14, yPos)
  yPos += 3

  // ── Performance Table ───────────────────────────────────────────────────
  autoTable(doc, {
    startY: yPos,
    head: [[
      'Rank',
      'Senior CRM Executive',
      'Active SQFT',
      'Agreement SQFT',
      'Agreement Value',
      'Review (/30)',
      'Meeting (/20)',
      'Conversion (/20)',
      'SQFT (/15)',
      'Value (/15)',
      'Total (/100)',
    ]],
    body: activeMembers.length === 0
      ? [['-', 'No active Senior CRM records for this month', '-', '-', '-', '-', '-', '-', '-', '-', '-']]
      : activeMembers.map((m, idx) => [
          String(idx + 1),
          m.name,
          `${(m.activeProjectSqft || 0).toLocaleString()} SFT`,
          `${(m.agreementSqft || 0).toLocaleString()} SFT`,
          `BDT ${(m.totalAgreementValue || 0).toLocaleString()}`,
          `${m.review?.score || 0}`,
          `${m.meeting?.score || 0}`,
          `${m.conversion?.score || 0}`,
          `${m.sqftScore || 0}`,
          `${m.agreementScore || 0}`,
          `${m.totalPerformance || 0} / 100`,
        ]),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [31, 54, 61],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 46, fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'center' },
      9: { halign: 'center' },
      10: { halign: 'center', fontStyle: 'bold' },
    },
    didDrawPage: () => {
      drawWatermark()
    },
  })

  // ── Page 2: Analytics & Comparative Overview ─────────────────────────────
  doc.addPage('a4', 'landscape')
  drawWatermark()
  let p2Y = drawHeader('Senior CRM Department – Performance Analytics & Graphical Overview')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(`Executive Performance Distribution & Deal Metrics (${monthLabel})`, 14, p2Y)
  p2Y += 5

  const chartColWidth = (pageWidth - 28 - 8) / 2
  const chartHeight = 66

  // Chart 1: Overall Performance Score (Horizontal Bar)
  const c1X = 14
  const c1Y = p2Y

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(c1X, c1Y, chartColWidth, chartHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(31, 54, 61)
  doc.text('CRM OVERALL PERFORMANCE SCORE (/100)', c1X + 4, c1Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Composite: Review (30) + Meeting (20) + Conversion (20) + SQFT (15) + Value (15)', c1X + 4, c1Y + 10)

  const maxItemsChart1 = Math.min(activeMembers.length, 6)
  const barAreaTop = c1Y + 14
  const barRowHeight = (chartHeight - 17) / Math.max(maxItemsChart1, 1)

  for (let i = 0; i < maxItemsChart1; i++) {
    const member = activeMembers[i]
    const rowY = barAreaTop + i * barRowHeight

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(51, 65, 85)
    const displayName = member.name.length > 18 ? member.name.slice(0, 17) + '…' : member.name
    doc.text(displayName, c1X + 4, rowY + 4.5)

    const barX = c1X + 42
    const maxBarW = chartColWidth - 42 - 20
    const barY = rowY + 1.2
    const barH = Math.min(barRowHeight - 3, 5)

    doc.setFillColor(241, 245, 249)
    doc.roundedRect(barX, barY, maxBarW, barH, 1, 1, 'F')

    const score = Math.max(0, Math.min(100, member.totalPerformance || 0))
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

  // Chart 2: Agreement Value Volume
  const c2X = 14 + chartColWidth + 8
  const c2Y = p2Y

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(c2X, c2Y, chartColWidth, chartHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(5, 150, 105)
  doc.text('AGREEMENT VALUE CLOSED (BDT)', c2X + 4, c2Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Total contract and agreement value signed by Senior CRM', c2X + 4, c2Y + 10)

  const maxVal = Math.max(...activeMembers.map((m) => m.totalAgreementValue || 0), 100000)
  const maxItemsChart2 = Math.min(activeMembers.length, 6)
  const barRowHeight2 = (chartHeight - 17) / Math.max(maxItemsChart2, 1)

  for (let i = 0; i < maxItemsChart2; i++) {
    const member = activeMembers[i]
    const rowY = c2Y + 14 + i * barRowHeight2

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(51, 65, 85)
    const displayName = member.name.length > 18 ? member.name.slice(0, 17) + '…' : member.name
    doc.text(displayName, c2X + 4, rowY + 4.5)

    const barX = c2X + 42
    const maxBarW = chartColWidth - 42 - 26
    const barY = rowY + 1.2
    const barH = Math.min(barRowHeight2 - 3, 5)

    doc.setFillColor(241, 245, 249)
    doc.roundedRect(barX, barY, maxBarW, barH, 1, 1, 'F')

    const val = member.totalAgreementValue || 0
    const fillW = Math.max((val / maxVal) * maxBarW, 1)

    doc.setFillColor(16, 185, 129)
    doc.roundedRect(barX, barY, fillW, barH, 1, 1, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(30, 41, 59)
    const displayVal = val >= 100000 ? `${(val / 100000).toFixed(1)}L` : `${Math.round(val / 1000)}k`
    doc.text(`BDT ${displayVal}`, barX + maxBarW + 2, rowY + 4.5)
  }

  p2Y += chartHeight + 6

  // Bottom Section: Deal Breakdown & Conversion Summary
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
  doc.text('SR CRM PIPELINE FUNNEL BREAKDOWN', b1X + 4, b1Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Client Engagement & Milestone Completion Activity', b1X + 4, b1Y + 10.5)

  const totalReviews = activeMembers.reduce((sum, m) => sum + (m.review?.count || 0), 0)
  const totalMeetings = activeMembers.reduce((sum, m) => sum + (m.meeting?.count || 0), 0)
  const totalConversions = activeMembers.reduce((sum, m) => sum + (m.conversion?.count || 0), 0)

  const funnelBoxes = [
    { label: 'Design Reviews Handled', value: String(totalReviews), sub: 'CAD & Design approvals' },
    { label: 'Client Meetings Executed', value: String(totalMeetings), sub: 'Discovery & budget sessions' },
    { label: 'Phase Conversions', value: String(totalConversions), sub: 'Advanced to next phase' },
  ]

  const fWidth = (chartColWidth - 12) / 3
  funnelBoxes.forEach((fb, idx) => {
    const fx = b1X + 4 + idx * (fWidth + 2)
    const fy = b1Y + 16
    const fHeight = bottomHeight - 20
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(fx, fy, fWidth, fHeight, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text(fb.label, fx + 3, fy + 5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(31, 54, 61)
    doc.text(fb.value, fx + 3, fy + 13)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.8)
    doc.setTextColor(148, 163, 184)
    doc.text(fb.sub, fx + 3, fy + 18)
  })

  // Bottom Box 2: Executive SQFT Portfolio Observations
  const b2X = 14 + chartColWidth + 8
  const b2Y = p2Y
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(b2X, b2Y, chartColWidth, bottomHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(180, 83, 9)
  doc.text('CRM EFFICIENCY & PORTFOLIO RATIOS', b2X + 4, b2Y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Square footage conversion and deal velocity ratios', b2X + 4, b2Y + 10)

  const conversionRate = totalActiveSqft > 0 ? Math.round((totalAgreementSqft / totalActiveSqft) * 100) : 0
  const avgDealSize = totalMembers > 0 ? Math.round(totalAgreementValue / totalMembers) : 0

  const miniW = (chartColWidth - 12) / 2
  const miniH = (bottomHeight - 18) / 2

  const crmMiniCards = [
    { label: 'SQFT Conversion Rate', value: `${conversionRate}%`, sub: 'Agreement vs Active SQFT', fill: [240, 253, 250] as [number,number,number], stroke: [204, 251, 241] as [number,number,number], tc: [15, 118, 110] as [number,number,number] },
    { label: 'Avg Agreement / CRM', value: avgDealSize >= 100000 ? `BDT ${(avgDealSize / 100000).toFixed(1)}L` : `BDT ${avgDealSize.toLocaleString()}`, sub: 'Contract volume per exec', fill: [239, 246, 255] as [number,number,number], stroke: [219, 234, 254] as [number,number,number], tc: [29, 78, 216] as [number,number,number] },
    { label: 'Active SQFT / Exec', value: totalMembers ? `${Math.round(totalActiveSqft / totalMembers).toLocaleString()} SFT` : '0 SFT', sub: 'Average pipeline load', fill: [254, 243, 199] as [number,number,number], stroke: [253, 230, 138] as [number,number,number], tc: [180, 83, 9] as [number,number,number] },
    { label: 'Top Performer Score', value: activeMembers.length ? `${Math.max(...activeMembers.map((m) => m.totalPerformance || 0))} / 100` : '0', sub: 'Highest benchmark achieved', fill: [248, 250, 252] as [number,number,number], stroke: [226, 232, 240] as [number,number,number], tc: [51, 65, 85] as [number,number,number] },
  ]

  crmMiniCards.forEach((mc, idx) => {
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
      `Aesthetic Interior • Senior CRM Performance Report • ${monthLabel}`,
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
  doc.save(`Senior-CRM-Performance-${safeMonth || 'monthly'}.pdf`)
}
