'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Smartphone,
  Monitor,
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
  Activity,
  Building2,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Laptop,
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

type UserActivity = {
  id: string
  fullName: string
  email: string
  phone: string
  roles: string[]
  departments: string[]
  primaryDepartment: string
  // Combined presence
  overallStatus: 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE' | 'NEVER'
  activeDevice: 'BOTH' | 'MOBILE' | 'WEB' | 'NONE'
  latestActiveAt: string | null
  // Mobile details
  mobileStatus: 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE' | 'NEVER'
  hasMobileRecord: boolean
  hasPushToken: boolean
  deviceTokensCount: number
  platform: string | null
  appVersion: string | null
  deviceModel: string | null
  lastMobileLoginAt: string | null
  lastMobileActiveAt: string | null
  deviceTokens: DeviceToken[]
  // Web details
  webStatus: 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE' | 'NEVER'
  hasWebRecord: boolean
  lastWebLoginAt: string | null
  lastWebActiveAt: string | null
}

type DepartmentStat = {
  name: string
  totalUsers: number
  totalMobile: number
  totalWeb: number
  onlineNow: number
  webOnline: number
  mobileOnline: number
  activeToday: number
}

type ApiResponse = {
  success: boolean
  stats: {
    totalUsers: number
    totalOnlineNowCount: number
    webOnlineNowCount: number
    mobileOnlineNowCount: number
    activeTodayCount: number
    totalMobileUsers: number
    totalWebUsers: number
    pushEnabledCount: number
    inactiveTodayCount: number
  }
  departmentStats: DepartmentStat[]
  users: UserActivity[]
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

export default function UserActivityMonitorPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [search, setSearch] = useState('')
  const [platformView, setPlatformView] = useState<'ALL' | 'WEB' | 'MOBILE'>('ALL')
  const [selectedDept, setSelectedDept] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE'>('ALL')
  const [groupByDept, setGroupByDept] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({})

  const toggleDeptCollapse = (dept: string) => {
    setCollapsedDepts((prev) => ({ ...prev, [dept]: !prev[dept] }))
  }

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
        throw new Error(json.error || 'Failed to fetch user activity statuses')
      }
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user activity')
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

  // Extract department stats
  const departmentList = useMemo(() => {
    if (!data?.users) return []
    const map = new Map<string, { total: number; online: number; webOnline: number; mobileOnline: number }>()

    data.users.forEach((u) => {
      const depts = u.departments.length > 0 ? u.departments : ['Unassigned']
      depts.forEach((d) => {
        const current = map.get(d) || { total: 0, online: 0, webOnline: 0, mobileOnline: 0 }
        current.total += 1
        if (u.overallStatus === 'ONLINE') current.online += 1
        if (u.webStatus === 'ONLINE') current.webOnline += 1
        if (u.mobileStatus === 'ONLINE') current.mobileOnline += 1
        map.set(d, current)
      })
    })

    return Array.from(map.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.online - a.online || a.name.localeCompare(b.name))
  }, [data?.users])

  // Filter users based on view, department, status, and search
  const filteredUsers = useMemo(() => {
    if (!data?.users) return []
    return data.users.filter((user) => {
      // Platform View Filter
      if (platformView === 'WEB') {
        if (!user.hasWebRecord && user.webStatus === 'NEVER') return false
      } else if (platformView === 'MOBILE') {
        if (!user.hasMobileRecord && user.mobileStatus === 'NEVER') return false
      }

      // Department filter
      if (selectedDept !== 'ALL') {
        const userDepts = user.departments.length > 0 ? user.departments : ['Unassigned']
        if (!userDepts.includes(selectedDept)) return false
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (platformView === 'WEB' && user.webStatus !== statusFilter) return false
        if (platformView === 'MOBILE' && user.mobileStatus !== statusFilter) return false
        if (platformView === 'ALL' && user.overallStatus !== statusFilter) return false
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
  }, [data?.users, platformView, selectedDept, statusFilter, search])

  // Group filtered users by department
  const groupedByDepartment = useMemo(() => {
    const groups: Record<string, UserActivity[]> = {}

    filteredUsers.forEach((user) => {
      const depts = user.departments.length > 0 ? user.departments : ['Unassigned']
      if (selectedDept !== 'ALL') {
        if (!groups[selectedDept]) groups[selectedDept] = []
        groups[selectedDept].push(user)
      } else {
        const primary = depts[0] || 'Unassigned'
        if (!groups[primary]) groups[primary] = []
        groups[primary].push(user)
      }
    })

    return groups
  }, [filteredUsers, selectedDept])

  const renderUserRow = (user: UserActivity) => {
    const initials = user.fullName
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('')

    return (
      <tr key={user.id} className="hover:bg-muted/40 transition-colors">
        {/* User Details */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
              {initials || <UserCheck className="h-4 w-4" />}
              {user.overallStatus === 'ONLINE' && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
              )}
            </div>
            <div>
              <div className="font-semibold text-foreground text-xs sm:text-sm">{user.fullName}</div>
              <div className="text-[11px] text-muted-foreground">
                {user.email} • {user.phone}
              </div>
            </div>
          </div>
        </td>

        {/* Roles & Departments */}
        <td className="py-3 px-3">
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {user.departments.map((dept) => (
              <Badge
                key={dept}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 font-medium bg-secondary/80"
              >
                {dept}
              </Badge>
            ))}
            {user.roles.map((role) => (
              <Badge
                key={role}
                variant="outline"
                className="text-[10px] px-1.5 py-0 font-normal bg-background/50 border-border"
              >
                {role}
              </Badge>
            ))}
          </div>
        </td>

        {/* Active Device & Overall Status */}
        <td className="py-3 px-3">
          <div className="space-y-1">
            {user.overallStatus === 'ONLINE' ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 text-[11px] font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Online Now
              </Badge>
            ) : user.overallStatus === 'ACTIVE_TODAY' ? (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Active Today
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground gap-1 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Offline
              </Badge>
            )}

            {/* Device indicator pill */}
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              {user.activeDevice === 'BOTH' ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Laptop className="h-3 w-3" />+<Smartphone className="h-3 w-3" /> Web & Mobile
                </span>
              ) : user.activeDevice === 'WEB' ? (
                <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                  <Monitor className="h-3 w-3" /> Web CRM Active
                </span>
              ) : user.activeDevice === 'MOBILE' ? (
                <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">
                  <Smartphone className="h-3 w-3" /> Mobile Active
                </span>
              ) : (
                <span className="text-muted-foreground/60">—</span>
              )}
            </div>
          </div>
        </td>

        {/* Web CRM Activity Column */}
        <td className="py-3 px-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              {user.webStatus === 'ONLINE' ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] px-1.5 py-0">
                  🟢 Web Online
                </Badge>
              ) : user.webStatus === 'ACTIVE_TODAY' ? (
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 text-[10px] px-1.5 py-0">
                  🟡 Today
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground/60">Offline</span>
              )}
            </div>
            <div className="text-[11px] text-foreground font-medium">
              {timeAgo(user.lastWebActiveAt)}
            </div>
            {user.lastWebActiveAt && (
              <div className="text-[10px] text-muted-foreground">
                {formatFullDate(user.lastWebActiveAt)}
              </div>
            )}
          </div>
        </td>

        {/* Mobile App Activity Column */}
        <td className="py-3 px-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              {user.mobileStatus === 'ONLINE' ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] px-1.5 py-0">
                  🟢 Mobile Online
                </Badge>
              ) : user.mobileStatus === 'ACTIVE_TODAY' ? (
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 text-[10px] px-1.5 py-0">
                  🟡 Today
                </Badge>
              ) : user.hasMobileRecord ? (
                <span className="text-[10px] text-muted-foreground/60">Offline</span>
              ) : (
                <span className="text-[10px] text-muted-foreground/40">Not Installed</span>
              )}
              {user.platform && (
                <Badge variant="secondary" className="text-[9px] uppercase font-mono px-1 py-0">
                  {user.platform}
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-foreground font-medium">
              {timeAgo(user.lastMobileActiveAt)}
            </div>
            {user.lastMobileActiveAt && (
              <div className="text-[10px] text-muted-foreground">
                {formatFullDate(user.lastMobileActiveAt)}
              </div>
            )}
          </div>
        </td>

        {/* Push Notification Status */}
        <td className="py-3 px-4 text-center">
          {user.hasPushToken ? (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[11px] font-medium"
              title={`${user.deviceTokensCount} active push token(s)`}
            >
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
  }

  return (
    <div className="min-h-screen bg-background w-full">
      <CrmPageHeader
        title="Team Presence & Activity Monitor"
        subtitle="Live tracking of Web CRM and Mobile App activity across all departments"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh((prev) => !prev)}
              className="text-xs h-8"
            >
              <Activity className={`mr-1.5 h-3.5 w-3.5 ${autoRefresh ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'}`} />
              Auto: {autoRefresh ? '30s' : 'Off'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGroupByDept((prev) => !prev)}
              className="text-xs h-8"
            >
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              {groupByDept ? 'View Flat List' : 'Group by Dept'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => void loadData(true)}
              disabled={refreshing}
              className="gap-2 text-xs h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* FULL WIDTH CONTAINER */}
      <main className="w-full px-3 py-4 sm:px-6 sm:py-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Top Metric Cards - Full Width Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:gap-4 w-full">
          {/* Card 1: Total Online Now */}
          <Card className="border-emerald-500/30 bg-emerald-500/[0.03] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Active Right Now
              </CardTitle>
              <Wifi className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {loading ? '...' : data?.stats.totalOnlineNowCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active on Web or Mobile
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Web CRM Online */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5 text-indigo-500" />
                Web CRM Online
              </CardTitle>
              <Laptop className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {loading ? '...' : data?.stats.webOnlineNowCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Desk staff on browsers
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Mobile App Online */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-sky-500" />
                Mobile App Online
              </CardTitle>
              <Smartphone className="h-4 w-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {loading ? '...' : data?.stats.mobileOnlineNowCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Field staff on phones
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Active Today */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Today
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {loading ? '...' : data?.stats.activeTodayCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active in last 24 hours
              </p>
            </CardContent>
          </Card>

          {/* Card 5: Total Staff */}
          <Card className="border-border/60 shadow-sm col-span-2 sm:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Staff
              </CardTitle>
              <UserCheck className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {loading ? '...' : data?.stats.totalUsers ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                📱 {data?.stats.totalMobileUsers ?? 0} mobile • 💻 {data?.stats.totalWebUsers ?? 0} web
              </p>
            </CardContent>
          </Card>
        </div>

        {/* PLATFORM SWITCHER TABS (All vs Web vs Mobile) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl">
            <Button
              size="sm"
              variant={platformView === 'ALL' ? 'default' : 'ghost'}
              className="h-8 text-xs font-medium rounded-lg px-3"
              onClick={() => setPlatformView('ALL')}
            >
              🌐 All Presence
            </Button>
            <Button
              size="sm"
              variant={platformView === 'WEB' ? 'default' : 'ghost'}
              className="h-8 text-xs font-medium rounded-lg px-3 gap-1.5"
              onClick={() => setPlatformView('WEB')}
            >
              <Monitor className="h-3.5 w-3.5 text-indigo-500" />
              Web CRM Activity
              <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                {data?.stats.webOnlineNowCount ?? 0} live
              </Badge>
            </Button>
            <Button
              size="sm"
              variant={platformView === 'MOBILE' ? 'default' : 'ghost'}
              className="h-8 text-xs font-medium rounded-lg px-3 gap-1.5"
              onClick={() => setPlatformView('MOBILE')}
            >
              <Smartphone className="h-3.5 w-3.5 text-sky-500" />
              Mobile App Activity
              <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                {data?.stats.mobileOnlineNowCount ?? 0} live
              </Badge>
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            {platformView === 'ALL' && 'Viewing combined desktop and phone presence'}
            {platformView === 'WEB' && 'Focusing on Web CRM browser sessions'}
            {platformView === 'MOBILE' && 'Focusing on Mobile App installations & sessions'}
          </div>
        </div>

        {/* DEPARTMENT-WISE TABS BAR */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border/60 scrollbar-none">
          <Button
            size="sm"
            variant={selectedDept === 'ALL' ? 'default' : 'outline'}
            className="h-8 text-xs font-medium rounded-lg shrink-0 gap-1.5"
            onClick={() => setSelectedDept('ALL')}
          >
            <Building2 className="h-3.5 w-3.5" />
            All Departments
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-background/40">
              {data?.users.length ?? 0}
            </Badge>
          </Button>

          {departmentList.map((dept) => (
            <Button
              key={dept.name}
              size="sm"
              variant={selectedDept === dept.name ? 'default' : 'outline'}
              className="h-8 text-xs font-medium rounded-lg shrink-0 gap-1.5"
              onClick={() => setSelectedDept(dept.name)}
            >
              <span>{dept.name}</span>
              {dept.online > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-background/40">
                {dept.online > 0 ? `${dept.online} live` : dept.total}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60 w-full">
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <span className="text-xs text-muted-foreground font-medium mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Status:
            </span>
            <Button
              size="sm"
              variant={statusFilter === 'ALL' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2.5 rounded-lg"
              onClick={() => setStatusFilter('ALL')}
            >
              All ({filteredUsers.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'ONLINE' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2.5 rounded-lg text-emerald-600 dark:text-emerald-400"
              onClick={() => setStatusFilter('ONLINE')}
            >
              🟢 Online Now ({data?.stats.totalOnlineNowCount ?? 0})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'ACTIVE_TODAY' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2.5 rounded-lg text-amber-600 dark:text-amber-400"
              onClick={() => setStatusFilter('ACTIVE_TODAY')}
            >
              🟡 Active Today ({data?.stats.activeTodayCount ?? 0})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'OFFLINE' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2.5 rounded-lg text-muted-foreground"
              onClick={() => setStatusFilter('OFFLINE')}
            >
              ⚪ Offline
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search name, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* USERS DISPLAY - FULL WIDTH (DEPARTMENT WISE OR FLAT) */}
        {loading ? (
          <Card className="border-border/60 p-12 text-center text-muted-foreground shadow-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Loading team presence and activity status...
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card className="border-border/60 p-12 text-center text-muted-foreground shadow-sm">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            No staff members match the selected filters.
          </Card>
        ) : groupByDept ? (
          /* DEPARTMENT-WISE GROUPED SECTIONS */
          <div className="space-y-6 w-full">
            {Object.entries(groupedByDepartment).map(([deptName, deptUsers]) => {
              const onlineCount = deptUsers.filter((u) => u.overallStatus === 'ONLINE').length
              const webOnlineCount = deptUsers.filter((u) => u.webStatus === 'ONLINE').length
              const mobOnlineCount = deptUsers.filter((u) => u.mobileStatus === 'ONLINE').length
              const isCollapsed = collapsedDepts[deptName]

              return (
                <Card key={deptName} className="border-border/70 overflow-hidden shadow-sm w-full">
                  {/* Department Card Header */}
                  <div
                    onClick={() => toggleDeptCollapse(deptName)}
                    className="flex flex-wrap items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/70 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm sm:text-base text-foreground tracking-tight">
                            {deptName}
                          </span>
                          <Badge variant="outline" className="text-xs font-normal">
                            {deptUsers.length} member{deptUsers.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 text-xs">
                      {onlineCount > 0 ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {onlineCount} Online Now
                          <span className="opacity-80">
                            (💻 {webOnlineCount} • 📱 {mobOnlineCount})
                          </span>
                        </Badge>
                      ) : (
                        <Badge variant="ghost" className="text-muted-foreground text-[11px]">
                          All Offline
                        </Badge>
                      )}
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Department Users Table */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/20 border-b border-border text-muted-foreground font-medium uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="py-2.5 px-4">User</th>
                            <th className="py-2.5 px-3">Role</th>
                            <th className="py-2.5 px-3">Presence Status</th>
                            <th className="py-2.5 px-3">Web CRM Activity</th>
                            <th className="py-2.5 px-3">Mobile App Activity</th>
                            <th className="py-2.5 px-4 text-center">Push Notifications</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {deptUsers.map((u) => renderUserRow(u))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        ) : (
          /* FLAT TABLE VIEW (FULL WIDTH) */
          <Card className="border-border/60 overflow-hidden shadow-sm w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-3">Department / Role</th>
                    <th className="py-3 px-3">Presence Status</th>
                    <th className="py-3 px-3">Web CRM Activity</th>
                    <th className="py-3 px-3">Mobile App Activity</th>
                    <th className="py-3 px-4 text-center">Push Notifications</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map((user) => renderUserRow(user))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            {data?.refreshedAt && (
              <div className="bg-muted/20 border-t border-border px-4 py-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <div>
                  Showing {filteredUsers.length} of {data.users.length} staff members
                </div>
                <div>
                  Last updated: {new Date(data.refreshedAt).toLocaleTimeString()}
                </div>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  )
}
