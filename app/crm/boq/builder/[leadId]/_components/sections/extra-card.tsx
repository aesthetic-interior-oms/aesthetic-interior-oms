'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Package, Sparkles } from 'lucide-react'
import type { RequisitionItemInput } from '@/lib/boq-service'
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
import { SectionBlock } from './section-block'
import { AddSectionForm } from './add-section-modal'

export function ExtraCard({
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
  const [expanded, setExpanded] = useState(true)
  const [showAddSection, setShowAddSection] = useState(false)
  const totalRows = sections.reduce((sum, s) => sum + getRowsForSection(s.id).length, 0)

  return (
    <div className="border border-amber-500/30 rounded-xl overflow-hidden bg-card shadow-xs transition-shadow hover:shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left border-b border-amber-500/20"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="text-amber-600 dark:text-amber-400 p-0.5 rounded flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-bold text-foreground">Extra & General Materials</span>
            <span className="text-xs text-muted-foreground">(Unlinked site supplies, hardware, & sundries)</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/25">
            {sections.length} {sections.length === 1 ? 'section' : 'sections'} · {totalRows} {totalRows === 1 ? 'row' : 'rows'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 bg-muted/10 p-3">
          {sections.length === 0 && !showAddSection && (
            <div className="rounded-xl border border-dashed border-border/80 bg-background px-4 py-8 text-center text-xs text-muted-foreground space-y-2">
              <Package className="w-6 h-6 mx-auto text-muted-foreground/40" />
              <p className="font-semibold text-foreground/80">No general sections added yet.</p>
              <p className="text-[11px] text-muted-foreground">Add a Ceiling, Electrical Work, Wall Paneling, Closet/Cabinet, Accessories, or Appliance section below to specify materials.</p>
            </div>
          )}

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

          {showAddSection ? (
            <AddSectionForm
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
