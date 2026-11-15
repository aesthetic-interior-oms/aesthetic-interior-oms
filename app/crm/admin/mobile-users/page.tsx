'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Smartphone,
  RefreshCw,
  Search,
  Bell,
  BellOff,
  Clock,
  Wifi,
  WifiOff,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity,
  Layers,
} from 'lucide-react'

import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type DeviceToken = {
  id: string
  platform: string
  createdAt: string
  updatedAt: string
}

type MobileUser = {
  id: string
  fullName: string
  email: string
  phone: string
  roles: string[]
  departments: string[]
  status: 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE' | 'NEVER'
  hasMobileRecord: boolean
  hasPushToken: boolean
  deviceTokensCount: number
  platform: string | null
  appVersion: string | null
  deviceModel: string | null
  lastMobileLoginAt: string | null
  lastMobileActiveAt: string | null
  deviceTokens: DeviceToken[]
}

type ApiResponse = {
  success: boolean
  stats: {
    totalUsers: number
    totalMobileUsers: number
    onlineNowCount: number
    activeTodayCount: number
    pushEnabledCount: number
    neverLoggedInCount: number
  }
  users: MobileUser[]
  refreshedAt: string
  error?: string
}

function timeAgo(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Never'

  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 45) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFullDate(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Never'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function MobileUsersPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE' | 'NEVER'>('ALL')
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'android' | 'ios'>('ALL')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/mobile-users', { cache: 'no-store' })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `Request failed with status ${res.status}`)
      }
      const json: ApiResponse = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch mobile user statuses')
      }
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mobile users')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()

    if (!autoRefresh) return
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadData(true)
      }
    }, 30_000)

    return () => clearInterval(interval)
  }, [loadData, autoRefresh])

  const filteredUsers = useMemo(() => {
    if (!data?.users) return []
    return data.users.filter((user) => {
      // Status filter
      if (statusFilter !== 'ALL' && user.status !== statusFilter) {
        return false
      }

      // Platform filter
      if (platformFilter !== 'ALL') {
        const userPlatform = (user.platform || '').toLowerCase()
        if (platformFilter === 'android' && !userPlatform.includes('android')) return false
        if (platformFilter === 'ios' && !userPlatform.includes('ios')) return false
      }

      // Search query
      if (search.trim()) {
        const query = search.trim().toLowerCase()
        const matchName = user.fullName.toLowerCase().includes(query)
        const matchEmail = user.email.toLowerCase().includes(query)
        const matchPhone = user.phone.toLowerCase().includes(query)
        const matchRole = user.roles.some((r) => r.toLowerCase().includes(query))
        const matchDept = user.departments.some((d) => d.toLowerCase().includes(query))
        const matchModel = (user.deviceModel || '').toLowerCase().includes(query)
        return matchName || matchEmail || matchPhone || matchRole || matchDept || matchModel
      }

      return true
    })
  }, [data?.users, statusFilter, platformFilter, search])

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="Mobile Users Monitor"
        subtitle="Track mobile app installations, active mobile sessions, and live device status"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh((prev) => !prev)}
              className="text-xs"
            >
              <Activity className={`mr-1.5 h-3.5 w-3.5 ${autoRefresh ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'}`} />
              Auto-refresh: {autoRefresh ? '30s' : 'Off'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => void loadData(true)}
              disabled={refreshing}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <main className="mx-auto max-w-[1440px] px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:gap-4">
          {/* Card 1: Total Mobile Installs */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Mobile Installs
              </CardTitle>
              <Smartphone className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">
                {loading ? '...' : data?.stats.totalMobileUsers ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                out of {data?.stats.totalUsers ?? 0} total CRM users
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Active Now */}
          <Card className="border-emerald-500/30 bg-emerald-500/[0.03] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Active Now
              </CardTitle>
              <Wifi className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {loading ? '...' : data?.stats.onlineNowCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Working in last 15 mins
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Active Today */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Today
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {loading ? '...' : data?.stats.activeTodayCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active in last 24 hours
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Push Notifications Active */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Push Active
              </CardTitle>
              <Bell className="h-4 w-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {loading ? '...' : data?.stats.pushEnabledCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Device push tokens ready
              </p>
            </CardContent>
          </Card>

          {/* Card 5: Never Logged In */}
          <Card className="border-border/60 shadow-sm col-span-2 sm:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Not Installed Yet
              </CardTitle>
              <WifiOff className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-muted-foreground">
                {loading ? '...' : data?.stats.neverLoggedInCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                No mobile activity yet
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60">
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <span className="text-xs text-muted-foreground font-medium mr-1">Status:</span>
            <Button
              size="sm"
              variant={statusFilter === 'ALL' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2.5 rounded-lg"
              onClick={() => setStatusFilter('ALL')}
            >
              All ({data?.users.length ?? 0})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'ONLINE' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2.5 rounded-lg text-emerald-600 dark:text-emerald-400"
              onClick={() => setStatusFilter('ONLINE')}
            >
              🟢 Online ({data?.stats.onlineNowCount ?? 0})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'ACTIVE_TODAY' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2.5 rounded-lg text-amber-600 dark:text-amber-400"
              onClick={() => setStatusFilter('ACTIVE_TODAY')}
            >
              🟡 Today ({data?.stats.activeTodayCount ?? 0})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'OFFLINE' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2.5 rounded-lg"
              onClick={() => setStatusFilter('OFFLINE')}
            >
              ⚪ Offline
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'NEVER' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2.5 rounded-lg text-muted-foreground"
              onClick={() => setStatusFilter('NEVER')}
            >
              Never Logged In ({data?.stats.neverLoggedInCount ?? 0})
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Platform filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as 'ALL' | 'android' | 'ios')}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Platforms</option>
              <option value="android">Android Only</option>
              <option value="ios">iOS Only</option>
            </select>

            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search name, phone, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <Card className="border-border/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-3">Role / Department</th>
                  <th className="py-3 px-3">Mobile Status</th>
                  <th className="py-3 px-3">Platform & Version</th>
                  <th className="py-3 px-3">Last Active</th>
                  <th className="py-3 px-3">Last Login</th>
                  <th className="py-3 px-4 text-center">Push Notifications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading mobile user status...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Smartphone className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      No users match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const initials = user.fullName
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0]?.toUpperCase())
                      .join('')

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {/* User Details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                              {initials || <UserCheck className="h-4 w-4" />}
                              {user.status === 'ONLINE' && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{user.fullName}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {user.phone} • {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Roles & Departments */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {user.roles.map((role) => (
                              <Badge
                                key={role}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 font-normal bg-background/50 border-border"
                              >
                                {role}
                              </Badge>
                            ))}
                            {user.departments.map((dept) => (
                              <Badge
                                key={dept}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 font-normal"
                              >
                                {dept}
                              </Badge>
                            ))}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3">
                          {user.status === 'ONLINE' ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Online Now
                            </Badge>
                          ) : user.status === 'ACTIVE_TODAY' ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Active Today
                            </Badge>
                          ) : user.status === 'OFFLINE' ? (
                            <Badge variant="outline" className="text-muted-foreground gap-1.5 text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Offline
                            </Badge>
                          ) : (
                            <Badge variant="ghost" className="text-muted-foreground/60 text-[11px]">
                              Not Installed
                            </Badge>
                          )}
                        </td>

                        {/* Platform & Version */}
                        <td className="py-3 px-3">
                          {user.platform ? (
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="secondary"
                                className="text-[10px] uppercase font-mono px-1.5 py-0"
                              >
                                {user.platform}
                              </Badge>
                              {user.appVersion && (
                                <span className="text-[10px] text-muted-foreground">
                                  v{user.appVersion}
                                </span>
                              )}
                              {user.deviceModel && (
                                <span className="text-[10px] text-muted-foreground/75 truncate max-w-[120px]" title={user.deviceModel}>
                                  ({user.deviceModel})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>

                        {/* Last Active Time */}
                        <td className="py-3 px-3">
                          {user.lastMobileActiveAt ? (
                            <div>
                              <div className="font-medium text-foreground">
                                {timeAgo(user.lastMobileActiveAt)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {formatFullDate(user.lastMobileActiveAt)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">Never</span>
                          )}
                        </td>

                        {/* Last Login Time */}
                        <td className="py-3 px-3">
                          {user.lastMobileLoginAt ? (
                            <div>
                              <div className="text-foreground">
                                {timeAgo(user.lastMobileLoginAt)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {formatFullDate(user.lastMobileLoginAt)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>

                        {/* Push Notification Status */}
                        <td className="py-3 px-4 text-center">
                          {user.hasPushToken ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[11px] font-medium" title={`${user.deviceTokensCount} push token(s) registered`}>
                              <Bell className="h-3 w-3" />
                              <span>Registered</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">
                              <BellOff className="h-3 w-3" />
                              <span>No Token</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {data?.refreshedAt && (
            <div className="bg-muted/20 border-t border-border px-4 py-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <div>
                Showing {filteredUsers.length} of {data.users.length} users
              </div>
              <div>
                Last updated: {new Date(data.refreshedAt).toLocaleTimeString()}
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}
