'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, FileText, Loader2, Plus, Save, Send, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Line = { id: string; name: string; quantity: number; rate: number }
type Data = { lead: { name: string; location: string | null; stage: string; subStatus: string | null }; draft: { content: { lines?: Line[]; note?: string }; grandTotal: number } | null }
const blankLine = (): Line => ({ id: crypto.randomUUID(), name: '', quantity: 1, rate: 0 })

export default function PartialQuotationBuilderPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const [data, setData] = useState<Data | null>(null)
  const [lines, setLines] = useState<Line[]>([blankLine()])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch(`/api/partial-quotation/${leadId}`, { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok || !payload.success) { toast.error(payload.error || 'Unable to load partial quotation'); setLoading(false); return }
    const next = payload.data as Data
    setData(next)
    if (next.draft?.content.lines?.length) setLines(next.draft.content.lines)
    setNote(next.draft?.content.note || '')
    setLoading(false)
  }, [leadId])
  useEffect(() => { void load() }, [load])

  const total = useMemo(() => lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.rate || 0), 0), [lines])
  const update = (id: string, field: keyof Line, value: string) => setLines((current) => current.map((line) => line.id === id ? { ...line, [field]: field === 'name' ? value : Number(value) } : line))
  const save = async (action: 'save' | 'submit') => {
    if (action === 'submit' && lines.length === 0) { toast.error('Add at least one quotation item before completing'); return }
    if (lines.some((line) => !line.name.trim() || line.quantity < 0 || line.rate < 0)) { toast.error('Complete every quotation item before saving'); return }
    setSaving(true)
    try {
      const response = await fetch(`/api/partial-quotation/${leadId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, lines, note }) })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to save quotation')
      toast.success(action === 'submit' ? 'Partial quotation completed' : 'Partial quotation saved')
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save quotation') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!data) return null
  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div><Link href={`/visit-team/partial-visits/${leadId}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Partial visit</Link><h1 className="flex items-center gap-2 text-2xl font-bold"><FileText className="text-indigo-600" /> Partial quotation</h1><p className="mt-1 text-sm text-muted-foreground">{data.lead.name} {data.lead.location ? `• ${data.lead.location}` : ''}</p></div>
      <div className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">{data.lead.subStatus?.replaceAll('_', ' ')}</div>
    </div>
    <Card className="border-indigo-200"><CardHeader><CardTitle className="text-base">Quotation items</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="grid grid-cols-[1fr_100px_130px_110px_36px] gap-2 px-1 text-xs font-medium text-muted-foreground"><span>Work description</span><span>Quantity</span><span>Rate (৳)</span><span>Total</span><span /></div>
      {lines.map((line) => <div key={line.id} className="grid grid-cols-[1fr_100px_130px_110px_36px] items-center gap-2"><Input value={line.name} onChange={(e) => update(line.id, 'name', e.target.value)} placeholder="e.g. Kitchen cabinet" /><Input type="number" min="0" value={line.quantity} onChange={(e) => update(line.id, 'quantity', e.target.value)} /><Input type="number" min="0" value={line.rate} onChange={(e) => update(line.id, 'rate', e.target.value)} /><p className="text-right text-sm font-medium">৳{(line.quantity * line.rate).toLocaleString()}</p><Button variant="ghost" size="icon" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} aria-label="Remove item"><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}
      <Button variant="outline" size="sm" onClick={() => setLines((current) => [...current, blankLine()])}><Plus className="mr-1 h-4 w-4" /> Add item</Button>
    </CardContent></Card>
    <div className="grid gap-6 md:grid-cols-[1fr_300px]"><Card><CardHeader><CardTitle className="text-base">Remarks</CardTitle></CardHeader><CardContent><Label htmlFor="quotation-note" className="sr-only">Remarks</Label><Textarea id="quotation-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Scope, exclusions, payment notes, or client requirements..." rows={6} /></CardContent></Card><Card className="bg-indigo-50/50"><CardContent className="space-y-4 pt-6"><p className="text-sm text-muted-foreground">Grand total</p><p className="text-3xl font-bold">৳{total.toLocaleString()}</p><Button className="w-full" variant="outline" disabled={saving} onClick={() => save('save')}><Save className="mr-2 h-4 w-4" /> Save draft</Button><Button className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={saving} onClick={() => save('submit')}><Send className="mr-2 h-4 w-4" /> Complete quotation</Button></CardContent></Card></div>
  </main>
}
