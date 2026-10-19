'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2, Printer, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { buildDefaultFurnitureQuotationContent, type FurnitureQuotationContent, type FurnitureQuotationItem } from '@/lib/furniture-quotation-template'

type Props = { leadId: string; leadName: string; leadLocation: string | null; onDraftSaved?: () => void }
const money = (value: number) => `৳${Math.round(value).toLocaleString('en-BD')}`

export function FurnitureQuotationBuilder({ leadId, leadName, leadLocation, onDraftSaved }: Props) {
  const [content, setContent] = useState<FurnitureQuotationContent>(() => buildDefaultFurnitureQuotationContent({ clientName: leadName, clientAddress: leadLocation }))
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/lead/${leadId}/furniture-quotation`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Unable to load furniture quotation')
        if (!active) return
        setContent(payload.data.content)
        setCanEdit(Boolean(payload.data.canEdit))
        setHasDraft(Boolean(payload.data.draft))
      })
      .catch((error) => { if (active) toast.error(error instanceof Error ? error.message : 'Unable to load furniture quotation') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [leadId])

  const totals = useMemo(() => {
    const sum = (section: FurnitureQuotationItem['section']) => content.items.filter((item) => item.section === section).reduce((total, item) => total + item.quantity * item.rate, 0)
    return { furniture: sum('Furniture'), electrical: sum('Electrical Item'), grand: content.items.reduce((total, item) => total + item.quantity * item.rate, 0) }
  }, [content.items])

  function patchItem(id: string, patch: Partial<FurnitureQuotationItem>) {
    setContent((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item) }))
  }

  async function save() {
    setSaving(true)
    try {
      const response = await fetch(`/api/lead/${leadId}/furniture-quotation`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
      const payload = await response.json()
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Unable to save quotation')
      setHasDraft(true)
      toast.success('Furniture quotation draft saved')
      onDraftSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save quotation')
    } finally { setSaving(false) }
  }

  function addItem(section: FurnitureQuotationItem['section']) {
    const id = `custom-${Date.now()}`
    setContent((current) => ({ ...current, items: [...current.items, { id, section, name: '', description: '', quantity: 1, unit: 'Nos', rate: 0 }] }))
  }

  if (loading) return <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading furniture quotation…</CardContent></Card>

  return <div className="space-y-4">
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div><CardTitle>Furniture Quotation</CardTitle><p className="mt-1 text-sm text-muted-foreground">Editable starter items from the supplied quotation. Save creates a separate draft for this lead.</p></div>
        <Badge variant={hasDraft ? 'default' : 'secondary'}>{hasDraft ? 'Draft saved' : 'New draft'}</Badge>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm"><span className="font-medium">Quotation for</span><Input value={leadName} readOnly /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Address</span><Input value={leadLocation ?? ''} readOnly placeholder="No address on lead" /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Date</span><Input type="date" value={content.quotationDate} disabled={!canEdit} onChange={(e) => setContent((c) => ({ ...c, quotationDate: e.target.value }))} /></label>
        <label className="space-y-1 text-sm sm:col-span-3"><span className="font-medium">Subject</span><Input value={content.subject} disabled={!canEdit} onChange={(e) => setContent((c) => ({ ...c, subject: e.target.value }))} /></label>
      </CardContent>
    </Card>

    {(['Furniture', 'Electrical Item'] as const).map((section) => {
      const items = content.items.filter((item) => item.section === section)
      const sectionTotal = section === 'Furniture' ? totals.furniture : totals.electrical
      return <Card key={section}>
        <CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle className="text-lg">{section}</CardTitle><p className="text-sm text-muted-foreground">{items.length} items · {money(sectionTotal)}</p></div>{canEdit && <Button variant="outline" size="sm" onClick={() => addItem(section)}><Plus className="mr-1 h-4 w-4" />Add item</Button>}</CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, index) => <div key={item.id} className="rounded-lg border p-3">
            <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item {index + 1}</p>{canEdit && <Button variant="ghost" size="icon" aria-label={`Remove ${item.name || 'item'}`} onClick={() => setContent((c) => ({ ...c, items: c.items.filter((row) => row.id !== item.id) }))}><Trash2 className="h-4 w-4" /></Button>}</div>
            <div className="grid gap-3 lg:grid-cols-[minmax(180px,1.2fr)_minmax(240px,2fr)_90px_100px_130px_130px]">
              <label className="space-y-1 text-xs"><span>Name</span><Input value={item.name} disabled={!canEdit} onChange={(e) => patchItem(item.id, { name: e.target.value })} /></label>
              <label className="space-y-1 text-xs"><span>Description / materials</span><Textarea className="min-h-10" value={item.description} disabled={!canEdit} onChange={(e) => patchItem(item.id, { description: e.target.value })} /></label>
              <label className="space-y-1 text-xs"><span>Quantity</span><Input type="number" min="0" step="any" value={item.quantity} disabled={!canEdit} onChange={(e) => patchItem(item.id, { quantity: Number(e.target.value) || 0 })} /></label>
              <label className="space-y-1 text-xs"><span>Unit</span><Input value={item.unit} disabled={!canEdit} onChange={(e) => patchItem(item.id, { unit: e.target.value })} /></label>
              <label className="space-y-1 text-xs"><span>Unit price (৳)</span><Input type="number" min="0" step="any" value={item.rate} disabled={!canEdit} onChange={(e) => patchItem(item.id, { rate: Number(e.target.value) || 0 })} /></label>
              <div className="space-y-1 text-xs"><span className="block">Total</span><div className="flex h-10 items-center rounded-md bg-muted px-3 text-sm font-semibold">{money(item.quantity * item.rate)}</div></div>
            </div>
          </div>)}
        </CardContent>
      </Card>
    })}

    <Card><CardContent className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className="space-y-1 text-sm"><span className="font-medium">Notes</span><Textarea value={content.notes} disabled={!canEdit} onChange={(e) => setContent((c) => ({ ...c, notes: e.target.value }))} placeholder="Optional quotation notes" /></label>
      <div className="min-w-64 space-y-2 text-right"><p className="text-sm">Furniture subtotal <strong>{money(totals.furniture)}</strong></p><p className="text-sm">Electrical items subtotal <strong>{money(totals.electrical)}</strong></p><p className="border-t pt-2 text-lg font-bold">Grand total {money(totals.grand)}</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>{canEdit && <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save draft</Button>}</div></div>
    </CardContent></Card>
  </div>
}
