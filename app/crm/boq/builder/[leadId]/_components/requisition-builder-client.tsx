'use client'

import { useState, useTransition, useMemo } from 'react'
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
  Package,
  Layers,
  CheckCircle2,
  FileText,
  Sparkles,
  AlertCircle,
  Table as TableIcon,
  LayoutGrid,
  Download,
} from 'lucide-react'
import { saveMaterialRequisition, RequisitionItemInput } from '@/lib/boq-service'
import type {
  QuotationDraftContent,
  QuotationSection,
  QuotationArea,
  QuotationLineItem,
} from '@/lib/quotation-types'

/* ─────────────────────────────────────────────
   Constants & Preset Data
───────────────────────────────────────────── */

export type RequisitionWorkCategory =
  | 'CEILING'
  | 'WALL_PANELING'
  | 'CABINETS_CLOSETS'
  | 'FURNITURE'
  | 'ACCESSORIES'
  | 'ELECTRICAL_WORK'
  | 'PAINT'
  | 'APPLIANCES'

const WORK_CATEGORIES: { key: RequisitionWorkCategory; label: string }[] = [
  { key: 'WALL_PANELING', label: 'Wall Paneling' },
  { key: 'CABINETS_CLOSETS', label: 'Cabinets / Closets' },
  { key: 'CEILING', label: 'Ceiling' },
  { key: 'FURNITURE', label: 'Furniture' },
  { key: 'ACCESSORIES', label: 'Accessories' },
  { key: 'ELECTRICAL_WORK', label: 'Electrical Work' },
  { key: 'PAINT', label: 'Paint & Polish' },
  { key: 'APPLIANCES', label: 'Appliances' },
]

const UOM_OPTIONS = ['Pcs', 'Sheets', 'Meters', 'RFT', 'Kg', 'Rolls', 'Pack', 'Boxes', 'Sets', 'Liters']

/** Special key used for materials not linked to any quotation line item */
const EXTRA_KEY = '__extra__'

export interface BoardVariantAttributes {
  itemId?: string
  coreThickness?: string
  baseMaterial?: string
  laminateTopSurface?: string
  surfaceCodeFinish?: string
  sheetSize?: string
  functionalUsage?: string
  qtyLabel?: string
}

/** Pre-populated Wall Paneling / Board Catalog Preset (Matches User Standard Table) */
const SAMPLE_WALL_PANEL_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Starlight White Board',
    specifications: '12mm | Garjon Plywood | Beladoa Laminate | 2003 SMT (Super Matt)',
    variantAttributes: {
      itemId: 'BRD-001',
      coreThickness: '12mm',
      baseMaterial: 'Garjon Plywood',
      laminateTopSurface: 'Beladoa Laminate',
      surfaceCodeFinish: '2003 SMT (Super Matt)',
      sheetSize: "8' x 4'",
      functionalUsage: 'Shutter / Exterior Cabinet',
      qtyLabel: '1',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Shutter / Exterior Cabinet',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Airolam Cabinet Board',
    specifications: '12mm | Garjon Plywood | Airolam Laminate | 903 SMR (Suede Matt Finished)',
    variantAttributes: {
      itemId: 'BRD-002',
      coreThickness: '12mm',
      baseMaterial: 'Garjon Plywood',
      laminateTopSurface: 'Airolam Laminate',
      surfaceCodeFinish: '903 SMR (Suede Matt Finished)',
      sheetSize: "8' x 4'",
      functionalUsage: 'Inner Box / Shelving',
      qtyLabel: '5',
    },
    netQuantity: 5,
    wastagePercent: 0,
    finalQuantity: 5,
    unit: 'Pcs',
    productionPhase: 'Inner Box / Shelving',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Structural Garjon Ply',
    specifications: '18mm | Garjon Plywood | None (Raw) | Raw Uncoated',
    variantAttributes: {
      itemId: 'BRD-003',
      coreThickness: '18mm',
      baseMaterial: 'Garjon Plywood',
      laminateTopSurface: 'None (Raw)',
      surfaceCodeFinish: 'Raw Uncoated',
      sheetSize: "8' x 4'",
      functionalUsage: 'Heavy Load Frame / Base',
      qtyLabel: '2',
    },
    netQuantity: 2,
    wastagePercent: 0,
    finalQuantity: 2,
    unit: 'Pcs',
    productionPhase: 'Heavy Load Frame / Base',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Standard Core Ply',
    specifications: '12mm | Commercial Ply | None (Raw) | Raw Uncoated',
    variantAttributes: {
      itemId: 'BRD-004',
      coreThickness: '12mm',
      baseMaterial: 'Commercial Ply',
      laminateTopSurface: 'None (Raw)',
      surfaceCodeFinish: 'Raw Uncoated',
      sheetSize: "8' x 4'",
      functionalUsage: 'Backing Panel / Partition',
      qtyLabel: '4',
    },
    netQuantity: 4,
    wastagePercent: 0,
    finalQuantity: 4,
    unit: 'Pcs',
    productionPhase: 'Backing Panel / Partition',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Thin Liner Ply',
    specifications: '6mm | Commercial Ply | None (Raw) | Raw Uncoated',
    variantAttributes: {
      itemId: 'BRD-005',
      coreThickness: '6mm',
      baseMaterial: 'Commercial Ply',
      laminateTopSurface: 'None (Raw)',
      surfaceCodeFinish: 'Raw Uncoated',
      sheetSize: "8' x 4'",
      functionalUsage: 'Drawer Bottom / Backing',
      qtyLabel: '1',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Drawer Bottom / Backing',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Heavy Duty Substrate',
    specifications: '25mm | Garjon Plywood | None (Raw) | Heavy Structural',
    variantAttributes: {
      itemId: 'BRD-006 (Ext)',
      coreThickness: '25mm',
      baseMaterial: 'Garjon Plywood',
      laminateTopSurface: 'None (Raw)',
      surfaceCodeFinish: 'Heavy Structural',
      sheetSize: "8' x 4'",
      functionalUsage: 'Countertop Sub-base',
      qtyLabel: 'Catalog',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Countertop Sub-base',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Waterproof Board',
    specifications: '18mm | WPC (Wood Plastic) | None (Raw) | Water Resistant',
    variantAttributes: {
      itemId: 'BRD-007 (Ext)',
      coreThickness: '18mm',
      baseMaterial: 'WPC (Wood Plastic)',
      laminateTopSurface: 'None (Raw)',
      surfaceCodeFinish: 'Water Resistant',
      sheetSize: "8' x 4'",
      functionalUsage: 'Sink Under-cabinet',
      qtyLabel: 'Catalog',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Sink Under-cabinet',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'High Gloss Panel',
    specifications: '18mm | MDF Core | Acrylic Finish | HG Pure White',
    variantAttributes: {
      itemId: 'BRD-008 (Ext)',
      coreThickness: '18mm',
      baseMaterial: 'MDF Core',
      laminateTopSurface: 'Acrylic Finish',
      surfaceCodeFinish: 'HG Pure White',
      sheetSize: "8' x 4'",
      functionalUsage: 'Modern Kitchen Fronts',
      qtyLabel: 'Catalog',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Modern Kitchen Fronts',
  },
]

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

interface Props {
  lead: {
    id: string
    name: string
    phone: string | null
    email: string | null
    location: string | null
    stage: string
  }
  detailQuotation: {
    id: string
    grandTotal: number
    status: string
    content: any
  } | null
  existingRequisition: {
    id: string
    requisitionNo: string
    status: string
    notes: string | null
    items: any[]
  } | null
  userId: string
}

/** Items grouped: Record<quotationLineItemId | '__extra__', RequisitionItemInput[]> */
type ItemsMap = Record<string, RequisitionItemInput[]>

/* ─────────────────────────────────────────────
   Helper – build a blank requisition item
───────────────────────────────────────────── */
function blankItem(quotationLineItemId?: string): RequisitionItemInput {
  return {
    quotationLineItemId,
    workCategory: 'WALL_PANELING',
    materialName: '',
    specifications: '',
    variantAttributes: {
      itemId: 'BRD-001',
      coreThickness: '12mm',
      baseMaterial: 'Garjon Plywood',
      laminateTopSurface: 'Beladoa Laminate',
      surfaceCodeFinish: '2003 SMT (Super Matt)',
      sheetSize: "8' x 4'",
      functionalUsage: 'Shutter / Exterior Cabinet',
      qtyLabel: '1',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Shutter / Exterior Cabinet',
    remarks: '',
  }
}

/* ─────────────────────────────────────────────
   Helper – flatten ItemsMap → flat array for save
───────────────────────────────────────────── */
function flattenItems(map: ItemsMap): RequisitionItemInput[] {
  return Object.values(map).flat()
}

/* ─────────────────────────────────────────────
   Helper – seed ItemsMap from existing items
───────────────────────────────────────────── */
function seedFromExisting(rawItems: any[]): ItemsMap {
  const map: ItemsMap = {}
  for (const it of rawItems) {
    const key = it.quotationLineItemId || EXTRA_KEY
    if (!map[key]) map[key] = []

    let attrs: BoardVariantAttributes = {}
    if (typeof it.variantAttributes === 'string') {
      try {
        attrs = JSON.parse(it.variantAttributes)
      } catch {
        attrs = {}
      }
    } else if (it.variantAttributes && typeof it.variantAttributes === 'object') {
      attrs = it.variantAttributes
    }

    map[key].push({
      id: it.id,
      quotationLineItemId: it.quotationLineItemId || undefined,
      workCategory: it.workCategory || 'WALL_PANELING',
      materialName: it.materialName || '',
      specifications: it.specifications || '',
      variantAttributes: {
        itemId: attrs.itemId || '',
        coreThickness: attrs.coreThickness || '',
        baseMaterial: attrs.baseMaterial || '',
        laminateTopSurface: attrs.laminateTopSurface || '',
        surfaceCodeFinish: attrs.surfaceCodeFinish || '',
        sheetSize: attrs.sheetSize || "8' x 4'",
        functionalUsage: attrs.functionalUsage || it.productionPhase || '',
        qtyLabel: attrs.qtyLabel || (it.netQuantity ? String(it.netQuantity) : '1'),
      },
      netQuantity: Number(it.netQuantity) || 1,
      wastagePercent: Number(it.wastagePercent) || 0,
      finalQuantity: Number(it.finalQuantity) || Number(it.netQuantity) || 1,
      unit: it.unit || 'Pcs',
      productionPhase: it.productionPhase || attrs.functionalUsage || '',
      remarks: it.remarks || '',
    })
  }
  return map
}

/* ─────────────────────────────────────────────
   Sub-component: Datalist Autocomplete Providers
───────────────────────────────────────────── */
function BoardDatalists() {
  return (
    <>
      <datalist id="item-id-list">
        <option value="BRD-001" />
        <option value="BRD-002" />
        <option value="BRD-003" />
        <option value="BRD-004" />
        <option value="BRD-005" />
        <option value="BRD-006 (Ext)" />
        <option value="BRD-007 (Ext)" />
        <option value="BRD-008 (Ext)" />
      </datalist>

      <datalist id="core-thickness-list">
        <option value="6mm" />
        <option value="9mm" />
        <option value="12mm" />
        <option value="15mm" />
        <option value="18mm" />
        <option value="25mm" />
      </datalist>

      <datalist id="base-material-list">
        <option value="Garjon Plywood" />
        <option value="Commercial Ply" />
        <option value="WPC (Wood Plastic)" />
        <option value="MDF Core" />
        <option value="HDF Core" />
        <option value="Particle Board" />
      </datalist>

      <datalist id="laminate-surface-list">
        <option value="Beladoa Laminate" />
        <option value="Airolam Laminate" />
        <option value="None (Raw)" />
        <option value="Acrylic Finish" />
        <option value="Veneer" />
        <option value="PVC Sheet" />
        <option value="HPL" />
      </datalist>

      <datalist id="surface-code-list">
        <option value="2003 SMT (Super Matt)" />
        <option value="903 SMR (Suede Matt Finished)" />
        <option value="Raw Uncoated" />
        <option value="Heavy Structural" />
        <option value="Water Resistant" />
        <option value="HG Pure White" />
      </datalist>

      <datalist id="sheet-size-list">
        <option value="8' x 4'" />
        <option value="8' x 3'" />
        <option value="9' x 4'" />
        <option value="10' x 4'" />
      </datalist>

      <datalist id="functional-usage-list">
        <option value="Shutter / Exterior Cabinet" />
        <option value="Inner Box / Shelving" />
        <option value="Heavy Load Frame / Base" />
        <option value="Backing Panel / Partition" />
        <option value="Drawer Bottom / Backing" />
        <option value="Countertop Sub-base" />
        <option value="Sink Under-cabinet" />
        <option value="Modern Kitchen Fronts" />
        <option value="Feature Wall Accent" />
      </datalist>
    </>
  )
}

/* ─────────────────────────────────────────────
   Sub-component: Material row table
───────────────────────────────────────────── */
function MaterialRowsTable({
  rows,
  viewMode,
  onChange,
  onUpdateVariant,
  onAddRow,
  onRemoveRow,
  onLoadPreset,
}: {
  rows: RequisitionItemInput[]
  viewMode: 'BOARD_SPEC' | 'STANDARD'
  onChange: (rowIndex: number, field: keyof RequisitionItemInput, value: any) => void
  onUpdateVariant: (rowIndex: number, field: keyof BoardVariantAttributes, value: string) => void
  onAddRow: () => void
  onRemoveRow: (rowIndex: number) => void
  onLoadPreset?: () => void
}) {
  return (
    <div className="border border-dashed border-border rounded-lg overflow-hidden">
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground/60">
            <Package className="w-5 h-5" />
            <span>No wall paneling or material specifications added yet.</span>
          </div>
          {onLoadPreset && (
            <button
              onClick={onLoadPreset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Load Wall Paneling Board Catalog (BRD-001 - BRD-008)
            </button>
          )}
        </div>
      ) : viewMode === 'BOARD_SPEC' ? (
        /* ── 10-Column Wall Paneling & Board Specification Table ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px]">
            <thead className="text-muted-foreground uppercase bg-muted/40 border-b">
              <tr>
                <th className="px-2.5 py-2 font-semibold w-28">Item ID</th>
                <th className="px-2.5 py-2 font-semibold min-w-[160px]">Item Name</th>
                <th className="px-2.5 py-2 font-semibold w-28">Core Thickness</th>
                <th className="px-2.5 py-2 font-semibold min-w-[140px]">Base Material</th>
                <th className="px-2.5 py-2 font-semibold min-w-[150px]">Laminate / Top Surface</th>
                <th className="px-2.5 py-2 font-semibold min-w-[160px]">Surface Code / Finish</th>
                <th className="px-2.5 py-2 font-semibold w-28">Sheet Size (Std)</th>
                <th className="px-2.5 py-2 font-semibold w-20">Unit</th>
                <th className="px-2.5 py-2 font-semibold text-center w-24">Quantity</th>
                <th className="px-2.5 py-2 font-semibold min-w-[160px]">Functional Usage</th>
                <th className="px-2 py-2 font-semibold w-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="hover:bg-muted/10 transition-colors">
                    {/* 1. Item ID */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="item-id-list"
                        value={attrs.itemId || ''}
                        onChange={(e) => onUpdateVariant(ri, 'itemId', e.target.value)}
                        placeholder="BRD-001"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs font-mono font-medium focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* 2. Item Name */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        value={item.materialName}
                        onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                        placeholder="e.g. Starlight White Board"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs font-semibold focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* 3. Core Thickness */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="core-thickness-list"
                        value={attrs.coreThickness || ''}
                        onChange={(e) => onUpdateVariant(ri, 'coreThickness', e.target.value)}
                        placeholder="12mm"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* 4. Base Material */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="base-material-list"
                        value={attrs.baseMaterial || ''}
                        onChange={(e) => onUpdateVariant(ri, 'baseMaterial', e.target.value)}
                        placeholder="Garjon Plywood"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* 5. Laminate / Top Surface */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="laminate-surface-list"
                        value={attrs.laminateTopSurface || ''}
                        onChange={(e) => onUpdateVariant(ri, 'laminateTopSurface', e.target.value)}
                        placeholder="Beladoa Laminate"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* 6. Surface Code / Finish */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="surface-code-list"
                        value={attrs.surfaceCodeFinish || ''}
                        onChange={(e) => onUpdateVariant(ri, 'surfaceCodeFinish', e.target.value)}
                        placeholder="2003 SMT"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* 7. Sheet Size (Std) */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="sheet-size-list"
                        value={attrs.sheetSize || "8' x 4'"}
                        onChange={(e) => onUpdateVariant(ri, 'sheetSize', e.target.value)}
                        placeholder="8' x 4'"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* 8. Unit */}
                    <td className="px-2.5 py-2">
                      <select
                        value={item.unit}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary"
                      >
                        {UOM_OPTIONS.map((uom) => (
                          <option key={uom} value={uom}>
                            {uom}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 9. Quantity */}
                    <td className="px-2.5 py-2">
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
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs text-center font-bold focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* 10. Functional Usage */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="functional-usage-list"
                        value={attrs.functionalUsage || item.productionPhase || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'functionalUsage', e.target.value)
                          onChange(ri, 'productionPhase', e.target.value)
                        }}
                        placeholder="Shutter / Exterior Cabinet"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* Delete */}
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => onRemoveRow(ri)}
                        className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                        title="Remove board row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Standard 8-Column Material Table ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[800px]">
            <thead className="text-muted-foreground uppercase bg-muted/40 border-b">
              <tr>
                <th className="px-3 py-2 font-semibold w-36">Category</th>
                <th className="px-3 py-2 font-semibold min-w-[160px]">Material Name</th>
                <th className="px-3 py-2 font-semibold min-w-[200px]">Specification</th>
                <th className="px-3 py-2 font-semibold text-center w-20">Net Qty</th>
                <th className="px-3 py-2 font-semibold text-center w-20">Wastage %</th>
                <th className="px-3 py-2 font-semibold text-center w-20">Final Qty</th>
                <th className="px-3 py-2 font-semibold w-24">UOM</th>
                <th className="px-3 py-2 font-semibold w-28">Phase / Usage</th>
                <th className="px-3 py-2 font-semibold w-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((item, ri) => (
                <tr key={ri} className="hover:bg-muted/10 transition-colors">
                  {/* Category */}
                  <td className="px-3 py-2">
                    <select
                      value={item.workCategory}
                      onChange={(e) => onChange(ri, 'workCategory', e.target.value)}
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary"
                    >
                      {WORK_CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Material Name */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.materialName}
                      onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                      placeholder="e.g. 18mm Plywood"
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary"
                    />
                  </td>

                  {/* Specification */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.specifications || ''}
                      onChange={(e) => onChange(ri, 'specifications', e.target.value)}
                      placeholder="Grade / finish / brand"
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary"
                    />
                  </td>

                  {/* Net Qty */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={item.netQuantity}
                      onChange={(e) => onChange(ri, 'netQuantity', e.target.value)}
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs text-center font-medium focus:ring-1 focus:ring-primary"
                    />
                  </td>

                  {/* Wastage */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={item.wastagePercent}
                      onChange={(e) => onChange(ri, 'wastagePercent', e.target.value)}
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs text-center text-amber-600 focus:ring-1 focus:ring-primary"
                    />
                  </td>

                  {/* Final Qty */}
                  <td className="px-3 py-2 text-center font-bold text-foreground">{item.finalQuantity}</td>

                  {/* UOM */}
                  <td className="px-3 py-2">
                    <select
                      value={item.unit}
                      onChange={(e) => onChange(ri, 'unit', e.target.value)}
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary"
                    >
                      {UOM_OPTIONS.map((uom) => (
                        <option key={uom} value={uom}>
                          {uom}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Phase */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.productionPhase || ''}
                      onChange={(e) => onChange(ri, 'productionPhase', e.target.value)}
                      placeholder="e.g. Carcase"
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary"
                    />
                  </td>

                  {/* Delete */}
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => onRemoveRow(ri)}
                      className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-3 py-2 border-t border-dashed border-border bg-muted/5 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onAddRow}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Board / Material Row
        </button>

        {onLoadPreset && rows.length > 0 && (
          <button
            onClick={onLoadPreset}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="w-3 h-3 text-amber-500" />
            Append Wall Paneling Sample Data (BRD-001 - BRD-008)
          </button>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sub-component: Single quotation line item card
───────────────────────────────────────────── */
function QuotationLineItemCard({
  item,
  area,
  rows,
  viewMode,
  onChangeRow,
  onUpdateVariant,
  onAddRow,
  onRemoveRow,
  onLoadPreset,
}: {
  item: QuotationLineItem
  area?: QuotationArea
  rows: RequisitionItemInput[]
  viewMode: 'BOARD_SPEC' | 'STANDARD'
  onChangeRow: (rowIndex: number, field: keyof RequisitionItemInput, value: any) => void
  onUpdateVariant: (rowIndex: number, field: keyof BoardVariantAttributes, value: string) => void
  onAddRow: () => void
  onRemoveRow: (rowIndex: number) => void
  onLoadPreset: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {area && (
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                  {area.name}
                </span>
              )}
              <p className="text-sm font-semibold text-foreground truncate">{item.description}</p>
            </div>
            {item.materials && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.materials}</p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {item.quantity} {item.unit}
          </p>
          <p className="text-xs font-bold text-foreground">
            ৳{item.amount.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-muted-foreground">
            {rows.length} board/material row{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
      </button>

      {/* Material rows */}
      {expanded && (
        <div className="p-3">
          <MaterialRowsTable
            rows={rows}
            viewMode={viewMode}
            onChange={onChangeRow}
            onUpdateVariant={onUpdateVariant}
            onAddRow={onAddRow}
            onRemoveRow={onRemoveRow}
            onLoadPreset={onLoadPreset}
          />
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export function RequisitionBuilderClient({
  lead,
  detailQuotation,
  existingRequisition,
  userId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [notes, setNotes] = useState<string>(existingRequisition?.notes || '')
  const [viewMode, setViewMode] = useState<'BOARD_SPEC' | 'STANDARD'>('BOARD_SPEC')

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

  const sections: QuotationSection[] = quotation?.sections ?? []
  const areas: QuotationArea[] = quotation?.areas ?? []
  const lineItems: QuotationLineItem[] = (quotation?.lineItems ?? []).filter((li) => li.included)

  const areaMap = useMemo(() => {
    const m = new Map<string, QuotationArea>()
    for (const a of areas) m.set(a.id, a)
    return m
  }, [areas])

  // ── Items state: keyed by quotationLineItemId | '__extra__' ──
  const [itemsMap, setItemsMap] = useState<ItemsMap>(() => {
    if (existingRequisition?.items && existingRequisition.items.length > 0) {
      return seedFromExisting(existingRequisition.items)
    }
    // Default: seed Extra section with user wall panel sample table if completely empty
    return {
      [EXTRA_KEY]: SAMPLE_WALL_PANEL_ITEMS,
    }
  })

  // ── Helpers to mutate itemsMap ──
  const getRows = (key: string): RequisitionItemInput[] => itemsMap[key] ?? []

  const updateRow = (key: string, rowIndex: number, field: keyof RequisitionItemInput, rawValue: any) => {
    setItemsMap((prev) => {
      const rows = [...(prev[key] ?? [])]
      const current = { ...rows[rowIndex], [field]: rawValue }

      if (field === 'netQuantity' || field === 'wastagePercent') {
        const net = Number(field === 'netQuantity' ? rawValue : current.netQuantity) || 0
        const waste = Number(field === 'wastagePercent' ? rawValue : current.wastagePercent) || 0
        current.finalQuantity = Math.round(net * (1 + waste / 100) * 100) / 100
      }

      rows[rowIndex] = current
      return { ...prev, [key]: rows }
    })
  }

  const updateVariant = (key: string, rowIndex: number, field: keyof BoardVariantAttributes, value: string) => {
    setItemsMap((prev) => {
      const rows = [...(prev[key] ?? [])]
      const current = { ...rows[rowIndex] }
      const prevAttrs: BoardVariantAttributes = current.variantAttributes || {}
      const nextAttrs = { ...prevAttrs, [field]: value }

      current.variantAttributes = nextAttrs

      // Keep specifications string in sync with board specs
      const specParts = [
        nextAttrs.coreThickness,
        nextAttrs.baseMaterial,
        nextAttrs.laminateTopSurface,
        nextAttrs.surfaceCodeFinish,
      ].filter(Boolean)

      if (specParts.length > 0) {
        current.specifications = specParts.join(' | ')
      }

      rows[rowIndex] = current
      return { ...prev, [key]: rows }
    })
  }

  const addRow = (key: string, quotationLineItemId?: string) => {
    setItemsMap((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), blankItem(quotationLineItemId)],
    }))
  }

  const removeRow = (key: string, rowIndex: number) => {
    setItemsMap((prev) => {
      const rows = (prev[key] ?? []).filter((_, i) => i !== rowIndex)
      const next = { ...prev }
      if (rows.length === 0) {
        delete next[key]
      } else {
        next[key] = rows
      }
      return next
    })
  }

  const loadPreset = (key: string, quotationLineItemId?: string) => {
    const presetItems = SAMPLE_WALL_PANEL_ITEMS.map((item) => ({
      ...item,
      quotationLineItemId,
    }))
    setItemsMap((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), ...presetItems],
    }))
  }

  // ── Summary counts ──
  const totalMaterialRows = useMemo(() => flattenItems(itemsMap).length, [itemsMap])
  const coveredLineItems = useMemo(
    () => lineItems.filter((li) => (itemsMap[li.id]?.length ?? 0) > 0).length,
    [lineItems, itemsMap]
  )

  // ── Save / Submit ──
  const handleSave = (status: 'DRAFT' | 'SUBMITTED' = 'DRAFT') => {
    setSaveSuccess(null)
    startTransition(async () => {
      const res = await saveMaterialRequisition({
        leadId: lead.id,
        quotationDraftId: detailQuotation?.id,
        status,
        notes,
        createdById: userId,
        items: flattenItems(itemsMap),
      })
      if (res.success) {
        setSaveSuccess(
          status === 'SUBMITTED'
            ? 'Material requisition submitted to Procurement team successfully!'
            : 'Material requisition draft saved successfully!'
        )
        router.refresh()
      }
    })
  }

  /* ── RENDER ── */
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* ── Global Autocomplete Lists ── */}
      <BoardDatalists />

      {/* ── Top Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <Link
            href="/crm/boq/assigned-task"
            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Assigned Tasks
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Boxes className="w-6 h-6 text-primary" />
            Material & Wall Paneling Requisition Builder
          </h1>
          <p className="text-xs text-muted-foreground">
            Project: <span className="font-semibold text-foreground">{lead.name}</span> | Phone:{' '}
            {lead.phone || 'N/A'} | Location: {lead.location || 'N/A'}
          </p>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Table View Toggle */}
          <div className="inline-flex items-center rounded-lg border bg-muted/30 p-1 text-xs">
            <button
              onClick={() => setViewMode('BOARD_SPEC')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                viewMode === 'BOARD_SPEC'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-primary" /> Wall Paneling Spec View (10 Cols)
            </button>
            <button
              onClick={() => setViewMode('STANDARD')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                viewMode === 'STANDARD'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Standard View
            </button>
          </div>

          <button
            onClick={() => handleSave('DRAFT')}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2 text-amber-500" />
            Save Draft
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
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {saveSuccess}
        </div>
      )}

      {/* ── Quotation Context / Stats Card ── */}
      {detailQuotation ? (
        <div className="rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 p-4 border-blue-200 dark:border-blue-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-foreground">Approved Detail Quotation</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                {detailQuotation.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Grand Total:{' '}
                <strong className="text-foreground">৳{detailQuotation.grandTotal.toLocaleString('en-IN')}</strong>
              </span>
              <span>
                Quotation Items Covered:{' '}
                <strong className="text-foreground">
                  {coveredLineItems}/{lineItems.length}
                </strong>
              </span>
              <span>
                Total Material Rows:{' '}
                <strong className="text-foreground">{totalMaterialRows}</strong>
              </span>
            </div>
          </div>
          {lineItems.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Expand each quotation line item below to enter Wall Paneling & Board specs (Item ID, Core Thickness, Base Material, Laminate, Finish, Size, Unit, Qty, Functional Usage).
              Items that span multiple areas go in the <strong>Extra / Miscellaneous</strong> section below.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-amber-50/40 dark:bg-amber-950/20 p-4 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          No approved detail quotation found for this lead. You can still manage Wall Paneling & Board data using the Extra / Miscellaneous section below.
        </div>
      )}

      {/* ── Quotation-Driven Sections ── */}
      {quotation && lineItems.length > 0 ? (
        <div className="space-y-8">
          {sections.map((section) => {
            const sectionItems = lineItems.filter((li) => li.sectionId === section.id)
            if (sectionItems.length === 0) return null

            return (
              <div key={section.id} className="space-y-3">
                {/* Section Header */}
                <div className="flex items-center gap-2 border-b pb-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    {section.name}
                  </h2>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {sectionItems.length} line item{sectionItems.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Line Items within this section */}
                <div className="space-y-3">
                  {sectionItems.map((li) => {
                    const area = li.areaId ? areaMap.get(li.areaId) : undefined
                    return (
                      <QuotationLineItemCard
                        key={li.id}
                        item={li}
                        area={area}
                        rows={getRows(li.id)}
                        viewMode={viewMode}
                        onChangeRow={(ri, field, val) => updateRow(li.id, ri, field, val)}
                        onUpdateVariant={(ri, field, val) => updateVariant(li.id, ri, field, val)}
                        onAddRow={() => addRow(li.id, li.id)}
                        onRemoveRow={(ri) => removeRow(li.id, ri)}
                        onLoadPreset={() => loadPreset(li.id, li.id)}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : detailQuotation && !quotation ? (
        <div className="rounded-lg border bg-destructive/5 p-4 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Could not parse quotation content. Please contact admin to re-finalize the quotation.
        </div>
      ) : null}

      {/* ── Extra / Miscellaneous & Wall Paneling Section ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Wall Paneling & Board Specifications (Extra / General)
            </h2>
          </div>
          <button
            onClick={() => loadPreset(EXTRA_KEY)}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            Load Sample Board Catalog (BRD-001 - BRD-008)
          </button>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
          <div className="px-4 py-3 bg-amber-50/40 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Use this table to input Wall Paneling and Board specifications manually across all 10 columns (Item ID, Item Name, Core Thickness, Base Material, Laminate, Surface Code, Size, Unit, Qty, Functional Usage).
            </p>
          </div>
          <div className="p-3">
            <MaterialRowsTable
              rows={getRows(EXTRA_KEY)}
              viewMode={viewMode}
              onChange={(ri, field, val) => updateRow(EXTRA_KEY, ri, field, val)}
              onUpdateVariant={(ri, field, val) => updateVariant(EXTRA_KEY, ri, field, val)}
              onAddRow={() => addRow(EXTRA_KEY, undefined)}
              onRemoveRow={(ri) => removeRow(EXTRA_KEY, ri)}
              onLoadPreset={() => loadPreset(EXTRA_KEY)}
            />
          </div>
        </div>
      </div>

      {/* ── Requisition Notes ── */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Requisition Remarks / Special Factory Notes
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Waterproof BWP grade required for kitchen sink area. Material delivery target Oct 20."
          className="w-full bg-background border border-input rounded-md p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* ── Bottom Save / Submit Bar ── */}
      {totalMaterialRows > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between shadow-lg">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">{totalMaterialRows}</strong> board/material row
            {totalMaterialRows !== 1 ? 's' : ''} across{' '}
            <strong className="text-foreground">{coveredLineItems}</strong> quotation item
            {coveredLineItems !== 1 ? 's' : ''}
            {getRows(EXTRA_KEY).length > 0 && (
              <> + <strong className="text-foreground">{getRows(EXTRA_KEY).length}</strong> general board row{getRows(EXTRA_KEY).length !== 1 ? 's' : ''}</>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave('DRAFT')}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2 text-amber-500" />
              Save Draft
            </button>
            <button
              onClick={() => handleSave('SUBMITTED')}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit to Procurement
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
