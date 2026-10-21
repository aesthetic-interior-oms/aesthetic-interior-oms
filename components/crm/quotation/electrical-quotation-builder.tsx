'use client'

import { useEffect, useMemo, useState } from 'react'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { BookmarkPlus, Download, GripVertical, Layers, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ElectricalQuotationDocument } from '@/components/crm/quotation/pdf/ElectricalQuotationDocument'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import {
  buildDefaultElectricalQuotationContent,
  calculateElectricalGrandTotal,
  ELECTRICAL_QUOTATION_UNITS,
  type ElectricalQuotationContent,
  type ElectricalQuotationItem,
} from '@/lib/electrical-quotation-template'

type Props = {
  leadId: string
  leadName: string
  leadLocation: string | null
  onDraftSaved?: () => void
}

type SavedItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit: string
  rate: number
  serialNo?: number
  createdAt?: string
}

const money = (value: number) => `৳${Math.round(value).toLocaleString('en-BD')}`

function SortableItemRow({
  item,
  index,
  disabled,
  units,
  onPatch,
  onRemove,
  onSaveToLibrary,
}: {
  item: ElectricalQuotationItem
  index: number
  disabled: boolean
  units: string[]
  onPatch: (patch: Partial<ElectricalQuotationItem>) => void
  onRemove: () => void
  onSaveToLibrary: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const qty = item.quantity ?? ''
  const rate = item.rate ?? ''
  const lineTotal =
    typeof item.quantity === 'number' && typeof item.rate === 'number' && item.quantity > 0 && item.rate > 0
      ? money(item.quantity * item.rate)
      : item.unit?.toLowerCase().includes('lump')
        ? 'Lump sum'
        : '—'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card p-3.5 transition-shadow ${isDragging ? 'z-10 opacity-70 shadow-lg ring-1 ring-primary' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Drag to change item order"
            className="cursor-grab touch-none"
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Badge variant="outline">Item {String(item.serialNo ?? index + 1).padStart(2, '0')}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSaveToLibrary}
              title="Save this item to library for reuse"
            >
              <BookmarkPlus className="mr-1 h-4 w-4" />
              Save to library
            </Button>
          )}
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove ${item.name || 'item'}`}
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(180px,1.2fr)_minmax(240px,2fr)_90px_140px_130px_130px]">
        <label className="space-y-1 text-xs font-medium">
          <span>Item name</span>
          <Input
            value={item.name}
            disabled={disabled}
            placeholder="e.g. Conduit, Cable, Light..."
            onChange={(e) => onPatch({ name: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-xs font-medium">
          <span>Scope / Specification</span>
          <Textarea
            className="min-h-10 text-xs"
            value={item.description}
            disabled={disabled}
            placeholder="Brand, type, installation scope..."
            onChange={(e) => onPatch({ description: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-xs font-medium">
          <span>Qty (optional)</span>
          <Input
            type="number"
            min="0"
            step="any"
            value={qty}
            disabled={disabled}
            placeholder="—"
            onChange={(e) => {
              const val = e.target.value
              onPatch({ quantity: val === '' ? null : Number(val) || 0 })
            }}
          />
        </label>
        <label className="space-y-1 text-xs font-medium">
          <span>Unit</span>
          <Select
            value={item.unit || ''}
            disabled={disabled}
            onValueChange={(unit) => onPatch({ unit })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          <span>Unit price (৳) (optional)</span>
          <Input
            type="number"
            min="0"
            step="any"
            value={rate}
            disabled={disabled}
            placeholder="—"
            onChange={(e) => {
              const val = e.target.value
              onPatch({ rate: val === '' ? null : Number(val) || 0 })
            }}
          />
        </label>
        <div className="space-y-1 text-xs font-medium">
          <span className="block">Line total</span>
          <div className="flex h-10 items-center justify-end rounded-md bg-muted px-3 text-sm font-semibold">
            {lineTotal}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ElectricalQuotationBuilder({ leadId, leadName, leadLocation, onDraftSaved }: Props) {
  const [content, setContent] = useState<ElectricalQuotationContent>(() => buildDefaultElectricalQuotationContent())
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [newItemOpen, setNewItemOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [newItem, setNewItem] = useState<{
    name: string
    description: string
    quantity: string
    unit: string
    rate: string
  }>({
    name: '',
    description: '',
    quantity: '',
    unit: 'NOS',
    rate: '',
  })

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    let active = true
    Promise.all([
      fetch(`/api/lead/${leadId}/electrical-quotation`, { cache: 'no-store' }).then(async (res) => {
        const payload = await res.json()
        if (!res.ok || !payload?.success) throw new Error(payload?.error ?? 'Unable to load electrical quotation')
        return payload
      }),
      fetch('/api/electrical-quotation-saved-items', { cache: 'no-store' }).then(async (res) => {
        const payload = await res.json()
        if (!res.ok || !payload?.success) throw new Error(payload?.error ?? 'Unable to load saved items')
        return payload
      }),
    ])
      .then(([draftPayload, savedPayload]) => {
        if (!active) return
        setContent(draftPayload.data.content)
        setCanEdit(Boolean(draftPayload.data.canEdit))
        setHasDraft(Boolean(draftPayload.data.draft))
        setSavedItems(savedPayload.items as SavedItem[])
      })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : 'Unable to load electrical quotation')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [leadId])

  const { calculatedSum, grandTotal, isApproximate } = useMemo(
    () => calculateElectricalGrandTotal(content),
    [content]
  )

  const units = useMemo(() => {
    const list = new Set<string>([...ELECTRICAL_QUOTATION_UNITS])
    savedItems.forEach((i) => {
      if (i.unit) list.add(i.unit)
    })
    content.items.forEach((i) => {
      if (i.unit) list.add(i.unit)
    })
    return Array.from(list)
  }, [savedItems, content.items])

  const filteredSavedItems = useMemo(
    () =>
      savedItems.filter((item) =>
        `${item.name} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [savedItems, query]
  )

  function patchItem(id: string, patch: Partial<ElectricalQuotationItem>) {
    setContent((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  function addBlankItem() {
    const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setContent((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id,
          serialNo: current.items.length + 1,
          name: '',
          description: '',
          quantity: null,
          unit: 'NOS',
          rate: null,
        },
      ],
    }))
  }

  function addSavedItemToDraft(saved: SavedItem) {
    const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setContent((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id,
          serialNo: current.items.length + 1,
          name: saved.name,
          description: saved.description,
          quantity: saved.quantity > 0 ? saved.quantity : null,
          unit: saved.unit || 'NOS',
          rate: saved.rate > 0 ? saved.rate : null,
        },
      ],
    }))
    toast.success(`Added "${saved.name}"`)
  }

  function addAllSavedItems() {
    if (savedItems.length === 0) return
    setContent((current) => {
      const existingNames = new Set(current.items.map((i) => i.name.toLowerCase().trim()))
      const toAdd = savedItems.filter((s) => !existingNames.has(s.name.toLowerCase().trim()))
      if (toAdd.length === 0) {
        toast.info('All saved items are already added')
        return current
      }
      const newRows: ElectricalQuotationItem[] = toAdd.map((item, idx) => ({
        id: `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        serialNo: current.items.length + idx + 1,
        name: item.name,
        description: item.description,
        quantity: item.quantity > 0 ? item.quantity : null,
        unit: item.unit || 'NOS',
        rate: item.rate > 0 ? item.rate : null,
      }))
      toast.success(`Added ${newRows.length} standard items`)
      return {
        ...current,
        items: [...current.items, ...newRows],
      }
    })
    setPickerOpen(false)
  }

  function reorder(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = content.items.findIndex((item) => item.id === active.id)
    const newIndex = content.items.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const moved = arrayMove(content.items, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      serialNo: idx + 1,
    }))
    setContent((current) => ({ ...current, items: moved }))
  }

  async function saveDraft() {
    setSaving(true)
    try {
      const response = await fetch(`/api/lead/${leadId}/electrical-quotation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Unable to save quotation')
      setHasDraft(true)
      toast.success('Electrical quotation draft saved')
      onDraftSaved?.()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save quotation')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function downloadPdf() {
    setDownloading(true)
    try {
      await downloadPdfFromDocument(
        <ElectricalQuotationDocument content={content} leadName={leadName} leadLocation={leadLocation} />,
        `Electrical-Quotation-${leadName.replace(/[^a-z0-9]+/gi, '-')}.pdf`
      )
      toast.success('Electrical quotation PDF downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download quotation')
    } finally {
      setDownloading(false)
    }
  }

  async function createSavedItem() {
    if (!newItem.name.trim()) {
      toast.error('Item name is required')
      return
    }
    try {
      const response = await fetch('/api/electrical-quotation-saved-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem.name.trim(),
          description: newItem.description.trim(),
          quantity: newItem.quantity ? Number(newItem.quantity) : 0,
          unit: newItem.unit.trim() || 'NOS',
          rate: newItem.rate ? Number(newItem.rate) : 0,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Failed to save item')
      const created = payload.item as SavedItem
      setSavedItems((cur) => [...cur, created])
      addSavedItemToDraft(created)
      setNewItemOpen(false)
      setNewItem({ name: '', description: '', quantity: '', unit: 'NOS', rate: '' })
      toast.success('Saved to library and added to quotation')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save item')
    }
  }

  async function saveItemToLibrary(item: ElectricalQuotationItem) {
    if (!item.name.trim()) {
      toast.error('Item name cannot be empty')
      return
    }
    try {
      const response = await fetch('/api/electrical-quotation-saved-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name.trim(),
          description: item.description?.trim() || '',
          quantity: item.quantity ?? 0,
          unit: item.unit?.trim() || 'NOS',
          rate: item.rate ?? 0,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Failed to save item')
      setSavedItems((cur) => [...cur, payload.item as SavedItem])
      toast.success(`"${item.name}" saved to library for reuse`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save item to library')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
          Loading electrical quotation…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5 pb-32">
      {/* Top Bar Summary */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-3.5 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <Badge variant={hasDraft ? 'default' : 'secondary'}>{hasDraft ? 'Draft saved' : 'New draft'}</Badge>
          <div className="text-sm">
            <span className="font-semibold text-foreground">
              Grand total: {money(grandTotal)}
            </span>
            {isApproximate && <span className="ml-1 text-xs text-muted-foreground font-medium">(Approximate)</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery('')
                setPickerOpen(true)
              }}
            >
              <Search className="mr-1.5 h-4 w-4" />
              Add from saved items
            </Button>
          )}
          {canEdit && (
            <Button type="button" variant="outline" size="sm" onClick={addBlankItem}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add item
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadPdf}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            Download PDF
          </Button>
          {canEdit && (
            <Button type="button" size="sm" onClick={() => void saveDraft()} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save draft
            </Button>
          )}
        </div>
      </div>

      {/* Header Info */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
          <div>
            <CardTitle>Electrical Quotation</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Add electrical scopes from saved items or create custom items. Quantities and unit prices are optional; you can also use an approximate grand total.
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm font-medium">
            <span>Quotation for</span>
            <Input value={leadName} readOnly className="bg-muted/50" />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Address</span>
            <Input value={leadLocation ?? ''} readOnly placeholder="No address on lead" className="bg-muted/50" />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Date</span>
            <Input
              type="date"
              value={content.quotationDate}
              disabled={!canEdit}
              onChange={(e) => setContent((c) => ({ ...c, quotationDate: e.target.value }))}
            />
          </label>
          <label className="space-y-1 text-sm font-medium sm:col-span-3">
            <span>Subject</span>
            <Input
              value={content.subject}
              disabled={!canEdit}
              placeholder="e.g. Quotation for Electrical work."
              onChange={(e) => setContent((c) => ({ ...c, subject: e.target.value }))}
            />
          </label>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-lg">Electrical items</CardTitle>
            <p className="text-xs text-muted-foreground">
              {content.items.length} item(s) · {isApproximate ? `approximate grand total ${money(grandTotal)}` : `calculated total ${money(calculatedSum)}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Button type="button" size="sm" onClick={addBlankItem}>
                <Plus className="mr-1 h-4 w-4" />
                Add item
              </Button>
            )}
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery('')
                  setPickerOpen(true)
                }}
              >
                <Search className="mr-1 h-4 w-4" />
                Add from saved items
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {content.items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <Layers className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-2 text-sm font-medium">No electrical items added yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start by adding standard items from the saved library with one click, or add a new custom item.
              </p>
              {canEdit && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery('')
                      setPickerOpen(true)
                    }}
                  >
                    <Search className="mr-1.5 h-4 w-4" />
                    Add from saved items
                  </Button>
                  <Button type="button" size="sm" onClick={addBlankItem}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add new item
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={reorder}
            >
              <SortableContext
                items={content.items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {content.items.map((item, index) => (
                    <SortableItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      disabled={!canEdit}
                      units={units}
                      onPatch={(patch) => patchItem(item.id, patch)}
                      onRemove={() =>
                        setContent((current) => ({
                          ...current,
                          items: current.items
                            .filter((row) => row.id !== item.id)
                            .map((row, pos) => ({ ...row, serialNo: pos + 1 })),
                        }))
                      }
                      onSaveToLibrary={() => void saveItemToLibrary(item)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Pricing, Exclusions & Notes */}
      <Card>
        <CardContent className="grid gap-6 py-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Excluded items</span>
              <Textarea
                className="text-xs"
                rows={3}
                value={content.excludedItems}
                disabled={!canEdit}
                placeholder="e.g. All AC Units, Ceiling Fans, Chandeliers, Fireplace and Decorative Light."
                onChange={(e) => setContent((c) => ({ ...c, excludedItems: e.target.value }))}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Notes &amp; Terms</span>
              <Textarea
                className="text-xs"
                rows={3}
                value={content.notes}
                disabled={!canEdit}
                placeholder="Payment terms, delivery schedules, etc."
                onChange={(e) => setContent((c) => ({ ...c, notes: e.target.value }))}
              />
            </label>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Total &amp; Pricing Mode
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calculated items total:</span>
                <span className="font-semibold">{money(calculatedSum)}</span>
              </div>
            </div>

            <div className="rounded-lg border bg-background p-3.5 space-y-3">
              <div className="flex items-center justify-between space-x-2">
                <label
                  htmlFor="approx-toggle"
                  className="text-xs font-semibold leading-none cursor-pointer"
                >
                  Use approximate grand total
                </label>
                <Switch
                  id="approx-toggle"
                  checked={Boolean(content.useApproximateTotal)}
                  disabled={!canEdit}
                  onCheckedChange={(checked: boolean) =>
                    setContent((c) => ({ ...c, useApproximateTotal: checked }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Approximate Grand Total (৳)</span>
                  {calculatedSum > 0 && canEdit && (
                    <button
                      type="button"
                      className="text-[11px] text-primary underline"
                      onClick={() =>
                        setContent((c) => ({
                          ...c,
                          useApproximateTotal: true,
                          approximateGrandTotal: calculatedSum,
                        }))
                      }
                    >
                      Use calculated
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 1020000"
                  value={content.approximateGrandTotal ?? ''}
                  disabled={!canEdit}
                  onChange={(e) => {
                    const val = e.target.value
                    setContent((c) => ({
                      ...c,
                      useApproximateTotal: true,
                      approximateGrandTotal: val === '' ? null : Number(val) || 0,
                    }))
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Optional. If individual item prices are blank, this amount will be used as the grand total.
                </p>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">Grand Total:</span>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{money(grandTotal)}</p>
                  {isApproximate && (
                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      Approximate Total
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dedicated Bottom Section with all buttons */}
      <Card className="border-primary/20 bg-gradient-to-r from-background via-muted/20 to-background">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">
              {content.items.length} quotation item(s) · Grand total {money(grandTotal)}
              {isApproximate ? ' (Approx.)' : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              Save your draft changes or download the official electrical quotation PDF.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuery('')
                  setPickerOpen(true)
                }}
              >
                <Search className="mr-1.5 h-4 w-4" />
                Add from saved items
              </Button>
            )}
            {canEdit && (
              <Button type="button" variant="outline" onClick={addBlankItem}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add item
              </Button>
            )}
            {canEdit && (
              <Button type="button" onClick={() => void saveDraft()} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save draft
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={downloadPdf}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fixed Floating Bottom Bar for Quick Access on Scroll */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:inline-flex">
              {content.items.length} item(s)
            </Badge>
            <div>
              <p className="text-xs text-muted-foreground">Grand total</p>
              <p className="font-bold text-foreground">
                {money(grandTotal)}
                {isApproximate && <span className="ml-1 text-xs font-normal text-muted-foreground">(Approx.)</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery('')
                  setPickerOpen(true)
                }}
              >
                <Search className="mr-1.5 h-4 w-4" />
                Saved items
              </Button>
            )}
            {canEdit && (
              <Button type="button" variant="outline" size="sm" onClick={addBlankItem}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Item
              </Button>
            )}
            {canEdit && (
              <Button type="button" size="sm" onClick={() => void saveDraft()} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save draft
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadPdf}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Picker Dialog: Add from Saved Items */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add from saved items</DialogTitle>
            <DialogDescription>
              Click any item below to add it directly to your electrical quotation with 1 click.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search electrical items..."
              />
            </div>
            {savedItems.length > 0 && (
              <Button type="button" variant="secondary" size="sm" onClick={addAllSavedItems}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add all standard items
              </Button>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-2 pr-1">
            {filteredSavedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {item.unit || 'NOS'}
                    </Badge>
                  </div>
                  {item.description ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground line-clamp-3">
                      {item.description}
                    </p>
                  ) : null}
                  {(item.quantity > 0 || item.rate > 0) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.quantity > 0 ? `${item.quantity} ${item.unit} · ` : ''}
                      {item.rate > 0 ? `${money(item.rate)} per unit` : ''}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => addSavedItemToDraft(item)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>
            ))}

            {filteredSavedItems.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No saved items match your search.
              </p>
            )}
          </div>

          <DialogFooter className="flex sm:justify-between items-center gap-2 border-t pt-3">
            <span className="text-xs text-muted-foreground">
              {filteredSavedItems.length} available item(s) in library
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setNewItemOpen(true)}>
                <BookmarkPlus className="mr-1.5 h-4 w-4" />
                Create custom saved item
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPickerOpen(false)}>
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create a new saved item */}
      <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create new electrical saved item</DialogTitle>
            <DialogDescription>
              Save an item to the shared electrical library and immediately add it to your quotation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Item name</span>
              <Input
                placeholder="e.g. 12W LED Panel Light"
                value={newItem.name}
                onChange={(e) => setNewItem((cur) => ({ ...cur, name: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Unit</span>
              <Select
                value={newItem.unit}
                onValueChange={(unit) => setNewItem((cur) => ({ ...cur, unit }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Default unit price (৳) (optional)</span>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={newItem.rate}
                onChange={(e) => setNewItem((cur) => ({ ...cur, rate: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Scope of work / Specification</span>
              <Textarea
                rows={3}
                placeholder="Specification, brand, installation details..."
                value={newItem.description}
                onChange={(e) => setNewItem((cur) => ({ ...cur, description: e.target.value }))}
              />
            </label>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setNewItemOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void createSavedItem()}>
              Save &amp; add to quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
