'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Layers,
  ArrowRight
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

const money = (amount: number) => `৳ ${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const blankBill = (): BillDraft => ({
  date: localDateInput(new Date()),
  from: '',
  to: '',
  mode: '',
  purpose: '',
  amount: ''
})

const defaultRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 14)
  return { start: localDateInput(start), end: localDateInput(end) }
}

export default function ConveyancePage() {
  const [range, setRange] = useState(defaultRange)
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [approvedTotal, setApprovedTotal] = useState(0)
  const [saving, setSaving] = useState(false)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [amountInWords, setAmountInWords] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientLocation, setClientLocation] = useState('')
  const [bills, setBills] = useState<BillDraft[]>([blankBill()])
  const submitDate = localDateInput(new Date())

  const load = useCallback(
    async (nextRange = range) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ startDate: nextRange.start, endDate: nextRange.end })
        const response = await fetch(`/api/conveyance?${params}`)
        const data = await response.json()
        if (!response.ok || !data.success) throw new Error(data.error || 'Could not load conveyance history')
        setRows(data.requests)
        setApprovedTotal(data.totals?.approvedAmount ?? 0)
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
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit request')
    } finally {
      setSaving(false)
    }
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
            <XCircle className="w-3.5 h-3.5" /> REJECTED
          </div>
        )
      case 'PENDING':
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-dashed border-amber-600/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono text-xs uppercase tracking-widest font-black rounded -rotate-1 shadow-sm">
            <Clock className="w-3.5 h-3.5" /> UNDER AUDIT
          </div>
        )
    }
  }

  return (
    <div className="w-full min-h-screen bg-slate-100/60 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 py-6 px-3 sm:px-6 lg:px-8 space-y-8 font-sans">
      {/* Top Banner - Cheque Book / Bank Ledger Header */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dashed border-slate-300 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-widest bg-amber-200/80 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 uppercase">
              Official Voucher
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
              FORM NO. CONV-{new Date().getFullYear()}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-slate-900 dark:text-zinc-100 mt-1">
            Conveyance Cheque Book
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400">
            Write and issue travel conveyance bills with bank-style expense vouchers.
          </p>
        </div>

        {/* Quick Bank Summary Passbook Strip */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 shadow-sm">
          <div className="px-3 border-r border-dashed border-slate-200 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-zinc-500 block">
              Cleared Period Balance
            </span>
            <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {money(approvedTotal)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 font-mono text-slate-600 dark:text-zinc-300">
              <input
                type="date"
                value={range.start}
                onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
                className="h-8 rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-2 text-xs font-mono"
              />
              <span className="text-slate-400">to</span>
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
              className="h-8 px-2.5 text-xs font-medium border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Main Full-Width Grid: Cheque Book Form on Top / Left & Issued Cheques on Right */}
      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* ============================================================ */}
        {/* CHEQUE BOOK FORM (xl:col-span-7) */}
        {/* ============================================================ */}
        <div className="xl:col-span-7 space-y-4">
          <form onSubmit={submit}>
            {/* Bank Cheque Leaf Container */}
            <div className="relative rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-amber-50/50 dark:bg-zinc-900 shadow-xl overflow-hidden transition-all">
              {/* Top Security Line / Crossing */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-800 opacity-80" />

              {/* Perforated Stub Line on Left (Desktop) */}
              <div className="hidden lg:block absolute left-12 top-0 bottom-0 w-[1px] border-r-2 border-dashed border-slate-300 dark:border-zinc-700 z-10" />

              <div className="p-4 sm:p-6 lg:pl-16 space-y-6">
                {/* Cheque Top Header: Crossing + Bank Emblem + Date Block */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/90 dark:border-zinc-800 pb-4">
                  {/* Two Parallel Lines Crossing ("A/C PAYEE ONLY") */}
                  <div className="relative py-1 pr-6 pl-2 border-l-2 border-slate-300 dark:border-zinc-700">
                    <div className="border-t-2 border-b-2 border-slate-800 dark:border-zinc-200 py-0.5 px-3 transform -rotate-12 inline-block">
                      <span className="text-[10px] font-mono font-black tracking-widest text-slate-800 dark:text-zinc-200 uppercase">
                        // A/C PAYEE ONLY //
                      </span>
                    </div>
                  </div>

                  {/* Cheque Identification Details */}
                  <div className="text-center sm:text-left flex-1 px-2">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <span className="text-sm font-serif font-black tracking-widest text-slate-900 dark:text-zinc-100 uppercase">
                        AESTHETIC INTERIOR OMS
                      </span>
                    </div>
                    <span className="text-[10px] font-mono tracking-wider text-slate-500 dark:text-zinc-400 block mt-0.5">
                      CONVEYANCE DISBURSEMENT CHEQUE VOUCHER
                    </span>
                  </div>

                  {/* Cheque Date Box */}
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 dark:text-zinc-400 mb-1">
                      ISSUE DATE
                    </span>
                    <div className="flex items-center gap-1 bg-white/80 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded px-2.5 py-1 shadow-inner">
                      <span className="font-mono text-sm font-semibold tracking-wider text-slate-800 dark:text-zinc-200">
                        {submitDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cheque Payee Details: "Pay To" & "Client Location" */}
                <div className="space-y-4">
                  {/* Payee Line */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                    <span className="font-serif font-bold text-slate-700 dark:text-zinc-300 min-w-[140px] uppercase text-xs tracking-wider">
                      Pay Against Client:
                    </span>
                    <div className="flex-1 relative">
                      <Input
                        required
                        maxLength={250}
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. Mr. Kabir / Beximco Tower Interior Project"
                        className="bg-transparent border-0 border-b-2 border-dotted border-slate-400 dark:border-zinc-600 rounded-none px-2 py-1 text-slate-900 dark:text-zinc-100 font-serif font-semibold text-base focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-zinc-200 placeholder:font-sans placeholder:text-xs placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>
                  </div>

                  {/* Location Line */}
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

                {/* Transit Details / Bill Rows (Cheque Expense Ledger) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-300 dark:border-zinc-700 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                        Journey & Bill Breakdowns ({bills.length})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBills((current) => [...current, blankBill()])}
                      className="h-7 text-xs bg-white/70 dark:bg-zinc-800 border-dashed border-slate-400 dark:border-zinc-600 hover:bg-amber-100/50 dark:hover:bg-zinc-750"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add Bill Slip
                    </Button>
                  </div>

                  {/* List of Bill Items styled like attached cheque item counterfoils */}
                  <div className="space-y-3">
                    {bills.map((bill, index) => (
                      <div
                        key={index}
                        className="relative rounded-lg border border-slate-200 dark:border-zinc-750 bg-white/70 dark:bg-zinc-850 p-3.5 shadow-sm space-y-3 transition-colors hover:border-slate-300 dark:hover:border-zinc-650"
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-dashed border-slate-200 dark:border-zinc-700">
                          <span className="font-mono text-xs font-bold text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-zinc-700 inline-flex items-center justify-center text-[10px] font-mono">
                              {index + 1}
                            </span>
                            Transit Bill Item
                          </span>

                          {bills.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                              onClick={() => setBills((current) => current.filter((_, rIdx) => rIdx !== index))}
                              aria-label={`Remove bill ${index + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Date */}
                          <div>
                            <label className="text-[10px] font-mono uppercase text-slate-500 dark:text-zinc-400 block mb-1">
                              Journey Date
                            </label>
                            <Input
                              type="date"
                              required
                              value={bill.date}
                              onChange={(e) => updateBill(index, 'date', e.target.value)}
                              className="h-8 text-xs font-mono bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                            />
                          </div>

                          {/* Transport Mode */}
                          <div>
                            <label className="text-[10px] font-mono uppercase text-slate-500 dark:text-zinc-400 block mb-1">
                              Transport Mode
                            </label>
                            <select
                              required
                              className="h-8 w-full rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-xs font-sans text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
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
                          </div>

                          {/* From */}
                          <div>
                            <label className="text-[10px] font-mono uppercase text-slate-500 dark:text-zinc-400 block mb-1">
                              Origin (From)
                            </label>
                            <Input
                              required
                              maxLength={250}
                              value={bill.from}
                              onChange={(e) => updateBill(index, 'from', e.target.value)}
                              placeholder="e.g. Office / Mirpur"
                              className="h-8 text-xs bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                            />
                          </div>

                          {/* To */}
                          <div>
                            <label className="text-[10px] font-mono uppercase text-slate-500 dark:text-zinc-400 block mb-1">
                              Destination (To)
                            </label>
                            <Input
                              required
                              maxLength={250}
                              value={bill.to}
                              onChange={(e) => updateBill(index, 'to', e.target.value)}
                              placeholder="e.g. Banani Site"
                              className="h-8 text-xs bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                            />
                          </div>

                          {/* Purpose */}
                          <div className="sm:col-span-2 md:col-span-3">
                            <label className="text-[10px] font-mono uppercase text-slate-500 dark:text-zinc-400 block mb-1">
                              Official Purpose
                            </label>
                            <Input
                              required
                              maxLength={500}
                              value={bill.purpose}
                              onChange={(e) => updateBill(index, 'purpose', e.target.value)}
                              placeholder="Client meeting, site measurement, sample delivery..."
                              className="h-8 text-xs bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                            />
                          </div>

                          {/* Amount */}
                          <div className="sm:col-span-2 md:col-span-1">
                            <label className="text-[10px] font-mono uppercase text-slate-500 dark:text-zinc-400 block mb-1">
                              Amount (৳)
                            </label>
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
                                className="h-8 text-xs font-mono pl-6 bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-right font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amount in Words ("The Sum of Taka ...") & Cheque Amount Box */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2 border-t border-slate-300 dark:border-zinc-700">
                  {/* Amount in Words (Left 8 cols) */}
                  <div className="md:col-span-8 space-y-1">
                    <span className="font-serif font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                      Amount in Words:
                    </span>
                    <div className="min-h-[42px] border-b-2 border-dotted border-slate-400 dark:border-zinc-600 px-2 py-1 flex items-center">
                      <p className="font-serif italic text-sm text-slate-800 dark:text-zinc-200 leading-snug">
                        {estimateLoading ? (
                          <span className="text-slate-400 font-sans text-xs">Computing bank words...</span>
                        ) : amountInWords ? (
                          <>
                            <span className="font-bold underline decoration-slate-400 decoration-1 underline-offset-4">
                              {amountInWords}
                            </span>
                            <span className="text-slate-400 ml-2 font-mono">----------------- ⑈</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-sans text-xs not-italic">
                            (Enter bill amounts above to auto-generate words)
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
                    <div className="w-full bg-white dark:bg-zinc-950 border-2 border-slate-800 dark:border-zinc-300 rounded px-3 py-2 flex items-center justify-between shadow-inner">
                      <span className="font-mono text-base font-black text-slate-900 dark:text-zinc-100">
                        ৳
                      </span>
                      <span className="font-mono text-xl font-black text-slate-900 dark:text-zinc-100 tracking-wider">
                        {calculatedTotal.toLocaleString('en-BD', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                        <span className="text-xs text-slate-500 dark:text-zinc-400 font-normal ml-1">/-</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Signature & Submission Area */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-dashed border-slate-300 dark:border-zinc-700">
                  {/* MICR Bank Code Line Graphic */}
                  <div className="font-mono text-[11px] tracking-[0.25em] text-slate-500 dark:text-zinc-500 select-none hidden sm:block">
                    ⑈ 104820 ⑈ 020084012 ⑈ 92
                  </div>

                  {/* Submit / Issue Button styled as Signature Verification */}
                  <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
                    <div className="text-center sm:text-right hidden sm:block">
                      <span className="text-[10px] font-serif uppercase tracking-wider text-slate-400 block border-b border-slate-300 dark:border-zinc-700 pb-0.5">
                        Authorised Signatory
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">Employee Stamp</span>
                    </div>

                    <Button
                      type="submit"
                      disabled={saving || estimateLoading || calculatedTotal <= 0}
                      className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-serif font-bold text-sm tracking-wide shadow-md transition-all active:scale-95"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Issuing Cheque...
                        </>
                      ) : (
                        <>
                          <Wallet className="mr-2 h-4 w-4" /> Issue & Sign Cheque
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* ============================================================ */}
        {/* CONVEYANCE ACTIVITY - ISSUED CHEQUE LEAVES (xl:col-span-5) */}
        {/* ============================================================ */}
        <div className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
              <h2 className="text-base font-serif font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Issued Cheque Register
              </h2>
            </div>
            <span className="text-xs font-mono bg-slate-200 dark:bg-zinc-800 px-2 py-0.5 rounded text-slate-700 dark:text-zinc-300 font-semibold">
              {rows.length} {rows.length === 1 ? 'Leaf' : 'Leaves'}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-slate-300 dark:border-zinc-800">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500 mb-2" />
              <span className="text-xs font-mono text-slate-400">Auditing registered cheques...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center rounded-xl border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-6">
              <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-serif font-medium text-slate-600 dark:text-zinc-400">
                No conveyance cheques issued in this period.
              </p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                Fill the cheque leaf on the left to submit a new conveyance bill.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="relative rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-amber-50/40 dark:bg-zinc-900 shadow-md overflow-hidden transition-all hover:shadow-lg"
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
                          Issued on {dateText(row.createdAt)}
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
                          Accounts Endorsement / Note:
                        </span>
                        {row.accountsNote}
                      </div>
                    )}

                    {/* Attached Cheque Slips / Journeys */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                        Transit Slips ({row.bills.length})
                      </span>
                      <div className="space-y-1.5">
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
      </div>
    </div>
  )
}
