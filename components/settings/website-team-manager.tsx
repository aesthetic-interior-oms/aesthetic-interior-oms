'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { uploadDirectBlobFile } from '@/lib/client-blob-upload'
import type { WebsiteTeamMember } from '@/lib/website-team'

type TeamForm = {
  id?: string
  name: string
  role: string
  image: string
  specialty: string
  quote: string
  isPublished: boolean
  sortOrder: number
}

const emptyForm: TeamForm = {
  name: '',
  role: '',
  image: '',
  specialty: '',
  quote: '',
  isPublished: true,
  sortOrder: 0,
}

function toForm(member: WebsiteTeamMember): TeamForm {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    image: member.image,
    specialty: member.specialty ?? '',
    quote: member.quote ?? '',
    isPublished: member.isPublished,
    sortOrder: member.sortOrder,
  }
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function WebsiteTeamManager() {
  const [teamMembers, setTeamMembers] = useState<WebsiteTeamMember[]>([])
  const [form, setForm] = useState<TeamForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const editing = Boolean(form.id)

  async function loadTeamMembers() {
    setLoading(true)
    const response = await fetch('/api/website/team?includeDrafts=true', { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Failed to load website team members')
    setTeamMembers(payload.teamMembers || [])
    setLoading(false)
  }

  useEffect(() => {
    loadTeamMembers().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to load website team members')
      setLoading(false)
    })
  }, [])

  function updateField<K extends keyof TeamForm>(key: K, value: TeamForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function uploadImage(file: File | null) {
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const blob = await uploadDirectBlobFile({
        file,
        context: 'website-team',
        ownerId: form.id || slugify(form.name) || 'new-member',
      })
      updateField('image', blob.url)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function saveTeamMember() {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(form.id ? `/api/website/team/${form.id}` : '/api/website/team', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to save team member')
      setTeamMembers(payload.teamMembers || [])
      setForm(emptyForm)
      setMessage('Team member saved. Published members now control the About page team section.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save team member')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTeamMember(id: string) {
    if (!confirm('Delete this website team member?')) return
    const response = await fetch(`/api/website/team/${id}`, { method: 'DELETE' })
    const payload = await response.json()
    if (response.ok) setTeamMembers(payload.teamMembers || [])
    else setMessage(payload.error || 'Failed to delete team member')
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
      <Card className="overflow-hidden border-[#eadfca] bg-white/95 shadow-xl shadow-slate-200/70">
        <CardHeader className="border-b border-[#efe5d2] bg-gradient-to-r from-[#fff9eb] to-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-[#17382d]">{editing ? 'Edit Website Team Member' : 'Create Website Team Member'}</CardTitle>
              <CardDescription className="mt-2">Manage the experts shown in the About page team section.</CardDescription>
            </div>
            <Badge className="bg-[#17382d] text-white hover:bg-[#17382d]">{editing ? 'Editing' : 'New'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          {message && <p className="flex items-center gap-2 rounded-xl border border-[#eadfca] bg-[#fffaf0] px-3 py-2 text-sm text-[#7a5a00]"><CheckCircle2 className="h-4 w-4" /> {message}</p>}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Team member name" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={form.role} onChange={(event) => updateField('role', event.target.value)} placeholder="Senior Architect" />
            </div>
            <div className="space-y-2">
              <Label>Department / specialty</Label>
              <Input value={form.specialty} onChange={(event) => updateField('specialty', event.target.value)} placeholder="Architect Department" />
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input type="number" value={form.sortOrder} onChange={(event) => updateField('sortOrder', Number(event.target.value))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quote</Label>
            <Textarea value={form.quote} onChange={(event) => updateField('quote', event.target.value)} rows={4} />
          </div>

          <div className="rounded-2xl border border-dashed border-[#d8c28b] bg-[#fffaf0] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Label>Profile image</Label>
                <p className="text-xs text-muted-foreground">Upload the team member image to Vercel Blob.</p>
              </div>
              <Button type="button" variant="outline" disabled={uploading} asChild>
                <label className="cursor-pointer">
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadImage(event.target.files?.[0] ?? null)} />
                </label>
              </Button>
            </div>
            {form.image && (
              <div className="mt-4 flex items-center gap-3">
                <div className="relative h-24 w-20 overflow-hidden rounded-lg bg-muted">
                  <Image src={form.image} alt={form.name || 'Team member'} fill className="object-cover" sizes="80px" />
                </div>
                <Input value={form.image} onChange={(event) => updateField('image', event.target.value)} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <Label>Publish on website</Label>
              <p className="text-xs text-muted-foreground">Only published team members appear on the About page.</p>
            </div>
            <Switch checked={form.isPublished} onCheckedChange={(value) => updateField('isPublished', value)} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={saveTeamMember} disabled={saving || uploading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {editing ? 'Update Team Member' : 'Create Team Member'}
            </Button>
            {editing && <Button variant="outline" onClick={() => setForm(emptyForm)}>Cancel Edit</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[#eadfca] bg-white/95 shadow-xl shadow-slate-200/70">
        <CardHeader className="border-b border-[#efe5d2] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-[#17382d]">Website Team Members</CardTitle>
              <CardDescription className="mt-2">Review, edit, publish, or remove public team profiles.</CardDescription>
            </div>
            <Badge variant="outline" className="border-[#d7b55f] bg-[#fff8e5] text-[#8a6500]">{teamMembers.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading team members...</div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d7b55f] hover:shadow-md">
                  <div className="relative h-24 w-20 overflow-hidden rounded-lg bg-muted">
                    <Image src={member.image} alt={member.name} fill className="object-cover" sizes="80px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{member.name}</h3>
                      <Badge variant={member.isPublished ? 'default' : 'outline'} className={member.isPublished ? 'bg-emerald-600 hover:bg-emerald-600' : ''}>{member.isPublished ? 'Published' : 'Draft'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.role}{member.specialty ? ` in ${member.specialty}` : ''}</p>
                    {member.quote && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{member.quote}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => setForm(toForm(member))}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteTeamMember(member.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {teamMembers.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-muted-foreground">No website team members yet. Create one to populate the About page.</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
