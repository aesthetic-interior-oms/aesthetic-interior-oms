'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  Plus,
  Trash2,
  Download,
  FileText,
  History,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  CAD_SUBMISSION_FILE_TYPE_OPTIONS,
  type CadSubmissionFileTypeValue,
  formatCadSubmissionFileType,
} from '@/lib/cad-work'
import { uploadDirectGCSFile, type UploadedGCSFileMeta } from '@/lib/client-gcs-upload'
import { DIRECT_BLOB_UPLOAD_LIMIT_MESSAGE, DIRECT_BLOB_UPLOAD_MAX_BYTES, formatBytesToMbLabel } from '@/lib/upload-limits'
import { getSmartDownloadUrl } from '@/lib/download-utils'

export type CadSubmissionRow = {
  id: string
  cadFileType: CadSubmissionFileTypeValue
  file: File | null
}

export function createCadSubmissionRow(
  initialType: CadSubmissionFileTypeValue = 'FLOOR_PLAN',
): CadSubmissionRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cadFileType: initialType,
    file: null,
  }
}

type SubmissionFileRecord = {
  id: string
  fileName: string
  fileType: string
  url: string
  sizeBytes: number | null
  cadFileType: string
  createdAt: string
}

type SubmissionRecord = {
  id: string
  note: string | null
  versionNumber: number
  versionName: string | null
  submittedAt: string
  submittedBy: {
    id: string
    fullName: string
    email: string
  }
  files: SubmissionFileRecord[]
}

type CadWorkDataResponse = {
  success: boolean
  data?: {
    lead: {
      id: string
      name: string
      stage: string
      subStatus: string | null
      projectSqft: number | null
    }
    submissions: SubmissionRecord[]
    nextVersionNumber: number
    completeResubmissionEnabled: boolean
    canSubmit: boolean
    isStageLocked: boolean
    currentUserId: string
  }
  error?: string
}

function formatFileSize(sizeBytes: number | null): string {
  if (!sizeBytes || sizeBytes <= 0) return 'Unknown size'
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatSubmittedDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function CadSubmissionDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  onSubmitted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string | null
  leadName?: string
  onSubmitted?: () => void
}) {
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload')
  const [loadingData, setLoadingData] = useState(false)
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([])
  const [nextVersionNumber, setNextVersionNumber] = useState(1)
  const [canSubmit, setCanSubmit] = useState(true)
  const [isStageLocked, setIsStageLocked] = useState(false)
  const [completeResubmissionEnabled, setCompleteResubmissionEnabled] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [versionTitle, setVersionTitle] = useState('')
  const [submissionProjectSqft, setSubmissionProjectSqft] = useState('')
  const [submissionNote, setSubmissionNote] = useState('')
  const [submissionRows, setSubmissionRows] = useState<CadSubmissionRow[]>([createCadSubmissionRow()])
  const [submittingWork, setSubmittingWork] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)

  const loadCadWorkData = useCallback(async () => {
    if (!leadId) return
    setLoadingData(true)
    try {
      const res = await fetch(`/api/lead/${leadId}/cad-work`, { cache: 'no-store' })
      const payload = (await res.json()) as CadWorkDataResponse
      if (!res.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to load CAD work data')
      }

      setSubmissions(payload.data.submissions ?? [])
      setNextVersionNumber(payload.data.nextVersionNumber ?? 1)
      setCanSubmit(payload.data.canSubmit)
      setIsStageLocked(payload.data.isStageLocked)
      setCompleteResubmissionEnabled(payload.data.completeResubmissionEnabled)
      setCurrentUserId(payload.data.currentUserId)

      if (payload.data.lead.projectSqft) {
        setSubmissionProjectSqft(String(payload.data.lead.projectSqft))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingData(false)
    }
  }, [leadId])

  useEffect(() => {
    if (open && leadId) {
      void loadCadWorkData()
      setActiveTab('upload')
      setVersionTitle('')
      setSubmissionNote('')
      setSubmissionRows([createCadSubmissionRow()])
    }
  }, [open, leadId, loadCadWorkData])

  const addSubmissionRow = () => {
    setSubmissionRows((prev) => [...prev, createCadSubmissionRow()])
  }

  const removeSubmissionRow = (id: string) => {
    setSubmissionRows((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((row) => row.id !== id)
    })
  }

  const updateSubmissionType = (id: string, type: CadSubmissionFileTypeValue) => {
    setSubmissionRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, cadFileType: type } : row)),
    )
  }

  const updateSubmissionFile = (id: string, file: File | null) => {
    setSubmissionRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, file } : row)),
    )
  }

  const totalFilesCount = useMemo(() => {
    return submissions.reduce((acc, sub) => acc + (sub.files?.length || 0), 0)
  }, [submissions])

  const versionPreviewLabel = useMemo(() => {
    const prefix = `V${nextVersionNumber}`
    if (!versionTitle.trim()) return prefix
    return `${prefix} - ${versionTitle.trim()}`
  }, [nextVersionNumber, versionTitle])

  const handleSubmit = async () => {
    if (!leadId) return

    const normalizedSqft = Number(submissionProjectSqft.replace(/,/g, '').trim())
    if (!Number.isFinite(normalizedSqft) || normalizedSqft <= 0) {
      toast.error('Please enter a valid project sqft before submitting work')
      return
    }

    const rowsWithFiles = submissionRows.filter((row) => Boolean(row.file))
    const oversizeRow = rowsWithFiles.find((row) => row.file && row.file.size > DIRECT_BLOB_UPLOAD_MAX_BYTES)
    if (oversizeRow?.file) {
      toast.error(
        `"${oversizeRow.file.name}" is ${formatBytesToMbLabel(oversizeRow.file.size)}. Direct browser upload supports up to ${formatBytesToMbLabel(DIRECT_BLOB_UPLOAD_MAX_BYTES)} per file.`,
      )
      return
    }

    try {
      setSubmittingWork(true)
      const uploadedFiles: Array<UploadedGCSFileMeta & { cadFileType: CadSubmissionFileTypeValue }> = []

      for (const row of rowsWithFiles) {
        if (!row.file) continue
        const uploaded = await uploadDirectGCSFile({
          file: row.file,
          context: 'cad-work',
          ownerId: leadId,
        })
        uploadedFiles.push({ ...uploaded, cadFileType: row.cadFileType })
      }

      const response = await fetch(`/api/lead/${leadId}/cad-work/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: submissionNote.trim() || null,
          projectSqft: normalizedSqft,
          versionName: versionTitle.trim() || null,
          files: uploadedFiles,
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error ?? `Failed to submit CAD work (HTTP ${response.status})`)
      }

      toast.success(payload.message ?? 'CAD work submitted successfully')
      onOpenChange(false)
      onSubmitted?.()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit CAD work')
    } finally {
      setSubmittingWork(false)
    }
  }

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${fileName}"? This will remove it from the submission, lead attachments, and cloud storage.`)
    if (!confirmed) return

    try {
      setDeletingFileId(fileId)
      const res = await fetch(`/api/cad-work/submission-files/${fileId}`, {
        method: 'DELETE',
      })
      const payload = await res.json()
      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to delete file')
      }

      toast.success(payload.message ?? 'File deleted successfully')
      // Update local submissions state immediately
      setSubmissions((prev) =>
        prev.map((sub) => ({
          ...sub,
          files: sub.files.filter((f) => f.id !== fileId),
        })),
      )
      onSubmitted?.()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete file')
    } finally {
      setDeletingFileId(null)
    }
  }

  const isResubmission = submissions.length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submittingWork) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                {isResubmission ? `Resubmit CAD Work • ${leadName || 'Lead'}` : `Submit CAD Work • ${leadName || 'Lead'}`}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isResubmission
                  ? `Upload new revisions (creates ${versionPreviewLabel}) or manage previously submitted files.`
                  : 'Upload completed 2D/3D layout files, set project sqft, and submit for review.'}
              </DialogDescription>
            </div>
            {isResubmission ? (
              <Badge variant="outline" className="shrink-0 text-xs font-semibold px-2.5 py-1">
                Current: V{submissions.length}
              </Badge>
            ) : null}
          </div>

          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {isResubmission ? 'Upload New Revision' : 'New Submission'}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Versions & Uploaded Files ({submissions.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingData ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading submission details...</p>
            </div>
          ) : (
            <>
              {activeTab === 'upload' && (
                <div className="space-y-5">
                  {!canSubmit && (
                    <div className="rounded-lg border border-amber-300/80 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Resubmission is currently locked</p>
                        <p className="text-xs mt-1 leading-relaxed">
                          This lead has advanced to Quotation or later stages. To upload updated files for this stage,
                          ask your Jr Architect Leader or Admin to enable <strong>Complete Resubmission</strong> in Settings.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Version Name / Tag Card */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="versionTitle" className="text-sm font-semibold">
                        Version Name / Remark (Optional)
                      </Label>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        Target: {versionPreviewLabel}
                      </Badge>
                    </div>
                    <Input
                      id="versionTitle"
                      placeholder="e.g. Revised living room layout & electrical plan"
                      value={versionTitle}
                      onChange={(e) => setVersionTitle(e.target.value)}
                      disabled={submittingWork || !canSubmit}
                    />
                    <p className="text-xs text-muted-foreground">
                      Each upload automatically generates a new version so the senior CRM and design team can track revisions.
                    </p>
                  </div>

                  {/* Project Sqft Field */}
                  <div className="space-y-1.5">
                    <Label htmlFor="projectSqft">
                      Project SQFT <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="projectSqft"
                      type="number"
                      min="1"
                      step="any"
                      placeholder="e.g. 1850"
                      value={submissionProjectSqft}
                      onChange={(e) => setSubmissionProjectSqft(e.target.value)}
                      disabled={submittingWork || !canSubmit}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lead project size in square feet (auto-synced with latest site visit).
                    </p>
                  </div>

                  {/* File Upload Rows */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Upload Files</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSubmissionRow}
                        disabled={submittingWork || !canSubmit}
                        className="gap-1.5 h-8 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add File Row
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {submissionRows.map((row, index) => (
                        <div
                          key={row.id}
                          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-lg border border-border bg-card"
                        >
                          <div className="w-full sm:w-48 shrink-0">
                            <Select
                              value={row.cadFileType}
                              onValueChange={(val) => updateSubmissionType(row.id, val as CadSubmissionFileTypeValue)}
                              disabled={submittingWork || !canSubmit}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="File Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {CAD_SUBMISSION_FILE_TYPE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex-1 min-w-0">
                            <Input
                              type="file"
                              accept=".pdf,.ppt,.pptx,.dwg,.dxf,image/*"
                              className="h-9 text-xs file:text-xs cursor-pointer"
                              onChange={(e) => updateSubmissionFile(row.id, e.target.files?.[0] ?? null)}
                              disabled={submittingWork || !canSubmit}
                            />
                          </div>

                          {submissionRows.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeSubmissionRow(row.id)}
                              disabled={submittingWork || !canSubmit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Supported formats: PDF, PPT, PPTX, DWG, DXF, images. {DIRECT_BLOB_UPLOAD_LIMIT_MESSAGE}
                    </p>
                  </div>

                  {/* Note Field */}
                  <div className="space-y-1.5">
                    <Label htmlFor="submissionNote">Notes / Handoff Summary (Optional)</Label>
                    <Textarea
                      id="submissionNote"
                      rows={3}
                      placeholder="Add any specific context or client changes made in this version..."
                      value={submissionNote}
                      onChange={(e) => setSubmissionNote(e.target.value)}
                      disabled={submittingWork || !canSubmit}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  {submissions.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No previous submissions yet.</p>
                      <p className="text-xs mt-1">Upload files in the first tab to create Version 1.</p>
                    </div>
                  ) : (
                    submissions.map((sub, index) => (
                      <div
                        key={sub.id}
                        className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200">
                              {sub.versionName || `Version ${sub.versionNumber || submissions.length - index}`}
                            </Badge>
                            {index === 0 ? (
                              <Badge variant="secondary" className="text-[10px]">
                                Latest Version
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>By: <strong>{sub.submittedBy?.fullName || 'Architect'}</strong></span>
                            <span>•</span>
                            <span>{formatSubmittedDate(sub.submittedAt)}</span>
                          </div>
                        </div>

                        {sub.note && (
                          <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md">
                            <strong className="text-foreground">Note:</strong> {sub.note}
                          </div>
                        )}

                        <div className="space-y-2 pt-1">
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Attached Files ({sub.files?.length || 0})
                          </p>

                          {(!sub.files || sub.files.length === 0) ? (
                            <p className="text-xs text-muted-foreground italic">No files in this version record.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {sub.files.map((file) => {
                                const canDeleteFile =
                                  file.id &&
                                  (currentUserId === sub.submittedBy?.id || !currentUserId)
                                return (
                                  <div
                                    key={file.id}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2.5 hover:border-primary/40 transition"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <FileText className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-foreground" title={file.fileName}>
                                          {file.fileName}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {formatCadSubmissionFileType(file.cadFileType)} • {formatFileSize(file.sizeBytes)}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <a
                                        href={getSmartDownloadUrl(file.url, file.fileName)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-muted text-foreground transition"
                                        title="Download file"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </a>

                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        disabled={deletingFileId === file.id}
                                        onClick={() => handleDeleteFile(file.id, file.fileName)}
                                        title="Delete file"
                                      >
                                        {deletingFileId === file.id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-card flex flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={submittingWork}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          {activeTab === 'upload' && (
            <Button
              type="button"
              disabled={submittingWork || !canSubmit || !submissionProjectSqft.trim()}
              onClick={handleSubmit}
              className="gap-2"
            >
              {submittingWork ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : isResubmission ? (
                <>
                  <Upload className="h-4 w-4" />
                  Submit {versionPreviewLabel}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Submit CAD Work
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
