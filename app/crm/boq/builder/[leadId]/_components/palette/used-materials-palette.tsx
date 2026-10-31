'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  X,
  Search,
  GripVertical,
  Plus,
  Sparkles,
  Layers,
  Package,
  Check,
  Building,
  Folder,
  Trash2,
  Copy,
  Info,
} from 'lucide-react'
import type { RequisitionItemInput } from '@/lib/boq-service'
import type {
  CardSection,
  ItemsMap,
  ProductSlide,
  SectionsMap,
  RequisitionWorkCategory,
} from '../types/boq-builder-types'
import { getSectionTypeLabel } from '../helpers/boq-pdf-builder'

export interface UsedMaterialEntry {
  id: string
  item: RequisitionItemInput
  category: RequisitionWorkCategory
  groupKey: string
  groupLabel: string
  sourceProductName: string
  sourceSectionName: string
  displayTitle: string
  tags: { label: string; value: string; color?: string }[]
}

interface UsedMaterialsPaletteProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  itemsMap: ItemsMap
  sectionsMap: SectionsMap
  productSlides: ProductSlide[]
  activeSection: CardSection | null
  currentCardKey: string
  onInsertItem: (item: RequisitionItemInput, targetSectionId?: string) => void
}

function hasMeaningfulData(item: RequisitionItemInput): boolean {
  if (!item) return false
  const attrs = item.variantAttributes || {}
  if (item.materialName && item.materialName.trim() && item.materialName !== 'Board') return true
  if (attrs.baseMaterial || attrs.coreSubstrateType) return true
  if (attrs.laminateTopSurface || attrs.frontLaminateCode || attrs.laminateFinishDetails) return true
  if (attrs.profileType || attrs.material) return true
  if (attrs.fastenerType) return true
  if (attrs.nailType) return true
  if (attrs.chemicalClass) return true
  if (attrs.itemCode) return true
  if (attrs.brandModelCode) return true
  return false
}

function getItemSignature(item: RequisitionItemInput): string {
  const attrs = item.variantAttributes || {}
  return [
    item.workCategory,
    item.materialName || '',
    attrs.baseMaterial || attrs.coreSubstrateType || '',
    attrs.coreThickness || '',
    attrs.laminateTopSurface || attrs.frontLaminateCode || '',
    attrs.surfaceCodeFinish || attrs.backLaminateCode || '',
    attrs.profileType || '',
    attrs.fastenerType || '',
    attrs.nailType || '',
    attrs.chemicalClass || '',
    attrs.itemCode || '',
    attrs.brandModelCode || '',
    attrs.usage || '',
  ].join(':::').toLowerCase()
}

function determineGroup(item: RequisitionItemInput): { key: string; label: string } {
  const attrs = item.variantAttributes || {}
  const cat = item.workCategory

  if (cat === 'CABINETS_CLOSETS') {
    return { key: 'CABINET', label: '🪵 Cabinet Specs' }
  }
  if (cat === 'WALL_PANELING') {
    const wp = attrs.wpSubType
    if (wp === 'LOUVERS_PROFILES' || attrs.profileType) return { key: 'LOUVER', label: '✨ Decorative Panels' }
    if (wp === 'SCREWS_FASTENERS' || attrs.fastenerType) return { key: 'SCREW', label: '🔩 Screws & Fasteners' }
    if (wp === 'NAILS_PINS' || attrs.nailType) return { key: 'NAIL', label: '📌 Nails & Pins' }
    if (wp === 'ADHESIVES' || attrs.chemicalClass) return { key: 'ADHESIVE', label: '🧪 Adhesives' }
    return { key: 'BOARD', label: '🪵 Core Boards' }
  }
  if (cat === 'ACCESSORIES') {
    if (attrs.serviceCategory) return { key: 'SERVICES', label: '🚚 Deliverables & Services' }
    return { key: 'ACCESSORY', label: '🍳 Hardware & Accessories' }
  }
  if (cat === 'APPLIANCES') {
    return { key: 'APPLIANCE', label: '❄️ Appliances' }
  }
  if (cat === 'CEILING' || cat === 'ELECTRICAL_WORK') {
    return { key: 'ELECTRICAL', label: '💡 Lighting & Electrical' }
  }
  return { key: 'OTHER', label: '📦 Materials' }
}

function matchesActiveSection(entry: UsedMaterialEntry, section: CardSection | null): boolean {
  if (!section) return true

  const itemCeilingSubType = entry.item.variantAttributes?.ceilingSubType
  if (section.category === 'CEILING') {
    if (section.ceilingSubType === 'ELECTRICAL_DEVICES') {
      return entry.category === 'ELECTRICAL_WORK' ||
        (entry.category === 'CEILING' && itemCeilingSubType === 'ELECTRICAL_DEVICES')
    }
    return entry.category === 'CEILING' && itemCeilingSubType !== 'ELECTRICAL_DEVICES'
  }

  if (section.category === 'ELECTRICAL_WORK') {
    return entry.category === 'ELECTRICAL_WORK' ||
      (entry.category === 'CEILING' && itemCeilingSubType === 'ELECTRICAL_DEVICES')
  }

  return entry.category === section.category
}

function buildDisplayDetails(item: RequisitionItemInput): {
  displayTitle: string
  tags: { label: string; value: string; color?: string }[]
} {
  const attrs = item.variantAttributes || {}
  const tags: { label: string; value: string; color?: string }[] = []

  let displayTitle = item.materialName || ''

  if (item.workCategory === 'CABINETS_CLOSETS') {
    const baseMat = attrs.baseMaterial || attrs.coreSubstrateType || 'Cabinet Board'
    const thk = attrs.coreThickness || ''
    displayTitle = `${thk ? `${thk} ` : ''}${baseMat}`
    if (attrs.usage) tags.push({ label: 'Usage', value: String(attrs.usage) })
    if (attrs.frontLaminateCode || attrs.laminateFinishDetails) {
      tags.push({ label: 'Front', value: String(attrs.frontLaminateCode || attrs.laminateFinishDetails) })
    }
    if (attrs.backLaminateCode) {
      tags.push({ label: 'Back', value: String(attrs.backLaminateCode) })
    }
    if (attrs.edgingTapeQty) {
      tags.push({ label: 'Edging', value: String(attrs.edgingTapeQty) })
    }
  } else if (item.workCategory === 'WALL_PANELING') {
    const wp = attrs.wpSubType
    if (wp === 'CORE_BOARDS' || (!wp && (attrs.baseMaterial || attrs.laminateTopSurface))) {
      const baseMat = attrs.baseMaterial || item.materialName || 'Board'
      const thk = attrs.coreThickness || ''
      displayTitle = `${thk ? `${thk} ` : ''}${baseMat}`
      if (attrs.laminateTopSurface) tags.push({ label: 'Top', value: String(attrs.laminateTopSurface) })
      if (attrs.surfaceCodeFinish) tags.push({ label: 'Bottom', value: String(attrs.surfaceCodeFinish) })
      if (attrs.edgingTapeQty) tags.push({ label: 'Edging', value: String(attrs.edgingTapeQty) })
    } else if (wp === 'LOUVERS_PROFILES' || attrs.profileType) {
      displayTitle = String(attrs.profileType || item.materialName || 'Fluted Profile')
      if (attrs.material) tags.push({ label: 'Material', value: String(attrs.material) })
      if (attrs.accentFinish) tags.push({ label: 'Finish', value: String(attrs.accentFinish) })
      if (attrs.thickness) tags.push({ label: 'Thickness', value: String(attrs.thickness) })
    } else if (wp === 'SCREWS_FASTENERS' || attrs.fastenerType) {
      displayTitle = String(attrs.fastenerType || item.materialName || 'Screw')
      if (attrs.lengthInches) tags.push({ label: 'Length', value: String(attrs.lengthInches) })
      if (attrs.gaugeSize) tags.push({ label: 'Gauge', value: String(attrs.gaugeSize) })
      if (attrs.materialFinish) tags.push({ label: 'Finish', value: String(attrs.materialFinish) })
    } else if (wp === 'NAILS_PINS' || attrs.nailType) {
      displayTitle = String(attrs.nailType || item.materialName || 'Nail / Pin')
      if (attrs.lengthSpec) tags.push({ label: 'Length', value: String(attrs.lengthSpec) })
      if (attrs.functionalUsage) tags.push({ label: 'Usage', value: String(attrs.functionalUsage) })
    } else if (wp === 'ADHESIVES' || attrs.chemicalClass) {
      displayTitle = String(attrs.chemicalClass || item.materialName || 'Adhesive')
      if (attrs.applicationMethod) tags.push({ label: 'Method', value: String(attrs.applicationMethod) })
      if (attrs.packagingUnit) tags.push({ label: 'Pack', value: String(attrs.packagingUnit) })
    }
  } else if (item.workCategory === 'ACCESSORIES') {
    displayTitle = item.materialName || 'Accessory Item'
    if (attrs.itemCode) tags.push({ label: 'Code', value: String(attrs.itemCode) })
    if (attrs.accessoryCategory) tags.push({ label: 'Category', value: String(attrs.accessoryCategory) })
    if (attrs.serviceCategory) tags.push({ label: 'Service', value: String(attrs.serviceCategory) })
    if (attrs.dimensions) tags.push({ label: 'Dim', value: String(attrs.dimensions) })
  } else if (item.workCategory === 'APPLIANCES') {
    displayTitle = item.materialName || 'Appliance'
    if (attrs.brandModelCode) tags.push({ label: 'Brand/Model', value: String(attrs.brandModelCode) })
    if (attrs.cabinetNicheCutOutSize) tags.push({ label: 'Cutout', value: String(attrs.cabinetNicheCutOutSize) })
  } else {
    displayTitle = item.materialName || 'Material'
    if (item.specifications) tags.push({ label: 'Spec', value: String(item.specifications) })
  }

  if (item.unit) {
    tags.push({ label: 'Unit', value: item.unit })
  }

  return { displayTitle: displayTitle || 'Configured Material', tags }
}

export function UsedMaterialsPalette({
  isOpen,
  onClose,
  leadId,
  itemsMap,
  sectionsMap,
  productSlides,
  activeSection,
  currentCardKey,
  onInsertItem,
}: UsedMaterialsPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [persistedItems, setPersistedItems] = useState<RequisitionItemInput[]>([])

  useEffect(() => {
    setSelectedGroup('ALL')
  }, [activeSection?.id])

  // Load project-persisted used items from localStorage
  const storageKey = `boq_lead_used_items_${leadId}`
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as RequisitionItemInput[]
        if (Array.isArray(parsed)) setPersistedItems(parsed)
      }
    } catch {
      // ignore
    }
  }, [storageKey])

  // Extract all currently used items in this lead's project
  const usedEntries = useMemo(() => {
    const slideMap = new Map<string, ProductSlide>()
    for (const s of productSlides) slideMap.set(s.id, s)

    const list: UsedMaterialEntry[] = []
    const seen = new Set<string>()

    // 1. Collect from current itemsMap
    for (const [key, rows] of Object.entries(itemsMap)) {
      const [cardKey, sectionId] = key.split('::')
      const slide = slideMap.get(cardKey)
      const sec = (sectionsMap[cardKey] ?? []).find((s) => s.id === sectionId)

      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri]
        if (!hasMeaningfulData(row)) continue

        const sig = getItemSignature(row)
        if (seen.has(sig)) continue
        seen.add(sig)

        const group = determineGroup(row)
        const { displayTitle, tags } = buildDisplayDetails(row)

        list.push({
          id: `live-${cardKey}-${sectionId}-${ri}`,
          item: row,
          category: row.workCategory,
          groupKey: group.key,
          groupLabel: group.label,
          sourceProductName: slide?.title || 'Quotation Product',
          sourceSectionName: sec ? getSectionTypeLabel(sec) : 'Section',
          displayTitle,
          tags,
        })
      }
    }

    // 2. Merge any previously stored items in localStorage for this lead
    for (let i = 0; i < persistedItems.length; i++) {
      const p = persistedItems[i]
      if (!hasMeaningfulData(p)) continue
      const sig = getItemSignature(p)
      if (seen.has(sig)) continue
      seen.add(sig)

      const group = determineGroup(p)
      const { displayTitle, tags } = buildDisplayDetails(p)

      list.push({
        id: `persisted-${i}`,
        item: p,
        category: p.workCategory,
        groupKey: group.key,
        groupLabel: group.label,
        sourceProductName: 'Saved in Project',
        sourceSectionName: group.label,
        displayTitle,
        tags,
      })
    }

    return list
  }, [itemsMap, sectionsMap, productSlides, persistedItems])

  const targetEntries = useMemo(
    () => usedEntries.filter((entry) => matchesActiveSection(entry, activeSection)),
    [usedEntries, activeSection]
  )

  // Save current project items to localStorage
  useEffect(() => {
    if (usedEntries.length === 0) return
    try {
      const cleanList = usedEntries.map((e) => e.item).slice(0, 50)
      localStorage.setItem(storageKey, JSON.stringify(cleanList))
    } catch {
      // ignore
    }
  }, [usedEntries, storageKey])

  // Available groups for filtering
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; label: string; count: number }>()
    for (const entry of targetEntries) {
      const existing = m.get(entry.groupKey)
      if (existing) {
        existing.count++
      } else {
        m.set(entry.groupKey, { key: entry.groupKey, label: entry.groupLabel, count: 1 })
      }
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count)
  }, [targetEntries])

  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = targetEntries

    if (selectedGroup !== 'ALL') {
      result = result.filter((e) => e.groupKey === selectedGroup)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (e) =>
          e.displayTitle.toLowerCase().includes(q) ||
          e.sourceProductName.toLowerCase().includes(q) ||
          e.tags.some((t) => t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q))
      )
    }

    return result
  }, [targetEntries, selectedGroup, search])

  // Target section name label
  const activeSectionLabel = useMemo(() => {
    if (!activeSection) return 'Current Section'
    return getSectionTypeLabel(activeSection)
  }, [activeSection])

  const handleCopyInsert = (entry: UsedMaterialEntry) => {
    onInsertItem(entry.item, activeSection?.id)
    setCopiedId(entry.id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleClearProjectCache = () => {
    if (confirm('Clear the cached used materials for this project? (Active configured rows will remain)')) {
      localStorage.removeItem(storageKey)
      setPersistedItems([])
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative z-50 flex w-full max-w-md flex-col bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3.5 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Used Materials</h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {targetEntries.length} for Target
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Showing materials for this target. Drag & drop or click Insert.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Context Helper */}
        <div className="px-3.5 py-2 bg-primary/5 border-b border-primary/15 text-[11px] flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-primary">Target:</span>
            <span className="font-bold text-foreground truncate max-w-[200px]">
              {activeSectionLabel}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">Click &quot;Insert&quot; to copy</span>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border/60 bg-background">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search used materials, finishes, codes..."
              className="w-full rounded-md border border-input bg-muted/30 pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="px-3 py-2 border-b border-border/60 bg-muted/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedGroup('ALL')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedGroup === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'bg-background hover:bg-muted text-muted-foreground border border-border/60'
            }`}
          >
            All ({targetEntries.length})
          </button>
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setSelectedGroup(g.key)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedGroup === g.key
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-background hover:bg-muted text-muted-foreground border border-border/60'
              }`}
            >
              {g.label} ({g.count})
            </button>
          ))}
        </div>

        {/* List of Draggable Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs font-semibold text-foreground">No matching materials found</p>
              <p className="text-[11px] leading-relaxed">
                As you configure materials in any product of this lead, they will automatically appear here to be reused!
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isRecentlyCopied = copiedId === entry.id

              return (
                <div
                  key={entry.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/boq-item', JSON.stringify(entry.item))
                    e.dataTransfer.setData('text/plain', JSON.stringify(entry.item))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  className="group relative rounded-xl border border-border/80 bg-card p-3 shadow-2xs hover:border-primary/50 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing"
                >
                  {/* Top row: drag handle, category, and insert button */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="text-muted-foreground/60 group-hover:text-primary transition-colors cursor-grab"
                        title="Drag to section"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {entry.groupLabel}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyInsert(entry)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        isRecentlyCopied
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20'
                      }`}
                      title="Insert to currently active section"
                    >
                      {isRecentlyCopied ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>Insert</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Main title */}
                  <h4 className="text-xs font-black text-foreground leading-snug">
                    {entry.displayTitle}
                  </h4>

                  {/* Specification tags */}
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.tags.map((tag, ti) => (
                        <span
                          key={ti}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-foreground/80 border border-border/40 font-medium"
                        >
                          <span className="text-muted-foreground font-semibold">{tag.label}: </span>
                          {tag.value}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Origin info footer */}
                  <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[9px] text-muted-foreground">
                    <span className="truncate max-w-[240px]">
                      From: <span className="font-semibold text-foreground/70">{entry.sourceProductName}</span>
                    </span>
                    <span className="italic text-muted-foreground/60 hidden sm:inline">Drag to drop</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-border/80 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Project materials auto-saved</span>
          {usedEntries.length > 0 && (
            <button
              onClick={handleClearProjectCache}
              className="text-[10px] text-muted-foreground/70 hover:text-destructive flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset saved project material cache"
            >
              <Trash2 className="w-3 h-3" /> Clear cache
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
