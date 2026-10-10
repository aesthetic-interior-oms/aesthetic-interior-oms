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
  Receipt,
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

  // ── Closet / Cabinet attributes ──
  srNo?: string
  lineNo?: string
  laminateFinishDetails?: string
  sideSpecification?: string
  edgingTapeQty?: string
  coreSubstrateType?: string
  frontLaminateCode?: string
  backLaminateCode?: string
  cabinetSubType?: string
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

/** 6. Closet / Cabinet Core Board Specification Catalog Preset */
const SAMPLE_CABINET_CORE_BOARD_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'MR Board',
    specifications: '18mm | Champagne Gold | Both Side',
    variantAttributes: {
      srNo: '1',
      baseMaterial: 'MR Board',
      coreThickness: '18mm',
      laminateFinishDetails: 'Champagne Gold',
      sideSpecification: 'Both Side',
      qtyLabel: '89 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'CORE_BOARD_SPEC',
    },
    netQuantity: 89,
    wastagePercent: 0,
    finalQuantity: 89,
    unit: 'Pcs',
    productionPhase: 'Both Side',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'MR Board',
    specifications: '6mm | Champagne Gold | Both Side | Edging: 5 Roll (Edging)',
    variantAttributes: {
      srNo: '1.1',
      baseMaterial: 'MR Board',
      coreThickness: '6mm',
      laminateFinishDetails: 'Champagne Gold',
      sideSpecification: 'Both Side',
      qtyLabel: '42 pcs',
      edgingTapeQty: '5 Roll (Edging)',
      cabinetSubType: 'CORE_BOARD_SPEC',
    },
    netQuantity: 42,
    wastagePercent: 0,
    finalQuantity: 42,
    unit: 'Pcs',
    productionPhase: 'Both Side',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Elegant Board',
    specifications: '18mm | Code: A-7123 | Standard',
    variantAttributes: {
      srNo: '2',
      baseMaterial: 'Elegant Board',
      coreThickness: '18mm',
      laminateFinishDetails: 'Code: A-7123',
      sideSpecification: 'Standard',
      qtyLabel: '2 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'CORE_BOARD_SPEC',
    },
    netQuantity: 2,
    wastagePercent: 0,
    finalQuantity: 2,
    unit: 'Pcs',
    productionPhase: 'Standard',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Elegant Board',
    specifications: '9mm | Code: A-7123 | Standard | Edging: 1 Roll (Edging)',
    variantAttributes: {
      srNo: '2.1',
      baseMaterial: 'Elegant Board',
      coreThickness: '9mm',
      laminateFinishDetails: 'Code: A-7123',
      sideSpecification: 'Standard',
      qtyLabel: '1 pcs',
      edgingTapeQty: '1 Roll (Edging)',
      cabinetSubType: 'CORE_BOARD_SPEC',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Standard',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Elegant Board',
    specifications: '18mm | Code: A-7112 | Standard',
    variantAttributes: {
      srNo: '3',
      baseMaterial: 'Elegant Board',
      coreThickness: '18mm',
      laminateFinishDetails: 'Code: A-7112',
      sideSpecification: 'Standard',
      qtyLabel: '8 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'CORE_BOARD_SPEC',
    },
    netQuantity: 8,
    wastagePercent: 0,
    finalQuantity: 8,
    unit: 'Pcs',
    productionPhase: 'Standard',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Elegant Board',
    specifications: '9mm | Code: A-7112 | Standard | Edging: 1 Roll (Edging)',
    variantAttributes: {
      srNo: '3.1',
      baseMaterial: 'Elegant Board',
      coreThickness: '9mm',
      laminateFinishDetails: 'Code: A-7112',
      sideSpecification: 'Standard',
      qtyLabel: '3 pcs',
      edgingTapeQty: '1 Roll (Edging)',
      cabinetSubType: 'CORE_BOARD_SPEC',
    },
    netQuantity: 3,
    wastagePercent: 0,
    finalQuantity: 3,
    unit: 'Pcs',
    productionPhase: 'Standard',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'White Board',
    specifications: '18mm | Duco Paint Finish | Standard',
    variantAttributes: {
      srNo: '4',
      baseMaterial: 'White Board',
      coreThickness: '18mm',
      laminateFinishDetails: 'Duco Paint Finish',
      sideSpecification: 'Standard',
      qtyLabel: '3 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'CORE_BOARD_SPEC',
    },
    netQuantity: 3,
    wastagePercent: 0,
    finalQuantity: 3,
    unit: 'Pcs',
    productionPhase: 'Standard',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Starlight Board',
    specifications: '18mm | White Matt Finish | Standard',
    variantAttributes: {
      srNo: '5',
      baseMaterial: 'Starlight Board',
      coreThickness: '18mm',
      laminateFinishDetails: 'White Matt Finish',
      sideSpecification: 'Standard',
      qtyLabel: '5 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'CORE_BOARD_SPEC',
    },
    netQuantity: 5,
    wastagePercent: 0,
    finalQuantity: 5,
    unit: 'Pcs',
    productionPhase: 'Standard',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Starlight Board',
    specifications: '6mm | White Matt Finish | Standard | Edging: 1 Role (Edging)',
    variantAttributes: {
      srNo: '5.1',
      baseMaterial: 'Starlight Board',
      coreThickness: '6mm',
      laminateFinishDetails: 'White Matt Finish',
      sideSpecification: 'Standard',
      qtyLabel: '1 pcs',
      edgingTapeQty: '1 Role (Edging)',
      cabinetSubType: 'CORE_BOARD_SPEC',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Standard',
  },
]

/** 7. Closet / Cabinet HPL Pasting Details Catalog Preset */
const SAMPLE_CABINET_HPL_PASTING_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'MR Board HPL Pasting',
    specifications: '18mm | Front: MR Champagne Gold | Back: Luxury 8193',
    variantAttributes: {
      lineNo: 'HPL-1',
      coreThickness: '18mm',
      coreSubstrateType: 'MR Board',
      frontLaminateCode: 'MR Champagne Gold',
      backLaminateCode: 'Luxury 8193',
      qtyLabel: '40 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'HPL_PASTING',
    },
    netQuantity: 40,
    wastagePercent: 0,
    finalQuantity: 40,
    unit: 'Pcs',
    productionPhase: 'HPL Pasting',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'MR Board HPL Pasting',
    specifications: '18mm | Front: MR Champagne Gold | Back: Aromex 9904 | Edging: 4 Roll',
    variantAttributes: {
      lineNo: 'HPL-2',
      coreThickness: '18mm',
      coreSubstrateType: 'MR Board',
      frontLaminateCode: 'MR Champagne Gold',
      backLaminateCode: 'Aromex 9904',
      qtyLabel: '9 pcs',
      edgingTapeQty: '4 Roll',
      cabinetSubType: 'HPL_PASTING',
    },
    netQuantity: 9,
    wastagePercent: 0,
    finalQuantity: 9,
    unit: 'Pcs',
    productionPhase: 'HPL Pasting',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Marine Plywood HPL Pasting',
    specifications: '16mm | Front: Super 101 | Back: Luxury 8193',
    variantAttributes: {
      lineNo: 'HPL-3',
      coreThickness: '16mm',
      coreSubstrateType: 'Marine Plywood',
      frontLaminateCode: 'Super 101',
      backLaminateCode: 'Luxury 8193',
      qtyLabel: '21 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'HPL_PASTING',
    },
    netQuantity: 21,
    wastagePercent: 0,
    finalQuantity: 21,
    unit: 'Pcs',
    productionPhase: 'HPL Pasting',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Marine Plywood HPL Pasting',
    specifications: '16mm | Front: Super 101 | Back: Super 101 (Both Side) | Edging: 2 Roll',
    variantAttributes: {
      lineNo: 'HPL-4',
      coreThickness: '16mm',
      coreSubstrateType: 'Marine Plywood',
      frontLaminateCode: 'Super 101',
      backLaminateCode: 'Super 101 (Both Side)',
      qtyLabel: '11 pcs',
      edgingTapeQty: '2 Roll',
      cabinetSubType: 'HPL_PASTING',
    },
    netQuantity: 11,
    wastagePercent: 0,
    finalQuantity: 11,
    unit: 'Pcs',
    productionPhase: 'HPL Pasting',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Marine Plywood HPL Pasting',
    specifications: '6mm | Front: Super 101 | Back: Single Side Liner',
    variantAttributes: {
      lineNo: 'HPL-5',
      coreThickness: '6mm',
      coreSubstrateType: 'Marine Plywood',
      frontLaminateCode: 'Super 101',
      backLaminateCode: 'Single Side Liner',
      qtyLabel: '7 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'HPL_PASTING',
    },
    netQuantity: 7,
    wastagePercent: 0,
    finalQuantity: 7,
    unit: 'Pcs',
    productionPhase: 'HPL Pasting',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Marine Plywood HPL Pasting',
    specifications: '16mm | Front: Super 111 | Back: Luxury 8193 | Edging: 1 Roll',
    variantAttributes: {
      lineNo: 'HPL-6',
      coreThickness: '16mm',
      coreSubstrateType: 'Marine Plywood',
      frontLaminateCode: 'Super 111',
      backLaminateCode: 'Luxury 8193',
      qtyLabel: '6 pcs',
      edgingTapeQty: '1 Roll',
      cabinetSubType: 'HPL_PASTING',
    },
    netQuantity: 6,
    wastagePercent: 0,
    finalQuantity: 6,
    unit: 'Pcs',
    productionPhase: 'HPL Pasting',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Marine Plywood HPL Pasting',
    specifications: '16mm | Front: Super 111 | Back: Super 111 (Both Side)',
    variantAttributes: {
      lineNo: 'HPL-7',
      coreThickness: '16mm',
      coreSubstrateType: 'Marine Plywood',
      frontLaminateCode: 'Super 111',
      backLaminateCode: 'Super 111 (Both Side)',
      qtyLabel: '5 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'HPL_PASTING',
    },
    netQuantity: 5,
    wastagePercent: 0,
    finalQuantity: 5,
    unit: 'Pcs',
    productionPhase: 'HPL Pasting',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Marine Plywood HPL Pasting',
    specifications: '6mm | Front: Super 111 | Back: Single Side Liner | Edging: 1 Roll',
    variantAttributes: {
      lineNo: 'HPL-8',
      coreThickness: '6mm',
      coreSubstrateType: 'Marine Plywood',
      frontLaminateCode: 'Super 111',
      backLaminateCode: 'Single Side Liner',
      qtyLabel: '3 pcs',
      edgingTapeQty: '1 Roll',
      cabinetSubType: 'HPL_PASTING',
    },
    netQuantity: 3,
    wastagePercent: 0,
    finalQuantity: 3,
    unit: 'Pcs',
    productionPhase: 'HPL Pasting',
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
export type CabinetSubType = 'CORE_BOARD_SPEC' | 'HPL_PASTING'

interface CardSection {
  id: string
  category: RequisitionWorkCategory
  wallPanelingSubType?: WallPanelingSubType
  cabinetSubType?: CabinetSubType
  collapsed: boolean
}

type SectionsMap = Record<string, CardSection[]>
/** ItemsMap key = `${cardKey}::${sectionId}` */
type ItemsMap = Record<string, RequisitionItemInput[]>

type ViewModeType =
  | 'BOARD_SPEC'
  | 'LOUVER_SPEC'
  | 'SCREW_SPEC'
  | 'NAIL_SPEC'
  | 'ADHESIVE_SPEC'
  | 'CABINET_CORE_SPEC'
  | 'CABINET_HPL_SPEC'
  | 'STANDARD'

const WALL_PANELING_SUBTYPES: { key: WallPanelingSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'CORE_BOARDS',      label: '🪵 Core Structural Boards & Plywood',          viewMode: 'BOARD_SPEC'    },
  { key: 'LOUVERS_PROFILES', label: '✨ Decorative Panels, Louvers & Edge Profiles', viewMode: 'LOUVER_SPEC'   },
  { key: 'SCREWS_FASTENERS', label: '🔩 Screws & Structural Fasteners',             viewMode: 'SCREW_SPEC'    },
  { key: 'NAILS_PINS',       label: '📌 Nails, Pins & Masonry Anchors',             viewMode: 'NAIL_SPEC'     },
  { key: 'ADHESIVES',        label: '🧪 Adhesives & Chemical Solvents',             viewMode: 'ADHESIVE_SPEC' },
]

const CABINET_SUBTYPES: { key: CabinetSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'CORE_BOARD_SPEC', label: '📋 Core Board Specification', viewMode: 'CABINET_CORE_SPEC' },
  { key: 'HPL_PASTING',     label: '🪵 HPL Pasting Details',       viewMode: 'CABINET_HPL_SPEC' },
]

const CATEGORY_COLORS: Record<RequisitionWorkCategory, { bg: string; text: string; border: string; pill: string }> = {
  WALL_PANELING:    { bg: 'bg-muted/30', text: 'text-foreground', border: 'border-border/80', pill: 'bg-primary/10 text-primary border-primary/20' },
  CEILING:          { bg: 'bg-muted/30', text: 'text-foreground', border: 'border-border/80', pill: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' },
  CABINETS_CLOSETS: { bg: 'bg-muted/30', text: 'text-foreground', border: 'border-border/80', pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' },
  FURNITURE:        { bg: 'bg-muted/30', text: 'text-foreground', border: 'border-border/80', pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  ACCESSORIES:      { bg: 'bg-muted/30', text: 'text-foreground', border: 'border-border/80', pill: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20' },
  ELECTRICAL_WORK:  { bg: 'bg-muted/30', text: 'text-foreground', border: 'border-border/80', pill: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20' },
  PAINT:            { bg: 'bg-muted/30', text: 'text-foreground', border: 'border-border/80', pill: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20' },
  APPLIANCES:       { bg: 'bg-muted/30', text: 'text-foreground', border: 'border-border/80', pill: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20' },
}

function getViewModeForSection(section: CardSection): ViewModeType {
  if (section.category === 'WALL_PANELING') {
    switch (section.wallPanelingSubType) {
      case 'CORE_BOARDS':      return 'BOARD_SPEC'
      case 'LOUVERS_PROFILES': return 'LOUVER_SPEC'
      case 'SCREWS_FASTENERS': return 'SCREW_SPEC'
      case 'NAILS_PINS':       return 'NAIL_SPEC'
      case 'ADHESIVES':        return 'ADHESIVE_SPEC'
      default:                 return 'BOARD_SPEC'
    }
  }
  if (section.category === 'CABINETS_CLOSETS') {
    switch (section.cabinetSubType) {
      case 'CORE_BOARD_SPEC': return 'CABINET_CORE_SPEC'
      case 'HPL_PASTING':     return 'CABINET_HPL_SPEC'
      default:                return 'CABINET_CORE_SPEC'
    }
  }
  return 'STANDARD'
}

function sectionItemKey(cardKey: string, sectionId: string): string {
  return `${cardKey}::${sectionId}`
}

/* ─────────────────────────────────────────────
   Helper – build a blank requisition item
───────────────────────────────────────────── */
function blankItem(
  category: RequisitionWorkCategory = 'WALL_PANELING',
  wallPanelingSubType?: WallPanelingSubType,
  cabinetSubType?: CabinetSubType,
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

  if (category === 'CABINETS_CLOSETS') {
    if (cabinetSubType === 'HPL_PASTING') {
      return {
        ...base,
        materialName: 'MR Board HPL Pasting',
        unit: 'Pcs',
        productionPhase: 'HPL Pasting',
        variantAttributes: {
          lineNo: 'HPL-1',
          coreThickness: '18mm',
          coreSubstrateType: 'MR Board',
          frontLaminateCode: '',
          backLaminateCode: '',
          qtyLabel: '1 pcs',
          edgingTapeQty: '—',
          cabinetSubType: 'HPL_PASTING',
        },
      }
    }
    // Default CORE_BOARD_SPEC
    return {
      ...base,
      materialName: 'MR Board',
      unit: 'Pcs',
      productionPhase: 'Standard',
      variantAttributes: {
        srNo: '1',
        baseMaterial: 'MR Board',
        coreThickness: '18mm',
        laminateFinishDetails: '',
        sideSpecification: 'Standard',
        qtyLabel: '1 pcs',
        edgingTapeQty: '—',
        cabinetSubType: 'CORE_BOARD_SPEC',
      },
    }
  }

  switch (wallPanelingSubType) {
    case 'LOUVERS_PROFILES':
      return { ...base, variantAttributes: { itemId: '', profileType: '', material: '', accentFinish: '', codeVariant: '', primaryUsage: '', qtyLabel: '1', wpSubType: 'LOUVERS_PROFILES' } }
    case 'SCREWS_FASTENERS':
      return { ...base, variantAttributes: { itemId: '', fastenerType: '', lengthInches: '', gaugeSize: '', materialFinish: '', usagePurpose: '', qtyLabel: '1', wpSubType: 'SCREWS_FASTENERS' } }
    case 'NAILS_PINS':
      return { ...base, variantAttributes: { itemId: '', nailType: '', lengthSpec: '', thicknessSpec: '', functionalUsage: '', qtyLabel: '1', wpSubType: 'NAILS_PINS' } }
    case 'ADHESIVES':
      return { ...base, variantAttributes: { itemId: '', chemicalClass: '', applicationMethod: '', qtyLabel: '1', wpSubType: 'ADHESIVES' } }
    default:
      return { ...base, variantAttributes: { itemId: '', coreThickness: '', baseMaterial: '', laminateTopSurface: '', surfaceCodeFinish: '', sheetSize: "8' x 4'", functionalUsage: '', qtyLabel: '1', wpSubType: wallPanelingSubType ?? 'CORE_BOARDS' } }
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
    const cabSubType = attrs.cabinetSubType as CabinetSubType | undefined

    // Find or create a section for this (cardKey, category, wpSubType, cabSubType) combo
    const regKey = `${cardKey}::${category}::${wpSubType ?? ''}::${cabSubType ?? ''}`
    let sectionId = sectionRegistry[regKey]
    if (!sectionId) {
      sectionId = `section-${Object.keys(sectionRegistry).length}`
      sectionRegistry[regKey] = sectionId
      if (!sectionsMap[cardKey]) sectionsMap[cardKey] = []
      sectionsMap[cardKey].push({
        id: sectionId,
        category,
        wallPanelingSubType: wpSubType,
        cabinetSubType: cabSubType,
        collapsed: false,
      })
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
        srNo: attrs.srNo || '',
        lineNo: attrs.lineNo || '',
        laminateFinishDetails: attrs.laminateFinishDetails || '',
        sideSpecification: attrs.sideSpecification || '',
        edgingTapeQty: attrs.edgingTapeQty || '',
        coreSubstrateType: attrs.coreSubstrateType || '',
        frontLaminateCode: attrs.frontLaminateCode || '',
        backLaminateCode: attrs.backLaminateCode || '',
        cabinetSubType: attrs.cabinetSubType || '',
      },
      netQuantity: Number(it.netQuantity) || 1,
      wastagePercent: Number(it.wastagePercent) || 0,
      finalQuantity: Number(it.finalQuantity) || Number(it.netQuantity) || 1,
      unit: it.unit || 'Pcs',
      productionPhase: it.productionPhase || attrs.functionalUsage || attrs.primaryUsage || attrs.usagePurpose || attrs.applicationMethod || attrs.sideSpecification || '',
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
   Data Grid Styling Helpers (Spreadsheet UI)
───────────────────────────────────────────── */
const GRID_CELL_INPUT = "w-full bg-transparent border-0 rounded-none px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-primary/5 transition-colors"
const GRID_CELL_BOLD = "w-full bg-transparent border-0 rounded-none px-2.5 py-1.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-primary/5 transition-colors"
const GRID_CELL_MONO = "w-full bg-transparent border-0 rounded-none px-2.5 py-1.5 text-xs font-mono font-medium text-foreground/90 placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-primary/5 transition-colors"
const GRID_CELL_NUM = "w-full bg-transparent border-0 rounded-none px-2 py-1.5 text-xs text-center font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-primary/5 transition-colors"
const GRID_CELL_SELECT = "w-full bg-transparent border-0 rounded-none px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-primary/5 transition-colors cursor-pointer"
const GRID_TH = "px-2.5 py-2 select-none whitespace-nowrap text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left"
const GRID_TD = "p-0 align-middle"

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

      {/* ── Closet / Cabinet Datalists ── */}
      <datalist id="cabinet-base-material-list">
        <option value="MR Board" />
        <option value="Elegant Board" />
        <option value="White Board" />
        <option value="Starlight Board" />
        <option value="Marine Plywood" />
        <option value="Garjon Plywood" />
        <option value="Commercial Ply" />
        <option value="MDF Core" />
      </datalist>

      <datalist id="cabinet-thickness-list">
        <option value="6mm" />
        <option value="9mm" />
        <option value="12mm" />
        <option value="16mm" />
        <option value="18mm" />
        <option value="25mm" />
      </datalist>

      <datalist id="cabinet-laminate-finish-list">
        <option value="Champagne Gold" />
        <option value="Code: A-7123" />
        <option value="Code: A-7112" />
        <option value="Duco Paint Finish" />
        <option value="White Matt Finish" />
        <option value="Luxury 8193" />
        <option value="Aromex 9904" />
      </datalist>

      <datalist id="cabinet-side-spec-list">
        <option value="Both Side" />
        <option value="Standard" />
        <option value="Single Side" />
        <option value="Single Side Liner" />
      </datalist>

      <datalist id="cabinet-edging-tape-list">
        <option value="—" />
        <option value="1 Roll (Edging)" />
        <option value="2 Roll (Edging)" />
        <option value="3 Roll (Edging)" />
        <option value="4 Roll (Edging)" />
        <option value="5 Roll (Edging)" />
        <option value="1 Roll" />
        <option value="2 Roll" />
        <option value="4 Roll" />
      </datalist>

      <datalist id="cabinet-core-substrate-list">
        <option value="MR Board" />
        <option value="Marine Plywood" />
        <option value="Garjon Plywood" />
        <option value="Commercial Ply" />
      </datalist>

      <datalist id="cabinet-front-laminate-list">
        <option value="MR Champagne Gold" />
        <option value="Super 101" />
        <option value="Super 111" />
        <option value="Luxury 8193" />
        <option value="Aromex 9904" />
      </datalist>

      <datalist id="cabinet-back-laminate-list">
        <option value="Luxury 8193" />
        <option value="Aromex 9904" />
        <option value="Super 101 (Both Side)" />
        <option value="Super 111 (Both Side)" />
        <option value="Single Side Liner" />
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
  onLoadCabinetCorePreset,
  onLoadCabinetHplPreset,
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
  onLoadCabinetCorePreset?: () => void
  onLoadCabinetHplPreset?: () => void
}) {
  return (
    <div className="border border-border/80 rounded-lg overflow-hidden shadow-xs bg-card">
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-muted-foreground space-y-3 bg-muted/10">
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
          </div>
        </div>
      ) : viewMode === 'BOARD_SPEC' ? (
        /* ── 1. Core Structural Boards & Plywood Table (10 Cols) ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px] border-collapse divide-y divide-border/60">
            <thead className="bg-muted/60 border-b border-border">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-28`}>Item ID</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Item Name</th>
                <th className={`${GRID_TH} w-28`}>Core Thickness</th>
                <th className={`${GRID_TH} min-w-[140px]`}>Base Material</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Laminate / Top Surface</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Surface Code / Finish</th>
                <th className={`${GRID_TH} w-28 text-center`}>Sheet Size</th>
                <th className={`${GRID_TH} w-20`}>Unit</th>
                <th className={`${GRID_TH} text-center w-24`}>Quantity</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Functional Usage</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. Item ID */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="item-id-list"
                        value={attrs.itemId || ''}
                        onChange={(e) => onUpdateVariant(ri, 'itemId', e.target.value)}
                        placeholder="BRD-001"
                        className={GRID_CELL_MONO}
                      />
                    </td>

                    {/* 2. Item Name */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={item.materialName}
                        onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                        placeholder="e.g. Starlight White Board"
                        className={GRID_CELL_BOLD}
                      />
                    </td>

                    {/* 3. Core Thickness */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="core-thickness-list"
                        value={attrs.coreThickness || ''}
                        onChange={(e) => onUpdateVariant(ri, 'coreThickness', e.target.value)}
                        placeholder="12mm"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 4. Base Material */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="base-material-list"
                        value={attrs.baseMaterial || ''}
                        onChange={(e) => onUpdateVariant(ri, 'baseMaterial', e.target.value)}
                        placeholder="Garjon Plywood"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 5. Laminate / Top Surface */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="laminate-surface-list"
                        value={attrs.laminateTopSurface || ''}
                        onChange={(e) => onUpdateVariant(ri, 'laminateTopSurface', e.target.value)}
                        placeholder="Beladoa Laminate"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 6. Surface Code / Finish */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="surface-code-list"
                        value={attrs.surfaceCodeFinish || ''}
                        onChange={(e) => onUpdateVariant(ri, 'surfaceCodeFinish', e.target.value)}
                        placeholder="2003 SMT"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 7. Sheet Size (Std) */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="sheet-size-list"
                        value={attrs.sheetSize || "8' x 4'"}
                        onChange={(e) => onUpdateVariant(ri, 'sheetSize', e.target.value)}
                        placeholder="8' x 4'"
                        className={`${GRID_CELL_INPUT} text-center`}
                      />
                    </td>

                    {/* 8. Unit */}
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

                    {/* 9. Quantity */}
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
            <thead className="bg-muted/60 border-b border-border">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-28`}>Item ID</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Item Name</th>
                <th className={`${GRID_TH} min-w-[130px]`}>Profile / Type</th>
                <th className={`${GRID_TH} min-w-[130px]`}>Material</th>
                <th className={`${GRID_TH} min-w-[140px]`}>Accent Finish</th>
                <th className={`${GRID_TH} min-w-[140px]`}>Code / Variant</th>
                <th className={`${GRID_TH} w-20`}>Unit</th>
                <th className={`${GRID_TH} text-center w-24`}>Quantity</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Primary Usage</th>
                <th className={`${GRID_TH} w-28`}>Notes / Col 1</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. Item ID */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="item-id-list"
                        value={attrs.itemId || ''}
                        onChange={(e) => onUpdateVariant(ri, 'itemId', e.target.value)}
                        placeholder="LVR-001"
                        className={GRID_CELL_MONO}
                      />
                    </td>

                    {/* 2. Item Name */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={item.materialName}
                        onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                        placeholder="e.g. Charcoal Louver Panel"
                        className={GRID_CELL_BOLD}
                      />
                    </td>

                    {/* 3. Profile/Type */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="profile-type-list"
                        value={attrs.profileType || ''}
                        onChange={(e) => onUpdateVariant(ri, 'profileType', e.target.value)}
                        placeholder="Fluted Panel"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 4. Material */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="louver-material-list"
                        value={attrs.material || ''}
                        onChange={(e) => onUpdateVariant(ri, 'material', e.target.value)}
                        placeholder="Charcoal / WPC"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 5. Accent Finish */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="accent-finish-list"
                        value={attrs.accentFinish || ''}
                        onChange={(e) => onUpdateVariant(ri, 'accentFinish', e.target.value)}
                        placeholder="Rose Gold Accent"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 6. Code / Variant */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="code-variant-list"
                        value={attrs.codeVariant || ''}
                        onChange={(e) => onUpdateVariant(ri, 'codeVariant', e.target.value)}
                        placeholder="Advance 14081"
                        className={GRID_CELL_INPUT}
                      />
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
            <thead className="bg-muted/60 border-b border-border">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-28`}>Item ID</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Item Name</th>
                <th className={`${GRID_TH} min-w-[130px]`}>Fastener Type</th>
                <th className={`${GRID_TH} w-28`}>Length (Inches)</th>
                <th className={`${GRID_TH} min-w-[130px]`}>Gauge / Size</th>
                <th className={`${GRID_TH} min-w-[140px]`}>Material / Finish</th>
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
                    {/* 1. Item ID */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="item-id-list"
                        value={attrs.itemId || ''}
                        onChange={(e) => onUpdateVariant(ri, 'itemId', e.target.value)}
                        placeholder="SCR-075"
                        className={GRID_CELL_MONO}
                      />
                    </td>

                    {/* 2. Item Name */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={item.materialName}
                        onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                        placeholder="e.g. Hardware Screw"
                        className={GRID_CELL_BOLD}
                      />
                    </td>

                    {/* 3. Fastener Type */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="fastener-type-list"
                        value={attrs.fastenerType || ''}
                        onChange={(e) => onUpdateVariant(ri, 'fastenerType', e.target.value)}
                        placeholder="Wood Screw"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 4. Length (Inches) */}
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

                    {/* 5. Gauge / Size */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="gauge-size-list"
                        value={attrs.gaugeSize || ''}
                        onChange={(e) => onUpdateVariant(ri, 'gaugeSize', e.target.value)}
                        placeholder="#6 Countered"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 6. Material / Finish */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="fastener-finish-list"
                        value={attrs.materialFinish || ''}
                        onChange={(e) => onUpdateVariant(ri, 'materialFinish', e.target.value)}
                        placeholder="Zinc Coated"
                        className={GRID_CELL_INPUT}
                      />
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
                        placeholder="300"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* 9. Usage Purpose */}
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
      ) : viewMode === 'NAIL_SPEC' ? (
        /* ── 4. Nails, Pins & Masonry Anchors Table (10 Cols) ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px] border-collapse divide-y divide-border/60">
            <thead className="bg-muted/60 border-b border-border">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-28`}>Item ID</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Item Name</th>
                <th className={`${GRID_TH} min-w-[130px]`}>Type</th>
                <th className={`${GRID_TH} w-28`}>Length</th>
                <th className={`${GRID_TH} min-w-[130px]`}>Thickness / Spec</th>
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
                    {/* 1. Item ID */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="item-id-list"
                        value={attrs.itemId || ''}
                        onChange={(e) => onUpdateVariant(ri, 'itemId', e.target.value)}
                        placeholder="NAL-200"
                        className={GRID_CELL_MONO}
                      />
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

                    {/* 3. Type */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="nail-type-list"
                        value={attrs.nailType || ''}
                        onChange={(e) => onUpdateVariant(ri, 'nailType', e.target.value)}
                        placeholder="Wire Nail"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 4. Length */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.lengthSpec || ''}
                        onChange={(e) => onUpdateVariant(ri, 'lengthSpec', e.target.value)}
                        placeholder='2.0"'
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 5. Thickness / Spec */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.thicknessSpec || ''}
                        onChange={(e) => onUpdateVariant(ri, 'thicknessSpec', e.target.value)}
                        placeholder="Standard Gauge"
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
            <thead className="bg-muted/60 border-b border-border">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-28`}>Item ID</th>
                <th className={`${GRID_TH} min-w-[160px]`}>Chemical Name</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Chemical Class</th>
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
                    {/* 1. Item ID */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="item-id-list"
                        value={attrs.itemId || ''}
                        onChange={(e) => onUpdateVariant(ri, 'itemId', e.target.value)}
                        placeholder="ADH-001"
                        className={GRID_CELL_MONO}
                      />
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

                    {/* 3. Chemical Class */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="chemical-class-list"
                        value={attrs.chemicalClass || ''}
                        onChange={(e) => onUpdateVariant(ri, 'chemicalClass', e.target.value)}
                        placeholder="PVA Wood Adhesive"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 4. Packaging Unit */}
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
      ) : viewMode === 'CABINET_CORE_SPEC' ? (
        /* ── 6. Closet / Cabinet Core Board Specification Table ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[920px] border-collapse divide-y divide-border/60">
            <thead className="bg-muted/60 border-b border-border">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-20`}>Sr. No</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Base Material / Core</th>
                <th className={`${GRID_TH} w-28`}>Thickness</th>
                <th className={`${GRID_TH} min-w-[180px]`}>Laminate / Finish Details</th>
                <th className={`${GRID_TH} w-36`}>Side Specification</th>
                <th className={`${GRID_TH} text-center w-28`}>Board Qty</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Edging Tape Qty</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. Sr. No */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.srNo || ''}
                        onChange={(e) => onUpdateVariant(ri, 'srNo', e.target.value)}
                        placeholder="1"
                        className={GRID_CELL_MONO}
                      />
                    </td>

                    {/* 2. Base Material / Core */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="cabinet-base-material-list"
                        value={attrs.baseMaterial || item.materialName || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'baseMaterial', e.target.value)
                          onChange(ri, 'materialName', e.target.value)
                        }}
                        placeholder="MR Board"
                        className={GRID_CELL_BOLD}
                      />
                    </td>

                    {/* 3. Thickness */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="cabinet-thickness-list"
                        value={attrs.coreThickness || ''}
                        onChange={(e) => onUpdateVariant(ri, 'coreThickness', e.target.value)}
                        placeholder="18mm"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 4. Laminate / Finish Details */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="cabinet-laminate-finish-list"
                        value={attrs.laminateFinishDetails || ''}
                        onChange={(e) => onUpdateVariant(ri, 'laminateFinishDetails', e.target.value)}
                        placeholder="Champagne Gold"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 5. Side Specification */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="cabinet-side-spec-list"
                        value={attrs.sideSpecification || item.productionPhase || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'sideSpecification', e.target.value)
                          onChange(ri, 'productionPhase', e.target.value)
                        }}
                        placeholder="Both Side"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 6. Board Qty */}
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
                        placeholder="89 pcs"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* 7. Edging Tape Qty */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="cabinet-edging-tape-list"
                        value={attrs.edgingTapeQty || ''}
                        onChange={(e) => onUpdateVariant(ri, 'edgingTapeQty', e.target.value)}
                        placeholder="— or 5 Roll (Edging)"
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
      ) : viewMode === 'CABINET_HPL_SPEC' ? (
        /* ── 7. Closet / Cabinet HPL Pasting Details Table ── */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[950px] border-collapse divide-y divide-border/60">
            <thead className="bg-muted/60 border-b border-border">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-24`}>Line No</th>
                <th className={`${GRID_TH} w-28`}>Core Thickness</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Core Substrate Type</th>
                <th className={`${GRID_TH} min-w-[170px]`}>Front Laminate Code</th>
                <th className={`${GRID_TH} min-w-[180px]`}>Back Laminate / Liner Code</th>
                <th className={`${GRID_TH} text-center w-28`}>Quantity</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Edging Tape Qty</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    {/* 1. Line No */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.lineNo || attrs.itemId || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'lineNo', e.target.value)
                          onUpdateVariant(ri, 'itemId', e.target.value)
                        }}
                        placeholder="HPL-1"
                        className={GRID_CELL_MONO}
                      />
                    </td>

                    {/* 2. Core Thickness */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="cabinet-thickness-list"
                        value={attrs.coreThickness || ''}
                        onChange={(e) => onUpdateVariant(ri, 'coreThickness', e.target.value)}
                        placeholder="18mm"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 3. Core Substrate Type */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="cabinet-core-substrate-list"
                        value={attrs.coreSubstrateType || attrs.baseMaterial || item.materialName || ''}
                        onChange={(e) => {
                          onUpdateVariant(ri, 'coreSubstrateType', e.target.value)
                          onUpdateVariant(ri, 'baseMaterial', e.target.value)
                          onChange(ri, 'materialName', `${e.target.value} HPL Pasting`)
                        }}
                        placeholder="MR Board"
                        className={GRID_CELL_BOLD}
                      />
                    </td>

                    {/* 4. Front Laminate Code */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="cabinet-front-laminate-list"
                        value={attrs.frontLaminateCode || ''}
                        onChange={(e) => onUpdateVariant(ri, 'frontLaminateCode', e.target.value)}
                        placeholder="MR Champagne Gold"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 5. Back Laminate / Liner Code */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="cabinet-back-laminate-list"
                        value={attrs.backLaminateCode || ''}
                        onChange={(e) => onUpdateVariant(ri, 'backLaminateCode', e.target.value)}
                        placeholder="Luxury 8193"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* 6. Quantity */}
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
                        placeholder="40 pcs"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* 7. Edging Tape Qty */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        list="cabinet-edging-tape-list"
                        value={attrs.edgingTapeQty || ''}
                        onChange={(e) => onUpdateVariant(ri, 'edgingTapeQty', e.target.value)}
                        placeholder="— or 4 Roll"
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
            <thead className="bg-muted/60 border-b border-border">
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
                      value={item.netQuantity}
                      onChange={(e) => onChange(ri, 'netQuantity', e.target.value)}
                      className={GRID_CELL_NUM}
                    />
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
                  <td className="px-2.5 py-1.5 text-center font-bold text-foreground text-xs">{item.finalQuantity}</td>

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
              + Add Core Board Spec
            </button>
          )}
          {onLoadCabinetHplPreset && rows.length > 0 && (
            <button
              onClick={onLoadCabinetHplPreset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors border border-cyan-200 dark:border-cyan-800"
            >
              <Sparkles className="w-3 h-3 text-cyan-600" />
              + Add HPL Pasting
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
  onLoadCabinetPreset,
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
  onLoadCabinetPreset?: (subType: CabinetSubType) => void
  onToggleCollapse: () => void
  onRemove: () => void
}) {
  const viewMode = getViewModeForSection(section)
  const catLabel = WORK_CATEGORIES.find((c) => c.key === section.category)?.label ?? section.category
  const subTypeInfo = section.wallPanelingSubType
    ? WALL_PANELING_SUBTYPES.find((s) => s.key === section.wallPanelingSubType)
    : section.cabinetSubType
    ? CABINET_SUBTYPES.find((s) => s.key === section.cabinetSubType)
    : null
  const colors = CATEGORY_COLORS[section.category]

  return (
    <div className="border-t first:border-t-0">
      {/* Section header */}
      <div className={`flex items-center gap-2.5 px-4 py-2.5 ${colors.bg} border-b ${colors.border}`}>
        <button
          onClick={onToggleCollapse}
          className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
          title={section.collapsed ? 'Expand section' : 'Collapse section'}
        >
          {section.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-foreground">{catLabel}</span>

        {subTypeInfo && (
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${colors.pill}`}>
            {subTypeInfo.label}
          </span>
        )}

        <span className="ml-auto text-[11px] font-medium text-muted-foreground bg-background/90 px-2.5 py-0.5 rounded-full border border-border/60 shadow-2xs">
          {rows.length} {rows.length === 1 ? 'row' : 'rows'}
        </span>

        <button
          onClick={onRemove}
          className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
          title="Remove this section"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Section body */}
      {!section.collapsed && (
        <div className="p-3 bg-muted/5">
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
            onLoadCabinetCorePreset={section.cabinetSubType === 'CORE_BOARD_SPEC' && onLoadCabinetPreset ? () => onLoadCabinetPreset('CORE_BOARD_SPEC') : undefined}
            onLoadCabinetHplPreset={section.cabinetSubType === 'HPL_PASTING' && onLoadCabinetPreset ? () => onLoadCabinetPreset('HPL_PASTING') : undefined}
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
  onAdd: (category: RequisitionWorkCategory, wpSubType?: WallPanelingSubType, cabSubType?: CabinetSubType) => void
  onCancel: () => void
}) {
  const [cat, setCat] = useState<RequisitionWorkCategory>('WALL_PANELING')
  const [sub, setSub] = useState<WallPanelingSubType>('CORE_BOARDS')
  const [cabSub, setCabSub] = useState<CabinetSubType>('CORE_BOARD_SPEC')

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 bg-muted/20 border-t border-border/70">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
        <Plus className="w-3.5 h-3.5 text-primary" />
        <span>New Section:</span>
      </div>
      <select
        value={cat}
        onChange={(e) => setCat(e.target.value as RequisitionWorkCategory)}
        className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-primary font-medium shadow-xs"
      >
        {WORK_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>

      {cat === 'WALL_PANELING' && (
        <select
          value={sub}
          onChange={(e) => setSub(e.target.value as WallPanelingSubType)}
          className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-primary font-medium shadow-xs"
        >
          {WALL_PANELING_SUBTYPES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      )}

      {cat === 'CABINETS_CLOSETS' && (
        <select
          value={cabSub}
          onChange={(e) => setCabSub(e.target.value as CabinetSubType)}
          className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-amber-500 font-medium shadow-xs"
        >
          {CABINET_SUBTYPES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      )}

      <button
        onClick={() => onAdd(
          cat,
          cat === 'WALL_PANELING' ? sub : undefined,
          cat === 'CABINETS_CLOSETS' ? cabSub : undefined
        )}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" /> Confirm Add Section
      </button>
      <button onClick={onCancel} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5">
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
  onLoadCabinetPreset,
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
  onLoadCabinetPreset: (sectionId: string, subType: CabinetSubType) => void
  onAddSection: (category: RequisitionWorkCategory, wpSubType?: WallPanelingSubType, cabSubType?: CabinetSubType) => void
  onRemoveSection: (sectionId: string) => void
  onToggleSectionCollapse: (sectionId: string) => void
}) {
  const [cardExpanded, setCardExpanded] = useState(true)
  const [showAddSection, setShowAddSection] = useState(false)

  const totalRows = sections.reduce((sum, s) => sum + getRowsForSection(s.id).length, 0)

  return (
    <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-xs transition-shadow hover:shadow-sm">
      {/* Card header */}
      <button
        onClick={() => setCardExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/35 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-muted-foreground p-0.5 rounded flex-shrink-0">
            {cardExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {area && (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {area.name}
                </span>
              )}
              <p className="text-sm font-bold text-foreground truncate">{item.description}</p>
            </div>
            {item.materials && (
              <p className="text-xs text-muted-foreground/80 line-clamp-1">{item.materials}</p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right space-y-1 pl-3 border-l border-border/50">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">{item.quantity} {item.unit}</span>
            <span className="text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/40">
              ৳{item.amount.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground">
            {sections.length} {sections.length === 1 ? 'section' : 'sections'} · {totalRows} {totalRows === 1 ? 'row' : 'rows'}
          </p>
        </div>
      </button>

      {cardExpanded && (
        <div>
          {/* Empty state */}
          {sections.length === 0 && !showAddSection && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground space-y-2 bg-muted/5">
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
              onToggleCollapse={() => onToggleSectionCollapse(section.id)}
              onRemove={() => onRemoveSection(section.id)}
            />
          ))}

          {/* Add Section form or trigger */}
          {showAddSection ? (
            <AddSectionForm
              onAdd={(cat, wpSub, cabSub) => {
                onAddSection(cat, wpSub, cabSub)
                setShowAddSection(false)
              }}
              onCancel={() => setShowAddSection(false)}
            />
          ) : (
            <div className="px-4 py-2.5 border-t border-border/70 bg-muted/10">
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
  onLoadCabinetPreset,
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
  onLoadCabinetPreset: (sectionId: string, subType: CabinetSubType) => void
  onAddSection: (category: RequisitionWorkCategory, wpSubType?: WallPanelingSubType, cabSubType?: CabinetSubType) => void
  onRemoveSection: (sectionId: string) => void
  onToggleSectionCollapse: (sectionId: string) => void
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
        <div>
          {sections.length === 0 && !showAddSection && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground space-y-2 bg-muted/5">
              <Package className="w-6 h-6 mx-auto text-muted-foreground/40" />
              <p className="font-semibold text-foreground/80">No general sections added yet.</p>
              <p className="text-[11px] text-muted-foreground">Add a Wall Paneling or Closet/Cabinet section below to specify catalog materials.</p>
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
              onToggleCollapse={() => onToggleSectionCollapse(section.id)}
              onRemove={() => onRemoveSection(section.id)}
            />
          ))}

          {showAddSection ? (
            <AddSectionForm
              onAdd={(cat, wpSub, cabSub) => {
                onAddSection(cat, wpSub, cabSub)
                setShowAddSection(false)
              }}
              onCancel={() => setShowAddSection(false)}
            />
          ) : (
            <div className="px-4 py-2.5 border-t border-border/70 bg-muted/10">
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

  const addSection = (
    cardKey: string,
    category: RequisitionWorkCategory,
    wallPanelingSubType?: WallPanelingSubType,
    cabinetSubType?: CabinetSubType,
    quotationLineItemId?: string
  ) => {
    const sectionId = `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setSectionsMap((prev) => ({
      ...prev,
      [cardKey]: [...(prev[cardKey] ?? []), { id: sectionId, category, wallPanelingSubType, cabinetSubType, collapsed: false }],
    }))
    setItemsMap((prev) => ({
      ...prev,
      [sectionItemKey(cardKey, sectionId)]: [blankItem(category, wallPanelingSubType, cabinetSubType, quotationLineItemId)],
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
        nextAttrs.baseMaterial || nextAttrs.coreSubstrateType || nextAttrs.material || nextAttrs.lengthInches || nextAttrs.lengthSpec || nextAttrs.applicationMethod,
        nextAttrs.laminateTopSurface || nextAttrs.laminateFinishDetails || nextAttrs.frontLaminateCode || nextAttrs.accentFinish || nextAttrs.gaugeSize || nextAttrs.thicknessSpec,
        nextAttrs.surfaceCodeFinish || nextAttrs.backLaminateCode || nextAttrs.sideSpecification || nextAttrs.codeVariant || nextAttrs.materialFinish,
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
      [key]: [
        ...(prev[key] ?? []),
        blankItem(
          sectionInfo?.category ?? 'WALL_PANELING',
          sectionInfo?.wallPanelingSubType,
          sectionInfo?.cabinetSubType,
          quotationLineItemId
        ),
      ],
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

  const loadCabinetPresetForSection = (cardKey: string, sectionId: string, subType: CabinetSubType, quotationLineItemId?: string) => {
    const presetMap: Record<CabinetSubType, RequisitionItemInput[]> = {
      CORE_BOARD_SPEC: SAMPLE_CABINET_CORE_BOARD_ITEMS,
      HPL_PASTING: SAMPLE_CABINET_HPL_PASTING_ITEMS,
    }
    const presetItems = presetMap[subType].map((item) => ({
      ...item,
      quotationLineItemId,
      variantAttributes: { ...(item.variantAttributes || {}), cabinetSubType: subType },
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

  const coveragePct = lineItems.length > 0 ? Math.round((coveredLineItems / lineItems.length) * 100) : 0

  /* ── RENDER ── */
  return (
    <div className="p-4 md:p-6 space-y-6 w-full pb-24">
      {/* ── Global Autocomplete Lists ── */}
      <BoardDatalists />

      {/* ── Top Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="space-y-1">
          <Link
            href="/crm/boq/assigned-task"
            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Assigned Tasks
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-primary" />
            Material Requisition Builder
          </h1>
          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
            <span>Project: <strong className="text-foreground">{lead.name}</strong></span>
            <span>•</span>
            <span>Phone: {lead.phone || 'N/A'}</span>
            <span>•</span>
            <span>Location: {lead.location || 'N/A'}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSave('DRAFT')}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-xs hover:bg-accent transition-colors disabled:opacity-50"
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
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {saveSuccess}
        </div>
      )}

      {/* ── Executive KPI Summary Strip ── */}
      {detailQuotation ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* KPI 1: Approved Quotation Total */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Approved Quotation</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                {detailQuotation.status}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                ৳{detailQuotation.grandTotal.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Total approved client project contract value
              </p>
            </div>
          </div>

          {/* KPI 2: Requisition Coverage Progress */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Line Item Coverage</span>
              <span className="text-xs font-bold text-foreground">
                {coveragePct}%
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {coveredLineItems} <span className="text-sm font-normal text-muted-foreground">/ {lineItems.length} items</span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {lineItems.length - coveredLineItems} remaining
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    coveragePct === 100
                      ? 'bg-emerald-500'
                      : coveragePct > 50
                      ? 'bg-primary'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${coveragePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* KPI 3: Active Material Rows */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Material Specs</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                Live Requisition
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {totalMaterialRows} <span className="text-sm font-normal text-muted-foreground">total rows</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {totalMaterialRows - extraRowCount} linked to BOQ · {extraRowCount} general site materials
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-amber-500/10 border-amber-500/30 p-4 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
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
                <div className="flex items-center gap-2 border-b border-border/60 pb-2.5 pt-2">
                  <div className="p-1 rounded bg-primary/10 text-primary">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{section.name}</h2>
                  <span className="text-xs font-medium text-muted-foreground ml-auto bg-muted px-2.5 py-0.5 rounded-full border border-border/40">
                    {sectionItems.length} {sectionItems.length !== 1 ? 'line items' : 'line item'}
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
                        onLoadCabinetPreset={(sectionId, subType) => loadCabinetPresetForSection(li.id, sectionId, subType, li.id)}
                        onAddSection={(cat, wpSub, cabSub) => addSection(li.id, cat, wpSub, cabSub, li.id)}
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
          onLoadCabinetPreset={(sectionId, subType) => loadCabinetPresetForSection(EXTRA_KEY, sectionId, subType, undefined)}
          onAddSection={(cat, wpSub, cabSub) => addSection(EXTRA_KEY, cat, wpSub, cabSub, undefined)}
          onRemoveSection={(sectionId) => removeSection(EXTRA_KEY, sectionId)}
          onToggleSectionCollapse={(sectionId) => toggleSectionCollapse(EXTRA_KEY, sectionId)}
        />
      </div>

      {/* ── Requisition Notes ── */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-2">
        <label className="text-xs font-bold text-foreground uppercase tracking-wider">
          Requisition Remarks / Special Factory Notes
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Waterproof BWP grade required for kitchen sink area. Material delivery target Oct 20."
          className="w-full bg-background border border-input rounded-md p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary shadow-xs"
        />
      </div>

      {/* ── Bottom Save / Submit Bar ── */}
      {totalMaterialRows > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-background/95 backdrop-blur-md px-6 py-3 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">{totalMaterialRows}</strong> material row
            {totalMaterialRows !== 1 ? 's' : ''} across{' '}
            <strong className="text-foreground">{coveredLineItems}</strong> quotation item
            {coveredLineItems !== 1 ? 's' : ''}
            {extraRowCount > 0 && (
              <> + <strong className="text-foreground">{extraRowCount}</strong> general row{extraRowCount !== 1 ? 's' : ''}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleSave('DRAFT')}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-lg border border-input bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            Save Draft
          </button>
          <button
            onClick={() => handleSave('SUBMITTED')}
            disabled={isPending || totalMaterialRows === 0}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Submit Requisition
          </button>
        </div>
        </div>
      )}
    </div>
  )
}

