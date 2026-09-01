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
  CheckCircle2,
  Clock,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Layers,
  RefreshCw,
} from 'lucide-react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

export default function QuotationTeamDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/quotation/dashboard', { cache: 'no-store' })
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

  useEffect(() => {
    void fetchDashboardData()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="Quotation Team Dashboard"
        subtitle="Real-time analytics, pipeline breakdown, performance trends, and assigned quotation queues."
      />

      <main className="mx-auto max-w-[1440px] space-y-6 px-6 py-6">
        {/* Header Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Performance Overview</h2>
            <p className="text-xs text-muted-foreground">Updated from backend database records</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchDashboardData()}
              disabled={loading}
              className="h-9"
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
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

        {/* KPI Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Assigned */}
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

          {/* Card 2: In Working */}
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

          {/* Card 3: Completed / Approved */}
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

          {/* Card 4: Total SQFT Handled */}
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
          {/* Chart 1: Monthly Trends (Bar Chart) - 4 cols */}
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

          {/* Chart 2: Status Distribution (Pie Chart) - 3 cols */}
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
          {/* Recent Queue - 2 cols */}
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

          {/* Quick Tools & Shortcuts - 1 col */}
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
