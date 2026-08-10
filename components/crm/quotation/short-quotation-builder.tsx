'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CopyCheck, Download, ExternalLink, GripVertical, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CollapsibleCard } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { searchShortQuotationNames } from '@/lib/short-quotation-names'
import { ShortQuotationDocument } from '@/components/crm/quotation/pdf/ShortQuotationDocument'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import { buildDefaultShortQuotationContent } from '@/lib/short-quotation-default'
import {
  buildShortQuotationSummary,
  normalizeShortLine,
  normalizeShortQuotationContent,
  todayShortQuotationDate,
} from '@/lib/short-quotation-calculations'
import { isShortQuotationContent } from '@/lib/quotation-document'
import { buildShortPreviewUrl, publishShortPreview } from '@/lib/short-quotation-preview-sync'
import {
  loadPlaygroundShortDraft,
  savePlaygroundShortDraft,
} from '@/lib/quotation-playground-storage'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  ShortQuotationContent,
  ShortQuotationLine,
  ShortQuotationPackage,
} from '@/lib/short-quotation-types'

type ShortQuotationBuilderProps = {
  leadId: string
  leadName: string
  leadLocation: string | null
  leadSubStatus: string | null
  mode?: 'lead' | 'playground'
}

type DraftPayload = {
  quotationType: string
  projectSqft: number | null
  content: ShortQuotationContent
  grandTotal: number
  status: 'DRAFT' | 'FINALIZED'
}

type DraftResponse = {
  draft: DraftPayload | null
  defaultDraft: DraftPayload | null
  documentType?: 'short' | 'detail'
  canEdit: boolean
}

const SHORT_QUOTATION_PACKAGES: ShortQuotationPackage[] = ['PLATINUM', 'PREMIUM', 'LUXURY']

function copyShortQuotationToPackage(
  content: ShortQuotationContent,
  packageTier: ShortQuotationPackage,
): ShortQuotationContent {
  return normalizeShortQuotationContent({
    ...content,
    packageTier,
    floors: content.floors.map((floor) => ({ ...floor })),
    rooms: content.rooms.map((room) => ({
      ...room,
      lines: room.lines.map((line) => ({ ...line })),
    })),
    footerNotes: [...content.footerNotes],
  })
}

function generateShortQuotationCode(packageTier: ShortQuotationPackage) {
  const now = new Date()
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  const timePart = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `SQ-${packageTier.slice(0, 3)}-${datePart}-${timePart}-${randomPart}`
}

function formatShortDownloadDateTime(value: string | undefined) {
  if (!value) return 'Not downloaded yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function findFirstShortQuotationIssue(content: ShortQuotationContent) {
  return content.rooms
    .flatMap((room) => room.lines.map((line) => ({ room, line })))
    .find(({ line }) => {
      if (line.isLumpSum) return line.total <= 0
      return (line.quantitySqft ?? 0) <= 0 || (line.unitPrice ?? 0) <= 0
    })
}

function scrollToQuotationIssue(elementId: string) {
  document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function ShortQuotationBuilder({
  leadId,
  leadName,
  leadLocation,
  leadSubStatus,
  mode = 'lead',
}: ShortQuotationBuilderProps) {
  const isPlayground = mode === 'playground'
  const previewContext = isPlayground ? 'playground' : 'lead'
  const previewContextId = isPlayground ? 'playground' : leadId
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingAllPackages, setSavingAllPackages] = useState(false)
  const [startingWork, setStartingWork] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [content, setContent] = useState<ShortQuotationContent | null>(null)
  const [selectedPackageTier, setSelectedPackageTier] = useState<ShortQuotationPackage>('PREMIUM')
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const reorderRoomLines = (roomId: string, event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    updateContent((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) => {
        if (room.id !== roomId) return room
        const oldIndex = room.lines.findIndex((line) => line.id === active.id)
        const newIndex = room.lines.findIndex((line) => line.id === over.id)
        if (oldIndex < 0 || newIndex < 0) return room
        return { ...room, lines: arrayMove(room.lines, oldIndex, newIndex) }
      }),
    }))
  }

  const loadDraft = useCallback(async () => {
    setLoading(true)
    try {
      if (isPlayground) {
        const stored = loadPlaygroundShortDraft(selectedPackageTier)
        if (stored) {
          setContent(stored)
        } else {
          setContent(
            buildDefaultShortQuotationContent({
              clientName: leadName,
              clientAddress: leadLocation,
              packageTier: selectedPackageTier,
            }),
          )
        }
        setCanEdit(true)
        return
      }

      const response = await fetch(
        `/api/lead/${leadId}/quotation-draft?documentType=short&packageTier=${selectedPackageTier}`,
        { cache: 'no-store' },
      )
      const payload = await response.json()
      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error ?? 'Failed to load quotation')
      }

      const data = payload.data as DraftResponse
      setCanEdit(Boolean(data.canEdit))

      const draftContent = data.draft?.content
      const defaultContent = data.defaultDraft?.content

      if (draftContent && isShortQuotationContent(draftContent)) {
        setContent(draftContent)
      } else if (defaultContent && isShortQuotationContent(defaultContent)) {
        setContent(defaultContent)
      } else {
        setContent(
          buildDefaultShortQuotationContent({
            clientName: leadName,
            clientAddress: leadLocation,
            packageTier: selectedPackageTier,
          }),
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load short quotation')
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [isPlayground, leadId, leadName, leadLocation, selectedPackageTier])

  useEffect(() => {
    void loadDraft()
  }, [loadDraft])

  const summary = useMemo(() => {
    if (!content) return null
    return buildShortQuotationSummary(content)
  }, [content])

  const updateContent = (updater: (prev: ShortQuotationContent) => ShortQuotationContent) => {
    setContent((prev) => (prev ? normalizeShortQuotationContent(updater(prev)) : prev))
  }

  useEffect(() => {
    if (!content) return
    const timer = window.setTimeout(() => {
      publishShortPreview({
        updatedAt: new Date().toISOString(),
        context: previewContext,
        contextId: previewContextId,
        content,
      })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [content, previewContext, previewContextId])

  // Autocomplete state for client name
  const [nameQuery, setNameQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    // initialize query from content
    setNameQuery(content?.clientName ?? '')
  }, [content?.clientName])

  useEffect(() => {
    if (!showSuggestions) return
    setSuggestions(searchShortQuotationNames(nameQuery, 10))
  }, [nameQuery, showSuggestions])

  const persistShortQuotationContent = useCallback(async (contentToSave: ShortQuotationContent) => {
    const response = await fetch(`/api/lead/${leadId}/quotation-draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType: 'short',
        quotationType: contentToSave.packageTier,
        content: contentToSave,
        status: 'DRAFT',
      }),
    })
    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error ?? 'Failed to save quotation')
    }
  }, [leadId])

  const saveDraft = useCallback(async (options?: { syncAllPackages?: boolean }) => {
    if (!content || !canEdit) return
    const normalized = normalizeShortQuotationContent(content)
    const firstMissingLine = findFirstShortQuotationIssue(normalized)
    if (firstMissingLine) {
      const issue = firstMissingLine.line.isLumpSum
        ? 'Package item total price is missing.'
        : (firstMissingLine.line.quantitySqft ?? 0) <= 0
          ? 'Qty/SFT is missing for this item.'
          : 'Unit price is missing for this item.'
      toast.error(issue)
      scrollToQuotationIssue(`short-line-${firstMissingLine.line.id}`)
      return
    }

    const syncAllPackages = Boolean(options?.syncAllPackages)
    if (syncAllPackages) {
      setSavingAllPackages(true)
    } else {
      setSaving(true)
    }

    try {
      if (isPlayground) {
        const packagesToSave = syncAllPackages ? SHORT_QUOTATION_PACKAGES : [normalized.packageTier]
        packagesToSave.forEach((packageTier) => savePlaygroundShortDraft(copyShortQuotationToPackage(normalized, packageTier)))
        setContent(normalized)
        toast.success(syncAllPackages ? 'Saved the same quotation to all packages' : 'Saved to browser (playground only)')
        return
      }

      const packagesToSave = syncAllPackages ? SHORT_QUOTATION_PACKAGES : [normalized.packageTier]
      for (const packageTier of packagesToSave) {
        const contentForPackage = copyShortQuotationToPackage(normalized, packageTier)
        await persistShortQuotationContent(contentForPackage)
      }
      setContent(normalized)
      toast.success(syncAllPackages ? 'Same quotation saved for Platinum, Premium, and Luxury' : 'Short quotation saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save quotation')
    } finally {
      setSaving(false)
      setSavingAllPackages(false)
    }
  }, [canEdit, content, isPlayground, persistShortQuotationContent])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (!saving && !savingAllPackages) void saveDraft()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saving, savingAllPackages, saveDraft])

  const startWork = async () => {
    setStartingWork(true)
    try {
      const response = await fetch(`/api/lead/${leadId}/quotation-work/start`, { method: 'POST' })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to start quotation work')
      }
      toast.success('Quotation work started')
      await loadDraft()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start quotation work')
    } finally {
      setStartingWork(false)
    }
  }

  const addFloor = () => {
    updateContent((prev) => ({
      ...prev,
      floors: [
        ...prev.floors,
        {
          id: crypto.randomUUID(),
          name: '',
          sortOrder: prev.floors.length + 1,
        },
      ],
    }))
  }

  const addRoom = (floorId: string) => {
    updateContent((prev) => {
      const roomsOnFloor = prev.rooms.filter((room) => room.floorId === floorId)
      return {
        ...prev,
        rooms: [
          ...prev.rooms,
          {
            id: crypto.randomUUID(),
            floorId,
            name: '',
            sortOrder: roomsOnFloor.length + 1,
            lines: [],
          },
        ],
      }
    })
  }

  const addSqftLine = (roomId: string) => {
    updateContent((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              lines: [
                ...room.lines,
                {
                  id: crypto.randomUUID(),
                  name: '',
                  quantitySqft: 0,
                  unitPrice: 0,
                  total: 0,
                  isLumpSum: false,
                },
              ],
            }
          : room,
      ),
    }))
  }

  const addLumpSumLine = (roomId: string) => {
    updateContent((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              lines: [
                ...room.lines,
                {
                  id: crypto.randomUUID(),
                  name: '',
                  quantitySqft: null,
                  unitPrice: null,
                  total: 0,
                  isLumpSum: true,
                },
              ],
            }
          : room,
      ),
    }))
  }

  const addFooterNote = () => {
    updateContent((prev) => ({
      ...prev,
      footerNotes: [...prev.footerNotes, ''],
    }))
  }

  const updateLine = (roomId: string, lineId: string, patch: Partial<ShortQuotationLine>) => {
    updateContent((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) => {
        if (room.id !== roomId) return room
        return {
          ...room,
          lines: room.lines.map((line) => {
            if (line.id !== lineId) return line
            return normalizeShortLine({ ...line, ...patch })
          }),
        }
      }),
    }))
  }

  const removeLine = (roomId: string, lineId: string) => {
    updateContent((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.id === roomId
          ? { ...room, lines: room.lines.filter((line) => line.id !== lineId) }
          : room,
      ),
    }))
  }

  const setPackageTier = (packageTier: ShortQuotationPackage) => {
    if (packageTier === selectedPackageTier) return
    setSelectedPackageTier(packageTier)
  }

  const canStartWork =
    !isPlayground &&
    (leadSubStatus === 'QUOTATION_ASSIGNED' || leadSubStatus === 'QUOTATION_CORRECTION')

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading short quotation...
        </CardContent>
      </Card>
    )
  }

  if (!content || !summary) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">
          {isPlayground
            ? 'Unable to load playground short quotation.'
            : 'Unable to load short quotation for this lead.'}
        </CardContent>
      </Card>
    )
  }

  const handleDownloadPdf = async () => {
    if (!content) return
    setGeneratingPdf(true)
    try {
      const downloadedAt = new Date().toISOString()
      const contentForDownload = normalizeShortQuotationContent({
        ...content,
        quotationCode: generateShortQuotationCode(content.packageTier),
        downloadedAt,
      })

      if (isPlayground) {
        savePlaygroundShortDraft(contentForDownload)
      } else if (canEdit) {
        await persistShortQuotationContent(contentForDownload)
      }

      setContent(contentForDownload)
      publishShortPreview({
        updatedAt: downloadedAt,
        context: previewContext,
        contextId: previewContextId,
        content: contentForDownload,
      })

      const safeClientName = (contentForDownload.clientName || 'Quotation').replace(/[^a-z0-9]/gi, '_').toLowerCase()
      await downloadPdfFromDocument(
        <ShortQuotationDocument content={contentForDownload} />,
        `Short_Quotation_${safeClientName}_${contentForDownload.quotationCode}.pdf`,
      )
      toast.success(`PDF downloaded with quotation code ${contentForDownload.quotationCode}`)
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const sortedFloors = [...content.floors].sort((a, b) => a.sortOrder - b.sortOrder)
  const taskbarFloorId = sortedFloors.at(-1)?.id ?? null
  const taskbarRoomId = taskbarFloorId
    ? content.rooms
        .filter((room) => room.floorId === taskbarFloorId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .at(-1)?.id ?? null
    : null
  const openLivePreviewTab = () => {
    if (content) {
      publishShortPreview({
        updatedAt: new Date().toISOString(),
        context: previewContext,
        contextId: previewContextId,
        content,
      })
    }
    void window.open(buildShortPreviewUrl({ context: previewContext, contextId: previewContextId }), '_blank', 'noopener,noreferrer')
  }
  const addTaskbarRoom = () => {
    if (!taskbarFloorId) {
      toast.error('Add a floor first')
      return
    }
    addRoom(taskbarFloorId)
  }
  const addTaskbarCustomItem = () => {
    if (!taskbarRoomId) {
      toast.error('Add a floor and room first')
      return
    }
    addSqftLine(taskbarRoomId)
  }
  const addTaskbarSavedItem = () => {
    if (!taskbarRoomId) {
      toast.error('Add a floor and room first')
      return
    }
    addLumpSumLine(taskbarRoomId)
  }

  return (
    <div className="space-y-5 pb-28 print:pb-0 short-quotation-root">
      <Card className="overflow-hidden border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-lg print:hidden">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-2xl text-amber-950">Short Quotation Studio</CardTitle>
              <p className="text-sm text-muted-foreground">
                Premium workspace for fast team editing — header, footer, rooms, prices, and totals stay organized.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{content.packageTier}</Badge>
              {isPlayground ? (
                <Badge variant="secondary">Playground</Badge>
              ) : (
                <Badge variant="secondary">{formatLabel(leadSubStatus)}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 border-t border-amber-100 bg-background p-5 text-foreground md:p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Package</p>
              <Select
                value={content.packageTier}
                disabled={!canEdit}
                onValueChange={(value) => setPackageTier(value as ShortQuotationPackage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLATINUM">Platinum</SelectItem>
                  <SelectItem value="PREMIUM">Premium</SelectItem>
                  <SelectItem value="LUXURY">Luxury</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Quotation Date</p>
              <Input
                value={content.quotationDate}
                disabled={!canEdit}
                placeholder={todayShortQuotationDate()}
                onChange={(event) =>
                  updateContent((prev) => ({ ...prev, quotationDate: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Grand Total</p>
              <p className="pt-2 text-lg font-semibold">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(summary.grandTotal)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-2 dark:border-slate-800 dark:bg-slate-950/30">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Last Quotation Code</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{content.quotationCode ?? 'Not downloaded yet'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Last Download Time</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{formatShortDownloadDateTime(content.downloadedAt)}</p>
            </div>
          </div>

          <CollapsibleCard title="Header details" defaultOpen={false} compact>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Client Name</p>
                <div className="relative">
                  <Input
                    value={nameQuery}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const v = event.target.value
                      setNameQuery(v)
                      updateContent((prev) => ({ ...prev, clientName: v }))
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Type to search or enter a custom name"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white shadow-sm">
                      {suggestions.map((s) => (
                        <div
                          key={s}
                          className="cursor-pointer px-3 py-2 text-sm hover:bg-neutral-100"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setNameQuery(s)
                            updateContent((prev) => ({ ...prev, clientName: s }))
                            setShowSuggestions(false)
                          }}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Address</p>
                <Input
                  value={content.clientAddress}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateContent((prev) => ({ ...prev, clientAddress: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Subject</p>
                <Input
                  value={content.subject}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateContent((prev) => ({ ...prev, subject: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Intro Letter</p>
                <Textarea
                  rows={4}
                  value={content.introLetter}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateContent((prev) => ({ ...prev, introLetter: event.target.value }))
                  }
                />
              </div>
            </div>
          </CollapsibleCard>

          <CollapsibleCard title="Footer notes" defaultOpen={false} compact>
            {content.footerNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No footer notes yet.</p>
            ) : (
              content.footerNotes.map((note, index) => (
                <div key={`footer-${index}`} className="flex gap-2">
                  <Input
                    value={note}
                    disabled={!canEdit}
                    onChange={(event) =>
                      updateContent((prev) => ({
                        ...prev,
                        footerNotes: prev.footerNotes.map((item, noteIndex) =>
                          noteIndex === index ? event.target.value : item,
                        ),
                      }))
                    }
                  />
                  {canEdit ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        updateContent((prev) => ({
                          ...prev,
                          footerNotes: prev.footerNotes.filter((_, noteIndex) => noteIndex !== index),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))
            )}
            {canEdit && (
              <Button type="button" size="sm" variant="outline" onClick={addFooterNote} className="mt-2">
                Add Note
              </Button>
            )}
          </CollapsibleCard>

          <div className="flex flex-wrap gap-2">
            {canStartWork ? (
              <Button type="button" disabled={startingWork} onClick={() => void startWork()}>
                {startingWork ? 'Starting...' : 'Start Work'}
              </Button>
            ) : null}
            <Button type="button" variant="outline" disabled={!canEdit} onClick={addFloor}>
              <Plus className="mr-2 h-4 w-4" />
              Add Floor
            </Button>
            <Button type="button" disabled={!canEdit || saving || savingAllPackages} onClick={() => void saveDraft()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save This Package'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canEdit || saving || savingAllPackages}
              onClick={() => void saveDraft({ syncAllPackages: true })}
              title="Copy the current quotation data into Platinum, Premium, and Luxury. Use normal save after editing one package differently."
            >
              <CopyCheck className="mr-2 h-4 w-4" />
              {savingAllPackages ? 'Saving all...' : 'Save Same to All Packages'}
            </Button>
            <Button type="button" variant="secondary" onClick={openLivePreviewTab}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Live Preview
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={generatingPdf}
              onClick={() => void handleDownloadPdf()}
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
            {!isPlayground ? (
              <Button type="button" variant="outline" asChild>
                <Link href="/quotation-team/my-work">Back to My Work</Link>
              </Button>
            ) : null}
          </div>

          {canEdit ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
              Use <span className="font-semibold">Save This Package</span> when Platinum, Premium, or Luxury needs separate row data. Use <span className="font-semibold">Save Same to All Packages</span> only when the current rows should be copied to every package.
            </p>
          ) : (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
              <p className="font-semibold">⚠ Read-only — your changes are NOT being saved.</p>
              <p className="mt-1 text-xs">
                {canStartWork
                  ? 'Click "Start Work" above to enable editing and saving.'
                  : 'Only an assigned quotation team member can edit this draft while it is in Working or Correction status.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="print:hidden space-y-4">
        {sortedFloors.map((floor) => {
          const floorRooms = content.rooms
            .filter((room) => room.floorId === floor.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
          const floorSummary = summary.floors.find((item) => item.floor.id === floor.id)

          return (
            <Card key={floor.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 py-3">
                <Input
                  className="max-w-sm font-semibold"
                  value={floor.name}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateContent((prev) => ({
                      ...prev,
                      floors: prev.floors.map((item) =>
                        item.id === floor.id ? { ...item, name: event.target.value } : item,
                      ),
                    }))
                  }
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Floor Total: {formatAmount(floorSummary?.total ?? 0)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canEdit}
                    onClick={() => addRoom(floor.id)}
                  >
                    Add Room
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {floorRooms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rooms in this floor yet.</p>
                ) : (
                  floorRooms.map((room) => {
                    const roomSummary = floorSummary?.rooms.find((item) => item.room.id === room.id)
                    return (
                      <div key={room.id} className="rounded-lg border p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Input
                            className="max-w-sm font-medium"
                            value={room.name}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateContent((prev) => ({
                                ...prev,
                                rooms: prev.rooms.map((item) =>
                                  item.id === room.id ? { ...item, name: event.target.value } : item,
                                ),
                              }))
                            }
                          />
                          <span className="text-sm font-medium">
                            Room Total: {formatAmount(roomSummary?.total ?? 0)}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-muted/40 text-left">
                              <tr>
                                {canEdit && <th className="w-6 px-1 py-2" />}
                                <th className="px-2 py-2">Name</th>
                                <th className="px-2 py-2">Qty Sft</th>
                                <th className="px-2 py-2">Unit Price</th>
                                <th className="px-2 py-2">Total</th>
                                <th className="px-2 py-2" />
                              </tr>
                            </thead>
                            <tbody>
                              <DndContext
                                sensors={dndSensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(event) => reorderRoomLines(room.id, event)}
                              >
                                <SortableContext
                                  items={room.lines.map((line) => line.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  {room.lines.map((line) => (
                                    <SortableShortRow
                                      key={line.id}
                                      line={line}
                                      roomId={room.id}
                                      canEdit={canEdit}
                                      updateLine={updateLine}
                                      removeLine={removeLine}
                                    />
                                  ))}
                                </SortableContext>
                              </DndContext>
                            </tbody>
                          </table>
                        </div>

                        {canEdit ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addSqftLine(room.id)}
                            >
                              Add Item (Qty × Unit Price)
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addLumpSumLine(room.id)}
                            >
                              Add Lump Sum Item
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>


      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 px-3 py-3 shadow-[0_-18px_45px_-28px_rgba(15,23,42,0.55)] backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={!canEdit} onClick={addFloor}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Floor
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!canEdit || !taskbarFloorId} onClick={addTaskbarRoom}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Room
          </Button>
          <Button type="button" size="sm" disabled={!canEdit || saving || savingAllPackages} onClick={() => void saveDraft()}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={openLivePreviewTab}>
            <ExternalLink className="mr-1.5 h-4 w-4" />
            Live Preview
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={generatingPdf} onClick={() => void handleDownloadPdf()}>
            {generatingPdf ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
          {!isPlayground ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/quotation-team/my-work">Back to My Work</Link>
            </Button>
          ) : null}
          {isPlayground ? (
            <>
              <Button type="button" size="sm" variant="secondary" disabled={!canEdit || !taskbarRoomId} onClick={addTaskbarSavedItem}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add from Saved Item
              </Button>
              <Button type="button" size="sm" variant="secondary" disabled={!canEdit || !taskbarRoomId} onClick={addTaskbarCustomItem}>
                Custom Item
              </Button>
            </>
          ) : null}
          <span className="text-xs text-muted-foreground">Ctrl+S saves</span>
        </div>
      </div>


      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .short-quotation-root,
          .short-quotation-root * {
            visibility: visible;
          }
          .short-quotation-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

type SortableShortRowProps = {
  line: ShortQuotationLine
  roomId: string
  canEdit: boolean
  updateLine: (roomId: string, lineId: string, patch: Partial<ShortQuotationLine>) => void
  removeLine: (roomId: string, lineId: string) => void
}

function SortableShortRow({
  line,
  roomId,
  canEdit,
  updateLine,
  removeLine,
}: SortableShortRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: line.id })

  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'hsl(var(--muted))' : undefined,
  }

  return (
    <tr id={`short-line-${line.id}`} ref={setNodeRef} style={rowStyle} className="border-t align-top scroll-mt-28">
      {canEdit && (
        <td className="px-1 py-2 text-muted-foreground">
          <button
            type="button"
            className="cursor-grab touch-none rounded p-1 hover:bg-muted active:cursor-grabbing"
            aria-label="Drag row"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td className="px-2 py-2">
        <Input
          value={line.name}
          disabled={!canEdit}
          onChange={(event) => updateLine(roomId, line.id, { name: event.target.value })}
        />
      </td>
      <td className="px-2 py-2">
        {line.isLumpSum ? (
          <span className="text-xs text-muted-foreground">Lump sum</span>
        ) : (
          <Input
            type="text"
            inputMode="decimal"
            disabled={!canEdit}
            value={line.quantitySqft ?? ''}
            onChange={(event) =>
              updateLine(roomId, line.id, {
                quantitySqft: Number(event.target.value.replace(/,/g, '')) || 0,
              })
            }
          />
        )}
      </td>
      <td className="px-2 py-2">
        {line.isLumpSum ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <Input
            type="text"
            inputMode="decimal"
            disabled={!canEdit}
            value={line.unitPrice ?? ''}
            onChange={(event) =>
              updateLine(roomId, line.id, {
                unitPrice: Number(event.target.value.replace(/,/g, '')) || 0,
              })
            }
          />
        )}
      </td>
      <td className="px-2 py-2">
        {line.isLumpSum ? (
          <Input
            type="text"
            inputMode="decimal"
            disabled={!canEdit}
            value={line.total}
            onChange={(event) =>
              updateLine(roomId, line.id, {
                total: Number(event.target.value.replace(/,/g, '')) || 0,
              })
            }
          />
        ) : (
          <span className="font-medium">{formatAmount(line.total)}</span>
        )}
      </td>
      <td className="px-2 py-2">
        {canEdit ? (
          <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(roomId, line.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </td>
    </tr>
  )
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

function formatLabel(value: string | null | undefined) {
  if (!value) return 'N/A'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
