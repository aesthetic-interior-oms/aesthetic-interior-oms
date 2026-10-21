'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { BookmarkPlus, Download, GripVertical, Loader2, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FurnitureQuotationDocument } from '@/components/crm/quotation/pdf/FurnitureQuotationDocument'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import { buildDefaultFurnitureQuotationContent, FURNITURE_QUOTATION_UNITS, type FurnitureQuotationContent, type FurnitureQuotationItem } from '@/lib/furniture-quotation-template'

type Props = { leadId: string; leadName: string; leadLocation: string | null; onDraftSaved?: () => void }
type Section = FurnitureQuotationItem['section']
type SavedItem = FurnitureQuotationItem & { createdAt?: string }
const SECTION_NAMES: Section[] = ['Furniture', 'Electrical Item']
const money = (value: number) => `৳${Math.round(value).toLocaleString('en-BD')}`

function SortableItemRow({ item, index, disabled, units, onPatch, onRemove, onSaveToLibrary }: {
  item: FurnitureQuotationItem
  index: number
  disabled: boolean
  units: string[]
  onPatch: (patch: Partial<FurnitureQuotationItem>) => void
  onRemove: () => void
  onSaveToLibrary: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return <div ref={setNodeRef} style={style} className={`rounded-lg border bg-card p-3 ${isDragging ? 'z-10 opacity-70 shadow-lg' : ''}`}>
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" aria-label="Drag to change item order" className="cursor-grab touch-none" disabled={disabled} {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></Button>
        <Badge variant="outline">Serial No. {String(item.serialNo ?? index + 1).padStart(2, '0')}</Badge>
      </div>
      <div className="flex items-center gap-1">
        {!disabled && <Button type="button" variant="ghost" size="sm" onClick={onSaveToLibrary}><BookmarkPlus className="mr-1 h-4 w-4" />Save item</Button>}
        {!disabled && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${item.name || 'item'}`} onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>}
      </div>
    </div>
    <div className="grid gap-3 lg:grid-cols-[minmax(180px,1.2fr)_minmax(240px,2fr)_90px_140px_130px_130px]">
      <label className="space-y-1 text-xs"><span>Name</span><Input value={item.name} disabled={disabled} onChange={(e) => onPatch({ name: e.target.value })} /></label>
      <label className="space-y-1 text-xs"><span>Description / materials</span><Textarea className="min-h-10" value={item.description} disabled={disabled} onChange={(e) => onPatch({ description: e.target.value })} /></label>
      <label className="space-y-1 text-xs"><span>Quantity</span><Input type="number" min="0" step="any" value={item.quantity} disabled={disabled} onChange={(e) => onPatch({ quantity: Number(e.target.value) || 0 })} /></label>
      <label className="space-y-1 text-xs"><span>Unit</span><Select value={item.unit} disabled={disabled} onValueChange={(unit) => onPatch({ unit })}><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger><SelectContent>{units.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent></Select></label>
      <label className="space-y-1 text-xs"><span>Unit price (৳)</span><Input type="number" min="0" step="any" value={item.rate} disabled={disabled} onChange={(e) => onPatch({ rate: Number(e.target.value) || 0 })} /></label>
      <div className="space-y-1 text-xs"><span className="block">Total</span><div className="flex h-10 items-center rounded-md bg-muted px-3 text-sm font-semibold">{money(item.quantity * item.rate)}</div></div>
    </div>
  </div>
}

export function FurnitureQuotationBuilder({ leadId, leadName, leadLocation, onDraftSaved }: Props) {
  const [content, setContent] = useState<FurnitureQuotationContent>(() => buildDefaultFurnitureQuotationContent())
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [newItemOpen, setNewItemOpen] = useState(false)
  const [saveItem, setSaveItem] = useState<FurnitureQuotationItem | null>(null)
  const [pickerSection, setPickerSection] = useState<Section>('Furniture')
  const [query, setQuery] = useState('')
  const [newItem, setNewItem] = useState<FurnitureQuotationItem>({ id: '', section: 'Furniture', name: '', description: '', quantity: 1, unit: 'Nos', rate: 0 })
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  async function loadSavedItems() {
    const response = await fetch('/api/furniture-quotation-saved-items', { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Unable to load saved items')
    setSavedItems(payload.items as SavedItem[])
  }

  useEffect(() => {
    let active = true
    Promise.all([
      fetch(`/api/lead/${leadId}/furniture-quotation`, { cache: 'no-store' }).then(async (response) => {
        const payload = await response.json()
        if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Unable to load furniture quotation')
        return payload
      }),
      fetch('/api/furniture-quotation-saved-items', { cache: 'no-store' }).then(async (response) => {
        const payload = await response.json()
        if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Unable to load saved items')
        return payload
      }),
    ]).then(([draftPayload, savedPayload]) => {
      if (!active) return
      setContent(draftPayload.data.content)
      setCanEdit(Boolean(draftPayload.data.canEdit))
      setHasDraft(Boolean(draftPayload.data.draft))
      setSavedItems(savedPayload.items as SavedItem[])
    }).catch((error) => { if (active) toast.error(error instanceof Error ? error.message : 'Unable to load furniture quotation') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [leadId])

  const totals = useMemo(() => {
    const sum = (section: Section) => content.items.filter((item) => item.section === section).reduce((total, item) => total + item.quantity * item.rate, 0)
    return { furniture: sum('Furniture'), electrical: sum('Electrical Item'), grand: content.items.reduce((total, item) => total + item.quantity * item.rate, 0) }
  }, [content.items])
  const units = useMemo(() => Array.from(new Set([...FURNITURE_QUOTATION_UNITS, ...savedItems.map((item) => item.unit), ...content.items.map((item) => item.unit)])), [savedItems, content.items])
  const filteredSavedItems = useMemo(() => savedItems.filter((item) => item.section === pickerSection && `${item.name} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase())), [savedItems, pickerSection, query])

  function patchItem(id: string, patch: Partial<FurnitureQuotationItem>) {
    setContent((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item) }))
  }

  function addDraftItem(item: SavedItem, section: Section = item.section) {
    const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setContent((current) => ({ ...current, showElectricalSection: current.showElectricalSection || section === 'Electrical Item', items: [...current.items, { ...item, id, section, serialNo: current.items.filter((row) => row.section === section).length + 1 }] }))
  }

  function addBlankDraftItem(section: Section) {
    const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setContent((current) => ({
      ...current,
      showElectricalSection: current.showElectricalSection || section === 'Electrical Item',
      items: [...current.items, {
        id,
        section,
        name: '',
        description: '',
        quantity: 1,
        unit: 'Nos',
        rate: 0,
        serialNo: current.items.filter((item) => item.section === section).length + 1,
      }],
    }))
  }

  function reorder(section: Section, event: DragEndEvent) {
    const sourceItems = content.items.filter((item) => item.section === section)
    const oldIndex = sourceItems.findIndex((item) => item.id === event.active.id)
    const newIndex = sourceItems.findIndex((item) => item.id === event.over?.id)
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
    const moved = arrayMove(sourceItems, oldIndex, newIndex).map((item, index) => ({ ...item, serialNo: index + 1 }))
    let movedIndex = 0
    setContent((current) => ({ ...current, items: current.items.map((item) => item.section === section ? moved[movedIndex++] : item) }))
  }

  async function saveDraft() {
    setSaving(true)
    try {
      const response = await fetch(`/api/lead/${leadId}/furniture-quotation`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
      const payload = await response.json()
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Unable to save quotation')
      setHasDraft(true)
      toast.success('Furniture quotation draft saved')
      onDraftSaved?.()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save quotation')
      return false
    } finally { setSaving(false) }
  }

  const saveDraftRef = useRef(saveDraft)
  saveDraftRef.current = saveDraft

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (canEdit && !saving) {
          void saveDraftRef.current()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canEdit, saving])

  async function downloadPdf() {
    setDownloading(true)
    try {
      await downloadPdfFromDocument(<FurnitureQuotationDocument content={content} leadName={leadName} leadLocation={leadLocation} />, `Furniture-Quotation-${leadName.replace(/[^a-z0-9]+/gi, '-')}.pdf`)
      toast.success('Furniture quotation downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download quotation')
    } finally { setDownloading(false) }
  }

  async function createSavedItem(input: FurnitureQuotationItem) {
    if (!input.name.trim()) { toast.error('Enter a saved item name'); return false }
    try {
      const response = await fetch('/api/furniture-quotation-saved-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      const payload = await response.json()
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? 'Unable to save item')
      const item = payload.item as SavedItem
      setSavedItems((current) => [...current, item])
      toast.success('Saved item added to the shared list')
      return true
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save item'); return false }
  }

  function openAddSavedItem(section: Section = 'Furniture') {
    setNewItem({ id: '', section, name: '', description: '', quantity: 1, unit: 'Nos', rate: 0 })
    setNewItemOpen(true)
  }

  async function submitNewSavedItem() {
    const succeeded = await createSavedItem(newItem)
    if (!succeeded) return
    const section = newItem.section
    const item = { ...newItem, id: `new-${Date.now()}` }
    setContent((current) => ({ ...current, showElectricalSection: current.showElectricalSection || section === 'Electrical Item', items: [...current.items, { ...item, serialNo: current.items.filter((row) => row.section === section).length + 1 }] }))
    setNewItemOpen(false)
  }

  async function saveCurrentAsSavedItem(item: FurnitureQuotationItem) {
    const saved = await createSavedItem({ ...item, id: '' })
    if (saved) toast.info('This item is now available from Add from Saved Items')
  }

  if (loading) return <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading furniture quotation…</CardContent></Card>

  const sections = (['Furniture', ...(content.showElectricalSection ? ['Electrical Item'] : [])] as Section[])
  return <div className="space-y-4 pb-28">
    <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2"><Badge variant={hasDraft ? 'default' : 'secondary'}>{hasDraft ? 'Draft saved' : 'New draft'}</Badge><span className="text-sm font-semibold">Grand total {money(totals.grand)}</span></div>
      <div className="flex flex-wrap gap-2">
        {canEdit && <Button type="button" variant="outline" onClick={() => { setPickerSection('Furniture'); setQuery(''); setPickerOpen(true) }}><Search className="mr-2 h-4 w-4" />Add from saved items</Button>}
        {canEdit && !content.showElectricalSection && <Button type="button" variant="outline" onClick={() => setContent((current) => ({ ...current, showElectricalSection: true }))}><Plus className="mr-2 h-4 w-4" />Add electrical items</Button>}
        <Button type="button" variant="outline" onClick={downloadPdf} disabled={downloading}>{downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download furniture quotation</Button>
      </div>
    </div>

    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>Furniture Quotation</CardTitle><p className="mt-1 text-sm text-muted-foreground">Start with an empty quotation, then add reusable items from the saved list.</p></div></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm"><span className="font-medium">Quotation for</span><Input value={leadName} readOnly /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Address</span><Input value={leadLocation ?? ''} readOnly placeholder="No address on lead" /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Date</span><Input type="date" value={content.quotationDate} disabled={!canEdit} onChange={(e) => setContent((c) => ({ ...c, quotationDate: e.target.value }))} /></label>
        <label className="space-y-1 text-sm sm:col-span-3"><span className="font-medium">Subject</span><Input value={content.subject} disabled={!canEdit} onChange={(e) => setContent((c) => ({ ...c, subject: e.target.value }))} /></label>
      </CardContent>
    </Card>

    {sections.map((section) => {
      const items = content.items.filter((item) => item.section === section)
      const sectionTotal = section === 'Furniture' ? totals.furniture : totals.electrical
      return <Card key={section}>
        <CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle className="text-lg">{section}</CardTitle><p className="text-sm text-muted-foreground">{items.length} items · {money(sectionTotal)}</p></div><div className="flex flex-wrap gap-2">{canEdit && <Button type="button" size="sm" onClick={() => addBlankDraftItem(section)}><Plus className="mr-1 h-4 w-4" />Add Item</Button>}{canEdit && <Button type="button" variant="outline" size="sm" onClick={() => { setPickerSection(section); setQuery(''); setPickerOpen(true) }}><Search className="mr-1 h-4 w-4" />Add from saved items</Button>}{canEdit && <Button type="button" variant="ghost" size="sm" onClick={() => openAddSavedItem(section)}><BookmarkPlus className="mr-1 h-4 w-4" />New saved item</Button>}</div></CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No items yet. Add items from the saved list.</div> : null}
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={(event) => reorder(section, event)}>
            <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">{items.map((item, index) => <SortableItemRow key={item.id} item={item} index={index} disabled={!canEdit} units={units} onPatch={(patch) => patchItem(item.id, patch)} onRemove={() => setContent((current) => ({ ...current, items: current.items.filter((row) => row.id !== item.id).map((row, position) => row.section === section ? { ...row, serialNo: current.items.filter((entry) => entry.section === section && entry.id !== item.id).findIndex((entry) => entry.id === row.id) + 1 } : row) }))} onSaveToLibrary={() => void saveCurrentAsSavedItem(item)} />)}</div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    })}

    {content.showElectricalSection && canEdit ? <div className="flex justify-end"><Button type="button" variant="ghost" size="sm" onClick={() => setContent((current) => ({ ...current, showElectricalSection: false, items: current.items.filter((item) => item.section !== 'Electrical Item') }))}><X className="mr-1 h-4 w-4" />Remove electrical items section</Button></div> : null}
    <Card><CardContent className="grid gap-4 py-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className="space-y-1 text-sm"><span className="font-medium">Notes</span><Textarea value={content.notes} disabled={!canEdit} onChange={(e) => setContent((c) => ({ ...c, notes: e.target.value }))} placeholder="Optional quotation notes" /></label>
      <div className="min-w-64 space-y-2 text-right"><p className="text-sm">Furniture subtotal <strong>{money(totals.furniture)}</strong></p>{content.showElectricalSection ? <p className="text-sm">Electrical items subtotal <strong>{money(totals.electrical)}</strong></p> : null}<p className="border-t pt-2 text-lg font-bold">Grand total {money(totals.grand)}</p></div>
    </CardContent></Card>

    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-2">
        <div><p className="text-xs text-muted-foreground">{content.items.length} quotation item(s)</p><p className="font-semibold">Grand total {money(totals.grand)}</p></div>
        <div className="flex flex-wrap gap-2">{canEdit && <Button type="button" variant="outline" onClick={() => { setPickerSection('Furniture'); setQuery(''); setPickerOpen(true) }}><Search className="mr-2 h-4 w-4" />Saved items</Button>}{canEdit && <Button type="button" variant="outline" onClick={() => addBlankDraftItem('Furniture')}><Plus className="mr-2 h-4 w-4" />Add Item</Button>}{canEdit && <Button type="button" onClick={() => void saveDraft()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save draft</Button>}<Button type="button" variant="outline" onClick={downloadPdf} disabled={downloading}>{downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download furniture quotation</Button></div>
      </div>
    </div>

    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader><DialogTitle>Add from saved items</DialogTitle><DialogDescription>Select a saved item to copy its name, description, quantity, unit, and rate into this quotation.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]"><Select value={pickerSection} onValueChange={(value) => setPickerSection(value as Section)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SECTION_NAMES.map((section) => <SelectItem key={section} value={section}>{section}</SelectItem>)}</SelectContent></Select><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved items" /></div></div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-2">
          {filteredSavedItems.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="text-sm font-semibold">{item.name}</p>{item.description ? <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{item.description}</p> : null}<p className="mt-1 text-xs text-muted-foreground">{item.quantity} {item.unit} · {money(item.rate)} per unit</p></div><Button type="button" size="sm" onClick={() => { addDraftItem(item, pickerSection); setPickerOpen(false) }}><Plus className="mr-1 h-4 w-4" />Add</Button></div>)}
          {filteredSavedItems.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No saved items match your search.</p> : null}
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => openAddSavedItem(pickerSection)}>Create a saved item</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>New furniture saved item</DialogTitle><DialogDescription>Save this item to the shared library and add it to the current quotation.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm"><span>Section</span><Select value={newItem.section} onValueChange={(section) => setNewItem((item) => ({ ...item, section: section as Section }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SECTION_NAMES.map((section) => <SelectItem key={section} value={section}>{section}</SelectItem>)}</SelectContent></Select></label>
          <label className="space-y-1 text-sm"><span>Name</span><Input value={newItem.name} onChange={(e) => setNewItem((item) => ({ ...item, name: e.target.value }))} /></label>
          <label className="space-y-1 text-sm"><span>Quantity</span><Input type="number" min="0" step="any" value={newItem.quantity} onChange={(e) => setNewItem((item) => ({ ...item, quantity: Number(e.target.value) || 0 }))} /></label>
          <label className="space-y-1 text-sm"><span>Unit</span><Select value={newItem.unit} onValueChange={(unit) => setNewItem((item) => ({ ...item, unit }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{units.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent></Select></label>
          <label className="space-y-1 text-sm"><span>Unit price (৳)</span><Input type="number" min="0" step="any" value={newItem.rate} onChange={(e) => setNewItem((item) => ({ ...item, rate: Number(e.target.value) || 0 }))} /></label>
          <label className="space-y-1 text-sm sm:col-span-2"><span>Description / materials</span><Textarea value={newItem.description} onChange={(e) => setNewItem((item) => ({ ...item, description: e.target.value }))} /></label>
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setNewItemOpen(false)}>Cancel</Button><Button type="button" onClick={() => void submitNewSavedItem()}>Save item and add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
