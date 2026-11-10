'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Wrench,
  MapPin,
  RefreshCw,
  Loader2,
  PlusCircle,
  Upload,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

type Project = { id: string; name: string; location: string | null }

type WorkLog = {
  id: string
  itemsSummary: string
  challanNo: string | null
  notes: string | null
  slipUrl: string | null
  deliveryDate: string
  lead: { id: string; name: string; location: string | null; phone: string | null }
}

export default function ElectricianSiteWorkPage() {
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  // Form state
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [workSummary, setWorkSummary] = useState('')
  const [workRef, setWorkRef] = useState('')
  const [notes, setNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      const [logsRes, projRes] = await Promise.all([
        fetch('/api/electrician/site-work'),
        fetch('/api/electrician/projects'),
      ])
      const [logsJson, projJson] = await Promise.all([logsRes.json(), projRes.json()])
      if (logsJson.success) {
        // Filter out material delivery logs (they have vendorName != 'ELECTRICAL_WORK')
        const electricalLogs = (logsJson.data.logs || []).filter(
          (l: WorkLog & { vendorName?: string }) => l.vendorName === 'ELECTRICAL_WORK' || !l.challanNo?.startsWith('BILL-')
        )
        setLogs(electricalLogs)
      }
      if (projJson.success) setProjects(projJson.data.projects || [])
    } catch {
      toast.error('Failed to load site work data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('context', 'electrician-site-work')
      const res = await fetch('/api/gcs/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.fileUrl) {
        setPhotoUrl(json.fileUrl)
        toast.success('Photo uploaded')
      } else {
        toast.error('Upload succeeded but no URL returned')
      }
    } catch {
      toast.error('Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const resetForm = () => {
    setSelectedLeadId('')
    setWorkSummary('')
    setWorkRef('')
    setNotes('')
    setPhotoUrl('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadId) return toast.error('Please select a project site')
    if (!workSummary.trim()) return toast.error('Please describe the work done')

    setSubmitting(true)
    try {
      const res = await fetch('/api/electrician/site-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          workSummary: workSummary.trim(),
          workRef: workRef.trim() || null,
          notes: notes.trim() || null,
          photoUrl: photoUrl || null,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to log work')
      toast.success('Site work logged successfully!')
      setModalOpen(false)
      resetForm()
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/electrician/dashboard" className="hover:text-foreground">Electrician</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Site Work Log</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wrench className="w-7 h-7 text-blue-500 shrink-0" />
            Site Work Log
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Log electrical work completed on site</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing} className="text-xs gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)} className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            <PlusCircle className="w-4 h-4" />
            Log Work
          </Button>
        </div>
      </div>

      {/* Work Logs */}
      {loading ? (
        <div className="flex justify-center items-center p-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading work logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="p-16 text-center space-y-3 border rounded-xl bg-card">
          <Wrench className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-semibold">No site work logged yet</h3>
          <p className="text-xs text-muted-foreground">Record electrical work you complete on each site</p>
          <Button size="sm" onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
            <PlusCircle className="w-3.5 h-3.5" />
            Log Your First Entry
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="border-border hover:shadow-sm transition">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{log.itemsSummary}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{log.lead.name}{log.lead.location ? ` · ${log.lead.location}` : ''}</span>
                      </div>
                      {log.challanNo && (
                        <div className="text-xs text-muted-foreground mt-0.5">Ref: <span className="font-mono">{log.challanNo}</span></div>
                      )}
                      {log.notes && <div className="text-xs text-muted-foreground/70 italic mt-0.5">{log.notes}</div>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-xs text-muted-foreground">{new Date(log.deliveryDate).toLocaleDateString()}</div>
                    {log.slipUrl && (
                      <button
                        onClick={() => setPreviewUrl(log.slipUrl)}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View Photo
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Log Work Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) resetForm(); setModalOpen(open) }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-500" />
              Log Electrical Site Work
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record the electrical work you completed on a project site today.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Project Site *</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select project site" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}{p.location ? ` — ${p.location}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Work Done *</Label>
              <Textarea
                placeholder="e.g. Completed wiring for 2nd floor bedrooms (3 rooms), installed 12 electrical points, tested all circuits"
                value={workSummary}
                onChange={(e) => setWorkSummary(e.target.value)}
                className="text-xs resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Work Reference / ID</Label>
                <Input
                  placeholder="e.g. WO-2024-001"
                  value={workRef}
                  onChange={(e) => setWorkRef(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Site Photo</Label>
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-md cursor-pointer text-xs hover:bg-muted/40 w-full truncate border-dashed">
                  {uploadingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className="truncate">{photoUrl ? 'Photo Uploaded ✓' : 'Upload photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input
                placeholder="e.g. Some conduit pipes need replacement, mentioned to supervisor"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { resetForm(); setModalOpen(false) }} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting || uploadingPhoto} className="bg-blue-600 hover:bg-blue-700 text-white">
                {submitting ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...</>
                ) : (
                  'Save Work Log'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Photo Preview */}
      <Dialog open={Boolean(previewUrl)} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-[600px] p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Site Work Photo</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg overflow-hidden border bg-muted/20 flex items-center justify-center min-h-[300px] max-h-[70vh]">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Site work" className="max-h-[68vh] w-auto object-contain mx-auto" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
