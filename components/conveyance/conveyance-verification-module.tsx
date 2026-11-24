'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { CONVEYANCE_MODES } from '@/lib/conveyance-bills'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Download,
  FileCheck2,
  FileDown,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  RefreshCw,
  Scissors,
  Search,
  ShieldCheck,
  User,
  Wallet,
  XCircle,
} from 'lucide-react'

type ConveyanceBill = {
  id: string
  requestId: string
  date: string
  from: string
  to: string
  mode: string
  purpose: string
  amount: number
  clientName: string
  clientLocation: string
  submittedAt: string
  requester: {
    id: string
    fullName: string
    email: string
    userDepartments: Array<{ department: { name: string } }>
  }
  status: string
  voucherNo: string | null
  accountsNote: string | null
  reviewedBy: { fullName: string } | null
}

type ConveyanceRow = {
  id: string
  requesterId: string
  amount: number
  amountInWords: string
  clientName: string
  clientLocation: string
  createdAt: string
  status: string
  voucherNo: string | null
  accountsNote: string | null
  bills: Array<{
    id: string
    date: string
    from: string
    to: string
    mode: string
    purpose: string
    amount: number
  }>
  requester: ConveyanceBill['requester']
  reviewedBy: { fullName: string } | null
}

type DateGroup = {
  date: string
  count: number
  requestCount: number
  amount: number
  approvedAmount: number
  paidAmount: number
  bills: ConveyanceBill[]
}

type Permissions = {
  canApprove: boolean
  canMarkPaid: boolean
  isAccounts: boolean
  isPc: boolean
  isBoqLeader: boolean
  currentUserId: string
}

type Payload = {
  requests: ConveyanceRow[]
  users: Array<{ id: string; fullName: string }>
  totals: {
    count: number
    billCount: number
    amount: number
    approvedAmount: number
    paidAmount: number
  }
  userTotals: Array<{
    userId: string
    name: string
    count: number
    requestCount: number
    amount: number
    approvedAmount: number
    paidAmount: number
  }>
  dateGroups: DateGroup[]
  monthGroups: Array<{ month: string; dates: DateGroup[] }>
  statusCounts?: Record<string, number>
  permissions?: Permissions
}

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

const initialRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 14) // default last 14 days
  return { start: isoDate(start), end: isoDate(end) }
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

const formatDateTime = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatMonth = (month: string) =>
  new Date(`${month}-01T00:00:00.000Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const money = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800'
    case 'APPROVED':
      return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800'
    case 'PAID':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
    case 'REJECTED':
      return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

const modeLabel = (mode: string) =>
  CONVEYANCE_MODES.find((option) => option.value === mode)?.label ?? mode

interface ConveyanceVerificationModuleProps {
  roleTitle: string
  roleSubtitle?: string
  departmentBadgeText?: string
  initialStatus?: string
  initialViewMode?: 'cheque' | 'list'
}

export function ConveyanceVerificationModule({
  roleTitle,
  roleSubtitle = 'Review, verify, and approve/reject conveyance expense requests submitted across teams.',
  departmentBadgeText,
  initialStatus = 'PENDING',
  initialViewMode = 'cheque',
}: ConveyanceVerificationModuleProps) {
  const [range, setRange] = useState(initialRange)
  const [receivedBy, setReceivedBy] = useState('ALL')
  const [voucher, setVoucher] = useState('')
  const [status, setStatus] = useState(initialStatus)
  const [searchQuery, setSearchQuery] = useState('')
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [exporting, setExporting] = useState(false)
  const [viewMode, setViewMode] = useState<'cheque' | 'list'>(initialViewMode)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const getStampBadge = (reqStatus: string) => {
    switch (reqStatus) {
      case 'APPROVED':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border-2 border-dashed border-blue-600/80 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono text-[10px] sm:text-[11px] uppercase tracking-widest font-black rounded -rotate-2 shadow-xs">
            <CheckCircle2 className="w-3 h-3" /> APPROVED
          </div>
        )
      case 'PAID':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border-2 border-double border-emerald-600/90 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] sm:text-[11px] uppercase tracking-widest font-black rounded -rotate-3 shadow-xs">
            <CheckCircle2 className="w-3 h-3" /> PAID & CLEARED
          </div>
        )
      case 'REJECTED':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border-2 border-dashed border-rose-600/80 bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-mono text-[10px] sm:text-[11px] uppercase tracking-widest font-black rounded rotate-2 shadow-xs">
            <XCircle className="w-3 h-3" /> REJECTED
          </div>
        )
      case 'PENDING':
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border-2 border-dashed border-amber-600/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono text-[10px] sm:text-[11px] uppercase tracking-widest font-black rounded -rotate-1 shadow-xs">
            <Clock className="w-3 h-3" /> PENDING AUDIT
          </div>
        )
    }
  }

  // Review Dialog State
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean
    request: ConveyanceRow | null
    action: 'APPROVED' | 'REJECTED' | 'PAID' | null
    note: string
  }>({
    open: false,
    request: null,
    action: null,
    note: '',
  })

  const params = useMemo(
    () =>
      new URLSearchParams({
        view: 'verification',
        startDate: range.start,
        endDate: range.end,
        status,
        ...(receivedBy !== 'ALL' ? { receivedBy } : {}),
        ...(voucher.trim() ? { voucher: voucher.trim() } : {}),
      }),
    [range, receivedBy, voucher, status],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/conveyance?${params}`, {
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not load conveyance bills')
      }
      setPayload(data)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load conveyance bills',
      )
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    void load()
  }, [load])

  const openActionDialog = (
    request: ConveyanceRow,
    action: 'APPROVED' | 'REJECTED' | 'PAID',
  ) => {
    setReviewDialog({
      open: true,
      request,
      action,
      note: '',
    })
  }

  const handleConfirmAction = async () => {
    if (!reviewDialog.request || !reviewDialog.action) return
    const { request, action, note } = reviewDialog
    setWorkingId(request.id)
    setReviewDialog((prev) => ({ ...prev, open: false }))

    try {
      const response = await fetch(`/api/conveyance/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          accountsNote: note.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not update request')
      }

      if (action === 'APPROVED') {
        toast.success(
          `Request approved! Assigned voucher: ${data.request.voucherNo ?? 'Generated'}`,
        )
      } else if (action === 'REJECTED') {
        toast.error('Conveyance request rejected.')
      } else if (action === 'PAID') {
        toast.success('Conveyance request marked as paid.')
      }

      await load()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update request',
      )
    } finally {
      setWorkingId('')
    }
  }

  const exportPdf = async () => {
    setExporting(true)
    try {
      const response = await fetch(`/api/conveyance/report?${params}`)
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Could not generate PDF')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `conveyance-verification-report-${range.start}-to-${range.end}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not generate PDF',
      )
    } finally {
      setExporting(false)
    }
  }

  const requests = payload?.requests ?? []
  const permissions = payload?.permissions

  // Client-side text search
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests
    const q = searchQuery.toLowerCase().trim()
    return requests.filter(
      (r) =>
        r.requester.fullName.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.clientLocation.toLowerCase().includes(q) ||
        (r.voucherNo && r.voucherNo.toLowerCase().includes(q)) ||
        r.bills.some(
          (b) =>
            b.from.toLowerCase().includes(q) ||
            b.to.toLowerCase().includes(q) ||
            b.purpose.toLowerCase().includes(q),
        ),
    )
  }, [requests, searchQuery])

  // Count pending items
  const pendingCount = useMemo(() => {
    return requests.filter((r) => r.status === 'PENDING').length
  }, [requests])

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Conveyance Verification
            </h1>
            {departmentBadgeText ? (
              <Badge variant="outline" className="text-xs font-semibold">
                {departmentBadgeText}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{roleSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => void exportPdf()}
            disabled={exporting || loading}
            className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            <span>Export PDF Report</span>
          </Button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className={`border transition-all ${
            pendingCount > 0
              ? 'border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20'
              : ''
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pending Verification
              </span>
              <AlertCircle
                className={`h-4 w-4 ${
                  pendingCount > 0 ? 'text-amber-600' : 'text-muted-foreground'
                }`}
              />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {pendingCount}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Requests awaiting leader review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Requests
              </span>
              <FileCheck2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {payload?.totals?.count ?? 0}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {payload?.totals?.billCount ?? 0} total travel bill items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Requested Total
              </span>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {money(payload?.totals?.amount ?? 0)}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Across filtered period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Approved & Paid
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {money(payload?.totals?.approvedAmount ?? 0)}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Paid: {money(payload?.totals?.paidAmount ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1.5 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Status:
              </span>
              {[
                {
                  key: 'PENDING',
                  label: 'Pending',
                  count: payload?.statusCounts?.PENDING ?? pendingCount,
                  badgeClass: 'bg-amber-500 text-white',
                },
                {
                  key: 'APPROVED',
                  label: 'Approved (Ready to Pay)',
                  count: payload?.statusCounts?.APPROVED,
                  badgeClass: 'bg-blue-600 text-white',
                },
                {
                  key: 'ALL',
                  label: 'All Statuses',
                  count: payload?.statusCounts?.ALL,
                  badgeClass: 'bg-slate-500 text-white',
                },
                {
                  key: 'PAID',
                  label: 'Paid',
                  count: payload?.statusCounts?.PAID,
                  badgeClass: 'bg-emerald-600 text-white',
                },
                {
                  key: 'REJECTED',
                  label: 'Rejected',
                  count: payload?.statusCounts?.REJECTED,
                  badgeClass: 'bg-rose-500 text-white',
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatus(tab.key)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all inline-flex items-center gap-1.5 ${
                    status === tab.key
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background hover:bg-muted text-foreground border-border'
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 ? (
                    <span
                      className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${tab.badgeClass}`}
                    >
                      {tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Live Search input */}
            <div className="relative min-w-[220px] max-w-xs flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search employee, client, route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="grid gap-3 pt-2 border-t sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Date From</span>
              <Input
                type="date"
                value={range.start}
                onChange={(e) =>
                  setRange((r) => ({ ...r, start: e.target.value }))
                }
                className="h-9 text-xs"
              />
            </label>

            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Date To</span>
              <Input
                type="date"
                value={range.end}
                onChange={(e) =>
                  setRange((r) => ({ ...r, end: e.target.value }))
                }
                className="h-9 text-xs"
              />
            </label>

            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Submitted By</span>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-xs"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
              >
                <option value="ALL">All employees</option>
                {payload?.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Voucher Number</span>
              <Input
                placeholder="CV-2026..."
                value={voucher}
                onChange={(e) => setVoucher(e.target.value)}
                className="h-9 text-xs"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs: Requests Queue vs Transactions vs Employee Totals */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="requests" className="text-xs font-medium">
            Verification Queue & Requests ({filteredRequests.length})
          </TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs font-medium">
            Bills by Travel Date
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs font-medium">
            Employee Summaries
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {/* Sub-toolbar: Request Count & View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <span className="text-xs font-mono text-muted-foreground">
              Showing <strong className="text-foreground">{filteredRequests.length}</strong> {filteredRequests.length === 1 ? 'request' : 'requests'}
            </span>

            {/* View Mode Toggle: Cheque View vs List View */}
            <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-lg border text-xs">
              <button
                type="button"
                onClick={() => setViewMode('cheque')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'cheque'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Cheque View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>List View</span>
              </button>
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p className="text-sm">Loading conveyance requests...</p>
              </CardContent>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/60 mb-2" />
                <h3 className="text-base font-semibold text-foreground">
                  No requests found
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  There are no conveyance expense requests matching the selected
                  filters or date range.
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'cheque' ? (
            /* ======================================================== */
            /* CHEQUE BOOK CARD VIEW (1 Card per Row)                   */
            /* ======================================================== */
            <div className="grid grid-cols-1 gap-6">
              {filteredRequests.map((req) => {
                const isWorking = workingId === req.id
                const isOwnRequest =
                  req.requesterId === permissions?.currentUserId &&
                  !permissions?.isAccounts
                const deptName =
                  req.requester.userDepartments[0]?.department?.name?.replace(
                    /_/g,
                    ' ',
                  ) ?? 'Team Member'

                return (
                  <div
                    key={req.id}
                    className={`relative rounded-xl border-2 transition-all hover:shadow-lg flex flex-col md:flex-row overflow-hidden shadow-md ${
                      req.status === 'PENDING'
                        ? 'border-amber-300 dark:border-amber-800 bg-[#fdfbf7] dark:bg-zinc-900'
                        : req.status === 'APPROVED'
                        ? 'border-blue-300 dark:border-blue-800 bg-[#fbfdf9] dark:bg-zinc-900'
                        : req.status === 'PAID'
                        ? 'border-emerald-300 dark:border-emerald-800 bg-[#f7fbf8] dark:bg-zinc-900'
                        : 'border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    {/* Top Security Edge Bar spanning whole leaf */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 opacity-90 z-10" />

                    {/* LEFT: CHEQUE COUNTERFOIL / STUB RECORD (Desktop / Tablet) */}
                    <div className="hidden md:flex w-60 lg:w-72 shrink-0 border-r-2 border-dashed border-slate-300 dark:border-zinc-700 bg-amber-100/50 dark:bg-zinc-850/80 p-4 pt-5 flex-col justify-between relative">
                      {/* Perforation circle notch graphics on the right border */}
                      <div className="absolute -right-2 top-8 w-3.5 h-3.5 rounded-full bg-background border border-slate-300 dark:border-zinc-700" />
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-background border border-slate-300 dark:border-zinc-700" />
                      <div className="absolute -right-2 bottom-8 w-3.5 h-3.5 rounded-full bg-background border border-slate-300 dark:border-zinc-700" />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-dashed border-slate-300 dark:border-zinc-700 pb-1.5">
                          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-600 dark:text-zinc-400 uppercase">
                            COUNTERFOIL
                          </span>
                          <Scissors className="w-3 h-3 text-slate-400" />
                        </div>

                        <div className="space-y-2 text-xs font-mono">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase block">VOUCHER REF:</span>
                            <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px] break-all">
                              {req.voucherNo ? `№ ${req.voucherNo}` : `№ CHQ-${req.id.slice(-6).toUpperCase()}`}
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-400 uppercase block">DATE ISSUED:</span>
                            <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">
                              {formatDate(req.createdAt)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-400 uppercase block">PAYEE:</span>
                            <span className="font-bold text-slate-900 dark:text-zinc-100 text-[11px] truncate block">
                              {req.requester.fullName}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">{deptName}</span>
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-400 uppercase block">CLIENT:</span>
                            <span className="font-semibold text-slate-800 dark:text-zinc-200 text-[11px] truncate block">
                              {req.clientName}
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-400 uppercase block">TRANSIT SLIPS:</span>
                            <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px]">
                              {req.bills.length} {req.bills.length === 1 ? 'Leg' : 'Legs'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Counterfoil Net Amount */}
                      <div className="border-t border-dashed border-slate-300 dark:border-zinc-700 pt-2 space-y-0.5">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block">
                          RECORD AMOUNT
                        </span>
                        <div className="text-base font-mono font-black text-slate-900 dark:text-zinc-100">
                          {money(req.amount)}
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 block">
                          Disbursement stub
                        </span>
                      </div>
                    </div>

                    {/* RIGHT: MAIN CHEQUE LEAF */}
                    <div className="flex-1 p-4 sm:p-5 pt-5 space-y-4 flex flex-col justify-between">
                      {/* Cheque Header: Crossing + Brand + Voucher Ref + Status Stamp */}
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-slate-200 dark:border-zinc-800 pb-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Double-line A/C Payee Only */}
                          <div className="border-t-2 border-b-2 border-slate-800 dark:border-zinc-200 py-0.5 px-2 transform -rotate-12 inline-block">
                            <span className="text-[9px] font-mono font-black tracking-wider text-slate-800 dark:text-zinc-200 uppercase">
                              {'// A/C PAYEE ONLY //'}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                              <span className="text-xs font-serif font-black tracking-wider text-slate-900 dark:text-zinc-100 uppercase">
                                AESTHETIC INTERIOR OMS
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                                VOUCHER:
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-200 bg-slate-200/70 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                {req.voucherNo ? `№ ${req.voucherNo}` : `№ CHQ-${req.id.slice(-6).toUpperCase()}`}
                              </span>
                              <span className="text-slate-300 dark:text-zinc-700">•</span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {formatDateTime(req.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Stamp */}
                        <div>{getStampBadge(req.status)}</div>
                      </div>

                      {/* Payee Info & Location & Boxed Total */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          {/* Payee Line */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs">
                            <span className="font-serif font-bold text-slate-600 dark:text-zinc-400 min-w-[125px] uppercase">
                              Pay To (Employee):
                            </span>
                            <div className="flex items-center gap-2 flex-1 border-b border-dotted border-slate-400 dark:border-zinc-600 pb-0.5">
                              <span className="font-serif font-bold text-sm text-slate-900 dark:text-zinc-100">
                                {req.requester.fullName}
                              </span>
                              <Badge variant="outline" className="text-[10px] font-mono font-medium py-0">
                                {deptName}
                              </Badge>
                            </div>
                          </div>

                          {/* Client & Site Location */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs">
                            <span className="font-serif font-bold text-slate-600 dark:text-zinc-400 min-w-[125px] uppercase">
                              Against Client:
                            </span>
                            <div className="flex items-center gap-1.5 flex-1 border-b border-dotted border-slate-400 dark:border-zinc-600 pb-0.5">
                              <strong className="text-slate-900 dark:text-zinc-100 font-medium">
                                {req.clientName}
                              </strong>
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                {req.clientLocation}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Cheque Box Amount */}
                        <div className="bg-white dark:bg-zinc-950 border-2 border-slate-800 dark:border-zinc-300 rounded px-3 py-1.5 text-right shadow-inner min-w-[120px] self-start sm:self-auto">
                          <span className="text-[9px] font-mono uppercase text-slate-400 block">TOTAL SUM</span>
                          <span className="font-mono text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100">
                            {money(req.amount)}
                          </span>
                        </div>
                      </div>

                      {/* Transit Leg Slips */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                          Transit Slips & Breakdown ({req.bills.length})
                        </span>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {req.bills.map((bill) => (
                            <div
                              key={bill.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded bg-white/80 dark:bg-zinc-800/80 p-2 text-xs border border-slate-200 dark:border-zinc-750"
                            >
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-[11px] text-slate-500">{formatDate(bill.date)}</span>
                                  <span className="text-slate-300">•</span>
                                  <span>{bill.from}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-400 inline" />
                                  <span>{bill.to}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                                  <span className="font-medium text-slate-700 dark:text-zinc-300">
                                    {modeLabel(bill.mode)}
                                  </span>
                                  {' — '}
                                  <span>{bill.purpose}</span>
                                </div>
                              </div>
                              <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 sm:text-right">
                                {money(bill.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Amount in Words */}
                      {req.amountInWords ? (
                        <div className="bg-white/60 dark:bg-zinc-800/60 rounded px-3 py-1.5 border-l-2 border-slate-400 dark:border-zinc-600">
                          <span className="text-[10px] font-mono uppercase text-slate-400 block">Amount in Words:</span>
                          <p className="font-serif italic text-xs text-slate-700 dark:text-zinc-300">
                            {req.amountInWords}
                          </p>
                        </div>
                      ) : null}

                      {/* Reviewer / Accounts Note */}
                      {req.reviewedBy ? (
                        <div className="text-[11px] flex items-center gap-1 text-slate-600 dark:text-zinc-400 bg-slate-100/60 dark:bg-zinc-800/60 p-2 rounded">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>
                            Reviewed by <strong className="text-foreground">{req.reviewedBy.fullName}</strong>
                          </span>
                          {req.accountsNote ? <span>· Note: &quot;{req.accountsNote}&quot;</span> : null}
                        </div>
                      ) : null}

                      {isOwnRequest ? (
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-900">
                          Self-approval policy: This request was submitted by you and must be reviewed by another coordinator.
                        </div>
                      ) : null}

                      {/* Cheque Footer: MICR Line + Verification Actions */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-dashed border-slate-300 dark:border-zinc-800">
                        <div className="font-mono text-[10px] tracking-widest text-slate-400 dark:text-zinc-500 hidden sm:block">
                          ⑈ {req.id.slice(0, 8)} ⑈ 020084012 ⑈
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          {req.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                disabled={isWorking || isOwnRequest}
                                onClick={() => openActionDialog(req, 'APPROVED')}
                                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-serif font-bold text-xs shadow-xs"
                                title={isOwnRequest ? 'You cannot approve your own request' : 'Approve this conveyance request'}
                              >
                                {isWorking ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                <span>Approve Cheque</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isWorking || isOwnRequest}
                                onClick={() => openActionDialog(req, 'REJECTED')}
                                className="h-8 gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                title={isOwnRequest ? 'You cannot reject your own request' : 'Reject this conveyance request'}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </Button>
                            </>
                          )}

                          {req.status === 'APPROVED' && permissions?.canMarkPaid && (
                            <Button
                              size="sm"
                              disabled={isWorking}
                              onClick={() => openActionDialog(req, 'PAID')}
                              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-serif font-bold shadow-xs"
                              title="Mark this approved conveyance request as paid"
                            >
                              <Wallet className="h-3.5 w-3.5" />
                              <span>Mark Paid</span>
                            </Button>
                          )}

                          {req.status === 'APPROVED' && !permissions?.canMarkPaid && (
                            <span className="text-[11px] font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded border border-blue-200 dark:border-blue-900">
                              Approved · Awaiting Payment
                            </span>
                          )}

                          {req.status === 'PAID' && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/50 px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Disbursed & Settled</span>
                            </div>
                          )}

                          {req.status === 'REJECTED' && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/50 px-2.5 py-1 rounded border border-rose-300 dark:border-rose-800">
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Rejected</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ======================================================== */
            /* DENSE TABULAR LIST VIEW */
            /* ======================================================== */
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50 text-left font-semibold text-muted-foreground">
                    <th className="py-3 px-3 w-8"></th>
                    <th className="py-3 px-3 w-32">Status</th>
                    <th className="py-3 px-3">Voucher Ref</th>
                    <th className="py-3 px-3">Submitted By</th>
                    <th className="py-3 px-3">Client & Site Location</th>
                    <th className="py-3 px-3 text-center w-20">Legs</th>
                    <th className="py-3 px-4 text-right w-28">Total Amount</th>
                    <th className="py-3 px-4 text-right w-44">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRequests.map((req) => {
                    const isWorking = workingId === req.id
                    const isOwnRequest =
                      req.requesterId === permissions?.currentUserId &&
                      !permissions?.isAccounts
                    const isExpanded = !!expandedRows[req.id]
                    const deptName =
                      req.requester.userDepartments[0]?.department?.name?.replace(
                        /_/g,
                        ' ',
                      ) ?? 'Team Member'

                    return (
                      <React.Fragment key={req.id}>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleRowExpand(req.id)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title={isExpanded ? 'Collapse bill details' : 'Expand bill details'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            {getStampBadge(req.status)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-semibold text-foreground text-[11px] bg-muted/60 px-1.5 py-0.5 rounded">
                              {req.voucherNo ? `№ ${req.voucherNo}` : `№ CHQ-${req.id.slice(-6).toUpperCase()}`}
                            </span>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {formatDate(req.createdAt)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-foreground">
                              {req.requester.fullName}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {deptName}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-foreground">
                              {req.clientName}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {req.clientLocation}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleRowExpand(req.id)}
                              className="font-mono text-xs bg-muted px-2 py-0.5 rounded hover:bg-muted/80 text-foreground font-semibold inline-flex items-center gap-1"
                            >
                              <span>{req.bills.length}</span>
                              <span className="text-[10px] text-muted-foreground">slips</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-foreground font-mono text-sm tabular-nums">
                            {money(req.amount)}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {req.status === 'PENDING' && (
                                <>
                                  <Button
                                    size="sm"
                                    disabled={isWorking || isOwnRequest}
                                    onClick={() => openActionDialog(req, 'APPROVED')}
                                    className="h-7 px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px]"
                                    title={isOwnRequest ? 'Cannot approve own request' : 'Approve'}
                                  >
                                    {isWorking ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3 w-3" />
                                    )}
                                    <span>Approve</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isWorking || isOwnRequest}
                                    onClick={() => openActionDialog(req, 'REJECTED')}
                                    className="h-7 px-2 gap-1 text-[11px] text-rose-600 border-rose-200 hover:bg-rose-50"
                                    title={isOwnRequest ? 'Cannot reject own request' : 'Reject'}
                                  >
                                    <XCircle className="h-3 w-3" />
                                    <span>Reject</span>
                                  </Button>
                                </>
                              )}

                              {req.status === 'APPROVED' && permissions?.canMarkPaid && (
                                <Button
                                  size="sm"
                                  disabled={isWorking}
                                  onClick={() => openActionDialog(req, 'PAID')}
                                  className="h-7 px-2.5 gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                >
                                  <Wallet className="h-3 w-3" />
                                  <span>Mark Paid</span>
                                </Button>
                              )}

                              {req.status === 'APPROVED' && !permissions?.canMarkPaid && (
                                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                                  Awaiting Payment
                                </span>
                              )}

                              {req.status === 'PAID' && (
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Disbursed
                                </span>
                              )}

                              {req.status === 'REJECTED' && (
                                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold font-mono flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Rejected
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Breakdown Drawer */}
                        {isExpanded ? (
                          <tr className="bg-muted/15 border-b">
                            <td colSpan={8} className="p-3 sm:px-6">
                              <div className="rounded-lg border bg-background/80 p-3 space-y-2 shadow-inner">
                                <div className="flex items-center justify-between text-xs font-mono font-semibold text-muted-foreground border-b pb-1.5">
                                  <span>Itemized Transit Details for Voucher № {req.voucherNo ?? req.id.slice(0, 8)}</span>
                                  <span>Amount in words: <em className="text-foreground font-serif">{req.amountInWords}</em></span>
                                </div>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground border-b text-left">
                                      <th className="py-1.5 px-2">Date</th>
                                      <th className="py-1.5 px-2">From → To</th>
                                      <th className="py-1.5 px-2">Transport Mode</th>
                                      <th className="py-1.5 px-2">Official Purpose</th>
                                      <th className="py-1.5 px-2 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/40">
                                    {req.bills.map((bill) => (
                                      <tr key={bill.id} className="hover:bg-muted/10">
                                        <td className="py-1.5 px-2 font-mono text-[11px] whitespace-nowrap">
                                          {formatDate(bill.date)}
                                        </td>
                                        <td className="py-1.5 px-2 font-medium">
                                          {bill.from} <ArrowRight className="inline h-3 w-3 text-muted-foreground mx-1" /> {bill.to}
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <Badge variant="secondary" className="text-[10px] font-normal py-0">
                                            {modeLabel(bill.mode)}
                                          </Badge>
                                        </td>
                                        <td className="py-1.5 px-2 text-muted-foreground">
                                          {bill.purpose}
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-mono font-bold">
                                          {money(bill.amount)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {req.accountsNote ? (
                                  <div className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30 p-2 rounded border border-blue-100">
                                    <strong>Accounts Note:</strong> {req.accountsNote}
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>Bills Grouped by Travel Date</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : payload?.dateGroups.length ? (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left font-semibold text-muted-foreground">
                        <th className="p-3">Bill Date</th>
                        <th className="p-3">Trips Count</th>
                        <th className="p-3">Requests</th>
                        <th className="p-3 text-right">Requested</th>
                        <th className="p-3 text-right">Approved</th>
                        <th className="p-3 text-right">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payload.dateGroups.map((group) => (
                        <tr key={group.date} className="hover:bg-muted/20">
                          <td className="p-3 font-semibold text-foreground">
                            {formatDate(group.date)}
                          </td>
                          <td className="p-3">{group.count}</td>
                          <td className="p-3">{group.requestCount}</td>
                          <td className="p-3 text-right font-medium tabular-nums">
                            {money(group.amount)}
                          </td>
                          <td className="p-3 text-right font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {money(group.approvedAmount)}
                          </td>
                          <td className="p-3 text-right font-medium tabular-nums">
                            {money(group.paidAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No conveyance bills in this period.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Summaries Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span>Employee Totals for Filtered Period</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : payload?.userTotals.length ? (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left font-semibold text-muted-foreground">
                        <th className="p-3">Employee Name</th>
                        <th className="p-3">Trip Count</th>
                        <th className="p-3">Requests Count</th>
                        <th className="p-3 text-right">Total Requested</th>
                        <th className="p-3 text-right">Total Approved</th>
                        <th className="p-3 text-right">Total Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payload.userTotals.map((user) => (
                        <tr key={user.userId} className="hover:bg-muted/20">
                          <td className="p-3 font-semibold text-foreground">
                            {user.name}
                          </td>
                          <td className="p-3">{user.count}</td>
                          <td className="p-3">{user.requestCount}</td>
                          <td className="p-3 text-right font-medium tabular-nums">
                            {money(user.amount)}
                          </td>
                          <td className="p-3 text-right font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {money(user.approvedAmount)}
                          </td>
                          <td className="p-3 text-right font-medium tabular-nums">
                            {money(user.paidAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No employee totals in this period.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Review Confirmation Dialog */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) =>
          setReviewDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewDialog.action === 'APPROVED' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>Approve Conveyance Request</span>
                </>
              ) : reviewDialog.action === 'REJECTED' ? (
                <>
                  <XCircle className="h-5 w-5 text-rose-600" />
                  <span>Reject Conveyance Request</span>
                </>
              ) : (
                <>
                  <Wallet className="h-5 w-5 text-primary" />
                  <span>Mark Conveyance as Paid</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {reviewDialog.action === 'APPROVED'
                ? 'Approving will verify this conveyance expense and assign an official voucher ready for Accounts disbursement.'
                : reviewDialog.action === 'REJECTED'
                ? 'Are you sure you want to reject this request? The employee will see this request marked as rejected.'
                : 'Confirm that this approved conveyance bill has been paid/disbursed to the employee.'}
            </DialogDescription>
          </DialogHeader>

          {reviewDialog.request && (
            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5 border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee:</span>
                <strong className="text-foreground">
                  {reviewDialog.request.requester.fullName}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client / Site:</span>
                <span className="text-foreground">
                  {reviewDialog.request.clientName} (
                  {reviewDialog.request.clientLocation})
                </span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground">Requested Amount:</span>
                <strong className="text-primary font-bold">
                  {money(reviewDialog.request.amount)}
                </strong>
              </div>
            </div>
          )}

          <div className="space-y-1.5 py-1">
            <label className="text-xs font-medium text-foreground">
              {reviewDialog.action === 'REJECTED'
                ? 'Rejection Reason / Note (Optional)'
                : 'Reviewer Note (Optional)'}
            </label>
            <Textarea
              placeholder={
                reviewDialog.action === 'REJECTED'
                  ? 'State reason for rejection...'
                  : 'Add any remarks or verification note...'
              }
              value={reviewDialog.note}
              onChange={(e) =>
                setReviewDialog((prev) => ({ ...prev, note: e.target.value }))
              }
              className="text-xs resize-none h-20"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setReviewDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant={
                reviewDialog.action === 'REJECTED' ? 'destructive' : 'default'
              }
              onClick={() => void handleConfirmAction()}
              className={
                reviewDialog.action === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : ''
              }
            >
              {reviewDialog.action === 'APPROVED'
                ? 'Confirm Approval'
                : reviewDialog.action === 'REJECTED'
                ? 'Confirm Rejection'
                : 'Confirm Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
