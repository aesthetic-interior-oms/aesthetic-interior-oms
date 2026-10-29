'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Trash2, Sparkles } from 'lucide-react'
import type { RequisitionItemInput } from '@/lib/boq-service'
import type {
  WallPanelingSubType,
  CabinetSubType,
  AccessoriesSubType,
  ApplianceSubType,
  CeilingSubType,
  RequisitionFieldValue,
  BoardVariantAttributes,
  BoqSavedAccessoryItem,
  CardSection,
} from '../types/boq-builder-types'
import {
  WORK_CATEGORIES,
  WALL_PANELING_SUBTYPES,
  CABINET_SUBTYPES,
  ACCESSORIES_SUBTYPES,
  APPLIANCE_SUBTYPES,
  CEILING_SUBTYPES,
  HARDWARE_COLORS,
  CATEGORY_COLORS,
} from '../constants/boq-builder-constants'
import { getViewModeForSection } from '../helpers/boq-pdf-builder'
import { MaterialRowsTable } from './material-rows-table'

export function SectionBlock({
  section,
  rows,
  onChange,
  onUpdateVariant,
  onAddRow,
  onRemoveRow,
  onLoadPreset,
  onLoadCabinetPreset,
  onLoadAccessoryPreset,
  onLoadAppliancePreset,
  onLoadCeilingPreset,
  onToggleCollapse,
  onRemove,
  boqSavedAccessories,
  onSelectSavedAccessory,
  onSaveNewSavedAccessory,
  onPasteItem,
}: {
  section: CardSection
  rows: RequisitionItemInput[]
  onChange: (ri: number, field: keyof RequisitionItemInput, value: RequisitionFieldValue) => void
  onUpdateVariant: (ri: number, field: keyof BoardVariantAttributes, value: string) => void
  onAddRow: () => void
  onRemoveRow: (ri: number) => void
  onLoadPreset: (subType: WallPanelingSubType) => void
  onLoadCabinetPreset?: (subType: CabinetSubType) => void
  onLoadAccessoryPreset?: (subType: AccessoriesSubType) => void
  onLoadAppliancePreset?: (subType: ApplianceSubType) => void
  onLoadCeilingPreset?: (subType: CeilingSubType) => void
  onToggleCollapse: () => void
  onRemove: () => void
  boqSavedAccessories?: BoqSavedAccessoryItem[]
  onSelectSavedAccessory?: (ri: number, item: BoqSavedAccessoryItem) => void
  onSaveNewSavedAccessory?: (name: string, category?: string, itemCode?: string) => Promise<void> | void
  onPasteItem?: (item: RequisitionItemInput) => void
}) {
  const viewMode = getViewModeForSection(section)
  const isHardwareSection = section.wallPanelingSubType === 'SCREWS_FASTENERS' || section.wallPanelingSubType === 'NAILS_PINS' || section.wallPanelingSubType === 'ADHESIVES'
  const catLabel = isHardwareSection
    ? 'Hardware'
    : (WORK_CATEGORIES.find((c) => c.key === section.category)?.label ?? section.category)
  const subTypeInfo = section.wallPanelingSubType
    ? WALL_PANELING_SUBTYPES.find((s) => s.key === section.wallPanelingSubType)
    : section.cabinetSubType
    ? CABINET_SUBTYPES.find((s) => s.key === section.cabinetSubType)
    : section.accessoriesSubType
    ? ACCESSORIES_SUBTYPES.find((s) => s.key === section.accessoriesSubType)
    : section.applianceSubType
    ? APPLIANCE_SUBTYPES.find((s) => s.key === section.applianceSubType)
    : section.ceilingSubType
    ? CEILING_SUBTYPES.find((s) => s.key === section.ceilingSubType)
    : (section.category === 'CEILING' ? CEILING_SUBTYPES[0] : section.category === 'ELECTRICAL_WORK' ? CEILING_SUBTYPES[1] : null)
  const colors = isHardwareSection ? HARDWARE_COLORS : CATEGORY_COLORS[section.category]
  const importedRows = rows.filter((item) => item.variantAttributes?.sourceScheduleKey)
  const pendingImportedRows = importedRows.filter((item) => item.variantAttributes?.sourceQuantityStatus === 'NEEDS_CONFIRMATION')
  const importedGroups = Array.from(new Set(importedRows.map((item) => String(item.variantAttributes?.sourceQuantityGroup || '')).filter(Boolean)))

  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const json = e.dataTransfer.getData('application/boq-item') || e.dataTransfer.getData('text/plain')
    if (!json || !onPasteItem) return
    try {
      const item = JSON.parse(json) as RequisitionItemInput
      if (item) onPasteItem(item)
    } catch {
      // ignore
    }
  }

  return (
    <div
      id={`section-dom-${section.id}`}
      data-boq-section-id={section.id}
      onDragOver={(e) => {
        if (onPasteItem) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
          if (!isDragOver) setIsDragOver(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false)
        }
      }}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 bg-card shadow-xs transition-all ${
        isDragOver
          ? 'border-dashed border-primary ring-4 ring-primary/25 scale-[1.002]'
          : `${colors.border} ${colors.leftBorder}`
      }`}
    >
      {/* Centered Section Header */}
      <div className={`px-4 py-3.5 ${colors.bg} border-b ${colors.border}`}>
        <div className="flex items-center justify-between gap-3">
          {/* Left: Collapse / Expand */}
          <button
            onClick={onToggleCollapse}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-background/60 transition-colors"
            title={section.collapsed ? 'Expand section' : 'Collapse section'}
          >
            {section.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="text-[11px] font-bold uppercase tracking-wider">{section.collapsed ? 'Expand' : 'Collapse'}</span>
          </button>

          {/* Center: Prominent Level 2 Header */}
          <div className="flex-1 text-center flex flex-col items-center justify-center min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-background/90 border border-border/70 shadow-2xs mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Requisition Section</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h3 className={`text-base font-black tracking-tight ${colors.text}`}>{catLabel}</h3>
              {subTypeInfo && (
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${colors.pill}`}>
                  {subTypeInfo.label}
                </span>
              )}
            </div>
          </div>

          {/* Right: Row count & Remove */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground bg-background/90 px-2.5 py-1 rounded-full border border-border/70 shadow-2xs">
              {rows.length} {rows.length === 1 ? 'row' : 'rows'}
            </span>
            <button
              onClick={onRemove}
              className="text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors"
              title="Remove this section"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Section body */}
      {!section.collapsed && (
        <div className="bg-background/70 p-3">
          {isDragOver && (
            <div className="mb-3 rounded-xl border-2 border-dashed border-primary bg-primary/10 p-3 text-center text-xs font-bold text-primary animate-pulse flex items-center justify-center gap-2 shadow-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Release to paste material into {catLabel} section</span>
            </div>
          )}
          {importedRows.length > 0 && (
            <p className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
              Imported schedule rows: {importedRows.length}. {pendingImportedRows.length} quantities still need confirmation. Open cells are intentionally blank; complete them before submitting.
              {importedGroups.map((group) => {
                const groupRows = importedRows.filter((item) => item.variantAttributes?.sourceQuantityGroup === group)
                const total = Number(groupRows[0]?.variantAttributes?.sourceQuantityGroupTotal || 0)
                const entered = groupRows.reduce((sum, item) => sum + Number(item.netQuantity || 0), 0)
                const label = group === 'spot-light-allocation' ? 'Panel + spot light allocation' : group === 'power-supply-allocation' ? 'Power supply allocation' : group
                return <span key={group} className="mt-1 block">{label}: {entered} / {total} pcs{groupRows.every((item) => item.variantAttributes?.sourceQuantityStatus !== 'NEEDS_CONFIRMATION') && Math.abs(entered - total) > 0.001 ? ' — total must match' : ''}</span>
              })}
            </p>
          )}
          <MaterialRowsTable
            rows={rows}
            viewMode={viewMode}
            onChange={onChange}
            onUpdateVariant={onUpdateVariant}
            onAddRow={onAddRow}
            onRemoveRow={onRemoveRow}
            onLoadPreset={section.wallPanelingSubType === 'CORE_BOARDS' ? () => onLoadPreset('CORE_BOARDS') : undefined}
            onLoadLouverPreset={section.wallPanelingSubType === 'LOUVERS_PROFILES' ? () => onLoadPreset('LOUVERS_PROFILES') : undefined}
            onLoadScrewPreset={section.wallPanelingSubType === 'SCREWS_FASTENERS' ? () => onLoadPreset('SCREWS_FASTENERS') : undefined}
            onLoadNailPreset={section.wallPanelingSubType === 'NAILS_PINS' ? () => onLoadPreset('NAILS_PINS') : undefined}
            onLoadAdhesivePreset={section.wallPanelingSubType === 'ADHESIVES' ? () => onLoadPreset('ADHESIVES') : undefined}
            onLoadCabinetCorePreset={section.category === 'CABINETS_CLOSETS' && onLoadCabinetPreset ? () => onLoadCabinetPreset('CORE_BOARD_SPEC') : undefined}
            onLoadCabinetHplPreset={section.category === 'CABINETS_CLOSETS' && onLoadCabinetPreset ? () => onLoadCabinetPreset('HPL_PASTING') : undefined}
            onLoadAccessoryHardwarePreset={section.accessoriesSubType === 'HARDWARE_ACCESSORIES' && onLoadAccessoryPreset ? () => onLoadAccessoryPreset('HARDWARE_ACCESSORIES') : undefined}
            onLoadAccessoryServicesPreset={section.accessoriesSubType === 'SERVICES_DELIVERABLES' && onLoadAccessoryPreset ? () => onLoadAccessoryPreset('SERVICES_DELIVERABLES') : undefined}
            onLoadAppliancePreset={section.applianceSubType === 'CORE_APPLIANCES' && onLoadAppliancePreset ? () => onLoadAppliancePreset('CORE_APPLIANCES') : undefined}
            onLoadCeilingLightingPreset={viewMode === 'CEILING_LIGHTING_SPEC' && onLoadCeilingPreset ? () => onLoadCeilingPreset('CEILING_LIGHTING') : undefined}
            onLoadCeilingElectricalPreset={viewMode === 'CEILING_ELECTRICAL_SPEC' && onLoadCeilingPreset ? () => onLoadCeilingPreset('ELECTRICAL_DEVICES') : undefined}
            boqSavedAccessories={boqSavedAccessories}
            onSelectSavedAccessory={onSelectSavedAccessory}
            onSaveNewSavedAccessory={onSaveNewSavedAccessory}
          />
        </div>
      )}
    </div>
  )
}


