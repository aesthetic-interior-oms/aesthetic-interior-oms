'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarDays, FileDown, Loader2, RefreshCw, Wallet } from 'lucide-react'

type ConveyanceRow = { id: string; amount: number; approvedAmount: number | null; purpose: string; travelDate: string; status: string; voucherNo: string | null; accountsNote: string | null; requester: { id: string; fullName: string; email: string; userDepartments: Array<{ department: { name: string } }> }; reviewedBy: { fullName: string } | null }
type DateGroup = { date: string; count: number; amount: number; approvedAmount: number; paidAmount: number; requests: ConveyanceRow[] }
type Payload = { requests: ConveyanceRow[]; users: Array<{ id: string; fullName: string }>; totals: { count: number; amount: number; approvedAmount: number; paidAmount: number }; userTotals: Array<{ userId: string; name: string; count: number; amount: number; approvedAmount: number; paidAmount: number }>; dateGroups: DateGroup[]; monthGroups: Array<{ month: string; dates: DateGroup[] }> }
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const initialRange = () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6); return { start: isoDate(start), end: isoDate(end) } }
const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const formatMonth = (month: string) => new Date(`${month}-01T00:00:00.000Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const money = (amount: number) => `৳${amount.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`
const statusStyle: Record<string, string> = { PENDING: 'bg-amber-100 text-amber-800', APPROVED: 'bg-blue-100 text-blue-800', PAID: 'bg-emerald-100 text-emerald-800', REJECTED: 'bg-red-100 text-red-800' }

export default function AccountsConveyancePage() {
  const [range, setRange] = useState(initialRange)
  const [receivedBy, setReceivedBy] = useState('ALL')
  const [voucher, setVoucher] = useState('')
  const [status, setStatus] = useState('ALL')
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [exporting, setExporting] = useState(false)
  const params = useMemo(() => new URLSearchParams({ view: 'accounts', startDate: range.start, endDate: range.end, status, ...(receivedBy !== 'ALL' ? { receivedBy } : {}), ...(voucher.trim() ? { voucher: voucher.trim() } : {}) }), [range, receivedBy, voucher, status])
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/conveyance?${params}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not load conveyance bills')
      setPayload(data)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load conveyance bills') }
    finally { setLoading(false) }
  }, [params])
  useEffect(() => { void load() }, [load])
  const update = async (row: ConveyanceRow, nextStatus: 'APPROVED' | 'REJECTED' | 'PAID') => {
    setWorkingId(row.id)
    try {
      const response = await fetch(`/api/conveyance/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not update request')
      toast.success(nextStatus === 'APPROVED' ? `Approved · voucher ${data.request.voucherNo}` : nextStatus === 'PAID' ? 'Marked as paid' : 'Request rejected')
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update request') }
    finally { setWorkingId('') }
  }
  const exportPdf = async () => {
    setExporting(true)
    try {
      const response = await fetch(`/api/conveyance/report?${params}`)
      if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(data?.error || 'Could not generate PDF') }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'conveyance-report.pdf'; anchor.click(); URL.revokeObjectURL(url)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not generate PDF') }
    finally { setExporting(false) }
  }
  const grouped = payload?.monthGroups ?? []
  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Conveyance Bills</h1><p className="text-sm text-muted-foreground">Review requests, track disbursements, and export filtered reports.</p></div><Button onClick={() => void exportPdf()} disabled={exporting || loading}>{exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4"/>}Export PDF</Button></div>
    <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
      <label className="space-y-1 text-xs">From<Input type="date" value={range.start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}/></label>
      <label className="space-y-1 text-xs">To<Input type="date" value={range.end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}/></label>
      <label className="space-y-1 text-xs">Received by<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)}><option value="ALL">All users</option>{payload?.users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}</select></label>
      <label className="space-y-1 text-xs">Voucher no.<Input placeholder="Search voucher" value={voucher} onChange={(e) => setVoucher(e.target.value)}/></label>
      <label className="space-y-1 text-xs">Status<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="PAID">Paid</option><option value="REJECTED">Rejected</option></select></label>
      <div className="flex items-end"><Button className="w-full" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div>
    </CardContent></Card>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Requests in period</div><div className="mt-1 text-2xl font-semibold">{payload?.totals?.count ?? 0}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Requested amount</div><div className="mt-1 text-2xl font-semibold">{money(payload?.totals?.amount ?? 0)}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Approved amount</div><div className="mt-1 text-2xl font-semibold">{money(payload?.totals?.approvedAmount ?? 0)}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Paid amount</div><div className="mt-1 text-2xl font-semibold">{money(payload?.totals?.paidAmount ?? 0)}</div></CardContent></Card></div>
    <Tabs defaultValue="requests"><TabsList><TabsTrigger value="requests">Requests & history</TabsTrigger><TabsTrigger value="transactions">Transaction view</TabsTrigger><TabsTrigger value="users">User summary</TabsTrigger></TabsList>
      <TabsContent value="requests"><Card><CardHeader><CardTitle>Conveyance request history</CardTitle></CardHeader><CardContent className="space-y-5">
        {loading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin"/></div> : grouped.length ? grouped.map((month) => <section key={month.month} className="space-y-4"><h2 className="border-b pb-2 text-lg font-semibold">{formatMonth(month.month)}</h2>{month.dates.map((day) => <div key={day.date}><div className="mb-2 flex items-center justify-between border-b pb-2"><h3 className="font-medium">{formatDate(day.date)}</h3><span className="text-sm text-muted-foreground">{day.count} requests · {money(day.amount)}</span></div><div className="space-y-2">{day.requests.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div className="min-w-[220px] flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{row.requester.fullName}</span><Badge className={statusStyle[row.status] ?? ''}>{row.status}</Badge></div><p className="mt-1 text-sm">{row.purpose}</p><p className="mt-1 text-xs text-muted-foreground">Requested {money(row.amount)}{row.approvedAmount !== null ? ` · Approved ${money(row.approvedAmount)}` : ''}{row.voucherNo ? ` · Voucher ${row.voucherNo}` : ''}</p>{row.accountsNote && <p className="mt-1 text-xs text-muted-foreground">Accounts note: {row.accountsNote}</p>}</div><div className="flex flex-wrap gap-2">{row.status === 'PENDING' && <><Button size="sm" disabled={workingId === row.id} onClick={() => void update(row, 'APPROVED')}>{workingId === row.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Approve'}</Button><Button size="sm" variant="outline" disabled={workingId === row.id} onClick={() => void update(row, 'REJECTED')}>Reject</Button></>}{row.status === 'APPROVED' && <Button size="sm" disabled={workingId === row.id} onClick={() => void update(row, 'PAID')}>{workingId === row.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Mark paid'}</Button>}</div></div>)}</div></div>)}</section>) : <div className="py-10 text-center text-sm text-muted-foreground">No conveyance records match these filters.</div>}
      </CardContent></Card></TabsContent>
      <TabsContent value="transactions"><Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5"/>Transaction view by date</CardTitle></CardHeader><CardContent>{loading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin"/></div> : payload?.dateGroups.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Date</th><th className="p-3">Requests</th><th className="p-3">Requested</th><th className="p-3">Approved</th><th className="p-3">Paid</th></tr></thead><tbody>{payload.dateGroups.map((group) => <tr key={group.date} className="border-b"><td className="p-3">{formatDate(group.date)}</td><td className="p-3">{group.count}</td><td className="p-3">{money(group.amount)}</td><td className="p-3">{money(group.approvedAmount)}</td><td className="p-3">{money(group.paidAmount)}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-muted-foreground">No conveyance transactions in this period.</p>}</CardContent></Card></TabsContent>
      <TabsContent value="users"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5"/>User totals for filtered period</CardTitle></CardHeader><CardContent>{loading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin"/></div> : payload?.userTotals.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">User</th><th className="p-3">Requests</th><th className="p-3">Requested</th><th className="p-3">Approved</th><th className="p-3">Paid</th></tr></thead><tbody>{payload.userTotals.map((user) => <tr key={user.userId} className="border-b"><td className="p-3 font-medium">{user.name}</td><td className="p-3">{user.count}</td><td className="p-3">{money(user.amount)}</td><td className="p-3">{money(user.approvedAmount)}</td><td className="p-3">{money(user.paidAmount)}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-muted-foreground">No user totals in this period.</p>}</CardContent></Card></TabsContent>
    </Tabs>
  </div>
}
