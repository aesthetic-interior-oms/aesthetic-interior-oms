'use client'

import { useMemo, useState } from 'react'
import {
  Boxes,
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Info,
  Layers,
  Loader2,
  Merge,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import {
  RequisitionDocumentPdf,
  type RequisitionAggregatedMaterial,
  type RequisitionPdfData,
  type RequisitionProductGroup,
} from '@/components/crm/quotation/pdf/RequisitionDocument'
import type { RequisitionItemInput } from '@/lib/boq-service'
import type { QuotationArea, QuotationLineItem } from '@/lib/quotation-types'

// ── Types ──

export type CardSection = {
  id: string
  category: string
  wallPanelingSubType?: string
  cabinetSubType?: string
  accessoriesSubType?: string
  applianceSubType?: string
  ceilingSubType?: string
  collapsed?: boolean
}

type PdfCategoryFilter = 'ALL' | 'WALL_PANELING' | 'CABINETS_CLOSETS' | 'ACCESSORIES' | 'APPLIANCES' | 'CEILING_ELECTRICAL' | 'EXTRA'

const CATEGORY_TABS: {
  key: PdfCategoryFilter
  label: string
  icon: string
  description: string
  badge: string
}[] = [
  {
    key: 'ALL',
    label: 'All Sections (Master PDF)',
    icon: '🌟',
    description: 'Complete master requisition across all rooms and work categories.',
    badge: 'Master Requisition',
  },
  {
    key: 'WALL_PANELING',
    label: 'Wall Paneling',
    icon: '🪵',
    description: 'Core boards, Louvers & decorative panels, Screws, Fasteners, Nails, Adhesives.',
    badge: 'Wall Paneling Scope',
  },
  {
    key: 'CABINETS_CLOSETS',
    label: 'Cabinets & Closets',
    icon: '🚪',
    description: 'Carcass core boards, Shutter finishes, Edge banding, Hinges & Hardware accessories.',
    badge: 'Cabinet Scope',
  },
  {
    key: 'ACCESSORIES',
    label: 'Accessories & Hardware',
    icon: '🔩',
    description: 'Kitchen baskets, pantry units, wardrobe organizers, jewelry trays & hardware fittings.',
    badge: 'Accessories Scope',
  },
  {
    key: 'APPLIANCES',
    label: 'Kitchen & Home Appliances',
    icon: '🍳',
    description: 'Gas/induction hobs, chimneys, built-in ovens, microwaves, sinks & water purifiers.',
    badge: 'Appliances Scope',
  },
  {
    key: 'CEILING_ELECTRICAL',
    label: 'Ceiling & Electrical',
    icon: '💡',
    description: 'T-5 Linear lights, Spotlights, Drivers, Switches, Sockets & Cable accessories.',
    badge: 'Ceiling & Electrical Scope',
  },
  {
    key: 'EXTRA',
    label: 'Extra & General Supplies',
    icon: '🛋️',
    description: 'General site hardware, civil, painting supplies and extra project materials.',
    badge: 'Site-wide Scope',
  },
]

function getSectionLabel(section: CardSection): string {
  if (section.wallPanelingSubType) {
    switch (section.wallPanelingSubType) {
      case 'CORE_BOARDS': return 'Wall Paneling — Core Boards'
      case 'LOUVERS_PROFILES': return 'Wall Paneling — Louvers & Decorative Profiles'
      case 'SCREWS_FASTENERS': return 'Wall Paneling — Screws & Fasteners'
      case 'NAILS_PINS': return 'Wall Paneling — Nails & Pins'
      case 'ADHESIVES': return 'Wall Paneling — Adhesives & Glues'
      default: return 'Wall Paneling'
    }
  }
  if (section.cabinetSubType) {
    switch (section.cabinetSubType) {
      case 'CORE_BOARDS': return 'Cabinets — Carcass Core Boards'
      case 'HPL_PASTING': return 'Cabinets — Shutter Finishes'
      case 'HARDWARE_ACCESSORIES': return 'Cabinets — Hardware & Hinges'
      case 'SERVICES_DELIVERABLES': return 'Cabinets — Deliverables'
      default: return 'Cabinets & Closets'
    }
  }
  if (section.ceilingSubType) {
    switch (section.ceilingSubType) {
      case 'CEILING_LIGHTING': return 'Ceiling Lighting & Linear Profiles'
      case 'ELECTRICAL_DEVICES': return 'Electrical Devices, Drivers & Switches'
      default: return 'Ceiling & Electrical'
    }
  }
  if (section.accessoriesSubType) {
    switch (section.accessoriesSubType) {
      case 'HARDWARE_FITTINGS': return 'Accessories — Hardware & Fittings'
      case 'SERVICES_DELIVERABLES': return 'Accessories — Deliverables'
      default: return 'Accessories'
    }
  }
  if (section.applianceSubType) {
    switch (section.applianceSubType) {
      case 'CORE_APPLIANCES': return 'Kitchen & Home Appliances'
      default: return 'Appliances'
    }
  }
  return section.category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function matchesCategoryFilter(section: CardSection, cardKey: string, filter: PdfCategoryFilter): boolean {
  if (filter === 'ALL') return true
  if (filter === 'WALL_PANELING') return section.category === 'WALL_PANELING'
  if (filter === 'CABINETS_CLOSETS') return section.category === 'CABINETS_CLOSETS'
  if (filter === 'ACCESSORIES') return section.category === 'ACCESSORIES'
  if (filter === 'APPLIANCES') return section.category === 'APPLIANCES'
  if (filter === 'CEILING_ELECTRICAL') {
    return (
      section.category === 'CEILING' ||
      section.category === 'ELECTRICAL_WORK' ||
      section.ceilingSubType === 'CEILING_LIGHTING' ||
      section.ceilingSubType === 'ELECTRICAL_DEVICES'
    )
  }
  if (filter === 'EXTRA') {
    return cardKey === '__extra__'
  }
  return true
}

function cleanString(str?: string | null): string {
  return (str || '').trim().replace(/\s+/g, ' ')
}

const PRODUCT_TYPE_SORT_ORDER: Record<string, number> = {
  '🪵 Boards': 1,
  '✨ Decorative Panels': 2,
  '🔩 Hardware ( Screw )': 3,
  '📌 Nails, Pins & Masonry Anchors': 4,
  '🧪 Adhesives & Chemical Solvents': 5,
}

export function formatMaterialItem(
  item: RequisitionItemInput,
  section?: CardSection
): { productType: string; materialDescription: string; unit: string } {
  const attrs = (item.variantAttributes || {}) as Record<string, unknown>
  const wpSub = (section?.wallPanelingSubType || attrs.wpSubType || '') as string
  const unit = cleanString(item.unit) || 'Pcs'

  // 1. BOARDS
  if (wpSub === 'CORE_BOARDS' || (item.workCategory === 'WALL_PANELING' && (attrs.baseMaterial || attrs.laminateTopSurface))) {
    const productType = '🪵 Boards'
    const thk = cleanString((attrs.coreThickness as string) || (attrs.thickness as string)) || '12mm'
    const base = cleanString((attrs.baseMaterial as string) || (attrs.coreSubstrateType as string) || item.materialName) || 'Garjon Plywood'
    const rawFl = cleanString((attrs.laminateTopSurface as string) || (attrs.frontLaminateCode as string))
    const rawBl = cleanString((attrs.surfaceCodeFinish as string) || (attrs.backLaminateCode as string))

    const fl = rawFl
      ? (rawFl.toUpperCase().includes('F/L') ? rawFl : `${rawFl} (F/L)`)
      : 'Raw Board (F/L)'
    const bl = rawBl
      ? (rawBl.toUpperCase().includes('B/L') ? rawBl : `${rawBl} (B/L)`)
      : 'Raw Board (B/L)'

    const materialDescription = `${thk} + ${base} + ${fl} + ${bl}`
    return { productType, materialDescription, unit }
  }

  // 2. DECORATIVE PANELS
  if (wpSub === 'LOUVERS_PROFILES') {
    const productType = '✨ Decorative Panels'
    const panel = cleanString((attrs.material as string) || item.materialName) || 'Decorative Panel'
    const code = cleanString(attrs.codeVariant as string)
    const thk = cleanString((attrs.thickness as string) || (attrs.coreThickness as string))
    const accent = cleanString(attrs.accentFinish as string)
    const isReady = attrs.decorativeType === 'READYMADE' || (code !== '' && thk === '' && accent === '')

    let materialDescription = ''
    if (code && (isReady || (thk === '' && accent === ''))) {
      // Readymade: Panel + Code
      materialDescription = `${panel} + ${code}`
    } else if (thk || accent) {
      // Customize: Thickness + Accent Profile + Panel
      materialDescription = [thk, accent, panel].filter(Boolean).join(' + ')
    } else if (code) {
      materialDescription = `${panel} + ${code}`
    } else {
      materialDescription = panel
    }

    return { productType, materialDescription, unit }
  }

  // 3. HARDWARE ( SCREW )
  if (wpSub === 'SCREWS_FASTENERS') {
    const productType = '🔩 Hardware ( Screw )'
    const length = cleanString((attrs.lengthInches as string) || item.specifications)
    const itemType = cleanString(item.materialName || (attrs.fastenerType as string)) || 'Screw'
    const materialDescription = [length, itemType].filter(Boolean).join(' + ')
    return { productType, materialDescription, unit }
  }

  // 4. NAILS, PINS & MASONRY ANCHORS
  if (wpSub === 'NAILS_PINS') {
    const productType = '📌 Nails, Pins & Masonry Anchors'
    const length = cleanString((attrs.lengthSpec as string) || item.specifications)
    const itemType = cleanString(item.materialName || (attrs.nailType as string)) || 'Nail'
    const materialDescription = [length, itemType].filter(Boolean).join(' + ')
    return { productType, materialDescription, unit }
  }

  // 5. ADHESIVES & CHEMICAL SOLVENTS
  if (wpSub === 'ADHESIVES') {
    const productType = '🧪 Adhesives & Chemical Solvents'
    const chemicalName = cleanString(item.materialName || (attrs.adhesiveType as string)) || 'Adhesive'
    return { productType, materialDescription: chemicalName, unit }
  }

  // GENERAL / FALLBACK
  const productType = section ? getSectionLabel(section) : cleanString(item.workCategory) || 'General Material'
  const materialDescription = [cleanString(item.materialName), cleanString(item.specifications)].filter(Boolean).join(' | ') || 'Standard Item'
  return { productType, materialDescription, unit }
}

export function RequisitionPdfExportModal({
  isOpen,
  onClose,
  lead,
  requisitionNo,
  lineItems,
  areas,
  sectionsMap,
  itemsMap,
  notes,
}: {
  isOpen: boolean
  onClose: () => void
  lead: { id: string; name: string; phone: string | null; location: string | null }
  requisitionNo: string
  lineItems: QuotationLineItem[]
  areas: QuotationArea[]
  sectionsMap: Record<string, CardSection[]>
  itemsMap: Record<string, RequisitionItemInput[]>
  notes?: string
}) {
  const [selectedCategory, setSelectedCategory] = useState<PdfCategoryFilter>('ALL')
  const [isDownloading, setIsDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<'categories' | 'preview'>('categories')
  const [manualMerges, setManualMerges] = useState<Record<string, string>>({})
  const [includeQuotationBreakdown, setIncludeQuotationBreakdown] = useState(false)

  const areaMap = useMemo(() => {
    const map = new Map<string, QuotationArea>()
    for (const a of areas) map.set(a.id, a)
    return map
  }, [areas])

  const lineItemMap = useMemo(() => {
    const map = new Map<string, QuotationLineItem>()
    for (const li of lineItems) map.set(li.id, li)
    return map
  }, [lineItems])

  // Build filtered product groups and aggregated material items
  const { productGroups, aggregatedMaterials } = useMemo(() => {
    const pGroups: RequisitionProductGroup[] = []
    const aggMap = new Map<string, RequisitionAggregatedMaterial>()

    // Helper to get card product info
    const getCardInfo = (cardKey: string) => {
      if (cardKey === '__extra__') {
        return {
          productTitle: 'Extra & General Materials',
          areaName: 'Site-wide Scope',
          productSpecs: 'General Site Hardware, Tools & Consumables',
          dimensionsOrSqft: 'Full Project',
        }
      }
      const li = lineItemMap.get(cardKey)
      const area = li?.areaId ? areaMap.get(li.areaId) : undefined
      const dimOrSqft = li?.quantity && li.unit ? `${li.quantity} ${li.unit.toUpperCase()}` : ''
      return {
        productTitle: li?.description || 'Custom Interior Product',
        areaName: area?.name || 'Interior Area',
        productSpecs: li?.materials || '',
        dimensionsOrSqft: dimOrSqft,
      }
    }

    // Process all cards
    const cardKeys = Array.from(new Set([...Object.keys(sectionsMap), ...lineItems.map((li) => li.id), '__extra__']))

    for (const cardKey of cardKeys) {
      const sections = (sectionsMap[cardKey] ?? []).filter((s) =>
        matchesCategoryFilter(s, cardKey, selectedCategory),
      )
      if (sections.length === 0) continue

      const cardInfo = getCardInfo(cardKey)
      const pSections: RequisitionProductGroup['sections'] = []

      for (const sec of sections) {
        const itemKey = `${cardKey}::${sec.id}`
        const rawItems = itemsMap[itemKey] ?? []
        // Filter out empty rows
        const validItems = rawItems.filter(
          (it) =>
            cleanString(it.materialName) !== '' ||
            cleanString(it.specifications) !== '' ||
            (Number(it.finalQuantity) || 0) > 0,
        )
        if (validItems.length === 0) continue

        pSections.push({
          sectionId: sec.id,
          category: sec.category,
          subTypeLabel: getSectionLabel(sec),
          items: validItems,
        })

        // Accumulate into project-wide material summary
        for (const it of validItems) {
          const { productType, materialDescription, unit } = formatMaterialItem(it, sec)
          const rawName = cleanString(it.materialName) || 'Standard Material'
          const rawSpec = cleanString(it.specifications)
          const subTypeLabel = getSectionLabel(sec)

          // Key grouping: merges common items with same product type, specification & unit across products
          const naturalKey = `${it.workCategory}::${productType.toLowerCase()}::${materialDescription.toLowerCase()}::${unit.toLowerCase()}`
          const canonicalKey = manualMerges[naturalKey] || naturalKey

          const net = Number(it.netQuantity) || 0
          const final = Number(it.finalQuantity) || 0
          const waste = Number(it.wastagePercent) || 0

          if (!aggMap.has(canonicalKey)) {
            aggMap.set(canonicalKey, {
              key: canonicalKey,
              name: rawName,
              specifications: rawSpec,
              category: it.workCategory,
              subTypeLabel,
              netQuantity: net,
              wastagePercent: waste,
              finalQuantity: final,
              unit,
              usedInProducts: [cardInfo.productTitle],
              productType,
              materialDescription,
            })
          } else {
            const existing = aggMap.get(canonicalKey)!
            existing.netQuantity += net
            existing.finalQuantity += final
            if (!existing.usedInProducts.includes(cardInfo.productTitle)) {
              existing.usedInProducts.push(cardInfo.productTitle)
            }
          }
        }
      }

      if (pSections.length > 0) {
        pGroups.push({
          quotationLineItemId: cardKey === '__extra__' ? null : cardKey,
          ...cardInfo,
          sections: pSections,
        })
      }
    }

    const sortedAggregated = Array.from(aggMap.values()).sort((a, b) => {
      const orderA = PRODUCT_TYPE_SORT_ORDER[a.productType || ''] ?? 99
      const orderB = PRODUCT_TYPE_SORT_ORDER[b.productType || ''] ?? 99
      if (orderA !== orderB) return orderA - orderB
      return (a.materialDescription || a.name || '').localeCompare(b.materialDescription || b.name || '')
    })

    return {
      productGroups: pGroups,
      aggregatedMaterials: sortedAggregated,
    }
  }, [
    lineItems,
    sectionsMap,
    itemsMap,
    selectedCategory,
    lineItemMap,
    areaMap,
    manualMerges,
  ])

  const totalFilteredRows = useMemo(() => {
    return productGroups.reduce(
      (sum, pg) => sum + pg.sections.reduce((sSum, sec) => sSum + sec.items.length, 0),
      0,
    )
  }, [productGroups])

  const handleDownload = async () => {
    if (aggregatedMaterials.length === 0 || totalFilteredRows === 0) {
      toast.error('No material items found in the selected category.')
      return
    }

    setIsDownloading(true)
    try {
      const activeCat = CATEGORY_TABS.find((t) => t.key === selectedCategory)
      const categoryTitle = activeCat ? activeCat.badge : 'Material Requisition'
      const todayFormatted = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date())
      const genTimeFormatted = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date())

      const isWallPaneling = selectedCategory === 'WALL_PANELING'
      const pdfData: RequisitionPdfData = {
        clientName: lead.name || 'Client',
        clientAddress: lead.location || 'Dhaka, Bangladesh',
        clientPhone: lead.phone,
        requisitionNo: requisitionNo || `REQ-${lead.id.slice(-6).toUpperCase()}`,
        categoryTitle,
        date: todayFormatted,
        generatedAt: genTimeFormatted,
        aggregatedMaterials,
        productGroups,
        notes,
        summaryOnly: !includeQuotationBreakdown,
        isWallPanelingFormat: isWallPaneling || selectedCategory === 'ALL',
      }

      const safeName = (lead.name || 'Client').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')
      const fileName = `Requisition_${safeName}_${selectedCategory}_${new Date().toISOString().slice(0, 10)}.pdf`

      await downloadPdfFromDocument(<RequisitionDocumentPdf data={pdfData} />, fileName)
      toast.success('Requisition PDF downloaded successfully!')
      onClose()
    } catch (err) {
      console.error('Error generating PDF:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl rounded-2xl border border-border/80 bg-card shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4 bg-[#1f363d] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Download Requisition PDF
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#a57c00] text-white font-medium">
                  Detail Quotation Design
                </span>
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                Client: <strong>{lead.name}</strong> • Ref: {requisitionNo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-2.5 bg-muted/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'categories'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              1. Choose Section / Scope
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              2. Full Project Summary Preview
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                {aggregatedMaterials.length} Types
              </span>
            </button>
          </div>

          <div className="text-xs text-muted-foreground hidden sm:block">
            <strong>{totalFilteredRows}</strong> material rows in scope
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'categories' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-900 dark:text-blue-200 space-y-0.5">
                  <p className="font-semibold">Which section requisition do you want to print?</p>
                  <p className="text-blue-700/80 dark:text-blue-300/80">
                    You can print a single trade requisition (e.g. Wall Paneling only for the board supplier, or
                    Ceiling &amp; Electrical for the lighting vendor), or download the complete master document.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CATEGORY_TABS.map((tab) => {
                  const isSelected = selectedCategory === tab.key
                  return (
                    <div
                      key={tab.key}
                      onClick={() => setSelectedCategory(tab.key)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all duration-150 relative ${
                        isSelected
                          ? 'border-[#1f363d] bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                          : 'border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{tab.icon}</span>
                          <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                              {tab.label}
                            </h3>
                            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                              {tab.badge}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/30'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">{tab.description}</p>
                    </div>
                  )
                })}
              </div>

              {/* Aggregation summary badge */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Full-Project Material Consolidation
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Page 1 will consolidate matching materials across all rooms so the factory knows the total buy quantity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Inspect Preview
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Tab 2: Material Preview & Consolidation */
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-semibold">Page 1 Consolidated Material Preview</p>
                    <p className="text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                      The software detected {aggregatedMaterials.length} unique materials across all quotation items in this
                      scope. If any material appears in multiple products, its total required quantity is combined here.
                    </p>
                  </div>
                </div>
              </div>

              {/* Table of aggregated materials */}
              <div className="rounded-xl border border-border/80 overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1f363d] text-white uppercase text-[10px] tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 w-1/4">Product Type</th>
                        <th className="py-2.5 px-3">Material Description</th>
                        <th className="py-2.5 px-3 text-center w-28">Unit / Qty</th>
                        <th className="py-2.5 px-3 w-48">Used In Products</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 bg-card">
                      {aggregatedMaterials.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            No materials found for the current selection.
                          </td>
                        </tr>
                      ) : (
                        aggregatedMaterials.map((mat, idx) => {
                          const isNewGroup = idx === 0 || (mat.productType || mat.subTypeLabel) !== (aggregatedMaterials[idx - 1].productType || aggregatedMaterials[idx - 1].subTypeLabel)
                          const displayQty = `${Math.round(mat.finalQuantity * 10) / 10} ${mat.unit || 'Pcs'}`

                          return (
                            <tr
                              key={mat.key || idx}
                              className={`hover:bg-muted/30 transition-colors ${
                                isNewGroup && idx > 0 ? 'border-t-2 border-border/90' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                                {String(idx + 1).padStart(2, '0')}
                              </td>
                              <td className="py-2.5 px-3">
                                {isNewGroup ? (
                                  <span className="font-bold text-foreground block text-xs">
                                    {mat.productType || mat.subTypeLabel || mat.category}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/50 text-xs pl-2 font-mono">↳</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-foreground block text-xs">
                                  {mat.materialDescription || mat.name}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-primary text-xs whitespace-nowrap">
                                {displayQty}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-muted-foreground">
                                <div className="flex flex-wrap gap-1">
                                  {mat.usedInProducts.map((p, pIdx) => (
                                    <span
                                      key={pIdx}
                                      className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-foreground truncate max-w-[140px]"
                                      title={p}
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/80 px-5 py-3.5 bg-muted/20">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeQuotationBreakdown}
                onChange={(e) => setIncludeQuotationBreakdown(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              Include quotation breakdown pages (detailed product cards)
            </label>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownload}
              disabled={isDownloading || aggregatedMaterials.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1f363d] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#16272c] shadow-sm transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Requisition PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
