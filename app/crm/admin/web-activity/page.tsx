'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Monitor,
  Laptop,
  RefreshCw,
  Search,
  Clock,
  Wifi,
  WifiOff,
  UserCheck,
  AlertCircle,
  Activity,
  Building2,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react'

import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type WebUser = {
  id: string
  fullName: string
  email: string
  phone: string
  roles: string[]
  departments: string[]
  primaryDepartment: string
  webStatus: 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE' | 'NEVER'
  hasWebRecord: boolean
  lastWebLoginAt: string | null
  lastWebActiveAt: string | null
  // Also show mobile status alongside
  mobileStatus: 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE' | 'NEVER'
  lastMobileActiveAt: string | null
}

type ApiResponse = {
  success: boolean
  stats: {
    totalUsers: number
    totalWebUsers: number
    webOnlineNowCount: number
    activeTodayCount: number
  }
  users: WebUser[]
  refreshedAt: string
  error?: string
}

function timeAgo(d: string | null): string {
  if (!d) return 'Never'
  const diff = Date.now() - new Date(d).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 45) return 'Just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fullDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default function WebActivityPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE'>('ALL')
  const [groupByDept, setGroupByDept] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggle = (dept: string) => setCollapsed(p => ({ ...p, [dept]: !p[dept] }))

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/mobile-users', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load')

      const webCount = json.users.filter((u: WebUser) => u.hasWebRecord).length

      setData({
        success: true,
        stats: {
          totalUsers: json.stats.totalUsers,
          totalWebUsers: webCount,
          webOnlineNowCount: json.stats.webOnlineNowCount ?? 0,
          activeTodayCount: json.stats.activeTodayCount,
        },
        users: json.users,
        refreshedAt: json.refreshedAt,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading web activity data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
    if (!autoRefresh) return
    const id = setInterval(() => { if (document.visibilityState === 'visible') void load(true) }, 30_000)
    return () => clearInterval(id)
  }, [load, autoRefresh])

  const deptList = useMemo(() => {
    if (!data?.users) return []
    const map = new Map<string, { total: number; online: number; web: number }>()
    data.users.forEach(u => {
      const depts = u.departments.length > 0 ? u.departments : ['Unassigned']
      depts.forEach(d => {
        const c = map.get(d) || { total: 0, online: 0, web: 0 }
        c.total += 1
        if (u.webStatus === 'ONLINE') c.online += 1
        if (u.hasWebRecord) c.web += 1
        map.set(d, c)
      })
    })
    return [...map.entries()].map(([name, s]) => ({ name, ...s })).sort((a, b) => b.online - a.online || a.name.localeCompare(b.name))
  }, [data?.users])

  const filtered = useMemo(() => {
    if (!data?.users) return []
    return data.users.filter(u => {
      if (selectedDept !== 'ALL') {
        const depts = u.departments.length > 0 ? u.departments : ['Unassigned']
        if (!depts.includes(selectedDept)) return false
      }
      if (statusFilter !== 'ALL') {
        if (u.webStatus !== statusFilter) return false
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        return u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q) ||
          u.roles.some(r => r.toLowerCase().includes(q)) ||
          u.departments.some(d => d.toLowerCase().includes(q))
      }
      return true
    })
  }, [data?.users, selectedDept, statusFilter, search])

  const grouped = useMemo(() => {
    const g: Record<string, WebUser[]> = {}
    filtered.forEach(u => {
      const key = selectedDept !== 'ALL' ? selectedDept : (u.departments[0] || 'Unassigned')
      if (!g[key]) g[key] = []
      g[key].push(u)
    })
    return g
  }, [filtered, selectedDept])

  const renderRow = (u: WebUser) => {
    const initials = u.fullName.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join('')
    return (
      <tr key={u.id} className="hover:bg-muted/40 transition-colors">
        {/* User */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 font-semibold text-xs">
              {initials || <UserCheck className="h-4 w-4" />}
              {u.webStatus === 'ONLINE' && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
              )}
            </div>
            <div>
              <div className="font-semibold text-foreground text-xs sm:text-sm">{u.fullName}</div>
              <div className="text-[11px] text-muted-foreground">{u.email} • {u.phone}</div>
            </div>
          </div>
        </td>
        {/* Dept & Role */}
        <td className="py-3 px-3">
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {u.departments.map(d => (
              <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0">{d}</Badge>
            ))}
            {u.roles.map(r => (
              <Badge key={r} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{r}</Badge>
            ))}
          </div>
        </td>
        {/* Web Status */}
        <td className="py-3 px-3">
          {u.webStatus === 'ONLINE' ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Online Now
            </Badge>
          ) : u.webStatus === 'ACTIVE_TODAY' ? (
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Active Today
            </Badge>
          ) : u.webStatus === 'OFFLINE' ? (
            <Badge variant="outline" className="text-muted-foreground gap-1 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Offline
            </Badge>
          ) : (
            <Badge variant="ghost" className="text-muted-foreground/60 text-[11px]">Never Logged In</Badge>
          )}
        </td>
        {/* Last Web Active */}
        <td className="py-3 px-3">
          {u.lastWebActiveAt ? (
            <div>
              <div className="font-medium text-foreground text-xs">{timeAgo(u.lastWebActiveAt)}</div>
              <div className="text-[10px] text-muted-foreground">{fullDate(u.lastWebActiveAt)}</div>
            </div>
          ) : <span className="text-muted-foreground/50 text-xs">Never</span>}
        </td>
        {/* First Web Login */}
        <td className="py-3 px-3">
          {u.lastWebLoginAt ? (
            <div>
              <div className="text-foreground text-xs">{timeAgo(u.lastWebLoginAt)}</div>
              <div className="text-[10px] text-muted-foreground">{fullDate(u.lastWebLoginAt)}</div>
            </div>
          ) : <span className="text-muted-foreground/50 text-xs">—</span>}
        </td>
        {/* Mobile Status (companion column) */}
        <td className="py-3 px-3">
          {u.mobileStatus === 'ONLINE' ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" /> Also Mobile Online
            </span>
          ) : u.mobileStatus === 'ACTIVE_TODAY' ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Mobile: Today
            </span>
          ) : u.lastMobileActiveAt ? (
            <span className="text-[11px] text-muted-foreground">Mobile: {timeAgo(u.lastMobileActiveAt)}</span>
          ) : (
            <span className="text-[11px] text-muted-foreground/40">No mobile</span>
          )}
        </td>
      </tr>
    )
  }

  const DeptTable = ({ users, deptName }: { users: WebUser[]; deptName: string }) => {
    const onlineCount = users.filter(u => u.webStatus === 'ONLINE').length
    const webCount = users.filter(u => u.hasWebRecord).length
    const isCollapsed = collapsed[deptName]
    return (
      <Card className="border-border/70 overflow-hidden shadow-sm w-full">
        <div
          onClick={() => toggle(deptName)}
          className="flex flex-wrap items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/70 cursor-pointer hover:bg-muted/50 transition-colors select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600"><Building2 className="h-4 w-4" /></div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">{deptName}</span>
              <Badge variant="outline" className="text-xs font-normal">{users.length} member{users.length !== 1 ? 's' : ''}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onlineCount > 0 ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> {onlineCount} Web Online
              </Badge>
            ) : null}
            <span className="text-[11px] text-muted-foreground hidden sm:inline">💻 {webCount}/{users.length} logged in</span>
            {isCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        {!isCollapsed && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/20 border-b border-border text-muted-foreground font-medium uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Web Status</th>
                  <th className="py-2.5 px-3">Last Active on Web</th>
                  <th className="py-2.5 px-3">First Web Login</th>
                  <th className="py-2.5 px-3">Mobile Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map(renderRow)}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background w-full">
      <CrmPageHeader
        title="Web CRM Activity Monitor"
        subtitle="Track who is actively working in the Web CRM right now, by department"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAutoRefresh(p => !p)} className="text-xs h-8">
              <Activity className={`mr-1.5 h-3.5 w-3.5 ${autoRefresh ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'}`} />
              Auto: {autoRefresh ? '30s' : 'Off'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setGroupByDept(p => !p)} className="text-xs h-8">
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              {groupByDept ? 'Flat List' : 'By Department'}
            </Button>
            <Button variant="default" size="sm" onClick={() => void load(true)} disabled={refreshing} className="gap-2 text-xs h-8">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        }
      />

      <main className="w-full px-3 py-4 sm:px-6 sm:py-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4 w-full">
          <Card className="border-emerald-500/30 bg-emerald-500/[0.03] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                On Web Right Now
              </CardTitle>
              <Wifi className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{loading ? '...' : data?.stats.webOnlineNowCount ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active in last 15 mins</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Web Active Today</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? '...' : data?.stats.activeTodayCount ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active in last 24 hours</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Web CRM Users</CardTitle>
              <Laptop className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? '...' : data?.stats.totalWebUsers ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Staff who have logged in</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm col-span-2 sm:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Staff</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? '...' : data?.stats.totalUsers ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">All active CRM accounts</p>
            </CardContent>
          </Card>
        </div>

        {/* Dept Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border/60 scrollbar-none">
          <Button size="sm" variant={selectedDept === 'ALL' ? 'default' : 'outline'} className="h-8 text-xs rounded-lg shrink-0 gap-1.5" onClick={() => setSelectedDept('ALL')}>
            <Building2 className="h-3.5 w-3.5" /> All Departments
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-background/40">{data?.users.length ?? 0}</Badge>
          </Button>
          {deptList.map(dept => (
            <Button key={dept.name} size="sm" variant={selectedDept === dept.name ? 'default' : 'outline'} className="h-8 text-xs rounded-lg shrink-0 gap-1.5" onClick={() => setSelectedDept(dept.name)}>
              {dept.name}
              {dept.online > 0 && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-background/40">
                {dept.online > 0 ? `${dept.online} live` : dept.total}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mr-1"><Filter className="h-3 w-3" /> Status:</span>
            {(['ALL', 'ONLINE', 'ACTIVE_TODAY', 'OFFLINE'] as const).map(s => (
              <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'ghost'} className="h-7 text-xs px-2.5 rounded-lg" onClick={() => setStatusFilter(s)}>
                {s === 'ALL' ? `All (${filtered.length})` : s === 'ONLINE' ? `🟢 Online (${data?.stats.webOnlineNowCount ?? 0})` : s === 'ACTIVE_TODAY' ? `🟡 Today (${data?.stats.activeTodayCount ?? 0})` : '⚪ Offline'}
              </Button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input type="text" placeholder="Search name, phone, role..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs rounded-lg" />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <Card className="p-12 text-center text-muted-foreground shadow-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Loading Web CRM activity...
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground shadow-sm">
            <Monitor className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            No users match the selected filters.
          </Card>
        ) : groupByDept ? (
          <div className="space-y-5 w-full">
            {Object.entries(grouped).map(([dept, users]) => (
              <DeptTable key={dept} deptName={dept} users={users} />
            ))}
          </div>
        ) : (
          <Card className="border-border/60 overflow-hidden shadow-sm w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-3">Department / Role</th>
                    <th className="py-3 px-3">Web Status</th>
                    <th className="py-3 px-3">Last Active on Web</th>
                    <th className="py-3 px-3">First Web Login</th>
                    <th className="py-3 px-3">Mobile Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map(renderRow)}
                </tbody>
              </table>
            </div>
            {data?.refreshedAt && (
              <div className="bg-muted/20 border-t border-border px-4 py-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <div>Showing {filtered.length} of {data.users.length} users</div>
                <div>Updated: {new Date(data.refreshedAt).toLocaleTimeString()}</div>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  )
}
