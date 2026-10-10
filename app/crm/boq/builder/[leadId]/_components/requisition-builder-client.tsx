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
  Flame,
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
  // Core Structural Board attributes
  itemId?: string
  coreThickness?: string
  baseMaterial?: string
  laminateTopSurface?: string
  surfaceCodeFinish?: string
  sheetSize?: string
  functionalUsage?: string
  qtyLabel?: string

  // Decorative Panels, Louvers & Edge Profiles attributes
  profileType?: string
  material?: string
  accentFinish?: string
  codeVariant?: string
  primaryUsage?: string
  column1?: string
}

/** 1. Core Structural Boards & Plywood Catalog Preset (BRD-001 - BRD-008) */
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

/** 2. Decorative Panels, Louvers & Edge Profiles Catalog Preset (LVR-001 - EDG-002) */
const SAMPLE_LOUVER_PROFILE_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Charcoal Louver Panel',
    specifications: 'Fluted Panel | Charcoal / WPC | Rose Gold Accent | Advance 14081',
    variantAttributes: {
      itemId: 'LVR-001',
      profileType: 'Fluted Panel',
      material: 'Charcoal / WPC',
      accentFinish: 'Rose Gold Accent',
      codeVariant: 'Advance 14081',
      primaryUsage: 'Feature Wall Accent',
      qtyLabel: '27',
    },
    netQuantity: 27,
    wastagePercent: 0,
    finalQuantity: 27,
    unit: 'Pcs',
    productionPhase: 'Feature Wall Accent',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Rose Gold Charcoal Panel',
    specifications: 'Fluted Panel | Charcoal / WPC | Rose Gold Line | Line Type A',
    variantAttributes: {
      itemId: 'LVR-002',
      profileType: 'Fluted Panel',
      material: 'Charcoal / WPC',
      accentFinish: 'Rose Gold Line',
      codeVariant: 'Line Type A',
      primaryUsage: 'Framing Accent',
      qtyLabel: '7',
    },
    netQuantity: 7,
    wastagePercent: 0,
    finalQuantity: 7,
    unit: 'Pcs',
    productionPhase: 'Framing Accent',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Rose Gold Charcoal Panel',
    specifications: 'Fluted Panel | Charcoal / WPC | Rose Gold Line | Line Type B',
    variantAttributes: {
      itemId: 'LVR-003',
      profileType: 'Fluted Panel',
      material: 'Charcoal / WPC',
      accentFinish: 'Rose Gold Line',
      codeVariant: 'Line Type B',
      primaryUsage: 'Secondary Wall Panel',
      qtyLabel: '54',
    },
    netQuantity: 54,
    wastagePercent: 0,
    finalQuantity: 54,
    unit: 'Pcs',
    productionPhase: 'Secondary Wall Panel',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'T-Inlay Metallic Strip',
    specifications: 'T-Profile Bit | Aluminum / Brass | Metallic Rose Gold | T-Bit 10mm',
    variantAttributes: {
      itemId: 'TRM-001',
      profileType: 'T-Profile Bit',
      material: 'Aluminum / Brass',
      accentFinish: 'Metallic Rose Gold',
      codeVariant: 'T-Bit 10mm',
      primaryUsage: 'Groove Accent Inlay',
      qtyLabel: '26',
    },
    netQuantity: 26,
    wastagePercent: 0,
    finalQuantity: 26,
    unit: 'RFT',
    productionPhase: 'Groove Accent Inlay',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Heavy PVC Edge Band',
    specifications: 'Tape Trim | PVC Plastic | Solid White / Grey | 3mm Thickness',
    variantAttributes: {
      itemId: 'EDG-001',
      profileType: 'Tape Trim',
      material: 'PVC Plastic',
      accentFinish: 'Solid White / Grey',
      codeVariant: '3mm Thickness',
      primaryUsage: 'Board Edge Sealing',
      qtyLabel: '4',
    },
    netQuantity: 4,
    wastagePercent: 0,
    finalQuantity: 4,
    unit: 'Pcs',
    productionPhase: 'Board Edge Sealing',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Standard PVC Edge Band',
    specifications: 'Tape Trim | PVC Plastic | Solid White / Grey | 1mm Thickness',
    variantAttributes: {
      itemId: 'EDG-002 (Ext)',
      profileType: 'Tape Trim',
      material: 'PVC Plastic',
      accentFinish: 'Solid White / Grey',
      codeVariant: '1mm Thickness',
      primaryUsage: 'Internal Shelving Edges',
      qtyLabel: 'Catalog',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Roll',
    productionPhase: 'Internal Shelving Edges',
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

type ViewModeType = 'BOARD_SPEC' | 'LOUVER_SPEC' | 'STANDARD'

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
        profileType: attrs.profileType || '',
        material: attrs.material || '',
        accentFinish: attrs.accentFinish || '',
        codeVariant: attrs.codeVariant || '',
        primaryUsage: attrs.primaryUsage || '',
        column1: attrs.column1 || '',
      },
      netQuantity: Number(it.netQuantity) || 1,
      wastagePercent: Number(it.wastagePercent) || 0,
      finalQuantity: Number(it.finalQuantity) || Number(it.netQuantity) || 1,
      unit: it.unit || 'Pcs',
      productionPhase: it.productionPhase || attrs.functionalUsage || attrs.primaryUsage || '',
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
      {/* ── Core Boards Datalists ── */}
      <datalist id="item-id-list">
        <option value="BRD-001" />
        <option value="BRD-002" />
        <option value="BRD-003" />
        <option value="BRD-004" />
        <option value="BRD-005" />
        <option value="BRD-006 (Ext)" />
        <option value="BRD-007 (Ext)" />
        <option value="BRD-008 (Ext)" />
        <option value="LVR-001" />
        <option value="LVR-002" />
        <option value="LVR-003" />
        <option value="TRM-001" />
        <option value="EDG-001" />
        <option value="EDG-002 (Ext)" />
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

      {/* ── Decorative Panels, Louvers & Edge Profiles Datalists ── */}
      <datalist id="profile-type-list">
        <option value="Fluted Panel" />
        <option value="T-Profile Bit" />
        <option value="Tape Trim" />
        <option value="L-Angle Profile" />
        <option value="Corner Trim" />
        <option value="U-Channel" />
        <option value="Groove Inlay" />
      </datalist>

      <datalist id="louver-material-list">
        <option value="Charcoal / WPC" />
        <option value="Aluminum / Brass" />
        <option value="PVC Plastic" />
        <option value="MDF Core" />
        <option value="Solid Wood" />
        <option value="Acrylic" />
      </datalist>

      <datalist id="accent-finish-list">
        <option value="Rose Gold Accent" />
        <option value="Rose Gold Line" />
        <option value="Metallic Rose Gold" />
        <option value="Solid White / Grey" />
        <option value="Matte Black" />
        <option value="Gold Anodized" />
        <option value="Silver Brushed" />
      </datalist>

      <datalist id="code-variant-list">
        <option value="Advance 14081" />
        <option value="Line Type A" />
        <option value="Line Type B" />
        <option value="T-Bit 10mm" />
        <option value="3mm Thickness" />
        <option value="1mm Thickness" />
      </datalist>

      <datalist id="primary-usage-list">
        <option value="Feature Wall Accent" />
        <option value="Framing Accent" />
        <option value="Secondary Wall Panel" />
        <option value="Groove Accent Inlay" />
        <option value="Board Edge Sealing" />
        <option value="Internal Shelving Edges" />
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
  onLoadLouverPreset,
}: {
  rows: RequisitionItemInput[]
  viewMode: ViewModeType
  onChange: (rowIndex: number, field: keyof RequisitionItemInput, value: any) => void
  onUpdateVariant: (rowIndex: number, field: keyof BoardVariantAttributes, value: string) => void
  onAddRow: () => void
  onRemoveRow: (rowIndex: number) => void
  onLoadPreset?: () => void
  onLoadLouverPreset?: () => void
}) {
  return (
    <div className="border border-dashed border-border rounded-lg overflow-hidden">
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground/60">
            <Package className="w-5 h-5" />
            <span>No wall paneling or material specifications added yet.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-md transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Load Louvers & Edge Profiles (LVR-001 - EDG-002)
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'BOARD_SPEC' ? (
        /* ── 1. Core Structural Boards & Plywood Table (10 Cols) ── */
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
      ) : viewMode === 'LOUVER_SPEC' ? (
        /* ── 2. Decorative Panels, Louvers & Edge Profiles Table (10 Cols) ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px]">
            <thead className="text-muted-foreground uppercase bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900">
              <tr>
                <th className="px-2.5 py-2 font-semibold w-28 text-indigo-900 dark:text-indigo-200">Item ID</th>
                <th className="px-2.5 py-2 font-semibold min-w-[160px] text-indigo-900 dark:text-indigo-200">Item Name</th>
                <th className="px-2.5 py-2 font-semibold min-w-[130px] text-indigo-900 dark:text-indigo-200">Profile / Type</th>
                <th className="px-2.5 py-2 font-semibold min-w-[130px] text-indigo-900 dark:text-indigo-200">Material</th>
                <th className="px-2.5 py-2 font-semibold min-w-[140px] text-indigo-900 dark:text-indigo-200">Accent Finish</th>
                <th className="px-2.5 py-2 font-semibold min-w-[140px] text-indigo-900 dark:text-indigo-200">Code / Variant</th>
                <th className="px-2.5 py-2 font-semibold w-20 text-indigo-900 dark:text-indigo-200">Unit</th>
                <th className="px-2.5 py-2 font-semibold text-center w-24 text-indigo-900 dark:text-indigo-200">Quantity</th>
                <th className="px-2.5 py-2 font-semibold min-w-[160px] text-indigo-900 dark:text-indigo-200">Primary Usage</th>
                <th className="px-2.5 py-2 font-semibold w-28 text-indigo-900 dark:text-indigo-200">Notes / Col 1</th>
                <th className="px-2 py-2 font-semibold w-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-colors">
                    {/* 1. Item ID */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="item-id-list"
                        value={attrs.itemId || ''}
                        onChange={(e) => onUpdateVariant(ri, 'itemId', e.target.value)}
                        placeholder="LVR-001"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* 2. Item Name */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        value={item.materialName}
                        onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                        placeholder="e.g. Charcoal Louver Panel"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* 3. Profile/Type */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="profile-type-list"
                        value={attrs.profileType || ''}
                        onChange={(e) => onUpdateVariant(ri, 'profileType', e.target.value)}
                        placeholder="Fluted Panel"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* 4. Material */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="louver-material-list"
                        value={attrs.material || ''}
                        onChange={(e) => onUpdateVariant(ri, 'material', e.target.value)}
                        placeholder="Charcoal / WPC"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* 5. Accent Finish */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="accent-finish-list"
                        value={attrs.accentFinish || ''}
                        onChange={(e) => onUpdateVariant(ri, 'accentFinish', e.target.value)}
                        placeholder="Rose Gold Accent"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* 6. Code / Variant */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="code-variant-list"
                        value={attrs.codeVariant || ''}
                        onChange={(e) => onUpdateVariant(ri, 'codeVariant', e.target.value)}
                        placeholder="Advance 14081"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* 7. Unit */}
                    <td className="px-2.5 py-2">
                      <select
                        value={item.unit}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                      >
                        {UOM_OPTIONS.map((uom) => (
                          <option key={uom} value={uom}>
                            {uom}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 8. Quantity */}
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
                        placeholder="27 or Catalog"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs text-center font-bold text-indigo-700 dark:text-indigo-300 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* 9. Primary Usage */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="primary-usage-list"
                        value={attrs.primaryUsage || item.productionPhase || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'primaryUsage', e.target.value)
                          onChange(ri, 'productionPhase', e.target.value)
                        }}
                        placeholder="Feature Wall Accent"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* 10. Notes / Column 1 */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        value={attrs.column1 || ''}
                        onChange={(e) => onUpdateVariant(ri, 'column1', e.target.value)}
                        placeholder="Remarks / Specs"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
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
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── 3. Standard 8-Column Material Table ── */
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
          Add Material Row
        </button>

        <div className="flex items-center gap-3">
          {onLoadPreset && rows.length > 0 && (
            <button
              onClick={onLoadPreset}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-3 h-3 text-amber-500" />
              + Add Core Boards (BRD-001 - BRD-008)
            </button>
          )}
          {onLoadLouverPreset && rows.length > 0 && (
            <button
              onClick={onLoadLouverPreset}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              + Add Louvers & Edge Profiles (LVR-001 - EDG-002)
            </button>
          )}
        </div>
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
  onLoadLouverPreset,
}: {
  item: QuotationLineItem
  area?: QuotationArea
  rows: RequisitionItemInput[]
  viewMode: ViewModeType
  onChangeRow: (rowIndex: number, field: keyof RequisitionItemInput, value: any) => void
  onUpdateVariant: (rowIndex: number, field: keyof BoardVariantAttributes, value: string) => void
  onAddRow: () => void
  onRemoveRow: (rowIndex: number) => void
  onLoadPreset: () => void
  onLoadLouverPreset: () => void
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
            {rows.length} material row{rows.length !== 1 ? 's' : ''}
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
            onLoadLouverPreset={onLoadLouverPreset}
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
  const [viewMode, setViewMode] = useState<ViewModeType>('BOARD_SPEC')

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
    // Default: seed Extra section with user wall panel core boards sample table if completely empty
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

      // Keep specifications string in sync
      const specParts = [
        nextAttrs.coreThickness || nextAttrs.profileType,
        nextAttrs.baseMaterial || nextAttrs.material,
        nextAttrs.laminateTopSurface || nextAttrs.accentFinish,
        nextAttrs.surfaceCodeFinish || nextAttrs.codeVariant,
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

  const loadLouverPreset = (key: string, quotationLineItemId?: string) => {
    const presetItems = SAMPLE_LOUVER_PROFILE_ITEMS.map((item) => ({
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
          {/* Table View Switcher */}
          <div className="inline-flex items-center rounded-lg border bg-muted/30 p-1 text-xs">
            <button
              onClick={() => setViewMode('BOARD_SPEC')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                viewMode === 'BOARD_SPEC'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-primary" /> Core Boards (10 Cols)
            </button>
            <button
              onClick={() => setViewMode('LOUVER_SPEC')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                viewMode === 'LOUVER_SPEC'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Louvers & Edge Profiles (10 Cols)
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
              Expand each quotation line item below to enter <strong>Core Boards & Plywood</strong> or <strong>Decorative Panels, Louvers & Edge Profiles</strong>.
              You can toggle between view modes at the top right.
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
                        onLoadLouverPreset={() => loadLouverPreset(li.id, li.id)}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Wall Paneling & Decorative Profiles (Extra / General)
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadPreset(EXTRA_KEY)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              Load Core Boards (BRD-001 - BRD-008)
            </button>
            <button
              onClick={() => loadLouverPreset(EXTRA_KEY)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 rounded-md transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Load Louvers & Profiles (LVR-001 - EDG-002)
            </button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
          <div className="px-4 py-3 bg-amber-50/40 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Manage Core Boards, Louvers, Fluted Panels, Metallic Inlays, and Edge Banding. Use the view toggle at top right to switch table structures.
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
              onLoadLouverPreset={() => loadLouverPreset(EXTRA_KEY)}
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
            <strong className="text-foreground">{totalMaterialRows}</strong> material row
            {totalMaterialRows !== 1 ? 's' : ''} across{' '}
            <strong className="text-foreground">{coveredLineItems}</strong> quotation item
            {coveredLineItems !== 1 ? 's' : ''}
            {getRows(EXTRA_KEY).length > 0 && (
              <> + <strong className="text-foreground">{getRows(EXTRA_KEY).length}</strong> general material row{getRows(EXTRA_KEY).length !== 1 ? 's' : ''}</>
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
