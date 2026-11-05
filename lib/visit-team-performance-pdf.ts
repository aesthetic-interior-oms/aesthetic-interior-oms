import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { VisitPerformanceRow } from '@/lib/visit-performance-types'

export type VisitTeamPerformancePdfProps = {
  monthKey: string
  members: VisitPerformanceRow[]
  generatedBy?: string
}

async function loadLogoBase64(url = '/Logo/HeaderLogo.png'): Promise<string | null> {
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
  const logoBase64 = await loadLogoBase64()

  const activeMembers = members.filter((m) => m.isEnabled !== false)

  const totalMembers = activeMembers.length
  const totalCompletedVisits = activeMembers.reduce((sum, m) => sum + (m.completed || 0), 0)
  const totalSqftSum = activeMembers.reduce((sum, m) => sum + (m.totalSqft || 0), 0)
  const avgPerformance = totalMembers
    ? Math.round(activeMembers.reduce((sum, m) => sum + (m.performance || 0), 0) / totalMembers)
    : 0

  const drawHeader = () => {
    // Header background accent bar
    doc.setFillColor(13, 148, 136) // Teal 600
    doc.rect(0, 0, pageWidth, 5, 'F')

    const y = 14
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, y, 40, 10)
      } catch {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(13, 148, 136)
        doc.text('AESTHETIC CRM', 14, y + 8)
      }
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(13, 148, 136)
      doc.text('AESTHETIC CRM', 14, y + 8)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(30, 41, 59)
    doc.text('Visit Department — Monthly Performance Report', 70, y + 5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(`Evaluation Period: ${monthLabel}`, 70, y + 10)

    // Meta right-aligned
    doc.setFontSize(8)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, y + 5, { align: 'right' })
    if (generatedBy) {
      doc.text(`By: ${generatedBy}`, pageWidth - 14, y + 10, { align: 'right' })
    }

    // Divider
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.4)
    doc.line(14, y + 14, pageWidth - 14, y + 14)

    return y + 18
  }

  let yPos = drawHeader()

  // KPI Summary Cards
  const cardWidth = (pageWidth - 28 - 12) / 4
  const cardHeight = 16
  const kpis = [
    { label: 'Total Members', value: String(totalMembers), color: [240, 253, 250], border: [204, 251, 241], text: [15, 118, 110] },
    { label: 'Completed Visits', value: String(totalCompletedVisits), color: [239, 246, 255], border: [219, 234, 254], text: [29, 78, 216] },
    { label: 'Total Site SQFT', value: `${totalSqftSum.toLocaleString()} SFT`, color: [248, 250, 252], border: [226, 232, 240], text: [51, 65, 85] },
    { label: 'Team Avg Performance', value: `${avgPerformance} / 100`, color: [254, 243, 199], border: [253, 230, 138], text: [180, 83, 9] },
  ]

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 4)
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2])
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2])
    doc.setLineWidth(0.3)
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text(kpi.label, x + 4, yPos + 5.5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2])
    doc.text(kpi.value, x + 4, yPos + 12.5)
  })

  yPos += cardHeight + 6

  // Section title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(`Consultant Evaluation & Marks Leaderboard (${monthLabel})`, 14, yPos)
  yPos += 3

  autoTable(doc, {
    startY: yPos,
    head: [[
      'Rank',
      'Consultant Name',
      'Visits (Done/Total)',
      'Lead / Support',
      'Total SQFT',
      'Report %',
      'Attendance (Abs / Mark)',
      'Behaviour (Tag & Points)',
      'Operational (/80)',
      'Performance (/100)',
    ]],
    body: activeMembers.length === 0
      ? [['-', 'No Visit Team records for this month', '-', '-', '-', '-', '-', '-', '-', '-']]
      : activeMembers.map((m, idx) => {
          const attendanceDisplay = `${m.absentDays}d abs (${m.attendanceScore}/10)`
          const tagDisplay = m.behaviourTag
            ? `${m.behaviourTag} (${m.behaviourScore >= 0 ? `+${m.behaviourScore}` : m.behaviourScore})`
            : 'Normal (0)'
          return [
            String(idx + 1),
            m.name,
            `${m.completed} / ${m.totalVisits}`,
            `${m.leadVisits}L / ${m.supportVisits}S`,
            `${(m.totalSqft || 0).toLocaleString()} SFT`,
            `${m.reportCompleteness || 0}%`,
            attendanceDisplay,
            tagDisplay,
            String(m.operationalScore || 0),
            `${m.performance || 0} / 100`,
          ]
        }),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.2, lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 46, fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'right' },
      9: { halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      // Footer on every page
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Aesthetic CRM • Visit Department Performance • Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
        14,
        pageHeight - 6,
      )
      doc.text(
        'Formula: Performance = Operational Field (Max 80) + Attendance (Max 10) + Behaviour (+/- points)',
        pageWidth - 14,
        pageHeight - 6,
        { align: 'right' },
      )
    },
  })

  // Behaviour Scoring Rules Note
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? (yPos + 40)
  if (finalY + 22 < pageHeight) {
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(14, finalY + 4, pageWidth - 28, 16, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    doc.text('Scoring System & Marks Legend:', 18, finalY + 9)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text(
      '• Attendance: 10 marks baseline. Deducts 2 marks per absent day recorded for the month.',
      18,
      finalY + 13.5,
    )
    doc.text(
      '• Behaviour Points: Positive tags add marks (Best: +10, Better: +5, Good: +2). Negative tags penalize (Bad: -5, Worse: -10, Worst: -15). Normal: 0.',
      18,
      finalY + 17,
    )
  }

  // Save the PDF
  const safeMonth = monthKey.replace(/[^0-9-]/g, '')
  doc.save(`Visit-Team-Performance-${safeMonth || 'monthly'}.pdf`)
}
