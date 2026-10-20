'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Wallet, Plus, Loader2, CalendarDays } from 'lucide-react'

type RequestRow = { id: string; amount: number; approvedAmount: number | null; purpose: string; travelDate: string; status: string; voucherNo: string | null; accountsNote: string | null }
const dateText = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const money = (n: number) => `৳${n.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`
const localDateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const defaultRange = () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6); return { start: localDateInput(start), end: localDateInput(end) } }

export default function ConveyancePage() {
  const [range, setRange] = useState(defaultRange)
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [approvedTotal, setApprovedTotal] = useState(0)
  const [saving, setSaving] = useState(false)
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [travelDate, setTravelDate] = useState(localDateInput(new Date()))
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
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true)
    try {
      const response = await fetch('/api/conveyance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, purpose, travelDate }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not submit request')
      toast.success('Conveyance request submitted')
      setAmount(''); setPurpose(''); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not submit request') }
    finally { setSaving(false) }
  }
  const statusClass: Record<string, string> = { PENDING: 'bg-amber-100 text-amber-800', APPROVED: 'bg-blue-100 text-blue-800', PAID: 'bg-emerald-100 text-emerald-800', REJECTED: 'bg-red-100 text-red-800' }
  return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
    <div><h1 className="text-2xl font-semibold">Conveyance</h1><p className="text-sm text-muted-foreground">Request reimbursement and review your conveyance history.</p></div>
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5"/> Request conveyance</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1 text-sm">Travel date<Input type="date" required value={travelDate} onChange={(e) => setTravelDate(e.target.value)} /></label>
        <label className="block space-y-1 text-sm">Amount (৳)<Input type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500" /></label>
        <label className="block space-y-1 text-sm">Purpose / route<Textarea required maxLength={500} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Where did you travel and why?" /></label>
        <Button type="submit" disabled={saving} className="w-full">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wallet className="mr-2 h-4 w-4"/>}Submit request</Button>
      </form></CardContent></Card>
      <div className="space-y-4">
        <Card><CardContent className="flex flex-wrap items-end justify-between gap-4 p-4"><div><div className="text-sm text-muted-foreground">Approved in period</div><div className="text-2xl font-semibold">{money(approvedTotal)}</div></div><div className="flex gap-2"><label className="text-xs">From<Input type="date" value={range.start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}/></label><label className="text-xs">To<Input type="date" value={range.end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}/></label><Button variant="outline" onClick={() => void load(range)}><CalendarDays className="mr-2 h-4 w-4"/>Apply</Button></div></CardContent></Card>
        <Card><CardHeader><CardTitle>My conveyance activity</CardTitle></CardHeader><CardContent className="space-y-3">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin"/></div> : rows.length ? rows.map((row) => <div key={row.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4"><div className="min-w-0"><div className="font-medium">{row.purpose}</div><div className="mt-1 text-sm text-muted-foreground">{dateText(row.travelDate)} · Requested {money(row.amount)}</div>{row.voucherNo && <div className="mt-1 text-xs text-muted-foreground">Voucher: {row.voucherNo}</div>}{row.accountsNote && <div className="mt-1 text-sm">Accounts: {row.accountsNote}</div>}</div><div className="flex items-center gap-2"><Badge className={statusClass[row.status] || ''}>{row.status}</Badge><span className="font-semibold">{money(row.approvedAmount ?? row.amount)}</span></div></div>) : <div className="py-10 text-center text-sm text-muted-foreground">No conveyance requests in this date range.</div>}
        </CardContent></Card>
      </div>
    </div>
  </div>
}
