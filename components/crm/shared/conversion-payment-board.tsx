'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  LayoutGrid,
  ListFilter,
  Loader2,
  MapPin,
  MoreHorizontal,
  Phone,
  Search,
  Sparkles,
  TableIcon,
  UserRound,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ─── Types ───────────────────────────────────────────────────────────────────

type ConversionLead = {
  id: string
  name: string
  phone: string | null
  location: string | null
  stage: string
  subStatus: string | null
  updatedAt: string
  budget: number | null
  srCrmAssignment: {
    id: string
    user: { id: string; fullName: string; email: string }
  } | null
  quotationAssignment: {
    id: string
    user: { id: string; fullName: string; email: string }
  } | null
  latestCompletedVisit: {
    id: string
    scheduledAt: string
    projectSqft: number | null
    assignedVisitLead: { id: string; fullName: string } | null
    supportMembers: Array<{ id: string; fullName: string }>
  } | null
}

type DepartmentUser = {
  id: string
  fullName: string
  email: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_FILTER = 'ALL'
const ALL_MONTH_FILTER = 'ALL_MONTHS'
const ALL_MEMBER_FILTER = 'ALL_MEMBERS'

const STAT_META = {
  ALL: {
    label: 'Total Conversion',
    Icon: CircleDollarSign,
    className:
      'border-slate-200/80 from-slate-900 via-slate-800 to-slate-950 text-white dark:border-white/10 dark:from-slate-100 dark:via-white dark:to-slate-200 dark:text-slate-950',
    iconClassName:
      'bg-white/15 text-white ring-white/25 dark:bg-slate-950/10 dark:text-slate-950 dark:ring-slate-950/15',
    accentClassName: 'from-primary to-amber-400',
  },
  CLIENT_CONFIRMED: {
    label: 'Client Confirmed',
    Icon: CheckCircle2,
    className:
      'border-sky-200/70 from-sky-50 via-white to-cyan-50 text-sky-800 dark:border-sky-500/30 dark:from-sky-950/60 dark:via-slate-950 dark:to-cyan-950/40 dark:text-sky-100',
    iconClassName:
      'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/20',
    accentClassName: 'from-sky-500 to-cyan-500',
  },
  CLIENT_PARTIALLY_PAID: {
    label: 'Partially Paid',
    Icon: BadgeDollarSign,
    className:
      'border-amber-200/70 from-amber-50 via-white to-orange-50 text-amber-800 dark:border-amber-500/30 dark:from-amber-950/60 dark:via-slate-950 dark:to-orange-950/40 dark:text-amber-100',
    iconClassName:
      'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/20',
    accentClassName: 'from-amber-500 to-orange-500',
  },
  CLIENT_FULL_PAID: {
    label: 'Fully Paid',
    Icon: CircleDollarSign,
    className:
      'border-emerald-200/70 from-emerald-50 via-white to-teal-50 text-emerald-800 dark:border-emerald-500/30 dark:from-emerald-950/60 dark:via-slate-950 dark:to-teal-950/40 dark:text-emerald-100',
    iconClassName:
      'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20',
    accentClassName: 'from-emerald-500 to-teal-500',
  },
}

const SUBSTATUS_KEYS = ['CLIENT_CONFIRMED', 'CLIENT_PARTIALLY_PAID', 'CLIENT_FULL_PAID'] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatLabel(value: string | null | undefined) {
  if (!value) return 'N/A'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatMonth(value: string | null | undefined) {
  if (!value) return 'No Visit Date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No Visit Date'
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function formatBudget(value: number | null | undefined) {
  if (value == null) return 'N/A'
  return `৳ ${value.toLocaleString()}`
}

function formatProjectSqft(value: number | null | undefined) {
  if (value == null) return 'N/A'
  return `${value.toLocaleString()} sqft`
}

function subStatusBadgeClass(value: string | null | undefined) {
  switch (value) {
    case 'CLIENT_CONFIRMED':
      return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200'
    case 'CLIENT_PARTIALLY_PAID':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
    case 'CLIENT_FULL_PAID':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
    default:
      return ''
  }
}

function cardBgClass(subStatus: string | null | undefined) {
  switch (subStatus) {
    case 'CLIENT_CONFIRMED':
      return 'bg-sky-50/50 border-sky-200/80 dark:bg-sky-950/10 dark:border-sky-900/50'
    case 'CLIENT_PARTIALLY_PAID':
      return 'bg-amber-50/50 border-amber-200/80 dark:bg-amber-950/10 dark:border-amber-900/50'
    case 'CLIENT_FULL_PAID':
      return 'bg-emerald-50/50 border-emerald-200/80 dark:bg-emerald-950/10 dark:border-emerald-900/50'
    default:
      return 'bg-card border-border/70'
  }
}

function visitTeamLabel(visit: ConversionLead['latestCompletedVisit']) {
  if (!visit) return 'N/A'
  const names = [
    visit.assignedVisitLead?.fullName,
    ...(visit.supportMembers ?? []).map((m) => m.fullName),
  ].filter(Boolean)
  return names.length > 0 ? names.join(' + ') : 'N/A'
}

function StageSubStatusBlock({ lead }: { lead: ConversionLead }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold text-foreground">{formatLabel(lead.stage)}</div>
      <Badge
        variant="outline"
        className={`whitespace-nowrap px-2 py-0.5 text-[11px] font-medium ${subStatusBadgeClass(lead.subStatus)}`}
      >
        {formatLabel(lead.subStatus)}
      </Badge>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConversionPaymentBoard({
  title = 'Conversion & Payment',
  subtitle = 'Track clients in the conversion stage — confirmed, partially paid, and fully paid.',
  leadBasePath = '/crm/sr/leads',
}: {
  title?: string
  subtitle?: string
  leadBasePath?: string
}) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<ConversionLead[]>([])
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER)
  const [srCrmFilter, setSrCrmFilter] = useState(ALL_MEMBER_FILTER)
  const [visitMonthFilter, setVisitMonthFilter] = useState(ALL_MONTH_FILTER)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  // Reassign quotation dialog state
  const [reassignQuotationOpen, setReassignQuotationOpen] = useState(false)
  const [activeLead, setActiveLead] = useState<ConversionLead | null>(null)
  const [quotationMembers, setQuotationMembers] = useState<DepartmentUser[]>([])
  const [loadingQuotationMembers, setLoadingQuotationMembers] = useState(false)
  const [quotationMemberId, setQuotationMemberId] = useState('')
  const [saving, setSaving] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 400)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const response = await fetch(`/api/conversion-queue?${params.toString()}`, {
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
        throw new Error(payload.error ?? 'Failed to load conversion queue')
      }
      setLeads(payload.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load queue')
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    void loadLeads()
  }, [loadLeads])

  const loadQuotationMembers = async () => {
    if (quotationMembers.length > 0) return
    setLoadingQuotationMembers(true)
    try {
      const response = await fetch('/api/department/available/QUOTATION_TEAM', {
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to load quotation members')
      }
      setQuotationMembers(Array.isArray(payload.users) ? payload.users : [])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to load quotation members',
      )
    } finally {
      setLoadingQuotationMembers(false)
    }
  }

  const openReassignQuotation = async (lead: ConversionLead) => {
    setActiveLead(lead)
    setQuotationMemberId(lead.quotationAssignment?.user.id ?? '')
    setReassignQuotationOpen(true)
    await loadQuotationMembers()
  }

  const submitReassignQuotation = async () => {
    if (!activeLead || !quotationMemberId) return
    setSaving(true)
    try {
      const response = await fetch(
        `/api/lead/${activeLead.id}/assignments/QUOTATION`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: quotationMemberId }),
        },
      )
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to assign quotation member')
      }
      toast.success('Quotation member assigned successfully')
      setReassignQuotationOpen(false)
      setActiveLead(null)
      await loadLeads()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to assign quotation member',
      )
    } finally {
      setSaving(false)
    }
  }

  // ── Derived filter options ─────────────────────────────────────────────────

  const srCrmFilterOptions = useMemo(() => {
    const options = new Map<string, { id: string; fullName: string }>()
    for (const lead of leads) {
      const user = lead.srCrmAssignment?.user
      if (user) options.set(user.id, user)
    }
    return Array.from(options.values()).sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [leads])

  const visitMonthFilterOptions = useMemo(() => {
    const options = new Map<string, string>()
    let hasNoVisitDate = false
    for (const lead of leads) {
      const visitDate = lead.latestCompletedVisit?.scheduledAt
      if (!visitDate) { hasNoVisitDate = true; continue }
      const date = new Date(visitDate)
      if (Number.isNaN(date.getTime())) { hasNoVisitDate = true; continue }
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      options.set(value, formatMonth(visitDate))
    }
    const sorted = Array.from(options.entries()).sort(([a], [b]) => b.localeCompare(a))
    if (hasNoVisitDate) sorted.push(['NO_VISIT_DATE', 'No Visit Date'])
    return sorted
  }, [leads])

  // ── Filtered leads ─────────────────────────────────────────────────────────

  const memberFilteredLeads = useMemo(() => {
    let next = leads
    if (srCrmFilter !== ALL_MEMBER_FILTER) {
      next = next.filter((l) => l.srCrmAssignment?.user.id === srCrmFilter)
    }
    if (visitMonthFilter !== ALL_MONTH_FILTER) {
      next = next.filter((lead) => {
        const visitDate = lead.latestCompletedVisit?.scheduledAt
        if (!visitDate) return visitMonthFilter === 'NO_VISIT_DATE'
        const date = new Date(visitDate)
        if (Number.isNaN(date.getTime())) return visitMonthFilter === 'NO_VISIT_DATE'
        return (
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === visitMonthFilter
        )
      })
    }
    return next
  }, [leads, srCrmFilter, visitMonthFilter])

  const filteredLeads = useMemo(() => {
    if (activeFilter === ALL_FILTER) return memberFilteredLeads
    return memberFilteredLeads.filter((l) => l.subStatus === activeFilter)
  }, [activeFilter, memberFilteredLeads])

  const groupedLeads = useMemo(() => {
    const groups = new Map<string, ConversionLead[]>()
    for (const lead of filteredLeads) {
      const month = formatMonth(lead.latestCompletedVisit?.scheduledAt)
      const arr = groups.get(month) ?? []
      arr.push(lead)
      groups.set(month, arr)
    }
    return Array.from(groups.entries()).map(([month, monthLeads]) => ({ month, leads: monthLeads }))
  }, [filteredLeads])

  // ── Stat cards ─────────────────────────────────────────────────────────────

  const statCards = useMemo(() => {
    const total = memberFilteredLeads.length
    return [
      {
        ...STAT_META.ALL,
        key: ALL_FILTER,
        count: total,
      },
      ...SUBSTATUS_KEYS.map((key) => ({
        ...STAT_META[key],
        key,
        count: memberFilteredLeads.filter((l) => l.subStatus === key).length,
      })),
    ]
  }, [memberFilteredLeads])

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderActionMenu = (lead: ConversionLead) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={`Actions for ${lead.name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`${leadBasePath}/${lead.id}`}>Open Lead</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void openReassignQuotation(lead)}>
          <FileText className="mr-2 h-4 w-4" />
          {lead.quotationAssignment ? 'Reassign Quotation' : 'Assign Quotation'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader title={title} subtitle={subtitle} />

      <main className="mx-auto max-w-[1440px] px-4 py-6">
        {/* ── Filter Bar ── */}
        <Card className="mb-4 border-border/70">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-[180px] items-center gap-2 text-sm font-semibold text-foreground">
                <ListFilter className="h-4 w-4 text-primary" />
                Filter Queue
              </div>

              {/* Search */}
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name, phone, or location…"
                  className="pl-10"
                />
              </div>

              {/* SR CRM filter */}
              {srCrmFilterOptions.length > 0 && (
                <div className="w-full sm:w-56">
                  <Select value={srCrmFilter} onValueChange={setSrCrmFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by SR CRM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_MEMBER_FILTER}>All SR CRMs</SelectItem>
                      {srCrmFilterOptions.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Visit Month filter */}
              <div className="w-full sm:w-56">
                <Select value={visitMonthFilter} onValueChange={setVisitMonthFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Visit Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_MONTH_FILTER}>All Visit Months</SelectItem>
                    {visitMonthFilterOptions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Stat Cards (Queue Intelligence) ── */}
            <div className="rounded-[1.35rem] border border-border/70 bg-gradient-to-br from-background via-muted/20 to-background p-3 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Queue Intelligence
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Live snapshot of conversion & payment status.
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  Live queue metrics
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => {
                  const Icon = card.Icon
                  const total = memberFilteredLeads.length
                  const percentage = total > 0 ? Math.round((card.count / total) * 100) : 0
                  const isActive = activeFilter === card.key

                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => setActiveFilter(card.key)}
                      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${card.className} ${isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                      aria-pressed={isActive}
                    >
                      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/30 blur-2xl transition group-hover:scale-125 dark:bg-white/10" />
                      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accentClassName}`} />

                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] opacity-75">
                            {card.label}
                          </p>
                          <div className="mt-3 flex items-end gap-2">
                            <p className="text-3xl font-black leading-none tracking-tight">
                              {card.count}
                            </p>
                            <span className="mb-0.5 rounded-full bg-white/45 px-2 py-0.5 text-[10px] font-bold shadow-sm ring-1 ring-black/5 dark:bg-black/15 dark:ring-white/10">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                        <span className={`rounded-2xl p-2.5 shadow-sm ring-1 ${card.iconClassName}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>

                      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                        <span
                          className={`block h-full rounded-full bg-gradient-to-r ${card.accentClassName} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="relative mt-2 text-[11px] font-medium opacity-70">
                        {card.key === ALL_FILTER ? 'All leads in view' : 'Share of current queue'}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── View Mode Toggle ── */}
        <div className="mb-4 flex justify-end gap-2">
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
          >
            <TableIcon className="mr-1 h-4 w-4" />
            Table View
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'card' ? 'default' : 'outline'}
            onClick={() => setViewMode('card')}
          >
            <LayoutGrid className="mr-1 h-4 w-4" />
            Card View
          </Button>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card py-14">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No leads found in conversion stage.
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          /* ── TABLE VIEW ── */
          <div className="space-y-5">
            {groupedLeads.map((group) => (
              <Card key={group.month}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="text-sm font-semibold">{group.month}</h3>
                    <Badge variant="secondary">{group.leads.length} leads</Badge>
                  </div>
                  <Table className="table-fixed text-sm w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[16%]">Lead Name</TableHead>
                        <TableHead className="w-[14%]">Payment Status</TableHead>
                        <TableHead className="w-[18%]">Address</TableHead>
                        <TableHead className="w-[10%]">Visit Date</TableHead>
                        <TableHead className="w-[13%]">SR CRM</TableHead>
                        <TableHead className="w-[13%]">Quotation</TableHead>
                        <TableHead className="w-[9%]">Budget</TableHead>
                        <TableHead className="w-[7%]">Size</TableHead>
                        <TableHead className="w-[5%] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`${leadBasePath}/${lead.id}`}
                              className="truncate text-left font-semibold hover:text-primary hover:underline"
                              title={lead.name}
                            >
                              {lead.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <StageSubStatusBlock lead={lead} />
                          </TableCell>
                          <TableCell
                            className="max-w-[200px] overflow-hidden truncate"
                            title={lead.location || 'N/A'}
                          >
                            <span className="text-muted-foreground">{lead.location || 'N/A'}</span>
                          </TableCell>
                          <TableCell>
                            {formatDate(lead.latestCompletedVisit?.scheduledAt)}
                          </TableCell>
                          <TableCell
                            className="truncate"
                            title={lead.srCrmAssignment?.user.fullName ?? 'Unassigned'}
                          >
                            {lead.srCrmAssignment?.user.fullName ?? (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => void openReassignQuotation(lead)}
                              className="max-w-full text-left transition hover:text-primary hover:underline font-medium"
                              title={lead.quotationAssignment?.user.fullName ?? 'Click to assign quotation'}
                            >
                              {lead.quotationAssignment?.user.fullName ?? (
                                <span className="text-amber-600 underline dark:text-amber-400">Assign Quotation</span>
                              )}
                            </button>
                          </TableCell>
                          <TableCell>{formatBudget(lead.budget)}</TableCell>
                          <TableCell>
                            {formatProjectSqft(lead.latestCompletedVisit?.projectSqft)}
                          </TableCell>
                          <TableCell className="text-right">{renderActionMenu(lead)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* ── CARD VIEW ── */
          <div className="space-y-5">
            {groupedLeads.map((group) => (
              <section key={group.month} className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                  <h3 className="text-sm font-semibold">{group.month}</h3>
                  <Badge variant="secondary">{group.leads.length} leads</Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.leads.map((lead) => (
                    <Card
                      key={lead.id}
                      className={`relative overflow-hidden shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:border-primary/45 ${cardBgClass(lead.subStatus)}`}
                    >
                      {/* Top accent stripe */}
                      <span
                        className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                          lead.subStatus === 'CLIENT_CONFIRMED'
                            ? 'from-sky-400 to-cyan-400'
                            : lead.subStatus === 'CLIENT_PARTIALLY_PAID'
                              ? 'from-amber-400 to-orange-400'
                              : 'from-emerald-400 to-teal-400'
                        }`}
                      />
                      <CardContent className="space-y-3 p-4 pt-5">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <Link
                              href={`${leadBasePath}/${lead.id}`}
                              className="block truncate text-base font-semibold hover:text-primary hover:underline"
                            >
                              {lead.name}
                            </Link>
                            <StageSubStatusBlock lead={lead} />
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void openReassignQuotation(lead)}
                              title={lead.quotationAssignment ? `Reassign Quotation (${lead.quotationAssignment.user.fullName})` : 'Assign Quotation'}
                            >
                              <FileText className="mr-1 h-3.5 w-3.5" />
                              {lead.quotationAssignment ? 'Reassign Quotation' : 'Assign Quotation'}
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`${leadBasePath}/${lead.id}`}>Open</Link>
                            </Button>
                          </div>
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted-foreground">
                          {lead.phone && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{lead.phone}</span>
                            </div>
                          )}
                          {lead.location && (
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{lead.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 truncate">
                            <UserRound className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              SR: {lead.srCrmAssignment?.user.fullName ?? 'Unassigned'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              Quotation: {lead.quotationAssignment?.user.fullName ?? 'Unassigned'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <CircleDollarSign className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{formatBudget(lead.budget)}</span>
                          </div>
                        </div>

                        {/* Footer row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                          <span>Visit: {formatDate(lead.latestCompletedVisit?.scheduledAt)}</span>
                          <span>
                            Team: {visitTeamLabel(lead.latestCompletedVisit)}
                          </span>
                          {lead.latestCompletedVisit?.projectSqft != null && (
                            <span>
                              {formatProjectSqft(lead.latestCompletedVisit.projectSqft)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* ── Assign / Reassign Quotation Dialog ── */}
      <Dialog open={reassignQuotationOpen} onOpenChange={setReassignQuotationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeLead?.quotationAssignment ? 'Reassign Quotation' : 'Assign Quotation'}
            </DialogTitle>
            <DialogDescription>
              Select a quotation team member to assign to lead{' '}
              {activeLead?.name ? `"${activeLead.name}"` : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Quotation Member</Label>
            <Select value={quotationMemberId} onValueChange={setQuotationMemberId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingQuotationMembers
                      ? 'Loading members...'
                      : quotationMembers.length === 0
                        ? 'No quotation members available'
                        : 'Select quotation member'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {quotationMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.fullName} ({member.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReassignQuotationOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              disabled={saving || !quotationMemberId}
              onClick={submitReassignQuotation}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Confirm Assignment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
