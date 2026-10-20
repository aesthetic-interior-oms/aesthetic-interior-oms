'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CONVEYANCE_MODES } from '@/lib/conveyance-bills'
import { CalendarDays, Loader2, Plus, Trash2, Wallet } from 'lucide-react'

type BillDraft = { date: string; from: string; to: string; mode: string; purpose: string; amount: string }
type BillRow = Omit<BillDraft, 'amount'> & { amount: number; id: string }
type RequestRow = { id: string; amount: number; amountInWords: string; clientName: string; clientLocation: string; createdAt: string; status: string; voucherNo: string | null; accountsNote: string | null; bills: BillRow[] }
const localDateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateText = (date: string) => new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const money = (amount: number) => `৳${amount.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`
const blankBill = (): BillDraft => ({ date: localDateInput(new Date()), from: '', to: '', mode: '', purpose: '', amount: '' })
const defaultRange = () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6); return { start: localDateInput(start), end: localDateInput(end) } }

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

  const load = useCallback(async (nextRange = range) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ startDate: nextRange.start, endDate: nextRange.end })
      const response = await fetch(`/api/conveyance?${params}`)
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not load conveyance history')
      setRows(data.requests)
      setApprovedTotal(data.totals?.approvedAmount ?? 0)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load conveyance history') }
    finally { setLoading(false) }
  }, [range])
  useEffect(() => { void load() }, [load])

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
        const response = await fetch('/api/conveyance/estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amounts }) })
        const data = await response.json()
        if (active) setAmountInWords(response.ok && data.success ? data.amountInWords : '')
      } catch { if (active) setAmountInWords('') }
      finally { if (active) setEstimateLoading(false) }
    }, 350)
    return () => { active = false; window.clearTimeout(timeout) }
  }, [bills])

  const updateBill = (index: number, key: keyof BillDraft, value: string) => setBills((current) => current.map((bill, rowIndex) => rowIndex === index ? { ...bill, [key]: value } : bill))
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true)
    try {
      const payload = { clientName, clientLocation, bills: bills.map((bill) => ({ ...bill, amount: Number(bill.amount) })) }
      const response = await fetch('/api/conveyance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not submit request')
      toast.success('Conveyance request submitted')
      setClientName(''); setClientLocation(''); setBills([blankBill()]); setAmountInWords(''); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not submit request') }
    finally { setSaving(false) }
  }
  const statusClass: Record<string, string> = { PENDING: 'bg-amber-100 text-amber-800', APPROVED: 'bg-blue-100 text-blue-800', PAID: 'bg-emerald-100 text-emerald-800', REJECTED: 'bg-red-100 text-red-800' }

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
    <div><h1 className="text-2xl font-semibold">Conveyance</h1><p className="text-sm text-muted-foreground">Submit client travel bills and review your conveyance history.</p></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5"/> New conveyance request</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">Client name<Input required maxLength={250} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name"/></label>
          <label className="block space-y-1 text-sm">Client location<Input required maxLength={500} value={clientLocation} onChange={(e) => setClientLocation(e.target.value)} placeholder="Area, city or project location"/></label>
          <label className="block space-y-1 text-sm">Submit date<Input type="date" value={submitDate} disabled readOnly aria-label="Submit date (automatic)"/></label>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Bill details</h2><p className="text-xs text-muted-foreground">Add one row for each bill. You can include multiple bills in one request.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setBills((current) => [...current, blankBill()])}><Plus className="mr-1 h-4 w-4"/>Add bill</Button></div>
          {bills.map((bill, index) => <div key={index} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Bill {index + 1}</span>{bills.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label={`Remove bill ${index + 1}`} onClick={() => setBills((current) => current.filter((_, rowIndex) => rowIndex !== index))}><Trash2 className="h-4 w-4 text-destructive"/></Button>}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">Date<Input type="date" required value={bill.date} onChange={(e) => updateBill(index, 'date', e.target.value)}/></label>
              <label className="block space-y-1 text-sm">Mode of transport<select required className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={bill.mode} onChange={(e) => updateBill(index, 'mode', e.target.value)}><option value="">Choose transport</option>{CONVEYANCE_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
              <label className="block space-y-1 text-sm">From<Input required maxLength={250} value={bill.from} onChange={(e) => updateBill(index, 'from', e.target.value)} placeholder="Starting point"/></label>
              <label className="block space-y-1 text-sm">To<Input required maxLength={250} value={bill.to} onChange={(e) => updateBill(index, 'to', e.target.value)} placeholder="Destination"/></label>
              <label className="block space-y-1 text-sm sm:col-span-2">Purpose<Input required maxLength={500} value={bill.purpose} onChange={(e) => updateBill(index, 'purpose', e.target.value)} placeholder="Meeting, site visit, client appointment…"/></label>
              <label className="block space-y-1 text-sm sm:col-span-2">Amount (৳)<Input type="number" min="0.01" max="100000000" step="0.01" required value={bill.amount} onChange={(e) => updateBill(index, 'amount', e.target.value)} placeholder="Bill amount"/></label>
            </div>
          </div>)}
        </div>
        <div className="rounded-lg bg-muted/60 p-4"><div className="text-sm font-medium">Total amount in words</div><div className="mt-1 text-sm">{estimateLoading ? <span className="text-muted-foreground">Calculating…</span> : amountInWords || <span className="text-muted-foreground">Enter an amount for each bill.</span>}</div></div>
        <Button type="submit" disabled={saving || estimateLoading} className="w-full">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wallet className="mr-2 h-4 w-4"/>}Submit request</Button>
      </form></CardContent></Card>

      <div className="space-y-4">
        <Card><CardContent className="flex flex-wrap items-end justify-between gap-4 p-4"><div><div className="text-sm text-muted-foreground">Approved in period</div><div className="text-2xl font-semibold">{money(approvedTotal)}</div></div><div className="flex flex-wrap gap-2"><label className="text-xs">From<Input type="date" value={range.start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}/></label><label className="text-xs">To<Input type="date" value={range.end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}/></label><Button variant="outline" onClick={() => void load(range)}><CalendarDays className="mr-2 h-4 w-4"/>Apply</Button></div></CardContent></Card>
        <Card><CardHeader><CardTitle>My conveyance activity</CardTitle></CardHeader><CardContent className="space-y-4">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin"/></div> : rows.length ? rows.map((row) => <div key={row.id} className="space-y-3 rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-medium">{row.clientName} · {row.clientLocation}</div><div className="mt-1 text-xs text-muted-foreground">Submitted {dateText(row.createdAt)} · Request total {money(row.amount)}</div><div className="mt-1 text-xs">{row.amountInWords}</div>{row.voucherNo && <div className="mt-1 text-xs text-muted-foreground">Voucher: {row.voucherNo}</div>}{row.accountsNote && <div className="mt-1 text-sm">Accounts: {row.accountsNote}</div>}</div><Badge className={statusClass[row.status] || ''}>{row.status}</Badge></div><div className="space-y-2">{row.bills.map((bill) => <div key={bill.id} className="rounded-md bg-muted/50 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{dateText(bill.date)} · {bill.from} → {bill.to}</span><span className="font-semibold">{money(bill.amount)}</span></div><div className="mt-1 text-muted-foreground">{CONVEYANCE_MODES.find((mode) => mode.value === bill.mode)?.label ?? bill.mode} · {bill.purpose}</div></div>)}</div></div>) : <div className="py-10 text-center text-sm text-muted-foreground">No conveyance requests in this bill date range.</div>}
        </CardContent></Card>
      </div>
    </div>
  </div>
}
