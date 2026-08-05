'use client'

import { CheckCircle2, Loader2, Pencil, Plus, Trash2, Quote } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { WebsiteTestimonial } from '@/lib/website-testimonials'

type TestimonialForm = { id?: string; quote: string; author: string; project: string; image: string; isPublished: boolean; sortOrder: number }
const emptyForm: TestimonialForm = { quote: '', author: '', project: '', image: '', isPublished: true, sortOrder: 0 }
function toForm(t: WebsiteTestimonial): TestimonialForm { return { id: t.id, quote: t.quote, author: t.author, project: t.project, image: t.image, isPublished: t.isPublished, sortOrder: t.sortOrder } }

export function WebsiteTestimonialManager() {
  const [testimonials, setTestimonials] = useState<WebsiteTestimonial[]>([])
  const [form, setForm] = useState<TestimonialForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const editing = Boolean(form.id)

  async function loadTestimonials() {
    setLoading(true)
    const response = await fetch('/api/website/testimonials?includeDrafts=true', { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Failed to load testimonials')
    setTestimonials(payload.testimonials || [])
    setLoading(false)
  }

  useEffect(() => { loadTestimonials().catch((error) => { setMessage(error instanceof Error ? error.message : 'Failed to load testimonials'); setLoading(false) }) }, [])
  function updateField<K extends keyof TestimonialForm>(key: K, value: TestimonialForm[K]) { setForm((current) => ({ ...current, [key]: value })) }

  async function saveTestimonial() {
    setSaving(true); setMessage(null)
    try {
      const response = await fetch(form.id ? `/api/website/testimonials/${form.id}` : '/api/website/testimonials', { method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to save testimonial')
      setTestimonials(payload.testimonials || []); setForm(emptyForm); setMessage('Testimonial saved. Published testimonials now control the home page section.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Failed to save testimonial') } finally { setSaving(false) }
  }

  async function deleteTestimonial(id: string) {
    if (!confirm('Delete this testimonial?')) return
    const response = await fetch(`/api/website/testimonials/${id}`, { method: 'DELETE' })
    const payload = await response.json()
    if (response.ok) setTestimonials(payload.testimonials || [])
    else setMessage(payload.error || 'Failed to delete testimonial')
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
      <Card className="overflow-hidden border-[#eadfca] bg-white/95 shadow-xl shadow-slate-200/70">
        <CardHeader className="border-b border-[#efe5d2] bg-gradient-to-r from-[#fff9eb] to-white"><CardTitle className="text-xl text-[#17382d]">{editing ? 'Edit Testimonial' : 'Create Testimonial'}</CardTitle><CardDescription>Add client feedback, project label, image, display order, and publish status.</CardDescription></CardHeader>
        <CardContent className="space-y-5 p-6">
          {message && <p className="flex items-center gap-2 rounded-xl border border-[#eadfca] bg-[#fffaf0] px-3 py-2 text-sm text-[#7a5a00]"><CheckCircle2 className="h-4 w-4" /> {message}</p>}
          <div className="space-y-2"><Label>Quote</Label><Textarea value={form.quote} onChange={(e) => updateField('quote', e.target.value)} placeholder="Client feedback" rows={4} /></div>
          <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Client name</Label><Input value={form.author} onChange={(e) => updateField('author', e.target.value)} placeholder="Client name" /></div><div className="space-y-2"><Label>Project label</Label><Input value={form.project} onChange={(e) => updateField('project', e.target.value)} placeholder="Residential Project" /></div><div className="space-y-2"><Label>Image URL</Label><Input value={form.image} onChange={(e) => updateField('image', e.target.value)} placeholder="/client agreement/photo.jpg" /></div><div className="space-y-2"><Label>Sort order</Label><Input type="number" value={form.sortOrder} onChange={(e) => updateField('sortOrder', Number(e.target.value))} /></div></div>
          <div className="flex items-center justify-between rounded-2xl border bg-slate-50 p-4"><div><Label>Publish</Label><p className="text-xs text-muted-foreground">Draft testimonials stay hidden.</p></div><Switch checked={form.isPublished} onCheckedChange={(v) => updateField('isPublished', v)} /></div>
          <div className="flex gap-3"><Button onClick={saveTestimonial} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}{editing ? 'Update Testimonial' : 'Create Testimonial'}</Button>{editing && <Button variant="outline" onClick={() => setForm(emptyForm)}>Cancel Edit</Button>}</div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-[#eadfca] bg-white/95 shadow-xl shadow-slate-200/70"><CardHeader><CardTitle className="text-xl text-[#17382d]">Home Page Testimonials</CardTitle><CardDescription>Review, edit, publish, or remove website testimonials.</CardDescription></CardHeader><CardContent className="p-6">{loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading testimonials...</div> : <div className="space-y-4">{testimonials.map((testimonial) => <div key={testimonial.id} className="flex gap-4 rounded-2xl border p-3"><div className="flex h-20 w-24 items-center justify-center rounded-lg bg-slate-100 text-[#17382d]"><Quote className="h-6 w-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{testimonial.author}</h3><Badge variant={testimonial.isPublished ? 'default' : 'outline'}>{testimonial.isPublished ? 'Published' : 'Draft'}</Badge></div><p className="line-clamp-2 text-sm text-muted-foreground">{testimonial.quote}</p><p className="text-xs uppercase tracking-wide text-muted-foreground">{testimonial.project}</p></div><div className="flex flex-col gap-2"><Button size="sm" variant="outline" onClick={() => setForm(toForm(testimonial))}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="destructive" onClick={() => deleteTestimonial(testimonial.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}{testimonials.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No testimonials yet. Create one to populate the home page section.</div>}</div>}</CardContent></Card>
    </div>
  )
}
