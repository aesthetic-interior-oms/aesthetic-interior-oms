'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  X,
  Search,
  Plus,
  Sparkles,
  Package,
  Check,
  Trash2,
  ChevronRight,
  Copy,
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
  subtitle?: string
  cabinetParts?: {
    thickness: string
    frontLaminate: string
    backLaminate: string
    baseMaterial: string
  }
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

function determineGroup(item: RequisitionItemInput): { key: string; label: string; emoji: string } {
  const attrs = item.variantAttributes || {}
  const cat = item.workCategory

  if (cat === 'CABINETS_CLOSETS') {
    return { key: 'CABINET', label: 'Cabinet Specs', emoji: '🪵' }
  }
  if (cat === 'WALL_PANELING') {
    const wp = attrs.wpSubType
    if (wp === 'LOUVERS_PROFILES' || attrs.profileType) return { key: 'LOUVER', label: 'Decorative Panels', emoji: '✨' }
    if (wp === 'SCREWS_FASTENERS' || attrs.fastenerType) return { key: 'SCREW', label: 'Screws & Fasteners', emoji: '🔩' }
    if (wp === 'NAILS_PINS' || attrs.nailType) return { key: 'NAIL', label: 'Nails & Pins', emoji: '📌' }
    if (wp === 'ADHESIVES' || attrs.chemicalClass) return { key: 'ADHESIVE', label: 'Adhesives', emoji: '🧪' }
    return { key: 'BOARD', label: 'Core Boards', emoji: '🪵' }
  }
  if (cat === 'ACCESSORIES') {
    if (attrs.serviceCategory) return { key: 'SERVICES', label: 'Services', emoji: '🚚' }
    return { key: 'ACCESSORY', label: 'Hardware', emoji: '🍳' }
  }
  if (cat === 'APPLIANCES') {
    return { key: 'APPLIANCE', label: 'Appliances', emoji: '❄️' }
  }
  if (cat === 'CEILING' || cat === 'ELECTRICAL_WORK') {
    return { key: 'ELECTRICAL', label: 'Lighting & Electrical', emoji: '💡' }
  }
  return { key: 'OTHER', label: 'Materials', emoji: '📦' }
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
  subtitle: string
  cabinetParts?: {
    thickness: string
    frontLaminate: string
    backLaminate: string
    baseMaterial: string
  }
  tags: { label: string; value: string }[]
} {
  const attrs = item.variantAttributes || {}
  const tags: { label: string; value: string }[] = []
  let displayTitle = item.materialName || ''
  let subtitle = ''
  let cabinetParts: { thickness: string; frontLaminate: string; backLaminate: string; baseMaterial: string } | undefined

  if (item.workCategory === 'CABINETS_CLOSETS') {
    const baseMat = attrs.baseMaterial || attrs.coreSubstrateType || 'MR MDF Architect Grade Board'
    const thk = attrs.coreThickness ? String(attrs.coreThickness) : ''
    const frontLam = (attrs.frontLaminateCode || attrs.laminateFinishDetails ? String(attrs.frontLaminateCode || attrs.laminateFinishDetails) : '') || 'Raw Board'
    const backLam = (attrs.backLaminateCode ? String(attrs.backLaminateCode) : '') || 'Raw Board'

    cabinetParts = {
      thickness: thk,
      frontLaminate: frontLam,
      backLaminate: backLam,
      baseMaterial: String(baseMat),
    }

    displayTitle = [thk, frontLam, backLam, baseMat].filter(Boolean).join(' ')
    subtitle = attrs.usage ? String(attrs.usage) : ''
    if (attrs.usage) {
      tags.push({ label: 'Usage', value: String(attrs.usage) })
    }
    if (attrs.edgingTapeQty) {
      tags.push({ label: 'Edge', value: String(attrs.edgingTapeQty) })
    }
  } else if (item.workCategory === 'WALL_PANELING') {
    const wp = attrs.wpSubType
    if (wp === 'CORE_BOARDS' || (!wp && (attrs.baseMaterial || attrs.laminateTopSurface))) {
      const baseMat = attrs.baseMaterial || item.materialName || 'MR MDF Architect Grade Board'
      const thk = attrs.coreThickness ? String(attrs.coreThickness) : ''
      const frontLam = (attrs.laminateTopSurface || attrs.frontLaminateCode ? String(attrs.laminateTopSurface || attrs.frontLaminateCode) : '') || 'Raw Board'
      const backLam = (attrs.surfaceCodeFinish || attrs.backLaminateCode ? String(attrs.surfaceCodeFinish || attrs.backLaminateCode) : '') || 'Raw Board'

      cabinetParts = {
        thickness: thk,
        frontLaminate: frontLam,
        backLaminate: backLam,
        baseMaterial: String(baseMat),
      }

      displayTitle = [thk, frontLam, backLam, baseMat].filter(Boolean).join(' ')
      subtitle = attrs.functionalUsage ? String(attrs.functionalUsage) : ''
      if (attrs.functionalUsage) tags.push({ label: 'Usage', value: String(attrs.functionalUsage) })
      if (attrs.edgingTapeQty) tags.push({ label: 'Edge', value: String(attrs.edgingTapeQty) })
    } else if (wp === 'LOUVERS_PROFILES' || attrs.profileType) {
      displayTitle = String(attrs.profileType || item.materialName || 'Fluted Profile')
      if (attrs.material) tags.push({ label: 'Material', value: String(attrs.material) })
      if (attrs.accentFinish) tags.push({ label: 'Finish', value: String(attrs.accentFinish) })
      if (attrs.thickness) tags.push({ label: 'Thickness', value: String(attrs.thickness) })
    } else if (wp === 'SCREWS_FASTENERS' || attrs.fastenerType) {
      displayTitle = String(attrs.fastenerType || item.materialName || 'Screw')
      if (attrs.lengthInches) tags.push({ label: 'Length', value: String(attrs.lengthInches) })
      if (attrs.gaugeSize) tags.push({ label: 'Gauge', value: String(attrs.gaugeSize) })
    } else if (wp === 'NAILS_PINS' || attrs.nailType) {
      displayTitle = String(attrs.nailType || item.materialName || 'Nail / Pin')
      if (attrs.lengthSpec) tags.push({ label: 'Length', value: String(attrs.lengthSpec) })
    } else if (wp === 'ADHESIVES' || attrs.chemicalClass) {
      displayTitle = String(attrs.chemicalClass || item.materialName || 'Adhesive')
      if (attrs.applicationMethod) tags.push({ label: 'Method', value: String(attrs.applicationMethod) })
    }
  } else if (item.workCategory === 'ACCESSORIES') {
    displayTitle = item.materialName || 'Accessory Item'
    if (attrs.itemCode) tags.push({ label: 'Code', value: String(attrs.itemCode) })
    if (attrs.accessoryCategory) tags.push({ label: 'Cat', value: String(attrs.accessoryCategory) })
    if (attrs.dimensions) tags.push({ label: 'Dim', value: String(attrs.dimensions) })
  } else if (item.workCategory === 'APPLIANCES') {
    displayTitle = item.materialName || 'Appliance'
    if (attrs.brandModelCode) tags.push({ label: 'Brand', value: String(attrs.brandModelCode) })
    if (attrs.cabinetNicheCutOutSize) tags.push({ label: 'Cutout', value: String(attrs.cabinetNicheCutOutSize) })
  } else {
    displayTitle = item.materialName || 'Material'
    if (item.specifications) tags.push({ label: 'Spec', value: String(item.specifications) })
  }

  if (item.unit) {
    tags.push({ label: 'Unit', value: item.unit })
  }

  return { displayTitle: displayTitle || 'Configured Material', subtitle, tags }
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
  const [justInsertedId, setJustInsertedId] = useState<string | null>(null)
  const [persistedItems, setPersistedItems] = useState<RequisitionItemInput[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSelectedGroup('ALL')
  }, [activeSection?.id])

  // Auto-focus search when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 150)
    }
  }, [isOpen])

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
        const { displayTitle, subtitle, cabinetParts, tags } = buildDisplayDetails(row)

        list.push({
          id: `live-${cardKey}-${sectionId}-${ri}`,
          item: row,
          category: row.workCategory,
          groupKey: group.key,
          groupLabel: `${group.emoji} ${group.label}`,
          sourceProductName: slide?.title || 'Quotation Product',
          sourceSectionName: sec ? getSectionTypeLabel(sec) : 'Section',
          displayTitle,
          subtitle,
          cabinetParts,
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
      const { displayTitle, subtitle, cabinetParts, tags } = buildDisplayDetails(p)

      list.push({
        id: `persisted-${i}`,
        item: p,
        category: p.workCategory,
        groupKey: group.key,
        groupLabel: `${group.emoji} ${group.label}`,
        sourceProductName: 'Saved in Project',
        sourceSectionName: group.label,
        displayTitle,
        subtitle,
        cabinetParts,
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
      result = result.filter((e) => {
        if (e.displayTitle.toLowerCase().includes(q)) return true
        if (e.sourceProductName.toLowerCase().includes(q)) return true
        if (e.cabinetParts) {
          if (e.cabinetParts.thickness.toLowerCase().includes(q)) return true
          if (e.cabinetParts.frontLaminate.toLowerCase().includes(q)) return true
          if (e.cabinetParts.backLaminate.toLowerCase().includes(q)) return true
          if (e.cabinetParts.baseMaterial.toLowerCase().includes(q)) return true
        }
        if (e.tags.some((t) => t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q))) return true
        return false
      })
    }

    return result
  }, [targetEntries, selectedGroup, search])

  // Target section name label
  const activeSectionLabel = useMemo(() => {
    if (!activeSection) return 'Current Section'
    return getSectionTypeLabel(activeSection)
  }, [activeSection])

  const handleInsert = (entry: UsedMaterialEntry) => {
    onInsertItem(entry.item, activeSection?.id)
    setJustInsertedId(entry.id)
    // Keep sidebar open so user can insert more items; clear confirmation after 1.2s
    setTimeout(() => {
      setJustInsertedId(null)
    }, 1200)
  }

  const handleClearProjectCache = () => {
    if (confirm('Clear the cached used materials for this project? (Active configured rows will remain)')) {
      localStorage.removeItem(storageKey)
      setPersistedItems([])
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Invisible Click-Outside Backdrop (No blur, 100% transparent and clear view) */}
      <div
        className="fixed inset-0 cursor-default"
        onClick={onClose}
        title="Click outside to close"
      />

      {/* Drawer Panel */}
      <div
        className="relative z-50 flex w-84 sm:w-92 flex-col bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-gradient-to-r from-amber-500/10 to-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground leading-tight">Used Materials</h3>
              <p className="text-[10px] text-muted-foreground truncate">
                {targetEntries.length} reusable · click to insert
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Target Section Banner ── */}
        <div className="px-3.5 py-2 bg-primary/5 border-b border-primary/10 flex items-center gap-2">
          <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Inserting into: </span>
            <span className="text-[11px] font-bold text-foreground truncate block">{activeSectionLabel}</span>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="px-3 pt-3 pb-2 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search materials, finishes, codes..."
              className="w-full rounded-lg border border-input bg-muted/40 pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Group Filter Pills ── */}
        {groups.length > 1 && (
          <div className="px-3 py-2 border-b border-border/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedGroup('ALL')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedGroup === 'ALL'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground border border-border/60'
              }`}
            >
              All {targetEntries.length}
            </button>
            {groups.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setSelectedGroup(g.key)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedGroup === g.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground border border-border/60'
                }`}
              >
                {g.label} {g.count}
              </button>
            ))}
          </div>
        )}

        {/* ── Material Cards List ── */}
        <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2">
              <Package className="w-7 h-7 mx-auto text-muted-foreground/30" />
              <p className="text-xs font-semibold text-foreground">No materials found</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Materials you configure appear here for quick reuse across products.
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isInserted = justInsertedId === entry.id
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleInsert(entry)}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/boq-item', JSON.stringify(entry.item))
                    e.dataTransfer.setData('text/plain', JSON.stringify(entry.item))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  className={`w-full text-left rounded-xl border p-3 transition-all cursor-pointer group ${
                    isInserted
                      ? 'border-emerald-500/60 bg-emerald-500/10 scale-[0.98]'
                      : 'border-border/70 bg-card hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm active:scale-[0.97]'
                  }`}
                  title={`Insert "${entry.displayTitle}" into ${activeSectionLabel}`}
                >
                  {/* Top row: group badge + insert indicator */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/40 whitespace-nowrap">
                      {entry.groupLabel}
                    </span>
                    <span className={`shrink-0 flex items-center gap-0.5 text-[10px] font-bold transition-all ${
                      isInserted ? 'text-emerald-600' : 'text-muted-foreground/50 group-hover:text-primary'
                    }`}>
                      {isInserted ? (
                        <><Check className="w-3 h-3" /> Added</>
                      ) : (
                        <><Plus className="w-3 h-3" /> Insert</>
                      )}
                    </span>
                  </div>

                  {/* Material title: Board / Cabinet specific (Thickness + Front Lam [Blue] + Back Lam [Orange] + Base Material) */}
                  {entry.cabinetParts ? (
                    <div className="space-y-1.5 mb-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {entry.cabinetParts.thickness && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground border border-border/70">
                            {entry.cabinetParts.thickness}
                          </span>
                        )}
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-600 text-white shadow-xs">
                          {entry.cabinetParts.frontLaminate} (Front)
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-orange-500 text-white shadow-xs">
                          {entry.cabinetParts.backLaminate} (Back)
                        </span>
                      </div>
                      <p className="text-xs font-bold text-foreground leading-snug">
                        {entry.cabinetParts.baseMaterial}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-foreground leading-snug line-clamp-2 mb-1.5">
                      {entry.displayTitle}
                    </p>
                  )}

                  {/* Tags */}
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.map((tag, ti) => (
                        <span
                          key={ti}
                          className="text-[9px] px-1 py-0.5 rounded bg-muted/60 text-foreground/70 border border-border/30 font-medium"
                        >
                          <span className="text-muted-foreground">{tag.label}:</span> {tag.value}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Source footer */}
                  <div className="mt-2 pt-1.5 border-t border-border/30 text-[9px] text-muted-foreground/60 truncate">
                    From: <span className="font-medium text-muted-foreground">{entry.sourceProductName}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-3 py-2 border-t border-border/60 bg-muted/10 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="italic">Click card to insert</span>
          {usedEntries.length > 0 && (
            <button
              onClick={handleClearProjectCache}
              className="flex items-center gap-1 text-muted-foreground/60 hover:text-destructive transition-colors cursor-pointer"
              title="Reset saved project material cache"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
