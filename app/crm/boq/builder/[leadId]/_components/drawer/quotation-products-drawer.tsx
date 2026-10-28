'use client'

import React, { useState, useMemo } from 'react'
import {
  Layers,
  X,
  Search,
  Building,
  Folder,
  Package,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type {
  ProductSlide,
  SectionsMap,
  ItemsMap,
  CardSection,
} from '../types/boq-builder-types'
import type { RequisitionItemInput } from '@/lib/boq-service'
import type { QuotationSection } from '@/lib/quotation-types'
import { sectionItemKey } from '../helpers/boq-state-seeders'
import { formatBdtRounded } from '../helpers/boq-pdf-builder'

interface QuotationProductsDrawerProps {
  isOpen: boolean
  onClose: () => void
  productSlides: ProductSlide[]
  currentSlideId: string
  onSelectSlide: (slideId: string) => void
  sections: QuotationSection[]
  sectionsMap: SectionsMap
  itemsMap: ItemsMap
  lineItemsCount: number
  coveredLineItems: number
  coveragePct: number
  getSectionsForCard: (cardKey: string) => CardSection[]
  getRowsForSection: (cardKey: string, sectionId: string) => RequisitionItemInput[]
}

export function QuotationProductsDrawer({
  isOpen,
  onClose,
  productSlides,
  currentSlideId,
  onSelectSlide,
  sections,
  sectionsMap,
  itemsMap,
  lineItemsCount,
  coveredLineItems,
  coveragePct,
  getSectionsForCard,
  getRowsForSection,
}: QuotationProductsDrawerProps) {
  const [drawerSearch, setDrawerSearch] = useState('')
  const [collapsedFloors, setCollapsedFloors] = useState<Record<string, boolean>>({})
  const [collapsedAreas, setCollapsedAreas] = useState<Record<string, boolean>>({})

  // Filter slides based on search term
  const filteredSlides = useMemo(() => {
    if (!drawerSearch.trim()) return productSlides
    const q = drawerSearch.toLowerCase()
    return productSlides.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.sectionName?.toLowerCase().includes(q) ||
        s.areaName?.toLowerCase().includes(q)
    )
  }, [productSlides, drawerSearch])

  // Group filtered slides by Floor and Area for sidebar drawer
  const { groupedFloorSlides, extraSlides } = useMemo(() => {
    const floorMap = new Map<
      string,
      {
        floorId: string
        floorName: string
        areaMap: Map<string, { areaId: string; areaName: string; slides: ProductSlide[] }>
      }
    >()

    for (const s of sections) {
      floorMap.set(s.id, {
        floorId: s.id,
        floorName: s.name,
        areaMap: new Map(),
      })
    }

    const extras: ProductSlide[] = []

    for (const slide of filteredSlides) {
      if (slide.type === 'EXTRA') {
        extras.push(slide)
        continue
      }
      const fId = slide.floorId || 'general-floor'
      const fName = slide.sectionName || 'General Floor'

      let floorEntry = floorMap.get(fId)
      if (!floorEntry) {
        floorEntry = { floorId: fId, floorName: fName, areaMap: new Map() }
        floorMap.set(fId, floorEntry)
      }

      const aId = slide.areaId || 'general-area'
      const aName = slide.areaName || 'General Area'

      let areaEntry = floorEntry.areaMap.get(aId)
      if (!areaEntry) {
        areaEntry = { areaId: aId, areaName: aName, slides: [] }
        floorEntry.areaMap.set(aId, areaEntry)
      }

      areaEntry.slides.push(slide)
    }

    const grouped: {
      floorId: string
      floorName: string
      totalAmount: number
      configuredCount: number
      totalCount: number
      areas: {
        areaId: string
        areaName: string
        slides: ProductSlide[]
        totalAmount: number
        configuredCount: number
        totalCount: number
      }[]
    }[] = []

    for (const [, floor] of floorMap) {
      const areasList: {
        areaId: string
        areaName: string
        slides: ProductSlide[]
        totalAmount: number
        configuredCount: number
        totalCount: number
      }[] = []
      let fAmount = 0
      let fConfigured = 0
      let fTotal = 0

      for (const [, area] of floor.areaMap) {
        if (area.slides.length === 0) continue
        let aAmount = 0
        let aConfigured = 0
        for (const s of area.slides) {
          aAmount += s.amount || 0
          const cardSections = sectionsMap[s.id] ?? []
          const rowsCount = cardSections.reduce(
            (sum, cs) => sum + (itemsMap[sectionItemKey(s.id, cs.id)] ?? []).length,
            0
          )
          if (rowsCount > 0) aConfigured++
        }

        areasList.push({
          areaId: area.areaId,
          areaName: area.areaName,
          slides: area.slides,
          totalAmount: aAmount,
          configuredCount: aConfigured,
          totalCount: area.slides.length,
        })

        fAmount += aAmount
        fConfigured += aConfigured
        fTotal += area.slides.length
      }

      if (areasList.length > 0) {
        grouped.push({
          floorId: floor.floorId,
          floorName: floor.floorName,
          totalAmount: fAmount,
          configuredCount: fConfigured,
          totalCount: fTotal,
          areas: areasList,
        })
      }
    }

    return { groupedFloorSlides: grouped, extraSlides: extras }
  }, [sections, filteredSlides, sectionsMap, itemsMap])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative z-50 flex w-full max-w-md flex-col bg-card border-r border-border shadow-2xl animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3.5 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Quotation Products</h3>
              <p className="text-[11px] text-muted-foreground">
                {coveredLineItems} of {lineItemsCount} products configured ({coveragePct}%)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-border/60 bg-background">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={drawerSearch}
              onChange={(e) => setDrawerSearch(e.target.value)}
              placeholder="Search product, room, or floor..."
              className="w-full rounded-md border border-input bg-muted/30 pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {drawerSearch && (
              <button
                onClick={() => setDrawerSearch('')}
                className="absolute right-2 top-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-bar: Floor Count & Collapse/Expand All */}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border/60 text-[11px] text-muted-foreground">
          <span className="font-medium">
            {groupedFloorSlides.length} {groupedFloorSlides.length === 1 ? 'Floor' : 'Floors'} · {coveredLineItems}/{lineItemsCount} ready
          </span>
          <button
            type="button"
            onClick={() => {
              const anyCollapsed = groupedFloorSlides.some((f) => !!collapsedFloors[f.floorId])
              if (anyCollapsed) {
                setCollapsedFloors({})
                setCollapsedAreas({})
              } else {
                const nextFloors: Record<string, boolean> = {}
                const nextAreas: Record<string, boolean> = {}
                for (const f of groupedFloorSlides) {
                  nextFloors[f.floorId] = true
                  for (const a of f.areas) {
                    nextAreas[`${f.floorId}::${a.areaId}`] = true
                  }
                }
                setCollapsedFloors(nextFloors)
                setCollapsedAreas(nextAreas)
              }
            }}
            className="font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
          >
            {groupedFloorSlides.some((f) => !!collapsedFloors[f.floorId]) ? 'Expand All' : 'Collapse All'}
          </button>
        </div>

        {/* Product List Grouped by Floor & Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {groupedFloorSlides.map((floor) => {
            const isSearching = Boolean(drawerSearch.trim())
            const isFloorOpen = isSearching || !collapsedFloors[floor.floorId]
            const floorReady = floor.configuredCount === floor.totalCount && floor.totalCount > 0

            return (
              <div
                key={floor.floorId}
                className="rounded-xl border border-border/80 overflow-hidden bg-card/60 shadow-2xs"
              >
                {/* Floor Header */}
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedFloors((prev) => ({
                      ...prev,
                      [floor.floorId]: !isFloorOpen,
                    }))
                  }
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/50 hover:bg-muted/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 rounded-md bg-background text-muted-foreground border border-border/50 shrink-0">
                      {isFloorOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <Building className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-bold text-foreground truncate">
                      {floor.floorName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        floorReady
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {floor.configuredCount}/{floor.totalCount} ready
                    </span>
                    {floor.totalAmount > 0 && (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {formatBdtRounded(floor.totalAmount)}
                      </span>
                    )}
                  </div>
                </button>

                {/* Floor Body (Areas) */}
                {isFloorOpen && (
                  <div className="p-2 space-y-2 bg-background/50 border-t border-border/60">
                    {floor.areas.map((area) => {
                      const areaKey = `${floor.floorId}::${area.areaId}`
                      const isAreaOpen = isSearching || !collapsedAreas[areaKey]
                      const areaReady = area.configuredCount === area.totalCount && area.totalCount > 0

                      return (
                        <div
                          key={area.areaId}
                          className="rounded-lg border border-border/60 overflow-hidden bg-card/80"
                        >
                          {/* Area Header */}
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedAreas((prev) => ({
                                ...prev,
                                [areaKey]: !isAreaOpen,
                              }))
                            }
                            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="text-muted-foreground shrink-0">
                                {isAreaOpen ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </div>
                              <Folder className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              <span className="text-[11px] font-semibold text-foreground truncate">
                                {area.areaName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  areaReady
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {area.configuredCount}/{area.totalCount} ready
                              </span>
                            </div>
                          </button>

                          {/* Area Items */}
                          {isAreaOpen && (
                            <div className="p-1.5 space-y-1.5 border-t border-border/50">
                              {area.slides.map((slide) => {
                                const isSelected = currentSlideId === slide.id
                                const cardSections = getSectionsForCard(slide.id)
                                const rowsCount = cardSections.reduce(
                                  (sum, s) => sum + getRowsForSection(slide.id, s.id).length,
                                  0
                                )
                                const isConfigured = rowsCount > 0

                                return (
                                  <button
                                    key={slide.id}
                                    type="button"
                                    onClick={() => {
                                      onSelectSlide(slide.id)
                                      onClose()
                                    }}
                                    className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                                      isSelected
                                        ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40'
                                        : 'border-border/60 bg-background hover:bg-muted/40 hover:border-primary/30'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <span
                                            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                              isSelected
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground'
                                            }`}
                                          >
                                            #{slide.index}
                                          </span>
                                        </div>
                                        <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight">
                                          {slide.title}
                                        </p>
                                      </div>
                                      {slide.amount > 0 && (
                                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                                          {formatBdtRounded(slide.amount)}
                                        </span>
                                      )}
                                    </div>

                                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-1.5">
                                      <div className="flex items-center gap-1">
                                        <Package className="w-3 h-3 opacity-70" />
                                        <span>
                                          {cardSections.length} sections · {rowsCount} rows
                                        </span>
                                      </div>
                                      {isConfigured ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                                          <CheckCircle2 className="w-3 h-3" /> Ready
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-amber-500 font-semibold text-[10px]">
                                          <AlertCircle className="w-3 h-3" /> Needs rows
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Extra & General Materials */}
          {extraSlides.map((slide) => {
            const isSelected = currentSlideId === slide.id
            const cardSections = getSectionsForCard(slide.id)
            const rowsCount = cardSections.reduce(
              (sum, s) => sum + getRowsForSection(slide.id, s.id).length,
              0
            )
            const isConfigured = rowsCount > 0

            return (
              <div key={slide.id} className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectSlide(slide.id)
                    onClose()
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-xs ring-1 ring-amber-500/40'
                      : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/80 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Site Supplies
                        </span>
                      </div>
                      <p className="text-xs font-bold text-foreground">{slide.title}</p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-amber-200/50 dark:border-amber-900/40 pt-1.5">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3 h-3 opacity-70" />
                      <span>
                        {cardSections.length} sections · {rowsCount} rows
                      </span>
                    </div>
                    {isConfigured ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                        <AlertCircle className="w-3 h-3" /> Optional
                      </span>
                    )}
                  </div>
                </button>
              </div>
            )
          })}

          {/* Empty state when searching */}
          {groupedFloorSlides.length === 0 && extraSlides.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No products match &ldquo;{drawerSearch}&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
