'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CONVEYANCE_MODES } from '@/lib/conveyance-bills'
import {
  CalendarDays,
  Loader2,
  Plus,
  Trash2,
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Building2,
  MapPin,
  ArrowRight,
  Search,
  RotateCcw,
  Receipt,
  Banknote,
  Ban,
  Tag,
  Scissors
} from 'lucide-react'

type BillDraft = { date: string; from: string; to: string; mode: string; purpose: string; amount: string }
type BillRow = Omit<BillDraft, 'amount'> & { amount: number; id: string }
type RequestRow = {
  id: string
  amount: number
  amountInWords: string
  clientName: string
  clientLocation: string
  createdAt: string
  status: string
  voucherNo: string | null
  accountsNote: string | null
  bills: BillRow[]
}

const localDateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const dateText = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })

const money = (amount: number) =>
  `৳ ${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const blankBill = (): BillDraft => ({
  date: localDateInput(new Date()),
  from: '',
  to: '',
  mode: '',
  purpose: '',
  amount: ''
})

// Default to current month: from 1st day of current month to last day of current month
const defaultMonthlyRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: localDateInput(start), end: localDateInput(end) }
}

type StatusFilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'

export default function ConveyancePage() {
  const [range, setRange] = useState(defaultMonthlyRange)
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [amountInWords, setAmountInWords] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientLocation, setClientLocation] = useState('')
  const [bills, setBills] = useState<BillDraft[]>([blankBill()])
  const [modalOpen, setModalOpen] = useState(false)

  // Current logged in user actor information & department
  const [actorInfo, setActorInfo] = useState<{ id?: string; fullName?: string; departments?: string[] }>({})

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const submitDate = localDateInput(new Date())

  const load = useCallback(
    async (nextRange = range) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ startDate: nextRange.start, endDate: nextRange.end })
        const response = await fetch(`/api/conveyance?${params}`)
        const data = await response.json()
        if (!response.ok || !data.success) throw new Error(data.error || 'Could not load conveyance history')
        setRows(data.requests || [])
        if (data.actor) {
          setActorInfo(data.actor)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not load conveyance history')
      } finally {
        setLoading(false)
      }
    },
    [range]
  )

  useEffect(() => {
    void load()
  }, [load])

  // Friendly department label
  const departmentDisplay = useMemo(() => {
    const raw = actorInfo.departments?.[0]
    if (!raw) return 'Department'
    return raw.replace(/_/g, ' ')
  }, [actorInfo])

  // Auto-calculate amount in words
  useEffect(() => {
    const amounts = bills.map((bill) => bill.amount.trim())
    if (!amounts.length || amounts.some((amount) => !amount || Number(amount) <= 0)) {
      setAmountInWords('')
      setEstimateLoading(false)
      return
    }
    let active = true
    const timeout = window.setTimeout(async () => {
      setEstimateLoading(true)
      try {
        const response = await fetch('/api/conveyance/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amounts })
        })
        const data = await response.json()
        if (active) setAmountInWords(response.ok && data.success ? data.amountInWords : '')
      } catch {
        if (active) setAmountInWords('')
      } finally {
        if (active) setEstimateLoading(false)
      }
    }, 350)
    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [bills])

  const updateBill = (index: number, key: keyof BillDraft, value: string) =>
    setBills((current) =>
      current.map((bill, rowIndex) => (rowIndex === index ? { ...bill, [key]: value } : bill))
    )

  const calculatedTotal = bills.reduce((acc, curr) => {
    const val = parseFloat(curr.amount)
    return isNaN(val) ? acc : acc + val
  }, 0)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        clientName,
        clientLocation,
        bills: bills.map((bill) => ({ ...bill, amount: Number(bill.amount) }))
      }
      const response = await fetch('/api/conveyance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not submit request')
      toast.success('Conveyance cheque request submitted successfully')
      setClientName('')
      setClientLocation('')
      setBills([blankBill()])
      setAmountInWords('')
      setModalOpen(false)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit request')
    } finally {
      setSaving(false)
    }
  }

  // Calculate statistics for the current month / period
  const stats = useMemo(() => {
    let pendingCount = 0
    let pendingAmount = 0
    let approvedCount = 0
    let approvedAmount = 0
    let paidCount = 0
    let paidAmount = 0
    let rejectedCount = 0
    let rejectedAmount = 0

    for (const row of rows) {
      if (row.status === 'PENDING') {
        pendingCount += 1
        pendingAmount += row.amount
      } else if (row.status === 'APPROVED') {
        approvedCount += 1
        approvedAmount += row.amount
      } else if (row.status === 'PAID') {
        paidCount += 1
        paidAmount += row.amount
      } else if (row.status === 'REJECTED') {
        rejectedCount += 1
        rejectedAmount += row.amount
      }
    }

    return {
      pending: { count: pendingCount, amount: pendingAmount },
      approved: { count: approvedCount, amount: approvedAmount },
      paid: { count: paidCount, amount: paidAmount },
      rejected: { count: rejectedCount, amount: rejectedAmount },
      totalCount: rows.length,
      totalAmount: pendingAmount + approvedAmount + paidAmount + rejectedAmount
    }
  }, [rows])

  // Filter & Search rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Status filter
      if (statusFilter !== 'ALL' && row.status !== statusFilter) {
        return false
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchesClient = row.clientName.toLowerCase().includes(query)
        const matchesLocation = row.clientLocation.toLowerCase().includes(query)
        const matchesVoucher = row.voucherNo ? row.voucherNo.toLowerCase().includes(query) : false
        const matchesId = row.id.toLowerCase().includes(query)
        const matchesBills = row.bills.some(
          (b) =>
            b.from.toLowerCase().includes(query) ||
            b.to.toLowerCase().includes(query) ||
            b.purpose.toLowerCase().includes(query)
        )

        if (!matchesClient && !matchesLocation && !matchesVoucher && !matchesId && !matchesBills) {
          return false
        }
      }

      return true
    })
  }, [rows, statusFilter, searchQuery])

  // Reset to current month helper
  const handleResetToCurrentMonth = () => {
    const monthly = defaultMonthlyRange()
    setRange(monthly)
    void load(monthly)
  }

  // Stamp badge styling for bank cheque endorsement status
  const getStampBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-dashed border-blue-600/80 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono text-xs uppercase tracking-widest font-black rounded -rotate-2 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED
          </div>
        )
      case 'PAID':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-double border-emerald-600/90 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono text-xs uppercase tracking-widest font-black rounded -rotate-3 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> PAID & CLEARED
          </div>
        )
      case 'REJECTED':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-dashed border-rose-600/80 bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-mono text-xs uppercase tracking-widest font-black rounded rotate-2 shadow-sm">
            <XCircle className="w-3.5 h-3.5" /> CANCELED
          </div>
        )
      case 'PENDING':
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-dashed border-amber-600/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono text-xs uppercase tracking-widest font-black rounded -rotate-1 shadow-sm">
            <Clock className="w-3.5 h-3.5" /> PENDING AUDIT
          </div>
        )
    }
  }

  return (
    <div className="w-full min-h-screen bg-slate-100/60 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 py-6 px-3 sm:px-6 lg:px-8 space-y-8 font-sans">
      {/* ============================================================ */}
      {/* TOP HEADER: Department-Specific Branding & Action */}
      {/* ============================================================ */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dashed border-slate-300 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-widest bg-amber-200/80 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 uppercase">
              {departmentDisplay} Ledger
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
              FORM NO. CONV-{new Date().getFullYear()}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-slate-900 dark:text-zinc-100 mt-1">
            {departmentDisplay} Conveyance Cheque Book
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400">
            Submit and track client travel conveyance requests for the <strong>{departmentDisplay}</strong> department.
          </p>
        </div>

        {/* Modal Trigger: Write Cheque Book */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-serif font-bold text-sm tracking-wide shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            + Write Conveyance Cheque
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* STATISTICS SECTION (Monthly by default) */}
      {/* ============================================================ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-zinc-400 px-1">
          <span className="uppercase tracking-wider font-semibold">
            {departmentDisplay} Monthly Statement ({range.start} → {range.end})
          </span>
          <button
            onClick={handleResetToCurrentMonth}
            className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset to Current Month
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. PENDING BOX */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`cursor-pointer relative rounded-xl border-2 p-4 transition-all shadow-sm hover:shadow-md ${
              statusFilter === 'PENDING'
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-400/50'
                : 'border-amber-300/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-zinc-900/70 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" /> Pending Requests
              </span>
              <span className="text-xs font-mono font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                {stats.pending.count} {stats.pending.count === 1 ? 'slip' : 'slips'}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-mono font-black text-amber-900 dark:text-amber-200">
                {money(stats.pending.amount)}
              </div>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">
                Awaiting accounts audit & verification
              </p>
            </div>
          </div>

          {/* 2. APPROVED BOX */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
            className={`cursor-pointer relative rounded-xl border-2 p-4 transition-all shadow-sm hover:shadow-md ${
              statusFilter === 'APPROVED'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-400/50'
                : 'border-blue-300/80 dark:border-blue-900/60 bg-blue-50/40 dark:bg-zinc-900/70 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" /> Approved Requests
              </span>
              <span className="text-xs font-mono font-bold bg-blue-200/80 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">
                {stats.approved.count} {stats.approved.count === 1 ? 'slip' : 'slips'}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-mono font-black text-blue-900 dark:text-blue-200">
                {money(stats.approved.amount)}
              </div>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 mt-1">
                Verified by accounts, queued for disbursement
              </p>
            </div>
          </div>

          {/* 3. PAID BOX */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'PAID' ? 'ALL' : 'PAID')}
            className={`cursor-pointer relative rounded-xl border-2 p-4 transition-all shadow-sm hover:shadow-md ${
              statusFilter === 'PAID'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-400/50'
                : 'border-emerald-300/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-zinc-900/70 hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" /> Paid & Cleared
              </span>
              <span className="text-xs font-mono font-bold bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                {stats.paid.count} {stats.paid.count === 1 ? 'slip' : 'slips'}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-mono font-black text-emerald-900 dark:text-emerald-200">
                {money(stats.paid.amount)}
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                Disbursed and cleared by finance
              </p>
            </div>
          </div>

          {/* 4. CANCELED (REJECTED) BOX */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? 'ALL' : 'REJECTED')}
            className={`cursor-pointer relative rounded-xl border-2 p-4 transition-all shadow-sm hover:shadow-md ${
              statusFilter === 'REJECTED'
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-400/50'
                : 'border-rose-300/70 dark:border-rose-900/50 bg-rose-50/30 dark:bg-zinc-900/70 hover:border-rose-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-rose-600" /> Canceled Requests
              </span>
              <span className="text-xs font-mono font-bold bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 px-2 py-0.5 rounded-full">
                {stats.rejected.count} {stats.rejected.count === 1 ? 'slip' : 'slips'}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-mono font-black text-rose-900 dark:text-rose-200">
                {money(stats.rejected.amount)}
              </div>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1">
                Rejected or canceled submissions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FILTER & SEARCH CONTROL BAR */}
      {/* ============================================================ */}
      <div className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
              }`}
            >
              All Requests ({stats.totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200/70'
              }`}
            >
              Pending ({stats.pending.count})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors ${
                statusFilter === 'APPROVED'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-200/70'
              }`}
            >
              Approved ({stats.approved.count})
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors ${
                statusFilter === 'PAID'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/70'
              }`}
            >
              Paid ({stats.paid.count})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-100/70 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-200/70'
              }`}
            >
              Canceled ({stats.rejected.count})
            </button>
          </div>

          {/* Date Range Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Period:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={range.start}
                onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
                className="h-8 rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-2 text-xs font-mono"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={range.end}
                onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
                className="h-8 rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-2 text-xs font-mono"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load(range)}
              className="h-8 px-3 text-xs font-medium border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Apply
            </Button>
          </div>
        </div>

        {/* Real-Time Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name, project location, voucher ref, destination, or purpose..."
            className="pl-9 text-xs sm:text-sm bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 rounded-lg h-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-mono"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* REQUESTS LIST: ISSUED CHEQUE LEAVES */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
            <h2 className="text-base font-serif font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              {departmentDisplay} Conveyance Requests ({filteredRows.length})
            </h2>
          </div>
          {searchQuery && (
            <span className="text-xs font-mono text-slate-400">
              Filtered from {rows.length} total requests
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white/50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-slate-300 dark:border-zinc-800">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500 mb-2" />
            <span className="text-xs font-mono text-slate-400">Auditing registered conveyance cheques...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center rounded-xl border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-6 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-base font-serif font-medium text-slate-700 dark:text-zinc-300">
              No conveyance requests found.
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try clearing your filters or search query to see past requests.'
                : `You have not submitted any ${departmentDisplay} conveyance bills in this month. Click below to write a new cheque.`}
            </p>
            <div className="pt-2">
              <Button
                onClick={() => setModalOpen(true)}
                variant="outline"
                size="sm"
                className="font-serif font-semibold border-slate-300 hover:bg-slate-100"
              >
                + Write Conveyance Cheque
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredRows.map((row) => (
              <div
                key={row.id}
                className="relative rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-amber-50/40 dark:bg-zinc-900 shadow-md overflow-hidden transition-all hover:shadow-lg flex flex-col justify-between"
              >
                {/* Top security edge bar */}
                <div className="h-1.5 bg-gradient-to-r from-slate-400 via-amber-500 to-slate-400 opacity-70" />

                <div className="p-4 sm:p-5 space-y-4">
                  {/* Header Row: Cheque / Voucher Info & Bank Stamp */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-slate-200 dark:border-zinc-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                          VOUCHER REF:
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-200 bg-slate-200/70 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                          {row.voucherNo ? `№ ${row.voucherNo}` : `№ CHQ-${row.id.slice(-6).toUpperCase()}`}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400 font-mono">
                        Issued on {dateText(row.createdAt)} · {departmentDisplay}
                      </div>
                    </div>

                    {/* Status Stamp */}
                    <div>{getStampBadge(row.status)}</div>
                  </div>

                  {/* Payee Info & Cheque Amount */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs text-slate-500 uppercase font-mono">Client:</span>
                        <span className="font-serif font-bold text-sm sm:text-base text-slate-900 dark:text-zinc-100">
                          {row.clientName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{row.clientLocation}</span>
                      </div>
                    </div>

                    {/* Boxed Amount */}
                    <div className="bg-white dark:bg-zinc-950 border-2 border-slate-700 dark:border-zinc-400 rounded px-3 py-1.5 text-right shadow-sm self-start sm:self-auto">
                      <span className="text-[9px] font-mono uppercase text-slate-400 block">Total Cleared</span>
                      <span className="font-mono text-base font-black text-slate-900 dark:text-zinc-100">
                        {money(row.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Amount in words banner */}
                  {row.amountInWords && (
                    <div className="bg-white/60 dark:bg-zinc-800/60 rounded px-3 py-1.5 border-l-2 border-slate-400 dark:border-zinc-600">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Taka In Words:</span>
                      <p className="font-serif italic text-xs text-slate-700 dark:text-zinc-300">
                        {row.amountInWords}
                      </p>
                    </div>
                  )}

                  {/* Accounts Endorsement Note if any */}
                  {row.accountsNote && (
                    <div className="rounded bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-2 text-xs text-blue-900 dark:text-blue-300">
                      <span className="font-mono font-bold uppercase text-[10px] block text-blue-600 dark:text-blue-400">
                        Accounts Note:
                      </span>
                      {row.accountsNote}
                    </div>
                  )}

                  {/* Attached Cheque Slips / Journeys */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                      Transit Slips ({row.bills.length})
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {row.bills.map((bill) => (
                        <div
                          key={bill.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded bg-white/80 dark:bg-zinc-800/80 p-2 text-xs border border-slate-200 dark:border-zinc-700/60"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[11px] text-slate-500">{dateText(bill.date)}</span>
                              <span className="text-slate-300">•</span>
                              <span>{bill.from}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400 inline" />
                              <span>{bill.to}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                              <span className="font-medium text-slate-700 dark:text-zinc-300">
                                {CONVEYANCE_MODES.find((m) => m.value === bill.mode)?.label ?? bill.mode}
                              </span>
                              {' — '}
                              <span>{bill.purpose}</span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 sm:text-right">
                            {money(bill.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cheque Footnote */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-zinc-500 pt-2 border-t border-dashed border-slate-200 dark:border-zinc-800">
                    <span>VERIFIED EXPENSE VOUCHER</span>
                    <span className="tracking-widest">⑈ {row.id.slice(0, 8)} ⑈</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL: REALISTIC WIDE BANK CHEQUE BOOK SUBMISSION FORM       */}
      {/* ============================================================ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[96vw] max-w-[1360px] max-h-[94vh] overflow-y-auto p-0 border-0 bg-transparent shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{departmentDisplay} Conveyance Cheque Book Voucher</DialogTitle>
            <DialogDescription>Write and issue a bank-styled travel conveyance cheque voucher.</DialogDescription>
          </DialogHeader>

          {/* Authentic Bank Cheque Book Container */}
          <form onSubmit={submit}>
            <div className="relative rounded-2xl border-2 border-slate-400 dark:border-zinc-700 bg-amber-50 dark:bg-zinc-900 shadow-2xl overflow-hidden transition-all flex flex-col lg:flex-row">
              {/* Top Security Gradient Stripe across the whole cheque leaf */}
              <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 opacity-90 z-20" />

              {/* ==================================================== */}
              {/* LEFT: CHEQUE COUNTERFOIL / STUB RECORD (Desktop)     */}
              {/* ==================================================== */}
              <div className="hidden lg:flex w-72 shrink-0 border-r-2 border-dashed border-slate-300 dark:border-zinc-700 bg-amber-100/60 dark:bg-zinc-850 p-6 flex-col justify-between relative">
                {/* Perforation circle notch graphic on the right boundary */}
                <div className="absolute -right-2 top-10 w-4 h-4 rounded-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700" />
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700" />
                <div className="absolute -right-2 bottom-10 w-4 h-4 rounded-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-dashed border-slate-300 dark:border-zinc-700 pb-2">
                    <span className="text-[11px] font-mono font-bold tracking-widest text-slate-700 dark:text-zinc-300 uppercase">
                      COUNTERFOIL STUB
                    </span>
                    <Scissors className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Dept Ledger:</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {departmentDisplay}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Date Issued:</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {submitDate}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Client Ref:</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200 break-words">
                        {clientName || '— (Fill on right)'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Site Location:</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200 break-words">
                        {clientLocation || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Journey Slips:</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {bills.length} {bills.length === 1 ? 'Leg' : 'Legs'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Counterfoil Net Box */}
                <div className="border-t border-dashed border-slate-300 dark:border-zinc-700 pt-3 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    TOTAL AMOUNT
                  </span>
                  <div className="text-xl font-mono font-black text-slate-900 dark:text-zinc-100">
                    ৳ {calculatedTotal.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 block">
                    Record for employee books
                  </span>
                </div>
              </div>

              {/* ==================================================== */}
              {/* RIGHT: MAIN CHEQUE LEAF (Wide Panoramic Canvas)     */}
              {/* ==================================================== */}
              <div className="flex-1 p-5 sm:p-7 space-y-6 flex flex-col justify-between">
                {/* Cheque Header: Crossed lines + Bank Title + Department Badge + Date */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-300/80 dark:border-zinc-800 pb-4">
                  {/* Two Parallel Lines Crossing */}
                  <div className="relative py-1 pr-4 pl-1">
                    <div className="border-t-2 border-b-2 border-slate-800 dark:border-zinc-200 py-0.5 px-3 transform -rotate-12 inline-block shadow-xs">
                      <span className="text-[10px] font-mono font-black tracking-widest text-slate-800 dark:text-zinc-200 uppercase">
                        // A/C PAYEE ONLY //
                      </span>
                    </div>
                  </div>

                  {/* Cheque Identification Details & Department Emblem */}
                  <div className="text-center sm:text-left flex-1 px-2">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <span className="text-base font-serif font-black tracking-wider text-slate-900 dark:text-zinc-100 uppercase">
                        AESTHETIC INTERIOR OMS
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mt-0.5">
                      <span className="text-[11px] font-mono tracking-wider text-slate-500 dark:text-zinc-400">
                        CONVEYANCE DISBURSEMENT CHEQUE VOUCHER
                      </span>
                      <span className="text-slate-300 dark:text-zinc-700">•</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-amber-200/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 uppercase">
                        {departmentDisplay}
                      </span>
                    </div>
                  </div>

                  {/* Cheque Date Box */}
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 dark:text-zinc-400 mb-1">
                      ISSUE DATE
                    </span>
                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border-2 border-slate-700 dark:border-zinc-400 rounded px-3 py-1 shadow-inner">
                      <span className="font-mono text-sm font-bold tracking-widest text-slate-900 dark:text-zinc-100">
                        {submitDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Horizontal Payee Lines: Client Name & Site Location (Side-by-Side Wide) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client Payee */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                    <span className="font-serif font-bold text-slate-700 dark:text-zinc-300 min-w-[130px] uppercase text-xs tracking-wider">
                      Pay Against Client:
                    </span>
                    <div className="flex-1 relative">
                      <Input
                        required
                        maxLength={250}
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Client name or project title"
                        className="bg-transparent border-0 border-b-2 border-dotted border-slate-400 dark:border-zinc-600 rounded-none px-2 py-1 text-slate-900 dark:text-zinc-100 font-serif font-bold text-base focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-zinc-200 placeholder:font-sans placeholder:text-xs placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>
                  </div>

                  {/* Client Location */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                    <span className="font-serif font-bold text-slate-700 dark:text-zinc-300 min-w-[140px] uppercase text-xs tracking-wider">
                      Client / Site Location:
                    </span>
                    <div className="flex-1 relative">
                      <Input
                        required
                        maxLength={500}
                        value={clientLocation}
                        onChange={(e) => setClientLocation(e.target.value)}
                        placeholder="e.g. Plot 14, Road 11, Banani, Dhaka"
                        className="bg-transparent border-0 border-b-2 border-dotted border-slate-400 dark:border-zinc-600 rounded-none px-2 py-1 text-slate-900 dark:text-zinc-100 font-serif font-medium text-sm focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-zinc-200 placeholder:font-sans placeholder:text-xs placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>
                  </div>
                </div>

                {/* Wide Cheque Expense Ledger (Attached Bill Slips Table) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-300 dark:border-zinc-700 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                        Itemized Travel Expense Ledger ({bills.length} {bills.length === 1 ? 'Slip' : 'Slips'})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBills((current) => [...current, blankBill()])}
                      className="h-7 text-xs bg-white dark:bg-zinc-800 border-dashed border-slate-400 dark:border-zinc-600 hover:bg-amber-100/60 dark:hover:bg-zinc-750"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> + Add Bill Slip
                    </Button>
                  </div>

                  {/* Horizontal Scrollable/Spacious Ledger Table */}
                  <div className="overflow-x-auto rounded-lg border border-slate-300 dark:border-zinc-750 bg-white/90 dark:bg-zinc-850 shadow-inner">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-slate-100 dark:bg-zinc-800 text-left font-mono uppercase text-slate-500 dark:text-zinc-400">
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3 w-32">Date</th>
                          <th className="py-2.5 px-3 w-40">Transport Mode</th>
                          <th className="py-2.5 px-3 w-44">From (Origin)</th>
                          <th className="py-2.5 px-3 w-44">To (Destination)</th>
                          <th className="py-2.5 px-3">Official Purpose</th>
                          <th className="py-2.5 px-3 w-36 text-right">Amount (৳)</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-zinc-750">
                        {bills.map((bill, index) => (
                          <tr key={index} className="hover:bg-amber-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">
                              {index + 1}
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="date"
                                required
                                value={bill.date}
                                onChange={(e) => updateBill(index, 'date', e.target.value)}
                                className="h-8 text-xs font-mono bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                required
                                className="h-8 w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs font-sans text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                value={bill.mode}
                                onChange={(e) => updateBill(index, 'mode', e.target.value)}
                              >
                                <option value="">Select transport</option>
                                {CONVEYANCE_MODES.map((mode) => (
                                  <option key={mode.value} value={mode.value}>
                                    {mode.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                required
                                maxLength={250}
                                value={bill.from}
                                onChange={(e) => updateBill(index, 'from', e.target.value)}
                                placeholder="Starting location"
                                className="h-8 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                required
                                maxLength={250}
                                value={bill.to}
                                onChange={(e) => updateBill(index, 'to', e.target.value)}
                                placeholder="Destination point"
                                className="h-8 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                required
                                maxLength={500}
                                value={bill.purpose}
                                onChange={(e) => updateBill(index, 'purpose', e.target.value)}
                                placeholder="Meeting, inspection, sample delivery..."
                                className="h-8 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                                  ৳
                                </span>
                                <Input
                                  type="number"
                                  min="0.01"
                                  max="100000000"
                                  step="0.01"
                                  required
                                  value={bill.amount}
                                  onChange={(e) => updateBill(index, 'amount', e.target.value)}
                                  placeholder="0.00"
                                  className="h-8 text-xs font-mono pl-6 bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-right font-bold"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center">
                              {bills.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setBills((current) => current.filter((_, rIdx) => rIdx !== index))}
                                  className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                  title="Remove bill slip"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Amount in Words ("The Sum of Taka ...") & Cheque Box Amount */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center pt-2 border-t border-slate-300 dark:border-zinc-700">
                  {/* Wide Amount in Words Line (Left 8 cols) */}
                  <div className="md:col-span-8 space-y-1">
                    <span className="font-serif font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                      The Sum of Taka (in words):
                    </span>
                    <div className="min-h-[44px] border-b-2 border-dotted border-slate-500 dark:border-zinc-500 px-2 py-1 flex items-center">
                      <p className="font-serif italic text-sm text-slate-900 dark:text-zinc-100 leading-snug">
                        {estimateLoading ? (
                          <span className="text-slate-400 font-sans text-xs">Computing bank words...</span>
                        ) : amountInWords ? (
                          <>
                            <span className="font-bold underline decoration-slate-400 decoration-1 underline-offset-4">
                              {amountInWords}
                            </span>
                            <span className="text-slate-400 ml-2 font-mono">---------------------------------- ⑈</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-sans text-xs not-italic">
                            (Enter transit bill amounts above to generate words)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Cheque Box Amount (Right 4 cols) */}
                  <div className="md:col-span-4 flex flex-col items-end">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                      TOTAL SUM (৳)
                    </span>
                    <div className="w-full bg-white dark:bg-zinc-950 border-2 border-slate-800 dark:border-zinc-200 rounded px-4 py-2.5 flex items-center justify-between shadow-inner">
                      <span className="font-mono text-lg font-black text-slate-900 dark:text-zinc-100">
                        ৳
                      </span>
                      <span className="font-mono text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-wider">
                        {calculatedTotal.toLocaleString('en-BD', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                        <span className="text-sm text-slate-500 dark:text-zinc-400 font-normal ml-1">/-</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Signature & Submission Area */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-dashed border-slate-300 dark:border-zinc-700">
                  {/* MICR Bank Code Line Graphic */}
                  <div className="font-mono text-xs tracking-[0.25em] text-slate-500 dark:text-zinc-500 select-none hidden sm:block">
                    ⑈ 104820 ⑈ 020084012 ⑈ 92
                  </div>

                  {/* Signatory Box & Actions */}
                  <div className="w-full sm:w-auto flex items-center justify-end gap-4">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] font-serif uppercase tracking-wider text-slate-400 block border-b border-slate-300 dark:border-zinc-700 pb-0.5">
                        Authorised Employee Signatory
                      </span>
                      <span className="text-[10px] font-mono font-medium text-slate-600 dark:text-zinc-300">
                        {actorInfo.fullName || 'Employee Signature'} · {departmentDisplay}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModalOpen(false)}
                      className="border-slate-300 hover:bg-slate-100 text-xs font-mono"
                    >
                      Close Cheque
                    </Button>

                    <Button
                      type="submit"
                      disabled={saving || estimateLoading || calculatedTotal <= 0}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-serif font-bold text-sm tracking-wide shadow-md transition-all active:scale-95"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Issuing Cheque...
                        </>
                      ) : (
                        <>
                          <Wallet className="mr-2 h-4 w-4" /> Sign & Issue Cheque
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
