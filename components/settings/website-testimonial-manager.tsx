'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { uploadDirectBlobFile } from '@/lib/client-blob-upload'
import type { WebsiteTestimonial } from '@/lib/website-testimonials'

type Form = { id?: string; quote: string; author: string; project: string; image: string; isPublished: boolean; sortOrder: number }
const emptyForm: Form = { quote: '', author: '', project: '', image: '', isPublished: true, sortOrder: 0 }
const toForm = (item: WebsiteTestimonial): Form => ({ ...item })
const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export function WebsiteTestimonialManager() {
  const [testimonials, setTestimonials] = useState<WebsiteTestimonial[]>([])
  const [form, setForm] = useState<Form>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  useEffect(() => {
    loadTestimonials().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to load testimonials')
      setLoading(false)
    })
  }, [])

  function updateField<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function uploadImage(file: File | null) {
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const blob = await uploadDirectBlobFile({ file, context: 'website-testimonial', ownerId: form.id || slugify(form.author) || 'new-testimonial' })
      updateField('image', blob.url)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function saveTestimonial() {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(form.id ? `/api/website/testimonials/${form.id}` : '/api/website/testimonials', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to save testimonial')
      setTestimonials(payload.testimonials || [])
      setForm(emptyForm)
      setMessage('Testimonial saved. Published testimonials now control the home page carousel.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save testimonial')
    } finally {
      setSaving(false)
    }
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
        <CardHeader className="border-b border-[#efe5d2] bg-gradient-to-r from-[#fff9eb] to-white">
          <div className="flex items-center justify-between gap-3">
            <div><CardTitle className="text-xl text-[#17382d]">{editing ? 'Edit Testimonial' : 'Create Testimonial'}</CardTitle><CardDescription className="mt-2">Manage client testimonials shown on the public home page.</CardDescription></div>
            <Badge className="bg-[#17382d] text-white hover:bg-[#17382d]">{editing ? 'Editing' : 'New'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          {message && <p className="flex items-center gap-2 rounded-xl border border-[#eadfca] bg-[#fffaf0] px-3 py-2 text-sm text-[#7a5a00]"><CheckCircle2 className="h-4 w-4" /> {message}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Client name</Label><Input value={form.author} onChange={(e) => updateField('author', e.target.value)} /></div>
            <div className="space-y-2"><Label>Project label</Label><Input value={form.project} onChange={(e) => updateField('project', e.target.value)} placeholder="Residential Project" /></div>
            <div className="space-y-2"><Label>Sort order</Label><Input type="number" value={form.sortOrder} onChange={(e) => updateField('sortOrder', Number(e.target.value))} /></div>
          </div>
          <div className="space-y-2"><Label>Quote</Label><Textarea value={form.quote} onChange={(e) => updateField('quote', e.target.value)} rows={4} /></div>
          <div className="rounded-2xl border border-dashed border-[#d8c28b] bg-[#fffaf0] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><Label>Project/client image</Label><p className="text-xs text-muted-foreground">Upload the testimonial image to Vercel Blob, or paste an existing URL below.</p></div>
              <Button type="button" variant="outline" disabled={uploading} asChild><label className="cursor-pointer">{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload Image<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0] ?? null)} /></label></Button>
            </div>
            {form.image && <div className="mt-4 flex items-center gap-3"><div className="relative h-24 w-28 overflow-hidden rounded-lg bg-muted"><Image src={form.image} alt={form.author || 'Testimonial'} fill className="object-cover" sizes="112px" /></div><Input value={form.image} onChange={(e) => updateField('image', e.target.value)} /></div>}
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"><div><Label>Publish on website</Label><p className="text-xs text-muted-foreground">Only published testimonials appear publicly.</p></div><Switch checked={form.isPublished} onCheckedChange={(value) => updateField('isPublished', value)} /></div>
          <div className="flex flex-wrap gap-3"><Button onClick={saveTestimonial} disabled={saving || uploading}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}{editing ? 'Update Testimonial' : 'Create Testimonial'}</Button>{editing && <Button variant="outline" onClick={() => setForm(emptyForm)}>Cancel Edit</Button>}</div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-[#eadfca] bg-white/95 shadow-xl shadow-slate-200/70">
        <CardHeader className="border-b border-[#efe5d2] bg-white"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-xl text-[#17382d]">Website Testimonials</CardTitle><CardDescription className="mt-2">Review, edit, publish, or remove client testimonials.</CardDescription></div><Badge variant="outline" className="border-[#d7b55f] bg-[#fff8e5] text-[#8a6500]">{testimonials.length} total</Badge></div></CardHeader>
        <CardContent className="p-6">{loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading testimonials...</div> : <div className="space-y-4">{testimonials.map((item) => <div key={item.id} className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d7b55f] hover:shadow-md"><div className="relative h-24 w-24 overflow-hidden rounded-lg bg-muted"><Image src={item.image} alt={item.author} fill className="object-cover" sizes="96px" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.author}</h3><Badge variant={item.isPublished ? 'default' : 'outline'} className={item.isPublished ? 'bg-emerald-600 hover:bg-emerald-600' : ''}>{item.isPublished ? 'Published' : 'Draft'}</Badge></div><p className="text-sm text-muted-foreground line-clamp-2">{item.quote}</p><p className="mt-1 text-xs text-muted-foreground">{item.project} • order {item.sortOrder}</p></div><div className="flex flex-col gap-2"><Button size="sm" variant="outline" onClick={() => setForm(toForm(item))}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="destructive" onClick={() => deleteTestimonial(item.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}{testimonials.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-muted-foreground">No testimonials yet. Create one to populate the carousel.</div>}</div>}</CardContent>
      </Card>
    </div>
  )
}
