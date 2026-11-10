'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { generateJrArchitectPerformancePdf } from '@/lib/jr-architect-performance-pdf'
import { toast } from 'sonner'

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
  title = "Team Performance Leaderboard",
  monthKey,
}: {
  performances: any[]
  title?: string
  monthKey?: string
}) {
  const [downloading, setDownloading] = useState(false)

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const activeMonthKey = monthKey || new Date().toISOString().slice(0, 7)
      await generateJrArchitectPerformancePdf({
        monthKey: activeMonthKey,
        members: performances,
        generatedBy: 'Admin',
      })
      toast.success('JR Architect Performance PDF downloaded')
    } catch (err) {
      console.error(err)
      toast.error('Failed to download performance PDF')
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

