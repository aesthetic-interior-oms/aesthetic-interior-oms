'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertCircle,
  ArrowUpRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Layers,
  RefreshCw,
  Trophy,
  UserCheck,
  Zap,
} from 'lucide-react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

type StatusBreakdownItem = {
  name: string
  value: number
  color: string
}

type MonthlyTrendItem = {
  month: string
  created: number
  completed: number
}

type RecentLeadItem = {
  id: string
  name: string
  status: string
  assignee: string
  updatedAt: string
}

type DashboardStats = {
  totalAssignedTasks: number
  assignedCount: number
  workingCount: number
  completedCount: number
  correctionCount: number
  totalSqftHandled: number
  statusBreakdown: StatusBreakdownItem[]
  monthlyTrends: MonthlyTrendItem[]
  recentLeads: RecentLeadItem[]
  draftCount: number
}

type PerformanceMember = {
  rank: number
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

type DepartmentSummary = {
  totalTeamMembers: number
  totalDepartmentSqft: number
  totalDetailSqft: number
  totalShortSqft: number
  totalCompletedQuotations: number
  avgDepartmentSpeedHours: number
}

function getRecentMonthsList() {
  const months: { label: string; value: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const monthKey = `${yyyy}-${mm}`
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    months.push({ label, value: monthKey })
  }
  return months
}

export default function QuotationTeamDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  // Performance state
  const availableMonths = getRecentMonthsList()
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0]?.value ?? '')
  const [perfLoading, setPerfLoading] = useState(true)
  const [myPerformance, setMyPerformance] = useState<PerformanceMember | null>(null)
  const [deptSummary, setDeptSummary] = useState<DepartmentSummary | null>(null)
  const [leaderboard, setLeaderboard] = useState<PerformanceMember[]>([])

  const fetchDashboardData = async (monthKey: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/quotation/dashboard?month=${monthKey}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to load dashboard metrics')
      }
      setStats(payload.stats as DashboardStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics')
    } finally {
      setLoading(false)
    }
  }

  const fetchPerformanceData = async (monthKey: string) => {
    setPerfLoading(true)
    try {
      const response = await fetch(`/api/quotation/performance?month=${monthKey}`, { cache: 'no-store' })
      const payload = await response.json()
      if (response.ok && payload.success) {
        setMyPerformance(payload.myPerformance as PerformanceMember | null)
        setDeptSummary(payload.departmentSummary as DepartmentSummary)
        setLeaderboard(payload.leaderboard as PerformanceMember[])
      }
    } catch (err) {
      console.error('Failed to load quotation performance data:', err)
    } finally {
      setPerfLoading(false)
    }
  }

  useEffect(() => {
    if (selectedMonth) {
      void fetchDashboardData(selectedMonth)
      void fetchPerformanceData(selectedMonth)
    }
  }, [selectedMonth])

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="Quotation Team Dashboard"
        subtitle="Real-time analytics, pipeline breakdown, performance trends, and pre-calculated department metrics."
      />

      <main className="mx-auto max-w-[1440px] space-y-8 px-6 py-6">
        {/* Header Action Row & Month Filter */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Quotation Department Performance</h2>
            <p className="text-xs text-muted-foreground">Pre-calculated on backend for zero-latency loading</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void fetchDashboardData(selectedMonth)
                void fetchPerformanceData(selectedMonth)
              }}
              disabled={loading || perfLoading}
              className="h-9"
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading || perfLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" asChild className="h-9">
              <Link href="/quotation-team/my-work">
                View My Work Queue
                <ArrowUpRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Error Notification */}
        {error ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </CardContent>
          </Card>
        ) : null}

        {/* --- PERFORMANCE SYSTEM SECTION --- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Monthly Team Performance</h3>
            <Badge variant="outline" className="text-xs font-normal">
              Month: {availableMonths.find((m) => m.value === selectedMonth)?.label ?? selectedMonth}
            </Badge>
          </div>

          {/* Performance Overview Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* My Rank & Score Card */}
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  My Performance Rank
                </CardTitle>
                <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </CardHeader>
              <CardContent>
                {perfLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                ) : myPerformance ? (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-amber-950 dark:text-amber-100">
                        #{myPerformance.rank}
                      </span>
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                        ({myPerformance.performanceScore} pts)
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/70">
                      Out of {deptSummary?.totalTeamMembers ?? 0} team members
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No personal activity recorded for this month</p>
                )}
              </CardContent>
            </Card>

            {/* Total Detail SQFT Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Detail Quotation SQFT</CardTitle>
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {perfLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold">
                      {(deptSummary?.totalDetailSqft ?? 0).toLocaleString()}{' '}
                      <span className="text-xs font-normal text-muted-foreground">SFT</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Mine: <span className="font-semibold text-foreground">{(myPerformance?.detailSqft ?? 0).toLocaleString()} SFT</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total Short SQFT Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Short Quotation SQFT</CardTitle>
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                  <FileText className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {perfLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {(deptSummary?.totalShortSqft ?? 0).toLocaleString()}{' '}
                      <span className="text-xs font-normal text-muted-foreground">SFT</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Mine: <span className="font-semibold text-foreground">{(myPerformance?.shortSqft ?? 0).toLocaleString()} SFT</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Avg Completion Speed Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Completion Speed</CardTitle>
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                  <Zap className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {perfLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {deptSummary?.avgDepartmentSpeedHours ?? 0} <span className="text-xs font-normal text-muted-foreground">hours</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Mine: <span className="font-semibold text-foreground">{myPerformance?.avgWorkingHours ?? 0} hrs / task</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Department Leaderboard & Comparison Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base font-bold">Team Member Performance Leaderboard</CardTitle>
                <CardDescription>
                  Pre-calculated stats for all quotation department members for{' '}
                  <span className="font-medium text-foreground">
                    {availableMonths.find((m) => m.value === selectedMonth)?.label}
                  </span>
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {leaderboard.length} Members
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {perfLoading ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No quotation team performance data recorded for this month.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-muted/50 text-left text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="w-16 px-4 py-3 text-center">Rank</th>
                        <th className="px-4 py-3">Member Name</th>
                        <th className="px-4 py-3 text-right">Detail SQFT</th>
                        <th className="px-4 py-3 text-right">Short SQFT</th>
                        <th className="px-4 py-3 text-right">Total SQFT</th>
                        <th className="px-4 py-3 text-center">Completed</th>
                        <th className="px-4 py-3 text-right">Avg Speed</th>
                        <th className="px-4 py-3 text-right font-bold text-foreground">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {leaderboard.map((member) => {
                        const isMe = member.userId === myPerformance?.userId
                        return (
                          <tr
                            key={member.userId}
                            className={`hover:bg-muted/30 transition-colors ${
                              isMe ? 'bg-amber-500/10 font-medium dark:bg-amber-500/15' : ''
                            }`}
                          >
                            <td className="px-4 py-3 text-center">
                              {member.rank === 1 ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow-xs">
                                  1
                                </span>
                              ) : member.rank === 2 ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-slate-800 shadow-xs">
                                  2
                                </span>
                              ) : member.rank === 3 ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white shadow-xs">
                                  3
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">#{member.rank}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{member.fullName}</span>
                                {isMe ? <Badge variant="outline" className="text-[10px]">You</Badge> : null}
                              </div>
                              <span className="text-xs text-muted-foreground">{member.email}</span>
                            </td>
                            <td className="px-4 py-3 text-right">{member.detailSqft.toLocaleString()} SFT</td>
                            <td className="px-4 py-3 text-right">{member.shortSqft.toLocaleString()} SFT</td>
                            <td className="px-4 py-3 text-right font-semibold text-foreground">
                              {member.totalSqft.toLocaleString()} SFT
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="secondary" className="text-xs">
                                {member.completedCount}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                              {member.avgWorkingHours > 0 ? `${member.avgWorkingHours} hrs` : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-extrabold text-primary">
                                {member.performanceScore} / 100
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
        </div>

        {/* --- KPI STATS SECTION --- */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Assigned Tasks</CardTitle>
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                <Layers className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-3xl font-extrabold">{stats?.totalAssignedTasks ?? 0}</div>
                  <p className="mt-1 text-xs text-muted-foreground">Leads assigned to your queue</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active In-Progress</CardTitle>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                    {stats?.workingCount ?? 0}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Currently being edited / drafted</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed &amp; Approved</CardTitle>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {stats?.completedCount ?? 0}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Successfully finalized quotations</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total SQFT Volume</CardTitle>
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                    {(stats?.totalSqftHandled ?? 0).toLocaleString()} <span className="text-base font-normal">SFT</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Calculated across assigned visit records</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Section using Recharts */}
        <div className="grid gap-6 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Monthly Workflow Activity</CardTitle>
              <CardDescription>Comparison of assigned vs completed quotations over recent months</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4 py-6">
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.monthlyTrends ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                      <YAxis className="text-xs fill-muted-foreground" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--background)',
                          borderColor: 'var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="created" name="Assigned Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed Quotations" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Status Breakdown</CardTitle>
              <CardDescription>Current stage distribution of your assigned lead queue</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center space-y-4 py-8">
                  <Skeleton className="h-44 w-44 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.statusBreakdown ?? []}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {(stats?.statusBreakdown ?? []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--background)',
                          borderColor: 'var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        content={({ payload }) => (
                          <div className="flex flex-wrap justify-center gap-4 text-xs">
                            {payload?.map((entry, idx) => (
                              <div key={`item-${idx}`} className="flex items-center gap-1.5">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="font-medium text-foreground">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Work Activity & Quick Navigation */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base font-semibold">Recent Quotation Queue</CardTitle>
                <CardDescription>Latest active quotation leads in process</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/quotation-team/my-work">View All</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (stats?.recentLeads ?? []).length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No active quotation assignments found.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {stats?.recentLeads.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Assignee: <span className="font-medium">{item.assignee}</span> • Updated:{' '}
                          {new Date(item.updatedAt).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            item.status === 'QUOTATION_APPROVED' || item.status === 'QUOTATION_COMPLETED'
                              ? 'default'
                              : item.status === 'QUOTATION_WORKING'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {item.status.replace(/_/g, ' ')}
                        </Badge>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/quotation-team/leads/${item.id}`}>Open Workspace</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold">Quotation Tools &amp; Resources</CardTitle>
              <CardDescription>Shortcuts for studio templates and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/quotation-team/settings"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="rounded-md bg-amber-500/10 p-2 text-amber-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Template Settings</p>
                  <p className="text-xs text-muted-foreground">Manage item prices and material defaults</p>
                </div>
              </Link>

              <Link
                href="/crm/admin/quotation-playground"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="rounded-md bg-blue-500/10 p-2 text-blue-600">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Quotation Playground</p>
                  <p className="text-xs text-muted-foreground">Test layout structures without modifying lead data</p>
                </div>
              </Link>

              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-xs font-semibold text-foreground">Total Draft Records</p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{stats?.draftCount ?? 0}</span>
                  <span className="text-xs text-muted-foreground">Saved in database</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
