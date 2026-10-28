'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Package } from 'lucide-react'
import type { RequisitionItemInput } from '@/lib/boq-service'
import type { QuotationLineItem, QuotationArea } from '@/lib/quotation-types'
import type {
  WallPanelingSubType,
  CabinetSubType,
  AccessoriesSubType,
  ApplianceSubType,
  CeilingSubType,
  RequisitionWorkCategory,
  RequisitionFieldValue,
  BoardVariantAttributes,
  BoqSavedAccessoryItem,
  CardSection,
} from '../types/boq-builder-types'
import { formatBdtRounded } from '../helpers/boq-pdf-builder'
import { SectionBlock } from './section-block'
import { AddSectionForm } from './add-section-modal'

export function QuotationLineItemCard({
  item,
  area,
  sections,
  getRowsForSection,
  onChangeRow,
  onUpdateVariant,
  onAddRow,
  onRemoveRow,
  onLoadPreset,
  onLoadCabinetPreset,
  onLoadAccessoryPreset,
  onLoadAppliancePreset,
  onAddSection,
  onRemoveSection,
  onToggleSectionCollapse,
  boqSavedAccessories,
  onSelectSavedAccessory,
  onSaveNewSavedAccessory,
}: {
  item: QuotationLineItem
  area?: QuotationArea
  sections: CardSection[]
  getRowsForSection: (sectionId: string) => RequisitionItemInput[]
  onChangeRow: (sectionId: string, ri: number, field: keyof RequisitionItemInput, value: RequisitionFieldValue) => void
  onUpdateVariant: (sectionId: string, ri: number, field: keyof BoardVariantAttributes, value: string) => void
  onAddRow: (sectionId: string) => void
  onRemoveRow: (sectionId: string, ri: number) => void
  onLoadPreset: (sectionId: string, subType: WallPanelingSubType) => void
  onLoadCabinetPreset: (sectionId: string, subType: CabinetSubType) => void
  onLoadAccessoryPreset?: (sectionId: string, subType: AccessoriesSubType) => void
  onLoadAppliancePreset?: (sectionId: string, subType: ApplianceSubType) => void
  onAddSection: (category: RequisitionWorkCategory, wpSubType?: WallPanelingSubType, cabSubType?: CabinetSubType, accSubType?: AccessoriesSubType, appSubType?: ApplianceSubType, ceilSubType?: CeilingSubType, includeSourceSchedule?: boolean) => void
  onRemoveSection: (sectionId: string) => void
  onToggleSectionCollapse: (sectionId: string) => void
  boqSavedAccessories?: BoqSavedAccessoryItem[]
  onSelectSavedAccessory?: (sectionId: string, ri: number, item: BoqSavedAccessoryItem) => void
  onSaveNewSavedAccessory?: (name: string, category?: string, itemCode?: string) => Promise<void> | void
}) {
  const [cardExpanded, setCardExpanded] = useState(true)
  const [showAddSection, setShowAddSection] = useState(false)

  const totalRows = sections.reduce((sum, s) => sum + getRowsForSection(s.id).length, 0)

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-primary/20 bg-card shadow-sm ring-1 ring-transparent transition-shadow hover:border-primary/35 hover:shadow-md">
      {/* Card header */}
      <button
        onClick={() => setCardExpanded((v) => !v)}
        className="w-full border-b border-primary/15 bg-primary/[0.035] px-4 py-4 text-left transition-colors hover:bg-primary/[0.06]"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
            {cardExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                  Quotation Product
                </span>
                {area && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/25">
                    {area.name}
                  </span>
                )}
              </div>
              <p className="truncate text-base font-bold text-foreground">{item.description}</p>
              {item.materials && (
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/85">{item.materials}</p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 space-y-2 text-left lg:border-l lg:border-border/60 lg:pl-4 lg:text-right">
            <div className="flex items-center gap-2 lg:justify-end">
              <span className="text-xs font-medium text-muted-foreground">{item.quantity} {item.unit}</span>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                {formatBdtRounded(item.amount)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="rounded-lg border border-border/70 bg-muted/25 px-2.5 py-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sections</span>
                <span className="block text-sm font-bold text-foreground">{sections.length}</span>
              </span>
              <span className="rounded-lg border border-border/70 bg-muted/25 px-2.5 py-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rows</span>
                <span className="block text-sm font-bold text-foreground">{totalRows}</span>
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground lg:justify-end">
              {totalRows > 0 ? (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              ) : (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
              {totalRows > 0 ? 'Configured' : 'Needs material rows'}
            </p>
          </div>
        </div>
      </button>

      {cardExpanded && (
        <div className="space-y-3 bg-muted/10 p-3">
          {sections.length > 0 ? (
            <div className="rounded-xl border border-dashed border-primary/25 bg-background px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                <span className="rounded bg-primary/10 px-2 py-0.5 font-black uppercase tracking-wider text-primary">Inside this product</span>
                <span>add section types first, then material rows under each section.</span>
              </div>
            </div>
          ) : null}
          {/* Empty state */}
          {sections.length === 0 && !showAddSection && (
            <div className="rounded-xl border border-dashed border-border/80 bg-background px-4 py-8 text-center text-xs text-muted-foreground space-y-2">
              <Package className="w-6 h-6 mx-auto text-muted-foreground/40" />
              <p className="font-semibold text-foreground/80">No material sections configured for this quotation item.</p>
              <p className="text-[11px] text-muted-foreground">Add a section below to start specifying required materials.</p>
            </div>
          )}

          {/* Section blocks */}
          {sections.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              rows={getRowsForSection(section.id)}
              onChange={(ri, field, val) => onChangeRow(section.id, ri, field, val)}
              onUpdateVariant={(ri, field, val) => onUpdateVariant(section.id, ri, field, val)}
              onAddRow={() => onAddRow(section.id)}
              onRemoveRow={(ri) => onRemoveRow(section.id, ri)}
              onLoadPreset={(subType) => onLoadPreset(section.id, subType)}
              onLoadCabinetPreset={(subType) => onLoadCabinetPreset(section.id, subType)}
              onLoadAccessoryPreset={(subType) => onLoadAccessoryPreset?.(section.id, subType)}
              onLoadAppliancePreset={(subType) => onLoadAppliancePreset?.(section.id, subType)}
              onToggleCollapse={() => onToggleSectionCollapse(section.id)}
              onRemove={() => onRemoveSection(section.id)}
              boqSavedAccessories={boqSavedAccessories}
              onSelectSavedAccessory={(ri, item) => onSelectSavedAccessory?.(section.id, ri, item)}
              onSaveNewSavedAccessory={onSaveNewSavedAccessory}
            />
          ))}

          {/* Add Section form or trigger */}
          {showAddSection ? (
            <AddSectionForm
              lineItem={item}
              onAdd={(cat, wpSub, cabSub, accSub, appSub, ceilSub, includeSchedule) => {
                onAddSection(cat, wpSub, cabSub, accSub, appSub, ceilSub, includeSchedule)
                setShowAddSection(false)
              }}
              onCancel={() => setShowAddSection(false)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-background px-4 py-2.5">
              <button
                onClick={() => setShowAddSection(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Section
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

