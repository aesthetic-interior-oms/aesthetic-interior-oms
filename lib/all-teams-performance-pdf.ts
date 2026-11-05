import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type SrCrmItem = {
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
}

export type VisitTeamItem = {
  id: string
  name: string
  totalVisits: number
  completed: number
  reportCompleteness: number
  totalSqft: number
  avgSqft: number
  performance: number
  leadVisits: number
  supportVisits: number
  absentDays?: number
  attendanceScore?: number
  behaviourTag?: string | null
  behaviourScore?: number
  isEnabled?: boolean
}

export type JrArchitectItem = {
  id: string
  totalWork: number
  totalSqft: number
  totalTimeMinutes: number
  performanceScore: number
  user: {
    fullName: string
  }
}

export type QuotationItem = {
  userId: string
  fullName: string
  email: string
  detailSqft: number
  shortSqft: number
  totalSqft: number
  completedCount: number
  avgWorkingHours: number
  performanceScore: number
}

export type AllTeamsPerformancePdfProps = {
  monthKey: string
  srCrmMembers: SrCrmItem[]
  visitTeamMembers: VisitTeamItem[]
  jrArchitectMembers: JrArchitectItem[]
  quotationMembers: QuotationItem[]
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

export async function generateAllTeamsPerformancePdf({
  monthKey,
  srCrmMembers,
  visitTeamMembers,
  jrArchitectMembers,
  quotationMembers,
}: AllTeamsPerformancePdfProps) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const monthLabel = formatMonthTitle(monthKey)
  const generatedDateLabel = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const logoDataUrl = await loadLogoBase64('/Logo/HeaderLogo.png')

  // Calculate high-level team averages
  const srCrmAvg = srCrmMembers.length
    ? Math.round(srCrmMembers.reduce((sum, m) => sum + (m.totalPerformance || 0), 0) / srCrmMembers.length)
    : 0

  const visitTeamAvg = visitTeamMembers.length
    ? Math.round(visitTeamMembers.reduce((sum, m) => sum + (m.performance || 0), 0) / visitTeamMembers.length)
    : 0

  const jrArchAvg = jrArchitectMembers.length
    ? Math.round(jrArchitectMembers.reduce((sum, m) => sum + (m.performanceScore || 0), 0) / jrArchitectMembers.length)
    : 0

  const quotationAvg = quotationMembers.length
    ? Math.round(quotationMembers.reduce((sum, m) => sum + (m.performanceScore || 0), 0) / quotationMembers.length)
    : 0

  // Header branding helper
  const drawPageHeader = (pageTitle: string) => {
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 14, 8, 48, 9)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(31, 54, 61)
      doc.text(pageTitle, 68, 14)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(100, 116, 139)
      doc.text(`Month: ${monthLabel}`, 68, 19)
      doc.text(`Generated: ${generatedDateLabel}`, pageWidth - 14, 19, { align: 'right' })
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(31, 54, 61)
      doc.text(pageTitle, 14, 14)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(100, 116, 139)
      doc.text(`Month: ${monthLabel}`, 14, 20)
      doc.text(`Generated: ${generatedDateLabel}`, pageWidth - 14, 20, { align: 'right' })
    }

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(14, 23, pageWidth - 14, 23)

    return 27
  }

  // ─────────────────────────────────────────────────────────────
  // PAGE 1: EXECUTIVE SUMMARY & SR CRM PERFORMANCE
  // ─────────────────────────────────────────────────────────────
  let yPos = drawPageHeader('All Teams Performance Report — Executive Overview')

  // Executive summary cards banner
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, yPos, pageWidth - 28, 15, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(31, 54, 61)
  doc.text('EXECUTIVE TEAM SUMMARY:', 18, yPos + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  const summaryText = `SR CRM Avg: ${srCrmAvg}/100 (${srCrmMembers.length} members)   |   Visit Team Avg: ${visitTeamAvg}/100 (${visitTeamMembers.length} members)   |   JR Architect Avg: ${jrArchAvg}/100 (${jrArchitectMembers.length} members)   |   Quotation Team Avg: ${quotationAvg}/100 (${quotationMembers.length} members)`
  doc.text(summaryText, 18, yPos + 11)

  yPos += 20

  // Section 1: SR CRM Leaderboard
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(31, 54, 61)
  doc.text('1. Senior CRM (SR CRM) Performance Leaderboard', 14, yPos)
  yPos += 3

  autoTable(doc, {
    startY: yPos,
    head: [[
      'Rank',
      'Name',
      'Active SQFT',
      'Agreement SQFT',
      'Agreement Value',
      'Design Review (/30)',
      'Meeting (/20)',
      'Conversion (/20)',
      'SQFT (/15)',
      'Value (/15)',
      'Total (/100)',
    ]],
    body: srCrmMembers.length === 0
      ? [['-', 'No SR CRM records for this month', '-', '-', '-', '-', '-', '-', '-', '-', '-']]
      : srCrmMembers.map((m, idx) => [
          String(idx + 1),
          m.name,
          `${(m.activeProjectSqft || 0).toLocaleString()} SFT`,
          `${(m.agreementSqft || 0).toLocaleString()} SFT`,
          `BDT ${(m.totalAgreementValue || 0).toLocaleString()}`,
          `${m.review?.score || 0} / 30`,
          `${m.meeting?.score || 0} / 20`,
          `${m.conversion?.score || 0} / 20`,
          `${m.sqftScore || 0} / 15`,
          `${m.agreementScore || 0} / 15`,
          `${m.totalPerformance || 0} / 100`,
        ]),
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: [31, 54, 61], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'right', fontStyle: 'bold' },
    },
  })

  // ─────────────────────────────────────────────────────────────
  // PAGE 2: VISIT TEAM PERFORMANCE
  // ─────────────────────────────────────────────────────────────
  doc.addPage()
  yPos = drawPageHeader(`All Teams Performance — Visit Team (${monthLabel})`)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(31, 54, 61)
  doc.text('2. Visit Team Performance & Field Metrics', 14, yPos)
  yPos += 3

  const activeVisitTeamMembers = visitTeamMembers.filter((m) => m.isEnabled !== false)

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
    body: activeVisitTeamMembers.length === 0
      ? [['-', 'No Visit Team records for this month', '-', '-', '-', '-', '-', '-']]
      : activeVisitTeamMembers.map((m, idx) => [
          String(idx + 1),
          m.name,
          `${m.completed || 0} / ${m.totalVisits || 0}`,
          `${m.leadVisits || 0}L / ${m.supportVisits || 0}S`,
          (m.totalSqft || 0).toLocaleString(),
          m.absentDays !== undefined ? (m.absentDays > 0 ? `${m.absentDays}d abs` : 'Full') : 'Full',
          m.behaviourTag ? m.behaviourTag.toUpperCase() : 'Normal',
          `${m.performance || 0} / 100`,
        ]),
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
      7: { halign: 'right', fontStyle: 'bold' },
    },
  })

  // ─────────────────────────────────────────────────────────────
  // PAGE 3: JR ARCHITECT (CAD) & QUOTATION TEAM PERFORMANCE
  // ─────────────────────────────────────────────────────────────
  doc.addPage()
  yPos = drawPageHeader(`All Teams Performance — JR Architect & Quotation (${monthLabel})`)

  // Section 3: JR Architect
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(31, 54, 61)
  doc.text('3. Junior Architect (CAD) Performance Leaderboard', 14, yPos)
  yPos += 3

  autoTable(doc, {
    startY: yPos,
    head: [[
      'Rank',
      'Junior Architect Name',
      'Total CAD Submissions',
      'Total SQFT Designed',
      'Total Turnaround Time (Hours)',
      'Performance Score (/100)',
    ]],
    body: jrArchitectMembers.length === 0
      ? [['-', 'No Junior Architect records for this month', '-', '-', '-', '-']]
      : jrArchitectMembers.map((m, idx) => {
          const hours = m.totalTimeMinutes ? (m.totalTimeMinutes / 60).toFixed(1) : '0'
          return [
            String(idx + 1),
            m.user?.fullName || 'Architect',
            String(m.totalWork || 0),
            `${(m.totalSqft || 0).toLocaleString()} SFT`,
            `${hours} hrs`,
            `${m.performanceScore || 0} / 100`,
          ]
        }),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' }, // Indigo
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 60, fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  })

  // Section 4: Quotation Team
  const finalYJr = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY) || yPos + 40
  let yQuotation = finalYJr + 10

  if (yQuotation > pageHeight - 50) {
    doc.addPage()
    yQuotation = drawPageHeader(`All Teams Performance — Quotation Team (${monthLabel})`)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(31, 54, 61)
  doc.text('4. Quotation & BOQ Team Performance Leaderboard', 14, yQuotation)
  yQuotation += 3

  autoTable(doc, {
    startY: yQuotation,
    head: [[
      'Rank',
      'Quotation Member Name',
      'Detail BOQ SQFT',
      'Short Quotation SQFT',
      'Total SQFT Estimated',
      'Completed Drafts',
      'Avg Hours / Draft',
      'Performance Score (/100)',
    ]],
    body: quotationMembers.length === 0
      ? [['-', 'No Quotation records for this month', '-', '-', '-', '-', '-', '-']]
      : quotationMembers.map((m, idx) => [
          String(idx + 1),
          m.fullName || 'Member',
          `${(m.detailSqft || 0).toLocaleString()} SFT`,
          `${(m.shortSqft || 0).toLocaleString()} SFT`,
          `${(m.totalSqft || 0).toLocaleString()} SFT`,
          String(m.completedCount || 0),
          `${(m.avgWorkingHours || 0).toFixed(1)} hrs`,
          `${m.performanceScore || 0} / 100`,
        ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold' }, // Amber
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
  })

  // ─────────────────────────────────────────────────────────────
  // FOOTER ON ALL PAGES
  // ─────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Aesthetic Interior Studio — All Teams Monthly Performance Report (${monthLabel})`,
      14,
      pageHeight - 7,
    )
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 14,
      pageHeight - 7,
      { align: 'right' },
    )
  }

  // Save the PDF
  const cleanMonth = monthKey.replace(/[^a-zA-Z0-9-]/g, '_')
  doc.save(`All_Teams_Performance_${cleanMonth}.pdf`)
}
