'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileDown,
  Filter,
  Loader2,
  MapPin,
  RefreshCw,
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
}

export function ConveyanceVerificationModule({
  roleTitle,
  roleSubtitle = 'Review, verify, and approve/reject conveyance expense requests submitted across teams.',
  departmentBadgeText,
}: ConveyanceVerificationModuleProps) {
  const [range, setRange] = useState(initialRange)
  const [receivedBy, setReceivedBy] = useState('ALL')
  const [voucher, setVoucher] = useState('')
  const [status, setStatus] = useState('PENDING')
  const [searchQuery, setSearchQuery] = useState('')
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [exporting, setExporting] = useState(false)

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
                { key: 'PENDING', label: 'Pending' },
                { key: 'ALL', label: 'All Statuses' },
                { key: 'APPROVED', label: 'Approved' },
                { key: 'PAID', label: 'Paid' },
                { key: 'REJECTED', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatus(tab.key)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    status === tab.key
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background hover:bg-muted text-foreground border-border'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'PENDING' && pendingCount > 0 ? (
                    <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] text-white">
                      {pendingCount}
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
          ) : (
            <div className="space-y-4">
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
                  <Card
                    key={req.id}
                    className={`overflow-hidden border transition-all ${
                      req.status === 'PENDING'
                        ? 'border-amber-300 dark:border-amber-800/80 shadow-xs'
                        : 'border-border'
                    }`}
                  >
                    {/* Header Row */}
                    <CardHeader className="p-4 sm:p-5 bg-muted/20 border-b">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-base text-foreground">
                              {req.requester.fullName}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[11px] font-normal"
                            >
                              {deptName}
                            </Badge>
                            <Badge
                              className={`border text-[11px] font-semibold ${statusBadgeVariant(
                                req.status,
                              )}`}
                            >
                              {req.status === 'PENDING'
                                ? 'Pending Review'
                                : req.status === 'APPROVED'
                                ? 'Approved · Awaiting Payment'
                                : req.status}
                            </Badge>
                            {req.voucherNo ? (
                              <Badge
                                variant="secondary"
                                className="font-mono text-[11px]"
                              >
                                {req.voucherNo}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <strong className="text-foreground">
                                {req.clientName}
                              </strong>{' '}
                              ({req.clientLocation})
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0" />
                              Submitted: {formatDateTime(req.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-right">
                            <div className="text-xl font-bold text-foreground tabular-nums">
                              {money(req.amount)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {req.bills.length}{' '}
                              {req.bills.length === 1 ? 'trip leg' : 'trip legs'}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            {req.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  disabled={isWorking || isOwnRequest}
                                  onClick={() =>
                                    openActionDialog(req, 'APPROVED')
                                  }
                                  className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                                  title={
                                    isOwnRequest
                                      ? 'You cannot approve your own request'
                                      : 'Approve this conveyance request'
                                  }
                                >
                                  {isWorking ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  )}
                                  <span>Approve</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isWorking || isOwnRequest}
                                  onClick={() =>
                                    openActionDialog(req, 'REJECTED')
                                  }
                                  className="h-8 gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  title={
                                    isOwnRequest
                                      ? 'You cannot reject your own request'
                                      : 'Reject this conveyance request'
                                  }
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </Button>
                              </>
                            )}

                            {req.status === 'APPROVED' &&
                              permissions?.canMarkPaid && (
                                <Button
                                  size="sm"
                                  disabled={isWorking}
                                  onClick={() => openActionDialog(req, 'PAID')}
                                  className="h-8 gap-1.5 text-xs bg-primary font-semibold"
                                >
                                  <Wallet className="h-3.5 w-3.5" />
                                  <span>Mark Paid</span>
                                </Button>
                              )}
                          </div>
                        </div>
                      </div>

                      {isOwnRequest ? (
                        <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-900 inline-block">
                          Self-approval policy: This request was submitted by you
                          and must be reviewed by another coordinator or team
                          leader.
                        </div>
                      ) : null}
                    </CardHeader>

                    {/* Itemized Bills Table */}
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/30 border-b text-muted-foreground font-semibold text-left">
                              <th className="py-2.5 px-4 w-28">Date</th>
                              <th className="py-2.5 px-3">Route (From → To)</th>
                              <th className="py-2.5 px-3 w-36">Transport Mode</th>
                              <th className="py-2.5 px-3">Purpose</th>
                              <th className="py-2.5 px-4 text-right w-28">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {req.bills.map((bill) => (
                              <tr
                                key={bill.id}
                                className="hover:bg-muted/20 transition-colors"
                              >
                                <td className="py-2.5 px-4 font-medium text-foreground whitespace-nowrap">
                                  {formatDate(bill.date)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="inline-flex items-center gap-1.5 text-foreground font-medium">
                                    <span>{bill.from}</span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span>{bill.to}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <Badge
                                    variant="secondary"
                                    className="font-normal text-[10px]"
                                  >
                                    {modeLabel(bill.mode)}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground">
                                  {bill.purpose}
                                </td>
                                <td className="py-2.5 px-4 text-right font-semibold tabular-nums text-foreground">
                                  {money(bill.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer Info: Reviewer info, accounts notes, amount in words */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-5 bg-muted/10 border-t text-xs">
                        <div className="space-y-0.5 text-muted-foreground">
                          <div>
                            Amount in words:{' '}
                            <span className="font-medium text-foreground">
                              {req.amountInWords}
                            </span>
                          </div>
                          {req.reviewedBy ? (
                            <div className="text-[11px] flex items-center gap-1 text-muted-foreground">
                              <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span>
                                Reviewed by{' '}
                                <strong className="text-foreground">
                                  {req.reviewedBy.fullName}
                                </strong>
                              </span>
                              {req.accountsNote ? (
                                <span>· Note: &quot;{req.accountsNote}&quot;</span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="font-semibold text-foreground">
                          Total:{' '}
                          <span className="text-sm font-bold text-primary">
                            {money(req.amount)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
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
