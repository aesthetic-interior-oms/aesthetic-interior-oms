'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Loader2, Plus, Printer, Save, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CollapsibleCard } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isPackageLine } from '@/lib/detail-quotation-format'
import { QuotationItemPicker } from '@/components/crm/quotation/quotation-item-picker'
import { applyQuotationTypeToContent } from '@/lib/quotation-templates'
import { formatTemplatePriceHint } from '@/lib/quotation-templates/helpers'
import {
  calculateLineAmount,
  calculateQuotationTotals,
  normalizeQuotationContent,
} from '@/lib/quotation-calculations'
import {
  loadPlaygroundDetailDraft,
  savePlaygroundDetailDraft,
} from '@/lib/quotation-playground-storage'
import {
  buildDetailPreviewUrl,
  publishDetailPreview,
} from '@/lib/detail-quotation-preview-sync'
import { withDetailQuotationDefaults } from '@/lib/detail-quotation-format'
import {
  addCatalogItemToFloor,
  addFloorToContent,
  buildDefaultFloorDetailContent,
  findCatalogItemAcrossTemplates,
  FLOOR_DETAIL_TEMPLATE_KEY,
  removeFloorFromContent,
  updateFloorName,
} from '@/lib/floor-detail-quotation'
import type {
  QuotationDraftContent,
  QuotationFileType,
  QuotationLineItem,
} from '@/lib/quotation-types'

type QuotationMakerProps = {
  leadId: string
  leadName: string
  leadLocation: string | null
  leadSubStatus: string | null
  mode?: 'lead' | 'playground'
}

type TemplateOption = { key: string; name: string; sourceDocument: string }

type DraftPayload = {
  quotationType: QuotationFileType
  projectSqft: number | null
  content: QuotationDraftContent
  grandTotal: number
  status: 'DRAFT' | 'FINALIZED'
}

type DraftResponse = {
  draft: DraftPayload | null
  defaultDraft: DraftPayload | null
  defaultDetailDraft?: DraftPayload | null
  templates?: TemplateOption[]
  canEdit: boolean
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatLabel(value: string | null | undefined) {
  if (!value) return 'N/A'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function lineNeedsManualPrice(line: QuotationLineItem) {
  return Boolean(line.priceOnRequest && line.rate <= 0)
}

export function QuotationMaker({
  leadId,
  leadName,
  leadLocation,
  leadSubStatus,
  mode = 'lead',
}: QuotationMakerProps) {
  const isPlayground = mode === 'playground'
  const previewContext = isPlayground ? 'playground' : 'lead'
  const previewContextId = isPlayground ? 'playground' : leadId

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [startingWork, setStartingWork] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [quotationType, setQuotationType] = useState<QuotationFileType>('STANDARD')
  const [projectSqft, setProjectSqft] = useState('')
  const [content, setContent] = useState<QuotationDraftContent | null>(null)
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerFloorId, setPickerFloorId] = useState<string | null>(null)
  const [pickerCatalogKey, setPickerCatalogKey] = useState('ceiling-curtain')
  const [customTypeFloorId, setCustomTypeFloorId] = useState<string | null>(null)

  const loadDraft = useCallback(async () => {
    setLoading(true)
    try {
      if (isPlayground) {
        const templatesResponse = await fetch('/api/quotation/templates', { cache: 'no-store' })
        const templatesPayload = await templatesResponse.json()
        if (templatesResponse.ok && templatesPayload?.success && Array.isArray(templatesPayload.data?.templates)) {
          setTemplates(templatesPayload.data.templates)
        }

        const stored = loadPlaygroundDetailDraft()
        if (stored) {
          setQuotationType(stored.quotationType)
          setProjectSqft(stored.projectSqft ? String(stored.projectSqft) : '')
          setContent(normalizeQuotationContent(withDetailQuotationDefaults(stored.content)))
        } else {
          setQuotationType('STANDARD')
          setProjectSqft('')
          setContent(buildDefaultFloorDetailContent())
        }
        setCanEdit(true)
        return
      }

      const response = await fetch(`/api/lead/${leadId}/quotation-draft?documentType=detail`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error ?? 'Failed to load quotation')
      }

      const data = payload.data as DraftResponse
      setCanEdit(Boolean(data.canEdit))
      if (Array.isArray(data.templates)) setTemplates(data.templates)

      const source = data.draft ?? data.defaultDetailDraft
      if (!source) throw new Error('Quotation data unavailable')

      const qType = source.quotationType
      const validQType = (qType === 'BASIC' || qType === 'STANDARD' || qType === 'PREMIUM' || qType === 'MIXED') ? qType : 'STANDARD'
      setQuotationType(validQType)
      setProjectSqft(source.projectSqft ? String(source.projectSqft) : '')
      setContent(normalizeQuotationContent(withDetailQuotationDefaults(source.content)))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load quotation')
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [isPlayground, leadId])

  useEffect(() => {
    void loadDraft()
  }, [loadDraft])

  const totals = useMemo(() => (content ? calculateQuotationTotals(content) : null), [content])

  const floors = useMemo(() => {
    if (!content) return []
    return [...content.sections].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [content])

  useEffect(() => {
    if (!content || !totals) return
    const timer = window.setTimeout(() => {
      publishDetailPreview({
        updatedAt: new Date().toISOString(),
        context: previewContext,
        contextId: previewContextId,
        clientName: leadName,
        clientAddress: leadLocation,
        quotationType,
        projectSqft: projectSqft.trim() ? Number(projectSqft.replace(/,/g, '')) : null,
        content: withDetailQuotationDefaults(content),
        totals,
      })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [content, totals, quotationType, projectSqft, leadName, leadLocation, previewContext, previewContextId])

  const updateLineItem = (lineId: string, patch: Partial<QuotationLineItem>) => {
    setContent((prev) => {
      if (!prev) return prev
      const nextItems = prev.lineItems.map((line) => {
        if (line.id !== lineId) return line
        const updated = { ...line, ...patch }
        return {
          ...updated,
          amount: calculateLineAmount(updated.rate, updated.quantity),
        }
      })
      return normalizeQuotationContent({ ...prev, lineItems: nextItems })
    })
  }

  const applyProjectSqftToLines = (sqftValue: number) => {
    setContent((prev) => {
      if (!prev) return prev
      const nextItems = prev.lineItems.map((line) => {
        if (line.unit !== 'sqft') return line
        return {
          ...line,
          quantity: sqftValue,
          amount: calculateLineAmount(line.rate, sqftValue),
        }
      })
      return normalizeQuotationContent({ ...prev, lineItems: nextItems })
    })
  }

  const handleProjectSqftChange = (value: string) => {
    setProjectSqft(value)
    const parsed = Number(value.replace(/,/g, ''))
    if (Number.isFinite(parsed) && parsed > 0) applyProjectSqftToLines(parsed)
  }

  const handleQuotationTypeChange = (value: QuotationFileType) => {
    setQuotationType(value)
    setContent((prev) => (prev ? normalizeQuotationContent(applyQuotationTypeToContent(prev, value)) : prev))
  }

  const updateContentField = (patch: Partial<QuotationDraftContent>) => {
    setContent((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const addFloor = () => {
    setContent((prev) => (prev ? addFloorToContent(prev) : prev))
  }

  const removeFloor = (floorId: string) => {
    if (!window.confirm('Remove this floor and all its items?')) return
    setContent((prev) => (prev ? removeFloorFromContent(prev, floorId) : prev))
  }

  const addCustomLine = (floorId: string, type: 'regular' | 'package' = 'regular') => {
    setContent((prev) => {
      if (!prev) return prev
      const customCount = prev.lineItems.filter((line) => line.sectionId === floorId && line.isCustom).length
      const sqft = Number(projectSqft.replace(/,/g, ''))
      const newLine: QuotationLineItem = type === 'package'
        ? {
            id: `custom-${floorId}-${Date.now()}-${customCount}`,
            sectionId: floorId,
            description: 'Package item',
            materials: '',
            unit: 'ls',
            rate: 0,
            quantity: 0,
            amount: 0,
            included: true,
            isCustom: true,
          }
        : {
            id: `custom-${floorId}-${Date.now()}-${customCount}`,
            sectionId: floorId,
            description: 'Custom item',
            materials: '',
            unit: 'sqft',
            rate: 0,
            quantity: Number.isFinite(sqft) && sqft > 0 ? sqft : 0,
            amount: 0,
            included: true,
            isCustom: true,
          }
      return normalizeQuotationContent({ ...prev, lineItems: [...prev.lineItems, newLine] })
    })
  }

  const removeLine = (lineId: string) => {
    setContent((prev) =>
      prev
        ? normalizeQuotationContent({
            ...prev,
            lineItems: prev.lineItems.filter((line) => line.id !== lineId),
          })
        : prev,
    )
  }

  const openItemPicker = (floorId: string) => {
    setPickerFloorId(floorId)
    setPickerOpen(true)
  }

  const addTemplateItemFromCatalog = (templateItemId: string, catalogTemplateKey: string) => {
    if (!pickerFloorId) {
      toast.error('Select a floor first')
      return
    }
    setContent((prev) => {
      if (!prev) return prev
      const sqft = Number(projectSqft.replace(/,/g, ''))
      const next = addCatalogItemToFloor(
        prev,
        pickerFloorId,
        catalogTemplateKey,
        templateItemId,
        quotationType,
        Number.isFinite(sqft) && sqft > 0 ? sqft : null,
      )
      if (!next) {
        toast.error('Item not found in saved list')
        return prev
      }
      const match = findCatalogItemAcrossTemplates(templateItemId)
      toast.success(match ? `Added: ${match.item.description}` : 'Item added')
      return normalizeQuotationContent(next)
    })
  }

  const openLivePreviewTab = () => {
    if (content && totals) {
      publishDetailPreview({
        updatedAt: new Date().toISOString(),
        context: previewContext,
        contextId: previewContextId,
        clientName: leadName,
        clientAddress: leadLocation,
        quotationType,
        projectSqft: projectSqft.trim() ? Number(projectSqft.replace(/,/g, '')) : null,
        content: withDetailQuotationDefaults(content),
        totals,
      })
    }
    const url = buildDetailPreviewUrl({ context: previewContext, contextId: previewContextId })
    void window.open(url, '_blank', 'noopener,noreferrer')
  }

  const saveDraft = async () => {
    if (!content || !canEdit) return
    const normalized = normalizeQuotationContent(content)
    const totalsPreview = calculateQuotationTotals(normalized)
    if (totalsPreview.itemsMissingPrice > 0) {
      toast.error(`${totalsPreview.itemsMissingPrice} item(s) still need a price.`)
      return
    }
    setSaving(true)
    try {
      const projectSqftValue = projectSqft.trim() ? Number(projectSqft.replace(/,/g, '')) : null
      if (isPlayground) {
        savePlaygroundDetailDraft({
          quotationType,
          projectSqft: projectSqftValue,
          templateKey: FLOOR_DETAIL_TEMPLATE_KEY,
          content: normalized,
        })
        setContent(normalized)
        toast.success('Saved to browser (playground only)')
        return
      }

      const response = await fetch(`/api/lead/${leadId}/quotation-draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'detail',
          quotationType,
          projectSqft: projectSqftValue,
          content: normalized,
          status: 'DRAFT',
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to save quotation')
      }
      setContent(normalized)
      toast.success('Quotation saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save quotation')
    } finally {
      setSaving(false)
    }
  }

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

  const handlePrint = () => openLivePreviewTab()

  const canStartWork =
    !isPlayground &&
    (leadSubStatus === 'QUOTATION_ASSIGNED' || leadSubStatus === 'QUOTATION_CORRECTION')

  const catalogOptions =
    templates.length > 0
      ? templates
      : [
          { key: 'ceiling-curtain', name: 'Ceiling & Curtain' },
          { key: 'tv-unit', name: 'TV Unit' },
          { key: 'folding-sliding-door', name: 'Folding & Sliding Door' },
        ]

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading detail quotation...
        </CardContent>
      </Card>
    )
  }

  if (!content || !totals) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">
          Unable to load detail quotation.
        </CardContent>
      </Card>
    )
  }

  const displayContent = withDetailQuotationDefaults(content)

return (
    <div className="space-y-4 quotation-maker-root">
      <Card className="print:hidden">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Floor-based Detail Quotation</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isPlayground ? 'Practice without touching real leads' : leadName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isPlayground ? (
                <Badge variant="outline">Playground</Badge>
              ) : (
                <Badge variant="outline">{formatLabel(leadSubStatus)}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Client</p>
              <p className="text-sm font-medium">{leadName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Rate</p>
              <Select
                value={quotationType}
                disabled={!canEdit}
                onValueChange={(value) => handleQuotationTypeChange(value as QuotationFileType)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASIC">Low</SelectItem>
                  <SelectItem value="STANDARD">Mid</SelectItem>
                  <SelectItem value="PREMIUM">High</SelectItem>
                  <SelectItem value="MIXED">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Default sqft</p>
              <Input
                type="text"
                inputMode="decimal"
                value={projectSqft}
                disabled={!canEdit}
                onChange={(event) => handleProjectSqftChange(event.target.value)}
                placeholder="Enter sqft"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total</p>
              <p className="text-sm font-semibold">{totals ? formatCurrency(totals.grandTotal) : '—'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {canStartWork ? (
              <Button type="button" disabled={startingWork} onClick={() => void startWork()}>
                {startingWork ? 'Starting...' : 'Start Work'}
              </Button>
            ) : null}
            <Button type="button" variant="outline" disabled={!canEdit} onClick={addFloor}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Floor
            </Button>
            <Button type="button" variant="outline" disabled={!canEdit || saving} onClick={() => void saveDraft()}>
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={openLivePreviewTab}>
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Live Preview
            </Button>
            <Button type="button" variant="outline" onClick={handlePrint}>
              <Printer className="mr-1.5 h-4 w-4" />
              Print
            </Button>
            {!isPlayground ? (
              <Button type="button" variant="outline" asChild>
                <Link href="/quotation-team/my-work">Back to My Work</Link>
              </Button>
            ) : null}
          </div>

          {!canEdit ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              Read-only. Start work from My Work to edit.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <CollapsibleCard title="Letterhead & footer" defaultOpen={false}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Date</p>
            <Input
              value={displayContent.quotationDate ?? ''}
              disabled={!canEdit}
              onChange={(event) => updateContentField({ quotationDate: event.target.value })}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Location</p>
            <p className="text-sm text-muted-foreground">{leadLocation ?? 'N/A'}</p>
          </div>
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Summary subject (page 1)</p>
            <Input
              value={displayContent.summarySubject ?? ''}
              disabled={!canEdit}
              onChange={(event) => updateContentField({ summarySubject: event.target.value })}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Detail subject (per floor)</p>
            <Input
              value={displayContent.subject ?? ''}
              disabled={!canEdit}
              onChange={(event) => updateContentField({ subject: event.target.value })}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Intro letter</p>
            <Textarea
              rows={2}
              disabled={!canEdit}
              value={displayContent.introLetter ?? ''}
              onChange={(event) => updateContentField({ introLetter: event.target.value })}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Terms &amp; conditions</p>
            <Textarea
              rows={2}
              disabled={!canEdit}
              value={displayContent.terms}
              onChange={(event) => updateContentField({ terms: event.target.value })}
            />
          </div>
        </div>
      </CollapsibleCard>

      {floors.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No floors yet. Click <strong>Add Floor</strong> — e.g. Ground Floor, First Floor, Door Work.
          </CardContent>
        </Card>
      ) : (
        floors.map((floor) => {
          const floorLines = content.lineItems.filter(
            (line) => line.sectionId === floor.id && line.included,
          )

          return (
            <Card key={floor.id} className="overflow-hidden print:hidden">
              <CardHeader className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Input
                      value={floor.name}
                      disabled={!canEdit}
                      placeholder="e.g. Ground Floor"
                      className="max-w-sm font-semibold"
                      onChange={(event) =>
                        setContent((prev) =>
                          prev ? updateFloorName(prev, floor.id, event.target.value) : prev,
                        )
                      }
                    />
                  </div>
                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeFloor(floor.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {floorLines.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No items on this floor yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-sm">
                      <thead className="bg-muted/50 text-left">
                        <tr>
                          <th className="w-12 px-3 py-2 font-medium">SL</th>
                          <th className="min-w-[160px] px-3 py-2 font-medium">Name</th>
                          <th className="min-w-[280px] px-3 py-2 font-medium">Materials</th>
                          <th className="px-3 py-2 font-medium">Unit price</th>
                          <th className="px-3 py-2 font-medium">Qty / SFT</th>
                          <th className="px-3 py-2 text-right font-medium">Total</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {floorLines.map((line, lineIndex) => {
                          const isPkg = isPackageLine(line)
                          return (
                          <tr key={line.id} className="border-t align-top">
                            <td className="px-3 py-2 text-muted-foreground">
                              {lineIndex + 1}
                            </td>
                            <td className="px-3 py-2">
                              {canEdit ? (
                                <Input
                                  value={line.description}
                                  onChange={(event) =>
                                    updateLineItem(line.id, { description: event.target.value })
                                  }
                                />
                              ) : (
                                line.description
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {canEdit ? (
                                <Textarea
                                  rows={4}
                                  value={line.materials ?? ''}
                                  className="min-w-[260px] text-xs"
                                  onChange={(event) =>
                                    updateLineItem(line.id, { materials: event.target.value })
                                  }
                                />
                              ) : (
                                <p className="whitespace-pre-wrap text-xs">{line.materials || '—'}</p>
                              )}
                            </td>
                            {isPkg ? (
                              <td colSpan={2} className="px-3 py-2">
                                <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                  Package
                                </span>
                              </td>
                            ) : (
                              <>
                                <td className="px-3 py-2">
                                  {canEdit ? (
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={line.rate > 0 ? String(line.rate) : ''}
                                      placeholder={lineNeedsManualPrice(line) ? 'Enter price' : '0'}
                                      onChange={(event) =>
                                        updateLineItem(line.id, {
                                          rate: Number(event.target.value.replace(/,/g, '')) || 0,
                                        })
                                      }
                                    />
                                  ) : (
                                    formatCurrency(line.rate)
                                  )}
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    PDF: {formatTemplatePriceHint(line)}
                                  </p>
                                </td>
                                <td className="px-3 py-2">
                                  {canEdit ? (
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={String(line.quantity)}
                                      onChange={(event) =>
                                        updateLineItem(line.id, {
                                          quantity: Number(event.target.value.replace(/,/g, '')) || 0,
                                        })
                                      }
                                    />
                                  ) : (
                                    line.quantity
                                  )}
                                </td>
                              </>
                            )}
                            <td className="px-3 py-2 text-right font-medium">
                              {isPkg && canEdit ? (
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  className="text-right"
                                  value={line.amount > 0 ? String(line.amount) : ''}
                                  placeholder="Total"
                                  onChange={(event) =>
                                    updateLineItem(line.id, {
                                      amount: Number(event.target.value.replace(/,/g, '')) || 0,
                                    })
                                  }
                                />
                              ) : (
                                formatCurrency(line.amount)
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {canEdit ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeLine(line.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {canEdit ? (
                  <div className="flex flex-wrap gap-2 border-t px-4 py-3 bg-muted/20">
                    <Button type="button" size="sm" variant="outline" onClick={() => openItemPicker(floor.id)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add from saved list
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setCustomTypeFloorId(floor.id)}>
                      Custom item
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )
        })
      )}

      <Card className="print:hidden">
        <CardContent className="space-y-3 py-4">
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between py-1">
              <span>Subtotal ({totals.includedItemCount} items)</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
              <span>Grand Total</span>
              <span>{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <QuotationItemPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        catalogs={catalogOptions}
        catalogTemplateKey={pickerCatalogKey}
        onCatalogTemplateKeyChange={setPickerCatalogKey}
        onSelectItem={addTemplateItemFromCatalog}
      />

      {/* Custom item type picker dialog */}
      <Dialog open={!!customTypeFloorId} onOpenChange={(open) => { if (!open) setCustomTypeFloorId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose item type</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">What kind of item do you want to add?</p>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-1 px-4 py-3 text-left"
              onClick={() => {
                if (customTypeFloorId) addCustomLine(customTypeFloorId, 'regular')
                setCustomTypeFloorId(null)
              }}
            >
              <span className="font-semibold">Regular item</span>
              <span className="text-xs text-muted-foreground">Has unit price × qty/sqft calculation</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-1 px-4 py-3 text-left"
              onClick={() => {
                if (customTypeFloorId) addCustomLine(customTypeFloorId, 'package')
                setCustomTypeFloorId(null)
              }}
            >
              <span className="font-semibold">Package item</span>
              <span className="text-xs text-muted-foreground">Fixed total price, no unit price or sqft needed</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
