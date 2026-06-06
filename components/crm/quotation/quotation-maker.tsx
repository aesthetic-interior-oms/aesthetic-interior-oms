'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus, Printer, Save } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  applyQuotationTypeToContent,
  buildDefaultQuotationContent,
  getQuotationTemplate,
} from '@/lib/quotation-templates'
import { formatTemplatePriceHint } from '@/lib/quotation-templates/helpers'
import {
  calculateLineAmount,
  calculateQuotationTotals,
  normalizeQuotationContent,
} from '@/lib/quotation-calculations'
import type {
  QuotationDraftContent,
  QuotationFileType,
  QuotationLineItem,
  QuotationUnit,
} from '@/lib/quotation-types'

type QuotationMakerProps = {
  leadId: string
  leadName: string
  leadLocation: string | null
  leadSubStatus: string | null
}

type TemplateOption = {
  key: string
  name: string
  sourceDocument: string
}

type DraftResponse = {
  draft: {
    quotationType: QuotationFileType
    projectSqft: number | null
    content: QuotationDraftContent
    grandTotal: number
    status: 'DRAFT' | 'FINALIZED'
  } | null
  defaultDraft: {
    quotationType: QuotationFileType
    projectSqft: number | null
    content: QuotationDraftContent
    grandTotal: number
    status: 'DRAFT' | 'FINALIZED'
  } | null
  templates?: TemplateOption[]
  canEdit: boolean
}

const UNIT_LABELS: Record<QuotationUnit, string> = {
  sqft: 'Sqft',
  nos: 'Nos',
  ls: 'Lump Sum',
  rmt: 'Running Mtr',
  rft: 'Running Ft',
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
}: QuotationMakerProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [startingWork, setStartingWork] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [quotationType, setQuotationType] = useState<QuotationFileType>('STANDARD')
  const [projectSqft, setProjectSqft] = useState('')
  const [content, setContent] = useState<QuotationDraftContent | null>(null)
  const [templateKey, setTemplateKey] = useState('ceiling-curtain')
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const loadDraft = useCallback(async (preferredTemplateKey?: string) => {
    setLoading(true)
    try {
      const query = preferredTemplateKey ? `?templateKey=${encodeURIComponent(preferredTemplateKey)}` : ''
      const response = await fetch(`/api/lead/${leadId}/quotation-draft${query}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error ?? 'Failed to load quotation')
      }

      const data = payload.data as DraftResponse
      setCanEdit(Boolean(data.canEdit))
      if (Array.isArray(data.templates)) setTemplates(data.templates)

      const source = data.draft ?? data.defaultDraft
      if (!source) {
        throw new Error('Quotation data unavailable')
      }

      setQuotationType(source.quotationType)
      setProjectSqft(source.projectSqft ? String(source.projectSqft) : '')
      setContent(source.content)
      setTemplateKey(source.content.templateKey ?? preferredTemplateKey ?? 'ceiling-curtain')
      setLastSavedAt(data.draft ? new Date().toISOString() : null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load quotation')
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void loadDraft()
  }, [loadDraft])

  const totals = useMemo(() => {
    if (!content) return null
    return calculateQuotationTotals(content)
  }, [content])

  const sections = useMemo(() => {
    if (!content) return []
    return [...content.sections].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [content])

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
    if (Number.isFinite(parsed) && parsed > 0) {
      applyProjectSqftToLines(parsed)
    }
  }

  const handleQuotationTypeChange = (value: QuotationFileType) => {
    setQuotationType(value)
    setContent((prev) => {
      if (!prev) return prev
      return normalizeQuotationContent(applyQuotationTypeToContent(prev, value))
    })
  }

  const addCustomLine = (sectionId: string) => {
    setContent((prev) => {
      if (!prev) return prev
      const customCount = prev.lineItems.filter((line) => line.sectionId === sectionId && line.isCustom).length
      const newLine: QuotationLineItem = {
        id: `custom-${sectionId}-${Date.now()}-${customCount}`,
        sectionId,
        description: 'Custom item',
        materials: '',
        unit: 'sqft',
        rate: 0,
        quantity: Number(projectSqft.replace(/,/g, '')) > 0 ? Number(projectSqft.replace(/,/g, '')) : 0,
        amount: 0,
        included: true,
        isCustom: true,
      }
      return normalizeQuotationContent({
        ...prev,
        lineItems: [...prev.lineItems, newLine],
      })
    })
  }

  const removeCustomLine = (lineId: string) => {
    setContent((prev) => {
      if (!prev) return prev
      return normalizeQuotationContent({
        ...prev,
        lineItems: prev.lineItems.filter((line) => line.id !== lineId),
      })
    })
  }

  const activeTemplateName = useMemo(() => {
    const match = templates.find((item) => item.key === templateKey)
    return match?.name ?? getQuotationTemplate(templateKey).name
  }, [templateKey, templates])

  const handleTemplateChange = (nextKey: string) => {
    if (!canEdit || nextKey === templateKey) return
    if (!window.confirm('Switch quotation template? Current edits will be replaced.')) return

    const sqft = Number(projectSqft.replace(/,/g, ''))
    const nextContent = buildDefaultQuotationContent({
      templateKey: nextKey,
      quotationType,
      projectSqft: Number.isFinite(sqft) && sqft > 0 ? sqft : null,
    })
    setTemplateKey(nextKey)
    setContent(nextContent)
    setLastSavedAt(null)
  }

  const saveDraft = async () => {
    if (!content || !canEdit) return
    const normalized = normalizeQuotationContent(content)
    const totalsPreview = calculateQuotationTotals(normalized)
    if (totalsPreview.itemsMissingPrice > 0) {
      toast.error(`${totalsPreview.itemsMissingPrice} included item(s) still need a price.`)
      return
    }
    setSaving(true)
    try {
      const response = await fetch(`/api/lead/${leadId}/quotation-draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationType,
          projectSqft: projectSqft.trim() ? Number(projectSqft.replace(/,/g, '')) : null,
          content: normalized,
          status: 'DRAFT',
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to save quotation')
      }
      setContent(normalized)
      setLastSavedAt(new Date().toISOString())
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

  const resetToTemplate = () => {
    const sqft = Number(projectSqft.replace(/,/g, ''))
    const nextContent = buildDefaultQuotationContent({
      templateKey,
      quotationType,
      projectSqft: Number.isFinite(sqft) && sqft > 0 ? sqft : null,
    })
    setContent(nextContent)
    toast.message('Template reset. Save when ready.')
  }

  const handlePrint = () => {
    window.print()
  }

  const canStartWork =
    leadSubStatus === 'QUOTATION_ASSIGNED' || leadSubStatus === 'QUOTATION_CORRECTION'

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading quotation maker...
        </CardContent>
      </Card>
    )
  }

  if (!content || !totals) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">
          Unable to load quotation maker for this lead.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 quotation-maker-root">
      <Card className="print:hidden">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>{activeTemplateName} Quotation</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a template, choose items, edit rates (or enter price where PDF has none), and add sqft.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{formatLabel(leadSubStatus)}</Badge>
              {lastSavedAt ? (
                <span className="text-xs text-muted-foreground">
                  Saved {new Date(lastSavedAt).toLocaleString()}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Not saved yet</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1 md:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">Quotation Template</p>
              <Select
                value={templateKey}
                disabled={!canEdit || Boolean(lastSavedAt)}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {(templates.length > 0
                    ? templates
                    : [
                        { key: 'ceiling-curtain', name: 'Ceiling & Curtain' },
                        { key: 'tv-unit', name: 'TV Unit' },
                        { key: 'folding-sliding-door', name: 'Folding & Sliding Door' },
                      ]
                  ).map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lastSavedAt ? (
                <p className="text-[11px] text-muted-foreground">Template is locked after first save.</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Client</p>
              <p className="text-sm font-medium">{leadName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Location</p>
              <p className="text-sm font-medium">{leadLocation ?? 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Project Sqft</p>
              <Input
                type="text"
                inputMode="decimal"
                value={projectSqft}
                disabled={!canEdit}
                onChange={(event) => handleProjectSqftChange(event.target.value)}
                placeholder="Enter total sqft"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Rate Selection</p>
              <Select
                value={quotationType}
                disabled={!canEdit}
                onValueChange={(value) => handleQuotationTypeChange(value as QuotationFileType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASIC">Low (min rate from PDF)</SelectItem>
                  <SelectItem value="STANDARD">Mid (average rate)</SelectItem>
                  <SelectItem value="PREMIUM">High (max rate from PDF)</SelectItem>
                  <SelectItem value="MIXED">Mixed (manual per item)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canStartWork ? (
              <Button type="button" disabled={startingWork} onClick={() => void startWork()}>
                {startingWork ? 'Starting...' : 'Start Work'}
              </Button>
            ) : null}
            <Button type="button" variant="outline" disabled={!canEdit} onClick={resetToTemplate}>
              Reset Template
            </Button>
            <Button type="button" disabled={!canEdit || saving} onClick={() => void saveDraft()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button type="button" variant="secondary" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print / PDF
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/quotation-team/my-work">Back to My Work</Link>
            </Button>
          </div>

          {!canEdit ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              This quotation is read-only. Start work on this lead from My Work to edit items and sqft.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="quotation-print-area space-y-4 rounded-lg border bg-card p-4">
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold">Quotation — {activeTemplateName}</h2>
          <p className="text-sm text-muted-foreground">
            {leadName} {leadLocation ? `• ${leadLocation}` : ''}
            {projectSqft ? ` • ${projectSqft} sqft` : ''}
          </p>
          <p className="text-sm text-muted-foreground">
            Rate: {quotationType === 'BASIC' ? 'Low' : quotationType === 'PREMIUM' ? 'High' : quotationType === 'STANDARD' ? 'Mid' : 'Mixed'}
          </p>
        </div>

        {sections.map((section) => {
          const sectionLines = content.lineItems.filter((line) => line.sectionId === section.id)
          if (sectionLines.length === 0) return null

          return (
            <Card key={section.id} className="overflow-hidden border-border/70 shadow-none">
              <CardHeader className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{section.name}</CardTitle>
                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addCustomLine(section.id)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Item
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium print:hidden">Include</th>
                        <th className="w-12 px-3 py-2 font-medium">SL</th>
                        <th className="min-w-[160px] px-3 py-2 font-medium">Name</th>
                        <th className="min-w-[280px] px-3 py-2 font-medium">Materials</th>
                        <th className="px-3 py-2 font-medium">Unit Price</th>
                        <th className="px-3 py-2 font-medium">Sqft</th>
                        <th className="px-3 py-2 font-medium text-right">Amount</th>
                        <th className="px-3 py-2 font-medium print:hidden" />
                      </tr>
                    </thead>
                    <tbody>
                      {sectionLines.map((line, lineIndex) => (
                        <tr
                          key={line.id}
                          className={`border-t align-top ${line.included ? '' : 'opacity-50 print:hidden'}`}
                        >
                          <td className="px-3 py-2 print:hidden">
                            <input
                              type="checkbox"
                              checked={line.included}
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateLineItem(line.id, { included: event.target.checked })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {line.serialNo ?? lineIndex + 1}
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
                              <span className="font-medium">{line.description}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {canEdit ? (
                              <Textarea
                                rows={4}
                                value={line.materials ?? ''}
                                onChange={(event) =>
                                  updateLineItem(line.id, { materials: event.target.value })
                                }
                                className="min-w-[260px] text-xs"
                              />
                            ) : (
                              <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                                {line.materials || '—'}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {canEdit ? (
                              <div className="space-y-1">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={line.rate > 0 ? String(line.rate) : ''}
                                  placeholder={lineNeedsManualPrice(line) ? 'Enter price' : '0'}
                                  className={lineNeedsManualPrice(line) && line.included ? 'border-amber-400' : ''}
                                  onChange={(event) =>
                                    updateLineItem(line.id, {
                                      rate: Number(event.target.value.replace(/,/g, '')) || 0,
                                    })
                                  }
                                />
                                <p className="text-[11px] text-muted-foreground">
                                  PDF: {formatTemplatePriceHint(line)}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p>{line.rate > 0 ? formatCurrency(line.rate) : '—'}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {formatTemplatePriceHint(line)}
                                </p>
                              </div>
                            )}
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
                          <td className="px-3 py-2 text-right font-medium">
                            {line.included ? formatCurrency(line.amount) : '—'}
                          </td>
                          <td className="px-3 py-2 print:hidden">
                            {canEdit && line.isCustom ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeCustomLine(line.id)}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )
        })}

        <Card>
          <CardContent className="grid gap-3 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Notes</p>
              <Textarea
                rows={4}
                disabled={!canEdit}
                value={content.notes}
                onChange={(event) =>
                  setContent((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                }
                placeholder="Additional notes for this quotation..."
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Terms & Conditions</p>
              <Textarea
                rows={4}
                disabled={!canEdit}
                value={content.terms}
                onChange={(event) =>
                  setContent((prev) => (prev ? { ...prev, terms: event.target.value } : prev))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Discount %</p>
                <Input
                  type="text"
                  inputMode="decimal"
                  disabled={!canEdit}
                  value={String(content.discountPercent)}
                  onChange={(event) =>
                    setContent((prev) =>
                      prev
                        ? normalizeQuotationContent({
                            ...prev,
                            discountPercent: Number(event.target.value.replace(/,/g, '')) || 0,
                          })
                        : prev,
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Discount Amount</p>
                <Input
                  type="text"
                  inputMode="decimal"
                  disabled={!canEdit}
                  value={String(content.discountAmount)}
                  onChange={(event) =>
                    setContent((prev) =>
                      prev
                        ? normalizeQuotationContent({
                            ...prev,
                            discountAmount: Number(event.target.value.replace(/,/g, '')) || 0,
                          })
                        : prev,
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tax %</p>
                <Input
                  type="text"
                  inputMode="decimal"
                  disabled={!canEdit}
                  value={String(content.taxPercent)}
                  onChange={(event) =>
                    setContent((prev) =>
                      prev
                        ? normalizeQuotationContent({
                            ...prev,
                            taxPercent: Number(event.target.value.replace(/,/g, '')) || 0,
                          })
                        : prev,
                    )
                  }
                />
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span>Subtotal ({totals.includedItemCount} items)</span>
                <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Discount</span>
                <span className="font-medium">- {formatCurrency(totals.discountAmount)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Tax</span>
                <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
                <span>Grand Total</span>
                <span>{formatCurrency(totals.grandTotal)}</span>
              </div>
              {totals.itemsMissingPrice > 0 ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  {totals.itemsMissingPrice} included item(s) need a price before saving.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .quotation-maker-root,
          .quotation-maker-root * {
            visibility: visible;
          }
          .quotation-maker-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          tr:not(:has(input:checked)) {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
