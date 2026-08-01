'use client'

import { useEffect, useMemo, useState } from 'react'
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
import type { WebsiteProject } from '@/lib/website-projects'

type ProjectForm = {
  id?: string
  title: string
  slug: string
  ownerName: string
  type: string
  sqft: string
  duration: string
  category: string
  location: string
  thumbnailUrl: string
  description: string
  details: string
  isPublished: boolean
  sortOrder: number
  images: string[]
}

const emptyForm: ProjectForm = {
  title: '',
  slug: '',
  ownerName: '',
  type: '',
  sqft: '',
  duration: '',
  category: 'residential',
  location: 'Dhaka, Bangladesh',
  thumbnailUrl: '',
  description: '',
  details: '',
  isPublished: true,
  sortOrder: 0,
  images: [],
}

function toForm(project: WebsiteProject): ProjectForm {
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    ownerName: project.ownerName ?? '',
    type: project.type ?? '',
    sqft: project.sqft ?? '',
    duration: project.duration ?? '',
    category: project.category,
    location: project.location ?? '',
    thumbnailUrl: project.bannerImage,
    description: project.description,
    details: project.details ?? '',
    isPublished: project.isPublished,
    sortOrder: project.sortOrder,
    images: project.images,
  }
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function WebsiteProjectManager() {
  const [projects, setProjects] = useState<WebsiteProject[]>([])
  const [form, setForm] = useState<ProjectForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const editing = Boolean(form.id)

  const imageCount = useMemo(() => form.images.filter(Boolean).length, [form.images])

  async function loadProjects() {
    setLoading(true)
    const response = await fetch('/api/website/projects?includeDrafts=true', { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Failed to load website projects')
    setProjects(payload.projects || [])
    setLoading(false)
  }

  useEffect(() => {
    loadProjects().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to load website projects')
      setLoading(false)
    })
  }, [])

  function updateField<K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      slug: key === 'title' && !current.id ? slugify(String(value)) : current.slug,
    }))
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setMessage(null)
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const blob = await uploadDirectBlobFile({
          file,
          context: 'website-project',
          ownerId: form.id || form.slug || slugify(form.title) || 'new-project',
        })
        uploaded.push(blob.url)
      }
      setForm((current) => ({
        ...current,
        thumbnailUrl: current.thumbnailUrl || uploaded[0] || '',
        images: [...current.images, ...uploaded],
      }))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function saveProject() {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(form.id ? `/api/website/projects/${form.id}` : '/api/website/projects', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to save project')
      setProjects(payload.projects || [])
      setForm(emptyForm)
      setMessage('Project saved. Published projects now control the website showcase.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this website project?')) return
    const response = await fetch(`/api/website/projects/${id}`, { method: 'DELETE' })
    const payload = await response.json()
    if (response.ok) setProjects(payload.projects || [])
    else setMessage(payload.error || 'Failed to delete project')
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
      <Card className="overflow-hidden border-[#eadfca] bg-white/95 shadow-xl shadow-slate-200/70">
        <CardHeader className="border-b border-[#efe5d2] bg-gradient-to-r from-[#fff9eb] to-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-[#17382d]">{editing ? 'Edit Website Project' : 'Create Website Project'}</CardTitle>
              <CardDescription className="mt-2">Manage portfolio projects, galleries, thumbnails, and public status.</CardDescription>
            </div>
            <Badge className="bg-[#17382d] text-white hover:bg-[#17382d]">{editing ? 'Editing' : 'New'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          {message && <p className="flex items-center gap-2 rounded-xl border border-[#eadfca] bg-[#fffaf0] px-3 py-2 text-sm text-[#7a5a00]"><CheckCircle2 className="h-4 w-4" /> {message}</p>}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Project name</Label>
              <Input value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Modern Apartment Interior" />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(event) => updateField('slug', slugify(event.target.value))} placeholder="modern-apartment-interior" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="renovation">Renovation</option>
                <option value="furniture">Furniture</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(event) => updateField('location', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Owner name</Label>
              <Input value={form.ownerName} onChange={(event) => updateField('ownerName', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Project type</Label>
              <Input value={form.type} onChange={(event) => updateField('type', event.target.value)} placeholder="Apartment / Office / Duplex" />
            </div>
            <div className="space-y-2">
              <Label>Area sqft</Label>
              <Input value={form.sqft} onChange={(event) => updateField('sqft', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input value={form.duration} onChange={(event) => updateField('duration', event.target.value)} placeholder="2 months" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Project description</Label>
            <Textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Project details</Label>
            <Textarea value={form.details} onChange={(event) => updateField('details', event.target.value)} rows={5} />
          </div>

          <div className="rounded-2xl border border-dashed border-[#d8c28b] bg-[#fffaf0] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Label>Project images</Label>
                <p className="text-xs text-muted-foreground">Upload one or multiple images to Vercel Blob. First upload becomes thumbnail unless changed.</p>
              </div>
              <Button type="button" variant="outline" disabled={uploading} asChild>
                <label className="cursor-pointer">
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload Images
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => uploadImages(event.target.files)} />
                </label>
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {form.images.map((url) => (
                <button key={url} type="button" onClick={() => updateField('thumbnailUrl', url)} className={`relative aspect-square overflow-hidden rounded-lg border ${form.thumbnailUrl === url ? 'ring-2 ring-[#a57c00]' : ''}`}>
                  <Image src={url} alt="Uploaded project" fill className="object-cover" sizes="160px" />
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{imageCount} image(s) selected. Thumbnail URL: {form.thumbnailUrl || 'none'}</p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <Label>Publish on website</Label>
              <p className="text-xs text-muted-foreground">Only published projects appear in the public showcase.</p>
            </div>
            <Switch checked={form.isPublished} onCheckedChange={(value) => updateField('isPublished', value)} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={saveProject} disabled={saving || uploading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {editing ? 'Update Project' : 'Create Project'}
            </Button>
            {editing && <Button variant="outline" onClick={() => setForm(emptyForm)}>Cancel Edit</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[#eadfca] bg-white/95 shadow-xl shadow-slate-200/70">
        <CardHeader className="border-b border-[#efe5d2] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-[#17382d]">Website Showcase Projects</CardTitle>
              <CardDescription className="mt-2">Review portfolio cards and choose what appears publicly.</CardDescription>
            </div>
            <Badge variant="outline" className="border-[#d7b55f] bg-[#fff8e5] text-[#8a6500]">{projects.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading projects...</div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d7b55f] hover:shadow-md">
                  <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-muted">
                    <Image src={project.bannerImage} alt={project.title} fill className="object-cover" sizes="96px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{project.title}</h3>
                      <Badge variant={project.isPublished ? 'default' : 'outline'} className={project.isPublished ? 'bg-emerald-600 hover:bg-emerald-600' : ''}>{project.isPublished ? 'Published' : 'Draft'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">/{project.slug} • {project.images.length} image(s)</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => setForm(toForm(project))}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteProject(project.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {projects.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-muted-foreground">No website projects yet. Create one to populate the public showcase.</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
