'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus, Printer, Save, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CollapsibleCard } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { SHORT_QUOTATION_NAMES, searchShortQuotationNames } from '@/lib/short-quotation-names'
import { ShortQuotationPrint } from '@/components/crm/quotation/short-quotation-print'
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
import {
  loadPlaygroundShortDraft,
  savePlaygroundShortDraft,
} from '@/lib/quotation-playground-storage'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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

export function ShortQuotationBuilder({
  leadId,
  leadName,
  leadLocation,
  leadSubStatus,
  mode = 'lead',
}: ShortQuotationBuilderProps) {
  const isPlayground = mode === 'playground'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [startingWork, setStartingWork] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [content, setContent] = useState<ShortQuotationContent | null>(null)
  const [selectedPackageTier, setSelectedPackageTier] = useState<ShortQuotationPackage>('PREMIUM')
  const [generatingPdf, setGeneratingPdf] = useState(false)

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

  const saveDraft = async () => {
    if (!content || !canEdit) return
    setSaving(true)
    try {
      const normalized = normalizeShortQuotationContent(content)
      if (isPlayground) {
        savePlaygroundShortDraft(normalized)
        setContent(normalized)
        toast.success('Saved to browser (playground only)')
        return
      }

      const response = await fetch(`/api/lead/${leadId}/quotation-draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'short',
          quotationType: normalized.packageTier,
          content: normalized,
          status: 'DRAFT',
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to save quotation')
      }
      setContent(normalized)
      toast.success('Short quotation saved')
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
    setGeneratingPdf(true)
    try {
      const safeClientName = (content.clientName || 'Quotation').replace(/[^a-z0-9]/gi, '_').toLowerCase()
      await downloadPdfFromDocument(
        <ShortQuotationDocument content={content} />,
        `Short_Quotation_${safeClientName}.pdf`,
      )
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('PDF generation error:', error)
      const msg = error instanceof Error ? error.message : String(error)
      if (/taint|cross-origin|security/i.test(msg)) {
        toast.error('Failed to generate PDF: rendering error. See console for details.')
      } else {
        toast.error('Failed to generate PDF')
      }
    } finally {
      setGeneratingPdf(false)
    }
  }

  const sortedFloors = [...content.floors].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="space-y-4 short-quotation-root">
      <Card className="print:hidden">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Short Quotation</CardTitle>
              <p className="text-sm text-muted-foreground">
                Build the short quotation layout yourself — floors, rooms, items, sqft, and prices. Print matches your PDF format.
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
        <CardContent className="space-y-4">
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

          <CollapsibleCard title="Header details">
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

          <CollapsibleCard title="Footer notes" defaultOpen={false}>
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
            <Button type="button" disabled={!canEdit || saving} onClick={() => void saveDraft()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Quotation'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
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
                  <Printer className="mr-2 h-4 w-4" />
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

          {!canEdit ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              Read-only. Start work on this lead from My Work to edit the short quotation.
            </p>
          ) : null}
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
                                <th className="px-2 py-2">Name</th>
                                <th className="px-2 py-2">Qty Sft</th>
                                <th className="px-2 py-2">Unit Price</th>
                                <th className="px-2 py-2">Total</th>
                                <th className="px-2 py-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {room.lines.map((line) => (
                                <tr key={line.id} className="border-t">
                                  <td className="px-2 py-2">
                                    <Input
                                      value={line.name}
                                      disabled={!canEdit}
                                      onChange={(event) =>
                                        updateLine(room.id, line.id, { name: event.target.value })
                                      }
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
                                          updateLine(room.id, line.id, {
                                            quantitySqft:
                                              Number(event.target.value.replace(/,/g, '')) || 0,
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
                                          updateLine(room.id, line.id, {
                                            unitPrice:
                                              Number(event.target.value.replace(/,/g, '')) || 0,
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
                                          updateLine(room.id, line.id, {
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
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => removeLine(room.id, line.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                  </td>
                                </tr>
                              ))}
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

      <div id="short-quotation-print-container" className="short-quotation-print-area">
        <ShortQuotationPrint content={content} />
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
