'use client'

import React, { useState, useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import {
  inferProductCategoryRule,
  UI_SECTION_CATEGORIES,
  type UiSectionCategory,
} from '@/lib/boq-product-category-map'
import type { QuotationLineItem } from '@/lib/quotation-types'
import type {
  RequisitionWorkCategory,
  WallPanelingSubType,
  CabinetSubType,
  AccessoriesSubType,
  ApplianceSubType,
  CeilingSubType,
} from '../types/boq-builder-types'
import {
  WALL_PANEL_ONLY_SUBTYPES,
  HARDWARE_ONLY_SUBTYPES,
  CABINET_SUBTYPES,
  ACCESSORIES_SUBTYPES,
  APPLIANCE_SUBTYPES,
  CEILING_SUBTYPES,
} from '../constants/boq-builder-constants'
import {
  CEILING_LIGHTING_SCHEDULE,
  CEILING_ELECTRICAL_SCHEDULE,
} from '../constants/boq-lighting-electrical-catalogs'

export function ScheduleSelection({
  category,
  ceilingSubType,
  checked,
  onChange,
}: {
  category: RequisitionWorkCategory
  ceilingSubType?: CeilingSubType
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  if (category !== 'CEILING' && category !== 'ELECTRICAL_WORK') return null
  const isLighting = category === 'CEILING' && ceilingSubType !== 'ELECTRICAL_DEVICES'
  const label = isLighting ? 'Ceiling Lighting list' : 'Drivers, Switches & Sockets list'
  const count = isLighting ? CEILING_LIGHTING_SCHEDULE.length : CEILING_ELECTRICAL_SCHEDULE.length
  return (
    <label className="flex basis-full cursor-pointer items-start gap-2 rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-2 text-xs">
      <input
        type="checkbox"
        className="mt-0.5 accent-sky-700"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="font-semibold text-foreground">Start with {label}</span>
        <span className="ml-1 text-muted-foreground">
          ({count} rows). Unspecified quantities stay blank and must be resolved before submission.
        </span>
      </span>
    </label>
  )
}

export function AddSectionForm({
  onAdd,
  onCancel,
  lineItem,
}: {
  onAdd: (
    category: RequisitionWorkCategory,
    wpSubType?: WallPanelingSubType,
    cabSubType?: CabinetSubType,
    accSubType?: AccessoriesSubType,
    appSubType?: ApplianceSubType,
    ceilingSubType?: CeilingSubType,
    includeSourceSchedule?: boolean
  ) => void
  onCancel: () => void
  lineItem?: QuotationLineItem | null
}) {
  const rule = useMemo(
    () =>
      inferProductCategoryRule(
        lineItem?.description,
        lineItem?.materials,
        lineItem?.catalogTemplateKey
      ),
    [lineItem]
  )
  const [showAll, setShowAll] = useState(false)
  const [selectedUiCat, setSelectedUiCat] = useState<UiSectionCategory | null>(null)
  const uiCat = selectedUiCat ?? rule.defaultUiCategory
  const [wpSub, setWpSub] = useState<WallPanelingSubType>('CORE_BOARDS')
  const [hwSub, setHwSub] = useState<WallPanelingSubType>('SCREWS_FASTENERS')
  const [cabSub, setCabSub] = useState<CabinetSubType>('BOARD_SPEC')
  const [accSub, setAccSub] = useState<AccessoriesSubType>('HARDWARE_ACCESSORIES')
  const [appSub, setAppSub] = useState<ApplianceSubType>('CORE_APPLIANCES')
  const [ceilingSub, setCeilingSub] = useState<CeilingSubType>('CEILING_LIGHTING')
  const [includeSourceSchedule, setIncludeSourceSchedule] = useState(false)

  const visibleCategories = showAll
    ? UI_SECTION_CATEGORIES
    : UI_SECTION_CATEGORIES.filter((c) => rule.allowedUiCategories.includes(c.key))

  const handleConfirm = () => {
    if (uiCat === 'HARDWARE') {
      onAdd('WALL_PANELING', hwSub, undefined, undefined, undefined, undefined, false)
    } else if (uiCat === 'WALL_PANELING') {
      onAdd('WALL_PANELING', wpSub, undefined, undefined, undefined, undefined, false)
    } else if (uiCat === 'CABINETS_CLOSETS') {
      onAdd('CABINETS_CLOSETS', undefined, cabSub, undefined, undefined, undefined, false)
    } else if (uiCat === 'ACCESSORIES') {
      onAdd('ACCESSORIES', undefined, undefined, accSub, undefined, undefined, false)
    } else if (uiCat === 'APPLIANCES') {
      onAdd('APPLIANCES', undefined, undefined, undefined, appSub, undefined, false)
    } else if (uiCat === 'CEILING') {
      onAdd('CEILING', undefined, undefined, undefined, undefined, ceilingSub, includeSourceSchedule)
    } else if (uiCat === 'ELECTRICAL_WORK') {
      onAdd(
        'ELECTRICAL_WORK',
        undefined,
        undefined,
        undefined,
        undefined,
        'ELECTRICAL_DEVICES',
        includeSourceSchedule
      )
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 bg-muted/20 border-t border-border/70">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
        <Plus className="w-3.5 h-3.5 text-primary" />
        <span>New Section:</span>
      </div>
      <select
        value={uiCat}
        onChange={(e) => {
          setSelectedUiCat(e.target.value as UiSectionCategory)
          setIncludeSourceSchedule(false)
        }}
        className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-primary font-medium shadow-xs"
      >
        {visibleCategories.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>

      {uiCat === 'HARDWARE' && (
        <select
          value={hwSub}
          onChange={(e) => setHwSub(e.target.value as WallPanelingSubType)}
          className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-orange-500 font-medium shadow-xs"
        >
          {HARDWARE_ONLY_SUBTYPES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      {uiCat === 'WALL_PANELING' && (
        <select
          value={wpSub}
          onChange={(e) => setWpSub(e.target.value as WallPanelingSubType)}
          className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-primary font-medium shadow-xs"
        >
          {WALL_PANEL_ONLY_SUBTYPES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      {uiCat === 'CABINETS_CLOSETS' && (
        <select
          value={cabSub}
          onChange={(e) => setCabSub(e.target.value as CabinetSubType)}
          className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-amber-500 font-medium shadow-xs"
        >
          {CABINET_SUBTYPES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      {uiCat === 'ACCESSORIES' && (
        <select
          value={accSub}
          onChange={(e) => setAccSub(e.target.value as AccessoriesSubType)}
          className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-pink-500 font-medium shadow-xs"
        >
          {ACCESSORIES_SUBTYPES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      {uiCat === 'APPLIANCES' && (
        <select
          value={appSub}
          onChange={(e) => setAppSub(e.target.value as ApplianceSubType)}
          className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 font-medium shadow-xs"
        >
          {APPLIANCE_SUBTYPES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      {uiCat === 'CEILING' && (
        <select
          value={ceilingSub}
          onChange={(e) => setCeilingSub(e.target.value as CeilingSubType)}
          className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-purple-500 font-medium shadow-xs"
        >
          {CEILING_SUBTYPES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      <ScheduleSelection
        category={
          uiCat === 'CEILING'
            ? 'CEILING'
            : uiCat === 'ELECTRICAL_WORK'
            ? 'ELECTRICAL_WORK'
            : 'WALL_PANELING'
        }
        ceilingSubType={ceilingSub}
        checked={includeSourceSchedule}
        onChange={setIncludeSourceSchedule}
      />

      <button
        onClick={handleConfirm}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" /> Confirm Add Section
      </button>

      {rule.tier !== 3 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-[11px] text-muted-foreground/80 hover:text-foreground underline transition-colors px-1"
        >
          {showAll ? 'Show recommended' : 'Show all'}
        </button>
      )}

      <button
        onClick={onCancel}
        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
      >
        Cancel
      </button>
    </div>
  )
}

export function AddSectionModal({
  isOpen,
  onClose,
  productTitle,
  lineItem,
  onAdd,
}: {
  isOpen: boolean
  onClose: () => void
  productTitle: string
  lineItem?: QuotationLineItem | null
  onAdd: (
    category: RequisitionWorkCategory,
    wpSubType?: WallPanelingSubType,
    cabSubType?: CabinetSubType,
    accSubType?: AccessoriesSubType,
    appSubType?: ApplianceSubType,
    ceilingSubType?: CeilingSubType,
    includeSourceSchedule?: boolean
  ) => void
}) {
  const rule = useMemo(
    () =>
      inferProductCategoryRule(
        lineItem?.description,
        lineItem?.materials,
        lineItem?.catalogTemplateKey
      ),
    [lineItem]
  )
  const [showAll, setShowAll] = useState(false)
  const [selectedUiCat, setSelectedUiCat] = useState<UiSectionCategory | null>(null)
  const uiCat = selectedUiCat ?? rule.defaultUiCategory
  const [wpSub, setWpSub] = useState<WallPanelingSubType>('CORE_BOARDS')
  const [hwSub, setHwSub] = useState<WallPanelingSubType>('SCREWS_FASTENERS')
  const [cabSub, setCabSub] = useState<CabinetSubType>('BOARD_SPEC')
  const [accSub, setAccSub] = useState<AccessoriesSubType>('HARDWARE_ACCESSORIES')
  const [appSub, setAppSub] = useState<ApplianceSubType>('CORE_APPLIANCES')
  const [ceilingSub, setCeilingSub] = useState<CeilingSubType>('CEILING_LIGHTING')
  const [includeSourceSchedule, setIncludeSourceSchedule] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setSelectedUiCat(null)
    setShowAll(false)
    setIncludeSourceSchedule(false)
    onClose()
  }

  const visibleCategories = showAll
    ? UI_SECTION_CATEGORIES
    : UI_SECTION_CATEGORIES.filter((c) => rule.allowedUiCategories.includes(c.key))

  const handleConfirm = () => {
    if (uiCat === 'HARDWARE') {
      onAdd('WALL_PANELING', hwSub, undefined, undefined, undefined, undefined, false)
    } else if (uiCat === 'WALL_PANELING') {
      onAdd('WALL_PANELING', wpSub, undefined, undefined, undefined, undefined, false)
    } else if (uiCat === 'CABINETS_CLOSETS') {
      onAdd('CABINETS_CLOSETS', undefined, cabSub, undefined, undefined, undefined, false)
    } else if (uiCat === 'ACCESSORIES') {
      onAdd('ACCESSORIES', undefined, undefined, accSub, undefined, undefined, false)
    } else if (uiCat === 'APPLIANCES') {
      onAdd('APPLIANCES', undefined, undefined, undefined, appSub, undefined, false)
    } else if (uiCat === 'CEILING') {
      onAdd('CEILING', undefined, undefined, undefined, undefined, ceilingSub, includeSourceSchedule)
    } else if (uiCat === 'ELECTRICAL_WORK') {
      onAdd(
        'ELECTRICAL_WORK',
        undefined,
        undefined,
        undefined,
        undefined,
        'ELECTRICAL_DEVICES',
        includeSourceSchedule
      )
    }
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-50 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-border/70">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                New Section
              </span>
              {rule.tier !== 3 && rule.productLabel && (
                <span className="rounded bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200">
                  Guided: {rule.productLabel}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-foreground">Add Material Section</h3>
            <p className="text-xs text-muted-foreground truncate max-w-sm mt-0.5">
              Target: {productTitle}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 py-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-foreground">Work Category</label>
              {rule.tier !== 3 && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {showAll ? 'Show recommended' : 'Show all categories'}
                </button>
              )}
            </div>
            <select
              value={uiCat}
              onChange={(e) => {
                setSelectedUiCat(e.target.value as UiSectionCategory)
                setIncludeSourceSchedule(false)
              }}
              className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-primary shadow-xs"
            >
              {visibleCategories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {uiCat === 'HARDWARE' && (
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Hardware Sub-Type
              </label>
              <select
                value={hwSub}
                onChange={(e) => setHwSub(e.target.value as WallPanelingSubType)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-orange-500 shadow-xs"
              >
                {HARDWARE_ONLY_SUBTYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {uiCat === 'WALL_PANELING' && (
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Wall Paneling Sub-Type
              </label>
              <select
                value={wpSub}
                onChange={(e) => setWpSub(e.target.value as WallPanelingSubType)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-primary shadow-xs"
              >
                {WALL_PANEL_ONLY_SUBTYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {uiCat === 'CABINETS_CLOSETS' && (
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Cabinet / Closet Sub-Type
              </label>
              <select
                value={cabSub}
                onChange={(e) => setCabSub(e.target.value as CabinetSubType)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-amber-500 shadow-xs"
              >
                {CABINET_SUBTYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {uiCat === 'ACCESSORIES' && (
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Hardware / Accessories Sub-Type
              </label>
              <select
                value={accSub}
                onChange={(e) => setAccSub(e.target.value as AccessoriesSubType)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-pink-500 shadow-xs"
              >
                {ACCESSORIES_SUBTYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {uiCat === 'APPLIANCES' && (
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Appliance Sub-Type
              </label>
              <select
                value={appSub}
                onChange={(e) => setAppSub(e.target.value as ApplianceSubType)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-teal-500 shadow-xs"
              >
                {APPLIANCE_SUBTYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {uiCat === 'CEILING' && (
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Ceiling Sub-Type
              </label>
              <select
                value={ceilingSub}
                onChange={(e) => setCeilingSub(e.target.value as CeilingSubType)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-purple-500 shadow-xs"
              >
                {CEILING_SUBTYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ScheduleSelection
            category={
              uiCat === 'CEILING'
                ? 'CEILING'
                : uiCat === 'ELECTRICAL_WORK'
                ? 'ELECTRICAL_WORK'
                : 'WALL_PANELING'
            }
            ceilingSubType={ceilingSub}
            checked={includeSourceSchedule}
            onChange={setIncludeSourceSchedule}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Confirm Add Section
          </button>
        </div>
      </div>
    </div>
  )
}
