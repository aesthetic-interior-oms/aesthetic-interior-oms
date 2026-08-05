'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Pencil, Plus, Star, Trash2, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { WebsiteVideo } from '@/lib/website-videos'

type VideoForm = { id?: string; title: string; url: string; thumbnailUrl: string; duration: string; isFeatured: boolean; isPublished: boolean; sortOrder: number }
const emptyForm: VideoForm = { title: '', url: '', thumbnailUrl: '', duration: '', isFeatured: false, isPublished: true, sortOrder: 0 }
function toForm(video: WebsiteVideo): VideoForm { return { id: video.id, title: video.title, url: video.url, thumbnailUrl: video.thumbnailUrl ?? '', duration: video.duration ?? '', isFeatured: video.isFeatured, isPublished: video.isPublished, sortOrder: video.sortOrder } }

export function WebsiteVideoManager() {
  const [videos, setVideos] = useState<WebsiteVideo[]>([])
  const [form, setForm] = useState<VideoForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const editing = Boolean(form.id)

  async function loadVideos() {
    setLoading(true)
    const response = await fetch('/api/website/videos?includeDrafts=true', { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Failed to load website videos')
    setVideos(payload.videos || [])
    setLoading(false)
  }

  useEffect(() => { loadVideos().catch((error) => { setMessage(error instanceof Error ? error.message : 'Failed to load website videos'); setLoading(false) }) }, [])
  function updateField<K extends keyof VideoForm>(key: K, value: VideoForm[K]) { setForm((current) => ({ ...current, [key]: value })) }

  async function saveVideo() {
    setSaving(true); setMessage(null)
    try {
      const response = await fetch(form.id ? `/api/website/videos/${form.id}` : '/api/website/videos', { method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to save website video')
      setVideos(payload.videos || []); setForm(emptyForm); setMessage('Video saved. Published videos now control the home page Visual Stories section.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Failed to save website video') } finally { setSaving(false) }
  }

  async function deleteVideo(id: string) {
    if (!confirm('Delete this website video?')) return
    const response = await fetch(`/api/website/videos/${id}`, { method: 'DELETE' })
    const payload = await response.json()
    if (response.ok) setVideos(payload.videos || [])
    else setMessage(payload.error || 'Failed to delete website video')
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
      <Card className="overflow-hidden border-[#eadfca] bg-white/95 shadow-xl shadow-slate-200/70">
        <CardHeader className="border-b border-[#efe5d2] bg-gradient-to-r from-[#fff9eb] to-white">
          <CardTitle className="text-xl text-[#17382d]">{editing ? 'Edit Home Page Video' : 'Create Home Page Video'}</CardTitle>
          <CardDescription>Paste YouTube, YouTube Shorts, Facebook, or Instagram video links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          {message && <p className="flex items-center gap-2 rounded-xl border border-[#eadfca] bg-[#fffaf0] px-3 py-2 text-sm text-[#7a5a00]"><CheckCircle2 className="h-4 w-4" /> {message}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Design tour" /></div>
            <div className="space-y-2"><Label>Video URL</Label><Input value={form.url} onChange={(e) => updateField('url', e.target.value)} placeholder="https://youtube.com/shorts/..." /></div>
            <div className="space-y-2"><Label>Duration label</Label><Input value={form.duration} onChange={(e) => updateField('duration', e.target.value)} placeholder="0:45" /></div>
            <div className="space-y-2"><Label>Sort order</Label><Input type="number" value={form.sortOrder} onChange={(e) => updateField('sortOrder', Number(e.target.value))} /></div>
          </div>
          <div className="space-y-2"><Label>Custom thumbnail URL (optional for Facebook/Instagram)</Label><Input value={form.thumbnailUrl} onChange={(e) => updateField('thumbnailUrl', e.target.value)} placeholder="https://..." /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border bg-slate-50 p-4"><div><Label>Featured banner</Label><p className="text-xs text-muted-foreground">Only one video can be featured.</p></div><Switch checked={form.isFeatured} onCheckedChange={(v) => updateField('isFeatured', v)} /></div>
            <div className="flex items-center justify-between rounded-2xl border bg-slate-50 p-4"><div><Label>Publish</Label><p className="text-xs text-muted-foreground">Draft videos stay hidden.</p></div><Switch checked={form.isPublished} onCheckedChange={(v) => updateField('isPublished', v)} /></div>
          </div>
          <div className="flex gap-3"><Button onClick={saveVideo} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}{editing ? 'Update Video' : 'Create Video'}</Button>{editing && <Button variant="outline" onClick={() => setForm(emptyForm)}>Cancel Edit</Button>}</div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-[#eadfca] bg-white/95 shadow-xl shadow-slate-200/70"><CardHeader><CardTitle className="text-xl text-[#17382d]">Home Page Videos</CardTitle><CardDescription>Review, edit, publish, feature, or remove visual stories.</CardDescription></CardHeader><CardContent className="p-6">{loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading videos...</div> : <div className="space-y-4">{videos.map((video) => <div key={video.id} className="flex gap-4 rounded-2xl border p-3"><div className="flex h-20 w-24 items-center justify-center rounded-lg bg-slate-100 text-[#17382d]"><Video className="h-6 w-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{video.title}</h3><Badge variant={video.isPublished ? 'default' : 'outline'}>{video.isPublished ? 'Published' : 'Draft'}</Badge>{video.isFeatured && <Badge className="bg-[#a57c00] hover:bg-[#a57c00]"><Star className="mr-1 h-3 w-3" /> Featured</Badge>}</div><p className="truncate text-sm text-muted-foreground">{video.url}</p><p className="text-xs uppercase tracking-wide text-muted-foreground">{video.provider}{video.duration ? ` · ${video.duration}` : ''}</p></div><div className="flex flex-col gap-2"><Button size="sm" variant="outline" onClick={() => setForm(toForm(video))}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="destructive" onClick={() => deleteVideo(video.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}{videos.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No videos yet. Create one to populate the home page section.</div>}</div>}</CardContent></Card>
    </div>
  )
}
