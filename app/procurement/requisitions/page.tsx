'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { FileText, RefreshCw, Receipt, UserRound, Check } from 'lucide-react'

type Item = { id: string; materialName: string; specifications: string | null; finalQuantity: number; unit: string; indentItems: Array<{ id: string; quantity: string; unitPrice: string; total: string; billedAt: string; indent: { id: string; indentNo: string; createdAt: string; createdBy: { fullName: string } } }> }
type Req = { id: string; requisitionNo: string; status: string; createdAt: string; lead: { name: string; location: string | null }; createdBy: { fullName: string }; procurementAssignee: { id: string; fullName: string } | null; items: Item[]; indents: Array<{ id: string; indentNo: string; total: string; vendorName: string | null; createdAt: string; createdBy: { fullName: string } }> }
type Member = { id: string; fullName: string }
const remainingQty = (item: Item) => Math.max(0, item.finalQuantity - item.indentItems.reduce((sum, row) => sum + Number(row.quantity), 0))

export default function ProcurementRequisitionsPage() {
  const [rows, setRows] = useState<Req[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [leader, setLeader] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [selection, setSelection] = useState<Record<string, boolean>>({})
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [vendor, setVendor] = useState<Record<string, string>>({})
  const [transport, setTransport] = useState<Record<string, string>>({})
  const [other, setOther] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'unbilled' | 'billed'>('unbilled')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/procurement/requisitions', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load requisitions')
      setRows(data.data ?? []); setMembers(data.members ?? []); setLeader(Boolean(data.leader))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Load failed') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const assign = async (requisitionId: string, assigneeId: string) => {
    setBusy(requisitionId)
    try {
      const response = await fetch('/api/procurement/requisitions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requisitionId, assigneeId: assigneeId || null }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Assignment failed')
      toast.success(assigneeId ? 'Requisition assigned' : 'Assignment cleared'); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Assignment failed') }
    finally { setBusy(null) }
  }

  const createIndent = async (req: Req) => {
    const selected = req.items.filter((item) => selection[item.id] && remainingQty(item) > 0)
    if (!selected.length) { toast.error('Select at least one unbilled item'); return }
    setBusy(req.id)
    try {
      const response = await fetch('/api/procurement/indents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requisitionId: req.id, vendorName: vendor[req.id], transportCost: Number(transport[req.id] || 0), otherCosts: Number(other[req.id] || 0), items: selected.map((item) => ({ itemId: item.id, quantity: Number(quantities[item.id] || item.finalQuantity), unitPrice: Number(prices[item.id]) })) }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Indent creation failed')
      toast.success(`${data.data.indentNo} created`, { description: `${selected.length} item(s) added to indent` }); setSelection({}); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Indent creation failed') }
    finally { setBusy(null) }
  }

  return <main className="mx-auto max-w-7xl space-y-5 p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Procurement Requisitions</h1><p className="text-sm text-muted-foreground">Delegate requisitions, price materials, and issue partial indents with a complete item history.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Refresh</Button></header>
    <div className="flex gap-2"><Button variant={tab === 'unbilled' ? 'default' : 'outline'} onClick={() => setTab('unbilled')}>Unbilled items</Button><Button variant={tab === 'billed' ? 'default' : 'outline'} onClick={() => setTab('billed')}>Billed items / Indents</Button></div>
    {loading ? <div className="rounded-xl border p-12 text-center text-muted-foreground">Loading requisitions…</div> : rows.length === 0 ? <div className="rounded-xl border p-12 text-center text-muted-foreground">No requisitions are assigned to you yet.</div> : rows.map((req) => {
      const items = req.items.filter((item) => tab === 'unbilled' ? remainingQty(item) > 0 : item.indentItems.length > 0)
      return <section key={req.id} className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 p-4"><div><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary"/><h2 className="font-bold">{req.requisitionNo} · {req.lead.name}</h2><Badge variant="secondary">{req.status.replace('_', ' ')}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{req.lead.location || 'Location not set'} · {req.items.length} items · Submitted by {req.createdBy.fullName}</p></div>{leader ? <label className="flex items-center gap-2 text-sm"><UserRound className="h-4 w-4"/><span>Assigned to</span><select className="h-9 rounded-md border bg-background px-2" value={req.procurementAssignee?.id ?? ''} onChange={(e) => void assign(req.id, e.target.value)} disabled={busy === req.id}><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></label> : <span className="text-xs text-muted-foreground">Assigned to {req.procurementAssignee?.fullName ?? 'you'}</span>}</div>
      {tab === 'unbilled' && (req.procurementAssignee || leader) ? <div className="grid gap-3 border-b bg-muted/10 p-4 sm:grid-cols-3"><label className="text-xs font-medium">Vendor<input className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={vendor[req.id] ?? ''} onChange={(e) => setVendor({ ...vendor, [req.id]: e.target.value })} placeholder="Vendor name"/></label><label className="text-xs font-medium">Transport cost<input type="number" min="0" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={transport[req.id] ?? ''} onChange={(e) => setTransport({ ...transport, [req.id]: e.target.value })} placeholder="0"/></label><label className="text-xs font-medium">Other costs<input type="number" min="0" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={other[req.id] ?? ''} onChange={(e) => setOther({ ...other, [req.id]: e.target.value })} placeholder="0"/></label></div> : null}
      <div className="divide-y">{items.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No {tab} items in this requisition.</p> : items.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 p-4">{tab === 'unbilled' ? <input aria-label={`Select ${item.materialName}`} type="checkbox" checked={Boolean(selection[item.id])} onChange={(e) => setSelection({ ...selection, [item.id]: e.target.checked })}/> : <Receipt className="h-4 w-4 text-emerald-600"/>}<div className="min-w-[220px] flex-1"><p className="font-semibold">{item.materialName}</p><p className="text-xs text-muted-foreground">{item.specifications || 'No specifications'} · Requested {item.finalQuantity} {item.unit}{tab === 'unbilled' && remainingQty(item) < item.finalQuantity ? ` · Remaining ${remainingQty(item)} ${item.unit}` : ''}</p></div>{tab === 'unbilled' ? <><Input aria-label="Bill quantity" type="number" min="0.001" max={remainingQty(item)} className="w-28" value={quantities[item.id] ?? String(remainingQty(item))} onChange={(e) => setQuantities({ ...quantities, [item.id]: e.target.value })}/><Input aria-label="Unit price" type="number" min="0" className="w-32" placeholder="Unit price" value={prices[item.id] ?? ''} onChange={(e) => setPrices({ ...prices, [item.id]: e.target.value })}/><span className="text-xs text-muted-foreground">{item.unit}</span></> : item.indentItems.map((billing) => <div key={billing.id} className="flex flex-wrap items-center gap-2 text-xs"><Badge className="gap-1"><Check className="h-3 w-3"/>{billing.indent.indentNo}</Badge><span>Qty {billing.quantity} × {billing.unitPrice} = {billing.total}</span><span>by {billing.indent.createdBy.fullName} · {new Date(billing.billedAt).toLocaleDateString()}</span></div>)}</div>)}</div>
      {tab === 'unbilled' && (req.procurementAssignee || leader) ? <div className="flex justify-end border-t p-4"><Button onClick={() => void createIndent(req)} disabled={busy === req.id}><Receipt className="mr-2 h-4 w-4"/>{busy === req.id ? 'Creating…' : 'Generate Indent'}</Button></div> : null}
      {tab === 'billed' && req.indents.length ? <div className="border-t bg-muted/10 p-4"><h3 className="mb-2 text-sm font-semibold">Indent history</h3><div className="flex flex-wrap gap-2">{req.indents.map((indent) => <Badge key={indent.id} variant="outline">{indent.indentNo} · {Number(indent.total).toLocaleString()} · {indent.vendorName || 'Vendor pending'} · {indent.createdBy.fullName}</Badge>)}</div></div> : null}</section>
    })}
  </main>
}
