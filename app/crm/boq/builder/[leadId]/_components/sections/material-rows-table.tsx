'use client'

import { useMemo } from 'react'
import {
  Package,
  Download,
  Sparkles,
  Wrench,
  Pin,
  FlaskConical,
  Layers,
  Lightbulb,
  Zap,
  Trash2,
  Plus,
} from 'lucide-react'
import type { RequisitionItemInput } from '@/lib/boq-service'
import { DEFAULT_CABINET_CATALOG, getCabinetThicknessOptions } from '@/lib/boq-cabinet-catalog'
import type {
  ViewModeType,
  RequisitionFieldValue,
  BoardVariantAttributes,
  BoqSavedAccessoryItem,
} from '../types/boq-builder-types'
import {
  DEFAULT_ACCESSORY_CATEGORIES,
  DEFAULT_SAVED_ACCESSORIES,
  DEFAULT_APPLIANCE_CATEGORIES,
  DEFAULT_SAVED_APPLIANCES,
  UOM_OPTIONS,
  BOARD_BASE_MATERIAL_GROUPS,
  BOARD_BASE_MATERIALS,
  BOARD_LAMINATE_CATALOG,
  WORK_CATEGORIES,
} from '../constants/boq-builder-constants'
import {
  CEILING_LIGHTING_CATALOG,
  CEILING_ELECTRICAL_CATALOG,
} from '../constants/boq-lighting-electrical-catalogs'
import {
  GRID_CELL_INPUT,
  GRID_CELL_BOLD,
  GRID_CELL_MONO,
  GRID_CELL_NUM,
  GRID_CELL_SELECT,
  GRID_TH,
  GRID_TD,
} from '../constants/boq-grid-styles'
import {
  DECORATIVE_PANEL_GROUPS,
  isReadymadePanel,
  isCustomizePanel,
} from '../helpers/boq-panel-classification'
import { EdgingTapeInput } from '../inputs/edging-tape-input'
import { CabinetCombobox } from '../inputs/cabinet-combobox'
import { LaminateFinishPicker } from '../inputs/laminate-finish-picker'
import { AccessoryItemCombobox } from '../inputs/accessory-item-combobox'
import { ApplianceItemCombobox } from '../inputs/appliance-item-combobox'

export function MaterialRowsTable({
  rows,
  viewMode,
  onChange,
  onUpdateVariant,
  onAddRow,
  onRemoveRow,
  onLoadPreset,
  onLoadLouverPreset,
  onLoadScrewPreset,
  onLoadNailPreset,
  onLoadAdhesivePreset,
  onLoadCabinetCorePreset,
  onLoadCabinetHplPreset,
  onLoadAccessoryHardwarePreset,
  onLoadAccessoryServicesPreset,
  onLoadAppliancePreset,
  onLoadCeilingLightingPreset,
  onLoadCeilingElectricalPreset,
  boqSavedAccessories,
  onSelectSavedAccessory,
  onSaveNewSavedAccessory,
}: {
  rows: RequisitionItemInput[]
  viewMode: ViewModeType
  onChange: (rowIndex: number, field: keyof RequisitionItemInput, value: RequisitionFieldValue) => void
  onUpdateVariant: (rowIndex: number, field: keyof BoardVariantAttributes, value: string) => void
  onAddRow: () => void
  onRemoveRow: (rowIndex: number) => void
  onLoadPreset?: () => void
  onLoadLouverPreset?: () => void
  onLoadScrewPreset?: () => void
  onLoadNailPreset?: () => void
  onLoadAdhesivePreset?: () => void
  onLoadCabinetCorePreset?: () => void
  onLoadCabinetHplPreset?: () => void
  onLoadAccessoryHardwarePreset?: () => void
  onLoadAccessoryServicesPreset?: () => void
  onLoadAppliancePreset?: () => void
  onLoadCeilingLightingPreset?: () => void
  onLoadCeilingElectricalPreset?: () => void
  boqSavedAccessories?: BoqSavedAccessoryItem[]
  onSelectSavedAccessory?: (rowIndex: number, item: BoqSavedAccessoryItem) => void
  onSaveNewSavedAccessory?: (name: string, category?: string, itemCode?: string) => Promise<void> | void
}) {
  const accessoryCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_ACCESSORY_CATEGORIES)
    if (boqSavedAccessories) {
      for (const item of boqSavedAccessories) {
        if (item.category?.trim()) set.add(item.category.trim())
      }
    }
    return Array.from(set)
  }, [boqSavedAccessories])
  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background shadow-2xs">
      {rows.length === 0 ? (
        <div className="space-y-3 bg-background px-4 py-8 text-center text-xs text-muted-foreground">
          <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground/70">
            <Package className="w-6 h-6 text-muted-foreground/40" />
            <span className="font-semibold text-foreground/80">No material specifications added yet</span>
            <span className="text-[11px] text-muted-foreground">Select a pre-configured catalog below or click Add Material Row</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {onLoadPreset && (
              <button
                onClick={onLoadPreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Load Core Boards (BRD-001 - BRD-008)
              </button>
            )}
            {onLoadLouverPreset && (
              <button
                onClick={onLoadLouverPreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 rounded-md transition-colors border border-indigo-500/20"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Load Louvers & Profiles (LVR-001 - EDG-002)
              </button>
            )}
            {onLoadScrewPreset && (
              <button
                onClick={onLoadScrewPreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 rounded-md transition-colors border border-amber-500/20"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600" /> Load Screws & Fasteners (SCR-075 - SCR-250)
              </button>
            )}
            {onLoadNailPreset && (
              <button
                onClick={onLoadNailPreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/10 text-rose-800 dark:text-rose-300 hover:bg-rose-500/20 rounded-md transition-colors border border-rose-500/20"
              >
                <Pin className="w-3.5 h-3.5 text-rose-600" /> Load Nails & Pins (NAL-200 - PIN-002)
              </button>
            )}
            {onLoadAdhesivePreset && (
              <button
                onClick={onLoadAdhesivePreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 rounded-md transition-colors border border-emerald-500/20"
              >
                <FlaskConical className="w-3.5 h-3.5 text-emerald-600" /> Load Adhesives (ADH-001 - ADH-005)
              </button>
            )}
            {onLoadCabinetCorePreset && (
              <button
                onClick={onLoadCabinetCorePreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 rounded-md transition-colors border border-amber-500/20"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" /> Load Core Board Spec (Sr. 1 - 5.1)
              </button>
            )}
            {onLoadCabinetHplPreset && (
              <button
                onClick={onLoadCabinetHplPreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-500/10 text-cyan-900 dark:text-cyan-200 hover:bg-cyan-500/20 rounded-md transition-colors border border-cyan-500/20"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-600" /> Load HPL Pasting Details (HPL-1 - HPL-8)
              </button>
            )}
            {onLoadAccessoryHardwarePreset && (
              <button
                onClick={onLoadAccessoryHardwarePreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-pink-500/10 text-pink-900 dark:text-pink-200 hover:bg-pink-500/20 rounded-md transition-colors border border-pink-500/20"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-600" /> Load Hardware Accessories (SL 01 - 07)
              </button>
            )}
            {onLoadAccessoryServicesPreset && (
              <button
                onClick={onLoadAccessoryServicesPreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-500/10 text-purple-900 dark:text-purple-200 hover:bg-purple-500/20 rounded-md transition-colors border border-purple-500/20"
              >
                <Layers className="w-3.5 h-3.5 text-purple-600" /> Load Deliverables & Services (SL 08 - 10)
              </button>
            )}
            {onLoadAppliancePreset && (
              <button
                onClick={onLoadAppliancePreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-500/10 text-teal-900 dark:text-teal-200 hover:bg-teal-500/20 rounded-md transition-colors border border-teal-500/20"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Load Core Appliances (SL 01 - 07)
              </button>
            )}
            {onLoadCeilingLightingPreset && (
              <button
                onClick={onLoadCeilingLightingPreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-500/10 text-purple-900 dark:text-purple-200 hover:bg-purple-500/20 rounded-md transition-colors border border-purple-500/20"
              >
                <Lightbulb className="w-3.5 h-3.5 text-purple-600" /> Load Ceiling Lighting Schedule (17 Items)
              </button>
            )}
            {onLoadCeilingElectricalPreset && (
              <button
                onClick={onLoadCeilingElectricalPreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-yellow-500/10 text-yellow-900 dark:text-yellow-200 hover:bg-yellow-500/20 rounded-md transition-colors border border-yellow-500/20"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-600" /> Load Drivers, Switches & Sockets (20 Items)
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-slate-50 px-3.5 py-2.5 dark:bg-slate-950/30">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-border/70">
                <Package className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Level 3</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Material rows</p>
              </div>
            </div>
            <span className="rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {rows.length} {rows.length === 1 ? 'row' : 'rows'}
            </span>
          </div>
          {viewMode === 'BOARD_SPEC' ? (
            /* ── 1. Core Structural Boards & Plywood Table (10 Cols) ── */
            <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px] border-collapse divide-y divide-border/60">
            <thead className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-14 text-center`}>SL NO</th>
                <th className={`${GRID_TH} min-w-[140px]`}>Base Material</th>
                <th className={`${GRID_TH} w-28`}>Thickness</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Front / Top Laminate</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Back / Bottom Laminate</th>
                <th className={`${GRID_TH} w-20`}>Unit</th>
                <th className={`${GRID_TH} text-center w-24`}>Quantity</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Edging Tape Qty</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Functional Usage</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. SL NO */}
                    <td className={`${GRID_TD} text-center font-mono text-xs text-muted-foreground`}>
                      {String(ri + 1).padStart(2, '0')}
                    </td>

                    {/* 2. Base Material — dropdown */}
                    <td className={GRID_TD}>
                      <CabinetCombobox
                        value={attrs.baseMaterial || ''}
                        onChange={(val) => onUpdateVariant(ri, 'baseMaterial', val)}
                        groups={BOARD_BASE_MATERIAL_GROUPS}
                        options={BOARD_BASE_MATERIALS}
                        placeholder="Select base material..."
                      />
                    </td>

                    {/* 3. Thickness (Dropdown + Manual) */}
                    <td className={GRID_TD}>
                      <CabinetCombobox
                        value={attrs.coreThickness || ''}
                        onChange={(val) => onUpdateVariant(ri, 'coreThickness', val)}
                        options={['6mm', '9mm', '12mm', '15mm', '18mm', '25mm']}
                        placeholder="12mm"
                      />
                    </td>

                    {/* 4. Front / Top Laminate — Prelaminated / HPL / Duco picker (Defaults to Raw Board) */}
                    <td className={GRID_TD}>
                      <LaminateFinishPicker
                        value={attrs.laminateTopSurface || ''}
                        finishType={attrs.boardLaminateType || 'PRELAMINATED'}
                        hplBrands={BOARD_LAMINATE_CATALOG.hplBrands}
                        onChange={(val, fType) => {
                          onUpdateVariant(ri, 'laminateTopSurface', val)
                          onUpdateVariant(ri, 'boardLaminateType', fType)
                        }}
                        placeholder="Raw Board (None)"
                      />
                    </td>

                    {/* 5. Back / Bottom Laminate (Defaults to Raw Board) */}
                    <td className={GRID_TD}>
                      <LaminateFinishPicker
                        value={attrs.surfaceCodeFinish || ''}
                        finishType={attrs.boardBackLaminateType || 'PRELAMINATED'}
                        hplBrands={BOARD_LAMINATE_CATALOG.hplBrands}
                        onChange={(val, fType) => {
                          onUpdateVariant(ri, 'surfaceCodeFinish', val)
                          onUpdateVariant(ri, 'boardBackLaminateType', fType)
                        }}
                        isBack={true}
                        placeholder="Raw Board (None)"
                      />
                    </td>

                    {/* 6. Unit */}
                    <td className={GRID_TD}>
                      <select
                        value={item.unit}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className={GRID_CELL_SELECT}
                      >
                        {UOM_OPTIONS.map((uom) => (
                          <option key={uom} value={uom}>
                            {uom}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 7. Quantity */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.qtyLabel !== undefined ? attrs.qtyLabel : item.netQuantity}
                        onChange={(e) => {
                          const val = e.target.value
                          onUpdateVariant(ri, 'qtyLabel', val)
                          const num = parseFloat(val)
                          if (!isNaN(num)) {
                            onChange(ri, 'netQuantity', num)
                          }
                        }}
                        placeholder="1 or Catalog"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* 8. Edging Tape Qty (Number + Unit: Roll / RFT) */}
                    <td className={GRID_TD}>
                      <EdgingTapeInput
                        value={attrs.edgingTapeQty || ''}
                        onChange={(val) => onUpdateVariant(ri, 'edgingTapeQty', val)}
                        defaultUnit="RFT"
                      />
                    </td>

                    {/* 10. Functional Usage */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="functional-usage-list"
                        value={attrs.functionalUsage || item.productionPhase || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'functionalUsage', e.target.value)
                          onChange(ri, 'productionPhase', e.target.value)
                        }}
                        placeholder="Shutter / Exterior Cabinet"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-0 w-8 text-center align-middle">
                      <button
                        onClick={() => onRemoveRow(ri)}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Remove board row"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
            </div>
          ) : viewMode === 'LOUVER_SPEC' ? (
        /* ── 2. Decorative Panels, Louvers & Edge Profiles Table (10 Cols) ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px] border-collapse divide-y divide-border/60">
            <thead className="bg-indigo-500/10 border-b border-indigo-500/20 text-indigo-900 dark:text-indigo-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-14 text-center`}>SL NO</th>
                <th className={`${GRID_TH} min-w-[170px]`}>Panel / Profile</th>
                <th className={`${GRID_TH} w-24 text-center`}>Type</th>
                <th className={`${GRID_TH} w-28`}>Thickness</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Accent / Finish</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Code / Variant</th>
                <th className={`${GRID_TH} w-20`}>Unit</th>
                <th className={`${GRID_TH} text-center w-24`}>Quantity</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Primary Usage</th>
                <th className={`${GRID_TH} w-28`}>Notes / Col 1</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                const panelVal = attrs.material || item.materialName || ''
                const isReady = isReadymadePanel(panelVal) || attrs.decorativeType === 'READYMADE'
                const isCustom = isCustomizePanel(panelVal) || attrs.decorativeType === 'CUSTOMIZE'
                const currentType: 'READYMADE' | 'CUSTOMIZE' | null = isReady ? 'READYMADE' : isCustom ? 'CUSTOMIZE' : null

                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. SL NO */}
                    <td className={`${GRID_TD} text-center font-mono text-xs text-muted-foreground`}>
                      {String(ri + 1).padStart(2, '0')}
                    </td>

                    {/* 2. Panel / Profile Type (Combobox with Readymade & Customize groups) */}
                    <td className={GRID_TD}>
                      <CabinetCombobox
                        value={panelVal}
                        onChange={(val) => {
                          onUpdateVariant(ri, 'material', val)
                          onChange(ri, 'materialName', val)
                          if (isReadymadePanel(val)) {
                            onUpdateVariant(ri, 'decorativeType', 'READYMADE')
                          } else if (isCustomizePanel(val)) {
                            onUpdateVariant(ri, 'decorativeType', 'CUSTOMIZE')
                          }
                        }}
                        groups={DECORATIVE_PANEL_GROUPS}
                        placeholder="Select panel type..."
                        className={GRID_CELL_BOLD}
                      />
                    </td>

                    {/* 3. Type (Readymade vs Customize badge) */}
                    <td className={`${GRID_TD} text-center px-1`}>
                      {currentType === 'READYMADE' ? (
                        <button
                          type="button"
                          onClick={() => onUpdateVariant(ri, 'decorativeType', 'CUSTOMIZE')}
                          className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
                          title="Readymade panel: code only, others off. Click to toggle."
                        >
                          Readymade
                        </button>
                      ) : currentType === 'CUSTOMIZE' ? (
                        <button
                          type="button"
                          onClick={() => onUpdateVariant(ri, 'decorativeType', 'READYMADE')}
                          className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-800 dark:text-purple-200 border border-purple-500/40 hover:bg-purple-500/30 transition-colors"
                          title="Customized panel: thickness & finish active, code off. Click to toggle."
                        >
                          Customize
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/50 italic">—</span>
                      )}
                    </td>

                    {/* 4. Thickness */}
                    <td className={GRID_TD}>
                      {currentType === 'READYMADE' ? (
                        <div className="text-center text-muted-foreground/40 font-mono text-xs select-none bg-muted/20 py-1.5" title="Thickness not applicable for Readymade panels (Code only)">
                          — (Off)
                        </div>
                      ) : (
                        <CabinetCombobox
                          value={attrs.thickness || attrs.coreThickness || ''}
                          onChange={(val) => {
                            onUpdateVariant(ri, 'thickness', val)
                            onUpdateVariant(ri, 'coreThickness', val)
                          }}
                          options={['3mm', '5mm', '6mm', '8mm', '10mm', '12mm', '18mm', '25mm']}
                          placeholder="e.g. 10mm"
                        />
                      )}
                    </td>

                    {/* 5. Accent / Finish */}
                    <td className={GRID_TD}>
                      {currentType === 'READYMADE' ? (
                        <div className="text-center text-muted-foreground/40 font-mono text-xs select-none bg-muted/20 py-1.5" title="Finish not applicable for Readymade panels (Code only)">
                          — (Off)
                        </div>
                      ) : (
                        <CabinetCombobox
                          value={attrs.accentFinish || ''}
                          onChange={(val) => onUpdateVariant(ri, 'accentFinish', val)}
                          options={[
                            'Rose Gold Accent',
                            'Gold Anodized',
                            'Metallic Rose Gold',
                            'Matte Black',
                            'Silver Brushed',
                            'Bronze Mirror',
                            'Clear Mirror',
                            'Grey Mirror',
                            'Beveled Edge',
                            'Fabric / Velvet',
                            'Textured',
                          ]}
                          placeholder="Rose Gold Accent"
                        />
                      )}
                    </td>

                    {/* 6. Code / Variant */}
                    <td className={GRID_TD}>
                      {currentType === 'CUSTOMIZE' ? (
                        <div className="text-center text-muted-foreground/40 font-mono text-xs select-none bg-muted/20 py-1.5" title="Code not applicable for customized panels (Thickness & Finish only)">
                          — (Off)
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={attrs.codeVariant || ''}
                          onChange={(e) => onUpdateVariant(ri, 'codeVariant', e.target.value)}
                          placeholder="e.g. Advance 14081"
                          className={GRID_CELL_INPUT}
                        />
                      )}
                    </td>

                    {/* 7. Unit */}
                    <td className={GRID_TD}>
                      <select
                        value={item.unit}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className={GRID_CELL_SELECT}
                      >
                        {UOM_OPTIONS.map((uom) => (
                          <option key={uom} value={uom}>
                            {uom}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 8. Quantity */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.qtyLabel !== undefined ? attrs.qtyLabel : item.netQuantity}
                        onChange={(e) => {
                          const val = e.target.value
                          onUpdateVariant(ri, 'qtyLabel', val)
                          const num = parseFloat(val)
                          if (!isNaN(num)) {
                            onChange(ri, 'netQuantity', num)
                          }
                        }}
                        placeholder="27 or Catalog"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* 9. Primary Usage */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="primary-usage-list"
                        value={attrs.primaryUsage || item.productionPhase || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'primaryUsage', e.target.value)
                          onChange(ri, 'productionPhase', e.target.value)
                        }}
                        placeholder="Feature Wall Accent"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 10. Notes / Column 1 */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.column1 || ''}
                        onChange={(e) => onUpdateVariant(ri, 'column1', e.target.value)}
                        placeholder="Remarks / Specs"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-0 w-8 text-center align-middle">
                      <button
                        onClick={() => onRemoveRow(ri)}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'SCREW_SPEC' ? (
        /* ── 3. Screws & Structural Fasteners Table (10 Cols) ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px] border-collapse divide-y divide-border/60">
            <thead className="bg-amber-600/10 border-b border-amber-600/20 text-amber-950 dark:text-amber-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-14 text-center`}>SL NO</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Item Type</th>
                <th className={`${GRID_TH} w-28`}>Length (Inches)</th>
                <th className={`${GRID_TH} w-20`}>Unit</th>
                <th className={`${GRID_TH} text-center w-24`}>Quantity</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Usage Purpose</th>
                <th className={`${GRID_TH} w-28`}>Notes / Col 1</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. SL NO */}
                    <td className={`${GRID_TD} text-center font-mono text-xs text-muted-foreground`}>
                      {String(ri + 1).padStart(2, '0')}
                    </td>

                    {/* 2. Item Type (Default: Screw) */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="fastener-type-list"
                        value={item.materialName || attrs.fastenerType || 'Screw'}
                        onChange={(e) => {
                          const val = e.target.value
                          onChange(ri, 'materialName', val)
                          onUpdateVariant(ri, 'fastenerType', val)
                        }}
                        placeholder="Screw"
                        className={GRID_CELL_BOLD}
                      />
                    </td>

                    {/* 3. Length (Inches) */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="fastener-length-list"
                        value={attrs.lengthInches || ''}
                        onChange={(e) => onUpdateVariant(ri, 'lengthInches', e.target.value)}
                        placeholder='0.75" (3/4")'
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 3. Unit */}
                    <td className={GRID_TD}>
                      <select
                        value={item.unit}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className={GRID_CELL_SELECT}
                      >
                        {UOM_OPTIONS.map((uom) => (
                          <option key={uom} value={uom}>
                            {uom}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 4. Quantity */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.qtyLabel !== undefined ? attrs.qtyLabel : item.netQuantity}
                        onChange={(e) => {
                          const val = e.target.value
                          onUpdateVariant(ri, 'qtyLabel', val)
                          const num = parseFloat(val)
                          if (!isNaN(num)) {
                            onChange(ri, 'netQuantity', num)
                          }
                        }}
                        placeholder="300"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* 5. Usage Purpose */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="usage-purpose-list"
                        value={attrs.usagePurpose || item.productionPhase || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'usagePurpose', e.target.value)
                          onChange(ri, 'productionPhase', e.target.value)
                        }}
                        placeholder="Hinges & Drawer Runners"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 6. Notes / Column 1 */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.column1 || ''}
                        onChange={(e) => onUpdateVariant(ri, 'column1', e.target.value)}
                        placeholder="Remarks / Specs"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-0 w-8 text-center align-middle">
                      <button
                        onClick={() => onRemoveRow(ri)}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'NAIL_SPEC' ? (
        /* ── 4. Nails, Pins & Masonry Anchors Table (10 Cols) ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px] border-collapse divide-y divide-border/60">
            <thead className="bg-rose-500/10 border-b border-rose-500/20 text-rose-900 dark:text-rose-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-14 text-center`}>SL NO</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Item Name</th>
                <th className={`${GRID_TH} w-28`}>Length</th>
                <th className={`${GRID_TH} w-20`}>Unit Type</th>
                <th className={`${GRID_TH} text-center w-24`}>Quantity</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Functional Usage</th>
                <th className={`${GRID_TH} w-28`}>Notes / Col 1</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. SL NO */}
                    <td className={`${GRID_TD} text-center font-mono text-xs text-muted-foreground`}>
                      {String(ri + 1).padStart(2, '0')}
                    </td>

                    {/* 2. Item Name */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={item.materialName}
                        onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                        placeholder="e.g. Wire Nail (Tarkata)"
                        className={GRID_CELL_BOLD}
                      />
                    </td>

                    {/* 3. Length */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.lengthSpec || ''}
                        onChange={(e) => onUpdateVariant(ri, 'lengthSpec', e.target.value)}
                        placeholder='2.0"'
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 6. Unit Type */}
                    <td className={GRID_TD}>
                      <select
                        value={item.unit}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className={GRID_CELL_SELECT}
                      >
                        {UOM_OPTIONS.map((uom) => (
                          <option key={uom} value={uom}>
                            {uom}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 7. Quantity */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.qtyLabel !== undefined ? attrs.qtyLabel : item.netQuantity}
                        onChange={(e) => {
                          const val = e.target.value
                          onUpdateVariant(ri, 'qtyLabel', val)
                          const num = parseFloat(val)
                          if (!isNaN(num)) {
                            onChange(ri, 'netQuantity', num)
                          }
                        }}
                        placeholder="300"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* 8. Functional Usage */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="functional-usage-list"
                        value={attrs.functionalUsage || item.productionPhase || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'functionalUsage', e.target.value)
                          onChange(ri, 'productionPhase', e.target.value)
                        }}
                        placeholder="Frame Tacking"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 9. Notes / Column 1 */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.column1 || ''}
                        onChange={(e) => onUpdateVariant(ri, 'column1', e.target.value)}
                        placeholder="Remarks / Specs"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-0 w-8 text-center align-middle">
                      <button
                        onClick={() => onRemoveRow(ri)}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'ADHESIVE_SPEC' ? (
        /* ── 5. Adhesives & Chemical Solvents Table (10 Cols) ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px] border-collapse divide-y divide-border/60">
            <thead className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-14 text-center`}>SL NO</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Chemical Name</th>
                <th className={`${GRID_TH} w-24`}>Packaging Unit</th>
                <th className={`${GRID_TH} text-center w-24`}>Quantity</th>
                <th className={`${GRID_TH} min-w-[180px]`}>Application Method</th>
                <th className={`${GRID_TH} w-28`}>Notes / Col 1</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. SL NO */}
                    <td className={`${GRID_TD} text-center font-mono text-xs text-muted-foreground`}>
                      {String(ri + 1).padStart(2, '0')}
                    </td>

                    {/* 2. Chemical Name (Material Name) */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={item.materialName}
                        onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                        placeholder="e.g. Lichu Gum"
                        className={GRID_CELL_BOLD}
                      />
                    </td>

                    {/* 3. Packaging Unit */}
                    <td className={GRID_TD}>
                      <select
                        value={item.unit}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className={GRID_CELL_SELECT}
                      >
                        {UOM_OPTIONS.map((uom) => (
                          <option key={uom} value={uom}>
                            {uom}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 5. Quantity */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.qtyLabel !== undefined ? attrs.qtyLabel : item.netQuantity}
                        onChange={(e) => {
                          const val = e.target.value
                          onUpdateVariant(ri, 'qtyLabel', val)
                          const num = parseFloat(val)
                          if (!isNaN(num)) {
                            onChange(ri, 'netQuantity', num)
                          }
                        }}
                        placeholder="15"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* 6. Application Method */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="application-method-list"
                        value={attrs.applicationMethod || item.productionPhase || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'applicationMethod', e.target.value)
                          onChange(ri, 'productionPhase', e.target.value)
                        }}
                        placeholder="Cold Press Wood Joinery"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 7. Notes / Column 1 */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.column1 || ''}
                        onChange={(e) => onUpdateVariant(ri, 'column1', e.target.value)}
                        placeholder="Remarks / Specs"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-0 w-8 text-center align-middle">
                      <button
                        onClick={() => onRemoveRow(ri)}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (viewMode === 'CABINET_CORE_SPEC' || viewMode === 'CABINET_HPL_SPEC') ? (
        /* ── 6. Unified Closet / Cabinet Board Specification Table ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1040px] border-collapse divide-y divide-border/60">
            <thead className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-14 text-center`}>Sr. No</th>
                <th className={`${GRID_TH} w-36`}>Usage</th>
                <th className={`${GRID_TH} w-24`} title="Shutter/Body: 16mm, 18mm | Back Ply: 6mm, 9mm">Thickness</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Base Material / Core</th>
                <th className={`${GRID_TH} min-w-[190px]`}>Front Laminate / Finish</th>
                <th className={`${GRID_TH} min-w-[190px]`}>Back Laminate / Liner</th>
                <th className={`${GRID_TH} text-center w-28`}>Board Qty</th>
                <th className={`${GRID_TH} min-w-[140px]`}>Edging Tape Qty</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                const isFrontHpl = attrs.frontLaminateType === 'HPL' || DEFAULT_CABINET_CATALOG.hplBrands.includes(attrs.frontLaminateCode || '')
                const isBackHpl = attrs.backLaminateType === 'HPL' || DEFAULT_CABINET_CATALOG.hplBrands.includes(attrs.backLaminateCode || '')
                const isHpl = isFrontHpl || isBackHpl || attrs.isHplPasting === true || attrs.isHplPasting === 'true' || attrs.cabinetSubType === 'HPL_PASTING'

                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. Sr. No */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.srNo || attrs.lineNo || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'srNo', e.target.value)
                          onUpdateVariant(ri, 'lineNo', e.target.value)
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder={`${ri + 1}`}
                        className={GRID_CELL_MONO}
                      />
                    </td>

                    {/* 2. Usage (Dropdown with Shutter, Body, Back Ply) */}
                    <td className={GRID_TD}>
                      <CabinetCombobox
                        value={attrs.usage || attrs.functionalUsage || item.productionPhase || ''}
                        onChange={(val) => {
                          onUpdateVariant(ri, 'usage', val)
                          onUpdateVariant(ri, 'functionalUsage', val)
                          onChange(ri, 'productionPhase', val)

                          // Auto-sync thickness when usage changes:
                          // Back ply => only 6mm or 9mm (default 6mm if invalid)
                          // Shutter / Body => 16mm or 18mm (default 18mm if invalid)
                          const norm = val.trim().toLowerCase()
                          const currentThk = attrs.coreThickness || ''
                          if (norm.includes('back')) {
                            if (currentThk !== '6mm' && currentThk !== '9mm') {
                              onUpdateVariant(ri, 'coreThickness', '6mm')
                            }
                          } else if (
                            norm.includes('shutter') ||
                            norm.includes('body') ||
                            norm.includes('top') ||
                            norm.includes('bottom') ||
                            norm.includes('carcass')
                          ) {
                            if (currentThk !== '16mm' && currentThk !== '18mm') {
                              onUpdateVariant(ri, 'coreThickness', '18mm')
                            }
                          }
                        }}
                        options={DEFAULT_CABINET_CATALOG.usageOptions}
                        placeholder="Shutter / Body / Back Ply"
                      />
                    </td>

                    {/* 3. Core Thickness (Usage-specific: 16mm/18mm for Shutter & Body, 6mm/9mm for Back Ply) */}
                    <td className={GRID_TD}>
                      <CabinetCombobox
                        value={attrs.coreThickness || ''}
                        onChange={(val) => onUpdateVariant(ri, 'coreThickness', val)}
                        onBlur={() => {
                          const currentUsage = (attrs.usage || attrs.functionalUsage || item.productionPhase || '').toLowerCase()
                          const thk = (attrs.coreThickness || '').trim()
                          if (!thk) return
                          if (currentUsage.includes('back')) {
                            // Back ply: only 6mm or 9mm
                            if (thk !== '6mm' && thk !== '9mm') {
                              if (thk === '6') onUpdateVariant(ri, 'coreThickness', '6mm')
                              else if (thk === '9') onUpdateVariant(ri, 'coreThickness', '9mm')
                              else {
                                const num = parseFloat(thk)
                                onUpdateVariant(ri, 'coreThickness', num >= 8 ? '9mm' : '6mm')
                              }
                            }
                          } else if (
                            currentUsage.includes('shutter') ||
                            currentUsage.includes('body') ||
                            currentUsage.includes('top') ||
                            currentUsage.includes('bottom') ||
                            currentUsage.includes('carcass')
                          ) {
                            // Shutter / Body: 16mm or 18mm
                            if (thk !== '16mm' && thk !== '18mm') {
                              if (thk === '16') onUpdateVariant(ri, 'coreThickness', '16mm')
                              else if (thk === '18') onUpdateVariant(ri, 'coreThickness', '18mm')
                              else {
                                const num = parseFloat(thk)
                                onUpdateVariant(ri, 'coreThickness', num <= 16 ? '16mm' : '18mm')
                              }
                            }
                          }
                        }}
                        options={getCabinetThicknessOptions(attrs.usage || attrs.functionalUsage || item.productionPhase)}
                        placeholder={
                          (attrs.usage || attrs.functionalUsage || item.productionPhase || '').toLowerCase().includes('back')
                            ? '6mm'
                            : '18mm'
                        }
                      />
                    </td>

                    {/* 4. Base Material / Core (Dropdown + Manual) */}
                    <td className={GRID_TD}>
                      <CabinetCombobox
                        value={attrs.baseMaterial || attrs.coreSubstrateType || item.materialName || ''}
                        onChange={(val) => {
                          onUpdateVariant(ri, 'baseMaterial', val)
                          onUpdateVariant(ri, 'coreSubstrateType', val)
                          onChange(ri, 'materialName', isHpl ? `${val} HPL Pasting` : val)
                        }}
                        groups={BOARD_BASE_MATERIAL_GROUPS}
                        options={BOARD_BASE_MATERIALS}
                        placeholder="Select base material..."
                        className={GRID_CELL_BOLD}
                      />
                    </td>

                    {/* 5. Front Laminate / Finish */}
                    <td className={GRID_TD}>
                      <LaminateFinishPicker
                        value={attrs.frontLaminateCode || attrs.laminateFinishDetails || ''}
                        finishType={attrs.frontLaminateType || (isFrontHpl ? 'HPL' : 'PRELAMINATED')}
                        onChange={(val, fType) => {
                          onUpdateVariant(ri, 'frontLaminateCode', val)
                          onUpdateVariant(ri, 'frontLaminateType', fType)
                          onUpdateVariant(ri, 'laminateFinishDetails', val)
                          const frontHpl = fType === 'HPL' || DEFAULT_CABINET_CATALOG.hplBrands.includes(val)
                          const rowHpl = frontHpl || isBackHpl
                          onUpdateVariant(ri, 'isHplPasting', rowHpl ? 'true' : 'false')
                          const baseMat = (attrs.baseMaterial || attrs.coreSubstrateType || item.materialName || 'Board').replace(/\s+HPL\s+Pasting$/i, '')
                          onChange(ri, 'materialName', rowHpl ? `${baseMat} HPL Pasting` : baseMat)
                        }}
                        placeholder="Select front finish..."
                      />
                    </td>

                    {/* 6. Back Laminate / Liner */}
                    <td className={GRID_TD}>
                      <LaminateFinishPicker
                        value={attrs.backLaminateCode || ''}
                        finishType={attrs.backLaminateType || (isBackHpl ? 'HPL' : 'PRELAMINATED')}
                        onChange={(val, fType) => {
                          onUpdateVariant(ri, 'backLaminateCode', val)
                          onUpdateVariant(ri, 'backLaminateType', fType)
                          const backHpl = fType === 'HPL' || DEFAULT_CABINET_CATALOG.hplBrands.includes(val)
                          const rowHpl = isFrontHpl || backHpl
                          onUpdateVariant(ri, 'isHplPasting', rowHpl ? 'true' : 'false')
                          const baseMat = (attrs.baseMaterial || attrs.coreSubstrateType || item.materialName || 'Board').replace(/\s+HPL\s+Pasting$/i, '')
                          onChange(ri, 'materialName', rowHpl ? `${baseMat} HPL Pasting` : baseMat)
                        }}
                        isBack={true}
                        placeholder="Select back finish..."
                      />
                    </td>

                    {/* 7. Board Qty */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.qtyLabel !== undefined ? attrs.qtyLabel : item.netQuantity}
                        onChange={(e) => {
                          const val = e.target.value
                          onUpdateVariant(ri, 'qtyLabel', val)
                          const num = parseFloat(val)
                          if (!isNaN(num)) onChange(ri, 'netQuantity', num)
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="1 pcs"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* 8. Edging Tape Qty (Number + Unit: Roll / RFT) */}
                    <td className={GRID_TD}>
                      <EdgingTapeInput
                        value={attrs.edgingTapeQty || ''}
                        onChange={(val) => onUpdateVariant(ri, 'edgingTapeQty', val)}
                        defaultUnit="Roll"
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-0 w-8 text-center align-middle">
                      <button
                        onClick={() => onRemoveRow(ri)}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'HARDWARE_ACCESSORY_SPEC' ? (
        /* ── 9. Kitchen & Closet Hardware Accessories Table (10 Cols) ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px] border-collapse divide-y divide-border/60">
            <thead className="bg-pink-500/10 border-b border-pink-500/20 text-pink-950 dark:text-pink-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-16`}>SL</th>
                <th className={`${GRID_TH} w-32`}>Category</th>
                <th className={`${GRID_TH} min-w-[190px]`}>Item Name</th>
                <th className={`${GRID_TH} min-w-[130px]`}>Item Code</th>
                <th className={`${GRID_TH} min-w-[210px]`}>Dimensions (W × D × H)</th>
                <th className={`${GRID_TH} w-20`}>Unit</th>
                <th className={`${GRID_TH} text-center w-24`}>Quantity</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. SL */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.srNo || ''}
                        onChange={(e) => onUpdateVariant(ri, 'srNo', e.target.value)}
                        placeholder="01"
                        className={GRID_CELL_MONO}
                      />
                    </td>

                    {/* 2. Category Dropdown */}
                    <td className={GRID_TD}>
                      <select
                        value={attrs.accessoryCategory || ''}
                        onChange={(e) => onUpdateVariant(ri, 'accessoryCategory', e.target.value)}
                        className={GRID_CELL_SELECT}
                      >
                        <option value="">Select Category...</option>
                        {accessoryCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        {attrs.accessoryCategory && !accessoryCategories.includes(attrs.accessoryCategory) && (
                          <option value={attrs.accessoryCategory}>{attrs.accessoryCategory}</option>
                        )}
                      </select>
                    </td>

                    {/* 3. Item Name with Saved Library Dropdown */}
                    <td className={GRID_TD}>
                      <AccessoryItemCombobox
                        value={item.materialName}
                        onChange={(val) => onChange(ri, 'materialName', val)}
                        onSelectItem={(saved) => {
                          if (onSelectSavedAccessory) {
                            onSelectSavedAccessory(ri, saved)
                          } else {
                            onChange(ri, 'materialName', saved.name)
                            if (saved.defaultUnit) onChange(ri, 'unit', saved.defaultUnit)
                            onUpdateVariant(ri, 'accessoryCategory', saved.category)
                            onUpdateVariant(ri, 'itemCode', saved.itemCode)
                          }
                        }}
                        savedItems={boqSavedAccessories || DEFAULT_SAVED_ACCESSORIES}
                        onSaveNewItem={onSaveNewSavedAccessory ? (name) => onSaveNewSavedAccessory(name, attrs.accessoryCategory, attrs.itemCode) : undefined}
                        placeholder="Select or type item name..."
                      />
                    </td>

                    {/* 4. Item Code */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.itemCode || ''}
                        onChange={(e) => onUpdateVariant(ri, 'itemCode', e.target.value)}
                        placeholder="KIW-23"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 5. Dimensions (W, D, H - separate rooms, all optional) */}
                    <td className={GRID_TD}>
                      <div className="flex items-center gap-1.5 py-0.5">
                        {/* Width */}
                        <div className="flex items-center bg-background/80 rounded border border-border/60 px-1.5 py-0.5 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500/20 transition-all flex-1 min-w-0" title="Width (optional)">
                          <span className="text-[10px] font-bold text-muted-foreground mr-1 select-none">W</span>
                          <input
                            type="text"
                            value={attrs.dimW || ''}
                            onChange={(e) => onUpdateVariant(ri, 'dimW', e.target.value)}
                            placeholder="—"
                            className="w-full bg-transparent text-xs text-foreground focus:outline-none min-w-0 font-medium"
                          />
                        </div>

                        {/* Depth */}
                        <div className="flex items-center bg-background/80 rounded border border-border/60 px-1.5 py-0.5 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500/20 transition-all flex-1 min-w-0" title="Depth (optional)">
                          <span className="text-[10px] font-bold text-muted-foreground mr-1 select-none">D</span>
                          <input
                            type="text"
                            value={attrs.dimD || ''}
                            onChange={(e) => onUpdateVariant(ri, 'dimD', e.target.value)}
                            placeholder="—"
                            className="w-full bg-transparent text-xs text-foreground focus:outline-none min-w-0 font-medium"
                          />
                        </div>

                        {/* Height */}
                        <div className="flex items-center bg-background/80 rounded border border-border/60 px-1.5 py-0.5 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500/20 transition-all flex-1 min-w-0" title="Height (optional)">
                          <span className="text-[10px] font-bold text-muted-foreground mr-1 select-none">H</span>
                          <input
                            type="text"
                            value={attrs.dimH || ''}
                            onChange={(e) => onUpdateVariant(ri, 'dimH', e.target.value)}
                            placeholder="—"
                            className="w-full bg-transparent text-xs text-foreground focus:outline-none min-w-0 font-medium"
                          />
                        </div>
                      </div>
                    </td>

                    {/* 6. Unit */}
                    <td className={GRID_TD}>
                      <select
                        value={item.unit}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className={GRID_CELL_SELECT}
                      >
                        {UOM_OPTIONS.map((uom) => (
                          <option key={uom} value={uom}>{uom}</option>
                        ))}
                      </select>
                    </td>

                    {/* 7. Quantity */}
                    <td className={GRID_TD}>
                      <input
                        type="number"
                        step="any"
                        value={item.netQuantity}
                        onChange={(e) => onChange(ri, 'netQuantity', e.target.value)}
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-0 w-8 text-center align-middle">
                      <button
                        onClick={() => onRemoveRow(ri)}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'SERVICES_DELIVERABLE_SPEC' ? (
        /* ── 10. Additional Deliverables & Services Table (7 Cols) ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[950px] border-collapse divide-y divide-border/60">
            <thead className="bg-purple-500/10 border-b border-purple-500/20 text-purple-950 dark:text-purple-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-16`}>SL</th>
                <th className={`${GRID_TH} min-w-[180px]`}>Service / Material Category</th>
                <th className={`${GRID_TH} min-w-[280px]`}>Description</th>
                <th className={`${GRID_TH} min-w-[130px]`}>Quantity / Unit</th>
                <th className={`${GRID_TH} min-w-[120px]`}>Rate (BDT)</th>
                <th className={`${GRID_TH} text-center min-w-[140px]`}>Estimated Total (BDT)</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. SL */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.srNo || ''}
                        onChange={(e) => onUpdateVariant(ri, 'srNo', e.target.value)}
                        placeholder="08"
                        className={GRID_CELL_MONO}
                      />
                    </td>

                    {/* 2. Service / Material Category */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="accessory-service-category-list"
                        value={attrs.serviceCategory || item.materialName}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'serviceCategory', e.target.value)
                          onChange(ri, 'materialName', e.target.value)
                        }}
                        placeholder="Fitting & Hardware"
                        className={GRID_CELL_BOLD}
                      />
                    </td>

                    {/* 3. Description */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={item.remarks || item.specifications || ''}
                        onChange={(e) => {
                          onChange(ri, 'remarks', e.target.value)
                          onChange(ri, 'specifications', e.target.value)
                        }}
                        placeholder="Heavy-duty Soft-close Slides, Hinges & Fasteners"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 4. Quantity / Unit */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.quantityUnit || ''}
                        onChange={(e) => onUpdateVariant(ri, 'quantityUnit', e.target.value)}
                        placeholder="1 Lot"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 5. Rate (BDT) */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.rateType || ''}
                        onChange={(e) => onUpdateVariant(ri, 'rateType', e.target.value)}
                        placeholder="Lumpsum"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 6. Estimated Total (BDT) */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.estimatedTotal || ''}
                        onChange={(e) => onUpdateVariant(ri, 'estimatedTotal', e.target.value)}
                        placeholder="৳6,500"
                        className={`${GRID_CELL_BOLD} text-center text-purple-700 dark:text-purple-300`}
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-0 w-8 text-center align-middle">
                      <button
                        onClick={() => onRemoveRow(ri)}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'CORE_APPLIANCE_SPEC' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1250px] border-collapse divide-y divide-border/60">
            <thead className="bg-teal-500/10 border-b border-teal-500/20 text-teal-950 dark:text-teal-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-14`}>SL</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Category</th>
                <th className={`${GRID_TH} min-w-[210px]`}>Item Name</th>
                <th className={`${GRID_TH} min-w-[190px]`}>Brand &amp; Model Code</th>
                <th className={`${GRID_TH} min-w-[200px]`}>Dimensions (W × D × H mm)</th>
                <th className={`${GRID_TH} min-w-[220px]`}>Cabinet Niche / Cut-Out Size</th>
                <th className={`${GRID_TH} w-24 text-center`}>Qty</th>
                <th className={`${GRID_TH} min-w-[130px]`}>Unit Price (BDT)</th>
                <th className={`${GRID_TH} min-w-[140px]`}>Total Amount (BDT)</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. SL */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.srNo || ''}
                        onChange={(e) => onUpdateVariant(ri, 'srNo', e.target.value)}
                        placeholder="1"
                        className={GRID_CELL_MONO}
                      />
                    </td>

                    {/* 2. Category Dropdown */}
                    <td className={GRID_TD}>
                      <select
                        value={attrs.applianceCategory || ''}
                        onChange={(e) => onUpdateVariant(ri, 'applianceCategory', e.target.value)}
                        className={GRID_CELL_SELECT}
                      >
                        <option value="">Select Category...</option>
                        {DEFAULT_APPLIANCE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        {attrs.applianceCategory && !DEFAULT_APPLIANCE_CATEGORIES.includes(attrs.applianceCategory) && (
                          <option value={attrs.applianceCategory}>{attrs.applianceCategory}</option>
                        )}
                      </select>
                    </td>

                    {/* 3. Item Name with Dropdown */}
                    <td className={GRID_TD}>
                      <ApplianceItemCombobox
                        value={item.materialName}
                        onChange={(val) => onChange(ri, 'materialName', val)}
                        onSelectItem={(saved) => {
                          onChange(ri, 'materialName', saved.name)
                          if (saved.defaultUnit) onChange(ri, 'unit', saved.defaultUnit)
                          onUpdateVariant(ri, 'applianceCategory', saved.category)
                          onUpdateVariant(ri, 'brandModelCode', saved.brandModelCode)
                          if (saved.dimW) onUpdateVariant(ri, 'dimW', saved.dimW)
                          if (saved.dimD) onUpdateVariant(ri, 'dimD', saved.dimD)
                          if (saved.dimH) onUpdateVariant(ri, 'dimH', saved.dimH)
                          if (saved.cabinetNicheCutOutSize) onUpdateVariant(ri, 'cabinetNicheCutOutSize', saved.cabinetNicheCutOutSize)
                          if (saved.defaultUnitPrice) {
                            onUpdateVariant(ri, 'unitPrice', saved.defaultUnitPrice)
                            const cleanP = parseFloat(saved.defaultUnitPrice.replace(/[^0-9.]/g, ''))
                            const qty = parseFloat(String(attrs.qtyLabel || item.netQuantity || 1))
                            if (!isNaN(cleanP) && !isNaN(qty)) {
                              onUpdateVariant(ri, 'totalAmount', `৳${Math.round(qty * cleanP).toLocaleString('en-IN')}`)
                            }
                          }
                        }}
                        savedItems={DEFAULT_SAVED_APPLIANCES}
                        placeholder="Select or type appliance..."
                      />
                    </td>

                    {/* 4. Brand & Model Code */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.brandModelCode || ''}
                        onChange={(e) => onUpdateVariant(ri, 'brandModelCode', e.target.value)}
                        placeholder="HAFELE 538.66.759"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 5. Dimensions (W, D, H mm) arranged like accessories */}
                    <td className={GRID_TD}>
                      <div className="flex items-center gap-1.5 py-0.5">
                        <div className="flex items-center bg-background/80 rounded border border-border/60 px-1.5 py-0.5 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/20 transition-all flex-1 min-w-0" title="Width (mm)">
                          <span className="text-[10px] font-bold text-muted-foreground mr-1 select-none">W</span>
                          <input
                            type="text"
                            value={attrs.dimW || ''}
                            onChange={(e) => onUpdateVariant(ri, 'dimW', e.target.value)}
                            placeholder="—"
                            className="w-full bg-transparent text-xs text-foreground focus:outline-none min-w-0 font-medium"
                          />
                        </div>
                        <div className="flex items-center bg-background/80 rounded border border-border/60 px-1.5 py-0.5 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/20 transition-all flex-1 min-w-0" title="Depth (mm)">
                          <span className="text-[10px] font-bold text-muted-foreground mr-1 select-none">D</span>
                          <input
                            type="text"
                            value={attrs.dimD || ''}
                            onChange={(e) => onUpdateVariant(ri, 'dimD', e.target.value)}
                            placeholder="—"
                            className="w-full bg-transparent text-xs text-foreground focus:outline-none min-w-0 font-medium"
                          />
                        </div>
                        <div className="flex items-center bg-background/80 rounded border border-border/60 px-1.5 py-0.5 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/20 transition-all flex-1 min-w-0" title="Height (mm)">
                          <span className="text-[10px] font-bold text-muted-foreground mr-1 select-none">H</span>
                          <input
                            type="text"
                            value={attrs.dimH || ''}
                            onChange={(e) => onUpdateVariant(ri, 'dimH', e.target.value)}
                            placeholder="—"
                            className="w-full bg-transparent text-xs text-foreground focus:outline-none min-w-0 font-medium"
                          />
                        </div>
                      </div>
                    </td>

                    {/* 6. Cabinet Niche / Cut-Out Size (manage based on data) */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.cabinetNicheCutOutSize || ''}
                        onChange={(e) => onUpdateVariant(ri, 'cabinetNicheCutOutSize', e.target.value)}
                        placeholder="W840 × D480 mm (Counter Cut)"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 7. Qty */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.qtyLabel !== undefined ? attrs.qtyLabel : `${item.netQuantity} ${item.unit || 'Nos'}`}
                        onChange={(e) => {
                          const val = e.target.value
                          onUpdateVariant(ri, 'qtyLabel', val)
                          const num = parseFloat(val)
                          if (!isNaN(num)) onChange(ri, 'netQuantity', num)
                        }}
                        placeholder="1 nos"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* 8. Unit Price */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.unitPrice || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          onUpdateVariant(ri, 'unitPrice', val)
                          const cleanPrice = val.replace(/[^0-9.]/g, '')
                          const numP = parseFloat(cleanPrice)
                          const qty = parseFloat(String(attrs.qtyLabel || item.netQuantity || 1))
                          if (!isNaN(numP) && !isNaN(qty)) {
                            onUpdateVariant(ri, 'totalAmount', `৳${Math.round(qty * numP).toLocaleString('en-IN')}`)
                          }
                        }}
                        placeholder="৳70,000"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 9. Total Amount */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.totalAmount || ''}
                        onChange={(e) => onUpdateVariant(ri, 'totalAmount', e.target.value)}
                        placeholder="৳70,000"
                        className={`${GRID_CELL_BOLD} text-teal-700 dark:text-teal-300`}
                      />
                    </td>

                    {/* 10. Remove */}
                    <td className="p-0 w-8 text-center align-middle">
                      <button
                        onClick={() => onRemoveRow(ri)}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Remove appliance row"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'CEILING_LIGHTING_SPEC' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1050px] border-collapse divide-y divide-border/60">
            <thead className="bg-purple-500/10 border-b border-purple-500/20 text-purple-950 dark:text-purple-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-14`}>SL</th>
                <th className={`${GRID_TH} min-w-[200px]`}>Item Name</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Color Temp / Specs</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Size / Dimension</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Voltage / Wattage</th>
                <th className={`${GRID_TH} w-24 text-center`}>Quantity</th>
                <th className={`${GRID_TH} w-24 text-center`}>Unit</th>
                <th className={`${GRID_TH} min-w-[180px]`}>Remarks</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                const catalogItem = CEILING_LIGHTING_CATALOG.find((c) => c.name.toLowerCase() === (item.materialName || '').toLowerCase())
                const hasSize = Boolean(catalogItem?.sizeOptions && catalogItem.sizeOptions.length > 0)
                const hasVoltage = Boolean(catalogItem?.voltageOptions && catalogItem.voltageOptions.length > 0)

                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* SL */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.srNo || String(ri + 1)}
                        onChange={(e) => onUpdateVariant(ri, 'srNo', e.target.value)}
                        placeholder={String(ri + 1)}
                        className={GRID_CELL_MONO}
                      />
                    </td>

                    {/* Item Name (Dropdown) */}
                    <td className={GRID_TD}>
                      <select
                        value={item.materialName || ''}
                        onChange={(e) => {
                          const newName = e.target.value
                          onChange(ri, 'materialName', newName)
                          const catItem = CEILING_LIGHTING_CATALOG.find((c) => c.name === newName)
                          if (catItem) {
                            onChange(ri, 'specifications', catItem.defaultSpecs)
                            onChange(ri, 'unit', catItem.unit)
                            onChange(ri, 'remarks', catItem.defaultRemarks)
                            if (catItem.defaultQty !== undefined) {
                              onChange(ri, 'netQuantity', catItem.defaultQty)
                              onChange(ri, 'finalQuantity', catItem.defaultQty)
                            }
                            onUpdateVariant(ri, 'colorTempSpecs', catItem.defaultSpecs)
                            onUpdateVariant(ri, 'sizeDimension', catItem.defaultSize || '—')
                            onUpdateVariant(ri, 'voltageWattage', catItem.defaultVoltage || '—')
                          }
                        }}
                        className={`${GRID_CELL_SELECT} font-semibold`}
                      >
                        <option value="" disabled>-- Select Light Item --</option>
                        {CEILING_LIGHTING_CATALOG.map((c) => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                        {item.materialName && !CEILING_LIGHTING_CATALOG.some(c => c.name.toLowerCase() === item.materialName.toLowerCase()) && (
                          <option value={item.materialName}>{item.materialName}</option>
                        )}
                      </select>
                    </td>

                    {/* Color Temp / Specs */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.colorTempSpecs !== undefined ? String(attrs.colorTempSpecs) : (item.specifications || '')}
                        onChange={(e) => {
                          const val = e.target.value
                          onUpdateVariant(ri, 'colorTempSpecs', val)
                          onChange(ri, 'specifications', val)
                        }}
                        placeholder="e.g. 4000 K"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* Size / Dimension */}
                    <td className={GRID_TD}>
                      {hasSize ? (
                        <select
                          value={attrs.sizeDimension || catalogItem?.defaultSize || ''}
                          onChange={(e) => {
                            const newSize = e.target.value
                            onUpdateVariant(ri, 'sizeDimension', newSize)
                            if (catalogItem?.name === 'T-5 Light') {
                              const newRemark = newSize === '4 Feet' ? 'Main Profile Light' : 'Profile Light'
                              onChange(ri, 'remarks', newRemark)
                            }
                          }}
                          className={GRID_CELL_SELECT}
                        >
                          {catalogItem?.sizeOptions?.map((sz) => (
                            <option key={sz} value={sz}>{sz}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full px-2.5 py-1.5 text-xs text-center text-muted-foreground/40 bg-muted/20 select-none font-mono">
                          —
                        </div>
                      )}
                    </td>

                    {/* Voltage / Wattage */}
                    <td className={GRID_TD}>
                      {hasVoltage ? (
                        catalogItem?.voltageOptions && catalogItem.voltageOptions.length > 1 ? (
                          <select
                            value={attrs.voltageWattage || catalogItem?.defaultVoltage || ''}
                            onChange={(e) => {
                              const newVolt = e.target.value
                              onUpdateVariant(ri, 'voltageWattage', newVolt)
                              if (catalogItem?.name === 'Silicon Light') {
                                const newRemark = newVolt === '220V AC' ? 'Flexible Strip' : 'Low Volt Strip'
                                onChange(ri, 'remarks', newRemark)
                              }
                            }}
                            className={GRID_CELL_SELECT}
                          >
                            {catalogItem.voltageOptions.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={attrs.voltageWattage !== undefined ? String(attrs.voltageWattage) : (catalogItem?.defaultVoltage || '')}
                            onChange={(e) => onUpdateVariant(ri, 'voltageWattage', e.target.value)}
                            placeholder="e.g. 15 Watt"
                            className={GRID_CELL_INPUT}
                          />
                        )
                      ) : (
                        <div className="w-full px-2.5 py-1.5 text-xs text-center text-muted-foreground/40 bg-muted/20 select-none font-mono">
                          —
                        </div>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className={GRID_TD}>
                      <input
                        type="number"
                        step="any"
                        value={attrs.qtyLabel !== undefined && attrs.qtyLabel !== '' ? attrs.qtyLabel : (Number(item.netQuantity) === 0 && attrs.sourceQuantityStatus === 'NEEDS_CONFIRMATION' ? '' : (item.netQuantity ?? ''))}
                        onChange={(e) => {
                          const val = e.target.value
                          onUpdateVariant(ri, 'qtyLabel', val)
                          const num = parseFloat(val)
                          const validNum = isNaN(num) ? 0 : num
                          onChange(ri, 'netQuantity', validNum)
                          onChange(ri, 'finalQuantity', validNum)
                        }}
                        placeholder="0"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* Unit */}
                    <td className={GRID_TD}>
                      <select
                        value={item.unit || 'pcs'}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className={`${GRID_CELL_SELECT} text-center font-medium`}
                      >
                        <option value="pcs">pcs</option>
                        <option value="rft">rft</option>
                        <option value="set">set</option>
                        <option value="Nos">Nos</option>
                        <option value="Pcs">Pcs</option>
                      </select>
                    </td>

                    {/* Remarks */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={item.remarks || ''}
                        onChange={(e) => onChange(ri, 'remarks', e.target.value)}
                        placeholder="Remarks"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-0 w-8 text-center align-middle">
                      <button
                        onClick={() => onRemoveRow(ri)}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'CEILING_ELECTRICAL_SPEC' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1050px] border-collapse divide-y divide-border/60">
            <thead className="bg-amber-500/10 border-b border-amber-500/20 text-amber-950 dark:text-amber-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-14`}>SL</th>
                <th className={`${GRID_TH} min-w-[200px]`}>Item Name</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Specification / Type</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Rating / Dimension</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Voltage / Wattage</th>
                <th className={`${GRID_TH} w-24 text-center`}>Quantity</th>
                <th className={`${GRID_TH} w-24 text-center`}>Unit</th>
                <th className={`${GRID_TH} min-w-[180px]`}>Remarks</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                const catalogItem = CEILING_ELECTRICAL_CATALOG.find((c) => c.name.toLowerCase() === (item.materialName || '').toLowerCase())
                const hasRating = catalogItem ? catalogItem.hasRating : Boolean(attrs.ratingDimension && attrs.ratingDimension !== '—')
                const hasVoltage = catalogItem ? catalogItem.hasVoltage : Boolean(attrs.voltageWattage && attrs.voltageWattage !== '—')

                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* SL */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.srNo || String(ri + 1)}
                        onChange={(e) => onUpdateVariant(ri, 'srNo', e.target.value)}
                        placeholder={String(ri + 1)}
                        className={GRID_CELL_MONO}
                      />
                    </td>

                    {/* Item Name (Dropdown) */}
                    <td className={GRID_TD}>
                      <select
                        value={item.materialName || ''}
                        onChange={(e) => {
                          const newName = e.target.value
                          onChange(ri, 'materialName', newName)
                          const catItem = CEILING_ELECTRICAL_CATALOG.find((c) => c.name === newName)
                          if (catItem) {
                            onChange(ri, 'specifications', catItem.defaultSpecs)
                            onChange(ri, 'unit', catItem.unit)
                            onChange(ri, 'remarks', catItem.defaultRemarks)
                            if (catItem.defaultQty !== undefined) {
                              onChange(ri, 'netQuantity', catItem.defaultQty)
                              onChange(ri, 'finalQuantity', catItem.defaultQty)
                            }
                            onUpdateVariant(ri, 'ratingDimension', catItem.defaultRating || '—')
                            onUpdateVariant(ri, 'voltageWattage', catItem.defaultVoltage || '—')
                          }
                        }}
                        className={`${GRID_CELL_SELECT} font-semibold`}
                      >
                        <option value="" disabled>-- Select Electrical Item --</option>
                        {CEILING_ELECTRICAL_CATALOG.map((c) => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                        {item.materialName && !CEILING_ELECTRICAL_CATALOG.some(c => c.name.toLowerCase() === item.materialName.toLowerCase()) && (
                          <option value={item.materialName}>{item.materialName}</option>
                        )}
                      </select>
                    </td>

                    {/* Specification / Type */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={item.specifications || ''}
                        onChange={(e) => onChange(ri, 'specifications', e.target.value)}
                        placeholder="e.g. 12V DC Output"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* Rating / Dimension */}
                    <td className={GRID_TD}>
                      {hasRating ? (
                        <input
                          type="text"
                          value={attrs.ratingDimension !== undefined ? String(attrs.ratingDimension) : (catalogItem?.defaultRating || '')}
                          onChange={(e) => onUpdateVariant(ri, 'ratingDimension', e.target.value)}
                          placeholder="e.g. Standard"
                          className={GRID_CELL_INPUT}
                        />
                      ) : (
                        <div className="w-full px-2.5 py-1.5 text-xs text-center text-muted-foreground/40 bg-muted/20 select-none font-mono">
                          —
                        </div>
                      )}
                    </td>

                    {/* Voltage / Wattage */}
                    <td className={GRID_TD}>
                      {hasVoltage ? (
                        catalogItem?.voltageOptions && catalogItem.voltageOptions.length > 0 ? (
                          <select
                            value={attrs.voltageWattage || catalogItem?.defaultVoltage || ''}
                            onChange={(e) => onUpdateVariant(ri, 'voltageWattage', e.target.value)}
                            className={GRID_CELL_SELECT}
                          >
                            {catalogItem.voltageOptions.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={attrs.voltageWattage !== undefined ? String(attrs.voltageWattage) : (catalogItem?.defaultVoltage || '')}
                            onChange={(e) => onUpdateVariant(ri, 'voltageWattage', e.target.value)}
                            placeholder="e.g. 60 Watt"
                            className={GRID_CELL_INPUT}
                          />
                        )
                      ) : (
                        <div className="w-full px-2.5 py-1.5 text-xs text-center text-muted-foreground/40 bg-muted/20 select-none font-mono">
                          —
                        </div>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className={GRID_TD}>
                      <input
                        type="number"
                        step="any"
                        value={attrs.qtyLabel !== undefined && attrs.qtyLabel !== '' ? attrs.qtyLabel : (Number(item.netQuantity) === 0 && attrs.sourceQuantityStatus === 'NEEDS_CONFIRMATION' ? '' : (item.netQuantity ?? ''))}
                        onChange={(e) => {
                          const val = e.target.value
                          onUpdateVariant(ri, 'qtyLabel', val)
                          const num = parseFloat(val)
                          const validNum = isNaN(num) ? 0 : num
                          onChange(ri, 'netQuantity', validNum)
                          onChange(ri, 'finalQuantity', validNum)
                        }}
                        placeholder="0"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* Unit */}
                    <td className={GRID_TD}>
                      <select
                        value={item.unit || 'pcs'}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className={`${GRID_CELL_SELECT} text-center font-medium`}
                      >
                        <option value="pcs">pcs</option>
                        <option value="coil/rft">coil/rft</option>
                        <option value="roll">roll</option>
                        <option value="rft">rft</option>
                        <option value="set">set</option>
                        <option value="Nos">Nos</option>
                        <option value="Pcs">Pcs</option>
                      </select>
                    </td>

                    {/* Remarks */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={item.remarks || ''}
                        onChange={(e) => onChange(ri, 'remarks', e.target.value)}
                        placeholder="Remarks"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-0 w-8 text-center align-middle">
                      <button
                        onClick={() => onRemoveRow(ri)}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── 8. Standard 8-Column Material Table ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[800px] border-collapse divide-y divide-border/60">
            <thead className="bg-blue-500/10 border-b border-blue-500/20 text-blue-900 dark:text-blue-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-36`}>Category</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Material Name</th>
                <th className={`${GRID_TH} min-w-[200px]`}>Specification</th>
                <th className={`${GRID_TH} text-center w-20`}>Net Qty</th>
                <th className={`${GRID_TH} text-center w-20`}>Wastage %</th>
                <th className={`${GRID_TH} text-center w-20`}>Final Qty</th>
                <th className={`${GRID_TH} w-24`}>UOM</th>
                <th className={`${GRID_TH} w-28`}>Phase / Usage</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => (
                <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                  {/* Category */}
                  <td className={GRID_TD}>
                    <select
                      value={item.workCategory}
                      onChange={(e) => onChange(ri, 'workCategory', e.target.value)}
                      className={GRID_CELL_SELECT}
                    >
                      {WORK_CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Material Name */}
                  <td className={GRID_TD}>
                    <input
                      type="text"
                      value={item.materialName}
                      onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                      placeholder="e.g. 18mm Plywood"
                      className={GRID_CELL_BOLD}
                    />
                  </td>

                  {/* Specification */}
                  <td className={GRID_TD}>
                    <input
                      type="text"
                      value={item.specifications || ''}
                      onChange={(e) => onChange(ri, 'specifications', e.target.value)}
                      placeholder="Grade / finish / brand"
                      className={GRID_CELL_INPUT}
                    />
                  </td>

                  {/* Net Qty */}
                  <td className={GRID_TD}>
                    <input
                      type="number"
                      step="any"
                      value={item.variantAttributes?.sourceScheduleKey && item.variantAttributes?.sourceQuantityStatus === 'NEEDS_CONFIRMATION' && Number(item.netQuantity) === 0 ? '' : item.netQuantity}
                      onChange={(e) => onChange(ri, 'netQuantity', e.target.value)}
                      className={GRID_CELL_NUM}
                    />
                    {item.variantAttributes?.sourceScheduleKey && item.variantAttributes?.sourceQuantityStatus === 'NEEDS_CONFIRMATION' && (
                      <span className="mt-1 block text-[9px] font-semibold text-amber-700">Needs qty</span>
                    )}
                  </td>

                  {/* Wastage */}
                  <td className={GRID_TD}>
                    <input
                      type="number"
                      step="any"
                      value={item.wastagePercent}
                      onChange={(e) => onChange(ri, 'wastagePercent', e.target.value)}
                      className={`${GRID_CELL_NUM} text-amber-600 dark:text-amber-400`}
                    />
                  </td>

                  {/* Final Qty */}
                  <td className="px-2.5 py-1.5 text-center font-bold text-foreground text-xs">
                    {item.variantAttributes?.sourceScheduleKey && item.variantAttributes?.sourceQuantityStatus === 'NEEDS_CONFIRMATION' ? <span className="text-amber-700">Needs qty</span> : item.finalQuantity}
                  </td>

                  {/* UOM */}
                  <td className={GRID_TD}>
                    <select
                      value={item.unit}
                      onChange={(e) => onChange(ri, 'unit', e.target.value)}
                      className={GRID_CELL_SELECT}
                    >
                      {UOM_OPTIONS.map((uom) => (
                        <option key={uom} value={uom}>
                          {uom}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Phase */}
                  <td className={GRID_TD}>
                    <input
                      type="text"
                      value={item.productionPhase || ''}
                      onChange={(e) => onChange(ri, 'productionPhase', e.target.value)}
                      placeholder="e.g. Carcase"
                      className={GRID_CELL_INPUT}
                    />
                  </td>

                  {/* Delete */}
                  <td className="p-0 w-8 text-center align-middle">
                    <button
                      onClick={() => onRemoveRow(ri)}
                      className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}

      <div className="px-3.5 py-2.5 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onAddRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Material Row
        </button>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {onLoadPreset && rows.length > 0 && (
            <button
              onClick={onLoadPreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/50"
            >
              <Download className="w-3 h-3 text-amber-500" />
              + Add Core Boards (BRD)
            </button>
          )}
          {onLoadLouverPreset && rows.length > 0 && (
            <button
              onClick={onLoadLouverPreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors border border-indigo-200 dark:border-indigo-800"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              + Add Louvers (LVR/EDG)
            </button>
          )}
          {onLoadScrewPreset && rows.length > 0 && (
            <button
              onClick={onLoadScrewPreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors border border-amber-200 dark:border-amber-800"
            >
              <Wrench className="w-3 h-3 text-amber-600" />
              + Add Screws (SCR)
            </button>
          )}
          {onLoadNailPreset && rows.length > 0 && (
            <button
              onClick={onLoadNailPreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors border border-rose-200 dark:border-rose-800"
            >
              <Pin className="w-3 h-3 text-rose-600" />
              + Add Nails & Pins (NAL/PIN)
            </button>
          )}
          {onLoadAdhesivePreset && rows.length > 0 && (
            <button
              onClick={onLoadAdhesivePreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors border border-emerald-200 dark:border-emerald-800"
            >
              <FlaskConical className="w-3 h-3 text-emerald-600" />
              + Add Adhesives (ADH)
            </button>
          )}
          {onLoadCabinetCorePreset && rows.length > 0 && (
            <button
              onClick={onLoadCabinetCorePreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors border border-amber-200 dark:border-amber-800"
            >
              <Download className="w-3 h-3 text-amber-600" />
              + Add Sample Boards
            </button>
          )}
          {onLoadCabinetHplPreset && rows.length > 0 && (
            <button
              onClick={onLoadCabinetHplPreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors border border-cyan-200 dark:border-cyan-800"
            >
              <Sparkles className="w-3 h-3 text-cyan-600" />
              + Add HPL Pasting Samples
            </button>
          )}
          {onLoadAccessoryHardwarePreset && rows.length > 0 && (
            <button
              onClick={onLoadAccessoryHardwarePreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-colors border border-pink-200 dark:border-pink-800"
            >
              <Sparkles className="w-3 h-3 text-pink-600" />
              + Add Hardware Accessories
            </button>
          )}
          {onLoadAccessoryServicesPreset && rows.length > 0 && (
            <button
              onClick={onLoadAccessoryServicesPreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors border border-purple-200 dark:border-purple-800"
            >
              <Layers className="w-3 h-3 text-purple-600" />
              + Add Deliverables & Services
            </button>
          )}
          {onLoadAppliancePreset && rows.length > 0 && (
            <button
              onClick={onLoadAppliancePreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors border border-teal-200 dark:border-teal-800"
            >
              <Sparkles className="w-3 h-3 text-teal-600" />
              + Add Core Appliances
            </button>
          )}
          {onLoadCeilingLightingPreset && rows.length > 0 && (
            <button
              onClick={onLoadCeilingLightingPreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors border border-purple-200 dark:border-purple-800"
            >
              <Lightbulb className="w-3 h-3 text-purple-600" />
              + Add Ceiling Lights (17 Items)
            </button>
          )}
          {onLoadCeilingElectricalPreset && rows.length > 0 && (
            <button
              onClick={onLoadCeilingElectricalPreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors border border-amber-200 dark:border-amber-800"
            >
              <Zap className="w-3 h-3 text-amber-600" />
              + Add Drivers & Switches (20 Items)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

