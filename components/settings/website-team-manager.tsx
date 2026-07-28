'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { uploadDirectBlobFile } from '@/lib/client-blob-upload'
import type { WebsiteTeamMember } from '@/lib/website-team'

type TeamForm = Omit<WebsiteTeamMember, 'id'> & { id?: string }

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
  return { ...member }
}

export function WebsiteTeamManager() {
  const [members, setMembers] = useState<WebsiteTeamMember[]>([])
  const [form, setForm] = useState<TeamForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const editing = Boolean(form.id)

  async function loadMembers() {
    setLoading(true)
    const response = await fetch('/api/website/team?includeDrafts=true', { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Failed to load website team members')
    setMembers(payload.members || [])
    setLoading(false)
  }

  useEffect(() => {
    loadMembers().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to load website team members')
      setLoading(false)
    })
  }, [])

  function updateField<K extends keyof TeamForm>(key: K, value: TeamForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function uploadImage(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const blob = await uploadDirectBlobFile({
        file,
        context: 'website-team',
        ownerId: form.id || form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'new-member',
      })
      updateField('image', blob.url)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function saveMember() {
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
      setMembers(payload.members || [])
      setForm(emptyForm)
      setMessage('Team member saved. Published members now control the Our Team section.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save team member')
    } finally {
      setSaving(false)
    }
  }

  async function deleteMember(id: string) {
    if (!confirm('Delete this team member from the website?')) return
    const response = await fetch(`/api/website/team/${id}`, { method: 'DELETE' })
    const payload = await response.json()
    if (response.ok) setMembers(payload.members || [])
    else setMessage(payload.error || 'Failed to delete team member')
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader><CardTitle>{editing ? 'Edit Team Member' : 'Create Team Member'}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {message && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => updateField('name', e.target.value)} /></div>
            <div className="space-y-2"><Label>Role</Label><Input value={form.role} onChange={(e) => updateField('role', e.target.value)} /></div>
            <div className="space-y-2"><Label>Department / specialty</Label><Input value={form.specialty} onChange={(e) => updateField('specialty', e.target.value)} /></div>
            <div className="space-y-2"><Label>Sort order</Label><Input type="number" value={form.sortOrder} onChange={(e) => updateField('sortOrder', Number(e.target.value))} /></div>
          </div>
          <div className="space-y-2"><Label>Quote</Label><Textarea value={form.quote} onChange={(e) => updateField('quote', e.target.value)} rows={3} /></div>
          <div className="rounded-xl border border-dashed p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><Label>Portrait image</Label><p className="text-xs text-muted-foreground">Upload a portrait or paste an existing image URL/path.</p></div>
              <Button type="button" variant="outline" disabled={uploading} asChild>
                <label className="cursor-pointer">{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Upload Image<input type="file" accept="image/*" className="hidden" onChange={(event) => uploadImage(event.target.files)} /></label>
              </Button>
            </div>
            <Input value={form.image} onChange={(e) => updateField('image', e.target.value)} placeholder="/user/User1.jpg or uploaded URL" />
            {form.image && <div className="relative h-36 w-28 overflow-hidden rounded-lg bg-muted"><Image src={form.image} alt={form.name || 'Team member'} fill className="object-cover" sizes="112px" /></div>}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3"><div><Label>Publish on website</Label><p className="text-xs text-muted-foreground">Only published members appear on the public About page.</p></div><Switch checked={form.isPublished} onCheckedChange={(value) => updateField('isPublished', value)} /></div>
          <div className="flex flex-wrap gap-3"><Button onClick={saveMember} disabled={saving || uploading}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}{editing ? 'Update Member' : 'Create Member'}</Button>{editing && <Button variant="outline" onClick={() => setForm(emptyForm)}>Cancel Edit</Button>}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Our Team Members</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading team...</div> : (
            <div className="space-y-4">
              {members.map((member) => <div key={member.id} className="flex gap-4 rounded-xl border p-3"><div className="relative h-24 w-20 overflow-hidden rounded-lg bg-muted"><Image src={member.image} alt={member.name} fill className="object-cover" sizes="80px" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{member.name}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{member.isPublished ? 'Published' : 'Draft'}</span></div><p className="text-sm text-muted-foreground">{member.role} in {member.specialty}</p><p className="text-sm text-muted-foreground line-clamp-2">{member.quote}</p><p className="mt-1 text-xs text-muted-foreground">Sort order: {member.sortOrder}</p></div><div className="flex flex-col gap-2"><Button size="sm" variant="outline" onClick={() => setForm(toForm(member))}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="destructive" onClick={() => deleteMember(member.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}
              {members.length === 0 && <p className="text-sm text-muted-foreground">No team members yet. Create one to populate the public Our Team section.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
