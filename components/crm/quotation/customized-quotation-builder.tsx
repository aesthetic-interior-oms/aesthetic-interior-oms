'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  Loader2,
  Plus,
  Save,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  Edit2,
  FolderPlus,
  Check,
  GripVertical,
} from 'lucide-react'
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import { CustomizedQuotationDocument } from '@/components/crm/quotation/pdf/CustomizedQuotationDocument'
import {
  buildDefaultCustomizedQuotationContent,
  calculateCustomizedQuotationTotals,
  type CustomizedQuotationContent,
  type CustomizedQuotationLineItem,
  type CustomizedQuotationUnit,
  DEFAULT_CUSTOMIZED_TITLE,
} from '@/lib/customized-quotation-types'

type QuotationDraftItem = {
  id: string
  draftKey: string
  title: string
  grandTotal: number
  projectSqft: number | null
  content: CustomizedQuotationContent
  updatedAt: string
}

type Props = {
  leadId: string
  leadName: string
  leadLocation: string | null
  leadSubStatus: string | null
  onDraftSaved?: () => void
}

const money = (value: number) => `৳${Math.round(value).toLocaleString('en-BD')}`

// Sortable Product Row Component
function SortableProductRow({
  line,
  slNumber,
  canEdit,
  onUpdateLine,
  onDuplicateLine,
  onDeleteLine,
}: {
  line: CustomizedQuotationLineItem
  slNumber: string
  canEdit: boolean
  onUpdateLine: (lineId: string, patch: Partial<CustomizedQuotationLineItem>) => void
  onDuplicateLine: (line: CustomizedQuotationLineItem) => void
  onDeleteLine: (lineId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: line.id,
    disabled: !canEdit,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-muted/20 transition-colors ${isDragging ? 'bg-muted/40 shadow-xs' : ''}`}
    >
      <td className="px-2 py-2 text-center w-12">
        <div className="flex items-center justify-center gap-1">
          {canEdit && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none p-0.5 rounded"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <span className="font-bold text-xs text-muted-foreground">{slNumber}</span>
        </div>
      </td>
      <td className="px-3 py-2 min-w-[180px]">
        {canEdit ? (
          <Input
            type="text"
            value={line.description}
            onChange={(e) => onUpdateLine(line.id, { description: e.target.value })}
            placeholder="Product name"
            className="h-7 text-xs font-medium"
          />
        ) : (
          <span className="font-medium text-xs">{line.description}</span>
        )}
      </td>
      <td className="px-3 py-2 min-w-[240px]">
        {canEdit ? (
          <Textarea
            value={line.materials ?? ''}
            onChange={(e) => onUpdateLine(line.id, { materials: e.target.value })}
            placeholder="Specifications & material details"
            className="min-h-[30px] h-7 text-xs py-1"
            rows={1}
          />
        ) : (
          <span className="text-muted-foreground text-xs">{line.materials || '—'}</span>
        )}
      </td>
      <td className="px-3 py-2 w-[120px]">
        {canEdit ? (
          <Input
            type="text"
            inputMode="decimal"
            value={line.rate > 0 ? String(line.rate) : ''}
            onChange={(e) =>
              onUpdateLine(line.id, { rate: Number(e.target.value.replace(/,/g, '')) || 0 })
            }
            placeholder="0"
            className="h-7 text-xs text-right"
          />
        ) : (
          <span className="text-right block text-xs">{line.rate > 0 ? line.rate.toLocaleString() : '—'}</span>
        )}
      </td>
      <td className="px-3 py-2 w-[160px]">
        {canEdit ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="text"
              inputMode="decimal"
              value={line.quantity > 0 ? String(line.quantity) : ''}
              onChange={(e) =>
                onUpdateLine(line.id, {
                  quantity: Number(e.target.value.replace(/,/g, '')) || 0,
                })
              }
              placeholder="Qty"
              className="h-7 text-xs flex-1 min-w-[55px]"
            />
            <Select
              value={line.unit || 'sqft'}
              onValueChange={(val) => onUpdateLine(line.id, { unit: val as CustomizedQuotationUnit })}
            >
              <SelectTrigger className="h-7 text-[11px] px-1.5 w-[70px] font-semibold bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sqft" className="font-semibold text-emerald-700">sqft</SelectItem>
                <SelectItem value="nos" className="font-semibold text-blue-700">nos</SelectItem>
                <SelectItem value="ls">ls</SelectItem>
                <SelectItem value="rft">rft</SelectItem>
                <SelectItem value="rmt">rmt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span className="font-medium text-xs">
            {line.quantity} {line.unit}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right font-bold text-xs text-slate-900 dark:text-slate-100 w-[120px]">
        {canEdit && line.unit === 'ls' ? (
          <Input
            type="text"
            inputMode="decimal"
            value={line.amount > 0 ? String(line.amount) : ''}
            onChange={(e) =>
              onUpdateLine(line.id, {
                amount: Number(e.target.value.replace(/,/g, '')) || 0,
              })
            }
            placeholder="Total"
            className="h-7 text-xs text-right font-bold"
          />
        ) : (
          money(line.amount)
        )}
      </td>
      {canEdit && (
        <td className="px-2 py-2 text-center w-16">
          <div className="flex items-center justify-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onDuplicateLine(line)}
              title="Duplicate product"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
              onClick={() => onDeleteLine(line.id)}
              title="Delete product"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  )
}

export function CustomizedQuotationBuilder({
  leadId,
  leadName,
  leadLocation,
  onDraftSaved,
}: Props) {
  // Client mount check to eliminate hydration mismatches (Error #418)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [canEdit, setCanEdit] = useState(true)

  const [quotations, setQuotations] = useState<QuotationDraftItem[]>([])
  const [activeDraftKey, setActiveDraftKey] = useState<string>('customized:default')
  const [activeContent, setActiveContent] = useState<CustomizedQuotationContent | null>(null)
  const [defaultSqftInput, setDefaultSqftInput] = useState<string>('')

  // Active floor and area tracking for bottom quick access
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null)
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)

  // New quotation modal
  const [newQuotationModalOpen, setNewQuotationModalOpen] = useState(false)
  const [newQuotationTitle, setNewQuotationTitle] = useState('')
  const [creatingQuotation, setCreatingQuotation] = useState(false)

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitleText, setEditingTitleText] = useState('')

  // Snapshot for dirty checking
  const lastSavedSnapshotRef = useRef<string>('')

  // DnD sensors
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load all customized quotations for this lead
  const loadQuotations = useCallback(async (preferredDraftKey?: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/lead/${leadId}/customized-quotation`, { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok || !payload?.success || !Array.isArray(payload.data?.quotations)) {
        throw new Error(payload?.error ?? 'Failed to load customized quotations')
      }

      const list: QuotationDraftItem[] = payload.data.quotations
      setQuotations(list)
      setCanEdit(Boolean(payload.data.canEdit))

      if (list.length > 0) {
        const target = preferredDraftKey
          ? list.find((q) => q.draftKey === preferredDraftKey) || list[0]
          : list[0]

        setActiveDraftKey(target.draftKey)
        const content = target.content || buildDefaultCustomizedQuotationContent({ clientName: leadName, clientAddress: leadLocation ?? '' })
        if (!content.subject?.trim()) {
          content.subject = 'Quotation for Customize section work'
        }
        setActiveContent(content)
        setDefaultSqftInput(content.projectSqft ? String(content.projectSqft) : '')
        lastSavedSnapshotRef.current = JSON.stringify(content)

        if (content.sections?.length > 0) {
          setSelectedFloorId(content.sections[0].id)
          const firstArea = content.areas?.find((a) => a.floorId === content.sections[0].id)
          if (firstArea) setSelectedAreaId(firstArea.id)
        }
      } else {
        const def = buildDefaultCustomizedQuotationContent({ clientName: leadName, clientAddress: leadLocation ?? '' })
        setActiveContent(def)
        lastSavedSnapshotRef.current = JSON.stringify(def)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error loading quotations')
    } finally {
      setLoading(false)
    }
  }, [leadId, leadName, leadLocation])

  useEffect(() => {
    if (mounted) {
      void loadQuotations()
    }
  }, [mounted, loadQuotations])

  // Calculated totals for current active content
  const totals = useMemo(() => {
    if (!activeContent) return { subtotal: 0, grandTotal: 0, totalSqft: 0, totalNos: 0, itemCount: 0 }
    return calculateCustomizedQuotationTotals(activeContent)
  }, [activeContent])

  // Switch between customized quotations
  const handleSwitchQuotation = (draftKey: string) => {
    if (draftKey === activeDraftKey) return
    const target = quotations.find((q) => q.draftKey === draftKey)
    if (!target) return

    setActiveDraftKey(draftKey)
    const content = { ...target.content }
    if (!content.subject?.trim()) {
      content.subject = 'Quotation for Customize section work'
    }
    setActiveContent(content)
    setDefaultSqftInput(target.content.projectSqft ? String(target.content.projectSqft) : '')
    lastSavedSnapshotRef.current = JSON.stringify(content)

    if (target.content.sections?.length > 0) {
      setSelectedFloorId(target.content.sections[0].id)
      const firstArea = target.content.areas?.find((a) => a.floorId === target.content.sections[0].id)
      if (firstArea) setSelectedAreaId(firstArea.id)
    }
  }

  // Save current active quotation
  const handleSaveDraft = useCallback(async () => {
    if (!activeContent || !canEdit || saving) return
    setSaving(true)
    try {
      const parsedSqft = Number(defaultSqftInput.replace(/,/g, ''))
      const sqftVal = Number.isFinite(parsedSqft) && parsedSqft > 0 ? parsedSqft : null

      const contentToSave: CustomizedQuotationContent = {
        ...activeContent,
        projectSqft: sqftVal,
        clientName: activeContent.clientName || leadName,
        clientAddress: activeContent.clientAddress || leadLocation || '',
      }

      const res = await fetch(`/api/lead/${leadId}/customized-quotation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftKey: activeDraftKey,
          content: contentToSave,
          projectSqft: sqftVal,
          grandTotal: totals.grandTotal,
        }),
      })

      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to save quotation draft')
      }

      lastSavedSnapshotRef.current = JSON.stringify(contentToSave)
      setQuotations((prev) =>
        prev.map((q) =>
          q.draftKey === activeDraftKey
            ? {
                ...q,
                title: contentToSave.title,
                grandTotal: totals.grandTotal,
                projectSqft: sqftVal,
                content: contentToSave,
                updatedAt: new Date().toISOString(),
              }
            : q,
        ),
      )

      toast.success(`Saved "${contentToSave.title || 'Quotation'}"`)
      onDraftSaved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save quotation')
    } finally {
      setSaving(false)
    }
  }, [activeContent, canEdit, saving, defaultSqftInput, leadId, leadName, leadLocation, activeDraftKey, totals.grandTotal, onDraftSaved])

  // Keyboard shortcut Ctrl/Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSaveDraft()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSaveDraft])

  // Create new customized quotation
  const handleCreateNewQuotation = async () => {
    if (!newQuotationTitle.trim() || creatingQuotation) return
    setCreatingQuotation(true)
    try {
      const res = await fetch(`/api/lead/${leadId}/customized-quotation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newQuotationTitle.trim() }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success || !payload.data?.quotation) {
        throw new Error(payload?.error ?? 'Failed to create quotation')
      }

      const created: QuotationDraftItem = payload.data.quotation
      setQuotations((prev) => [...prev, created])
      setActiveDraftKey(created.draftKey)
      setActiveContent(created.content)
      setDefaultSqftInput('')
      lastSavedSnapshotRef.current = JSON.stringify(created.content)
      setNewQuotationModalOpen(false)
      setNewQuotationTitle('')
      toast.success(`Created "${created.title}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create quotation')
    } finally {
      setCreatingQuotation(false)
    }
  }

  // Delete current quotation
  const handleDeleteCurrentQuotation = async () => {
    if (!canEdit || quotations.length <= 1) {
      toast.error('Cannot delete the only quotation.')
      return
    }
    const currentTitle = activeContent?.title || 'this quotation'
    if (!window.confirm(`Are you sure you want to delete "${currentTitle}"? This cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/lead/${leadId}/customized-quotation?draftKey=${encodeURIComponent(activeDraftKey)}`, {
        method: 'DELETE',
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to delete quotation')
      }

      const remaining = quotations.filter((q) => q.draftKey !== activeDraftKey)
      setQuotations(remaining)
      if (remaining.length > 0) {
        setActiveDraftKey(remaining[0].draftKey)
        setActiveContent(remaining[0].content)
        setDefaultSqftInput(remaining[0].content.projectSqft ? String(remaining[0].content.projectSqft) : '')
        lastSavedSnapshotRef.current = JSON.stringify(remaining[0].content)
      }
      toast.success(`Deleted "${currentTitle}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete quotation')
    }
  }

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!activeContent) return
    setDownloading(true)
    try {
      const rawTitle = activeContent.title?.trim()
      const title = rawTitle && rawTitle.toLowerCase() !== 'customized quotation' ? rawTitle : 'Quotation'
      const sanitizedName = (activeContent.clientName || leadName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `${sanitizedName}_${sanitizedTitle}.pdf`

      await downloadPdfFromDocument(
        <CustomizedQuotationDocument content={activeContent} totals={totals} />,
        fileName,
      )
      toast.success('PDF downloaded successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setDownloading(false)
    }
  }

  // Title save
  const handleSaveTitle = () => {
    if (!editingTitleText.trim() || !activeContent) {
      setIsEditingTitle(false)
      return
    }
    const nextTitle = editingTitleText.trim()
    setActiveContent((prev) => (prev ? { ...prev, title: nextTitle, subject: '' } : prev))
    setIsEditingTitle(false)
  }

  // Apply default project sqft to lines that use "sqft" unit
  const handleApplyDefaultSqft = () => {
    const val = Number(defaultSqftInput.replace(/,/g, ''))
    if (!Number.isFinite(val) || val <= 0) {
      toast.error('Enter a valid sqft number first.')
      return
    }
    if (!activeContent) return

    let updatedCount = 0
    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        projectSqft: val,
        lineItems: prev.lineItems.map((line) => {
          if (line.unit === 'sqft') {
            updatedCount += 1
            const newAmount = Math.round(line.rate * val)
            return { ...line, quantity: val, amount: newAmount }
          }
          return line
        }),
      }
    })
    toast.success(`Applied ${val.toLocaleString()} sqft to ${updatedCount} sqft line item(s).`)
  }

  // Floor manipulation (formerly Section)
  const handleAddFloor = () => {
    if (!activeContent) return
    const newFloorId = `floor-${Date.now()}`
    const newAreaId = `area-${Date.now()}`
    const sortOrder = (activeContent.sections.length || 0) + 1

    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sections: [...prev.sections, { id: newFloorId, name: `Floor ${sortOrder}`, sortOrder }],
        areas: [...prev.areas, { id: newAreaId, floorId: newFloorId, name: 'Main Area', sortOrder: 1 }],
      }
    })
    setSelectedFloorId(newFloorId)
    setSelectedAreaId(newAreaId)
    toast.success(`Added Floor ${sortOrder}`)
  }

  const handleUpdateFloorName = (floorId: string, name: string) => {
    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map((s) => (s.id === floorId ? { ...s, name } : s)),
      }
    })
  }

  const handleDeleteFloor = (floorId: string) => {
    if (!activeContent) return
    if (activeContent.sections.length <= 1) {
      toast.error('Cannot remove the only floor.')
      return
    }
    if (!window.confirm('Delete this floor and all its areas and products?')) return

    setActiveContent((prev) => {
      if (!prev) return prev
      const remainingSections = prev.sections.filter((s) => s.id !== floorId)
      return {
        ...prev,
        sections: remainingSections,
        areas: prev.areas.filter((a) => a.floorId !== floorId),
        lineItems: prev.lineItems.filter((l) => l.sectionId !== floorId),
      }
    })
  }

  // Area manipulation
  const handleAddArea = (floorId?: string) => {
    if (!activeContent) return
    const targetFloorId = floorId || selectedFloorId || activeContent.sections[0]?.id
    if (!targetFloorId) return

    const newAreaId = `area-${Date.now()}`
    const floorAreas = activeContent.areas.filter((a) => a.floorId === targetFloorId)

    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        areas: [
          ...prev.areas,
          { id: newAreaId, floorId: targetFloorId, name: `Area ${floorAreas.length + 1}`, sortOrder: floorAreas.length + 1 },
        ],
      }
    })
    setSelectedFloorId(targetFloorId)
    setSelectedAreaId(newAreaId)
    toast.success('Added new area')
  }

  const handleUpdateAreaName = (areaId: string, name: string) => {
    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        areas: prev.areas.map((a) => (a.id === areaId ? { ...a, name } : a)),
      }
    })
  }

  const handleDeleteArea = (areaId: string) => {
    if (!activeContent) return
    if (!window.confirm('Delete this area and its products?')) return

    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        areas: prev.areas.filter((a) => a.id !== areaId),
        lineItems: prev.lineItems.filter((l) => l.areaId !== areaId),
      }
    })
  }

  // Product line manipulation
  const handleAddProduct = (floorId?: string, areaId?: string) => {
    if (!activeContent) return
    const targetFloorId = floorId || selectedFloorId || activeContent.sections[0]?.id
    if (!targetFloorId) return

    const targetAreaId = areaId || selectedAreaId || activeContent.areas.find((a) => a.floorId === targetFloorId)?.id

    const parsedSqft = Number(defaultSqftInput.replace(/,/g, ''))
    const defaultQty = Number.isFinite(parsedSqft) && parsedSqft > 0 ? parsedSqft : 1

    const newLine: CustomizedQuotationLineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sectionId: targetFloorId,
      areaId: targetAreaId,
      serialNo: activeContent.lineItems.length + 1,
      description: '',
      materials: '',
      unit: 'sqft',
      rate: 0,
      quantity: defaultQty,
      amount: 0,
      included: true,
    }

    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        lineItems: [...prev.lineItems, newLine],
      }
    })
  }

  const handleUpdateLine = (lineId: string, patch: Partial<CustomizedQuotationLineItem>) => {
    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        lineItems: prev.lineItems.map((line) => {
          if (line.id !== lineId) return line
          const next = { ...line, ...patch }
          if ('rate' in patch || 'quantity' in patch || 'unit' in patch) {
            if (next.unit === 'ls') {
              if ('rate' in patch && !('amount' in patch)) next.amount = next.rate
            } else {
              next.amount = Math.round(Number(next.rate) * Number(next.quantity))
            }
          }
          return next
        }),
      }
    })
  }

  const handleDuplicateLine = (line: CustomizedQuotationLineItem) => {
    if (!activeContent) return
    const duplicated: CustomizedQuotationLineItem = {
      ...line,
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: `${line.description} (Copy)`,
      serialNo: activeContent.lineItems.length + 1,
    }

    setActiveContent((prev) => {
      if (!prev) return prev
      const index = prev.lineItems.findIndex((l) => l.id === line.id)
      const nextLines = [...prev.lineItems]
      nextLines.splice(index + 1, 0, duplicated)
      return { ...prev, lineItems: nextLines }
    })
    toast.success('Product duplicated')
  }

  const handleDeleteLine = (lineId: string) => {
    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        lineItems: prev.lineItems.filter((l) => l.id !== lineId),
      }
    })
  }

  // Drag and drop reordering of product lines
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !activeContent) return

    setActiveContent((prev) => {
      if (!prev) return prev
      const oldIndex = prev.lineItems.findIndex((l) => l.id === active.id)
      const newIndex = prev.lineItems.findIndex((l) => l.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev

      const reordered = arrayMove(prev.lineItems, oldIndex, newIndex)
      return {
        ...prev,
        lineItems: reordered,
      }
    })
  }

  if (!mounted || loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading customized quotation...</span>
        </CardContent>
      </Card>
    )
  }

  if (!activeContent) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Unable to load quotation data.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Top Banner & Multi-Quotation Selector */}
      <Card className="border-emerald-200/60 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-slate-900 dark:to-teal-950/10">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Editable Title */}
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-600 p-2 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={editingTitleText}
                      onChange={(e) => setEditingTitleText(e.target.value)}
                      placeholder="e.g. Civil Quotation, Renovation"
                      className="h-8 max-w-[280px] font-bold text-base"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle()
                        if (e.key === 'Escape') setIsEditingTitle(false)
                      }}
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSaveTitle}>
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 group cursor-pointer"
                    onClick={() => {
                      setEditingTitleText(activeContent.title || DEFAULT_CUSTOMIZED_TITLE)
                      setIsEditingTitle(true)
                    }}
                  >
                    <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {activeContent.title || DEFAULT_CUSTOMIZED_TITLE}
                    </CardTitle>
                    {canEdit && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit Name</span>
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customized quotation draft for {leadName} • Floor & Area breakdown with SQFT & NOS units
                </p>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <Button
                  onClick={() => void handleSaveDraft()}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Draft
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => void handleDownloadPdf()}
                disabled={downloading}
                className="border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800"
              >
                {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4 text-emerald-600" />}
                Download PDF
              </Button>
              {canEdit && quotations.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => void handleDeleteCurrentQuotation()}
                  title="Delete this customized quotation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Quotations Switcher Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t mt-3">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Quotations:</span>
            {quotations.map((q) => {
              const isActive = q.draftKey === activeDraftKey
              return (
                <button
                  key={q.draftKey}
                  type="button"
                  onClick={() => handleSwitchQuotation(q.draftKey)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700'
                      : 'bg-white hover:bg-muted text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{q.title || 'Quotation'}</span>
                  <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {money(q.grandTotal)}
                  </span>
                </button>
              )
            })}

            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full text-xs text-primary hover:bg-primary/10 gap-1 px-2.5"
                onClick={() => {
                  setNewQuotationTitle(`Quotation ${quotations.length + 1}`)
                  setNewQuotationModalOpen(true)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Quotation</span>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Overview Metric Bar & Default SQFT Tool */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Grand Total</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {money(totals.grandTotal)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{totals.itemCount} product(s) included</p>
        </div>

        <div className="rounded-xl border bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total SQFT</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
            {totals.totalSqft.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-muted-foreground">sqft</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Across all sqft items</p>
        </div>

        <div className="rounded-xl border bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total NOS Units</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
            {totals.totalNos.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-muted-foreground">nos</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Across all piece/number items</p>
        </div>

        <div className="rounded-xl border bg-card p-3.5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Default SQFT</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Input
                type="text"
                inputMode="decimal"
                value={defaultSqftInput}
                disabled={!canEdit}
                onChange={(e) => setDefaultSqftInput(e.target.value)}
                placeholder="Enter sqft"
                className="h-8 text-xs font-medium"
              />
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] px-2 whitespace-nowrap"
                  onClick={handleApplyDefaultSqft}
                  title="Apply this quantity to all lines using sqft unit"
                >
                  Apply
                </Button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Updates SQFT lines without changing NOS items</p>
        </div>
      </div>

      {/* Client Info & Editable Intro Letter Block */}
      <Card>
        <CardHeader className="py-2.5 px-4 border-b bg-muted/20">
          <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
            Cover Letter & Client Scope (Printed on PDF)
          </span>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Client Name:
              </label>
              {canEdit ? (
                <Input
                  type="text"
                  value={activeContent.clientName}
                  onChange={(e) => setActiveContent((prev) => (prev ? { ...prev, clientName: e.target.value } : prev))}
                  placeholder="Client Name"
                  className="h-8 text-xs font-semibold"
                />
              ) : (
                <span className="text-xs font-semibold">{activeContent.clientName}</span>
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Client Address:
              </label>
              {canEdit ? (
                <Input
                  type="text"
                  value={activeContent.clientAddress}
                  onChange={(e) => setActiveContent((prev) => (prev ? { ...prev, clientAddress: e.target.value } : prev))}
                  placeholder="Client Address"
                  className="h-8 text-xs font-medium"
                />
              ) : (
                <span className="text-xs">{activeContent.clientAddress}</span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Subject: (Printed on PDF)
              </label>
            </div>
            {canEdit ? (
              <Input
                type="text"
                value={activeContent.subject ?? ''}
                onChange={(e) => setActiveContent((prev) => (prev ? { ...prev, subject: e.target.value } : prev))}
                placeholder="Quotation for Customize section work"
                className="h-8 text-xs font-semibold"
              />
            ) : (
              <span className="text-xs font-semibold">{activeContent.subject || 'Quotation for Customize section work'}</span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Dear Sir, (Intro Letter - Editable)
              </label>
              <span className="text-[10px] text-muted-foreground">Editable letter rendered on PDF</span>
            </div>
            {canEdit ? (
              <Textarea
                value={activeContent.introLetter}
                onChange={(e) => setActiveContent((prev) => (prev ? { ...prev, introLetter: e.target.value } : prev))}
                placeholder="We are delighted to partner with you on transforming your residence into an aesthetic, thoughtfully designed space..."
                rows={3}
                className="text-xs leading-relaxed"
              />
            ) : (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{activeContent.introLetter}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Quotation Table (Floor - Area - Product Layout with DnD) */}
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold text-sm">Floor, Area & Product Breakdown</span>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleAddFloor}>
                <FolderPlus className="h-3.5 w-3.5" />
                Add Floor
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0 space-y-6 pt-4">
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {activeContent.sections.map((floor, floorIdx) => {
              const floorAreas = activeContent.areas.filter((a) => a.floorId === floor.id).sort((a, b) => a.sortOrder - b.sortOrder)
              const floorLines = activeContent.lineItems.filter((l) => l.sectionId === floor.id)
              const floorTotal = floorLines.reduce((sum, l) => sum + (l.included !== false ? l.amount : 0), 0)

              return (
                <div key={floor.id} className="mx-4 rounded-lg border bg-card overflow-hidden shadow-xs">
                  {/* Floor Header */}
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 border-b transition-colors ${
                      selectedFloorId === floor.id ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'bg-slate-100/80 dark:bg-slate-800/60'
                    }`}
                    onClick={() => setSelectedFloorId(floor.id)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Floor {floorIdx + 1}:
                      </span>
                      {canEdit ? (
                        <Input
                          type="text"
                          value={floor.name}
                          onChange={(e) => handleUpdateFloorName(floor.id, e.target.value)}
                          placeholder="Floor Name (e.g. Ground Floor, 1st Floor)"
                          className="h-7 text-sm font-bold max-w-[280px] bg-background"
                        />
                      ) : (
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{floor.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950 px-2 py-0.5 rounded">
                        Floor Total: {money(floorTotal)}
                      </span>
                      {canEdit && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddArea(floor.id)
                            }}
                            title="Add Area to this Floor"
                          >
                            <Plus className="h-3 w-3" />
                            Area
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteFloor(floor.id)
                            }}
                            title="Delete Floor"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Floor Contents (by Areas or Unassigned Products) */}
                  <div className="p-3 space-y-4">
                    {floorAreas.length > 0 ? (
                      floorAreas.map((area) => {
                        const areaLines = floorLines.filter((l) => l.areaId === area.id)
                        const areaTotal = areaLines.reduce((sum, l) => sum + (l.included !== false ? l.amount : 0), 0)

                        return (
                          <div
                            key={area.id}
                            className={`rounded-md border overflow-hidden transition-colors ${
                              selectedAreaId === area.id ? 'border-emerald-300 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-800'
                            }`}
                            onClick={() => {
                              setSelectedFloorId(floor.id)
                              setSelectedAreaId(area.id)
                            }}
                          >
                            {/* Area Subheader */}
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 border-b text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-medium">Area:</span>
                                {canEdit ? (
                                  <Input
                                    type="text"
                                    value={area.name}
                                    onChange={(e) => handleUpdateAreaName(area.id, e.target.value)}
                                    placeholder="Area name (e.g. Living Room)"
                                    className="h-6 text-xs font-semibold max-w-[200px] bg-background"
                                  />
                                ) : (
                                  <span className="font-semibold">{area.name}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-medium">
                                  Subtotal: <strong>{money(areaTotal)}</strong>
                                </span>
                                {canEdit && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[11px] gap-1 px-2"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleAddProduct(floor.id, area.id)
                                      }}
                                    >
                                      <Plus className="h-3 w-3" /> Product
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteArea(area.id)
                                      }}
                                      title="Delete Area"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Products Table inside Area with Drag & Drop */}
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[760px] text-xs">
                                <thead className="bg-muted/40 text-left font-semibold text-muted-foreground">
                                  <tr>
                                    <th className="w-12 px-2 py-2 text-center">SL</th>
                                    <th className="min-w-[180px] px-3 py-2">Product Name</th>
                                    <th className="min-w-[240px] px-3 py-2">Materials & Specifications</th>
                                    <th className="w-[120px] px-3 py-2">Unit Price (৳)</th>
                                    <th className="w-[160px] px-3 py-2">Qty & Unit (sqft / nos)</th>
                                    <th className="w-[120px] px-3 py-2 text-right">Total (৳)</th>
                                    {canEdit && <th className="w-16 px-2 py-2 text-center">Actions</th>}
                                  </tr>
                                </thead>
                                <SortableContext items={areaLines.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                                  <tbody className="divide-y">
                                    {areaLines.length === 0 ? (
                                      <tr>
                                        <td colSpan={canEdit ? 7 : 6} className="py-6 text-center text-muted-foreground">
                                          No products in this area yet.{' '}
                                          {canEdit && (
                                            <button
                                              type="button"
                                              onClick={() => handleAddProduct(floor.id, area.id)}
                                              className="text-primary underline font-medium hover:text-primary/80 ml-1"
                                            >
                                              + Add first product
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ) : (
                                      areaLines.map((line, lineIdx) => (
                                        <SortableProductRow
                                          key={line.id}
                                          line={line}
                                          slNumber={String(lineIdx + 1).padStart(2, '0')}
                                          canEdit={canEdit}
                                          onUpdateLine={handleUpdateLine}
                                          onDuplicateLine={handleDuplicateLine}
                                          onDeleteLine={handleDeleteLine}
                                        />
                                      ))
                                    )}
                                  </tbody>
                                </SortableContext>
                              </table>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      /* Fallback when floor has no distinct areas */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">General Products</span>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs gap-1"
                              onClick={() => handleAddProduct(floor.id)}
                            >
                              <Plus className="h-3 w-3" /> Add Product
                            </Button>
                          )}
                        </div>
                        <div className="overflow-x-auto rounded-md border">
                          <table className="w-full min-w-[760px] text-xs">
                            <thead className="bg-muted/40 text-left font-semibold text-muted-foreground">
                              <tr>
                                <th className="w-12 px-2 py-2 text-center">SL</th>
                                <th className="min-w-[180px] px-3 py-2">Product Name</th>
                                <th className="min-w-[240px] px-3 py-2">Materials & Specifications</th>
                                <th className="w-[120px] px-3 py-2">Unit Price (৳)</th>
                                <th className="w-[160px] px-3 py-2">Qty & Unit (sqft / nos)</th>
                                <th className="w-[120px] px-3 py-2 text-right">Total (৳)</th>
                                {canEdit && <th className="w-16 px-2 py-2 text-center">Actions</th>}
                              </tr>
                            </thead>
                            <SortableContext items={floorLines.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                              <tbody className="divide-y">
                                {floorLines.map((line, lineIdx) => (
                                  <SortableProductRow
                                    key={line.id}
                                    line={line}
                                    slNumber={String(lineIdx + 1).padStart(2, '0')}
                                    canEdit={canEdit}
                                    onUpdateLine={handleUpdateLine}
                                    onDuplicateLine={handleDuplicateLine}
                                    onDeleteLine={handleDeleteLine}
                                  />
                                ))}
                              </tbody>
                            </SortableContext>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </DndContext>

          {/* Add Floor Button at Bottom */}
          {canEdit && (
            <div className="px-4 pb-4">
              <Button
                variant="outline"
                className="w-full border-dashed py-5 text-sm gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleAddFloor}
              >
                <Plus className="h-4 w-4" />
                Add New Floor (e.g. Ground Floor, 1st Floor, Rooftop)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create New Quotation Dialog */}
      <Dialog open={newQuotationModalOpen} onOpenChange={setNewQuotationModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Quotation Draft</DialogTitle>
            <DialogDescription>
              Define what kind of quotation this is (e.g. Civil Quotation, Glass Work, Kitchen Scope).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Quotation Name / Type</label>
              <Input
                type="text"
                value={newQuotationTitle}
                onChange={(e) => setNewQuotationTitle(e.target.value)}
                placeholder="e.g. Civil Quotation, Renovation Scope"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreateNewQuotation()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewQuotationModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateNewQuotation()} disabled={creatingQuotation || !newQuotationTitle.trim()}>
              {creatingQuotation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fixed Sticky Bottom Action Bar for Always-Accessible Keys */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 px-3 py-3 shadow-[0_-18px_45px_-28px_rgba(15,23,42,0.55)] backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">
              {activeContent.title || DEFAULT_CUSTOMIZED_TITLE}:
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {money(totals.grandTotal)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <Button type="button" size="sm" variant="outline" onClick={handleAddFloor}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Floor
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!activeContent.sections?.length}
                  onClick={() => handleAddArea(selectedFloorId || activeContent.sections[0]?.id)}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Area
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!activeContent.sections?.length}
                  onClick={() => handleAddProduct(selectedFloorId || activeContent.sections[0]?.id, selectedAreaId || undefined)}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Product
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving}
                  onClick={() => void handleSaveDraft()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Save Draft
                </Button>
              </>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={downloading}
              onClick={() => void handleDownloadPdf()}
              className="border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800"
            >
              {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4 text-emerald-600" />}
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
