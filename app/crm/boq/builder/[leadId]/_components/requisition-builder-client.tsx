'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  Boxes,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Target,
  Package,
  Layers,
  Building,
  Folder,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Download,
  Wrench,
  Pin,
  FlaskConical,
  Receipt,
  Lightbulb,
  Zap,
  Check,
  X,
} from 'lucide-react'
import { saveMaterialRequisition, RequisitionItemInput } from '@/lib/boq-service'
import { DEFAULT_CABINET_CATALOG, getCabinetThicknessOptions } from '@/lib/boq-cabinet-catalog'
import {
  inferProductCategoryRule,
  UI_SECTION_CATEGORIES,
  type UiSectionCategory,
} from '@/lib/boq-product-category-map'
import { RequisitionPdfExportModal } from './requisition-pdf-modal'
import type {
  QuotationDraftContent,
  QuotationSection,
  QuotationArea,
  QuotationLineItem,
} from '@/lib/quotation-types'

import type {
  RequisitionWorkCategory,
  WallPanelingSubType,
  CabinetSubType,
  AccessoriesSubType,
  ApplianceSubType,
  CeilingSubType,
  ViewModeType,
  CardSection,
  SectionsMap,
  ItemsMap,
  RequisitionFieldValue,
  SavedRequisitionItem,
  BoardVariantAttributes,
  BoqSavedAccessoryItem,
  BoqSavedApplianceItem,
  Props,
} from './types/boq-builder-types'
import {
  WORK_CATEGORIES,
  UOM_OPTIONS,
  EXTRA_KEY,
  DEFAULT_ACCESSORY_CATEGORIES,
  DEFAULT_SAVED_ACCESSORIES,
  DEFAULT_APPLIANCE_CATEGORIES,
  DEFAULT_SAVED_APPLIANCES,
  BOARD_BASE_MATERIAL_GROUPS,
  BOARD_BASE_MATERIALS,
  BOARD_LAMINATE_CATALOG,
  WALL_PANELING_SUBTYPES,
  WALL_PANEL_ONLY_SUBTYPES,
  HARDWARE_ONLY_SUBTYPES,
  HARDWARE_COLORS,
  CABINET_SUBTYPES,
  ACCESSORIES_SUBTYPES,
  APPLIANCE_SUBTYPES,
  CEILING_SUBTYPES,
  CATEGORY_COLORS,
} from './constants/boq-builder-constants'
import {
  scheduleItem,
  CEILING_LIGHTING_CATALOG,
  CEILING_LIGHTING_SCHEDULE,
  CEILING_ELECTRICAL_CATALOG,
  CEILING_ELECTRICAL_SCHEDULE,
  ELECTRICAL_WORK_SCHEDULE,
} from './constants/boq-lighting-electrical-catalogs'
import {
  SAMPLE_WALL_PANEL_ITEMS,
  SAMPLE_LOUVER_PROFILE_ITEMS,
  SAMPLE_SCREW_FASTENER_ITEMS,
  SAMPLE_NAIL_PIN_ITEMS,
  SAMPLE_ADHESIVE_CHEMICAL_ITEMS,
  SAMPLE_CABINET_CORE_BOARD_ITEMS,
  SAMPLE_CABINET_HPL_PASTING_ITEMS,
  SAMPLE_ACCESSORY_HARDWARE_ITEMS,
  SAMPLE_ACCESSORY_SERVICES_ITEMS,
  SAMPLE_CORE_APPLIANCE_ITEMS,
} from './constants/boq-seed-catalogs'

export type {
  RequisitionWorkCategory,
  WallPanelingSubType,
  CabinetSubType,
  AccessoriesSubType,
  ApplianceSubType,
  CeilingSubType,
  ViewModeType,
  CardSection,
  SectionsMap,
  ItemsMap,
  RequisitionFieldValue,
  SavedRequisitionItem,
  BoardVariantAttributes,
  BoqSavedAccessoryItem,
  BoqSavedApplianceItem,
  Props,
}
export {
  DEFAULT_ACCESSORY_CATEGORIES,
  DEFAULT_SAVED_ACCESSORIES,
  DEFAULT_APPLIANCE_CATEGORIES,
  DEFAULT_SAVED_APPLIANCES,
  CEILING_LIGHTING_CATALOG,
  CEILING_LIGHTING_SCHEDULE,
  CEILING_ELECTRICAL_CATALOG,
  CEILING_ELECTRICAL_SCHEDULE,
  ELECTRICAL_WORK_SCHEDULE,
}

import {
  sectionItemKey,
  blankItem,
  flattenItems,
  parseDimensions,
  formatDimensions,
  seedFromExisting,
  computeInitialState,
} from './helpers/boq-state-seeders'
import {
  type SaveStatus,
  type PdfTableDoc,
  type PdfRgb,
  type PdfColumnStyles,
  type RequisitionPdfTableConfig,
  getViewModeForSection,
  getWorkCategoryLabel,
  formatBdtRounded,
  safePdfText,
  safeFilePart,
  cleanPdfLabel,
  getSectionTypeLabel,
  pdfAttr,
  pdfQty,
  buildSectionPdfTable,
} from './helpers/boq-pdf-builder'
import {
  DECORATIVE_PANEL_GROUPS,
  isReadymadePanel,
  isCustomizePanel,
} from './helpers/boq-panel-classification'
import {
  GRID_CELL_INPUT,
  GRID_CELL_BOLD,
  GRID_CELL_MONO,
  GRID_CELL_NUM,
  GRID_CELL_SELECT,
  GRID_TH,
  GRID_TD,
} from './constants/boq-grid-styles'
import { QuotationProductsDrawer } from './drawer/quotation-products-drawer'
import { EdgingTapeInput } from './inputs/edging-tape-input'
import { BoardDatalists } from './inputs/board-datalists'
import { CabinetCombobox } from './inputs/cabinet-combobox'
import { AccessoryItemCombobox } from './inputs/accessory-item-combobox'
import { ApplianceItemCombobox } from './inputs/appliance-item-combobox'
import { LaminateFinishPicker } from './inputs/laminate-finish-picker'
import { AddSectionForm, AddSectionModal, ScheduleSelection } from './sections/add-section-modal'




























/* ─────────────────────────────────────────────
   Sub-component: Material row table
───────────────────────────────────────────── */
import { QuotationLineItemCard } from './sections/quotation-line-item-card'
import { ExtraCard } from './sections/extra-card'
import { MaterialRowsTable } from './sections/material-rows-table'
import { SectionBlock } from './sections/section-block'

export function RequisitionBuilderClient({
  lead,
  detailQuotation,
  existingRequisition,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [lastSavedStatus, setLastSavedStatus] = useState<SaveStatus | null>(
    existingRequisition?.status === 'SUBMITTED' ? 'SUBMITTED' : existingRequisition ? 'DRAFT' : null
  )
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [notes, setNotes] = useState<string>(existingRequisition?.notes || '')
  const [boqSavedAccessories, setBoqSavedAccessories] = useState<BoqSavedAccessoryItem[]>(DEFAULT_SAVED_ACCESSORIES)

  useEffect(() => {
    fetch('/api/boq/saved-accessories')
      .then((r) => r.json())
      .then((data: { success: boolean; items?: BoqSavedAccessoryItem[] }) => {
        if (data.success && data.items) setBoqSavedAccessories(data.items)
      })
      .catch(() => {})
  }, [])

  // ── Per-section architecture state ──
  const [sectionsMap, setSectionsMap] = useState<SectionsMap>(() => computeInitialState(existingRequisition).sectionsMap)
  const [itemsMap, setItemsMap] = useState<ItemsMap>(() => computeInitialState(existingRequisition).itemsMap)

  // ── Parse quotation content ──
  const quotation = useMemo<QuotationDraftContent | null>(() => {
    if (!detailQuotation?.content) return null
    try {
      const c = detailQuotation.content
      return typeof c === 'string' ? (JSON.parse(c) as QuotationDraftContent) : (c as QuotationDraftContent)
    } catch {
      return null
    }
  }, [detailQuotation])

  const sections = useMemo<QuotationSection[]>(() => quotation?.sections ?? [], [quotation])
  const areas = useMemo<QuotationArea[]>(() => quotation?.areas ?? [], [quotation])
  const lineItems = useMemo<QuotationLineItem[]>(
    () => (quotation?.lineItems ?? []).filter((li) => li.included),
    [quotation]
  )

  const areaMap = useMemo(() => {
    const m = new Map<string, QuotationArea>()
    for (const a of areas) m.set(a.id, a)
    return m
  }, [areas])

  // ── Product slides for Level 1 focus view ──
  const productSlides = useMemo(() => {
    const slides: {
      id: string
      type: 'LINE_ITEM' | 'EXTRA'
      index: number
      title: string
      floorId?: string
      areaId?: string
      areaName?: string
      sectionName?: string
      amount: number
      quantity?: number
      unit?: string
      materials?: string | null
      item?: QuotationLineItem
    }[] = []

    let idx = 1
    for (const s of sections) {
      const sItems = lineItems.filter((li) => li.sectionId === s.id)
      for (const li of sItems) {
        const area = li.areaId ? areaMap.get(li.areaId) : undefined
        slides.push({
          id: li.id,
          type: 'LINE_ITEM',
          index: idx++,
          title: li.description,
          floorId: s.id,
          areaId: li.areaId,
          areaName: area?.name,
          sectionName: s.name,
          amount: li.amount,
          quantity: li.quantity,
          unit: li.unit,
          materials: li.materials,
          item: li,
        })
      }
    }

    // Include line items without matching section if any
    const assignedIds = new Set(slides.map((s) => s.id))
    for (const li of lineItems) {
      if (!assignedIds.has(li.id)) {
        const area = li.areaId ? areaMap.get(li.areaId) : undefined
        slides.push({
          id: li.id,
          type: 'LINE_ITEM',
          index: idx++,
          title: li.description,
          floorId: li.sectionId,
          areaId: li.areaId,
          areaName: area?.name,
          sectionName: 'General',
          amount: li.amount,
          quantity: li.quantity,
          unit: li.unit,
          materials: li.materials,
          item: li,
        })
      }
    }

    // Always include Extra & General Materials as the last slide
    slides.push({
      id: EXTRA_KEY,
      type: 'EXTRA',
      index: idx,
      title: 'Extra & General Materials',
      sectionName: 'Site Supplies & Sundries',
      amount: 0,
    })

    return slides
  }, [sections, lineItems, areaMap])

  // ── Slide view and drawer navigation state ──
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [viewModePreference, setViewModePreference] = useState<'SLIDE' | 'ALL'>('SLIDE')
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)

  // Helper: navigate slides with direction tracking
  const goToSlide = useCallback((indexOrUpdater: number | ((prev: number) => number)) => {
    setActiveSlideIndex((prev) => {
      const next = typeof indexOrUpdater === 'function' ? indexOrUpdater(prev) : indexOrUpdater
      const clamped = Math.min(Math.max(0, next), Math.max(0, productSlides.length - 1))
      setSlideDirection(clamped >= prev ? 'right' : 'left')
      return clamped
    })
  }, [productSlides.length])

  const safeSlideIndex = Math.min(Math.max(0, activeSlideIndex), Math.max(0, productSlides.length - 1))
  const currentSlide = productSlides[safeSlideIndex] ?? productSlides[0]
  const currentCardKey = currentSlide?.id ?? EXTRA_KEY
  const currentSlideSections = sectionsMap[currentCardKey] ?? []

  // ── Active section detection for bottom smart action bar (IntersectionObserver) ──
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const visibleSectionRatios = useRef(new Map<string, number>())

  useEffect(() => {
    visibleSectionRatios.current.clear()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.getAttribute('data-boq-section-id')
          if (!sectionId) return
          if (entry.isIntersecting) {
            visibleSectionRatios.current.set(sectionId, entry.intersectionRatio)
          } else {
            visibleSectionRatios.current.delete(sectionId)
          }
        })

        const mostVisible = [...visibleSectionRatios.current.entries()].sort((a, b) => b[1] - a[1])[0]
        if (mostVisible) {
          setActiveSectionId(mostVisible[0])
        }
      },
      {
        rootMargin: '-10% 0px -40% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    const sectionElements = document.querySelectorAll('[data-boq-section-id]')
    sectionElements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [sectionsMap, safeSlideIndex, viewModePreference])

  const effectiveActiveSectionId = useMemo(() => {
    if (activeSectionId && currentSlideSections.some((s) => s.id === activeSectionId)) {
      return activeSectionId
    }
    return currentSlideSections[0]?.id ?? null
  }, [activeSectionId, currentSlideSections])

  const activeSectionObj = useMemo(
    () => currentSlideSections.find((s) => s.id === effectiveActiveSectionId) ?? currentSlideSections[0] ?? null,
    [currentSlideSections, effectiveActiveSectionId]
  )

  const activeSectionName = useMemo(() => {
    if (!activeSectionObj) return null
    return getSectionTypeLabel(activeSectionObj)
  }, [activeSectionObj])

  // ── Keyboard shortcuts: Alt + ArrowLeft / Right for slides, Esc for drawer ──
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return
      }

      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        goToSlide((prev) => Math.max(0, prev - 1))
      } else if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        goToSlide((prev) => Math.min(productSlides.length - 1, prev + 1))
      } else if (event.key === 'Escape' && isDrawerOpen) {
        event.preventDefault()
        setIsDrawerOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [productSlides.length, isDrawerOpen])

  // ── Section helpers ──
  const getSectionsForCard = (cardKey: string): CardSection[] => sectionsMap[cardKey] ?? []

  const getRowsForSection = (cardKey: string, sectionId: string): RequisitionItemInput[] =>
    itemsMap[sectionItemKey(cardKey, sectionId)] ?? []

  const addSection = (
    cardKey: string,
    category: RequisitionWorkCategory,
    wallPanelingSubType?: WallPanelingSubType,
    cabinetSubType?: CabinetSubType,
    accessoriesSubType?: AccessoriesSubType,
    applianceSubType?: ApplianceSubType,
    ceilingSubType?: CeilingSubType,
    quotationLineItemId?: string,
    includeSourceSchedule = false,
  ) => {
    const isElectrical = category === 'ELECTRICAL_WORK' || (category === 'CEILING' && ceilingSubType === 'ELECTRICAL_DEVICES')
    const isLighting = category === 'CEILING' && ceilingSubType !== 'ELECTRICAL_DEVICES'
    const scheduleKey = isLighting ? 'ceiling-light-xl-v2' : isElectrical ? 'ceiling-electrical-xl-v1' : null
    if (includeSourceSchedule && scheduleKey) {
      const alreadyLoaded = (sectionsMap[cardKey] ?? []).some((section) =>
        (itemsMap[sectionItemKey(cardKey, section.id)] ?? []).some((item) => item.variantAttributes?.sourceScheduleKey === scheduleKey),
      )
      if (alreadyLoaded) {
        setSaveError(`The ${isLighting ? 'ceiling lighting' : 'electrical devices'} schedule is already loaded for this quotation item. Add rows to the existing section instead of importing it again.`)
        return
      }
    }
    const sectionId = `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const initialRows = includeSourceSchedule && isLighting
      ? CEILING_LIGHTING_SCHEDULE.map((item) => ({ ...item, quotationLineItemId, variantAttributes: { ...(item.variantAttributes || {}), ceilingSubType: 'CEILING_LIGHTING' } }))
      : includeSourceSchedule && isElectrical
      ? ELECTRICAL_WORK_SCHEDULE.map((item) => ({ ...item, quotationLineItemId, variantAttributes: { ...(item.variantAttributes || {}), ceilingSubType: 'ELECTRICAL_DEVICES' } }))
      : category === 'APPLIANCES' && applianceSubType === 'CORE_APPLIANCES'
      ? SAMPLE_CORE_APPLIANCE_ITEMS.map((item) => ({
          ...item,
          quotationLineItemId,
          variantAttributes: { ...(item.variantAttributes || {}), applianceSubType },
        }))
      : (() => {
          const item = blankItem(category, wallPanelingSubType, cabinetSubType, accessoriesSubType, applianceSubType, ceilingSubType, quotationLineItemId)
          // Auto-set srNo '1' for first cabinet row
          if (category === 'CABINETS_CLOSETS') {
            item.variantAttributes = { ...item.variantAttributes, srNo: '1', lineNo: '1' }
          }
          return [item]
        })()

    setSectionsMap((prev) => ({
      ...prev,
      [cardKey]: [...(prev[cardKey] ?? []), { id: sectionId, category, wallPanelingSubType, cabinetSubType, accessoriesSubType, applianceSubType, ceilingSubType, collapsed: false }],
    }))
    setItemsMap((prev) => ({
      ...prev,
      [sectionItemKey(cardKey, sectionId)]: initialRows,
    }))
  }


  const removeSection = (cardKey: string, sectionId: string) => {
    setSectionsMap((prev) => ({
      ...prev,
      [cardKey]: (prev[cardKey] ?? []).filter((s) => s.id !== sectionId),
    }))
    setItemsMap((prev) => {
      const next = { ...prev }
      delete next[sectionItemKey(cardKey, sectionId)]
      return next
    })
  }

  const toggleSectionCollapse = (cardKey: string, sectionId: string) => {
    setSectionsMap((prev) => ({
      ...prev,
      [cardKey]: (prev[cardKey] ?? []).map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s)),
    }))
  }

  const updateRow = (cardKey: string, sectionId: string, rowIndex: number, field: keyof RequisitionItemInput, rawValue: RequisitionFieldValue) => {
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => {
      const rows = [...(prev[key] ?? [])]
      const current = { ...rows[rowIndex], [field]: rawValue }
      if (field === 'netQuantity' && current.variantAttributes?.sourceScheduleKey) {
        const confirmed = rawValue !== '' && rawValue !== null && rawValue !== undefined && Number.isFinite(Number(rawValue))
        current.variantAttributes = { ...current.variantAttributes, sourceQuantityStatus: confirmed ? 'CONFIRMED' : 'NEEDS_CONFIRMATION' }
        if (confirmed && current.remarks?.includes('Quantity not specified in source list')) current.remarks = ''
      }
      if (field === 'netQuantity' || field === 'wastagePercent') {
        const net = Number(field === 'netQuantity' ? rawValue : current.netQuantity) || 0
        const waste = Number(field === 'wastagePercent' ? rawValue : current.wastagePercent) || 0
        current.finalQuantity = Math.round(net * (1 + waste / 100) * 100) / 100
      }
      rows[rowIndex] = current
      return { ...prev, [key]: rows }
    })
  }

  const updateVariant = (cardKey: string, sectionId: string, rowIndex: number, field: keyof BoardVariantAttributes, value: string) => {
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => {
      const rows = [...(prev[key] ?? [])]
      const current = { ...rows[rowIndex] }
      const prevAttrs: BoardVariantAttributes = current.variantAttributes || {}
      const nextAttrs = { ...prevAttrs, [field]: value }
      // Auto-rebuild dimensions string when any individual dimension field changes
      if (field === 'dimW' || field === 'dimH' || field === 'dimD') {
        nextAttrs.dimensions = formatDimensions(nextAttrs.dimW, nextAttrs.dimD, nextAttrs.dimH)
      }
      current.variantAttributes = nextAttrs
      const specParts = [
        nextAttrs.coreThickness || nextAttrs.profileType || nextAttrs.fastenerType || nextAttrs.nailType || nextAttrs.chemicalClass || nextAttrs.accessoryCategory || nextAttrs.serviceCategory || nextAttrs.brandModelCode,
        nextAttrs.baseMaterial || nextAttrs.coreSubstrateType || nextAttrs.material || nextAttrs.lengthInches || nextAttrs.lengthSpec || nextAttrs.applicationMethod || nextAttrs.itemCode || nextAttrs.quantityUnit || nextAttrs.outerDimensions,
        nextAttrs.laminateTopSurface || nextAttrs.laminateFinishDetails || nextAttrs.frontLaminateCode || nextAttrs.accentFinish || nextAttrs.gaugeSize || nextAttrs.thicknessSpec || nextAttrs.dimensions || nextAttrs.rateType || nextAttrs.cabinetNicheCutOutSize,
        nextAttrs.surfaceCodeFinish || nextAttrs.backLaminateCode || nextAttrs.sideSpecification || nextAttrs.codeVariant || nextAttrs.materialFinish || nextAttrs.unitPrice || nextAttrs.estimatedTotal || nextAttrs.mepUtilityRequirements,
      ].filter(Boolean)
      if (specParts.length > 0) current.specifications = specParts.join(' | ')
      rows[rowIndex] = current
      return { ...prev, [key]: rows }
    })
  }

  const addRow = (cardKey: string, sectionId: string, quotationLineItemId?: string) => {
    const sectionInfo = (sectionsMap[cardKey] ?? []).find((s) => s.id === sectionId)
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => {
      const existingRows = prev[key] ?? []
      const newItem = blankItem(
        sectionInfo?.category ?? 'WALL_PANELING',
        sectionInfo?.wallPanelingSubType,
        sectionInfo?.cabinetSubType,
        sectionInfo?.accessoriesSubType,
        sectionInfo?.applianceSubType,
        sectionInfo?.ceilingSubType,
        quotationLineItemId
      )
      // Auto-increment srNo for cabinet rows
      if (sectionInfo?.category === 'CABINETS_CLOSETS') {
        const nextSrNo = String(existingRows.length + 1)
        newItem.variantAttributes = { ...newItem.variantAttributes, srNo: nextSrNo, lineNo: nextSrNo }
      }
      return { ...prev, [key]: [...existingRows, newItem] }
    })
  }


  const removeRow = (cardKey: string, sectionId: string, rowIndex: number) => {
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => ({ ...prev, [key]: (prev[key] ?? []).filter((_, i) => i !== rowIndex) }))
  }

  const loadPresetForSection = (cardKey: string, sectionId: string, subType: WallPanelingSubType, quotationLineItemId?: string) => {
    const presetMap: Record<WallPanelingSubType, RequisitionItemInput[]> = {
      CORE_BOARDS: SAMPLE_WALL_PANEL_ITEMS,
      LOUVERS_PROFILES: SAMPLE_LOUVER_PROFILE_ITEMS,
      SCREWS_FASTENERS: SAMPLE_SCREW_FASTENER_ITEMS,
      NAILS_PINS: SAMPLE_NAIL_PIN_ITEMS,
      ADHESIVES: SAMPLE_ADHESIVE_CHEMICAL_ITEMS,
    }
    const presetItems = presetMap[subType].map((item) => ({
      ...item,
      quotationLineItemId,
      variantAttributes: { ...(item.variantAttributes || {}), wpSubType: subType },
    }))
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...presetItems] }))
  }

  const loadCabinetPresetForSection = (cardKey: string, sectionId: string, subType: CabinetSubType, quotationLineItemId?: string) => {
    const presetMap: Record<CabinetSubType, RequisitionItemInput[]> = {
      BOARD_SPEC: SAMPLE_CABINET_CORE_BOARD_ITEMS,
      CORE_BOARD_SPEC: SAMPLE_CABINET_CORE_BOARD_ITEMS,
      HPL_PASTING: SAMPLE_CABINET_HPL_PASTING_ITEMS,
    }
    const presetItems = presetMap[subType].map((item) => ({
      ...item,
      quotationLineItemId,
      variantAttributes: { ...(item.variantAttributes || {}), cabinetSubType: subType },
    }))
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...presetItems] }))
  }

  const loadAccessoryPresetForSection = (cardKey: string, sectionId: string, subType: AccessoriesSubType, quotationLineItemId?: string) => {
    const presetMap: Record<AccessoriesSubType, RequisitionItemInput[]> = {
      HARDWARE_ACCESSORIES: SAMPLE_ACCESSORY_HARDWARE_ITEMS,
      SERVICES_DELIVERABLES: SAMPLE_ACCESSORY_SERVICES_ITEMS,
    }
    const presetItems = presetMap[subType].map((item) => {
      const attrs = item.variantAttributes || {}
      const parsed = parseDimensions(attrs.dimensions as string | undefined)
      return {
        ...item,
        quotationLineItemId,
        variantAttributes: {
          ...attrs,
          dimW: attrs.dimW || parsed.dimW,
          dimD: attrs.dimD || parsed.dimD,
          dimH: attrs.dimH || parsed.dimH,
          accessoriesSubType: subType,
        },
      }
    })
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...presetItems] }))
  }

  const handleSelectSavedAccessory = useCallback((cardKey: string, sectionId: string, rowIndex: number, item: BoqSavedAccessoryItem) => {
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => {
      const rows = [...(prev[key] ?? [])]
      const current = { ...rows[rowIndex] }
      current.materialName = item.name
      if (item.defaultUnit) current.unit = item.defaultUnit
      const prevAttrs: BoardVariantAttributes = current.variantAttributes || {}
      const nextAttrs: BoardVariantAttributes = {
        ...prevAttrs,
        accessoryCategory: item.category,
        itemCode: item.itemCode,
      }
      current.variantAttributes = nextAttrs
      const specParts = [
        nextAttrs.accessoryCategory,
        nextAttrs.itemCode ? `Code: ${nextAttrs.itemCode}` : '',
        nextAttrs.dimensions,
      ].filter(Boolean)
      if (specParts.length > 0) current.specifications = specParts.join(' | ')
      rows[rowIndex] = current
      return { ...prev, [key]: rows }
    })
  }, [])

  const handleSaveNewAccessory = useCallback(async (name: string, category?: string, itemCode?: string) => {
    try {
      const res = await fetch('/api/boq/saved-accessories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, itemCode }),
      })
      const data = await res.json()
      if (data.success && data.item) {
        setBoqSavedAccessories((prev) => [...prev, data.item])
      }
    } catch (e) {
      console.error('Failed to save accessory item to library', e)
    }
  }, [])

  const loadAppliancePresetForSection = (cardKey: string, sectionId: string, subType: ApplianceSubType, quotationLineItemId?: string) => {
    const presetMap: Record<ApplianceSubType, RequisitionItemInput[]> = {
      CORE_APPLIANCES: SAMPLE_CORE_APPLIANCE_ITEMS,
    }
    const presetItems = presetMap[subType].map((item) => ({
      ...item,
      quotationLineItemId,
      variantAttributes: { ...(item.variantAttributes || {}), applianceSubType: subType },
    }))
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...presetItems] }))
  }

  const loadCeilingPresetForSection = (cardKey: string, sectionId: string, subType: CeilingSubType, quotationLineItemId?: string) => {
    const presetItems = (subType === 'ELECTRICAL_DEVICES' ? CEILING_ELECTRICAL_SCHEDULE : CEILING_LIGHTING_SCHEDULE)
      .map((item) => ({
        ...item,
        quotationLineItemId,
        variantAttributes: { ...(item.variantAttributes || {}), ceilingSubType: subType },
      }))
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...presetItems] }))
  }

  // ── Summary counts ──
  const requisitionItems = useMemo(() => flattenItems(itemsMap), [itemsMap])
  const totalMaterialRows = requisitionItems.length
  const coveredLineItems = useMemo(
    () => lineItems.filter((li) => (sectionsMap[li.id] ?? []).some((s) => (itemsMap[sectionItemKey(li.id, s.id)]?.length ?? 0) > 0)).length,
    [lineItems, sectionsMap, itemsMap]
  )
  const extraRowCount = useMemo(
    () => (sectionsMap[EXTRA_KEY] ?? []).reduce((sum, s) => sum + (itemsMap[sectionItemKey(EXTRA_KEY, s.id)]?.length ?? 0), 0),
    [sectionsMap, itemsMap]
  )
  const categorySummary = useMemo(() => {
    const summary: Partial<Record<RequisitionWorkCategory, number>> = {}
    for (const item of requisitionItems) {
      const category = item.workCategory as RequisitionWorkCategory
      summary[category] = (summary[category] ?? 0) + 1
    }
    return Object.entries(summary)
      .map(([category, count]) => `${getWorkCategoryLabel(category)}: ${count}`)
      .join('  |  ')
  }, [requisitionItems])
  const coveragePct = lineItems.length > 0 ? Math.round((coveredLineItems / lineItems.length) * 100) : 0

  // ── Save / Submit ──
  const saveRequisition = useCallback(async (status: SaveStatus = 'DRAFT', successMessage?: string) => {
    setSaveSuccess(null)
    setSaveError(null)
    try {
      const res = await saveMaterialRequisition({
        leadId: lead.id,
        quotationDraftId: detailQuotation?.id,
        status,
        notes,
        items: requisitionItems,
      })
      if (res.success) {
        setLastSavedAt(new Date())
        setLastSavedStatus(status)
        setSaveSuccess(
          successMessage ??
          (status === 'SUBMITTED'
            ? 'Material requisition submitted to Procurement team successfully!'
            : 'Material requisition draft saved successfully!')
        )
        router.refresh()
        return true
      }
      setSaveError(res.error || 'Failed to save material requisition.')
      return false
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save material requisition.')
      return false
    }
  }, [detailQuotation?.id, lead.id, notes, requisitionItems, router])

  const handleSave = useCallback((status: SaveStatus = 'DRAFT') => {
    if (status === 'SUBMITTED') {
      const pending = requisitionItems.filter((item) => item.variantAttributes?.sourceScheduleKey && item.variantAttributes?.sourceQuantityStatus === 'NEEDS_CONFIRMATION')
      if (pending.length) {
        setSaveError(`${pending.length} imported schedule ${pending.length === 1 ? 'quantity needs' : 'quantities need'} confirmation. Fill those quantities before submitting.`)
        setSaveSuccess(null)
        return
      }
      const groups = new Map<string, { label: string; expected: number; actual: number }>()
      for (const item of requisitionItems) {
        const attrs = item.variantAttributes
        if (!attrs?.sourceScheduleKey || !attrs.sourceQuantityGroup) continue
        const groupKey = `${item.quotationLineItemId || EXTRA_KEY}:${attrs.sourceScheduleKey}:${attrs.sourceQuantityGroup}`
        const group = groups.get(groupKey) ?? {
          label: attrs.sourceQuantityGroup === 'spot-light-allocation' ? 'Panel and spot light split' : 'Power supply split',
          expected: Number(attrs.sourceQuantityGroupTotal || 0),
          actual: 0,
        }
        group.actual += Number(item.netQuantity || 0)
        groups.set(groupKey, group)
      }
      const mismatch = [...groups.values()].find((group) => Math.abs(group.actual - group.expected) > 0.001)
      if (mismatch) {
        setSaveError(`${mismatch.label} must total ${mismatch.expected} pcs; current total is ${mismatch.actual} pcs.`)
        setSaveSuccess(null)
        return
      }
    }
    startTransition(() => {
      void saveRequisition(status)
    })
  }, [requisitionItems, saveRequisition, startTransition])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handleSave('DRAFT')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  const handleDownloadPdf = useCallback(async () => {
    if (totalMaterialRows === 0) {
      setSaveError('Add at least one material row before downloading the PDF.')
      return
    }

    setIsPdfGenerating(true)
    try {
      const saved = await saveRequisition('DRAFT', 'Draft saved. Requisition PDF is ready for download.')
      if (!saved) return

      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      const reqNo = existingRequisition?.requisitionNo || `DRAFT-${lead.id.slice(-6).toUpperCase()}`

      const logoImg = new Image()
      logoImg.src = '/Logo/HeaderLogo.png'
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })

      const pdfDoc = doc as unknown as PdfTableDoc
      const marginX = 10
      const topY = 34
      const bottomY = pageH - 18
      let cursorY = topY

      const drawChrome = () => {
        doc.setFillColor(255, 255, 255)
        doc.rect(0, 0, pageW, pageH, 'F')
        doc.addImage(logoImg, 'PNG', marginX, 10, 43.2, 8)
        doc.setDrawColor(31, 54, 61)
        doc.setLineWidth(0.7)
        doc.line(marginX, 23, pageW / 2 - 34, 23)
        doc.line(pageW / 2 + 34, 23, pageW - marginX, 23)
        doc.setTextColor(31, 54, 61)
        doc.setFont('times', 'italic')
        doc.setFontSize(12)
        doc.text('Material Requisition', pageW / 2, 24, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(100, 116, 139)
        doc.text(`Requisition: ${safePdfText(reqNo)} | Generated: ${today}`, pageW - marginX, 13, { align: 'right' })
        doc.setDrawColor(165, 124, 0)
        doc.setLineWidth(0.4)
        doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12)
        doc.setTextColor(71, 85, 105)
        doc.setFont('helvetica', 'bold')
        doc.text('Aesthetic Interior Studio', marginX, pageH - 7)
        doc.setFont('helvetica', 'normal')
        doc.text('183, East Senpara, Begum Rokeya Soroni, 3rd floor, Mirpur 10, Dhaka-1216', marginX + 42, pageH - 7)
        doc.text('www.aestheticinteriorbd.com', pageW - marginX, pageH - 7, { align: 'right' })
      }

      const drawPageFooter = () => {
        const pageNum = pdfDoc.internal.getCurrentPageInfo().pageNumber
        const pageCount = pdfDoc.internal.getNumberOfPages()
        doc.setFontSize(6.5)
        doc.setTextColor(148, 163, 184)
        doc.text(`Page ${pageNum} of ${pageCount}`, pageW / 2, pageH - 3.5, { align: 'center' })
      }

      const ensureSpace = (height: number) => {
        if (cursorY + height <= bottomY) return
        doc.addPage()
        drawChrome()
        cursorY = topY
      }

      const drawSummary = () => {
        drawChrome()
        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(226, 232, 240)
        doc.roundedRect(marginX, cursorY, pageW - marginX * 2, 26, 2, 2, 'FD')
        doc.setTextColor(15, 23, 42)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.text('Project / Client', marginX + 6, cursorY + 7)
        doc.text('Requisition Summary', pageW / 2 + 6, cursorY + 7)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.4)
        doc.setTextColor(71, 85, 105)
        doc.text(`Client: ${safePdfText(lead.name)}`, marginX + 6, cursorY + 13)
        doc.text(`Phone: ${safePdfText(lead.phone)}`, marginX + 6, cursorY + 18)
        doc.text(`Location: ${safePdfText(lead.location)}`, marginX + 6, cursorY + 23)
        doc.text(`Status: ${lastSavedStatus === 'SUBMITTED' ? 'Submitted' : 'Draft'}`, pageW / 2 + 6, cursorY + 13)
        doc.text(`Approved Quotation: ${safePdfText(formatBdtRounded(detailQuotation?.grandTotal ?? 0))}`, pageW / 2 + 6, cursorY + 18)
        doc.text(`Coverage: ${coveredLineItems}/${lineItems.length} products | Material Rows: ${totalMaterialRows}`, pageW / 2 + 6, cursorY + 23)
        cursorY += 33

        doc.setFillColor(239, 246, 255)
        doc.setDrawColor(191, 219, 254)
        doc.roundedRect(marginX, cursorY, pageW - marginX * 2, 14, 1.5, 1.5, 'FD')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(30, 64, 175)
        doc.text('PDF hierarchy: Quotation product -> Requisition section type -> Material rows', marginX + 5, cursorY + 5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105)
        doc.text(safePdfText(categorySummary || 'No category rows'), marginX + 5, cursorY + 10)
        cursorY += 20
      }

      const drawProductHeader = (title: string, meta: string, amount: number, index: number, isExtra = false) => {
        ensureSpace(18)
        doc.setFillColor(isExtra ? 255 : 243, isExtra ? 251 : 248, isExtra ? 235 : 247)
        doc.setDrawColor(isExtra ? 245 : 191, isExtra ? 158 : 219, isExtra ? 11 : 254)
        doc.roundedRect(marginX, cursorY, pageW - marginX * 2, 15, 2, 2, 'FD')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(isExtra ? 146 : 30, isExtra ? 64 : 64, isExtra ? 14 : 175)
        doc.text(isExtra ? 'EXTRA / GENERAL MATERIALS' : `PRODUCT ${index}`, marginX + 4, cursorY + 5)
        doc.setFontSize(9)
        doc.setTextColor(15, 23, 42)
        doc.text(doc.splitTextToSize(safePdfText(title), 145)[0] ?? safePdfText(title), marginX + 4, cursorY + 10.5)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(71, 85, 105)
        doc.text(safePdfText(meta), pageW - marginX - 4, cursorY + 5, { align: 'right' })
        if (!isExtra) {
          doc.setFont('helvetica', 'bold')
          doc.text(safePdfText(formatBdtRounded(amount)), pageW - marginX - 4, cursorY + 10.5, { align: 'right' })
        }
        cursorY += 19
      }

      const drawSection = (section: CardSection, rows: RequisitionItemInput[]) => {
        if (rows.length === 0) return
        const table = buildSectionPdfTable(section, rows)
        ensureSpace(24)
        doc.setFillColor(table.color[0], table.color[1], table.color[2])
        doc.roundedRect(marginX + 4, cursorY, pageW - marginX * 2 - 8, 9, 1.5, 1.5, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.4)
        doc.text(`Section type: ${cleanPdfLabel(getSectionTypeLabel(section))}`, marginX + 8, cursorY + 5.8)
        doc.setFont('helvetica', 'normal')
        doc.text(`${rows.length} material ${rows.length === 1 ? 'row' : 'rows'}`, pageW - marginX - 8, cursorY + 5.8, { align: 'right' })
        cursorY += 11

        const tableStartPage = pdfDoc.internal.getCurrentPageInfo().pageNumber

        autoTable(doc, {
          startY: cursorY,
          head: [table.head],
          body: table.body,
          theme: 'grid',
          headStyles: {
            fillColor: table.color,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 6.4,
            cellPadding: 1.7,
          },
          bodyStyles: {
            fontSize: 6.2,
            textColor: [15, 23, 42],
            cellPadding: 1.5,
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: table.columnStyles,
          margin: { left: marginX + 4, right: marginX + 4, top: topY, bottom: 18 },
          willDrawPage: () => {
            const currentPage = pdfDoc.internal.getCurrentPageInfo().pageNumber
            if (currentPage !== tableStartPage) {
              drawChrome()
            }
          },
          didDrawPage: () => {
            drawPageFooter()
          },
        })
        cursorY = (pdfDoc.lastAutoTable?.finalY ?? cursorY) + 5
      }

      drawSummary()

      lineItems.forEach((item, itemIndex) => {
        const cardSections = sectionsMap[item.id] ?? []
        const hasRows = cardSections.some((section) => (itemsMap[sectionItemKey(item.id, section.id)] ?? []).length > 0)
        if (!hasRows) return
        const sourceArea = item.areaId ? areaMap.get(item.areaId) : null
        drawProductHeader(
          item.description,
          `${sourceArea ? `${sourceArea.name} | ` : ''}${item.quantity} ${item.unit}`,
          item.amount,
          itemIndex + 1,
        )
        cardSections.forEach((section) => {
          drawSection(section, itemsMap[sectionItemKey(item.id, section.id)] ?? [])
        })
      })

      const extraSections = sectionsMap[EXTRA_KEY] ?? []
      const hasExtraRows = extraSections.some((section) => (itemsMap[sectionItemKey(EXTRA_KEY, section.id)] ?? []).length > 0)
      if (hasExtraRows) {
        drawProductHeader('Unlinked site supplies, hardware, and sundries', `${extraRowCount} general rows`, 0, 0, true)
        extraSections.forEach((section) => {
          drawSection(section, itemsMap[sectionItemKey(EXTRA_KEY, section.id)] ?? [])
        })
      }

      if (notes.trim()) {
        ensureSpace(22)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(15, 23, 42)
        doc.text('Factory Notes', marginX, cursorY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105)
        doc.text(doc.splitTextToSize(safePdfText(notes), pageW - marginX * 2), marginX, cursorY + 5)
      }

      drawPageFooter()
      doc.save(`material-requisition-${safeFilePart(lead.name)}-${safeFilePart(reqNo)}.pdf`)
    } catch (error) {
      console.error(error)
      setSaveError('Failed to generate requisition PDF. Please try again.')
    } finally {
      setIsPdfGenerating(false)
    }
  }, [
    areaMap,
    categorySummary,
    coveredLineItems,
    detailQuotation?.grandTotal,
    existingRequisition?.requisitionNo,
    extraRowCount,
    lastSavedStatus,
    lead.id,
    lead.location,
    lead.name,
    lead.phone,
    lineItems,
    itemsMap,
    notes,
    saveRequisition,
    sectionsMap,
    totalMaterialRows,
  ])

  const currentSlideRowsCount = useMemo(() => {
    return currentSlideSections.reduce((sum, s) => sum + getRowsForSection(currentCardKey, s.id).length, 0)
  }, [currentSlideSections, currentCardKey, itemsMap])

  /* ── RENDER ── */
  return (
    <div className="p-4 md:p-6 space-y-6 w-full pb-40">
      {/* ── Global Autocomplete Lists ── */}
      <BoardDatalists />

      {/* ── Top Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="space-y-1">
          <Link
            href="/crm/boq/assigned-task"
            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Assigned Tasks
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-primary" />
            Material Requisition Builder
          </h1>
          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
            <span>Project: <strong className="text-foreground">{lead.name}</strong></span>
            <span>•</span>
            <span>Phone: {lead.phone || 'N/A'}</span>
            <span>•</span>
            <span>Location: {lead.location || 'N/A'}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSave('DRAFT')}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-xs hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2 text-amber-500" />
            Save Draft
            <span className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">Ctrl+S</span>
          </button>
          <button
            onClick={() => setIsPdfModalOpen(true)}
            disabled={isPending || totalMaterialRows === 0}
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-xs hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Receipt className="w-4 h-4 mr-2 text-blue-600" />
            Requisition PDF
          </button>
          <button
            onClick={() => handleSave('SUBMITTED')}
            disabled={isPending || totalMaterialRows === 0}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit Requisition
          </button>
        </div>
      </div>

      {/* ── Success Banner ── */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {saveSuccess}
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {saveError}
        </div>
      )}

      {/* ── Executive KPI Summary Strip ── */}
      {detailQuotation ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* KPI 1: Approved Quotation Total */}
          <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 dark:text-emerald-200">Approved Quotation</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                {detailQuotation.status}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100">
                {formatBdtRounded(detailQuotation.grandTotal)}
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5 font-medium">
                Rounded from saved quotation total for display
              </p>
            </div>
          </div>

          {/* KPI 2: Requisition Coverage Progress */}
          <div className="rounded-xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-200">Line Item Coverage</span>
              </div>
              <span className="text-xs font-bold text-blue-800 dark:text-blue-200 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                {coveragePct}%
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-blue-950 dark:text-blue-100">
                  {coveredLineItems} <span className="text-sm font-normal text-muted-foreground">/ {lineItems.length} items</span>
                </span>
                <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80 font-medium">
                  {lineItems.length - coveredLineItems} remaining
                </span>
              </div>
              {/* Vibrant multi-stop progress bar */}
              <div className="w-full bg-blue-100 dark:bg-blue-950/50 rounded-full h-2 overflow-hidden border border-blue-200/50 dark:border-blue-800/40">
                <div
                  className="h-full transition-all duration-500 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full"
                  style={{ width: `${coveragePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* KPI 3: Active Material Rows */}
          <div className="rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-950 dark:text-purple-200">Material Specs</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-500/30">
                Live Requisition
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-purple-950 dark:text-purple-100">
                {totalMaterialRows} <span className="text-sm font-normal text-muted-foreground">total rows</span>
              </div>
              <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 mt-0.5 font-medium">
                {totalMaterialRows - extraRowCount} linked to BOQ · {extraRowCount} general site materials
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-amber-500/10 border-amber-500/30 p-4 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          No approved detail quotation found for this lead. You can still add materials in the Extra / General section below.
        </div>
      )}


      {/* ── Add Section Modal ── */}
      <AddSectionModal
        isOpen={isAddSectionModalOpen}
        onClose={() => setIsAddSectionModalOpen(false)}
        productTitle={currentSlide?.title ?? 'Quotation Product'}
        lineItem={currentSlide?.type === 'LINE_ITEM' ? currentSlide.item : undefined}
        onAdd={(cat, wpSub, cabSub, accSub, appSub, ceilSub, includeSchedule) => {
          addSection(
            currentCardKey,
            cat,
            wpSub,
            cabSub,
            accSub,
            appSub,
            ceilSub,
            currentSlide?.type === 'LINE_ITEM' ? currentSlide.item?.id : undefined,
            includeSchedule
          )
        }}
      />

      {/* ── Requisition PDF Export Modal ── */}
      <RequisitionPdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        lead={lead}
        requisitionNo={existingRequisition?.requisitionNo || `REQ-${lead.id.slice(-6).toUpperCase()}`}
        lineItems={lineItems}
        areas={areas}
        sectionsMap={sectionsMap}
        itemsMap={itemsMap}
        notes={notes}
      />

      {/* ── Left Product Drawer ── */}
      <QuotationProductsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        productSlides={productSlides}
        currentSlideId={currentSlide?.id ?? ''}
        onSelectSlide={(slideId) => {
          const targetIdx = productSlides.findIndex((s) => s.id === slideId)
          if (targetIdx !== -1) {
            goToSlide(targetIdx)
            setViewModePreference('SLIDE')
          }
        }}
        sections={sections}
        sectionsMap={sectionsMap}
        itemsMap={itemsMap}
        lineItemsCount={lineItems.length}
        coveredLineItems={coveredLineItems}
        coveragePct={coveragePct}
        getSectionsForCard={getSectionsForCard}
        getRowsForSection={getRowsForSection}
      />

      {/* ── Floating Side Navigation Chevrons (Desktop) ── */}
      {viewModePreference === 'SLIDE' && (
        <>
          {safeSlideIndex > 0 && (
            <button
              onClick={() => goToSlide((prev) => Math.max(0, prev - 1))}
              className="fixed left-3 top-1/2 -translate-y-1/2 z-20 hidden 2xl:flex h-12 w-12 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-xl backdrop-blur-sm transition-all hover:scale-110 hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-95"
              title={`Previous: ${productSlides[safeSlideIndex - 1]?.title} (Alt + Left)`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {safeSlideIndex < productSlides.length - 1 && (
            <button
              onClick={() => goToSlide((prev) => Math.min(productSlides.length - 1, prev + 1))}
              className="fixed right-3 top-1/2 -translate-y-1/2 z-20 hidden 2xl:flex h-12 w-12 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-xl backdrop-blur-sm transition-all hover:scale-110 hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-95"
              title={`Next: ${productSlides[safeSlideIndex + 1]?.title} (Alt + Right)`}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </>
      )}

      {/* ── Product Navigation Bar (Slide Stepper & Drawer Trigger) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-xs">
        {/* Left: Product list drawer trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary shadow-2xs hover:bg-primary/20 transition-colors"
            title="Open Product Navigator"
          >
            <Layers className="w-4 h-4" />
            <span>Product List ({safeSlideIndex + 1}/{productSlides.length})</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>

        {/* Center: Slide Stepper Navigation */}
        <div className="flex items-center rounded-xl border border-border/80 bg-muted/40 p-1 shadow-2xs">
          <button
            onClick={() => goToSlide((prev) => Math.max(0, prev - 1))}
            disabled={safeSlideIndex === 0}
            className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-foreground rounded-lg hover:bg-background disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous Product (Alt + Left)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <span className="px-3 text-xs font-black text-foreground border-x border-border/60">
            Slide {safeSlideIndex + 1} of {productSlides.length}
          </span>

          <button
            onClick={() => goToSlide((prev) => Math.min(productSlides.length - 1, prev + 1))}
            disabled={safeSlideIndex === productSlides.length - 1}
            className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-foreground rounded-lg hover:bg-background disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next Product (Alt + Right)"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: View mode toggle */}
        <div className="flex items-center rounded-lg border border-border/70 bg-card p-0.5 text-xs">
          <button
            onClick={() => setViewModePreference('SLIDE')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              viewModePreference === 'SLIDE'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Slide View
          </button>
          <button
            onClick={() => setViewModePreference('ALL')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              viewModePreference === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Products
          </button>
        </div>
      </div>

      {/* ── Main Canvas ── */}
      {/* Slide animation keyframes injected once */}
      <style>{`
        @keyframes slideInRight { from { opacity: 0; transform: translateX(48px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInLeft  { from { opacity: 0; transform: translateX(-48px); } to { opacity: 1; transform: translateX(0); } }
        .slide-in-right { animation: slideInRight 0.32s cubic-bezier(0.22,1,0.36,1) both; }
        .slide-in-left  { animation: slideInLeft  0.32s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>
      {viewModePreference === 'SLIDE' ? (
        <div className="space-y-6">
          {/* Animated slide wrapper — key forces remount on slide change */}
          <div
            key={safeSlideIndex}
            className={slideDirection === 'right' ? 'slide-in-right' : 'slide-in-left'}
          >
          {currentSlide.type === 'LINE_ITEM' && currentSlide.item ? (
            <div className="space-y-6">
              {/* Level 1 Hero Banner */}
              <div className="rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-primary/[0.04] via-card to-primary/[0.02] p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                        Quotation Product
                      </span>
                      <span className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Slide {safeSlideIndex + 1} of {productSlides.length}
                      </span>
                      {currentSlide.areaName && (
                        <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                          {currentSlide.areaName}
                        </span>
                      )}
                      {currentSlide.sectionName && (
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {currentSlide.sectionName}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                      {currentSlide.title}
                    </h2>

                    {currentSlide.materials && (
                      <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 text-xs text-muted-foreground leading-relaxed">
                        <span className="font-bold text-foreground/80 uppercase text-[10px] tracking-wider block mb-0.5">
                          Quotation Material Spec:
                        </span>
                        {currentSlide.materials}
                      </div>
                    )}
                  </div>

                  {/* Right stats */}
                  <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
                    {currentSlide.amount > 0 && (
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-muted-foreground block">Quotation Budget</span>
                        <span className="text-lg md:text-xl font-black text-emerald-700 dark:text-emerald-300">
                          {formatBdtRounded(currentSlide.amount)}
                        </span>
                        {currentSlide.quantity && (
                          <span className="text-xs text-muted-foreground block font-medium">
                            Qty: {currentSlide.quantity} {currentSlide.unit}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-center shadow-2xs">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sections</span>
                        <span className="block text-sm font-black text-foreground">{currentSlideSections.length}</span>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-center shadow-2xs">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Material Rows</span>
                        <span className="block text-sm font-black text-foreground">{currentSlideRowsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Level 2 Requisition Sections for this active product */}
              <div className="space-y-5">
                {currentSlideSections.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-border/80 bg-card/50 p-8 text-center space-y-3">
                    <Package className="w-8 h-8 mx-auto text-muted-foreground/40" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">No material sections configured for this quotation item.</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add a section (Core Structural Boards, Fasteners, Hardware, etc.) to start specifying required materials.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddSectionModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add First Section
                    </button>
                  </div>
                ) : (
                  currentSlideSections.map((section) => (
                    <SectionBlock
                      key={section.id}
                      section={section}
                      rows={getRowsForSection(currentCardKey, section.id)}
                      onChange={(ri, field, val) => updateRow(currentCardKey, section.id, ri, field, val)}
                      onUpdateVariant={(ri, field, val) => updateVariant(currentCardKey, section.id, ri, field, val)}
                      onAddRow={() => addRow(currentCardKey, section.id, currentSlide.item?.id)}
                      onRemoveRow={(ri) => removeRow(currentCardKey, section.id, ri)}
                      onLoadPreset={(subType) => loadPresetForSection(currentCardKey, section.id, subType, currentSlide.item?.id)}
                      onLoadCabinetPreset={(subType) => loadCabinetPresetForSection(currentCardKey, section.id, subType, currentSlide.item?.id)}
                      onLoadAccessoryPreset={(subType) => loadAccessoryPresetForSection(currentCardKey, section.id, subType, currentSlide.item?.id)}
                      onLoadAppliancePreset={(subType) => loadAppliancePresetForSection(currentCardKey, section.id, subType, currentSlide.item?.id)}
                      onLoadCeilingPreset={(subType) => loadCeilingPresetForSection(currentCardKey, section.id, subType, currentSlide.item?.id)}
                      onToggleCollapse={() => toggleSectionCollapse(currentCardKey, section.id)}
                      onRemove={() => removeSection(currentCardKey, section.id)}
                      boqSavedAccessories={boqSavedAccessories}
                      onSelectSavedAccessory={(ri, item) => handleSelectSavedAccessory(currentCardKey, section.id, ri, item)}
                      onSaveNewSavedAccessory={handleSaveNewAccessory}
                    />
                  ))
                )}

                {/* Inline Add Section trigger */}
                <div className="rounded-xl border border-dashed border-border/80 bg-card/60 p-4 text-center">
                  <button
                    onClick={() => setIsAddSectionModalOpen(true)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Another Section to {currentSlide.title}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Extra & General Materials Slide */
            <div className="space-y-6">
              <div className="rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-amber-500/5 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        Extra & General Materials
                      </span>
                      <span className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Slide {safeSlideIndex + 1} of {productSlides.length}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-amber-500" />
                      Extra & General Materials
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Site supplies, general hardware, adhesives, and sundries not linked to a specific quotation product.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-center shadow-2xs">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sections</span>
                      <span className="block text-sm font-black text-foreground">{currentSlideSections.length}</span>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-center shadow-2xs">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Material Rows</span>
                      <span className="block text-sm font-black text-foreground">{currentSlideRowsCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {currentSlideSections.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-amber-500/30 bg-card/50 p-8 text-center space-y-3">
                    <Package className="w-8 h-8 mx-auto text-amber-500/40" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">No general sections added yet.</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add a Wall Paneling, Closet/Cabinet, Accessories, or Appliance section to specify site supplies.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddSectionModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add General Section
                    </button>
                  </div>
                ) : (
                  currentSlideSections.map((section) => (
                    <SectionBlock
                      key={section.id}
                      section={section}
                      rows={getRowsForSection(EXTRA_KEY, section.id)}
                      onChange={(ri, field, val) => updateRow(EXTRA_KEY, section.id, ri, field, val)}
                      onUpdateVariant={(ri, field, val) => updateVariant(EXTRA_KEY, section.id, ri, field, val)}
                      onAddRow={() => addRow(EXTRA_KEY, section.id, undefined)}
                      onRemoveRow={(ri) => removeRow(EXTRA_KEY, section.id, ri)}
                      onLoadPreset={(subType) => loadPresetForSection(EXTRA_KEY, section.id, subType, undefined)}
                      onLoadCabinetPreset={(subType) => loadCabinetPresetForSection(EXTRA_KEY, section.id, subType, undefined)}
                      onLoadAccessoryPreset={(subType) => loadAccessoryPresetForSection(EXTRA_KEY, section.id, subType, undefined)}
                      onLoadAppliancePreset={(subType) => loadAppliancePresetForSection(EXTRA_KEY, section.id, subType, undefined)}
                      onLoadCeilingPreset={(subType) => loadCeilingPresetForSection(EXTRA_KEY, section.id, subType, undefined)}
                      onToggleCollapse={() => toggleSectionCollapse(EXTRA_KEY, section.id)}
                      onRemove={() => removeSection(EXTRA_KEY, section.id)}
                      boqSavedAccessories={boqSavedAccessories}
                      onSelectSavedAccessory={(ri, item) => handleSelectSavedAccessory(EXTRA_KEY, section.id, ri, item)}
                      onSaveNewSavedAccessory={handleSaveNewAccessory}
                    />
                  ))
                )}

                <div className="rounded-xl border border-dashed border-border/80 bg-card/60 p-4 text-center">
                  <button
                    onClick={() => setIsAddSectionModalOpen(true)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Another Section to Extra & General
                  </button>
                </div>
              </div>
            </div>
          )}{/* end slide content conditional */}
          </div>{/* end animated slide wrapper */}
        </div>
      ) : (
        /* All Products Vertical View */
        <div className="space-y-8">
          {quotation && lineItems.length > 0 ? (
            <div className="space-y-8">
              {sections.map((section) => {
                const sectionItems = lineItems.filter((li) => li.sectionId === section.id)
                if (sectionItems.length === 0) return null

                return (
                  <div key={section.id} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border/70 bg-muted/10 px-2 pb-3 pt-3">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quotation group</p>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{section.name}</h2>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground ml-auto bg-muted px-2.5 py-0.5 rounded-full border border-border/40">
                        {sectionItems.length} {sectionItems.length !== 1 ? 'line items' : 'line item'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {sectionItems.map((li) => {
                        const area = li.areaId ? areaMap.get(li.areaId) : undefined
                        return (
                          <QuotationLineItemCard
                            key={li.id}
                            item={li}
                            area={area}
                            sections={getSectionsForCard(li.id)}
                            getRowsForSection={(sectionId) => getRowsForSection(li.id, sectionId)}
                            onChangeRow={(sectionId, ri, field, val) => updateRow(li.id, sectionId, ri, field, val)}
                            onUpdateVariant={(sectionId, ri, field, val) => updateVariant(li.id, sectionId, ri, field, val)}
                            onAddRow={(sectionId) => addRow(li.id, sectionId, li.id)}
                            onRemoveRow={(sectionId, ri) => removeRow(li.id, sectionId, ri)}
                            onLoadPreset={(sectionId, subType) => loadPresetForSection(li.id, sectionId, subType, li.id)}
                            onLoadCabinetPreset={(sectionId, subType) => loadCabinetPresetForSection(li.id, sectionId, subType, li.id)}
                            onLoadAccessoryPreset={(sectionId, subType) => loadAccessoryPresetForSection(li.id, sectionId, subType, li.id)}
                            onLoadAppliancePreset={(sectionId, subType) => loadAppliancePresetForSection(li.id, sectionId, subType, li.id)}
                            onAddSection={(cat, wpSub, cabSub, accSub, appSub, ceilSub, includeSchedule) => addSection(li.id, cat, wpSub, cabSub, accSub, appSub, ceilSub, li.id, includeSchedule)}
                            onRemoveSection={(sectionId) => removeSection(li.id, sectionId)}
                            onToggleSectionCollapse={(sectionId) => toggleSectionCollapse(li.id, sectionId)}
                            boqSavedAccessories={boqSavedAccessories}
                            onSelectSavedAccessory={(sectionId, ri, item) => handleSelectSavedAccessory(li.id, sectionId, ri, item)}
                            onSaveNewSavedAccessory={handleSaveNewAccessory}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          {/* Extra Card in All View */}
          <ExtraCard
            sections={getSectionsForCard(EXTRA_KEY)}
            getRowsForSection={(sectionId) => getRowsForSection(EXTRA_KEY, sectionId)}
            onChangeRow={(sectionId, ri, field, val) => updateRow(EXTRA_KEY, sectionId, ri, field, val)}
            onUpdateVariant={(sectionId, ri, field, val) => updateVariant(EXTRA_KEY, sectionId, ri, field, val)}
            onAddRow={(sectionId) => addRow(EXTRA_KEY, sectionId, undefined)}
            onRemoveRow={(sectionId, ri) => removeRow(EXTRA_KEY, sectionId, ri)}
            onLoadPreset={(sectionId, subType) => loadPresetForSection(EXTRA_KEY, sectionId, subType, undefined)}
            onLoadCabinetPreset={(sectionId, subType) => loadCabinetPresetForSection(EXTRA_KEY, sectionId, subType, undefined)}
            onLoadAccessoryPreset={(sectionId, subType) => loadAccessoryPresetForSection(EXTRA_KEY, sectionId, subType, undefined)}
            onLoadAppliancePreset={(sectionId, subType) => loadAppliancePresetForSection(EXTRA_KEY, sectionId, subType, undefined)}
            onAddSection={(cat, wpSub, cabSub, accSub, appSub, ceilSub, includeSchedule) => addSection(EXTRA_KEY, cat, wpSub, cabSub, accSub, appSub, ceilSub, undefined, includeSchedule)}
            onRemoveSection={(sectionId) => removeSection(EXTRA_KEY, sectionId)}
            onToggleSectionCollapse={(sectionId) => toggleSectionCollapse(EXTRA_KEY, sectionId)}
            boqSavedAccessories={boqSavedAccessories}
            onSelectSavedAccessory={(sectionId, ri, item) => handleSelectSavedAccessory(EXTRA_KEY, sectionId, ri, item)}
            onSaveNewSavedAccessory={handleSaveNewAccessory}
          />
        </div>
      )}

      {/* ── Requisition Notes ── */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-2">
        <label className="text-xs font-bold text-foreground uppercase tracking-wider">
          Requisition Remarks / Special Factory Notes
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Waterproof BWP grade required for kitchen sink area. Material delivery target Oct 20."
          className="w-full bg-background border border-input rounded-md p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary shadow-xs"
        />
      </div>

      {/* ── Always-visible Bottom Workspace Bar (Contextual Smart Bar) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-background/95 px-4 py-2.5 shadow-2xl backdrop-blur-md md:px-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3">
          {/* Left: Product slide info & Navigator trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors shadow-2xs"
              title="Open Product List Drawer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="font-extrabold">{safeSlideIndex + 1}/{productSlides.length}</span>
              <span className="hidden sm:inline truncate max-w-[150px] font-semibold">{currentSlide?.title}</span>
            </button>

            {viewModePreference === 'SLIDE' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToSlide((prev) => Math.max(0, prev - 1))}
                  disabled={safeSlideIndex === 0}
                  className="p-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  title="Previous Product"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => goToSlide((prev) => Math.min(productSlides.length - 1, prev + 1))}
                  disabled={safeSlideIndex === productSlides.length - 1}
                  className="p-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  title="Next Product"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Center: Contextual Action Buttons ("Which section it will hit") */}
          <div className="flex flex-wrap items-center gap-2">
            {activeSectionObj ? (
              <>
                {/* Target section badge */}
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/60 text-xs">
                  <Target className="w-3.5 h-3.5 text-primary animate-pulse" />
                  <span className="text-muted-foreground font-medium">Target:</span>
                  <span className="font-bold text-foreground truncate max-w-[200px]">
                    {activeSectionName}
                  </span>
                </div>

                {/* Add Material to active section button */}
                <button
                  onClick={() => {
                    if (activeSectionObj) {
                      addRow(
                        currentCardKey,
                        activeSectionObj.id,
                        currentSlide?.type === 'LINE_ITEM' ? currentSlide.item?.id : undefined
                      )
                      if (activeSectionObj.collapsed) {
                        toggleSectionCollapse(currentCardKey, activeSectionObj.id)
                      }
                      setTimeout(() => {
                        document.getElementById(`section-dom-${activeSectionObj.id}`)?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'nearest',
                        })
                      }, 50)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-colors"
                  title={`Add a material row to ${activeSectionName}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Material</span>
                  <span className="hidden sm:inline font-semibold opacity-90">({activeSectionName})</span>
                </button>

                {/* Add Section button */}
                <button
                  onClick={() => setIsAddSectionModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted px-3 py-1.5 text-xs font-bold text-foreground shadow-2xs transition-colors"
                  title="Add a new section to this product"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>Add Section</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAddSectionModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 text-xs font-bold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Section to this Product</span>
              </button>
            )}
          </div>

          {/* Right: Save / Submit / PDF */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => handleSave('DRAFT')}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Save className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Save</span> Draft
              <span className="ml-1.5 hidden xl:inline rounded border border-border bg-muted px-1 py-0.5 text-[9px] font-bold text-muted-foreground">
                Ctrl+S
              </span>
            </button>
            <button
              onClick={() => setIsPdfModalOpen(true)}
              disabled={isPending || totalMaterialRows === 0}
              className="inline-flex items-center justify-center rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
              PDF
            </button>
            <button
              onClick={() => handleSave('SUBMITTED')}
              disabled={isPending || totalMaterialRows === 0}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Submit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

