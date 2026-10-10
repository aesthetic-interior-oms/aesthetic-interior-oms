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
  Wrench,
  Pin,
  FlaskConical,
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

const UOM_OPTIONS = ['Pcs', 'Sheets', 'Meters', 'RFT', 'Kg', 'Rolls', 'Pack', 'Boxes', 'Sets', 'Liters', 'Tube', 'Roll']

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

  // Screws & Structural Fasteners attributes
  fastenerType?: string
  lengthInches?: string
  gaugeSize?: string
  materialFinish?: string
  usagePurpose?: string

  // Nails, Pins & Masonry Anchors attributes
  nailType?: string
  lengthSpec?: string
  thicknessSpec?: string

  // Adhesives & Chemical Solvents attributes
  chemicalClass?: string
  applicationMethod?: string

  column1?: string

  /** Persists the WallPanelingSubType so items can be re-grouped into sections on reload */
  wpSubType?: string
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

/** 3. Screws & Structural Fasteners Catalog Preset (SCR-075 - SCR-250) */
const SAMPLE_SCREW_FASTENER_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Hardware Screw',
    specifications: 'Wood Screw | 0.75" (3/4") | #6 Countered | Zinc Coated',
    variantAttributes: {
      itemId: 'SCR-075',
      fastenerType: 'Wood Screw',
      lengthInches: '0.75" (3/4")',
      gaugeSize: '#6 Countered',
      materialFinish: 'Zinc Coated',
      usagePurpose: 'Hinges & Drawer Runners',
      qtyLabel: '300',
    },
    netQuantity: 300,
    wastagePercent: 0,
    finalQuantity: 300,
    unit: 'Pcs',
    productionPhase: 'Hinges & Drawer Runners',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Medium Joinery Screw',
    specifications: 'Wood Screw | 1.25" | #7 Countered | Black Phosphate',
    variantAttributes: {
      itemId: 'SCR-125',
      fastenerType: 'Wood Screw',
      lengthInches: '1.25"',
      gaugeSize: '#7 Countered',
      materialFinish: 'Black Phosphate',
      usagePurpose: 'Carcass Box Assembly',
      qtyLabel: '700',
    },
    netQuantity: 700,
    wastagePercent: 0,
    finalQuantity: 700,
    unit: 'Pcs',
    productionPhase: 'Carcass Box Assembly',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Frame Joinery Screw',
    specifications: 'Wood Screw | 1.50" | #8 Heavy | Zinc Coated',
    variantAttributes: {
      itemId: 'SCR-150',
      fastenerType: 'Wood Screw',
      lengthInches: '1.50"',
      gaugeSize: '#8 Heavy',
      materialFinish: 'Zinc Coated',
      usagePurpose: 'Wall Cabinet Mounting',
      qtyLabel: '400',
    },
    netQuantity: 400,
    wastagePercent: 0,
    finalQuantity: 400,
    unit: 'Pcs',
    productionPhase: 'Wall Cabinet Mounting',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Anchor Screw',
    specifications: 'Wood Screw | 2.00" | #8 Wall Plug | Steel',
    variantAttributes: {
      itemId: 'SCR-200',
      fastenerType: 'Wood Screw',
      lengthInches: '2.00"',
      gaugeSize: '#8 Wall Plug',
      materialFinish: 'Steel',
      usagePurpose: 'Frame Anchor / Wall',
      qtyLabel: '21',
    },
    netQuantity: 21,
    wastagePercent: 0,
    finalQuantity: 21,
    unit: 'Pcs',
    productionPhase: 'Frame Anchor / Wall',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Deep Structural Screw',
    specifications: 'Wood Screw | 2.50" | #10 Heavy Duty | Hardened Steel',
    variantAttributes: {
      itemId: 'SCR-250',
      fastenerType: 'Wood Screw',
      lengthInches: '2.50"',
      gaugeSize: '#10 Heavy Duty',
      materialFinish: 'Hardened Steel',
      usagePurpose: 'Heavy Wall Cleat / Base',
      qtyLabel: '300',
    },
    netQuantity: 300,
    wastagePercent: 0,
    finalQuantity: 300,
    unit: 'Pcs',
    productionPhase: 'Heavy Wall Cleat / Base',
  },
]

/** 4. Nails, Pins & Masonry Anchors Catalog Preset (NAL-200 - PIN-002) */
const SAMPLE_NAIL_PIN_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Wire Nail (Tarkata)',
    specifications: 'Wire Nail | 2.0" | Standard Gauge',
    variantAttributes: {
      itemId: 'NAL-200',
      nailType: 'Wire Nail',
      lengthSpec: '2.0"',
      thicknessSpec: 'Standard Gauge',
      functionalUsage: 'Frame Tacking',
      qtyLabel: '300',
    },
    netQuantity: 300,
    wastagePercent: 0,
    finalQuantity: 300,
    unit: 'Pcs',
    productionPhase: 'Frame Tacking',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Wood Nail Bulk',
    specifications: 'Loose Nail | 1.25" | Fine Gauge',
    variantAttributes: {
      itemId: 'NAL-125',
      nailType: 'Loose Nail',
      lengthSpec: '1.25"',
      thicknessSpec: 'Fine Gauge',
      functionalUsage: 'Plywood Sub-frame',
      qtyLabel: '3',
    },
    netQuantity: 3,
    wastagePercent: 0,
    finalQuantity: 3,
    unit: 'Kg',
    productionPhase: 'Plywood Sub-frame',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Masonry Steel Nail',
    specifications: 'Hardened Steel | 0.5" | Short Masonry',
    variantAttributes: {
      itemId: 'NAL-050',
      nailType: 'Hardened Steel',
      lengthSpec: '0.5"',
      thicknessSpec: 'Short Masonry',
      functionalUsage: 'Concrete Wall Fixing',
      qtyLabel: '1',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Kg',
    productionPhase: 'Concrete Wall Fixing',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Both Side Pin',
    specifications: 'Double Head Pin | Standard | Clamping Pin',
    variantAttributes: {
      itemId: 'PIN-001',
      nailType: 'Double Head Pin',
      lengthSpec: 'Standard',
      thicknessSpec: 'Clamping Pin',
      functionalUsage: 'Laminate Holding',
      qtyLabel: '1',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pack',
    productionPhase: 'Laminate Holding',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'F30 Brad Nails',
    specifications: 'Pneumatic Pin | 1.18" (30mm) | Gauge 18',
    variantAttributes: {
      itemId: 'PIN-002 (Ext)',
      nailType: 'Pneumatic Pin',
      lengthSpec: '1.18" (30mm)',
      thicknessSpec: 'Gauge 18',
      functionalUsage: 'Nail Gun Finishing',
      qtyLabel: 'Catalog',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Box',
    productionPhase: 'Nail Gun Finishing',
  },
]

/** 5. Adhesives & Chemical Solvents Catalog Preset (ADH-001 - ADH-005) */
const SAMPLE_ADHESIVE_CHEMICAL_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Lichu Gum',
    specifications: 'PVA Wood Adhesive | Cold Press Wood Joinery',
    variantAttributes: {
      itemId: 'ADH-001',
      chemicalClass: 'PVA Wood Adhesive',
      applicationMethod: 'Cold Press Wood Joinery',
      functionalUsage: 'Cold Press Wood Joinery',
      qtyLabel: '15',
    },
    netQuantity: 15,
    wastagePercent: 0,
    finalQuantity: 15,
    unit: 'Kg',
    productionPhase: 'Cold Press Wood Joinery',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Super Glue',
    specifications: 'Cyanoacrylate | Instant Edge & Trim Bond',
    variantAttributes: {
      itemId: 'ADH-002',
      chemicalClass: 'Cyanoacrylate',
      applicationMethod: 'Instant Edge & Trim Bond',
      functionalUsage: 'Instant Edge & Trim Bond',
      qtyLabel: '3',
    },
    netQuantity: 3,
    wastagePercent: 0,
    finalQuantity: 3,
    unit: 'Kg',
    productionPhase: 'Instant Edge & Trim Bond',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Poli Solution Gum',
    specifications: 'Contact Adhesive (Neoprene) | Manual Laminate Pressing',
    variantAttributes: {
      itemId: 'ADH-003',
      chemicalClass: 'Contact Adhesive (Neoprene)',
      applicationMethod: 'Manual Laminate Pressing',
      functionalUsage: 'Manual Laminate Pressing',
      qtyLabel: '4',
    },
    netQuantity: 4,
    wastagePercent: 0,
    finalQuantity: 4,
    unit: 'Pack',
    productionPhase: 'Manual Laminate Pressing',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Aika Gum',
    specifications: 'Binding / Double Tape | Edge Fixing / Hold',
    variantAttributes: {
      itemId: 'ADH-004',
      chemicalClass: 'Binding / Double Tape',
      applicationMethod: 'Edge Fixing / Hold',
      functionalUsage: 'Edge Fixing / Hold',
      qtyLabel: '1',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Roll',
    productionPhase: 'Edge Fixing / Hold',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Silicone Sealant',
    specifications: 'Neutral Cure Silicone | Sink / Marble Joint Sealing',
    variantAttributes: {
      itemId: 'ADH-005 (Ext)',
      chemicalClass: 'Neutral Cure Silicone',
      applicationMethod: 'Sink / Marble Joint Sealing',
      functionalUsage: 'Sink / Marble Joint Sealing',
      qtyLabel: 'Catalog',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Tube',
    productionPhase: 'Sink / Marble Joint Sealing',
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
// ── Section-based architecture ──
export type WallPanelingSubType = 'CORE_BOARDS' | 'LOUVERS_PROFILES' | 'SCREWS_FASTENERS' | 'NAILS_PINS' | 'ADHESIVES'

interface CardSection {
  id: string
  category: RequisitionWorkCategory
  wallPanelingSubType?: WallPanelingSubType
  collapsed: boolean
}

type SectionsMap = Record<string, CardSection[]>
/** ItemsMap key = `${cardKey}::${sectionId}` */
type ItemsMap = Record<string, RequisitionItemInput[]>

type ViewModeType = 'BOARD_SPEC' | 'LOUVER_SPEC' | 'SCREW_SPEC' | 'NAIL_SPEC' | 'ADHESIVE_SPEC' | 'STANDARD'

const WALL_PANELING_SUBTYPES: { key: WallPanelingSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'CORE_BOARDS',      label: '🪵 Core Structural Boards & Plywood',          viewMode: 'BOARD_SPEC'    },
  { key: 'LOUVERS_PROFILES', label: '✨ Decorative Panels, Louvers & Edge Profiles', viewMode: 'LOUVER_SPEC'   },
  { key: 'SCREWS_FASTENERS', label: '🔩 Screws & Structural Fasteners',             viewMode: 'SCREW_SPEC'    },
  { key: 'NAILS_PINS',       label: '📌 Nails, Pins & Masonry Anchors',             viewMode: 'NAIL_SPEC'     },
  { key: 'ADHESIVES',        label: '🧪 Adhesives & Chemical Solvents',             viewMode: 'ADHESIVE_SPEC' },
]

const CATEGORY_COLORS: Record<RequisitionWorkCategory, { bg: string; text: string; border: string }> = {
  WALL_PANELING:    { bg: 'bg-blue-50 dark:bg-blue-950/30',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-800'    },
  CEILING:          { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  CABINETS_CLOSETS: { bg: 'bg-amber-50 dark:bg-amber-950/30',  text: 'text-amber-700 dark:text-amber-300',  border: 'border-amber-200 dark:border-amber-800'  },
  FURNITURE:        { bg: 'bg-green-50 dark:bg-green-950/30',  text: 'text-green-700 dark:text-green-300',  border: 'border-green-200 dark:border-green-800'  },
  ACCESSORIES:      { bg: 'bg-pink-50 dark:bg-pink-950/30',    text: 'text-pink-700 dark:text-pink-300',    border: 'border-pink-200 dark:border-pink-800'    },
  ELECTRICAL_WORK:  { bg: 'bg-yellow-50 dark:bg-yellow-950/30',text: 'text-yellow-700 dark:text-yellow-300',border: 'border-yellow-200 dark:border-yellow-800' },
  PAINT:            { bg: 'bg-indigo-50 dark:bg-indigo-950/30',text: 'text-indigo-700 dark:text-indigo-300',border: 'border-indigo-200 dark:border-indigo-800' },
  APPLIANCES:       { bg: 'bg-teal-50 dark:bg-teal-950/30',   text: 'text-teal-700 dark:text-teal-300',   border: 'border-teal-200 dark:border-teal-800'    },
}

function getViewModeForSection(section: CardSection): ViewModeType {
  if (section.category !== 'WALL_PANELING') return 'STANDARD'
  switch (section.wallPanelingSubType) {
    case 'CORE_BOARDS':      return 'BOARD_SPEC'
    case 'LOUVERS_PROFILES': return 'LOUVER_SPEC'
    case 'SCREWS_FASTENERS': return 'SCREW_SPEC'
    case 'NAILS_PINS':       return 'NAIL_SPEC'
    case 'ADHESIVES':        return 'ADHESIVE_SPEC'
    default:                 return 'BOARD_SPEC'
  }
}

function sectionItemKey(cardKey: string, sectionId: string): string {
  return `${cardKey}::${sectionId}`
}

/* ─────────────────────────────────────────────
   Helper – build a blank requisition item
───────────────────────────────────────────── */
function blankItem(
  category: RequisitionWorkCategory = 'WALL_PANELING',
  subType?: WallPanelingSubType,
  quotationLineItemId?: string,
): RequisitionItemInput {
  const base: RequisitionItemInput = {
    quotationLineItemId,
    workCategory: category,
    materialName: '',
    specifications: '',
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: '',
    remarks: '',
    variantAttributes: {},
  }
  switch (subType) {
    case 'LOUVERS_PROFILES':
      return { ...base, variantAttributes: { itemId: '', profileType: '', material: '', accentFinish: '', codeVariant: '', primaryUsage: '', qtyLabel: '1', wpSubType: 'LOUVERS_PROFILES' } }
    case 'SCREWS_FASTENERS':
      return { ...base, variantAttributes: { itemId: '', fastenerType: '', lengthInches: '', gaugeSize: '', materialFinish: '', usagePurpose: '', qtyLabel: '1', wpSubType: 'SCREWS_FASTENERS' } }
    case 'NAILS_PINS':
      return { ...base, variantAttributes: { itemId: '', nailType: '', lengthSpec: '', thicknessSpec: '', functionalUsage: '', qtyLabel: '1', wpSubType: 'NAILS_PINS' } }
    case 'ADHESIVES':
      return { ...base, variantAttributes: { itemId: '', chemicalClass: '', applicationMethod: '', qtyLabel: '1', wpSubType: 'ADHESIVES' } }
    default:
      return { ...base, variantAttributes: { itemId: '', coreThickness: '', baseMaterial: '', laminateTopSurface: '', surfaceCodeFinish: '', sheetSize: "8' x 4'", functionalUsage: '', qtyLabel: '1', wpSubType: subType ?? 'CORE_BOARDS' } }
  }
}

/* ─────────────────────────────────────────────
   Helper – flatten ItemsMap → flat array for save
───────────────────────────────────────────── */
function flattenItems(map: ItemsMap): RequisitionItemInput[] {
  return Object.values(map).flat()
}

/* ─────────────────────────────────────────────
   Helper – seed state from existing saved items
───────────────────────────────────────────── */
function seedFromExisting(rawItems: any[]): { sectionsMap: SectionsMap; itemsMap: ItemsMap } {
  const sectionsMap: SectionsMap = {}
  const itemsMap: ItemsMap = {}
  const sectionRegistry: Record<string, string> = {}

  for (const it of rawItems) {
    const cardKey: string = it.quotationLineItemId || EXTRA_KEY

    let attrs: BoardVariantAttributes = {}
    if (typeof it.variantAttributes === 'string') {
      try { attrs = JSON.parse(it.variantAttributes) } catch { attrs = {} }
    } else if (it.variantAttributes && typeof it.variantAttributes === 'object') {
      attrs = it.variantAttributes
    }

    const category: RequisitionWorkCategory = it.workCategory || 'WALL_PANELING'
    const wpSubType = attrs.wpSubType as WallPanelingSubType | undefined

    // Find or create a section for this (cardKey, category, wpSubType) combo
    const regKey = `${cardKey}::${category}::${wpSubType ?? ''}`
    let sectionId = sectionRegistry[regKey]
    if (!sectionId) {
      sectionId = `section-${Object.keys(sectionRegistry).length}`
      sectionRegistry[regKey] = sectionId
      if (!sectionsMap[cardKey]) sectionsMap[cardKey] = []
      sectionsMap[cardKey].push({ id: sectionId, category, wallPanelingSubType: wpSubType, collapsed: false })
    }

    const key = sectionItemKey(cardKey, sectionId)
    if (!itemsMap[key]) itemsMap[key] = []

    itemsMap[key].push({
      id: it.id,
      quotationLineItemId: it.quotationLineItemId || undefined,
      workCategory: category,
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
        fastenerType: attrs.fastenerType || '',
        lengthInches: attrs.lengthInches || '',
        gaugeSize: attrs.gaugeSize || '',
        materialFinish: attrs.materialFinish || '',
        usagePurpose: attrs.usagePurpose || '',
        nailType: attrs.nailType || '',
        lengthSpec: attrs.lengthSpec || '',
        thicknessSpec: attrs.thicknessSpec || '',
        chemicalClass: attrs.chemicalClass || '',
        applicationMethod: attrs.applicationMethod || '',
        column1: attrs.column1 || '',
        wpSubType: attrs.wpSubType || '',
      },
      netQuantity: Number(it.netQuantity) || 1,
      wastagePercent: Number(it.wastagePercent) || 0,
      finalQuantity: Number(it.finalQuantity) || Number(it.netQuantity) || 1,
      unit: it.unit || 'Pcs',
      productionPhase: it.productionPhase || attrs.functionalUsage || attrs.primaryUsage || attrs.usagePurpose || attrs.applicationMethod || '',
      remarks: it.remarks || '',
    })
  }

  return { sectionsMap, itemsMap }
}

function computeInitialState(existingRequisition: Props['existingRequisition']): { sectionsMap: SectionsMap; itemsMap: ItemsMap } {
  if (existingRequisition?.items && existingRequisition.items.length > 0) {
    return seedFromExisting(existingRequisition.items)
  }
  const defaultSectionId = 'section-default'
  return {
    sectionsMap: {
      [EXTRA_KEY]: [{ id: defaultSectionId, category: 'WALL_PANELING', wallPanelingSubType: 'CORE_BOARDS', collapsed: false }],
    },
    itemsMap: {
      [sectionItemKey(EXTRA_KEY, defaultSectionId)]: [...SAMPLE_WALL_PANEL_ITEMS],
    },
  }
}

/* ─────────────────────────────────────────────
   Sub-component: Datalist Autocomplete Providers
───────────────────────────────────────────── */
function BoardDatalists() {
  return (
    <>
      {/* ── Item ID List ── */}
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
        <option value="SCR-075" />
        <option value="SCR-125" />
        <option value="SCR-150" />
        <option value="SCR-200" />
        <option value="SCR-250" />
        <option value="NAL-200" />
        <option value="NAL-125" />
        <option value="NAL-050" />
        <option value="PIN-001" />
        <option value="PIN-002 (Ext)" />
        <option value="ADH-001" />
        <option value="ADH-002" />
        <option value="ADH-003" />
        <option value="ADH-004" />
        <option value="ADH-005 (Ext)" />
      </datalist>

      {/* ── Core Boards Datalists ── */}
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

      {/* ── Screws & Structural Fasteners Datalists ── */}
      <datalist id="fastener-type-list">
        <option value="Wood Screw" />
        <option value="Drywall Screw" />
        <option value="Self Tapping Screw" />
        <option value="Concrete Anchor" />
        <option value="Machine Bolt" />
      </datalist>

      <datalist id="fastener-length-list">
        <option value='0.75" (3/4")' />
        <option value='1.25"' />
        <option value='1.50"' />
        <option value='2.00"' />
        <option value='2.50"' />
        <option value='3.00"' />
      </datalist>

      <datalist id="gauge-size-list">
        <option value="#6 Countered" />
        <option value="#7 Countered" />
        <option value="#8 Heavy" />
        <option value="#8 Wall Plug" />
        <option value="#10 Heavy Duty" />
      </datalist>

      <datalist id="fastener-finish-list">
        <option value="Zinc Coated" />
        <option value="Black Phosphate" />
        <option value="Steel" />
        <option value="Hardened Steel" />
        <option value="Brass Plated" />
        <option value="Stainless Steel" />
      </datalist>

      <datalist id="usage-purpose-list">
        <option value="Hinges & Drawer Runners" />
        <option value="Carcass Box Assembly" />
        <option value="Wall Cabinet Mounting" />
        <option value="Frame Anchor / Wall" />
        <option value="Heavy Wall Cleat / Base" />
      </datalist>

      {/* ── Nails, Pins & Anchors Datalists ── */}
      <datalist id="nail-type-list">
        <option value="Wire Nail" />
        <option value="Loose Nail" />
        <option value="Hardened Steel" />
        <option value="Double Head Pin" />
        <option value="Pneumatic Pin" />
      </datalist>

      {/* ── Adhesives & Chemical Solvents Datalists ── */}
      <datalist id="chemical-class-list">
        <option value="PVA Wood Adhesive" />
        <option value="Cyanoacrylate" />
        <option value="Contact Adhesive (Neoprene)" />
        <option value="Binding / Double Tape" />
        <option value="Neutral Cure Silicone" />
        <option value="PU Foam Sealant" />
      </datalist>

      <datalist id="application-method-list">
        <option value="Cold Press Wood Joinery" />
        <option value="Instant Edge & Trim Bond" />
        <option value="Manual Laminate Pressing" />
        <option value="Edge Fixing / Hold" />
        <option value="Sink / Marble Joint Sealing" />
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
  onLoadScrewPreset,
  onLoadNailPreset,
  onLoadAdhesivePreset,
}: {
  rows: RequisitionItemInput[]
  viewMode: ViewModeType
  onChange: (rowIndex: number, field: keyof RequisitionItemInput, value: any) => void
  onUpdateVariant: (rowIndex: number, field: keyof BoardVariantAttributes, value: string) => void
  onAddRow: () => void
  onRemoveRow: (rowIndex: number) => void
  onLoadPreset?: () => void
  onLoadLouverPreset?: () => void
  onLoadScrewPreset?: () => void
  onLoadNailPreset?: () => void
  onLoadAdhesivePreset?: () => void
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
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Load Louvers & Profiles (LVR-001 - EDG-002)
              </button>
            )}
            {onLoadScrewPreset && (
              <button
                onClick={onLoadScrewPreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 rounded-md transition-colors"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600" /> Load Screws & Fasteners (SCR-075 - SCR-250)
              </button>
            )}
            {onLoadNailPreset && (
              <button
                onClick={onLoadNailPreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 rounded-md transition-colors"
              >
                <Pin className="w-3.5 h-3.5 text-rose-600" /> Load Nails & Pins (NAL-200 - PIN-002)
              </button>
            )}
            {onLoadAdhesivePreset && (
              <button
                onClick={onLoadAdhesivePreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-md transition-colors"
              >
                <FlaskConical className="w-3.5 h-3.5 text-emerald-600" /> Load Adhesives (ADH-001 - ADH-005)
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
      ) : viewMode === 'SCREW_SPEC' ? (
        /* ── 3. Screws & Structural Fasteners Table (10 Cols) ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px]">
            <thead className="text-muted-foreground uppercase bg-amber-50/60 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900">
              <tr>
                <th className="px-2.5 py-2 font-semibold w-28 text-amber-900 dark:text-amber-200">Item ID</th>
                <th className="px-2.5 py-2 font-semibold min-w-[160px] text-amber-900 dark:text-amber-200">Item Name</th>
                <th className="px-2.5 py-2 font-semibold min-w-[130px] text-amber-900 dark:text-amber-200">Fastener Type</th>
                <th className="px-2.5 py-2 font-semibold w-28 text-amber-900 dark:text-amber-200">Length (Inches)</th>
                <th className="px-2.5 py-2 font-semibold min-w-[130px] text-amber-900 dark:text-amber-200">Gauge / Size</th>
                <th className="px-2.5 py-2 font-semibold min-w-[140px] text-amber-900 dark:text-amber-200">Material / Finish</th>
                <th className="px-2.5 py-2 font-semibold w-20 text-amber-900 dark:text-amber-200">Unit</th>
                <th className="px-2.5 py-2 font-semibold text-center w-24 text-amber-900 dark:text-amber-200">Quantity</th>
                <th className="px-2.5 py-2 font-semibold min-w-[160px] text-amber-900 dark:text-amber-200">Usage Purpose</th>
                <th className="px-2.5 py-2 font-semibold w-28 text-amber-900 dark:text-amber-200">Notes / Col 1</th>
                <th className="px-2 py-2 font-semibold w-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="hover:bg-amber-50/20 dark:hover:bg-amber-950/20 transition-colors">
                    {/* 1. Item ID */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="item-id-list"
                        value={attrs.itemId || ''}
                        onChange={(e) => onUpdateVariant(ri, 'itemId', e.target.value)}
                        placeholder="SCR-075"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs font-mono font-semibold text-amber-700 dark:text-amber-300 focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 2. Item Name */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        value={item.materialName}
                        onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                        placeholder="e.g. Hardware Screw"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs font-semibold focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 3. Fastener Type */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="fastener-type-list"
                        value={attrs.fastenerType || ''}
                        onChange={(e) => onUpdateVariant(ri, 'fastenerType', e.target.value)}
                        placeholder="Wood Screw"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 4. Length (Inches) */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="fastener-length-list"
                        value={attrs.lengthInches || ''}
                        onChange={(e) => onUpdateVariant(ri, 'lengthInches', e.target.value)}
                        placeholder='0.75" (3/4")'
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 5. Gauge / Size */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="gauge-size-list"
                        value={attrs.gaugeSize || ''}
                        onChange={(e) => onUpdateVariant(ri, 'gaugeSize', e.target.value)}
                        placeholder="#6 Countered"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 6. Material / Finish */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="fastener-finish-list"
                        value={attrs.materialFinish || ''}
                        onChange={(e) => onUpdateVariant(ri, 'materialFinish', e.target.value)}
                        placeholder="Zinc Coated"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 7. Unit */}
                    <td className="px-2.5 py-2">
                      <select
                        value={item.unit}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-amber-500"
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
                        placeholder="300"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs text-center font-bold text-amber-700 dark:text-amber-300 focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 9. Usage Purpose */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="usage-purpose-list"
                        value={attrs.usagePurpose || item.productionPhase || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'usagePurpose', e.target.value)
                          onChange(ri, 'productionPhase', e.target.value)
                        }}
                        placeholder="Hinges & Drawer Runners"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 10. Notes / Column 1 */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        value={attrs.column1 || ''}
                        onChange={(e) => onUpdateVariant(ri, 'column1', e.target.value)}
                        placeholder="Remarks / Specs"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-amber-500"
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
      ) : viewMode === 'NAIL_SPEC' ? (
        /* ── 4. Nails, Pins & Masonry Anchors Table (10 Cols) ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px]">
            <thead className="text-muted-foreground uppercase bg-rose-50/60 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900">
              <tr>
                <th className="px-2.5 py-2 font-semibold w-28 text-rose-900 dark:text-rose-200">Item ID</th>
                <th className="px-2.5 py-2 font-semibold min-w-[160px] text-rose-900 dark:text-rose-200">Item Name</th>
                <th className="px-2.5 py-2 font-semibold min-w-[130px] text-rose-900 dark:text-rose-200">Type</th>
                <th className="px-2.5 py-2 font-semibold w-28 text-rose-900 dark:text-rose-200">Length</th>
                <th className="px-2.5 py-2 font-semibold min-w-[130px] text-rose-900 dark:text-rose-200">Thickness / Spec</th>
                <th className="px-2.5 py-2 font-semibold w-20 text-rose-900 dark:text-rose-200">Unit Type</th>
                <th className="px-2.5 py-2 font-semibold text-center w-24 text-rose-900 dark:text-rose-200">Quantity</th>
                <th className="px-2.5 py-2 font-semibold min-w-[160px] text-rose-900 dark:text-rose-200">Functional Usage</th>
                <th className="px-2.5 py-2 font-semibold w-28 text-rose-900 dark:text-rose-200">Notes / Col 1</th>
                <th className="px-2 py-2 font-semibold w-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="hover:bg-rose-50/20 dark:hover:bg-rose-950/20 transition-colors">
                    {/* 1. Item ID */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="item-id-list"
                        value={attrs.itemId || ''}
                        onChange={(e) => onUpdateVariant(ri, 'itemId', e.target.value)}
                        placeholder="NAL-200"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs font-mono font-semibold text-rose-700 dark:text-rose-300 focus:ring-1 focus:ring-rose-500"
                      />
                    </td>

                    {/* 2. Item Name */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        value={item.materialName}
                        onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                        placeholder="e.g. Wire Nail (Tarkata)"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs font-semibold focus:ring-1 focus:ring-rose-500"
                      />
                    </td>

                    {/* 3. Type */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="nail-type-list"
                        value={attrs.nailType || ''}
                        onChange={(e) => onUpdateVariant(ri, 'nailType', e.target.value)}
                        placeholder="Wire Nail"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-rose-500"
                      />
                    </td>

                    {/* 4. Length */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        value={attrs.lengthSpec || ''}
                        onChange={(e) => onUpdateVariant(ri, 'lengthSpec', e.target.value)}
                        placeholder='2.0"'
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-rose-500"
                      />
                    </td>

                    {/* 5. Thickness / Spec */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        value={attrs.thicknessSpec || ''}
                        onChange={(e) => onUpdateVariant(ri, 'thicknessSpec', e.target.value)}
                        placeholder="Standard Gauge"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-rose-500"
                      />
                    </td>

                    {/* 6. Unit Type */}
                    <td className="px-2.5 py-2">
                      <select
                        value={item.unit}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-rose-500"
                      >
                        {UOM_OPTIONS.map((uom) => (
                          <option key={uom} value={uom}>
                            {uom}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 7. Quantity */}
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
                        placeholder="300"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs text-center font-bold text-rose-700 dark:text-rose-300 focus:ring-1 focus:ring-rose-500"
                      />
                    </td>

                    {/* 8. Functional Usage */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="functional-usage-list"
                        value={attrs.functionalUsage || item.productionPhase || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'functionalUsage', e.target.value)
                          onChange(ri, 'productionPhase', e.target.value)
                        }}
                        placeholder="Frame Tacking"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-rose-500"
                      />
                    </td>

                    {/* 9. Notes / Column 1 */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        value={attrs.column1 || ''}
                        onChange={(e) => onUpdateVariant(ri, 'column1', e.target.value)}
                        placeholder="Remarks / Specs"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-rose-500"
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
      ) : viewMode === 'ADHESIVE_SPEC' ? (
        /* ── 5. Adhesives & Chemical Solvents Table (10 Cols) ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px]">
            <thead className="text-muted-foreground uppercase bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900">
              <tr>
                <th className="px-2.5 py-2 font-semibold w-28 text-emerald-900 dark:text-emerald-200">Item ID</th>
                <th className="px-2.5 py-2 font-semibold min-w-[160px] text-emerald-900 dark:text-emerald-200">Chemical Name</th>
                <th className="px-2.5 py-2 font-semibold min-w-[150px] text-emerald-900 dark:text-emerald-200">Chemical Class</th>
                <th className="px-2.5 py-2 font-semibold w-24 text-emerald-900 dark:text-emerald-200">Packaging Unit</th>
                <th className="px-2.5 py-2 font-semibold text-center w-24 text-emerald-900 dark:text-emerald-200">Quantity</th>
                <th className="px-2.5 py-2 font-semibold min-w-[180px] text-emerald-900 dark:text-emerald-200">Application Method</th>
                <th className="px-2.5 py-2 font-semibold w-28 text-emerald-900 dark:text-emerald-200">Notes / Col 1</th>
                <th className="px-2 py-2 font-semibold w-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-colors">
                    {/* 1. Item ID */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="item-id-list"
                        value={attrs.itemId || ''}
                        onChange={(e) => onUpdateVariant(ri, 'itemId', e.target.value)}
                        placeholder="ADH-001"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300 focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* 2. Chemical Name (Material Name) */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        value={item.materialName}
                        onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                        placeholder="e.g. Lichu Gum"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* 3. Chemical Class */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="chemical-class-list"
                        value={attrs.chemicalClass || ''}
                        onChange={(e) => onUpdateVariant(ri, 'chemicalClass', e.target.value)}
                        placeholder="PVA Wood Adhesive"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* 4. Packaging Unit */}
                    <td className="px-2.5 py-2">
                      <select
                        value={item.unit}
                        onChange={(e) => onChange(ri, 'unit', e.target.value)}
                        className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500"
                      >
                        {UOM_OPTIONS.map((uom) => (
                          <option key={uom} value={uom}>
                            {uom}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 5. Quantity */}
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
                        placeholder="15"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs text-center font-bold text-emerald-700 dark:text-emerald-300 focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* 6. Application Method */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        list="application-method-list"
                        value={attrs.applicationMethod || item.productionPhase || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'applicationMethod', e.target.value)
                          onChange(ri, 'productionPhase', e.target.value)
                        }}
                        placeholder="Cold Press Wood Joinery"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* 7. Notes / Column 1 */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        value={attrs.column1 || ''}
                        onChange={(e) => onUpdateVariant(ri, 'column1', e.target.value)}
                        placeholder="Remarks / Specs"
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500"
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
        /* ── 6. Standard 8-Column Material Table ── */
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

        <div className="flex flex-wrap items-center gap-3">
          {onLoadPreset && rows.length > 0 && (
            <button
              onClick={onLoadPreset}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-3 h-3 text-amber-500" />
              + Add Core Boards (BRD)
            </button>
          )}
          {onLoadLouverPreset && rows.length > 0 && (
            <button
              onClick={onLoadLouverPreset}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              + Add Louvers (LVR/EDG)
            </button>
          )}
          {onLoadScrewPreset && rows.length > 0 && (
            <button
              onClick={onLoadScrewPreset}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline transition-colors"
            >
              <Wrench className="w-3 h-3 text-amber-600" />
              + Add Screws (SCR)
            </button>
          )}
          {onLoadNailPreset && rows.length > 0 && (
            <button
              onClick={onLoadNailPreset}
              className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-300 hover:underline transition-colors"
            >
              <Pin className="w-3 h-3 text-rose-600" />
              + Add Nails & Pins (NAL/PIN)
            </button>
          )}
          {onLoadAdhesivePreset && rows.length > 0 && (
            <button
              onClick={onLoadAdhesivePreset}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline transition-colors"
            >
              <FlaskConical className="w-3 h-3 text-emerald-600" />
              + Add Adhesives (ADH)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sub-component: Single category section inside a card
───────────────────────────────────────────── */
function SectionBlock({
  section,
  rows,
  onChange,
  onUpdateVariant,
  onAddRow,
  onRemoveRow,
  onLoadPreset,
  onToggleCollapse,
  onRemove,
}: {
  section: CardSection
  rows: RequisitionItemInput[]
  onChange: (ri: number, field: keyof RequisitionItemInput, value: any) => void
  onUpdateVariant: (ri: number, field: keyof BoardVariantAttributes, value: string) => void
  onAddRow: () => void
  onRemoveRow: (ri: number) => void
  onLoadPreset: (subType: WallPanelingSubType) => void
  onToggleCollapse: () => void
  onRemove: () => void
}) {
  const viewMode = getViewModeForSection(section)
  const catLabel = WORK_CATEGORIES.find((c) => c.key === section.category)?.label ?? section.category
  const subTypeInfo = section.wallPanelingSubType
    ? WALL_PANELING_SUBTYPES.find((s) => s.key === section.wallPanelingSubType)
    : null
  const colors = CATEGORY_COLORS[section.category]

  return (
    <div className="border-t first:border-t-0">
      {/* Section header */}
      <div className={`flex items-center gap-2 px-3 py-2 ${colors.bg} border-b ${colors.border}`}>
        <button onClick={onToggleCollapse} className={`${colors.text} hover:opacity-70 transition-opacity`} title={section.collapsed ? 'Expand' : 'Collapse'}>
          {section.collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <span className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>{catLabel}</span>

        {subTypeInfo && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
            {subTypeInfo.label}
          </span>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} row{rows.length !== 1 ? 's' : ''}
        </span>

        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
          title="Remove this section"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Section body */}
      {!section.collapsed && (
        <div className="p-3">
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
          />
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sub-component: "Add Section" inline form
───────────────────────────────────────────── */
function AddSectionForm({ onAdd, onCancel }: {
  onAdd: (category: RequisitionWorkCategory, subType?: WallPanelingSubType) => void
  onCancel: () => void
}) {
  const [cat, setCat] = useState<RequisitionWorkCategory>('WALL_PANELING')
  const [sub, setSub] = useState<WallPanelingSubType>('CORE_BOARDS')

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-muted/10 border-t">
      <select
        value={cat}
        onChange={(e) => setCat(e.target.value as RequisitionWorkCategory)}
        className="text-xs bg-background border border-input rounded px-2 py-1.5 focus:ring-1 focus:ring-primary font-medium"
      >
        {WORK_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>

      {cat === 'WALL_PANELING' && (
        <select
          value={sub}
          onChange={(e) => setSub(e.target.value as WallPanelingSubType)}
          className="text-xs bg-background border border-input rounded px-2 py-1.5 focus:ring-1 focus:ring-primary font-medium"
        >
          {WALL_PANELING_SUBTYPES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      )}

      <button
        onClick={() => onAdd(cat, cat === 'WALL_PANELING' ? sub : undefined)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-3 h-3" /> Add
      </button>
      <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        Cancel
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sub-component: Single quotation line item card
───────────────────────────────────────────── */
function QuotationLineItemCard({
  item,
  area,
  sections,
  getRowsForSection,
  onChangeRow,
  onUpdateVariant,
  onAddRow,
  onRemoveRow,
  onLoadPreset,
  onAddSection,
  onRemoveSection,
  onToggleSectionCollapse,
}: {
  item: QuotationLineItem
  area?: QuotationArea
  sections: CardSection[]
  getRowsForSection: (sectionId: string) => RequisitionItemInput[]
  onChangeRow: (sectionId: string, ri: number, field: keyof RequisitionItemInput, value: any) => void
  onUpdateVariant: (sectionId: string, ri: number, field: keyof BoardVariantAttributes, value: string) => void
  onAddRow: (sectionId: string) => void
  onRemoveRow: (sectionId: string, ri: number) => void
  onLoadPreset: (sectionId: string, subType: WallPanelingSubType) => void
  onAddSection: (category: RequisitionWorkCategory, subType?: WallPanelingSubType) => void
  onRemoveSection: (sectionId: string) => void
  onToggleSectionCollapse: (sectionId: string) => void
}) {
  const [cardExpanded, setCardExpanded] = useState(true)
  const [showAddSection, setShowAddSection] = useState(false)

  const totalRows = sections.reduce((sum, s) => sum + getRowsForSection(s.id).length, 0)

  return (
    <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
      {/* Card header */}
      <button
        onClick={() => setCardExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5">
            {cardExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
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
          <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
          <p className="text-xs font-bold text-foreground">৳{item.amount.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground">
            {sections.length} section{sections.length !== 1 ? 's' : ''} · {totalRows} row{totalRows !== 1 ? 's' : ''}
          </p>
        </div>
      </button>

      {cardExpanded && (
        <div>
          {/* Empty state */}
          {sections.length === 0 && !showAddSection && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground space-y-2">
              <Package className="w-5 h-5 mx-auto text-muted-foreground/40" />
              <p>No material sections yet. Add a section to start specifying materials.</p>
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
              onToggleCollapse={() => onToggleSectionCollapse(section.id)}
              onRemove={() => onRemoveSection(section.id)}
            />
          ))}

          {/* Add Section form or trigger */}
          {showAddSection ? (
            <AddSectionForm
              onAdd={(cat, sub) => {
                onAddSection(cat, sub)
                setShowAddSection(false)
              }}
              onCancel={() => setShowAddSection(false)}
            />
          ) : (
            <div className="px-3 py-2.5 border-t bg-muted/5">
              <button
                onClick={() => setShowAddSection(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
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

/* ─────────────────────────────────────────────
   Sub-component: Extra / General section card (EXTRA_KEY)
───────────────────────────────────────────── */
function ExtraCard({
  sections,
  getRowsForSection,
  onChangeRow,
  onUpdateVariant,
  onAddRow,
  onRemoveRow,
  onLoadPreset,
  onAddSection,
  onRemoveSection,
  onToggleSectionCollapse,
}: {
  sections: CardSection[]
  getRowsForSection: (sectionId: string) => RequisitionItemInput[]
  onChangeRow: (sectionId: string, ri: number, field: keyof RequisitionItemInput, value: any) => void
  onUpdateVariant: (sectionId: string, ri: number, field: keyof BoardVariantAttributes, value: string) => void
  onAddRow: (sectionId: string) => void
  onRemoveRow: (sectionId: string, ri: number) => void
  onLoadPreset: (sectionId: string, subType: WallPanelingSubType) => void
  onAddSection: (category: RequisitionWorkCategory, subType?: WallPanelingSubType) => void
  onRemoveSection: (sectionId: string) => void
  onToggleSectionCollapse: (sectionId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [showAddSection, setShowAddSection] = useState(false)
  const totalRows = sections.reduce((sum, s) => sum + getRowsForSection(s.id).length, 0)

  return (
    <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-left border-b border-amber-100 dark:border-amber-900"
      >
        <div className="flex items-center gap-2 flex-1">
          {expanded ? <ChevronDown className="w-4 h-4 text-amber-600" /> : <ChevronRight className="w-4 h-4 text-amber-600" />}
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-foreground">Extra / General Materials</span>
          <span className="text-xs text-muted-foreground">(not linked to a quotation line item)</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {sections.length} section{sections.length !== 1 ? 's' : ''} · {totalRows} row{totalRows !== 1 ? 's' : ''}
        </span>
      </button>

      {expanded && (
        <div>
          {sections.length === 0 && !showAddSection && (
            <div className="px-4 py-5 text-center text-xs text-muted-foreground space-y-2">
              <Package className="w-5 h-5 mx-auto text-muted-foreground/40" />
              <p>No sections yet. Add a Wall Paneling section to load material catalogs.</p>
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
              onToggleCollapse={() => onToggleSectionCollapse(section.id)}
              onRemove={() => onRemoveSection(section.id)}
            />
          ))}

          {showAddSection ? (
            <AddSectionForm
              onAdd={(cat, sub) => {
                onAddSection(cat, sub)
                setShowAddSection(false)
              }}
              onCancel={() => setShowAddSection(false)}
            />
          ) : (
            <div className="px-3 py-2.5 border-t bg-muted/5">
              <button
                onClick={() => setShowAddSection(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
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

  // ── Per-section architecture state ──
  const [sectionsMap, setSectionsMap] = useState<SectionsMap>(() => computeInitialState(existingRequisition).sectionsMap)
  const [itemsMap, setItemsMap] = useState<ItemsMap>(() => computeInitialState(existingRequisition).itemsMap)

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

  // ── Section helpers ──
  const getSectionsForCard = (cardKey: string): CardSection[] => sectionsMap[cardKey] ?? []

  const getRowsForSection = (cardKey: string, sectionId: string): RequisitionItemInput[] =>
    itemsMap[sectionItemKey(cardKey, sectionId)] ?? []

  const addSection = (cardKey: string, category: RequisitionWorkCategory, wallPanelingSubType?: WallPanelingSubType, quotationLineItemId?: string) => {
    const sectionId = `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setSectionsMap((prev) => ({
      ...prev,
      [cardKey]: [...(prev[cardKey] ?? []), { id: sectionId, category, wallPanelingSubType, collapsed: false }],
    }))
    setItemsMap((prev) => ({
      ...prev,
      [sectionItemKey(cardKey, sectionId)]: [blankItem(category, wallPanelingSubType, quotationLineItemId)],
    }))
  }

  const removeSection = (cardKey: string, sectionId: string) => {
    setSectionsMap((prev) => ({
      ...prev,
      [cardKey]: (prev[cardKey] ?? []).filter((s) => s.id !== sectionId),
    }))
    setItemsMap((prev) => {
      const next = { ...prev }
      delete next[sectionItemKey(cardKey, sectionId)]
      return next
    })
  }

  const toggleSectionCollapse = (cardKey: string, sectionId: string) => {
    setSectionsMap((prev) => ({
      ...prev,
      [cardKey]: (prev[cardKey] ?? []).map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s)),
    }))
  }

  const updateRow = (cardKey: string, sectionId: string, rowIndex: number, field: keyof RequisitionItemInput, rawValue: any) => {
    const key = sectionItemKey(cardKey, sectionId)
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

  const updateVariant = (cardKey: string, sectionId: string, rowIndex: number, field: keyof BoardVariantAttributes, value: string) => {
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => {
      const rows = [...(prev[key] ?? [])]
      const current = { ...rows[rowIndex] }
      const prevAttrs: BoardVariantAttributes = current.variantAttributes || {}
      const nextAttrs = { ...prevAttrs, [field]: value }
      current.variantAttributes = nextAttrs
      const specParts = [
        nextAttrs.coreThickness || nextAttrs.profileType || nextAttrs.fastenerType || nextAttrs.nailType || nextAttrs.chemicalClass,
        nextAttrs.baseMaterial || nextAttrs.material || nextAttrs.lengthInches || nextAttrs.lengthSpec || nextAttrs.applicationMethod,
        nextAttrs.laminateTopSurface || nextAttrs.accentFinish || nextAttrs.gaugeSize || nextAttrs.thicknessSpec,
        nextAttrs.surfaceCodeFinish || nextAttrs.codeVariant || nextAttrs.materialFinish,
      ].filter(Boolean)
      if (specParts.length > 0) current.specifications = specParts.join(' | ')
      rows[rowIndex] = current
      return { ...prev, [key]: rows }
    })
  }

  const addRow = (cardKey: string, sectionId: string, quotationLineItemId?: string) => {
    const sectionInfo = (sectionsMap[cardKey] ?? []).find((s) => s.id === sectionId)
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), blankItem(sectionInfo?.category ?? 'WALL_PANELING', sectionInfo?.wallPanelingSubType, quotationLineItemId)],
    }))
  }

  const removeRow = (cardKey: string, sectionId: string, rowIndex: number) => {
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => ({ ...prev, [key]: (prev[key] ?? []).filter((_, i) => i !== rowIndex) }))
  }

  const loadPresetForSection = (cardKey: string, sectionId: string, subType: WallPanelingSubType, quotationLineItemId?: string) => {
    const presetMap: Record<WallPanelingSubType, RequisitionItemInput[]> = {
      CORE_BOARDS: SAMPLE_WALL_PANEL_ITEMS,
      LOUVERS_PROFILES: SAMPLE_LOUVER_PROFILE_ITEMS,
      SCREWS_FASTENERS: SAMPLE_SCREW_FASTENER_ITEMS,
      NAILS_PINS: SAMPLE_NAIL_PIN_ITEMS,
      ADHESIVES: SAMPLE_ADHESIVE_CHEMICAL_ITEMS,
    }
    const presetItems = presetMap[subType].map((item) => ({
      ...item,
      quotationLineItemId,
      variantAttributes: { ...(item.variantAttributes || {}), wpSubType: subType },
    }))
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...presetItems] }))
  }

  // ── Summary counts ──
  const totalMaterialRows = useMemo(() => flattenItems(itemsMap).length, [itemsMap])
  const coveredLineItems = useMemo(
    () => lineItems.filter((li) => (sectionsMap[li.id] ?? []).some((s) => (itemsMap[sectionItemKey(li.id, s.id)]?.length ?? 0) > 0)).length,
    [lineItems, sectionsMap, itemsMap]
  )
  const extraRowCount = useMemo(
    () => (sectionsMap[EXTRA_KEY] ?? []).reduce((sum, s) => sum + (itemsMap[sectionItemKey(EXTRA_KEY, s.id)]?.length ?? 0), 0),
    [sectionsMap, itemsMap]
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
    <div className="p-4 md:p-6 space-y-6 w-full pb-24">
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
            Material Requisition Builder
          </h1>
          <p className="text-xs text-muted-foreground">
            Project: <span className="font-semibold text-foreground">{lead.name}</span> | Phone:{' '}
            {lead.phone || 'N/A'} | Location: {lead.location || 'N/A'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
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
                Items Covered:{' '}
                <strong className="text-foreground">{coveredLineItems}/{lineItems.length}</strong>
              </span>
              <span>
                Total Rows:{' '}
                <strong className="text-foreground">{totalMaterialRows}</strong>
              </span>
            </div>
          </div>
          {lineItems.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Each quotation line item below can have multiple sections — add <strong>Wall Paneling</strong>, <strong>Ceiling</strong>, <strong>Cabinets</strong> and more independently per line item.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-amber-50/40 dark:bg-amber-950/20 p-4 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          No approved detail quotation found for this lead. You can still add materials in the Extra / General section below.
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
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{section.name}</h2>
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
                        sections={getSectionsForCard(li.id)}
                        getRowsForSection={(sectionId) => getRowsForSection(li.id, sectionId)}
                        onChangeRow={(sectionId, ri, field, val) => updateRow(li.id, sectionId, ri, field, val)}
                        onUpdateVariant={(sectionId, ri, field, val) => updateVariant(li.id, sectionId, ri, field, val)}
                        onAddRow={(sectionId) => addRow(li.id, sectionId, li.id)}
                        onRemoveRow={(sectionId, ri) => removeRow(li.id, sectionId, ri)}
                        onLoadPreset={(sectionId, subType) => loadPresetForSection(li.id, sectionId, subType, li.id)}
                        onAddSection={(cat, sub) => addSection(li.id, cat, sub, li.id)}
                        onRemoveSection={(sectionId) => removeSection(li.id, sectionId)}
                        onToggleSectionCollapse={(sectionId) => toggleSectionCollapse(li.id, sectionId)}
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

      {/* ── Extra / General Section ── */}
      <div className="space-y-3">
        <ExtraCard
          sections={getSectionsForCard(EXTRA_KEY)}
          getRowsForSection={(sectionId) => getRowsForSection(EXTRA_KEY, sectionId)}
          onChangeRow={(sectionId, ri, field, val) => updateRow(EXTRA_KEY, sectionId, ri, field, val)}
          onUpdateVariant={(sectionId, ri, field, val) => updateVariant(EXTRA_KEY, sectionId, ri, field, val)}
          onAddRow={(sectionId) => addRow(EXTRA_KEY, sectionId, undefined)}
          onRemoveRow={(sectionId, ri) => removeRow(EXTRA_KEY, sectionId, ri)}
          onLoadPreset={(sectionId, subType) => loadPresetForSection(EXTRA_KEY, sectionId, subType, undefined)}
          onAddSection={(cat, sub) => addSection(EXTRA_KEY, cat, sub, undefined)}
          onRemoveSection={(sectionId) => removeSection(EXTRA_KEY, sectionId)}
          onToggleSectionCollapse={(sectionId) => toggleSectionCollapse(EXTRA_KEY, sectionId)}
        />
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
            {extraRowCount > 0 && (
              <> + <strong className="text-foreground">{extraRowCount}</strong> general row{extraRowCount !== 1 ? 's' : ''}</>
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
              Submit Requisition
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

