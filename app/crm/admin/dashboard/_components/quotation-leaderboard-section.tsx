'use client'

import { useMemo, useState } from 'react'
import { Calendar, Download, Medal, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type QuotationPerformanceItem = {
  userId: string
  fullName: string
  email: string
  detailSqft: number
  shortSqft: number
  totalSqft: number
  completedCount: number
  avgWorkingHours: number
  performanceScore: number
  updatedAt: string | null
}

type QuotationPerformanceResponse = {
  success: boolean
  monthKey?: string
  leaderboard?: QuotationPerformanceItem[]
  error?: string
}

type MonthOption = {
  label: string
  value: string
}

function getRecentMonthsList(): MonthOption[] {
  const months: MonthOption[] = []
  const now = new Date()

  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    months.push({
      label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      value: `${yyyy}-${mm}`,
    })
  }

  return months
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey

  return new Date(year, month - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString() : '0'
}

function getScoreBreakdown(item: QuotationPerformanceItem) {
  const sqftScore = Math.min(50, (item.totalSqft / 10000) * 50)
  const countScore = Math.min(30, (item.completedCount / 10) * 30)
  const speedScore =
    item.completedCount > 0 ? Math.min(20, Math.max(5, 20 - (item.avgWorkingHours / 24) * 5)) : 0

  return {
    sqftScore: Number(sqftScore.toFixed(1)),
    countScore: Number(countScore.toFixed(1)),
    speedScore: Number(speedScore.toFixed(1)),
  }
}

function toDateLabel(value: string | null): string {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
}

export function QuotationLeaderboardSection({
  initialPerformances,
  initialMonthKey,
}: {
  initialPerformances: QuotationPerformanceItem[]
  initialMonthKey: string
}) {
  const monthOptions = useMemo(() => getRecentMonthsList(), [])
  const [selectedMonth, setSelectedMonth] = useState(initialMonthKey)
  const [performances, setPerformances] = useState(initialPerformances)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monthLabel = formatMonthLabel(selectedMonth)
  const teamAverage = performances.length
    ? Math.round(performances.reduce((sum, item) => sum + item.performanceScore, 0) / performances.length)
    : 0

  const loadMonth = async (monthKey: string) => {
    setSelectedMonth(monthKey)
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/quotation/performance?month=${monthKey}`, { cache: 'no-store' })
      const payload = (await response.json()) as QuotationPerformanceResponse

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to load quotation performance')
      }

      setPerformances(payload.leaderboard ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotation performance')
      setPerformances([])
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape' })
      const pageWidth = doc.internal.pageSize.getWidth()

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Quotation Team Performance Leaderboard', 14, 16)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text(`Month: ${monthLabel}`, 14, 23)
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 14, 23, { align: 'right' })

      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'bold')
      doc.text(`Members: ${performances.length}`, 14, 31)
      doc.text(`Team Average: ${teamAverage}/100`, 55, 31)
      doc.text(
        `Total SQFT: ${formatNumber(performances.reduce((sum, item) => sum + item.totalSqft, 0))}`,
        105,
        31,
      )

      autoTable(doc, {
        startY: 38,
        head: [[
          'Rank',
          'Name',
          'Email',
          'Detail SQFT',
          'Short SQFT',
          'Total SQFT',
          'Completed',
          'Avg Hours',
          'SQFT Score /50',
          'Count Score /30',
          'Speed Score /20',
          'Final /100',
          'Updated',
        ]],
        body: performances.map((item, index) => {
          const score = getScoreBreakdown(item)
          return [
            String(index + 1),
            item.fullName,
            item.email,
            formatNumber(item.detailSqft),
            formatNumber(item.shortSqft),
            formatNumber(item.totalSqft),
            String(item.completedCount),
            item.avgWorkingHours > 0 ? item.avgWorkingHours.toFixed(1) : '0',
            score.sqftScore.toFixed(1),
            score.countScore.toFixed(1),
            score.speedScore.toFixed(1),
            item.performanceScore.toFixed(1),
            toDateLabel(item.updatedAt),
          ]
        }),
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 1.6,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [245, 158, 11],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 32 },
          2: { cellWidth: 45 },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'center' },
          7: { halign: 'right' },
          8: { halign: 'right' },
          9: { halign: 'right' },
          10: { halign: 'right' },
          11: { halign: 'right', fontStyle: 'bold' },
        },
        didDrawPage: () => {
          doc.setFontSize(7)
          doc.setTextColor(100, 116, 139)
          doc.text(`Aesthetic Interior - Quotation Team - ${monthLabel}`, 14, 202)
          doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - 14, 202, { align: 'right' })
        },
      })

      doc.save(`quotation-team-performance-${safeFilePart(selectedMonth)}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Medal className="size-4 text-amber-500" />
            Quotation Team Performance Leaderboard
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Pre-calculated monthly SQFT volume, completion count, working speed, and score breakdown.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{performances.length} Members</Badge>
          <Badge variant="secondary">Team avg {teamAverage}/100</Badge>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <Select value={selectedMonth} onValueChange={(value) => void loadMonth(value)}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadMonth(selectedMonth)}
            disabled={loading || downloading}
            className="h-9 gap-2"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => void downloadPdf()}
            disabled={loading || downloading || performances.length === 0}
            className="h-9 gap-2"
          >
            <Download className="size-4" />
            {downloading ? 'Preparing' : 'Download PDF'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <p className="border-t border-border p-4 text-sm text-destructive">{error}</p>
        ) : null}

        {loading ? (
          <p className="border-t border-border p-5 text-center text-sm text-muted-foreground">
            Loading {monthLabel} performance data...
          </p>
        ) : performances.length === 0 ? (
          <p className="border-t border-border p-5 text-center text-sm text-muted-foreground">
            No quotation team performance data recorded for {monthLabel}.
          </p>
        ) : (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-muted/50 text-left text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="w-16 p-3 text-center">Rank</th>
                  <th className="p-3">Name</th>
                  <th className="p-3 text-right">Detail SQFT</th>
                  <th className="p-3 text-right">Short SQFT</th>
                  <th className="p-3 text-right">Total SQFT</th>
                  <th className="p-3 text-center">Completed</th>
                  <th className="p-3 text-right">Avg Hours</th>
                  <th className="p-3 text-right">SQFT Score</th>
                  <th className="p-3 text-right">Count Score</th>
                  <th className="p-3 text-right">Speed Score</th>
                  <th className="p-3 text-right font-bold text-foreground">Final Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {performances.map((item, idx) => {
                  const score = getScoreBreakdown(item)
                  return (
                    <tr key={item.userId} className="transition-colors hover:bg-muted/30">
                      <td className="p-3 text-center font-bold text-muted-foreground">#{idx + 1}</td>
                      <td className="p-3">
                        <span className="font-semibold text-foreground">{item.fullName}</span>
                        <p className="text-xs text-muted-foreground">{item.email}</p>
                      </td>
                      <td className="p-3 text-right">{formatNumber(item.detailSqft)} SFT</td>
                      <td className="p-3 text-right">{formatNumber(item.shortSqft)} SFT</td>
                      <td className="p-3 text-right font-semibold text-foreground">{formatNumber(item.totalSqft)} SFT</td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary" className="text-xs">{item.completedCount}</Badge>
                      </td>
                      <td className="p-3 text-right text-xs text-muted-foreground">
                        {item.avgWorkingHours > 0 ? `${item.avgWorkingHours} hrs` : 'N/A'}
                      </td>
                      <td className="p-3 text-right text-xs text-muted-foreground">{score.sqftScore} / 50</td>
                      <td className="p-3 text-right text-xs text-muted-foreground">{score.countScore} / 30</td>
                      <td className="p-3 text-right text-xs text-muted-foreground">{score.speedScore} / 20</td>
                      <td className="p-3 text-right">
                        <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-extrabold text-amber-700 dark:text-amber-300">
                          {item.performanceScore} / 100
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
