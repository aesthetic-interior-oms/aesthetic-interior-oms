'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowDownToLine, Bold, Download, Edit2, ExternalLink, GripVertical, History, Loader2, Plus, Printer, Save, SaveAll, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DetailQuotationDocument } from '@/components/crm/quotation/pdf/DetailQuotationDocument'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { withDetailQuotationDefaults, getDetailVersionTitle } from '@/lib/detail-quotation-format'
import {
  addAreaToFloor,
  addCatalogItemToFloor,
  addFloorToContent,
  addFinishingElectricalWorkItem,
  buildDefaultFloorDetailContent,
  findCatalogItemAcrossTemplates,
  FLOOR_DETAIL_TEMPLATE_KEY,
  removeAreaFromContent,
  removeFloorFromContent,
  updateAreaName,
  updateFloorName,
} from '@/lib/floor-detail-quotation'
import type {
  QuotationDraftContent,
  QuotationFileType,
  QuotationLineItem,
  QuotationUnit,
} from '@/lib/quotation-types'
import { convertShortToDetailContent, shortPackageTierLabel } from '@/lib/short-to-detail-import'
import { isShortQuotationContent, isDetailQuotationContent } from '@/lib/quotation-document'
import type { ShortQuotationPackage } from '@/lib/short-quotation-types'

type QuotationMakerProps = {
  leadId: string
  leadName: string
  leadLocation: string | null
  leadSubStatus: string | null
  mode?: 'lead' | 'playground'
  onDraftSaved?: () => void
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
  availableSlots?: Array<{ slotIndex: number; title: string; grandTotal: number; exists: boolean }>
  templates?: TemplateOption[]
  fullTemplates?: Array<Record<string, unknown>>
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

function scrollToQuotationIssue(elementId: string) {
  document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function QuotationMaker({
  leadId,
  leadName,
  leadLocation,
  leadSubStatus,
  mode = 'lead',
  onDraftSaved,
}: QuotationMakerProps) {
  const isPlayground = mode === 'playground'
  const previewContext = isPlayground ? 'playground' : 'lead'
  const previewContextId = isPlayground ? 'playground' : leadId
  const pathname = usePathname() || ''
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const [slotIndex, setSlotIndex] = useState<number>(1)
  const [availableSlots, setAvailableSlots] = useState<Array<{ slotIndex: number; title: string; grandTotal: number; exists: boolean }>>([
    { slotIndex: 1, title: getDetailVersionTitle(1), grandTotal: 0, exists: true },
    { slotIndex: 2, title: getDetailVersionTitle(2), grandTotal: 0, exists: true },
    { slotIndex: 3, title: getDetailVersionTitle(3), grandTotal: 0, exists: true },
  ])
  const [pendingSlotIndex, setPendingSlotIndex] = useState<number | null>(null)
  const [unsavedSwitchModalOpen, setUnsavedSwitchModalOpen] = useState(false)
  const lastSavedSnapshotRef = useRef<string | null>(null)
  const [saveAllConfirmOpen, setSaveAllConfirmOpen] = useState(false)
  const [confirmClientNameInput, setConfirmClientNameInput] = useState('')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importingShort, setImportingShort] = useState(false)

  // ─── Version management state ────────────────────────────────────────────────
  const [activeVersionKey, setActiveVersionKey] = useState<string | null>(null)
  type VersionSummary = {
    id: string
    draftKey: string
    versionTitle: string
    documentType: string
    packageTier: string | null
    quotationType: string
    grandTotal: number
    sqft: number | null
    updatedAt: string
  }
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false)
  const [versionsList, setVersionsList] = useState<VersionSummary[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')
  const [savingAs, setSavingAs] = useState(false)
  const [savingVersion, setSavingVersion] = useState(false)
  const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false)
  const [newVersionName, setNewVersionName] = useState('')
  const [newVersionType, setNewVersionType] = useState<QuotationFileType>('STANDARD')
  const [creatingBlankVersion, setCreatingBlankVersion] = useState(false)

  // Short versions for Import modal
  const [shortVersionsList, setShortVersionsList] = useState<VersionSummary[]>([])
  const [loadingShortVersions, setLoadingShortVersions] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [startingWork, setStartingWork] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [quotationType, setQuotationType] = useState<QuotationFileType>('STANDARD')
  const [projectSqft, setProjectSqft] = useState('')
  const [content, setContent] = useState<QuotationDraftContent | null>(null)
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [fullTemplates, setFullTemplates] = useState<Array<Record<string, unknown>>>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerFloorId, setPickerFloorId] = useState<string | null>(null)
  const [pickerAreaId, setPickerAreaId] = useState<string | null>(null)
  const [pickerCatalogKey, setPickerCatalogKey] = useState('ceiling-curtain')
  const [customTypeFloorId, setCustomTypeFloorId] = useState<string | null>(null)
  const [customTypeAreaId, setCustomTypeAreaId] = useState<string | null>(null)
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null)
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null)
  const visibleFloorRatios = useRef(new Map<string, number>())
  const visibleAreaRatios = useRef(new Map<string, { ratio: number; floorId: string; areaId: string }>())

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const reorderFloorLines = (floorId: string, event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setContent((prev) => {
      if (!prev) return prev
      const floorItems = prev.lineItems.filter((l) => l.sectionId === floorId)
      const otherItems = prev.lineItems.filter((l) => l.sectionId !== floorId)
      const oldIndex = floorItems.findIndex((l) => l.id === active.id)
      const newIndex = floorItems.findIndex((l) => l.id === over.id)
      const reordered = arrayMove(floorItems, oldIndex, newIndex)
      return { ...prev, lineItems: [...otherItems, ...reordered] }
    })
  }

  const loadDraft = useCallback(async (targetSlot: number = slotIndex) => {
    setLoading(true)
    try {
      if (isPlayground) {
        const templatesResponse = await fetch('/api/quotation/templates', { cache: 'no-store' })
        const templatesPayload = await templatesResponse.json()
        if (templatesResponse.ok && templatesPayload?.success && Array.isArray(templatesPayload.data?.templates)) {
          setTemplates(templatesPayload.data.templates)
        }

        const stored = loadPlaygroundDetailDraft(targetSlot)
        if (stored) {
          const sqftStr = stored.projectSqft ? String(stored.projectSqft) : ''
          setQuotationType(stored.quotationType)
          setProjectSqft(sqftStr)
          const normContent = normalizeQuotationContent(withDetailQuotationDefaults(stored.content))
          normContent.versionTitle = getDetailVersionTitle(targetSlot)
          setContent(normContent)
          lastSavedSnapshotRef.current = JSON.stringify({ content: normContent, projectSqft: sqftStr, quotationType: stored.quotationType })
        } else {
          setQuotationType('STANDARD')
          setProjectSqft('')
          const def = buildDefaultFloorDetailContent()
          def.versionTitle = getDetailVersionTitle(targetSlot)
          setContent(def)
          lastSavedSnapshotRef.current = JSON.stringify({ content: def, projectSqft: '', quotationType: 'STANDARD' })
        }
        setCanEdit(true)
        return
      }

      const response = await fetch(`/api/lead/${leadId}/quotation-draft?documentType=detail&slot=${targetSlot}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error ?? 'Failed to load quotation')
      }

      const data = payload.data as DraftResponse
      setCanEdit(Boolean(data.canEdit))
      if (Array.isArray(data.templates)) setTemplates(data.templates)
      if (Array.isArray(data.fullTemplates)) setFullTemplates(data.fullTemplates)
      if (Array.isArray(data.availableSlots)) {
        const filledSlots = [1, 2, 3].map((sIndex) => {
          const found = data.availableSlots?.find((item) => item.slotIndex === sIndex)
          return {
            slotIndex: sIndex,
            title: getDetailVersionTitle(sIndex),
            grandTotal: found?.grandTotal ?? 0,
            exists: true,
          }
        })
        setAvailableSlots(filledSlots)
      }

      const source = data.draft ?? data.defaultDetailDraft
      if (!source) throw new Error('Quotation data unavailable')

      const qType = source.quotationType
      const validQType = (qType === 'BASIC' || qType === 'STANDARD' || qType === 'PREMIUM' || qType === 'MIXED') ? qType : 'STANDARD'
      setQuotationType(validQType)
      const sqftStr = source.projectSqft ? String(source.projectSqft) : ''
      setProjectSqft(sqftStr)
      const normContent = normalizeQuotationContent(withDetailQuotationDefaults(source.content))
      normContent.versionTitle = getDetailVersionTitle(targetSlot)
      setContent(normContent)
      lastSavedSnapshotRef.current = JSON.stringify({ content: normContent, projectSqft: sqftStr, quotationType: validQType })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load quotation')
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [isPlayground, leadId, slotIndex])

  useEffect(() => {
    void loadDraft()
  }, [loadDraft])

  const totals = useMemo(() => (content ? calculateQuotationTotals(content) : null), [content])
  const effectiveClientAddress = content?.clientAddress ?? leadLocation ?? ''

  const floors = useMemo(() => {
    if (!content || !Array.isArray(content.sections)) return []
    return [...content.sections].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [content])

  const editorLineSlMap = useMemo(() => {
    if (!content) return new Map<string, number>()
    const map = new Map<string, number>()
    let count = 0
    const lineItems = Array.isArray(content.lineItems) ? content.lineItems : []
    floors.forEach((floor) => {
      const isFE = floor.sectionType === 'FINISHING_ELECTRICAL' || floor.name === 'Finishing & Electrical Works'
      const floorAreas = [...(content.areas ?? [])]
        .filter((area) => area.floorId === floor.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const unassignedLines = lineItems.filter((line) => line.sectionId === floor.id && !line.areaId)
      const namedAreaGroups = floorAreas.map((area) => ({ area, lines: lineItems.filter((line) => line.sectionId === floor.id && line.areaId === area.id) }))
      const generalAreaGroup = { area: { id: `general-${floor.id}`, floorId: floor.id, name: 'General Area', sortOrder: 0 }, lines: unassignedLines }
      const areaGroups = isFE
        ? [{ area: { id: `fe-${floor.id}`, floorId: floor.id, name: '', sortOrder: 0 }, lines: lineItems.filter((line) => line.sectionId === floor.id) }]
        : floorAreas.length > 0
          ? [generalAreaGroup, ...namedAreaGroups].filter((group) => group.lines.length > 0 || !group.area.id.startsWith('general-'))
          : [{ ...generalAreaGroup, lines: lineItems.filter((line) => line.sectionId === floor.id) }]

      areaGroups.forEach((group) => {
        group.lines.forEach((line) => {
          count += 1
          map.set(line.id, count)
        })
      })
    })
    return map
  }, [content, floors])

  useEffect(() => {
    if (floors.length === 0) {
      setActiveFloorId(null)
      setActiveAreaId(null)
      return
    }

    setActiveFloorId((current) => {
      if (current && floors.some((floor) => floor.id === current)) return current
      return floors[0]?.id ?? null
    })
  }, [floors])

  useEffect(() => {
    if (floors.length === 0) return

    visibleFloorRatios.current.clear()
    visibleAreaRatios.current.clear()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const floorId = entry.target.getAttribute('data-floor-id')
          const areaId = entry.target.getAttribute('data-area-id')

          if (areaId && floorId) {
            if (entry.isIntersecting) {
              visibleAreaRatios.current.set(areaId, { ratio: entry.intersectionRatio, floorId, areaId })
            } else {
              visibleAreaRatios.current.delete(areaId)
            }
          } else if (floorId) {
            if (entry.isIntersecting) {
              visibleFloorRatios.current.set(floorId, entry.intersectionRatio)
            } else {
              visibleFloorRatios.current.delete(floorId)
            }
          }
        })

        const mostVisibleAreaEntry = [...visibleAreaRatios.current.values()]
          .sort((a, b) => b.ratio - a.ratio)[0]

        if (mostVisibleAreaEntry) {
          setActiveFloorId(mostVisibleAreaEntry.floorId)
          setActiveAreaId(mostVisibleAreaEntry.areaId)
        } else {
          const mostVisibleFloor = [...visibleFloorRatios.current.entries()]
            .sort((a, b) => b[1] - a[1])[0]?.[0]
          if (mostVisibleFloor) {
            setActiveFloorId(mostVisibleFloor)
            setActiveAreaId(null)
          }
        }
      },
      { root: null, rootMargin: '-10% 0px -40% 0px', threshold: [0, 0.2, 0.5, 0.8, 1] },
    )

    floors.forEach((floor) => {
      const floorEl = document.getElementById(`quotation-floor-${floor.id}`)
      if (floorEl) observer.observe(floorEl)

      const areaElements = document.querySelectorAll(`[data-floor-id="${floor.id}"][data-area-id]`)
      areaElements.forEach((el) => observer.observe(el))
    })

    return () => observer.disconnect()
  }, [floors, content?.areas])

  const isDirty = useMemo(() => {
    if (!lastSavedSnapshotRef.current || !content) return false
    const currentSnapshot = JSON.stringify({ content, projectSqft, quotationType })
    return currentSnapshot !== lastSavedSnapshotRef.current
  }, [content, projectSqft, quotationType])

  const handleSwitchSlot = useCallback((targetSlot: number) => {
    if (targetSlot === slotIndex) return
    if (isDirty) {
      setPendingSlotIndex(targetSlot)
      setUnsavedSwitchModalOpen(true)
    } else {
      setSlotIndex(targetSlot)
      void loadDraft(targetSlot)
    }
  }, [isDirty, slotIndex, loadDraft])

  useEffect(() => {
    if (!content || !totals) return
    const timer = window.setTimeout(() => {
      publishDetailPreview({
        updatedAt: new Date().toISOString(),
        context: previewContext,
        contextId: previewContextId,
        slotIndex,
        clientName: content.clientName || leadName,
        clientAddress: effectiveClientAddress,
        quotationType,
        projectSqft: projectSqft.trim() ? Number(projectSqft.replace(/,/g, '')) : null,
        content: withDetailQuotationDefaults(content),
        totals,
      })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [content, totals, quotationType, projectSqft, leadName, effectiveClientAddress, previewContext, previewContextId, slotIndex])

  const updateLineItem = (lineId: string, patch: Partial<QuotationLineItem>) => {
    setContent((prev) => {
      if (!prev) return prev
      const nextItems = prev.lineItems.map((line) => {
        if (line.id !== lineId) return line
        const updated = { ...line, ...patch }
        const r = Number.isFinite(updated.rate) ? Math.max(0, updated.rate) : 0
        const q = Number.isFinite(updated.quantity) ? Math.max(0, updated.quantity) : 0
        const isPackage = updated.unit === 'ls'
        const isFinishingElectrical = Boolean(updated.isFinishingElectrical)
        let amount: number
        if (isFinishingElectrical) {
          // Case 4: both rate AND qty given → auto-calculate
          // Cases 1, 2, 3: preserve manually entered total
          amount = r > 0 && q > 0
            ? calculateLineAmount(r, q)
            : (Number.isFinite(updated.amount) ? Math.max(0, updated.amount) : 0)
        } else if (isPackage) {
          amount = Number.isFinite(updated.amount) ? Math.max(0, updated.amount) : 0
        } else {
          amount = calculateLineAmount(updated.rate, updated.quantity)
        }
        return { ...updated, amount }
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

  const addFinishingElectricalWork = (targetFloorId?: string) => {
    const floorId = targetFloorId || activeFloorId || content?.sections[0]?.id
    if (!floorId) {
      toast.error('Add a floor first')
      return
    }
    setContent((prev) => {
      if (!prev) return prev
      const sqft = Number(projectSqft.replace(/,/g, ''))
      const next = addFinishingElectricalWorkItem(prev, floorId, {
        quantity: Number.isFinite(sqft) && sqft > 0 ? sqft : 1,
      })
      toast.success('Added Finishing & Electrical Work item')
      return normalizeQuotationContent(next)
    })
  }

  const addArea = (floorId: string | null = activeFloorId) => {
    if (!floorId) {
      toast.error('Add a floor first')
      return
    }

    setContent((prev) => (prev ? addAreaToFloor(prev, floorId, 'New Area') : prev))
    setActiveFloorId(floorId)
  }

  const removeFloor = (floorId: string) => {
    const itemCount = content?.lineItems.filter((line) => line.sectionId === floorId).length ?? 0
    if (itemCount > 0 && !window.confirm(`This floor contains ${itemCount} item(s). Delete the floor and all of its items?`)) return
    setContent((prev) => (prev ? removeFloorFromContent(prev, floorId) : prev))
  }

  const removeArea = (areaId: string) => {
    const itemCount = content?.lineItems.filter((line) => line.areaId === areaId).length ?? 0
    if (itemCount > 0 && !window.confirm(`This area contains ${itemCount} item(s). Delete the area and all of its items?`)) return
    setContent((prev) => (prev ? removeAreaFromContent(prev, areaId) : prev))
  }

  const addCustomLine = (floorId: string, areaId: string | undefined, type: 'regular' | 'package' = 'regular') => {
    setContent((prev) => {
      if (!prev) return prev
      const customCount = prev.lineItems.filter((line) => line.sectionId === floorId && line.isCustom).length
      const sqft = Number(projectSqft.replace(/,/g, ''))
      const newLine: QuotationLineItem = type === 'package'
        ? {
            id: `custom-${floorId}-${Date.now()}-${customCount}`,
            sectionId: floorId,
            ...(areaId ? { areaId } : {}),
            description: 'Package item',
            materials: '',
            unit: 'ls',
            rate: 0,
            quantity: 0,
            amount: 0,
            included: true,
            isCustom: true,
            unitPriceLabel: '',
          }
        : {
            id: `custom-${floorId}-${Date.now()}-${customCount}`,
            sectionId: floorId,
            ...(areaId ? { areaId } : {}),
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

  const openItemPicker = (floorId: string, areaId?: string) => {
    setPickerFloorId(floorId)
    setPickerAreaId(areaId ?? null)
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
        pickerAreaId ?? undefined,
        fullTemplates,
      )
      if (!next) {
        toast.error('Item not found in saved list')
        return prev
      }
      const match = findCatalogItemAcrossTemplates(templateItemId, fullTemplates)
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
        slotIndex,
        clientName: content.clientName || leadName,
        clientAddress: effectiveClientAddress,
        quotationType,
        projectSqft: projectSqft.trim() ? Number(projectSqft.replace(/,/g, '')) : null,
        content: withDetailQuotationDefaults(content),
        totals,
      })
    }
    const isQuotationTeam = pathname.startsWith('/quotation-team')
    const layout = isQuotationTeam ? 'standard' : 'compact'
    const url = buildDetailPreviewUrl({ context: previewContext, contextId: previewContextId, slotIndex, layout })
    void window.open(url, '_blank', 'noopener,noreferrer')
  }

  const saveDraft = useCallback(async (allSlots: boolean = false) => {
    if (!content || !canEdit) return
    const normalized = normalizeQuotationContent(content)

    // Count issues but don't block — show a soft warning (package lines with no amount are intentionally allowed)
    const missingLines = normalized.lineItems.filter((line) => {
      if (line.included === false) return false
      if (isPackageLine(line)) return false
      return line.rate <= 0 || line.quantity <= 0
    })
    if (missingLines.length > 0) {
      toast.warning(`${missingLines.length} item(s) have missing prices — saving draft anyway`)
      // Scroll to first issue so the user can see it
      scrollToQuotationIssue(`detail-line-${missingLines[0].id}`)
    }
    setSaving(true)
    try {
      const projectSqftValue = projectSqft.trim() ? Number(projectSqft.replace(/,/g, '')) : null
      const activeTargetSlots = availableSlots.map((s) => s.slotIndex)

      const savedVersionContent = { ...normalized, versionTitle: getDetailVersionTitle(slotIndex) }

      if (isPlayground) {
        if (allSlots) {
          activeTargetSlots.forEach((s) => {
            savePlaygroundDetailDraft(
              {
                quotationType,
                projectSqft: projectSqftValue,
                templateKey: FLOOR_DETAIL_TEMPLATE_KEY,
                content: { ...normalized, versionTitle: getDetailVersionTitle(s) },
              },
              s,
            )
          })
          setAvailableSlots((prev) =>
            prev.map((item) => ({ ...item, grandTotal: totals?.grandTotal ?? item.grandTotal, exists: true }))
          )
          toast.success('Saved to all versions (playground)')
        } else {
          savePlaygroundDetailDraft(
            {
              quotationType,
              projectSqft: projectSqftValue,
              templateKey: FLOOR_DETAIL_TEMPLATE_KEY,
              content: savedVersionContent,
            },
            slotIndex,
          )
          setAvailableSlots((prev) =>
            prev.map((item) => (item.slotIndex === slotIndex ? { ...item, grandTotal: totals?.grandTotal ?? item.grandTotal, exists: true } : item))
          )
          toast.success(`Saved ${getDetailVersionTitle(slotIndex)} version`)
        }
        setContent(savedVersionContent)
        lastSavedSnapshotRef.current = JSON.stringify({ content: savedVersionContent, projectSqft, quotationType })
        return
      }

      const response = await fetch(`/api/lead/${leadId}/quotation-draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'detail',
          slotIndex,
          saveAllSlots: allSlots,
          targetSlots: activeTargetSlots,
          quotationType,
          projectSqft: projectSqftValue,
          content: savedVersionContent,
          status: 'DRAFT',
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to save quotation')
      }
      setContent(savedVersionContent)
      lastSavedSnapshotRef.current = JSON.stringify({ content: savedVersionContent, projectSqft, quotationType })
      setAvailableSlots((prev) =>
        prev.map((item) => {
          if (allSlots || item.slotIndex === slotIndex) {
            return { ...item, grandTotal: totals?.grandTotal ?? item.grandTotal, exists: true }
          }
          return item
        })
      )
      toast.success(allSlots ? 'Quotation saved in all versions' : `Saved ${getDetailVersionTitle(slotIndex)} version`)
      onDraftSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save quotation')
    } finally {
      setSaving(false)
    }
  }, [canEdit, content, isPlayground, leadId, projectSqft, quotationType, slotIndex, availableSlots, loadDraft, onDraftSaved])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (!saving) void saveDraft()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saving, saveDraft])


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

  // ─── Version: Load versions list ─────────────────────────────────────────────
  const loadVersionsList = useCallback(async () => {
    if (isPlayground) return
    setLoadingVersions(true)
    try {
      const res = await fetch(`/api/lead/${leadId}/quotation-versions`, { cache: 'no-store' })
      const payload = await res.json()
      if (res.ok && payload?.success && Array.isArray(payload.data?.versions)) {
        // Show detail versions in this builder
        setVersionsList(payload.data.versions.filter((v: { documentType: string }) => v.documentType === 'detail'))
      }
    } catch { /* ignore */ }
    finally { setLoadingVersions(false) }
  }, [isPlayground, leadId])

  const openVersionsDialog = () => {
    setVersionsDialogOpen(true)
    void loadVersionsList()
  }

  // ─── Version: Load named version into detail builder ─────────────────────────
  const loadVersion = async (version: { draftKey: string; versionTitle: string }) => {
    setVersionsDialogOpen(false)
    setLoading(true)
    try {
      const res = await fetch(
        `/api/lead/${leadId}/quotation-versions?draftKey=${encodeURIComponent(version.draftKey)}`,
        { cache: 'no-store' },
      )
      const payload = await res.json()
      if (!res.ok || !payload?.success || !payload.data?.draft) {
        throw new Error(payload?.error ?? 'Failed to load version')
      }
      const draftContent = payload.data.draft.content
      if (draftContent && isDetailQuotationContent(draftContent)) {
        const norm = normalizeQuotationContent(withDetailQuotationDefaults(draftContent))
        norm.versionTitle = version.versionTitle
        setContent(norm)
        setActiveVersionKey(version.draftKey)
        if (payload.data.draft.quotationType) {
          const qType = payload.data.draft.quotationType
          if (qType === 'BASIC' || qType === 'STANDARD' || qType === 'PREMIUM' || qType === 'MIXED') {
            setQuotationType(qType)
          }
        }
        toast.success(`Loaded version: "${version.versionTitle}"`)
      } else {
        toast.error('Version content could not be parsed as detail quotation.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load version')
    } finally {
      setLoading(false)
    }
  }

  // ─── Version: Save As (new named version) ───────────────────────────────────
  const handleSaveAs = async () => {
    if (!content || !canEdit || !saveAsName.trim()) return
    setSavingAs(true)
    try {
      const normalized = normalizeQuotationContent(content)
      const projectSqftValue = projectSqft.trim() ? Number(projectSqft.replace(/,/g, '')) : null
      const res = await fetch(`/api/lead/${leadId}/quotation-versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionTitle: saveAsName.trim(),
          documentType: 'detail',
          quotationType,
          projectSqft: projectSqftValue,
          content: normalized,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        if (payload?.error === 'DUPLICATE_NAME') {
          toast.error(payload.message ?? 'A version with that name already exists. Please choose a different name.')
        } else {
          throw new Error(payload?.error ?? 'Failed to save version')
        }
        return
      }
      setActiveVersionKey(payload.data.draftKey)
      setSaveAsDialogOpen(false)
      setSaveAsName('')
      toast.success(`Version "${saveAsName.trim()}" saved`)
      onDraftSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save version')
    } finally {
      setSavingAs(false)
    }
  }

  // ─── Version: Save (update existing named version) ──────────────────────────
  const handleSaveVersion = useCallback(async () => {
    if (!content || !canEdit || !activeVersionKey) return
    setSavingVersion(true)
    try {
      const normalized = normalizeQuotationContent(content)
      const projectSqftValue = projectSqft.trim() ? Number(projectSqft.replace(/,/g, '')) : null
      const res = await fetch(`/api/lead/${leadId}/quotation-versions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftKey: activeVersionKey,
          documentType: 'detail',
          quotationType,
          projectSqft: projectSqftValue,
          content: normalized,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to update version')
      }
      toast.success('Version updated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save version')
    } finally {
      setSavingVersion(false)
    }
  }, [content, canEdit, activeVersionKey, leadId, quotationType, projectSqft])

  // ─── Version: Create New Blank Version (Quotation Team) ─────────────────────
  const handleCreateBlankVersion = async () => {
    if (!newVersionName.trim() || !canEdit) return
    setCreatingBlankVersion(true)
    try {
      const def = buildDefaultFloorDetailContent()
      def.versionTitle = newVersionName.trim()
      const projectSqftValue = projectSqft.trim() ? Number(projectSqft.replace(/,/g, '')) : null
      const res = await fetch(`/api/lead/${leadId}/quotation-versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionTitle: newVersionName.trim(),
          documentType: 'detail',
          quotationType: newVersionType,
          projectSqft: projectSqftValue,
          content: def,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        if (payload?.error === 'DUPLICATE_NAME') {
          toast.error(payload.message ?? 'A version with that name already exists. Please choose a different name.')
        } else {
          throw new Error(payload?.error ?? 'Failed to create new version')
        }
        return
      }
      setActiveVersionKey(payload.data.draftKey)
      setQuotationType(newVersionType)
      setContent(def)
      setNewVersionDialogOpen(false)
      setNewVersionName('')
      setVersionsDialogOpen(false)
      toast.success(`Created new version "${newVersionName.trim()}" from blank template`)
      onDraftSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create version')
    } finally {
      setCreatingBlankVersion(false)
    }
  }

  // ─── Import from Short Quotation (with versions support) ─────────────────────
  const openImportDialog = async () => {
    setImportDialogOpen(true)
    if (!leadId || isPlayground) return
    setLoadingShortVersions(true)
    try {
      const res = await fetch(`/api/lead/${leadId}/quotation-versions?documentType=short`, { cache: 'no-store' })
      const payload = await res.json()
      if (res.ok && payload?.success && Array.isArray(payload.data?.versions)) {
        setShortVersionsList(payload.data.versions)
      }
    } catch { /* ignore */ }
    finally { setLoadingShortVersions(false) }
  }

  const importFromShortQuotation = async (packageTier?: ShortQuotationPackage, versionDraftKey?: string) => {
    if (!leadId || isPlayground) return
    setImportingShort(true)
    setImportDialogOpen(false)
    try {
      let shortContent: any
      if (versionDraftKey) {
        const res = await fetch(
          `/api/lead/${leadId}/quotation-versions?draftKey=${encodeURIComponent(versionDraftKey)}`,
          { cache: 'no-store' },
        )
        const payload = await res.json()
        if (!res.ok || !payload?.success || !payload.data?.draft) {
          throw new Error(payload?.error ?? 'Failed to load short quotation version')
        }
        shortContent = payload.data.draft.content
      } else if (packageTier) {
        const response = await fetch(
          `/api/lead/${leadId}/quotation-draft?documentType=short&packageTier=${packageTier}`,
          { cache: 'no-store' },
        )
        const payload = await response.json()
        if (!response.ok || !payload?.success || !payload?.data) {
          throw new Error(payload?.error ?? 'Failed to load short quotation')
        }
        shortContent = payload.data.draft?.content ?? payload.data.defaultDraft?.content
      }
      if (!shortContent || !isShortQuotationContent(shortContent)) {
        toast.error(`No valid short quotation content found to import`)
        return
      }
      const detailContent = convertShortToDetailContent(shortContent, { preserveHeader: true, fullTemplates })
      // Preserve current metadata from the active slot
      const merged = {
        ...detailContent,
        versionTitle: content?.versionTitle ?? `Version ${slotIndex}`,
        quotationDate: content?.quotationDate ?? detailContent.quotationDate,
      }
      setContent(normalizeQuotationContent(withDetailQuotationDefaults(merged)))
      toast.success(
        `Imported short quotation — review and save when ready`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import short quotation')
    } finally {
      setImportingShort(false)
    }
  }

  const handlePrint = () => openLivePreviewTab()

  const canStartWork =
    !isPlayground &&
    (leadSubStatus === 'QUOTATION_ASSIGNED' || leadSubStatus === 'QUOTATION_CORRECTION')

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
  const taskbarFloorId = activeFloorId ?? displayContent.sections.at(-1)?.id ?? null
  const floorAreas = taskbarFloorId
    ? [...(displayContent.areas ?? [])]
        .filter((area) => area.floorId === taskbarFloorId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : []
  const taskbarAreaId =
    activeAreaId && floorAreas.some((a) => a.id === activeAreaId)
      ? activeAreaId
      : floorAreas.at(-1)?.id ?? null

  const activeFloorObj = displayContent.sections.find((s) => s.id === taskbarFloorId)
  const activeAreaObj = floorAreas.find((a) => a.id === taskbarAreaId)
  const activeTargetName = activeAreaObj?.name
    ? `${activeFloorObj?.name ?? ''} → ${activeAreaObj.name}`
    : activeFloorObj?.name ?? ''
  const openTaskbarSavedItem = () => {
    if (!taskbarFloorId) {
      toast.error('Add a floor first')
      return
    }
    openItemPicker(taskbarFloorId, taskbarAreaId ?? undefined)
  }
  const openTaskbarCustomItem = () => {
    if (!taskbarFloorId) {
      toast.error('Add a floor first')
      return
    }
    setCustomTypeFloorId(taskbarFloorId)
    setCustomTypeAreaId(taskbarAreaId)
  }

return (
    <div className="space-y-5 pb-28 print:pb-0 quotation-maker-root">
      <Card className="overflow-hidden border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-lg print:hidden">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-2xl text-amber-950">Detail Quotation Studio</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isPlayground ? 'Premium playground for templates and pricing' : `${leadName} • floor-wise premium quotation workspace`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeVersionKey ? (
                <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/90 px-3 py-1 text-xs font-semibold text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200">
                  <span>Version: {content?.versionTitle || activeVersionKey}</span>
                  <button
                    type="button"
                    onClick={() => { setActiveVersionKey(null); void loadDraft(); }}
                    className="ml-1 rounded px-1 text-amber-800 hover:bg-amber-200/80 hover:text-black dark:text-amber-300 dark:hover:bg-amber-900 font-bold cursor-pointer"
                    title="Switch back to standard working slot"
                  >
                    ✕
                  </button>
                </div>
              ) : null}
              {isPlayground ? (
                <Badge variant="outline">Playground</Badge>
              ) : (
                <Badge variant="outline">{formatLabel(leadSubStatus)}</Badge>
              )}
            </div>
          </div>

          {/* Quotation Version Tabs (3 Versions Always Present) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200/60 pt-4 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                Quotation Versions:
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {availableSlots.map((s) => {
                  const isActive = s.slotIndex === slotIndex
                  return (
                    <button
                      key={s.slotIndex}
                      type="button"
                      onClick={() => handleSwitchSlot(s.slotIndex)}
                      className={`group relative flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all cursor-pointer shadow-sm ${
                        isActive
                          ? 'border-amber-600 bg-amber-600 text-white shadow-md ring-2 ring-amber-400/40'
                          : 'border-slate-200 bg-white hover:bg-amber-50 text-slate-800'
                      }`}
                    >
                      <span className="font-semibold text-sm">{s.title}</span>
                      {s.grandTotal > 0 ? (
                        <span className={`ml-1 text-xs opacity-90 ${isActive ? 'text-amber-100' : 'text-slate-500'}`}>
                          ({formatCurrency(s.grandTotal)})
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 border-t border-amber-100 bg-background p-5 text-foreground md:p-6">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Client</p>
              <p className="text-sm font-medium">{leadName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Quotation Date</p>
              <Input
                type="text"
                value={displayContent.quotationDate ?? ''}
                disabled={!canEdit}
                onChange={(event) => updateContentField({ quotationDate: event.target.value })}
                placeholder="e.g. 15 October 2026 or DD-MM-YYYY"
                className="h-8"
              />
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
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <div className="text-sm">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {content?.quotationCode ?? 'Not downloaded yet'}
                </p>
                {content?.downloadedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last download: {new Date(content.downloadedAt).toLocaleString()}
                  </p>
                )}
              </div>
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
            <Button
              type="button"
              variant="outline"
              className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-950/40"
              disabled={!canEdit}
              onClick={() => addFinishingElectricalWork()}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Finishing & Electrical Work
            </Button>
            {!isPlayground && (
              <Button
                type="button"
                variant="outline"
                className="border-sky-500 text-sky-700 hover:bg-sky-50 dark:border-sky-600 dark:text-sky-300 dark:hover:bg-sky-950/40"
                disabled={!canEdit || importingShort}
                onClick={() => void openImportDialog()}
                title="Load data from the saved short quotation for this lead into the detail quotation editor"
              >
                {importingShort ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                )}
                {importingShort ? 'Importing...' : 'Import from Short Quotation'}
              </Button>
            )}

            {/* ── Version Save / Save As buttons ── */}
            {activeVersionKey ? (
              <Button
                type="button"
                disabled={!canEdit || savingVersion}
                onClick={() => void handleSaveVersion()}
                title="Save updates to the currently loaded version"
              >
                <Save className="mr-1.5 h-4 w-4" />
                {savingVersion ? 'Saving Version...' : 'Save Version'}
              </Button>
            ) : null}

            <Button type="button" variant="outline" disabled={!canEdit || saving} onClick={() => void saveDraft(false)}>
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="default"
              className="bg-black text-white hover:bg-neutral-800"
              disabled={!canEdit || saving}
              onClick={() => {
                setConfirmClientNameInput('')
                setSaveAllConfirmOpen(true)
              }}
              title="Save current quotation data into all 3 versions"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? 'Saving...' : 'Save in All'}
            </Button>

            {!isPlayground && canEdit ? (
              <Button
                type="button"
                variant="outline"
                disabled={saving || savingAs}
                onClick={() => { setSaveAsName(''); setSaveAsDialogOpen(true) }}
                title="Save a named copy of the current quotation state"
              >
                <SaveAll className="mr-1.5 h-4 w-4" />
                Save As Version
              </Button>
            ) : null}

            {!isPlayground ? (
              <Button
                type="button"
                variant="outline"
                onClick={openVersionsDialog}
                title="View and load saved quotation versions"
              >
                <History className="mr-1.5 h-4 w-4" />
                Quotation Versions
              </Button>
            ) : null}
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
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
              <p className="font-semibold">⚠ Read-only — your changes are NOT being saved.</p>
              <p className="mt-1 text-xs">
                {canStartWork
                  ? 'Click "Start Work" above to enable editing and saving.'
                  : 'Only an assigned quotation team member can edit this draft while it is in Working or Correction status.'}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CollapsibleCard title="Letterhead & footer" defaultOpen={false}>
        <p className="mb-3 text-sm text-muted-foreground">Default subject, intro letter, terms, payment and signature details stay here so frequent editors can focus on pricing below.</p>
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
            <p className="text-xs font-medium text-muted-foreground">Client Name</p>
            <Input
              value={displayContent.clientName ?? leadName}
              disabled={!canEdit}
              onChange={(event) => updateContentField({ clientName: event.target.value })}
              placeholder="Client Name"
            />
            <p className="text-[11px] text-muted-foreground">
              Auto-filled from lead name; edit here for the quotation PDF.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">PDF location</p>
            <Input
              value={displayContent.clientAddress ?? leadLocation ?? ''}
              disabled={!canEdit}
              onChange={(event) => updateContentField({ clientAddress: event.target.value })}
              placeholder="Quotation PDF location"
            />
            <p className="text-[11px] text-muted-foreground">
              Auto-filled from lead location; edit here for the quotation PDF.
            </p>
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
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Mode of Payment</p>
            <Textarea
              rows={3}
              disabled={!canEdit}
              value={displayContent.paymentTerms ?? ''}
              onChange={(event) => updateContentField({ paymentTerms: event.target.value })}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Duration of Work</p>
            <Textarea
              rows={3}
              disabled={!canEdit}
              value={displayContent.durationNotes ?? ''}
              onChange={(event) => updateContentField({ durationNotes: event.target.value })}
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
          const isFE = floor.sectionType === 'FINISHING_ELECTRICAL' || floor.name === 'Finishing & Electrical Works'
          const floorAreas = [...(content.areas ?? [])]
            .filter((area) => area.floorId === floor.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
          const allLineItems = Array.isArray(content.lineItems) ? content.lineItems : []
          const unassignedLines = allLineItems.filter((line) => line.sectionId === floor.id && !line.areaId)
          const namedAreaGroups = floorAreas.map((area) => ({ area, lines: allLineItems.filter((line) => line.sectionId === floor.id && line.areaId === area.id) }))
          const generalAreaGroup = { area: { id: `general-${floor.id}`, floorId: floor.id, name: 'General Area', sortOrder: 0 }, lines: unassignedLines }
          const areaGroups = isFE
            ? [{ area: { id: `fe-${floor.id}`, floorId: floor.id, name: '', sortOrder: 0 }, lines: allLineItems.filter((line) => line.sectionId === floor.id) }]
            : floorAreas.length > 0
              ? [generalAreaGroup, ...namedAreaGroups].filter((group) => group.lines.length > 0 || !group.area.id.startsWith('general-'))
              : [{ ...generalAreaGroup, lines: allLineItems.filter((line) => line.sectionId === floor.id) }]
          const floorLineCount = areaGroups.reduce((sum, group) => sum + group.lines.length, 0)

          return (
            <Card
              key={floor.id}
              id={`quotation-floor-${floor.id}`}
              data-floor-id={floor.id}
              className="scroll-mt-24 overflow-hidden border-muted/60 shadow-sm print:hidden"
            >
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
                    <Badge variant="secondary">{floorLineCount} item(s)</Badge>
                  </div>
                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      {!isFE ? (
                        <>
                          <Button type="button" size="sm" variant="outline" onClick={() => addArea(floor.id)}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add Area
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => addFinishingElectricalWork(floor.id)}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Finishing & Electrical
                          </Button>
                        </>
                      ) : (
                        <Button type="button" size="sm" variant="outline" onClick={() => addFinishingElectricalWork(floor.id)}>
                          <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFloor(floor.id)}
                        aria-label={`Delete ${floor.name || 'floor'}`}
                        title="Delete floor and its items"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {areaGroups.map(({ area, lines }) => (
                  <div
                    key={area.id}
                    id={`quotation-area-${area.id}`}
                    data-floor-id={floor.id}
                    data-area-id={area.id.startsWith('general-') ? '' : area.id}
                    className="overflow-hidden rounded-lg border bg-background"
                  >
                    {area.name ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                        <Input
                          value={area.name}
                          disabled={!canEdit || area.id.startsWith('general-')}
                          placeholder="e.g. Living Area, Master Bed"
                          className="h-8 max-w-xs text-sm font-semibold"
                          onChange={(event) => setContent((prev) => (prev ? updateAreaName(prev, area.id, event.target.value) : prev))}
                        />
                        {canEdit ? (
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => openItemPicker(floor.id, area.id.startsWith('general-') ? undefined : area.id)}>
                              <Plus className="mr-1 h-3.5 w-3.5" /> Add from saved list
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => { setCustomTypeFloorId(floor.id); setCustomTypeAreaId(area.id.startsWith('general-') ? null : area.id) }}>
                              Custom item
                            </Button>
                            {!area.id.startsWith('general-') ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => removeArea(area.id)}
                                aria-label={`Delete ${area.name || 'area'}`}
                                title="Delete area and its items"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {lines.length === 0 ? <div className="px-4 py-6 text-center text-sm text-muted-foreground">No items in this area yet.</div> : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-sm">
                          <thead className="bg-muted/50 text-left"><tr>{canEdit && <th className="w-6 px-1 py-2" />}<th className="w-10 px-2 py-2 text-center font-medium" title="Include in quotation">Inc</th><th className="w-12 px-3 py-2 font-medium">SL</th><th className="min-w-[160px] px-3 py-2 font-medium">Name</th><th className="min-w-[280px] px-3 py-2 font-medium">Materials</th><th className="px-3 py-2 font-medium">Unit price</th><th className="px-3 py-2 font-medium">Qty / SFT</th><th className="px-3 py-2 text-right font-medium">Total</th><th className="px-3 py-2" /></tr></thead>
                          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={(event) => reorderFloorLines(floor.id, event)}>
                            <SortableContext items={lines.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                              <tbody>{lines.map((line, lineIndex) => <SortableRow key={line.id} line={line} lineIndex={lineIndex} slNumber={editorLineSlMap.get(line.id)} isPkg={isPackageLine(line)} canEdit={canEdit} updateLineItem={updateLineItem} removeLine={removeLine} lineNeedsManualPrice={lineNeedsManualPrice} />)}</tbody>
                            </SortableContext>
                          </DndContext>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
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


      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 px-3 py-3 shadow-[0_-18px_45px_-28px_rgba(15,23,42,0.55)] backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={!canEdit} onClick={addFloor}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Floor
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-950/40"
            disabled={!canEdit}
            onClick={() => addFinishingElectricalWork()}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Finishing & Electrical Work
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!canEdit || !activeFloorId} onClick={() => addArea()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Area
          </Button>
          <Button type="button" size="sm" disabled={!canEdit || saving} onClick={() => void saveDraft()}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={openLivePreviewTab}>
            <ExternalLink className="mr-1.5 h-4 w-4" />
            Live Preview
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={generatingPdf}
            onClick={async () => {
              if (!content || !totals) return
              setGeneratingPdf(true)
              try {
                const downloadedAt = new Date().toISOString()
                const contentForDownload = {
                  ...withDetailQuotationDefaults(content),
                  downloadedAt,
                }
                const safeClientName = (content.clientName || leadName || 'Client').replace(/[^a-z0-9]/gi, '_').toLowerCase()
                await downloadPdfFromDocument(
                  <DetailQuotationDocument
                    clientName={content.clientName || leadName || 'Client'}
                    clientAddress={content.clientAddress || leadLocation || null}
                    content={contentForDownload}
                    totals={totals}
                    variant="checklist"
                  />,
                  `Checklist_PDF_${safeClientName}.pdf`,
                )
                toast.success('Checklist PDF downloaded')
              } catch (error) {
                console.error('Failed to generate Checklist PDF:', error)
                toast.error('Failed to generate Checklist PDF')
              } finally {
                setGeneratingPdf(false)
              }
            }}
            title="Download checklist PDF with blank unit price and total price columns"
          >
            {generatingPdf ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-4 w-4" />
                Checklist PDF
              </>
            )}
          </Button>
          {!pathname.startsWith('/quotation-team') ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={generatingPdf}
              onClick={async () => {
                if (!content || !totals) return
                setGeneratingPdf(true)
                try {
                  const downloadedAt = new Date().toISOString()
                  const contentForDownload = {
                    ...content,
                    downloadedAt,
                  }
                  const safeClientName = (content.clientName || leadName || 'Client').replace(/[^a-z0-9]/gi, '_').toLowerCase()
                  await downloadPdfFromDocument(
                    <DetailQuotationDocument
                      clientName={content.clientName || leadName || 'Client'}
                      clientAddress={content.clientAddress || leadLocation || null}
                      content={contentForDownload}
                      totals={totals}
                      isBlank={true}
                      layout={pathname.startsWith('/quotation-team') ? 'standard' : 'compact'}
                    />,
                    `Blank_Detail_Quotation_${safeClientName}.pdf`,
                  )
                  toast.success('Blank Detail Quotation PDF downloaded')
                } catch (error) {
                  console.error('Failed to generate Blank PDF:', error)
                  toast.error('Failed to generate Blank PDF')
                } finally {
                  setGeneratingPdf(false)
                }
              }}
              className="border-primary/40 text-primary hover:bg-primary/10"
              title="Download Detail Quotation PDF with blank rates and totals"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Generating Blank...
                </>
              ) : (
                <>
                  <Download className="mr-1.5 h-4 w-4" />
                  Blank Quotation
                </>
              )}
            </Button>
          ) : null}
          {!isPlayground ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/quotation-team/my-work">Back to My Work</Link>
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="secondary" disabled={!canEdit || !taskbarFloorId} onClick={openTaskbarSavedItem}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add from Saved Item {activeTargetName ? `(${activeTargetName})` : ''}
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={!canEdit || !taskbarFloorId} onClick={openTaskbarCustomItem}>
            Custom Item {activeTargetName ? `(${activeTargetName})` : ''}
          </Button>
          <span className="text-xs text-muted-foreground">Ctrl+S saves</span>
        </div>
      </div>

      <QuotationItemPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        catalogs={templates}
        fullTemplates={fullTemplates}
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
                if (customTypeFloorId) addCustomLine(customTypeFloorId, customTypeAreaId ?? undefined, 'regular')
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
                if (customTypeFloorId) addCustomLine(customTypeFloorId, customTypeAreaId ?? undefined, 'package')
                setCustomTypeFloorId(null)
              }}
            >
              <span className="font-semibold">Package item</span>
              <span className="text-xs text-muted-foreground">Fixed total price, no unit price or sqft needed</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Unsaved Version Switch */}
      <Dialog open={unsavedSwitchModalOpen} onOpenChange={setUnsavedSwitchModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Unsaved Changes in {getDetailVersionTitle(slotIndex)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm text-muted-foreground">
            <p>
              You have unsaved changes in the <strong>{getDetailVersionTitle(slotIndex)}</strong> version. What would you like to do before switching to <strong>{pendingSlotIndex ? getDetailVersionTitle(pendingSlotIndex) : 'the selected'}</strong> version?
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUnsavedSwitchModalOpen(false)
                setPendingSlotIndex(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setUnsavedSwitchModalOpen(false)
                if (pendingSlotIndex !== null) {
                  const target = pendingSlotIndex
                  setPendingSlotIndex(null)
                  setSlotIndex(target)
                  void loadDraft(target)
                }
              }}
            >
              Discard & Switch
            </Button>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={saving}
              onClick={async () => {
                setUnsavedSwitchModalOpen(false)
                if (pendingSlotIndex !== null) {
                  const target = pendingSlotIndex
                  setPendingSlotIndex(null)
                  await saveDraft(false)
                  setSlotIndex(target)
                  void loadDraft(target)
                }
              }}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save & Switch
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Save in All */}
      <Dialog open={saveAllConfirmOpen} onOpenChange={setSaveAllConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Save to All Quotation Versions?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              This action will copy and save the current quotation items and pricing into <strong>Version 1, Version 2, and Version 3</strong>.
            </p>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              To confirm, please type the client name: <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-100">{content?.clientName || leadName}</span>
            </p>
            <Input
              type="text"
              value={confirmClientNameInput}
              onChange={(e) => setConfirmClientNameInput(e.target.value)}
              placeholder={`Type "${content?.clientName || leadName}" to confirm`}
              className="h-9"
              onKeyDown={(e) => {
                const expected = (content?.clientName || leadName || '').trim().toLowerCase()
                if (e.key === 'Enter' && confirmClientNameInput.trim().toLowerCase() === expected && !saving) {
                  setSaveAllConfirmOpen(false)
                  void saveDraft(true)
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setSaveAllConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-black text-white hover:bg-neutral-800"
              disabled={
                confirmClientNameInput.trim().toLowerCase() !== (content?.clientName || leadName || '').trim().toLowerCase() ||
                saving
              }
              onClick={async () => {
                setSaveAllConfirmOpen(false)
                await saveDraft(true)
              }}
            >
              {saving ? 'Saving...' : 'Confirm & Save in All'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Import from Short Quotation dialog (supports versions) ── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Import from Short Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <p className="text-xs text-muted-foreground">
              Select a saved short quotation version or a standard package tier. All floors, rooms, and items (including disabled items) will be imported into this detail editor.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2">
              ⚠ This will replace the current content in the editor. Your changes will NOT be auto-saved — click Save after reviewing.
            </p>

            {/* Saved Short Quotation Versions */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Saved Short Quotation Versions
              </span>
              {loadingShortVersions ? (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Loading versions...
                </div>
              ) : shortVersionsList.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No named short versions saved yet.</p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-auto pr-1">
                  {shortVersionsList.map((ver) => (
                    <div
                      key={ver.id}
                      className="flex items-center justify-between rounded-lg border bg-background p-2.5 transition hover:border-sky-300 hover:bg-sky-50/50 dark:hover:bg-sky-950/20"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate text-xs font-semibold">{ver.versionTitle}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {ver.packageTier ? `${ver.packageTier} • ` : ''}
                          ৳{ver.grandTotal.toLocaleString()}
                          {ver.sqft ? ` • ${ver.sqft} sqft` : ''}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-sky-500 text-sky-700 hover:bg-sky-100 dark:text-sky-300"
                        disabled={importingShort}
                        onClick={() => void importFromShortQuotation(undefined, ver.draftKey)}
                      >
                        <ArrowDownToLine className="mr-1 h-3.5 w-3.5" />
                        Import
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Standard Package Tiers */}
            <div className="space-y-2 border-t pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Or Import Base Package Tier
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {(['PLATINUM', 'PREMIUM', 'LUXURY', 'MIX'] as const).map((tier) => (
                  <Button
                    key={tier}
                    type="button"
                    variant="outline"
                    className="justify-start gap-1.5 text-xs font-medium"
                    disabled={importingShort}
                    onClick={() => void importFromShortQuotation(tier)}
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                    {shortPackageTierLabel(tier)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button type="button" variant="ghost" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Save As Version ── */}
      <Dialog open={saveAsDialogOpen} onOpenChange={setSaveAsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save As New Detail Quotation Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">
              Enter a unique version name for this lead (e.g. &quot;Option B - Minimal Work&quot;, &quot;Revised BOQ&quot;).
              Any unchecked items will remain disabled in this version.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="save-as-name-detail-input" className="text-xs font-semibold">Version Name</label>
              <Input
                id="save-as-name-detail-input"
                autoFocus
                placeholder="e.g. Option B - Without Modular Kitchen"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && saveAsName.trim() && !savingAs) {
                    void handleSaveAs()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={savingAs}
              onClick={() => setSaveAsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!saveAsName.trim() || savingAs}
              onClick={() => void handleSaveAs()}
            >
              {savingAs ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Version'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Quotation Versions List ── */}
      <Dialog open={versionsDialogOpen} onOpenChange={setVersionsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
              <div>
                <DialogTitle className="text-lg font-bold">Detail Quotation Versions</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select any saved version to load and review in the editor.
                </p>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    setNewVersionName('')
                    setNewVersionDialogOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Version (Blank)
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {activeVersionKey ? (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                <span>
                  Currently editing version: <strong className="font-semibold">{content?.versionTitle || activeVersionKey}</strong>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-amber-900 hover:bg-amber-200/60 dark:text-amber-200"
                  onClick={() => {
                    setActiveVersionKey(null)
                    void loadDraft(slotIndex)
                    setVersionsDialogOpen(false)
                  }}
                >
                  Switch back to Slot {slotIndex} Draft
                </Button>
              </div>
            ) : null}

            {loadingVersions ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading saved versions...
              </div>
            ) : versionsList.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <p className="font-medium">No named versions saved yet.</p>
                <p className="mt-1 text-xs">
                  Click &quot;Save As Version&quot; in the studio toolbar to snapshot your current quotation as a version.
                </p>
              </div>
            ) : (
              <div className="max-h-[380px] overflow-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Version Name</th>
                      <th className="px-3 py-2.5 font-semibold">Rate Type</th>
                      <th className="px-3 py-2.5 font-semibold">Project Sqft</th>
                      <th className="px-3 py-2.5 font-semibold">Total Amount</th>
                      <th className="px-3 py-2.5 font-semibold">Last Saved</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {versionsList.map((ver) => {
                      const isCurrent = activeVersionKey === ver.draftKey
                      return (
                        <tr
                          key={ver.id}
                          className={`hover:bg-muted/30 transition-colors ${
                            isCurrent ? 'bg-amber-50/70 dark:bg-amber-950/20 font-medium' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5 font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{ver.versionTitle}</span>
                              {isCurrent ? (
                                <Badge variant="secondary" className="bg-amber-200/80 text-amber-900 text-[10px] py-0 px-1.5">
                                  Active
                                </Badge>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {ver.quotationType ? ver.quotationType.toLowerCase() : 'standard'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {ver.sqft ? `${ver.sqft} sqft` : '—'}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-foreground">
                            ৳{ver.grandTotal.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {new Date(ver.updatedAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {isCurrent ? (
                              <span className="text-[11px] font-semibold text-emerald-600">Loaded</span>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => void loadVersion(ver)}
                              >
                                Open
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setVersionsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Create New Version from Blank Template (Detail) ── */}
      <Dialog open={newVersionDialogOpen} onOpenChange={setNewVersionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Detail Version (Blank Template)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">
              Create a fresh detail quotation version from scratch with a blank template and start adding floors &amp; items.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="new-version-name-detail-input" className="text-xs font-semibold">Version Name</label>
              <Input
                id="new-version-name-detail-input"
                autoFocus
                placeholder="e.g. Option C - Budget Friendly"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Rate Type</label>
              <Select
                value={newVersionType}
                onValueChange={(val) => setNewVersionType(val as QuotationFileType)}
              >
                <SelectTrigger>
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
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={creatingBlankVersion}
              onClick={() => setNewVersionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!newVersionName.trim() || creatingBlankVersion}
              onClick={() => void handleCreateBlankVersion()}
            >
              {creatingBlankVersion ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Version'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type SortableRowProps = {
  line: QuotationLineItem
  lineIndex: number
  slNumber?: number
  isPkg: boolean
  canEdit: boolean
  updateLineItem: (id: string, patch: Partial<QuotationLineItem>) => void
  removeLine: (id: string) => void
  lineNeedsManualPrice: (line: QuotationLineItem) => boolean
}

function SortableRow({ line, lineIndex, slNumber, isPkg, canEdit, updateLineItem, removeLine, lineNeedsManualPrice }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: line.id })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isIncluded = line.included !== false

  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isIncluded ? 1 : 0.38,
    backgroundColor: isDragging
      ? 'hsl(var(--muted))'
      : !isIncluded
        ? 'rgba(0, 0, 0, 0.04)'
        : undefined,
  }

  function fmt(v: number) {
    if (!v || v <= 0) return '---'
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
  }

  function handleBoldMaterials() {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const val = line.materials ?? ''
    const selected = val.substring(start, end)

    let nextVal = ''
    let newStart = start
    let newEnd = end

    if (selected.length > 0) {
      if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
        const unwrapped = selected.slice(2, -2)
        nextVal = val.substring(0, start) + unwrapped + val.substring(end)
        newStart = start
        newEnd = start + unwrapped.length
      } else {
        const wrapped = `**${selected}**`
        nextVal = val.substring(0, start) + wrapped + val.substring(end)
        newStart = start
        newEnd = start + wrapped.length
      }
    } else {
      const placeholder = '**bold text**'
      nextVal = val.substring(0, start) + placeholder + val.substring(end)
      newStart = start + 2
      newEnd = start + placeholder.length - 2
    }

    updateLineItem(line.id, { materials: nextVal })

    setTimeout(() => {
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(newStart, newEnd)
      }
    }, 0)
  }

  return (
    <tr
      id={`detail-line-${line.id}`}
      ref={setNodeRef}
      style={rowStyle}
      className={`border-t align-top scroll-mt-28 transition-all duration-150 ${
        !isIncluded ? 'opacity-40 bg-slate-100/60 dark:bg-slate-900/40' : ''
      }`}
    >
      {canEdit && (
        <td className="px-1 py-2 text-muted-foreground">
          <button
            type="button"
            className="cursor-grab touch-none rounded p-1 hover:bg-muted active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td className="px-2 py-2 text-center align-middle">
        <input
          type="checkbox"
          checked={isIncluded}
          disabled={!canEdit}
          onChange={(e) => updateLineItem(line.id, { included: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
          title={isIncluded ? 'Uncheck to temporarily exclude from this version' : 'Check to enable product'}
        />
      </td>
      <td className="px-3 py-2 text-muted-foreground">{slNumber ?? (lineIndex + 1)}</td>
      <td className="px-3 py-2 max-w-[200px]">
        {canEdit ? (
          <div className="space-y-0.5">
            <Input
              value={line.description}
              className={`break-words ${!isIncluded ? 'text-muted-foreground' : ''}`}
              onChange={(e) => updateLineItem(line.id, { description: e.target.value })}
            />
            {!isIncluded && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Disabled in version
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            <span className={`break-words ${!isIncluded ? 'line-through text-muted-foreground' : ''}`}>
              {line.description}
            </span>
            {!isIncluded && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Disabled in version
              </p>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2 max-w-[350px]">
        {canEdit ? (
          <div className="space-y-1">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleBoldMaterials}
                title="Bold selection (**text** or Ctrl+B)"
                className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Bold className="h-3 w-3" />
                Bold
              </button>
            </div>
            <Textarea
              ref={textareaRef}
              rows={4}
              value={line.materials ?? ''}
              className="min-w-[260px] text-xs break-words"
              placeholder="Materials / specification (select text and click Bold)"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                  e.preventDefault()
                  handleBoldMaterials()
                }
              }}
              onChange={(e) => updateLineItem(line.id, { materials: e.target.value })}
            />
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-xs break-words">{line.materials || '—'}</p>
        )}
      </td>
      {isPkg ? (
        <>
          <td className="px-3 py-2 max-w-[150px]">
            {canEdit ? (
              <Input
                type="text"
                value={line.unitPriceLabel === 'as per project design' ? '' : (line.unitPriceLabel ?? '')}
                placeholder="--"
                onChange={(e) => updateLineItem(line.id, { unitPriceLabel: e.target.value })}
              />
            ) : (
              <span className="break-all">{line.unitPriceLabel && line.unitPriceLabel !== 'as per project design' ? line.unitPriceLabel : '--'}</span>
            )}
          </td>
          <td className="px-3 py-2 max-w-[100px]">
            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 break-words">Package</span>
          </td>
        </>
      ) : (
        <>
          <td className="px-3 py-2 max-w-[120px]">
            {canEdit ? (
              <Input type="text" inputMode="decimal"
                value={line.rate > 0 ? String(line.rate) : ''}
                placeholder={lineNeedsManualPrice(line) ? 'Enter price' : '0'}
                onChange={(e) => updateLineItem(line.id, { rate: Number(e.target.value.replace(/,/g, '')) || 0 })} />
            ) : <span className="break-all">{fmt(line.rate)}</span>}
            <p className="mt-1 text-[11px] text-muted-foreground break-words">PDF: {formatTemplatePriceHint(line)}</p>
          </td>
          <td className="px-3 py-2 max-w-[120px]">
            {canEdit ? (
              <div className="space-y-1">
                <Input type="text" inputMode="decimal" 
                  value={line.quantity > 0 ? String(line.quantity) : ''}
                  placeholder="Qty/SFT"
                  onChange={(e) => updateLineItem(line.id, { quantity: Number(e.target.value.replace(/,/g, '')) || 0 })} />
                <Select
                  value={line.unit ?? 'sqft'}
                  onValueChange={(val) => updateLineItem(line.id, { unit: val as QuotationUnit })}
                >
                  <SelectTrigger className="h-6 text-[10px] px-1 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sqft">sqft</SelectItem>
                    <SelectItem value="nos">nos</SelectItem>
                    <SelectItem value="ls">ls</SelectItem>
                    <SelectItem value="rmt">rmt</SelectItem>
                    <SelectItem value="rft">rft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : <span className="break-all">{line.quantity} {line.unit}</span>}
          </td>
        </>
      )}
      <td className="px-3 py-2 text-right font-medium max-w-[150px]">
        {(() => {
          const isFE = Boolean(line.isFinishingElectrical)
          // FE case 4: both rate AND qty present → auto-calculated, not editable
          const isFEAutoCalc = isFE && line.rate > 0 && line.quantity > 0
          // Total is editable for: package lines, or FE lines where total is manually entered (cases 1/2/3)
          const canEditTotal = canEdit && (isPkg || (isFE && !isFEAutoCalc))
          return canEditTotal ? (
            <Input type="text" inputMode="decimal" className="text-right"
              value={line.amount > 0 ? String(line.amount) : ''}
              placeholder="Total"
              onChange={(e) => updateLineItem(line.id, { amount: Number(e.target.value.replace(/,/g, '')) || 0 })} />
          ) : <span className={`break-all ${!isIncluded ? 'line-through text-muted-foreground' : ''}`}>{fmt(line.amount)}</span>
        })()}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          {!isIncluded && canEdit && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
              onClick={() => updateLineItem(line.id, { included: true })}
              title="Click to re-enable product"
            >
              Enable
            </Button>
          )}
          {canEdit && (
            <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(line.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}
