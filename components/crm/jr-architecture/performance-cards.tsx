'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

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

export function MemberPerformanceCard({
  performance,
  topScore,
}: {
  performance: any
  topScore: number
}) {
  const isTopPerformer = performance?.performanceScore >= topScore && topScore > 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Your Performance (This Month)</CardTitle>
        {isTopPerformer && <Badge variant="default">Top Performer 🏆</Badge>}
      </CardHeader>
      <CardContent>
        <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Total CAD Work</span>
            <span className="text-2xl font-bold">{performance?.totalWork || 0}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Total Sqft</span>
            <span className="text-2xl font-bold">{performance?.totalSqft?.toLocaleString() || 0}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Avg Time</span>
            <span className="text-2xl font-bold">
              {performance?.totalWork
                ? `${(performance.totalTimeMinutes / performance.totalWork / 60).toFixed(1)}h (${(performance.totalTimeMinutes / performance.totalWork / 60 / 24).toFixed(1)}d)`
                : '0h'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Score</span>
            <span className="text-2xl font-bold text-primary">
              {performance?.performanceScore || 0}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function LeaderboardCard({
  performances,
  title = "Team Performance Leaderboard"
}: {
  performances: any[]
  title?: string
}) {
  const [downloading, setDownloading] = useState(false)

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape' })
      const pageWidth = doc.internal.pageSize.getWidth()

      const logoDataUrl = await loadLogoBase64('/Logo/HeaderLogo.png')

      const now = new Date()
      const currentMonthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
      const dateLabel = now.toLocaleDateString('en-GB')

      const totalMembers = performances.length
      const teamAvgScore = totalMembers > 0
        ? (performances.reduce((sum, p) => sum + (p.performanceScore || 0), 0) / totalMembers).toFixed(1)
        : '0'
      const totalCadWork = performances.reduce((sum, p) => sum + (p.totalWork || 0), 0)
      const totalSqft = performances.reduce((sum, p) => sum + (p.totalSqft || 0), 0)

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 14, 10, 54, 10)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(31, 54, 61) // #1f363d PRIMARY
        doc.text('JR Architect Performance Leaderboard', 74, 17)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(100, 116, 139)
        doc.text(`Month: ${currentMonthLabel}`, 74, 23)
        doc.text(`Generated: ${dateLabel}`, pageWidth - 14, 23, { align: 'right' })

        doc.setTextColor(30, 41, 59)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(
          `Members: ${totalMembers}  |  Team Avg: ${teamAvgScore}/100  |  Total CAD Work: ${totalCadWork}  |  Total SQFT: ${totalSqft.toLocaleString()}`,
          14,
          31,
        )
      } else {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(31, 54, 61)
        doc.text('JR Architect Performance Leaderboard', 14, 16)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(100, 116, 139)
        doc.text(`Month: ${currentMonthLabel}`, 14, 23)
        doc.text(`Generated: ${dateLabel}`, pageWidth - 14, 23, { align: 'right' })

        doc.setTextColor(30, 41, 59)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(
          `Members: ${totalMembers}  |  Team Avg: ${teamAvgScore}/100  |  Total CAD Work: ${totalCadWork}  |  Total SQFT: ${totalSqft.toLocaleString()}`,
          14,
          31,
        )
      }

      const WORK_BENCHMARK = 20
      const SQFT_BENCHMARK = 70000
      const AVG_HOURS_BENCHMARK = 48

      autoTable(doc, {
        startY: 38,
        head: [[
          'Rank',
          'Name',
          'CAD Work',
          'Total SQFT',
          'Avg Time',
          'Work Score /40',
          'SQFT Score /40',
          'Speed Score /20',
          'Final Score /100',
        ]],
        body: performances.map((p, idx) => {
          const work = p.totalWork || 0
          const sqft = p.totalSqft || 0
          const timeMins = p.totalTimeMinutes || 0

          const avgHours = work > 0 ? timeMins / work / 60 : 0
          const avgDays = avgHours / 24
          const avgTimeStr = work > 0 ? `${avgHours.toFixed(1)}h (${avgDays.toFixed(1)}d)` : '0h'

          let workScore = 0
          let sqftScore = 0
          let speedScore = 0

          if (work > 0) {
            workScore = Number(((work / WORK_BENCHMARK) * 40).toFixed(1))
            sqftScore = Number(((sqft / SQFT_BENCHMARK) * 40).toFixed(1))
            speedScore = Number(((AVG_HOURS_BENCHMARK / Math.max(1, avgHours)) * 20).toFixed(1))
          }

          return [
            String(idx + 1),
            p.user?.fullName || p.user?.email || 'N/A',
            String(work),
            sqft.toLocaleString(),
            avgTimeStr,
            `${workScore} / 40`,
            `${sqftScore} / 40`,
            `${speedScore} / 20`,
            `${(p.performanceScore || 0).toFixed(1)} / 100`,
          ]
        }),
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [31, 54, 61], // #1f363d PRIMARY
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 50 },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right', fontStyle: 'bold' },
        },
        didDrawPage: () => {
          doc.setFontSize(7)
          doc.setTextColor(100, 116, 139)
          doc.text(`Aesthetic Interior - JR Architect Performance Leaderboard - ${currentMonthLabel}`, 14, 202)
          doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - 14, 202, { align: 'right' })
        },
      })

      doc.save(`jr-architect-performance-leaderboard.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card className="xl:col-span-3">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {title}
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void downloadPdf()}
          disabled={downloading || performances.length === 0}
          className="h-9 gap-2"
        >
          <Download className="size-4" />
          {downloading ? 'Preparing' : 'Download PDF'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Rank</th>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-right font-medium">CAD Work</th>
                <th className="p-3 text-right font-medium">Total Sqft</th>
                <th className="p-3 text-right font-medium">Avg Time</th>
                <th className="p-3 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {performances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    No performance data this month.
                  </td>
                </tr>
              ) : (
                performances.map((p, idx) => {
                  const avgHours = p.totalWork > 0 ? (p.totalTimeMinutes / p.totalWork / 60) : 0
                  const avgDays = avgHours / 24
                  const avgTime = p.totalWork > 0 ? `${avgHours.toFixed(1)}h (${avgDays.toFixed(1)}d)` : '0h'
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3 text-left">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </td>
                      <td className="p-3 text-left font-medium">{p.user?.fullName || p.user?.email || 'N/A'}</td>
                      <td className="p-3 text-right">{p.totalWork}</td>
                      <td className="p-3 text-right">{(p.totalSqft || 0).toLocaleString()}</td>
                      <td className="p-3 text-right">{avgTime}</td>
                      <td className="p-3 text-right font-bold">{p.performanceScore || 0}%</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

