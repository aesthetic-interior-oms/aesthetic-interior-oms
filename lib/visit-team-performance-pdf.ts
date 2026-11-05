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
  const drawHeader = () => {
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
    doc.text(`Visit Department – ${monthLabel} Performance Report`, pageWidth / 2, y + 5, { align: 'center' })

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
      // Footer — left side only, no formula
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Aesthetic Interior • Visit Department Performance Report • ${monthLabel}`,
        14,
        pageHeight - 6,
      )
      doc.text(
        `Page ${doc.getNumberOfPages()}`,
        pageWidth - 14,
        pageHeight - 6,
        { align: 'right' },
      )
    },
  })

  // Save the PDF
  const safeMonth = monthKey.replace(/[^0-9-]/g, '')
  doc.save(`Visit-Team-Performance-${safeMonth || 'monthly'}.pdf`)
}
