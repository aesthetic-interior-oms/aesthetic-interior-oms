'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
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
  ChevronLeft,
  Search,
  Target,
  Package,
  Layers,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Download,
  Wrench,
  Pin,
  FlaskConical,
  Receipt,
  Lightbulb,
  Zap,
  Check,
  X,
} from 'lucide-react'
import { saveMaterialRequisition, RequisitionItemInput } from '@/lib/boq-service'
import { DEFAULT_CABINET_CATALOG, type CabinetCatalogConfig } from '@/lib/boq-cabinet-catalog'
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

export interface BoqSavedAccessoryItem {
  id: string
  name: string
  category: string
  itemCode: string
  defaultUnit: string
}

export const DEFAULT_ACCESSORY_CATEGORIES = ['Kitchen', 'Closet', 'Cabinet', 'Hardware']

export const DEFAULT_SAVED_ACCESSORIES: BoqSavedAccessoryItem[] = [
  { id: 'acc-1', name: 'Elevator Basket',         category: 'Kitchen', itemCode: 'KIW-23',              defaultUnit: 'Pcs' },
  { id: 'acc-2', name: 'Cutlery Tray',            category: 'Kitchen', itemCode: 'KIW-23',              defaultUnit: 'Pcs' },
  { id: 'acc-3', name: 'Plate Organizer',         category: 'Kitchen', itemCode: 'KIW-12.1',            defaultUnit: 'Pcs' },
  { id: 'acc-4', name: 'Pantry Unit',             category: 'Kitchen', itemCode: 'KIW-33',              defaultUnit: 'Pcs' },
  { id: 'acc-5', name: 'Pull Out Hanger',         category: 'Closet',  itemCode: 'GLFA943B / GLFA943S', defaultUnit: 'Pcs' },
  { id: 'acc-6', name: 'Trousers / Saree Hanger', category: 'Closet',  itemCode: 'GLFJ113M / GLFJ113G', defaultUnit: 'Pcs' },
  { id: 'acc-7', name: 'Jewelry Tray Organizer',  category: 'Closet',  itemCode: 'R9001G-800',          defaultUnit: 'Pcs' },
]

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

const UOM_OPTIONS = ['Pcs', 'Nos', 'Sheets', 'Meters', 'RFT', 'Kg', 'Rolls', 'Pack', 'Boxes', 'Sets', 'Liters', 'Tube', 'Roll', 'Not specified']

/** Lighting and electrical schedule transcribed from the client-provided sheet.
 * Unknown quantities are represented as 0 so they remain visibly unfilled and
 * can be completed by the BOQ user instead of being guessed.
 */
function scheduleItem(
  workCategory: RequisitionWorkCategory,
  materialName: string,
  specifications: string,
  quantity: number,
  unit = 'pcs',
  extraAttrs: Record<string, unknown> = {},
): RequisitionItemInput {
  const scheduleKey = workCategory === 'CEILING' ? 'ceiling-light-xl-v2' : 'ceiling-electrical-xl-v2'
  return {
    workCategory,
    materialName,
    specifications,
    netQuantity: quantity,
    wastagePercent: 0,
    finalQuantity: quantity,
    unit,
    productionPhase: workCategory === 'CEILING' ? 'Ceiling Lighting' : 'Electrical Work',
    remarks: (extraAttrs.remarks as string) || (quantity === 0 ? 'Quantity not specified in source list; confirm before requisition.' : ''),
    variantAttributes: {
      sourceScheduleKey: scheduleKey,
      sourceQuantityStatus: quantity === 0 ? 'NEEDS_CONFIRMATION' : 'CONFIRMED',
      colorTempSpecs: specifications,
      ...extraAttrs,
    },
  }
}

export interface CeilingLightingCatalogItem {
  name: string
  subCategory: string
  defaultSpecs: string
  sizeOptions?: string[]
  voltageOptions?: string[]
  defaultSize?: string
  defaultVoltage?: string
  defaultQty?: number
  unit: string
  defaultRemarks: string
}

export const CEILING_LIGHTING_CATALOG: CeilingLightingCatalogItem[] = [
  {
    name: 'T-5 Light',
    subCategory: 'Linear Profile (T-5)',
    defaultSpecs: '4000 K',
    sizeOptions: ['1 Feet', '2 Feet', '3 Feet', '4 Feet'],
    defaultSize: '4 Feet',
    unit: 'pcs',
    defaultRemarks: 'Profile Light',
  },
  {
    name: 'Spot Light',
    subCategory: 'Spotlights & Panels',
    defaultSpecs: '4000 K',
    defaultQty: 95,
    unit: 'pcs',
    defaultRemarks: 'Recessed Spot',
  },
  {
    name: 'Surface Panel Light',
    subCategory: 'Spotlights & Panels',
    defaultSpecs: '4000 K',
    voltageOptions: ['15 Watt'],
    defaultVoltage: '15 Watt',
    unit: 'pcs',
    defaultRemarks: 'Surface Mounted',
  },
  {
    name: 'Surface Spot Light',
    subCategory: 'Spotlights & Panels',
    defaultSpecs: '4000 K',
    voltageOptions: ['10 Watt'],
    defaultVoltage: '10 Watt',
    unit: 'pcs',
    defaultRemarks: 'Surface Mounted',
  },
  {
    name: 'Cylinder Light',
    subCategory: 'Spotlights & Panels',
    defaultSpecs: 'Standard',
    defaultQty: 15,
    unit: 'pcs',
    defaultRemarks: 'Downlight',
  },
  {
    name: 'Magnetic Flat Light',
    subCategory: 'Magnetic Track',
    defaultSpecs: 'Track Insert',
    sizeOptions: ['6 Feet', '12 Inch', '24 Inch'],
    defaultSize: '12 Inch',
    unit: 'pcs',
    defaultRemarks: 'Track Insert',
  },
  {
    name: 'Magnetic Channel / Track',
    subCategory: 'Magnetic Track',
    defaultSpecs: 'Recessed Track',
    sizeOptions: ['6 Feet', '10 Feet'],
    defaultSize: '6 Feet',
    unit: 'pcs',
    defaultRemarks: 'Track Channel',
  },
  {
    name: 'Magnetic Focus Light',
    subCategory: 'Magnetic Track',
    defaultSpecs: 'Adjustable Spot',
    defaultQty: 7,
    unit: 'pcs',
    defaultRemarks: 'Focus Light',
  },
  {
    name: 'Silicon Light',
    subCategory: 'Strip Lighting',
    defaultSpecs: '8 mm Strip',
    voltageOptions: ['220V AC', '12V DC'],
    defaultVoltage: '220V AC',
    unit: 'rft',
    defaultRemarks: 'Flexible Strip',
  },
  {
    name: 'Silicon Cover',
    subCategory: 'Strip Lighting',
    defaultSpecs: 'Diffuser Cover',
    unit: 'set',
    defaultRemarks: 'Channel Cover',
  },
]

export const CEILING_LIGHTING_SCHEDULE: RequisitionItemInput[] = [
  scheduleItem('CEILING', 'T-5 Light', '4000 K', 15, 'pcs', { sizeDimension: '1 Feet', voltageWattage: '—', remarks: 'Profile Light' }),
  scheduleItem('CEILING', 'T-5 Light', '4000 K', 10, 'pcs', { sizeDimension: '2 Feet', voltageWattage: '—', remarks: 'Profile Light' }),
  scheduleItem('CEILING', 'T-5 Light', '4000 K', 5, 'pcs', { sizeDimension: '3 Feet', voltageWattage: '—', remarks: 'Profile Light' }),
  scheduleItem('CEILING', 'T-5 Light', '4000 K', 80, 'pcs', { sizeDimension: '4 Feet', voltageWattage: '—', remarks: 'Main Profile Light' }),
  scheduleItem('CEILING', 'Spot Light', '4000 K', 95, 'pcs', { sizeDimension: '—', voltageWattage: '—', remarks: 'Recessed Spot' }),
  scheduleItem('CEILING', 'Surface Panel Light', '4000 K', 0, 'pcs', { sizeDimension: '—', voltageWattage: '15 Watt', remarks: 'Surface Mounted' }),
  scheduleItem('CEILING', 'Surface Spot Light', '4000 K', 0, 'pcs', { sizeDimension: '—', voltageWattage: '10 Watt', remarks: 'Surface Mounted' }),
  scheduleItem('CEILING', 'Cylinder Light', 'Standard', 15, 'pcs', { sizeDimension: '—', voltageWattage: '—', remarks: 'Downlight' }),
  scheduleItem('CEILING', 'Magnetic Flat Light', 'Track Insert', 0, 'pcs', { sizeDimension: '6 Feet', voltageWattage: '—', remarks: 'Track Insert' }),
  scheduleItem('CEILING', 'Magnetic Flat Light', 'Track Insert', 14, 'pcs', { sizeDimension: '12 Inch', voltageWattage: '—', remarks: 'Track Insert' }),
  scheduleItem('CEILING', 'Magnetic Flat Light', 'Track Insert', 0, 'pcs', { sizeDimension: '24 Inch', voltageWattage: '—', remarks: 'Track Insert' }),
  scheduleItem('CEILING', 'Magnetic Channel / Track', 'Recessed Track', 5, 'pcs', { sizeDimension: '6 Feet', voltageWattage: '—', remarks: 'Track Channel' }),
  scheduleItem('CEILING', 'Magnetic Channel / Track', 'Recessed Track', 2, 'pcs', { sizeDimension: '10 Feet', voltageWattage: '—', remarks: 'Track Channel' }),
  scheduleItem('CEILING', 'Magnetic Focus Light', 'Adjustable Spot', 7, 'pcs', { sizeDimension: '—', voltageWattage: '—', remarks: 'Focus Light' }),
  scheduleItem('CEILING', 'Silicon Light', '8 mm Strip', 60, 'rft', { sizeDimension: '—', voltageWattage: '220V AC', remarks: 'Flexible Strip' }),
  scheduleItem('CEILING', 'Silicon Light', '8 mm Strip', 0, 'rft', { sizeDimension: '—', voltageWattage: '12V DC', remarks: 'Low Volt Strip' }),
  scheduleItem('CEILING', 'Silicon Cover', 'Diffuser Cover', 0, 'set', { sizeDimension: '—', voltageWattage: '—', remarks: 'Channel Cover' }),
]

export interface CeilingElectricalCatalogItem {
  name: string
  subCategory: string
  defaultSpecs: string
  defaultRating?: string
  hasRating: boolean
  voltageOptions?: string[]
  defaultVoltage?: string
  hasVoltage: boolean
  defaultQty?: number
  unit: string
  defaultRemarks: string
}

export const CEILING_ELECTRICAL_CATALOG: CeilingElectricalCatalogItem[] = [
  {
    name: 'Power Supply Driver',
    subCategory: 'Drivers & Power',
    defaultSpecs: '12V DC Output',
    defaultRating: '—',
    hasRating: false,
    voltageOptions: ['60 Watt', '100 Watt', '200 Watt'],
    defaultVoltage: '60 Watt',
    hasVoltage: true,
    unit: 'pcs',
    defaultRemarks: 'Driver Unit',
  },
  {
    name: 'Power Supply (General)',
    subCategory: 'Drivers & Power',
    defaultSpecs: 'Standard Driver',
    defaultRating: '—',
    hasRating: false,
    hasVoltage: false,
    defaultQty: 5,
    unit: 'pcs',
    defaultRemarks: 'Main Power Driver',
  },
  {
    name: 'Electrical Cable',
    subCategory: 'Cable & Accessories',
    defaultSpecs: '14/76 Cable',
    defaultRating: '—',
    hasRating: false,
    hasVoltage: false,
    unit: 'coil/rft',
    defaultRemarks: 'Wiring Cable',
  },
  {
    name: 'Electrical Insulation Tape',
    subCategory: 'Cable & Accessories',
    defaultSpecs: 'PVC Tape',
    defaultRating: '—',
    hasRating: false,
    hasVoltage: false,
    unit: 'roll',
    defaultRemarks: 'Accessory',
  },
  {
    name: 'DP Switch',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Double Pole',
    defaultRating: 'Heavy Duty',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Main Switch',
  },
  {
    name: '1 Gang Switch',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Single Switch',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Lighting Control',
  },
  {
    name: '2 Gang Switch',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Double Switch',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Lighting Control',
  },
  {
    name: '3 Gang Switch',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Triple Switch',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Lighting Control',
  },
  {
    name: '4 Gang Switch',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Quad Switch',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Lighting Control',
  },
  {
    name: 'Fan Dimmer',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Speed Regulator',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Fan Control',
  },
  {
    name: 'Calling Bell Switch',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Doorbell Fitting',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Bell Control',
  },
  {
    name: 'Calling Bell Push',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'External Push',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Push Button',
  },
  {
    name: 'False Cover',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Blank Plate',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Dummy Cover',
  },
  {
    name: '15 Amp Socket',
    subCategory: 'Sockets & Outlets',
    defaultSpecs: 'Power Socket',
    defaultRating: '15A Rating',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Power Outlet',
  },
  {
    name: '13 Amp Socket',
    subCategory: 'Sockets & Outlets',
    defaultSpecs: 'Multi Socket',
    defaultRating: '13A Rating',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Power Outlet',
  },
  {
    name: 'Dish Socket',
    subCategory: 'Sockets & Outlets',
    defaultSpecs: 'TV Outlet',
    defaultRating: 'Coaxial',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Media Outlet',
  },
  {
    name: 'Internet Socket',
    subCategory: 'Sockets & Outlets',
    defaultSpecs: 'RJ45 LAN Outlet',
    defaultRating: 'Data',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Data Point',
  },
  {
    name: 'Intercom Socket',
    subCategory: 'Sockets & Outlets',
    defaultSpecs: 'Comm Outlet',
    defaultRating: 'Voice',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Comms Point',
  },
]

export const CEILING_ELECTRICAL_SCHEDULE: RequisitionItemInput[] = [
  scheduleItem('CEILING', 'Power Supply Driver', '12V DC Output', 0, 'pcs', { ratingDimension: '—', voltageWattage: '60 Watt', remarks: 'Driver Unit' }),
  scheduleItem('CEILING', 'Power Supply Driver', '12V DC Output', 0, 'pcs', { ratingDimension: '—', voltageWattage: '100 Watt', remarks: 'Driver Unit' }),
  scheduleItem('CEILING', 'Power Supply Driver', '12V DC Output', 0, 'pcs', { ratingDimension: '—', voltageWattage: '200 Watt', remarks: 'Driver Unit' }),
  scheduleItem('CEILING', 'Power Supply (General)', 'Standard Driver', 5, 'pcs', { ratingDimension: '—', voltageWattage: '—', remarks: 'Main Power Driver' }),
  scheduleItem('CEILING', 'Electrical Cable', '14/76 Cable', 0, 'coil/rft', { ratingDimension: '—', voltageWattage: '—', remarks: 'Wiring Cable' }),
  scheduleItem('CEILING', 'Electrical Insulation Tape', 'PVC Tape', 0, 'roll', { ratingDimension: '—', voltageWattage: '—', remarks: 'Accessory' }),
  scheduleItem('CEILING', 'DP Switch', 'Double Pole', 0, 'pcs', { ratingDimension: 'Heavy Duty', voltageWattage: '—', remarks: 'Main Switch' }),
  scheduleItem('CEILING', '1 Gang Switch', 'Single Switch', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Lighting Control' }),
  scheduleItem('CEILING', '2 Gang Switch', 'Double Switch', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Lighting Control' }),
  scheduleItem('CEILING', '3 Gang Switch', 'Triple Switch', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Lighting Control' }),
  scheduleItem('CEILING', '4 Gang Switch', 'Quad Switch', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Lighting Control' }),
  scheduleItem('CEILING', 'Fan Dimmer', 'Speed Regulator', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Fan Control' }),
  scheduleItem('CEILING', 'Calling Bell Switch', 'Doorbell Fitting', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Bell Control' }),
  scheduleItem('CEILING', 'Calling Bell Push', 'External Push', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Push Button' }),
  scheduleItem('CEILING', 'False Cover', 'Blank Plate', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Dummy Cover' }),
  scheduleItem('CEILING', '15 Amp Socket', 'Power Socket', 0, 'pcs', { ratingDimension: '15A Rating', voltageWattage: '—', remarks: 'Power Outlet' }),
  scheduleItem('CEILING', '13 Amp Socket', 'Multi Socket', 0, 'pcs', { ratingDimension: '13A Rating', voltageWattage: '—', remarks: 'Power Outlet' }),
  scheduleItem('CEILING', 'Dish Socket', 'TV Outlet', 0, 'pcs', { ratingDimension: 'Coaxial', voltageWattage: '—', remarks: 'Media Outlet' }),
  scheduleItem('CEILING', 'Internet Socket', 'RJ45 LAN Outlet', 0, 'pcs', { ratingDimension: 'Data', voltageWattage: '—', remarks: 'Data Point' }),
  scheduleItem('CEILING', 'Intercom Socket', 'Comm Outlet', 0, 'pcs', { ratingDimension: 'Voice', voltageWattage: '—', remarks: 'Comms Point' }),
]

export const ELECTRICAL_WORK_SCHEDULE = CEILING_ELECTRICAL_SCHEDULE

/** Base material options for Wall Paneling and Cabinet/Closet sections */
const BOARD_BASE_MATERIAL_GROUPS: { group: string; items: string[] }[] = [
  {
    group: '1. Plywood Varieties (Hardwood & Core Strata)',
    items: [
      'Garjon Plywood (Garjon Ply)',
      'Marine Plywood (BWP / Merin Ply)',
      'Commercial Plywood (Standard Ply)',
      'Film-Faced Plywood (Shuttering Ply)',
    ],
  },
  {
    group: '2. Engineered & Fiber Boards',
    items: [
      'MDF (Medium Density Fiberboard)',
      'Particle Board (Plain Raw)',
      'High Moisture-Resistant (HMR) Board',
    ],
  },
  {
    group: '3. Pre-Finished & Surface-Coated Boards',
    items: [
      'Melamine Faced Board / MFC (Melamine Board)',
      'Veneered Board',
      'High Gloss UV Board / Acrylic Board',
    ],
  },
  {
    group: '4. Specialty & Waterproof Boards',
    items: [
      'Blockboard',
      'WPC (Wood Plastic Composite) Board',
    ],
  },
]

const BOARD_BASE_MATERIALS: string[] = BOARD_BASE_MATERIAL_GROUPS.flatMap((g) => g.items)

/** Laminate catalog for Wall Paneling Boards section (Solid shades + HPL brands) */
const BOARD_LAMINATE_CATALOG = {
  solidShades: [
    'Beladoa Laminate',
    'Airolam Laminate',
    'Acrylic Finish',
    'None (Raw)',
    'Duco Paint',
    'PU Paint',
    'Melamine Finish',
    'Veneer Finish',
  ],
  hplBrands: [
    'Luxury 8193',
    'Aromex 9904',
    'Super 101',
    'Super 111',
    'Beladoa 2003',
    'Airolam 903',
    'Elegant A-7123',
    'Elegant A-7112',
    'Advance 14081',
  ],
}

/** Special key used for materials not linked to any quotation line item */
const EXTRA_KEY = '__extra__'

export interface BoardVariantAttributes {
  [key: string]: string | number | boolean | null | undefined

  // Core Structural Board attributes
  itemId?: string
  coreThickness?: string
  baseMaterial?: string
  laminateTopSurface?: string
  surfaceCodeFinish?: string
  boardLaminateType?: 'SOLID' | 'HPL' | 'PRELAMINATED' | 'DUCO' | string
  boardBackLaminateType?: 'SOLID' | 'HPL' | 'PRELAMINATED' | 'DUCO' | string
  sheetSize?: string
  functionalUsage?: string
  qtyLabel?: string

  // Decorative Panels, Louvers & Edge Profiles attributes
  decorativeType?: 'READYMADE' | 'CUSTOMIZE' | string
  thickness?: string
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
  packagingUnit?: string
  unitType?: string

  column1?: string

  /** Persists the WallPanelingSubType so items can be re-grouped into sections on reload */
  wpSubType?: string

  // ── Closet / Cabinet attributes ──
  srNo?: string
  lineNo?: string
  usage?: string
  isHplPasting?: boolean | string
  laminateFinishDetails?: string
  sideSpecification?: string
  edgingTapeQty?: string
  coreSubstrateType?: string
  frontLaminateCode?: string
  frontLaminateType?: 'SOLID' | 'HPL' | 'PRELAMINATED' | 'DUCO' | string
  backLaminateCode?: string
  backLaminateType?: 'SOLID' | 'HPL' | 'PRELAMINATED' | 'DUCO' | string
  cabinetSubType?: string

  // ── Accessories & Hardware attributes ──
  accessoryCategory?: string
  itemCode?: string
  dimensions?: string
  dimW?: string
  dimH?: string
  dimD?: string
  unitPrice?: string
  totalAmount?: string
  serviceCategory?: string
  quantityUnit?: string
  rateType?: string
  estimatedTotal?: string
  accessoriesSubType?: string

  // ── Appliance attributes ──
  brandModelCode?: string
  outerDimensions?: string
  cabinetNicheCutOutSize?: string
  mepUtilityRequirements?: string
  applianceSubType?: string

  // ── Ceiling & Electrical attributes ──
  ceilingSubType?: string
  colorTempSpecs?: string
  sizeDimension?: string
  voltageWattage?: string
  ratingDimension?: string
}

/** 1. Boards Catalog Preset */
const SAMPLE_WALL_PANEL_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Garjon Plywood',
    specifications: '12mm | Garjon Plywood | Beladoa Laminate | 2003 SMT (Super Matt)',
    variantAttributes: {
      baseMaterial: 'Garjon Plywood',
      coreThickness: '12mm',
      laminateTopSurface: 'Beladoa Laminate',
      surfaceCodeFinish: '2003 SMT (Super Matt)',
      sheetSize: "8' x 4'",
      edgingTapeQty: '50 RFT',
      functionalUsage: 'Shutter / Exterior Cabinet',
      qtyLabel: '1',
      wpSubType: 'CORE_BOARDS',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Shutter / Exterior Cabinet',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Garjon Plywood',
    specifications: '12mm | Garjon Plywood | Airolam Laminate | 903 SMR (Suede Matt Finished)',
    variantAttributes: {
      baseMaterial: 'Garjon Plywood',
      coreThickness: '12mm',
      laminateTopSurface: 'Airolam Laminate',
      surfaceCodeFinish: '903 SMR (Suede Matt Finished)',
      sheetSize: "8' x 4'",
      edgingTapeQty: '120 RFT',
      functionalUsage: 'Inner Box / Shelving',
      qtyLabel: '5',
      wpSubType: 'CORE_BOARDS',
    },
    netQuantity: 5,
    wastagePercent: 0,
    finalQuantity: 5,
    unit: 'Pcs',
    productionPhase: 'Inner Box / Shelving',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Garjon Plywood',
    specifications: '18mm | Garjon Plywood | None (Raw) | Raw Uncoated',
    variantAttributes: {
      baseMaterial: 'Garjon Plywood',
      coreThickness: '18mm',
      laminateTopSurface: 'None (Raw)',
      surfaceCodeFinish: 'Raw Uncoated',
      sheetSize: "8' x 4'",
      edgingTapeQty: '40 RFT',
      functionalUsage: 'Heavy Load Frame / Base',
      qtyLabel: '2',
      wpSubType: 'CORE_BOARDS',
    },
    netQuantity: 2,
    wastagePercent: 0,
    finalQuantity: 2,
    unit: 'Pcs',
    productionPhase: 'Heavy Load Frame / Base',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Commercial Ply',
    specifications: '12mm | Commercial Ply | None (Raw) | Raw Uncoated',
    variantAttributes: {
      baseMaterial: 'Commercial Ply',
      coreThickness: '12mm',
      laminateTopSurface: 'None (Raw)',
      surfaceCodeFinish: 'Raw Uncoated',
      sheetSize: "8' x 4'",
      edgingTapeQty: '80 RFT',
      functionalUsage: 'Backing Panel / Partition',
      qtyLabel: '4',
      wpSubType: 'CORE_BOARDS',
    },
    netQuantity: 4,
    wastagePercent: 0,
    finalQuantity: 4,
    unit: 'Pcs',
    productionPhase: 'Backing Panel / Partition',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Commercial Ply',
    specifications: '6mm | Commercial Ply | None (Raw) | Raw Uncoated',
    variantAttributes: {
      baseMaterial: 'Commercial Ply',
      coreThickness: '6mm',
      laminateTopSurface: 'None (Raw)',
      surfaceCodeFinish: 'Raw Uncoated',
      sheetSize: "8' x 4'",
      edgingTapeQty: '25 RFT',
      functionalUsage: 'Drawer Bottom / Backing',
      qtyLabel: '1',
      wpSubType: 'CORE_BOARDS',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Drawer Bottom / Backing',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Garjon Plywood',
    specifications: '25mm | Garjon Plywood | None (Raw) | Heavy Structural',
    variantAttributes: {
      baseMaterial: 'Garjon Plywood',
      coreThickness: '25mm',
      laminateTopSurface: 'None (Raw)',
      surfaceCodeFinish: 'Heavy Structural',
      sheetSize: "8' x 4'",
      edgingTapeQty: 'Catalog',
      functionalUsage: 'Countertop Sub-base',
      qtyLabel: 'Catalog',
      wpSubType: 'CORE_BOARDS',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Countertop Sub-base',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'WPC (Wood Plastic)',
    specifications: '18mm | WPC (Wood Plastic) | None (Raw) | Water Resistant',
    variantAttributes: {
      baseMaterial: 'WPC (Wood Plastic)',
      coreThickness: '18mm',
      laminateTopSurface: 'None (Raw)',
      surfaceCodeFinish: 'Water Resistant',
      sheetSize: "8' x 4'",
      edgingTapeQty: 'Catalog',
      functionalUsage: 'Sink Under-cabinet',
      qtyLabel: 'Catalog',
      wpSubType: 'CORE_BOARDS',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Sink Under-cabinet',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'MDF Core',
    specifications: '18mm | MDF Core | Acrylic Finish | HG Pure White',
    variantAttributes: {
      baseMaterial: 'MDF Core',
      coreThickness: '18mm',
      laminateTopSurface: 'Acrylic Finish',
      surfaceCodeFinish: 'HG Pure White',
      sheetSize: "8' x 4'",
      edgingTapeQty: 'Catalog',
      functionalUsage: 'Modern Kitchen Fronts',
      qtyLabel: 'Catalog',
      wpSubType: 'CORE_BOARDS',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Modern Kitchen Fronts',
  },
]

/** 2. Decorative Panels Catalog Preset */
const SAMPLE_LOUVER_PROFILE_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Charcoal Louver Panel',
    specifications: 'Charcoal / WPC | Rose Gold Accent | Advance 14081',
    variantAttributes: {
      material: 'Charcoal / WPC',
      accentFinish: 'Rose Gold Accent',
      codeVariant: 'Advance 14081',
      primaryUsage: 'Feature Wall Accent',
      qtyLabel: '27',
      wpSubType: 'LOUVERS_PROFILES',
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
    specifications: 'Charcoal / WPC | Rose Gold Line | Line Type A',
    variantAttributes: {
      material: 'Charcoal / WPC',
      accentFinish: 'Rose Gold Line',
      codeVariant: 'Line Type A',
      primaryUsage: 'Framing Accent',
      qtyLabel: '7',
      wpSubType: 'LOUVERS_PROFILES',
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
    specifications: 'Charcoal / WPC | Rose Gold Line | Line Type B',
    variantAttributes: {
      material: 'Charcoal / WPC',
      accentFinish: 'Rose Gold Line',
      codeVariant: 'Line Type B',
      primaryUsage: 'Secondary Wall Panel',
      qtyLabel: '54',
      wpSubType: 'LOUVERS_PROFILES',
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
    specifications: 'Aluminum / Brass | Metallic Rose Gold | T-Bit 10mm',
    variantAttributes: {
      material: 'Aluminum / Brass',
      accentFinish: 'Metallic Rose Gold',
      codeVariant: 'T-Bit 10mm',
      primaryUsage: 'Groove Accent Inlay',
      qtyLabel: '26',
      wpSubType: 'LOUVERS_PROFILES',
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
    specifications: 'PVC Plastic | Solid White / Grey | 3mm Thickness',
    variantAttributes: {
      material: 'PVC Plastic',
      accentFinish: 'Solid White / Grey',
      codeVariant: '3mm Thickness',
      primaryUsage: 'Board Edge Sealing',
      qtyLabel: '4',
      wpSubType: 'LOUVERS_PROFILES',
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
    specifications: 'PVC Plastic | Solid White / Grey | 1mm Thickness',
    variantAttributes: {
      material: 'PVC Plastic',
      accentFinish: 'Solid White / Grey',
      codeVariant: '1mm Thickness',
      primaryUsage: 'Internal Shelving Edges',
      qtyLabel: 'Catalog',
      wpSubType: 'LOUVERS_PROFILES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Roll',
    productionPhase: 'Internal Shelving Edges',
  },
]

/** 3. Hardware ( Screw ) Catalog Preset */
const SAMPLE_SCREW_FASTENER_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Screw',
    specifications: '0.75" (3/4")',
    variantAttributes: {
      lengthInches: '0.75" (3/4")',
      usagePurpose: 'Hinges & Drawer Runners',
      qtyLabel: '300',
      column1: 'Zinc Coated',
      wpSubType: 'SCREWS_FASTENERS',
    },
    netQuantity: 300,
    wastagePercent: 0,
    finalQuantity: 300,
    unit: 'Pcs',
    productionPhase: 'Hinges & Drawer Runners',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Screw',
    specifications: '1.25"',
    variantAttributes: {
      lengthInches: '1.25"',
      usagePurpose: 'Carcass Box Assembly',
      qtyLabel: '700',
      column1: 'Black Phosphate',
      wpSubType: 'SCREWS_FASTENERS',
    },
    netQuantity: 700,
    wastagePercent: 0,
    finalQuantity: 700,
    unit: 'Pcs',
    productionPhase: 'Carcass Box Assembly',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Screw',
    specifications: '1.50"',
    variantAttributes: {
      lengthInches: '1.50"',
      usagePurpose: 'Wall Cabinet Mounting',
      qtyLabel: '400',
      column1: 'Zinc Coated',
      wpSubType: 'SCREWS_FASTENERS',
    },
    netQuantity: 400,
    wastagePercent: 0,
    finalQuantity: 400,
    unit: 'Pcs',
    productionPhase: 'Wall Cabinet Mounting',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Screw',
    specifications: '2.00"',
    variantAttributes: {
      lengthInches: '2.00"',
      usagePurpose: 'Frame Anchor / Wall',
      qtyLabel: '21',
      column1: 'Steel',
      wpSubType: 'SCREWS_FASTENERS',
    },
    netQuantity: 21,
    wastagePercent: 0,
    finalQuantity: 21,
    unit: 'Pcs',
    productionPhase: 'Frame Anchor / Wall',
  },
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Screw',
    specifications: '2.50"',
    variantAttributes: {
      lengthInches: '2.50"',
      usagePurpose: 'Heavy Wall Cleat / Base',
      qtyLabel: '300',
      column1: 'Hardened Steel',
      wpSubType: 'SCREWS_FASTENERS',
    },
    netQuantity: 300,
    wastagePercent: 0,
    finalQuantity: 300,
    unit: 'Pcs',
    productionPhase: 'Heavy Wall Cleat / Base',
  },
]

/** 4. Nails, Pins & Masonry Anchors Catalog Preset */
const SAMPLE_NAIL_PIN_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Wire Nail (Tarkata)',
    specifications: '2.0"',
    variantAttributes: {
      lengthSpec: '2.0"',
      functionalUsage: 'Frame Tacking',
      qtyLabel: '300',
      column1: 'Standard Gauge',
      wpSubType: 'NAILS_PINS',
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
    specifications: '1.25"',
    variantAttributes: {
      lengthSpec: '1.25"',
      functionalUsage: 'Plywood Sub-frame',
      qtyLabel: '3',
      column1: 'Fine Gauge',
      wpSubType: 'NAILS_PINS',
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
    specifications: '0.5"',
    variantAttributes: {
      lengthSpec: '0.5"',
      functionalUsage: 'Concrete Wall Fixing',
      qtyLabel: '1',
      column1: 'Short Masonry',
      wpSubType: 'NAILS_PINS',
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
    specifications: 'Standard',
    variantAttributes: {
      lengthSpec: 'Standard',
      functionalUsage: 'Laminate Holding',
      qtyLabel: '1',
      column1: 'Clamping Pin',
      wpSubType: 'NAILS_PINS',
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
    specifications: '1.18" (30mm)',
    variantAttributes: {
      lengthSpec: '1.18" (30mm)',
      functionalUsage: 'Nail Gun Finishing',
      qtyLabel: 'Catalog',
      column1: 'Gauge 18',
      wpSubType: 'NAILS_PINS',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Box',
    productionPhase: 'Nail Gun Finishing',
  },
]

/** 5. Adhesives & Chemical Solvents Catalog Preset */
const SAMPLE_ADHESIVE_CHEMICAL_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'WALL_PANELING',
    materialName: 'Lichu Gum',
    specifications: 'Cold Press Wood Joinery',
    variantAttributes: {
      applicationMethod: 'Cold Press Wood Joinery',
      functionalUsage: 'Cold Press Wood Joinery',
      qtyLabel: '15',
      column1: 'PVA Wood Adhesive',
      wpSubType: 'ADHESIVES',
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
    specifications: 'Instant Edge & Trim Bond',
    variantAttributes: {
      applicationMethod: 'Instant Edge & Trim Bond',
      functionalUsage: 'Instant Edge & Trim Bond',
      qtyLabel: '3',
      column1: 'Cyanoacrylate',
      wpSubType: 'ADHESIVES',
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
    specifications: 'Manual Laminate Pressing',
    variantAttributes: {
      applicationMethod: 'Manual Laminate Pressing',
      functionalUsage: 'Manual Laminate Pressing',
      qtyLabel: '4',
      column1: 'Contact Adhesive (Neoprene)',
      wpSubType: 'ADHESIVES',
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
    specifications: 'Edge Fixing / Hold',
    variantAttributes: {
      applicationMethod: 'Edge Fixing / Hold',
      functionalUsage: 'Edge Fixing / Hold',
      qtyLabel: '1',
      column1: 'Binding / Double Tape',
      wpSubType: 'ADHESIVES',
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
    specifications: 'Sink / Marble Joint Sealing',
    variantAttributes: {
      applicationMethod: 'Sink / Marble Joint Sealing',
      functionalUsage: 'Sink / Marble Joint Sealing',
      qtyLabel: 'Catalog',
      column1: 'Neutral Cure Silicone',
      wpSubType: 'ADHESIVES',
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
    specifications: '18mm | Champagne Gold (Both Side) | Backply',
    variantAttributes: {
      srNo: '1',
      usage: 'Backply',
      baseMaterial: 'MR Board',
      coreThickness: '18mm',
      isHplPasting: false,
      frontLaminateCode: 'Champagne Gold',
      backLaminateCode: 'Same as Front (Both Side)',
      laminateFinishDetails: 'Champagne Gold',
      qtyLabel: '89 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 89,
    wastagePercent: 0,
    finalQuantity: 89,
    unit: 'Pcs',
    productionPhase: 'Backply',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'MR Board',
    specifications: '6mm | Champagne Gold | Shutter | Edging: 5 Roll (Edging)',
    variantAttributes: {
      srNo: '1.1',
      usage: 'Shutter',
      baseMaterial: 'MR Board',
      coreThickness: '6mm',
      isHplPasting: false,
      frontLaminateCode: 'Champagne Gold',
      backLaminateCode: 'Single Side Liner',
      laminateFinishDetails: 'Champagne Gold',
      qtyLabel: '42 pcs',
      edgingTapeQty: '5 Roll (Edging)',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 42,
    wastagePercent: 0,
    finalQuantity: 42,
    unit: 'Pcs',
    productionPhase: 'Shutter',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Elegant Board',
    specifications: '18mm | Code: A-7123 | Top Cabinet',
    variantAttributes: {
      srNo: '2',
      usage: 'Top Cabinet',
      baseMaterial: 'Elegant Board',
      coreThickness: '18mm',
      isHplPasting: false,
      frontLaminateCode: 'Code: A-7123',
      backLaminateCode: '',
      laminateFinishDetails: 'Code: A-7123',
      qtyLabel: '2 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 2,
    wastagePercent: 0,
    finalQuantity: 2,
    unit: 'Pcs',
    productionPhase: 'Top Cabinet',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Elegant Board',
    specifications: '9mm | Code: A-7123 | Shutter | Edging: 1 Roll (Edging)',
    variantAttributes: {
      srNo: '2.1',
      usage: 'Shutter',
      baseMaterial: 'Elegant Board',
      coreThickness: '9mm',
      isHplPasting: false,
      frontLaminateCode: 'Code: A-7123',
      backLaminateCode: '',
      laminateFinishDetails: 'Code: A-7123',
      qtyLabel: '1 pcs',
      edgingTapeQty: '1 Roll (Edging)',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Shutter',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Elegant Board',
    specifications: '18mm | Code: A-7112 | Backply',
    variantAttributes: {
      srNo: '3',
      usage: 'Backply',
      baseMaterial: 'Elegant Board',
      coreThickness: '18mm',
      isHplPasting: false,
      frontLaminateCode: 'Code: A-7112',
      backLaminateCode: '',
      laminateFinishDetails: 'Code: A-7112',
      qtyLabel: '8 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 8,
    wastagePercent: 0,
    finalQuantity: 8,
    unit: 'Pcs',
    productionPhase: 'Backply',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Elegant Board',
    specifications: '9mm | Code: A-7112 | Top Cabinet | Edging: 1 Roll (Edging)',
    variantAttributes: {
      srNo: '3.1',
      usage: 'Top Cabinet',
      baseMaterial: 'Elegant Board',
      coreThickness: '9mm',
      isHplPasting: false,
      frontLaminateCode: 'Code: A-7112',
      backLaminateCode: '',
      laminateFinishDetails: 'Code: A-7112',
      qtyLabel: '3 pcs',
      edgingTapeQty: '1 Roll (Edging)',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 3,
    wastagePercent: 0,
    finalQuantity: 3,
    unit: 'Pcs',
    productionPhase: 'Top Cabinet',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'White Board',
    specifications: '18mm | Duco Paint Finish | Shutter',
    variantAttributes: {
      srNo: '4',
      usage: 'Shutter',
      baseMaterial: 'White Board',
      coreThickness: '18mm',
      isHplPasting: false,
      frontLaminateCode: 'Duco Paint Finish',
      backLaminateCode: '',
      laminateFinishDetails: 'Duco Paint Finish',
      qtyLabel: '3 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 3,
    wastagePercent: 0,
    finalQuantity: 3,
    unit: 'Pcs',
    productionPhase: 'Shutter',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Starlight Board',
    specifications: '18mm | White Matt Finish | Backply',
    variantAttributes: {
      srNo: '5',
      usage: 'Backply',
      baseMaterial: 'Starlight Board',
      coreThickness: '18mm',
      isHplPasting: false,
      frontLaminateCode: 'White Matt Finish',
      backLaminateCode: '',
      laminateFinishDetails: 'White Matt Finish',
      qtyLabel: '5 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 5,
    wastagePercent: 0,
    finalQuantity: 5,
    unit: 'Pcs',
    productionPhase: 'Backply',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Starlight Board',
    specifications: '6mm | White Matt Finish | Top Cabinet | Edging: 1 Role (Edging)',
    variantAttributes: {
      srNo: '5.1',
      usage: 'Top Cabinet',
      baseMaterial: 'Starlight Board',
      coreThickness: '6mm',
      isHplPasting: false,
      frontLaminateCode: 'White Matt Finish',
      backLaminateCode: '',
      laminateFinishDetails: 'White Matt Finish',
      qtyLabel: '1 pcs',
      edgingTapeQty: '1 Role (Edging)',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Top Cabinet',
  },
]

/** 7. Closet / Cabinet HPL Pasting Details Catalog Preset */
const SAMPLE_CABINET_HPL_PASTING_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'MR Board HPL Pasting',
    specifications: '18mm | Front: MR Champagne Gold | Back: Luxury 8193 | Backply',
    variantAttributes: {
      srNo: 'HPL-1',
      lineNo: 'HPL-1',
      usage: 'Backply',
      baseMaterial: 'MR Board',
      coreSubstrateType: 'MR Board',
      coreThickness: '18mm',
      isHplPasting: true,
      frontLaminateCode: 'MR Champagne Gold',
      backLaminateCode: 'Luxury 8193',
      qtyLabel: '40 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 40,
    wastagePercent: 0,
    finalQuantity: 40,
    unit: 'Pcs',
    productionPhase: 'Backply',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'MR Board HPL Pasting',
    specifications: '18mm | Front: MR Champagne Gold | Back: Aromex 9904 | Shutter | Edging: 4 Roll',
    variantAttributes: {
      srNo: 'HPL-2',
      lineNo: 'HPL-2',
      usage: 'Shutter',
      baseMaterial: 'MR Board',
      coreSubstrateType: 'MR Board',
      coreThickness: '18mm',
      isHplPasting: true,
      frontLaminateCode: 'MR Champagne Gold',
      backLaminateCode: 'Aromex 9904',
      qtyLabel: '9 pcs',
      edgingTapeQty: '4 Roll',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 9,
    wastagePercent: 0,
    finalQuantity: 9,
    unit: 'Pcs',
    productionPhase: 'Shutter',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Marine Plywood HPL Pasting',
    specifications: '16mm | Front: Super 101 | Back: Luxury 8193 | Top Cabinet',
    variantAttributes: {
      srNo: 'HPL-3',
      lineNo: 'HPL-3',
      usage: 'Top Cabinet',
      baseMaterial: 'Marine Plywood',
      coreSubstrateType: 'Marine Plywood',
      coreThickness: '16mm',
      isHplPasting: true,
      frontLaminateCode: 'Super 101',
      backLaminateCode: 'Luxury 8193',
      qtyLabel: '21 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 21,
    wastagePercent: 0,
    finalQuantity: 21,
    unit: 'Pcs',
    productionPhase: 'Top Cabinet',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Marine Plywood HPL Pasting',
    specifications: '16mm | Front: Super 101 | Back: Super 101 (Both Side) | Backply | Edging: 2 Roll',
    variantAttributes: {
      srNo: 'HPL-4',
      lineNo: 'HPL-4',
      usage: 'Backply',
      baseMaterial: 'Marine Plywood',
      coreSubstrateType: 'Marine Plywood',
      coreThickness: '16mm',
      isHplPasting: true,
      frontLaminateCode: 'Super 101',
      backLaminateCode: 'Super 101 (Both Side)',
      qtyLabel: '11 pcs',
      edgingTapeQty: '2 Roll',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 11,
    wastagePercent: 0,
    finalQuantity: 11,
    unit: 'Pcs',
    productionPhase: 'Backply',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Marine Plywood HPL Pasting',
    specifications: '6mm | Front: Super 101 | Back: Single Side Liner | Shutter',
    variantAttributes: {
      srNo: 'HPL-5',
      lineNo: 'HPL-5',
      usage: 'Shutter',
      baseMaterial: 'Marine Plywood',
      coreSubstrateType: 'Marine Plywood',
      coreThickness: '6mm',
      isHplPasting: true,
      frontLaminateCode: 'Super 101',
      backLaminateCode: 'Single Side Liner',
      qtyLabel: '7 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 7,
    wastagePercent: 0,
    finalQuantity: 7,
    unit: 'Pcs',
    productionPhase: 'Shutter',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Marine Plywood HPL Pasting',
    specifications: '16mm | Front: Super 111 | Back: Luxury 8193 | Backply | Edging: 1 Roll',
    variantAttributes: {
      srNo: 'HPL-6',
      lineNo: 'HPL-6',
      usage: 'Backply',
      baseMaterial: 'Marine Plywood',
      coreSubstrateType: 'Marine Plywood',
      coreThickness: '16mm',
      isHplPasting: true,
      frontLaminateCode: 'Super 111',
      backLaminateCode: 'Luxury 8193',
      qtyLabel: '6 pcs',
      edgingTapeQty: '1 Roll',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 6,
    wastagePercent: 0,
    finalQuantity: 6,
    unit: 'Pcs',
    productionPhase: 'Backply',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Marine Plywood HPL Pasting',
    specifications: '16mm | Front: Super 111 | Back: Super 111 (Both Side) | Shutter',
    variantAttributes: {
      srNo: 'HPL-7',
      lineNo: 'HPL-7',
      usage: 'Shutter',
      baseMaterial: 'Marine Plywood',
      coreSubstrateType: 'Marine Plywood',
      coreThickness: '16mm',
      isHplPasting: true,
      frontLaminateCode: 'Super 111',
      backLaminateCode: 'Super 111 (Both Side)',
      qtyLabel: '5 pcs',
      edgingTapeQty: '—',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 5,
    wastagePercent: 0,
    finalQuantity: 5,
    unit: 'Pcs',
    productionPhase: 'Shutter',
  },
  {
    workCategory: 'CABINETS_CLOSETS',
    materialName: 'Marine Plywood HPL Pasting',
    specifications: '6mm | Front: Super 111 | Back: Single Side Liner | Top Cabinet | Edging: 1 Roll',
    variantAttributes: {
      srNo: 'HPL-8',
      lineNo: 'HPL-8',
      usage: 'Top Cabinet',
      baseMaterial: 'Marine Plywood',
      coreSubstrateType: 'Marine Plywood',
      coreThickness: '6mm',
      isHplPasting: true,
      frontLaminateCode: 'Super 111',
      backLaminateCode: 'Single Side Liner',
      qtyLabel: '3 pcs',
      edgingTapeQty: '1 Roll',
      cabinetSubType: 'BOARD_SPEC',
    },
    netQuantity: 3,
    wastagePercent: 0,
    finalQuantity: 3,
    unit: 'Pcs',
    productionPhase: 'Top Cabinet',
  },
]

/** 8. Kitchen & Closet Hardware Accessories Catalog Preset (SL 01 - 07) */
const SAMPLE_ACCESSORY_HARDWARE_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'ACCESSORIES',
    materialName: 'Elevator Basket',
    specifications: 'Kitchen | Code: KIW-23 | D13" × W30" × H25" | ৳31,000/pc',
    variantAttributes: {
      srNo: '01',
      accessoryCategory: 'Kitchen',
      itemCode: 'KIW-23',
      dimensions: 'D13" × W30" × H25"',
      unitPrice: '৳31,000',
      totalAmount: '৳31,000',
      accessoriesSubType: 'HARDWARE_ACCESSORIES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Kitchen',
  },
  {
    workCategory: 'ACCESSORIES',
    materialName: 'Cutlery Tray',
    specifications: 'Kitchen | Code: KIW-23 | D19" × W29" × H4" | ৳3,100/pc',
    variantAttributes: {
      srNo: '02',
      accessoryCategory: 'Kitchen',
      itemCode: 'KIW-23',
      dimensions: 'D19" × W29" × H4"',
      unitPrice: '৳3,100',
      totalAmount: '৳3,100',
      accessoriesSubType: 'HARDWARE_ACCESSORIES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Kitchen',
  },
  {
    workCategory: 'ACCESSORIES',
    materialName: 'Plate Organizer',
    specifications: 'Kitchen | Code: KIW-12.1 | D18" × W30" × H15" | ৳13,500/pc',
    variantAttributes: {
      srNo: '03',
      accessoryCategory: 'Kitchen',
      itemCode: 'KIW-12.1',
      dimensions: 'D18" × W30" × H15"',
      unitPrice: '৳13,500',
      totalAmount: '৳13,500',
      accessoriesSubType: 'HARDWARE_ACCESSORIES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Kitchen',
  },
  {
    workCategory: 'ACCESSORIES',
    materialName: 'Pantry Unit',
    specifications: 'Kitchen | Code: KIW-33 | D20" × W22" × H72" | ৳31,500/pc',
    variantAttributes: {
      srNo: '04',
      accessoryCategory: 'Kitchen',
      itemCode: 'KIW-33',
      dimensions: 'D20" × W22" × H72"',
      unitPrice: '৳31,500',
      totalAmount: '৳31,500',
      accessoriesSubType: 'HARDWARE_ACCESSORIES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Kitchen',
  },
  {
    workCategory: 'ACCESSORIES',
    materialName: 'Pull Out Hanger',
    specifications: 'Closet | Code: GLFA943B / GLFA943S | W764mm × H60mm | ৳8,500/pc',
    variantAttributes: {
      srNo: '05',
      accessoryCategory: 'Closet',
      itemCode: 'GLFA943B / GLFA943S',
      dimensions: 'W764mm × H60mm',
      unitPrice: '৳8,500',
      totalAmount: '৳17,000',
      accessoriesSubType: 'HARDWARE_ACCESSORIES',
    },
    netQuantity: 2,
    wastagePercent: 0,
    finalQuantity: 2,
    unit: 'Pcs',
    productionPhase: 'Closet',
  },
  {
    workCategory: 'ACCESSORIES',
    materialName: 'Trousers / Saree Hanger',
    specifications: 'Closet | Code: GLFJ113M / GLFJ113G | W764mm × H60mm | ৳14,500/pc',
    variantAttributes: {
      srNo: '06',
      accessoryCategory: 'Closet',
      itemCode: 'GLFJ113M / GLFJ113G',
      dimensions: 'W764mm × H60mm',
      unitPrice: '৳14,500',
      totalAmount: '৳14,500',
      accessoriesSubType: 'HARDWARE_ACCESSORIES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: 'Closet',
  },
  {
    workCategory: 'ACCESSORIES',
    materialName: 'Jewelry Tray Organizer',
    specifications: 'Closet | Code: R9001G-800 | D300mm × W764mm × H60mm | ৳12,000/pc',
    variantAttributes: {
      srNo: '07',
      accessoryCategory: 'Closet',
      itemCode: 'R9001G-800',
      dimensions: 'D300mm × W764mm × H60mm',
      unitPrice: '৳12,000',
      totalAmount: '৳24,000',
      accessoriesSubType: 'HARDWARE_ACCESSORIES',
    },
    netQuantity: 2,
    wastagePercent: 0,
    finalQuantity: 2,
    unit: 'Pcs',
    productionPhase: 'Closet',
  },
]

/** 9. Additional Deliverables & Services Catalog Preset (SL 08 - 10) */
const SAMPLE_ACCESSORY_SERVICES_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'ACCESSORIES',
    materialName: 'Fitting & Hardware',
    specifications: 'Heavy-duty Soft-close Slides, Hinges & Fasteners | 1 Lot | Lumpsum | ৳6,500',
    variantAttributes: {
      srNo: '08',
      serviceCategory: 'Fitting & Hardware',
      quantityUnit: '1 Lot',
      rateType: 'Lumpsum',
      estimatedTotal: '৳6,500',
      accessoriesSubType: 'SERVICES_DELIVERABLES',
    },
    remarks: 'Heavy-duty Soft-close Slides, Hinges & Fasteners',
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Lot',
    productionPhase: 'Fitting & Hardware',
  },
  {
    workCategory: 'ACCESSORIES',
    materialName: 'Installation Labor',
    specifications: 'On-site fitting & alignment for Kitchen/Closet units | 1 Project | Lumpsum | ৳8,500',
    variantAttributes: {
      srNo: '09',
      serviceCategory: 'Installation Labor',
      quantityUnit: '1 Project',
      rateType: 'Lumpsum',
      estimatedTotal: '৳8,500',
      accessoriesSubType: 'SERVICES_DELIVERABLES',
    },
    remarks: 'On-site fitting & alignment for Kitchen/Closet units',
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Project',
    productionPhase: 'Installation Labor',
  },
  {
    workCategory: 'ACCESSORIES',
    materialName: 'Transport & Handling',
    specifications: 'Delivery & careful handling (Mirpur-10 to Keraniganj) | 1 Trip | Lumpsum | ৳4,000',
    variantAttributes: {
      srNo: '10',
      serviceCategory: 'Transport & Handling',
      quantityUnit: '1 Trip',
      rateType: 'Lumpsum',
      estimatedTotal: '৳4,000',
      accessoriesSubType: 'SERVICES_DELIVERABLES',
    },
    remarks: 'Delivery & careful handling (Mirpur-10 to Keraniganj)',
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Trip',
    productionPhase: 'Transport & Handling',
  },
]

const SAMPLE_CORE_APPLIANCE_ITEMS: RequisitionItemInput[] = [
  {
    workCategory: 'APPLIANCES',
    materialName: 'Gas / Induction Hob',
    specifications: 'HAFELE 538.66.759 | W860 × H135 × D520 mm | W840 × D480 mm (Counter Cut) | LPG/NG Gas Point + 16A Electric',
    variantAttributes: {
      srNo: '1',
      brandModelCode: 'HAFELE 538.66.759',
      outerDimensions: 'W860 × H135 × D520 mm',
      cabinetNicheCutOutSize: 'W840 × D480 mm (Counter Cut)',
      mepUtilityRequirements: 'LPG/NG Gas Point + 16A Electric',
      qtyLabel: '1 nos',
      unitPrice: '৳70,000',
      totalAmount: '৳70,000',
      applianceSubType: 'CORE_APPLIANCES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Nos',
    productionPhase: 'Core Appliances',
  },
  {
    workCategory: 'APPLIANCES',
    materialName: 'Kitchen Hood Chimney',
    specifications: 'SWISH Klasso KH 0300114-72 | W900 × H600 × D500 mm | 150mm Dia Wall Duct Hole | 6A Power Plug (230V / 50Hz)',
    variantAttributes: {
      srNo: '2',
      brandModelCode: 'SWISH Klasso KH 0300114-72',
      outerDimensions: 'W900 × H600 × D500 mm',
      cabinetNicheCutOutSize: '150mm Dia Wall Duct Hole',
      mepUtilityRequirements: '6A Power Plug (230V / 50Hz)',
      qtyLabel: '1 nos',
      unitPrice: '৳1,15,000',
      totalAmount: '৳1,15,000',
      applianceSubType: 'CORE_APPLIANCES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Nos',
    productionPhase: 'Core Appliances',
  },
  {
    workCategory: 'APPLIANCES',
    materialName: 'Under-Counter Sink + RO Faucet',
    specifications: 'Swish/Hafele Single Bowl Granit | W750 × H220 × D460 mm | W730 × D440 mm (Under-mount Cut) | 1/2" Fresh Water + 1.5" Waste Drain',
    variantAttributes: {
      srNo: '3',
      brandModelCode: 'Swish/Hafele Single Bowl Granit',
      outerDimensions: 'W750 × H220 × D460 mm',
      cabinetNicheCutOutSize: 'W730 × D440 mm (Under-mount Cut)',
      mepUtilityRequirements: '1/2" Fresh Water + 1.5" Waste Drain',
      qtyLabel: '1 nos',
      unitPrice: '৳39,250',
      totalAmount: '৳39,250',
      applianceSubType: 'CORE_APPLIANCES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Nos',
    productionPhase: 'Core Appliances',
  },
  {
    workCategory: 'APPLIANCES',
    materialName: 'Built-In Refrigerator',
    specifications: 'BOSCH Premium Series | W558 × H1772 × D545 mm | W600 × H1780 × D580 mm (Cabinet Niche) | 13A Wall Socket (24/7 Power)',
    variantAttributes: {
      srNo: '4',
      brandModelCode: 'BOSCH Premium Series',
      outerDimensions: 'W558 × H1772 × D545 mm',
      cabinetNicheCutOutSize: 'W600 × H1780 × D580 mm (Cabinet Niche)',
      mepUtilityRequirements: '13A Wall Socket (24/7 Power)',
      qtyLabel: '1 nos',
      unitPrice: '৳4,70,000',
      totalAmount: '৳4,70,000',
      applianceSubType: 'CORE_APPLIANCES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Nos',
    productionPhase: 'Core Appliances',
  },
  {
    workCategory: 'APPLIANCES',
    materialName: 'Built-In Electric Grill Oven',
    specifications: 'HAFELE BSO72P | W595 × H595 × D570 mm | W560 × H585 × D550 mm (Cabinet Niche) | 16A Single Phase / 3.2kW',
    variantAttributes: {
      srNo: '5',
      brandModelCode: 'HAFELE BSO72P',
      outerDimensions: 'W595 × H595 × D570 mm',
      cabinetNicheCutOutSize: 'W560 × H585 × D550 mm (Cabinet Niche)',
      mepUtilityRequirements: '16A Single Phase / 3.2kW',
      qtyLabel: '1 nos',
      unitPrice: '৳1,12,800',
      totalAmount: '৳1,12,800',
      applianceSubType: 'CORE_APPLIANCES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Nos',
    productionPhase: 'Core Appliances',
  },
  {
    workCategory: 'APPLIANCES',
    materialName: 'Built-In Microwave Oven',
    specifications: 'HAFELE 595 Series | W595 × H388 × D467 mm | W560 × H380 × D500 mm (Cabinet Niche) | 6A Power Plug',
    variantAttributes: {
      srNo: '6',
      brandModelCode: 'HAFELE 595 Series',
      outerDimensions: 'W595 × H388 × D467 mm',
      cabinetNicheCutOutSize: 'W560 × H380 × D500 mm (Cabinet Niche)',
      mepUtilityRequirements: '6A Power Plug',
      qtyLabel: '1 nos',
      unitPrice: '৳74,600',
      totalAmount: '৳74,600',
      applianceSubType: 'CORE_APPLIANCES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Nos',
    productionPhase: 'Core Appliances',
  },
  {
    workCategory: 'APPLIANCES',
    materialName: 'Under-Counter RO Water Purifier',
    specifications: 'KENT Excellence / Grand | W400 × H410 × D260 mm | Under-Sink Cabinet Base | Water Line + Waste Out + 6A Plug',
    variantAttributes: {
      srNo: '7',
      brandModelCode: 'KENT Excellence / Grand',
      outerDimensions: 'W400 × H410 × D260 mm',
      cabinetNicheCutOutSize: 'Under-Sink Cabinet Base',
      mepUtilityRequirements: 'Water Line + Waste Out + 6A Plug',
      qtyLabel: '1 nos',
      unitPrice: '৳40,000',
      totalAmount: '৳40,000',
      applianceSubType: 'CORE_APPLIANCES',
    },
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Nos',
    productionPhase: 'Core Appliances',
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
    content: unknown
  } | null
  existingRequisition: {
    id: string
    requisitionNo: string
    status: string
    notes: string | null
    items: SavedRequisitionItem[]
  } | null
}

/** Items grouped: Record<quotationLineItemId | '__extra__', RequisitionItemInput[]> */
// ── Section-based architecture ──
export type WallPanelingSubType = 'CORE_BOARDS' | 'LOUVERS_PROFILES' | 'SCREWS_FASTENERS' | 'NAILS_PINS' | 'ADHESIVES'
export type CabinetSubType = 'BOARD_SPEC' | 'CORE_BOARD_SPEC' | 'HPL_PASTING'
export type AccessoriesSubType = 'HARDWARE_ACCESSORIES' | 'SERVICES_DELIVERABLES'
export type ApplianceSubType = 'CORE_APPLIANCES'
export type CeilingSubType = 'CEILING_LIGHTING' | 'ELECTRICAL_DEVICES'

interface CardSection {
  id: string
  category: RequisitionWorkCategory
  wallPanelingSubType?: WallPanelingSubType
  cabinetSubType?: CabinetSubType
  accessoriesSubType?: AccessoriesSubType
  applianceSubType?: ApplianceSubType
  ceilingSubType?: CeilingSubType
  collapsed: boolean
}

type SectionsMap = Record<string, CardSection[]>
/** ItemsMap key = `${cardKey}::${sectionId}` */
type ItemsMap = Record<string, RequisitionItemInput[]>

type RequisitionFieldValue = string | number | Record<string, unknown> | undefined

type SavedRequisitionItem = {
  id?: string
  quotationLineItemId?: string | null
  workCategory?: RequisitionWorkCategory
  materialName?: string | null
  specifications?: string | null
  variantAttributes?: unknown
  netQuantity?: number | string | null
  wastagePercent?: number | string | null
  finalQuantity?: number | string | null
  unit?: string | null
  productionPhase?: string | null
  remarks?: string | null
}

type ViewModeType =
  | 'BOARD_SPEC'
  | 'LOUVER_SPEC'
  | 'SCREW_SPEC'
  | 'NAIL_SPEC'
  | 'ADHESIVE_SPEC'
  | 'CABINET_CORE_SPEC'
  | 'CABINET_HPL_SPEC'
  | 'HARDWARE_ACCESSORY_SPEC'
  | 'SERVICES_DELIVERABLE_SPEC'
  | 'CORE_APPLIANCE_SPEC'
  | 'CEILING_LIGHTING_SPEC'
  | 'CEILING_ELECTRICAL_SPEC'
  | 'STANDARD'

const WALL_PANELING_SUBTYPES: { key: WallPanelingSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'CORE_BOARDS',      label: '🪵 Boards',                                    viewMode: 'BOARD_SPEC'    },
  { key: 'LOUVERS_PROFILES', label: '✨ Decorative Panels',                         viewMode: 'LOUVER_SPEC'   },
  { key: 'SCREWS_FASTENERS', label: '🔩 Hardware ( Screw )',                        viewMode: 'SCREW_SPEC'    },
  { key: 'NAILS_PINS',       label: '📌 Nails, Pins & Masonry Anchors',             viewMode: 'NAIL_SPEC'     },
  { key: 'ADHESIVES',        label: '🧪 Adhesives & Chemical Solvents',             viewMode: 'ADHESIVE_SPEC' },
]

const CABINET_SUBTYPES: { key: CabinetSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'BOARD_SPEC', label: '🪵 Cabinet / Closet Board Specification', viewMode: 'CABINET_CORE_SPEC' },
]

const ACCESSORIES_SUBTYPES: { key: AccessoriesSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'HARDWARE_ACCESSORIES',  label: '🍳 Kitchen & Closet Hardware Accessories', viewMode: 'HARDWARE_ACCESSORY_SPEC' },
  { key: 'SERVICES_DELIVERABLES', label: '🚚 Additional Deliverables & Services',    viewMode: 'SERVICES_DELIVERABLE_SPEC' },
]

const APPLIANCE_SUBTYPES: { key: ApplianceSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'CORE_APPLIANCES', label: 'Core Appliances', viewMode: 'CORE_APPLIANCE_SPEC' },
]

const CEILING_SUBTYPES: { key: CeilingSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'CEILING_LIGHTING',  label: '💡 Ceiling Lights & Profile Specification',   viewMode: 'CEILING_LIGHTING_SPEC' },
  { key: 'ELECTRICAL_DEVICES', label: '⚡ Drivers, Switches & Sockets Specification', viewMode: 'CEILING_ELECTRICAL_SPEC' },
]

const CATEGORY_COLORS: Record<RequisitionWorkCategory, { bg: string; text: string; border: string; pill: string; leftBorder: string }> = {
  WALL_PANELING:    { bg: 'bg-blue-50/70 dark:bg-blue-950/20', text: 'text-blue-950 dark:text-blue-200', border: 'border-blue-200/80 dark:border-blue-900/60', pill: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-300 dark:border-blue-700', leftBorder: 'border-l-4 border-l-blue-500' },
  CEILING:          { bg: 'bg-purple-50/70 dark:bg-purple-950/20', text: 'text-purple-950 dark:text-purple-200', border: 'border-purple-200/80 dark:border-purple-900/60', pill: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border-purple-300 dark:border-purple-700', leftBorder: 'border-l-4 border-l-purple-500' },
  CABINETS_CLOSETS: { bg: 'bg-amber-50/70 dark:bg-amber-950/20', text: 'text-amber-950 dark:text-amber-200', border: 'border-amber-200/80 dark:border-amber-900/60', pill: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 dark:border-amber-700', leftBorder: 'border-l-4 border-l-amber-500' },
  FURNITURE:        { bg: 'bg-emerald-50/70 dark:bg-emerald-950/20', text: 'text-emerald-950 dark:text-emerald-200', border: 'border-emerald-200/80 dark:border-emerald-900/60', pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700', leftBorder: 'border-l-4 border-l-emerald-500' },
  ACCESSORIES:      { bg: 'bg-pink-50/70 dark:bg-pink-950/20', text: 'text-pink-950 dark:text-pink-200', border: 'border-pink-200/80 dark:border-pink-900/60', pill: 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-200 border-pink-300 dark:border-pink-700', leftBorder: 'border-l-4 border-l-pink-500' },
  ELECTRICAL_WORK:  { bg: 'bg-yellow-50/70 dark:bg-yellow-950/20', text: 'text-yellow-950 dark:text-yellow-200', border: 'border-yellow-200/80 dark:border-yellow-900/60', pill: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700', leftBorder: 'border-l-4 border-l-yellow-500' },
  PAINT:            { bg: 'bg-indigo-50/70 dark:bg-indigo-950/20', text: 'text-indigo-950 dark:text-indigo-200', border: 'border-indigo-200/80 dark:border-indigo-900/60', pill: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700', leftBorder: 'border-l-4 border-l-indigo-500' },
  APPLIANCES:       { bg: 'bg-teal-50/70 dark:bg-teal-950/20', text: 'text-teal-950 dark:text-teal-200', border: 'border-teal-200/80 dark:border-teal-900/60', pill: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 border-teal-300 dark:border-teal-700', leftBorder: 'border-l-4 border-l-teal-500' },
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
    return 'CABINET_CORE_SPEC'
  }
  if (section.category === 'ACCESSORIES') {
    switch (section.accessoriesSubType) {
      case 'HARDWARE_ACCESSORIES':  return 'HARDWARE_ACCESSORY_SPEC'
      case 'SERVICES_DELIVERABLES': return 'SERVICES_DELIVERABLE_SPEC'
      default:                      return 'HARDWARE_ACCESSORY_SPEC'
    }
  }
  if (section.category === 'APPLIANCES') {
    switch (section.applianceSubType) {
      case 'CORE_APPLIANCES': return 'CORE_APPLIANCE_SPEC'
      default:                return 'CORE_APPLIANCE_SPEC'
    }
  }
  if (section.category === 'CEILING') {
    switch (section.ceilingSubType) {
      case 'ELECTRICAL_DEVICES': return 'CEILING_ELECTRICAL_SPEC'
      case 'CEILING_LIGHTING':
      default:
        return 'CEILING_LIGHTING_SPEC'
    }
  }
  if (section.category === 'ELECTRICAL_WORK') {
    return 'CEILING_ELECTRICAL_SPEC'
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
  accessoriesSubType?: AccessoriesSubType,
  applianceSubType?: ApplianceSubType,
  ceilingSubType?: CeilingSubType,
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
    unit: 'pcs',
    productionPhase: '',
    remarks: '',
    variantAttributes: {},
  }

  if (category === 'CEILING' && ceilingSubType !== 'ELECTRICAL_DEVICES') {
    const item = CEILING_LIGHTING_CATALOG[0] // T-5 Light
    return {
      ...base,
      materialName: item.name,
      specifications: item.defaultSpecs,
      unit: item.unit,
      productionPhase: 'Ceiling Lighting',
      remarks: item.defaultRemarks,
      variantAttributes: {
        srNo: '1',
        ceilingSubType: 'CEILING_LIGHTING',
        colorTempSpecs: item.defaultSpecs,
        sizeDimension: item.defaultSize || '—',
        voltageWattage: item.defaultVoltage || '—',
      },
    }
  }

  if (category === 'ELECTRICAL_WORK' || (category === 'CEILING' && ceilingSubType === 'ELECTRICAL_DEVICES')) {
    const item = CEILING_ELECTRICAL_CATALOG[0] // Power Supply Driver
    return {
      ...base,
      materialName: item.name,
      specifications: item.defaultSpecs,
      unit: item.unit,
      productionPhase: 'Drivers & Power',
      remarks: item.defaultRemarks,
      variantAttributes: {
        srNo: '1',
        ceilingSubType: 'ELECTRICAL_DEVICES',
        ratingDimension: item.defaultRating || '—',
        voltageWattage: item.defaultVoltage || '—',
      },
    }
  }

  if (category === 'ACCESSORIES') {
    if (accessoriesSubType === 'SERVICES_DELIVERABLES') {
      return {
        ...base,
        materialName: 'Fitting & Hardware',
        unit: 'Lot',
        productionPhase: 'Fitting & Hardware',
        variantAttributes: {
          srNo: '08',
          serviceCategory: 'Fitting & Hardware',
          quantityUnit: '1 Lot',
          rateType: 'Lumpsum',
          estimatedTotal: '৳6,500',
          accessoriesSubType: 'SERVICES_DELIVERABLES',
        },
      }
    }
    // Default HARDWARE_ACCESSORIES
    return {
      ...base,
      materialName: '',
      unit: 'Pcs',
      productionPhase: 'Kitchen',
      variantAttributes: {
        srNo: '',
        accessoryCategory: 'Kitchen',
        itemCode: '',
        dimensions: '',
        dimW: '',
        dimD: '',
        dimH: '',
        accessoriesSubType: 'HARDWARE_ACCESSORIES',
      },
    }
  }

  if (category === 'CABINETS_CLOSETS') {
    return {
      ...base,
      materialName: '',
      unit: 'Pcs',
      productionPhase: '',
      variantAttributes: {
        srNo: '',
        usage: '',
        baseMaterial: '',
        coreThickness: '',
        isHplPasting: false,
        frontLaminateCode: '',
        frontLaminateType: 'SOLID',
        backLaminateCode: '',
        backLaminateType: 'SOLID',
        qtyLabel: '1',
        edgingTapeQty: '',
        cabinetSubType: 'BOARD_SPEC',
      },
    }
  }

  if (category === 'APPLIANCES') {
    return {
      ...base,
      materialName: 'Gas / Induction Hob',
      unit: 'Nos',
      productionPhase: 'Core Appliances',
      variantAttributes: {
        srNo: '1',
        brandModelCode: 'HAFELE 538.66.759',
        outerDimensions: 'W860 × H135 × D520 mm',
        cabinetNicheCutOutSize: 'W840 × D480 mm (Counter Cut)',
        mepUtilityRequirements: 'LPG/NG Gas Point + 16A Electric',
        qtyLabel: '1 nos',
        unitPrice: '৳70,000',
        totalAmount: '৳70,000',
        applianceSubType: applianceSubType ?? 'CORE_APPLIANCES',
      },
    }
  }

  switch (wallPanelingSubType) {
    case 'LOUVERS_PROFILES':
      return { ...base, variantAttributes: { material: '', accentFinish: '', codeVariant: '', primaryUsage: '', qtyLabel: '1', column1: '', wpSubType: 'LOUVERS_PROFILES' } }
    case 'SCREWS_FASTENERS':
      return { ...base, materialName: 'Screw', unit: 'Pcs', variantAttributes: { lengthInches: '', usagePurpose: '', qtyLabel: '1', column1: '', wpSubType: 'SCREWS_FASTENERS' } }
    case 'NAILS_PINS':
      return { ...base, unit: 'Pcs', variantAttributes: { lengthSpec: '', functionalUsage: '', qtyLabel: '1', column1: '', wpSubType: 'NAILS_PINS' } }
    case 'ADHESIVES':
      return { ...base, unit: 'Kg', variantAttributes: { applicationMethod: '', qtyLabel: '1', column1: '', wpSubType: 'ADHESIVES' } }
    default:
      return { ...base, unit: 'Pcs', variantAttributes: { baseMaterial: '', coreThickness: '12mm', laminateTopSurface: '', surfaceCodeFinish: '', sheetSize: "8' x 4'", edgingTapeQty: '', functionalUsage: '', qtyLabel: '1', wpSubType: wallPanelingSubType ?? 'CORE_BOARDS' } }
  }
}

/* ─────────────────────────────────────────────
   Helper – flatten ItemsMap → flat array for save
───────────────────────────────────────────── */
function flattenItems(map: ItemsMap): RequisitionItemInput[] {
  return Object.values(map).flat()
}

type SaveStatus = 'DRAFT' | 'SUBMITTED'
type PdfTableDoc = {
  internal: {
    getCurrentPageInfo: () => { pageNumber: number }
    getNumberOfPages: () => number
  }
  lastAutoTable?: { finalY?: number }
}

function getWorkCategoryLabel(category: RequisitionWorkCategory | string): string {
  return WORK_CATEGORIES.find((item) => item.key === category)?.label ?? String(category).replace(/_/g, ' ')
}

function formatBdtRounded(value: number): string {
  return `৳${Math.round(Number(value) || 0).toLocaleString('en-IN')}`
}

function safePdfText(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback
  return String(value).replace(/[৳—–]/g, (match) => (match === '৳' ? 'BDT ' : '-'))
}

function safeFilePart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'requisition'
}

type PdfRgb = [number, number, number]
type PdfColumnStyles = Record<number, {
  cellWidth?: number | 'auto'
  halign?: 'left' | 'center' | 'right'
  fontStyle?: 'normal' | 'bold'
}>
type RequisitionPdfTableConfig = {
  head: string[]
  body: Array<Array<string | number>>
  columnStyles: PdfColumnStyles
  color: PdfRgb
}

function cleanPdfLabel(value: string): string {
  return safePdfText(value.replace(/[^\x20-\x7E]/g, '').trim())
}

function getSectionTypeLabel(section: CardSection): string {
  const fallback = getWorkCategoryLabel(section.category)
  if (section.wallPanelingSubType) {
    return WALL_PANELING_SUBTYPES.find((item) => item.key === section.wallPanelingSubType)?.label ?? fallback
  }
  if (section.cabinetSubType) {
    return CABINET_SUBTYPES.find((item) => item.key === section.cabinetSubType)?.label ?? fallback
  }
  if (section.accessoriesSubType) {
    return ACCESSORIES_SUBTYPES.find((item) => item.key === section.accessoriesSubType)?.label ?? fallback
  }
  if (section.applianceSubType) {
    return APPLIANCE_SUBTYPES.find((item) => item.key === section.applianceSubType)?.label ?? fallback
  }
  if (section.ceilingSubType) {
    return CEILING_SUBTYPES.find((item) => item.key === section.ceilingSubType)?.label ?? fallback
  }
  return fallback
}

function pdfAttr(item: RequisitionItemInput, key: keyof BoardVariantAttributes): string {
  const value = item.variantAttributes?.[key]
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

function pdfQty(item: RequisitionItemInput): string {
  if (item.variantAttributes?.sourceScheduleKey && item.variantAttributes?.sourceQuantityStatus === 'NEEDS_CONFIRMATION') return 'Needs quantity'
  const label = pdfAttr(item, 'qtyLabel') || pdfAttr(item, 'quantityUnit')
  if (label) return safePdfText(label)
  return Number(item.finalQuantity || item.netQuantity || 0).toLocaleString('en-IN')
}

function buildSectionPdfTable(section: CardSection, rows: RequisitionItemInput[]): RequisitionPdfTableConfig {
  const viewMode = getViewModeForSection(section)
  const text = (value: unknown) => safePdfText(value)

  if (viewMode === 'BOARD_SPEC') {
    return {
      color: [146, 64, 14],
      head: ['SL NO', 'Base Material', 'Thickness', 'Front / Top Laminate', 'Back / Bottom Laminate', 'Unit', 'Qty', 'Edging Tape Qty', 'Usage'],
      body: rows.map((item, idx) => [
        String(idx + 1).padStart(2, '0'),
        text(pdfAttr(item, 'baseMaterial')),
        text(pdfAttr(item, 'coreThickness')),
        text(pdfAttr(item, 'laminateTopSurface') || 'Raw Board'),
        text(pdfAttr(item, 'surfaceCodeFinish') || 'Raw Board'),
        text(item.unit),
        pdfQty(item),
        text(pdfAttr(item, 'edgingTapeQty')),
        text(pdfAttr(item, 'functionalUsage') || item.productionPhase),
      ]),
      columnStyles: { 0: { cellWidth: 14, halign: 'center' }, 1: { cellWidth: 38, fontStyle: 'bold' }, 2: { cellWidth: 22 }, 3: { cellWidth: 36 }, 4: { cellWidth: 36 }, 5: { cellWidth: 16 }, 6: { cellWidth: 16, halign: 'right', fontStyle: 'bold' }, 7: { cellWidth: 28 }, 8: { cellWidth: 'auto' } },
    }
  }

  if (viewMode === 'LOUVER_SPEC') {
    return {
      color: [79, 70, 229],
      head: ['SL NO', 'Panel / Profile', 'Type', 'Thickness', 'Accent / Finish', 'Code / Variant', 'Unit', 'Qty', 'Usage', 'Notes'],
      body: rows.map((item, idx) => {
        const mat = pdfAttr(item, 'material') || item.materialName
        const isReady = isReadymadePanel(mat) || pdfAttr(item, 'decorativeType') === 'READYMADE'
        const typeLabel = isReady ? 'Readymade' : 'Customize'
        const thk = isReady ? '—' : text(pdfAttr(item, 'thickness') || pdfAttr(item, 'coreThickness'))
        const finish = isReady ? '—' : text(pdfAttr(item, 'accentFinish'))
        const code = !isReady ? '—' : text(pdfAttr(item, 'codeVariant'))
        return [
          String(idx + 1).padStart(2, '0'),
          text(mat),
          typeLabel,
          thk,
          finish,
          code,
          text(item.unit),
          pdfQty(item),
          text(pdfAttr(item, 'primaryUsage') || item.productionPhase),
          text(pdfAttr(item, 'column1') || item.remarks),
        ]
      }),
      columnStyles: { 0: { cellWidth: 14, halign: 'center' }, 1: { cellWidth: 40, fontStyle: 'bold' }, 2: { cellWidth: 24, halign: 'center' }, 3: { cellWidth: 20 }, 4: { cellWidth: 30 }, 5: { cellWidth: 28 }, 6: { cellWidth: 16 }, 7: { cellWidth: 18, halign: 'right', fontStyle: 'bold' }, 8: { cellWidth: 38 }, 9: { cellWidth: 'auto' } },
    }
  }

  if (viewMode === 'SCREW_SPEC') {
    return {
      color: [180, 83, 9],
      head: ['SL NO', 'Item Type', 'Length (Inches)', 'Unit', 'Qty', 'Usage Purpose', 'Notes'],
      body: rows.map((item, idx) => [
        String(idx + 1).padStart(2, '0'),
        text(item.materialName || pdfAttr(item, 'fastenerType') || 'Screw'),
        text(pdfAttr(item, 'lengthInches')),
        text(item.unit),
        pdfQty(item),
        text(pdfAttr(item, 'usagePurpose') || item.productionPhase),
        text(pdfAttr(item, 'column1') || item.remarks),
      ]),
      columnStyles: { 0: { cellWidth: 14, halign: 'center' }, 1: { cellWidth: 32, fontStyle: 'bold' }, 2: { cellWidth: 28 }, 3: { cellWidth: 18 }, 4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }, 5: { cellWidth: 48 }, 6: { cellWidth: 'auto' } },
    }
  }

  if (viewMode === 'NAIL_SPEC') {
    return {
      color: [190, 18, 60],
      head: ['SL NO', 'Item Name', 'Length', 'Unit', 'Qty', 'Usage', 'Notes'],
      body: rows.map((item, idx) => [
        String(idx + 1).padStart(2, '0'),
        text(item.materialName),
        text(pdfAttr(item, 'lengthSpec')),
        text(pdfAttr(item, 'unitType') || item.unit),
        pdfQty(item),
        text(pdfAttr(item, 'functionalUsage') || item.productionPhase),
        text(pdfAttr(item, 'column1') || item.remarks),
      ]),
      columnStyles: { 0: { cellWidth: 14, halign: 'center' }, 1: { cellWidth: 44, fontStyle: 'bold' }, 2: { cellWidth: 24 }, 3: { cellWidth: 20 }, 4: { cellWidth: 18, halign: 'right', fontStyle: 'bold' }, 5: { cellWidth: 44 }, 6: { cellWidth: 'auto' } },
    }
  }

  if (viewMode === 'ADHESIVE_SPEC') {
    return {
      color: [5, 150, 105],
      head: ['SL NO', 'Chemical Name', 'Packaging Unit', 'Qty', 'Application Method', 'Notes'],
      body: rows.map((item, idx) => [
        String(idx + 1).padStart(2, '0'),
        text(item.materialName),
        text(pdfAttr(item, 'packagingUnit') || item.unit),
        pdfQty(item),
        text(pdfAttr(item, 'applicationMethod') || item.productionPhase),
        text(pdfAttr(item, 'column1') || item.remarks),
      ]),
      columnStyles: { 0: { cellWidth: 14, halign: 'center' }, 1: { cellWidth: 50, fontStyle: 'bold' }, 2: { cellWidth: 32 }, 3: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }, 4: { cellWidth: 60 }, 5: { cellWidth: 'auto' } },
    }
  }

  if (viewMode === 'CABINET_CORE_SPEC' || viewMode === 'CABINET_HPL_SPEC') {
    return {
      color: [146, 64, 14],
      head: ['Sr No', 'Usage', 'Thickness', 'Base Material / Core', 'Front Laminate / Finish', 'Back Laminate / Liner', 'Board Qty', 'Edging Tape Qty'],
      body: rows.map((item) => {
        const frontCode = pdfAttr(item, 'frontLaminateCode') || pdfAttr(item, 'laminateFinishDetails')
        const backCode = pdfAttr(item, 'backLaminateCode') || pdfAttr(item, 'sideSpecification')
        const frontType = pdfAttr(item, 'frontLaminateType')
        const backType = pdfAttr(item, 'backLaminateType')
        const frontText = frontCode ? `${frontCode}${frontType === 'HPL' ? ' (HPL)' : ''}` : '—'
        const backText = backCode ? `${backCode}${backType === 'HPL' ? ' (HPL)' : ''}` : '—'
        return [
          text(pdfAttr(item, 'srNo') || pdfAttr(item, 'lineNo')),
          text(pdfAttr(item, 'usage') || pdfAttr(item, 'functionalUsage') || item.productionPhase),
          text(pdfAttr(item, 'coreThickness')),
          text(pdfAttr(item, 'baseMaterial') || pdfAttr(item, 'coreSubstrateType') || item.materialName),
          text(frontText),
          text(backText),
          text(pdfAttr(item, 'qtyLabel') || item.finalQuantity),
          text(pdfAttr(item, 'edgingTapeQty')),
        ]
      }),
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 28 },
        2: { cellWidth: 22 },
        3: { cellWidth: 44, fontStyle: 'bold' },
        4: { cellWidth: 46 },
        5: { cellWidth: 46 },
        6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 'auto' },
      },
    }
  }

  if (viewMode === 'HARDWARE_ACCESSORY_SPEC') {
    return {
      color: [219, 39, 119],
      head: ['SL', 'Category', 'Item Name', 'Item Code', 'Dimensions', 'Unit', 'Qty'],
      body: rows.map((item) => [
        text(pdfAttr(item, 'srNo')),
        text(pdfAttr(item, 'accessoryCategory')),
        text(item.materialName),
        text(pdfAttr(item, 'itemCode')),
        text(pdfAttr(item, 'dimensions')),
        text(item.unit),
        pdfQty(item),
      ]),
      columnStyles: { 0: { cellWidth: 14, halign: 'center' }, 1: { cellWidth: 32 }, 2: { cellWidth: 54, fontStyle: 'bold' }, 3: { cellWidth: 32 }, 4: { cellWidth: 'auto' }, 5: { cellWidth: 20 }, 6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' } },
    }
  }

  if (viewMode === 'SERVICES_DELIVERABLE_SPEC') {
    return {
      color: [124, 58, 237],
      head: ['SL', 'Service / Material Category', 'Description', 'Quantity / Unit', 'Rate', 'Estimated Total'],
      body: rows.map((item) => [
        text(pdfAttr(item, 'srNo')),
        text(pdfAttr(item, 'serviceCategory') || item.materialName),
        text(item.remarks || item.specifications),
        text(pdfAttr(item, 'quantityUnit') || pdfQty(item)),
        text(pdfAttr(item, 'rateType')),
        text(pdfAttr(item, 'estimatedTotal')),
      ]),
      columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 54, fontStyle: 'bold' }, 2: { cellWidth: 92 }, 3: { cellWidth: 34 }, 4: { cellWidth: 32, halign: 'right' }, 5: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' } },
    }
  }

  if (viewMode === 'CORE_APPLIANCE_SPEC') {
    return {
      color: [13, 148, 136],
      head: ['SL', 'Item Name', 'Brand & Model Code', 'Outer Dimensions', 'Cabinet Niche / Cut-Out Size', 'MEP & Utility Requirements', 'Qty', 'Unit Price', 'Total Amount'],
      body: rows.map((item) => [
        text(pdfAttr(item, 'srNo')),
        text(item.materialName),
        text(pdfAttr(item, 'brandModelCode')),
        text(pdfAttr(item, 'outerDimensions')),
        text(pdfAttr(item, 'cabinetNicheCutOutSize')),
        text(pdfAttr(item, 'mepUtilityRequirements')),
        pdfQty(item),
        text(pdfAttr(item, 'unitPrice')),
        text(pdfAttr(item, 'totalAmount')),
      ]),
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 32, fontStyle: 'bold' }, 2: { cellWidth: 34 }, 3: { cellWidth: 32 }, 4: { cellWidth: 39 }, 5: { cellWidth: 44 }, 6: { cellWidth: 14, halign: 'right', fontStyle: 'bold' }, 7: { cellWidth: 22, halign: 'right' }, 8: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' } },
    }
  }

  if (viewMode === 'CEILING_LIGHTING_SPEC') {
    return {
      color: [147, 51, 234],
      head: ['SL NO', 'Item Name', 'Color Temp / Specs', 'Size / Dimension', 'Voltage / Wattage', 'Qty', 'Unit', 'Remarks'],
      body: rows.map((item, idx) => [
        String(idx + 1).padStart(2, '0'),
        text(item.materialName),
        text(pdfAttr(item, 'colorTempSpecs') || item.specifications),
        text(pdfAttr(item, 'sizeDimension') || '—'),
        text(pdfAttr(item, 'voltageWattage') || '—'),
        pdfQty(item),
        text(item.unit || 'pcs'),
        text(item.remarks || '-'),
      ]),
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 44, fontStyle: 'bold' },
        2: { cellWidth: 32 },
        3: { cellWidth: 26 },
        4: { cellWidth: 26 },
        5: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 16 },
        7: { cellWidth: 'auto' },
      },
    }
  }

  if (viewMode === 'CEILING_ELECTRICAL_SPEC') {
    return {
      color: [202, 138, 4],
      head: ['SL NO', 'Item Name', 'Specification / Type', 'Rating / Dimension', 'Voltage / Wattage', 'Qty', 'Unit', 'Remarks'],
      body: rows.map((item, idx) => [
        String(idx + 1).padStart(2, '0'),
        text(item.materialName),
        text(item.specifications),
        text(pdfAttr(item, 'ratingDimension') || '—'),
        text(pdfAttr(item, 'voltageWattage') || '—'),
        pdfQty(item),
        text(item.unit || 'pcs'),
        text(item.remarks || '-'),
      ]),
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 44, fontStyle: 'bold' },
        2: { cellWidth: 34 },
        3: { cellWidth: 26 },
        4: { cellWidth: 24 },
        5: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 16 },
        7: { cellWidth: 'auto' },
      },
    }
  }

  return {
    color: [37, 99, 235],
    head: ['Category', 'Material Name', 'Specification', 'Net Qty', 'Waste %', 'Final Qty', 'UOM', 'Phase / Usage', 'Remarks'],
    body: rows.map((item) => [
      text(getWorkCategoryLabel(item.workCategory)),
      text(item.materialName),
      text(item.specifications),
      pdfQty(item),
      Number(item.wastagePercent || 0).toLocaleString('en-IN'),
      item.variantAttributes?.sourceQuantityStatus === 'NEEDS_CONFIRMATION' ? 'Needs quantity' : Number(item.finalQuantity || 0).toLocaleString('en-IN'),
      text(item.unit),
      text(item.productionPhase),
      text(item.remarks),
    ]),
    columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 42, fontStyle: 'bold' }, 2: { cellWidth: 62 }, 3: { cellWidth: 20, halign: 'right' }, 4: { cellWidth: 20, halign: 'right' }, 5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }, 6: { cellWidth: 18 }, 7: { cellWidth: 38 }, 8: { cellWidth: 'auto' } },
  }
}

/* ─────────────────────────────────────────────
   Dimension helper functions (W, D, H)
───────────────────────────────────────────── */
function parseDimensions(dimStr?: string): { dimW: string; dimD: string; dimH: string } {
  if (!dimStr) return { dimW: '', dimD: '', dimH: '' }
  const wMatch = dimStr.match(/(?:^|[^a-zA-Z0-9])W[:\s]*([0-9.]+(?:\s*(?:"|mm|cm|in|'|ft))?)/i)
  const dMatch = dimStr.match(/(?:^|[^a-zA-Z0-9])D[:\s]*([0-9.]+(?:\s*(?:"|mm|cm|in|'|ft))?)/i)
  const hMatch = dimStr.match(/(?:^|[^a-zA-Z0-9])H[:\s]*([0-9.]+(?:\s*(?:"|mm|cm|in|'|ft))?)/i)
  return {
    dimW: wMatch ? wMatch[1].trim() : '',
    dimD: dMatch ? dMatch[1].trim() : '',
    dimH: hMatch ? hMatch[1].trim() : '',
  }
}

function formatDimensions(dimW?: string, dimD?: string, dimH?: string): string {
  const parts: string[] = []
  if (dimW?.trim()) {
    const w = dimW.trim()
    parts.push(w.toUpperCase().startsWith('W') ? w : `W${w}`)
  }
  if (dimD?.trim()) {
    const d = dimD.trim()
    parts.push(d.toUpperCase().startsWith('D') ? d : `D${d}`)
  }
  if (dimH?.trim()) {
    const h = dimH.trim()
    parts.push(h.toUpperCase().startsWith('H') ? h : `H${h}`)
  }
  return parts.join(' × ')
}

/* ─────────────────────────────────────────────
   Helper – seed state from existing saved items
───────────────────────────────────────────── */
function seedFromExisting(rawItems: SavedRequisitionItem[]): { sectionsMap: SectionsMap; itemsMap: ItemsMap } {
  const sectionsMap: SectionsMap = {}
  const itemsMap: ItemsMap = {}
  const sectionRegistry: Record<string, string> = {}

  for (const it of rawItems) {
    const cardKey: string = it.quotationLineItemId || EXTRA_KEY

    let attrs: BoardVariantAttributes = {}
    if (typeof it.variantAttributes === 'string') {
      try { attrs = JSON.parse(it.variantAttributes) } catch { attrs = {} }
    } else if (it.variantAttributes && typeof it.variantAttributes === 'object') {
      attrs = it.variantAttributes as BoardVariantAttributes
    }

    const category: RequisitionWorkCategory = it.workCategory || 'WALL_PANELING'
    const wpSubType = attrs.wpSubType as WallPanelingSubType | undefined
    const cabSubType = attrs.cabinetSubType as CabinetSubType | undefined
    const accSubType = attrs.accessoriesSubType as AccessoriesSubType | undefined
    const appSubType = category === 'APPLIANCES'
      ? ((attrs.applianceSubType as ApplianceSubType | undefined) ?? 'CORE_APPLIANCES')
      : undefined
    const ceilingSubType = (category === 'CEILING' || category === 'ELECTRICAL_WORK')
      ? ((attrs.ceilingSubType as CeilingSubType | undefined) ?? (category === 'ELECTRICAL_WORK' ? 'ELECTRICAL_DEVICES' : 'CEILING_LIGHTING'))
      : undefined

    // Find or create a section for this (cardKey, category, subtype) combo.
    const regKey = `${cardKey}::${category}::${wpSubType ?? ''}::${cabSubType ?? ''}::${accSubType ?? ''}::${appSubType ?? ''}::${ceilingSubType ?? ''}`
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
        accessoriesSubType: accSubType,
        applianceSubType: appSubType,
        ceilingSubType,
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
        sourceScheduleKey: attrs.sourceScheduleKey || '',
        sourceQuantityStatus: attrs.sourceQuantityStatus || '',
        sourceQuantityGroup: attrs.sourceQuantityGroup || '',
        sourceQuantityGroupTotal: attrs.sourceQuantityGroupTotal ?? '',
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
        srNo: attrs.srNo || attrs.lineNo || '',
        lineNo: attrs.lineNo || attrs.srNo || '',
        usage: attrs.usage || attrs.functionalUsage || it.productionPhase || '',
        isHplPasting: attrs.isHplPasting === true || attrs.cabinetSubType === 'HPL_PASTING' || Boolean(attrs.frontLaminateCode && attrs.backLaminateCode),
        laminateFinishDetails: attrs.laminateFinishDetails || attrs.frontLaminateCode || '',
        sideSpecification: attrs.sideSpecification || '',
        edgingTapeQty: attrs.edgingTapeQty || '',
        coreSubstrateType: attrs.coreSubstrateType || attrs.baseMaterial || '',
        frontLaminateCode: attrs.frontLaminateCode || attrs.laminateFinishDetails || '',
        frontLaminateType: attrs.frontLaminateType || (attrs.isHplPasting || attrs.cabinetSubType === 'HPL_PASTING' ? 'HPL' : 'SOLID'),
        backLaminateCode: attrs.backLaminateCode || (attrs.sideSpecification && attrs.sideSpecification !== 'Standard' ? attrs.sideSpecification : ''),
        backLaminateType: attrs.backLaminateType || (attrs.isHplPasting || attrs.cabinetSubType === 'HPL_PASTING' ? 'HPL' : 'SOLID'),
        cabinetSubType: attrs.cabinetSubType || 'BOARD_SPEC',
        accessoryCategory: attrs.accessoryCategory || '',
        itemCode: attrs.itemCode || '',
        dimensions: attrs.dimensions || '',
        dimW: attrs.dimW || parseDimensions(attrs.dimensions).dimW,
        dimD: attrs.dimD || parseDimensions(attrs.dimensions).dimD,
        dimH: attrs.dimH || parseDimensions(attrs.dimensions).dimH,
        unitPrice: attrs.unitPrice || '',
        totalAmount: attrs.totalAmount || '',
        serviceCategory: attrs.serviceCategory || '',
        quantityUnit: attrs.quantityUnit || '',
        rateType: attrs.rateType || '',
        estimatedTotal: attrs.estimatedTotal || '',
        accessoriesSubType: attrs.accessoriesSubType || '',
        brandModelCode: attrs.brandModelCode || '',
        outerDimensions: attrs.outerDimensions || '',
        cabinetNicheCutOutSize: attrs.cabinetNicheCutOutSize || '',
        mepUtilityRequirements: attrs.mepUtilityRequirements || '',
        applianceSubType: attrs.applianceSubType || '',
        ceilingSubType: attrs.ceilingSubType || ceilingSubType || '',
        colorTempSpecs: attrs.colorTempSpecs || it.specifications || '',
        sizeDimension: attrs.sizeDimension || '',
        voltageWattage: attrs.voltageWattage || '',
        ratingDimension: attrs.ratingDimension || '',
      },
      netQuantity: Number.isFinite(Number(it.netQuantity)) ? Number(it.netQuantity) : 1,
      wastagePercent: Number(it.wastagePercent) || 0,
      finalQuantity: Number.isFinite(Number(it.finalQuantity))
        ? Number(it.finalQuantity)
        : Number.isFinite(Number(it.netQuantity)) ? Number(it.netQuantity) : 1,
      unit: it.unit || 'Pcs',
      productionPhase: it.productionPhase || attrs.functionalUsage || attrs.primaryUsage || attrs.usagePurpose || attrs.applicationMethod || attrs.sideSpecification || attrs.accessoryCategory || attrs.serviceCategory || attrs.applianceSubType || '',
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
const GRID_TH = "px-2.5 py-2 select-none whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-left text-inherit"
const GRID_TD = "p-0 align-middle"

/* ─────────────────────────────────────────────
   Decorative Panels Constants & Classification
───────────────────────────────────────────── */
const DECORATIVE_PANEL_GROUPS = [
  {
    group: '1. Readymade Panels (Code Only)',
    items: [
      'WPC',
      'Charcoal',
      'PU Stone',
      'Lumistone',
      'Acoustic Slat Panel',
    ],
  },
  {
    group: '2. Customize Panels (Thickness & Finish)',
    items: [
      'T Bit',
      'Molding Bit',
      'Fabric Panel',
      'Acrylic Mirror',
      'Mosaic Pannel',
      '3D Murals',
      'Bavel Mirror Panel',
    ],
  },
]

function isReadymadePanel(mat?: string): boolean {
  if (!mat) return false
  const m = mat.toLowerCase()
  return (
    m.includes('wpc') ||
    m.includes('charcoal') ||
    m.includes('pu stone') ||
    m.includes('lumistone') ||
    m.includes('acoustic')
  )
}

function isCustomizePanel(mat?: string): boolean {
  if (!mat) return false
  const m = mat.toLowerCase()
  return (
    m.includes('t bit') ||
    m.includes('molding') ||
    m.includes('moulding') ||
    m.includes('fabric') ||
    m.includes('acrylic') ||
    m.includes('mosaic') ||
    m.includes('mural') ||
    m.includes('bavel') ||
    m.includes('bevel')
  )
}

/* ─────────────────────────────────────────────
   Sub-component: Edging Tape Compound Input (Qty + Unit: Roll / RFT)
───────────────────────────────────────────── */
function EdgingTapeInput({
  value,
  onChange,
  defaultUnit = 'RFT',
}: {
  value: string
  onChange: (val: string) => void
  defaultUnit?: 'Roll' | 'RFT'
}) {
  const raw = value || ''
  const isRft = /rft/i.test(raw)
  const isRoll = /roll|role/i.test(raw)
  const unit: 'Roll' | 'RFT' = isRft ? 'RFT' : isRoll ? 'Roll' : defaultUnit
  const numPart = raw.replace(/\s*(rft|roll|role|m|meter).*/i, '').trim()

  return (
    <div className="flex items-center gap-1 min-w-[125px] px-1 py-0.5">
      <input
        type="text"
        value={numPart}
        onChange={(e) => {
          const val = e.target.value.trim()
          onChange(val ? `${val} ${unit}` : '')
        }}
        onFocus={(e) => e.target.select()}
        placeholder="e.g. 50"
        className={`${GRID_CELL_NUM} flex-1 min-w-[50px] border border-border/40 rounded px-1.5 py-1 focus:border-primary`}
      />
      <select
        value={unit}
        onChange={(e) => {
          const newUnit = e.target.value as 'Roll' | 'RFT'
          onChange(numPart ? `${numPart} ${newUnit}` : '')
        }}
        className={`${GRID_CELL_SELECT} w-16 shrink-0 border border-border/40 rounded px-1 py-1 font-semibold text-[11px]`}
      >
        <option value="RFT">RFT</option>
        <option value="Roll">Roll</option>
      </select>
    </div>
  )
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
        {BOARD_BASE_MATERIALS.map((mat) => (
          <option key={mat} value={mat} />
        ))}
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
        <option value="Screw" />
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
      <datalist id="cabinet-usage-list">
        <option value="Shutter" />
        <option value="Top Cabinet" />
        <option value="Body" />
        <option value="Bottom Cabinet" />
        <option value="Carcass / Internal" />
        <option value="Shelves" />
        <option value="Backing" />
        <option value="Drawer Box" />
      </datalist>

      <datalist id="cabinet-base-material-list">
        <option value="MR Board" />
        <option value="Elegant Board" />
        <option value="White Board" />
        <option value="Starlight Board" />
        <option value="Marine Plywood" />
        <option value="Garjon Plywood" />
        <option value="Commercial Ply" />
        <option value="MDF Core" />
        <option value="HDF Core" />
        <option value="Particle Board" />
        <option value="WPC (Wood Plastic)" />
      </datalist>

      <datalist id="cabinet-thickness-list">
        <option value="6mm" />
        <option value="9mm" />
        <option value="12mm" />
        <option value="15mm" />
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
        <option value="Super 101" />
        <option value="Super 111" />
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
        <option value="MDF Core" />
      </datalist>

      <datalist id="cabinet-front-laminate-list">
        <option value="MR Champagne Gold" />
        <option value="Champagne Gold" />
        <option value="Super 101" />
        <option value="Super 111" />
        <option value="Luxury 8193" />
        <option value="Aromex 9904" />
        <option value="Code: A-7123" />
        <option value="Code: A-7112" />
        <option value="Duco Paint Finish" />
        <option value="White Matt Finish" />
      </datalist>

      <datalist id="cabinet-back-laminate-list">
        <option value="Same as Front (Both Side)" />
        <option value="Single Side Liner" />
        <option value="White Liner" />
        <option value="Luxury 8193" />
        <option value="Aromex 9904" />
        <option value="Super 101 (Both Side)" />
        <option value="Super 111 (Both Side)" />
        <option value="MR Champagne Gold" />
        <option value="Champagne Gold" />
      </datalist>

      {/* ── Accessories & Hardware Datalists ── */}
      <datalist id="accessory-category-list">
        <option value="Kitchen" />
        <option value="Closet" />
        <option value="Cabinet" />
        <option value="Hardware" />
      </datalist>

      <datalist id="accessory-service-category-list">
        <option value="Fitting & Hardware" />
        <option value="Installation Labor" />
        <option value="Transport & Handling" />
        <option value="Cleaning & Alignment" />
      </datalist>
    </>
  )
}

/* ─────────────────────────────────────────────
   Sub-component: Interactive Cabinet Dropdown Combobox
───────────────────────────────────────────── */
function CabinetCombobox({
  value,
  onChange,
  options = [],
  groups,
  placeholder,
  className,
}: {
  value: string
  onChange: (val: string) => void
  options?: string[]
  groups?: { group: string; items: string[] }[]
  placeholder?: string
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
        zIndex: 9999,
      })
    }
    setIsOpen(true)
  }

  const closeDropdown = () => {
    setIsOpen(false)
    setQuery('')
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        closeDropdown()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on scroll/resize so it doesn't drift — but NOT when scrolling inside the dropdown
  useEffect(() => {
    if (!isOpen) return
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return
      closeDropdown()
    }
    const handleResize = () => closeDropdown()
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  // Filter helpers
  const q = query.toLowerCase().trim()
  const filteredGroups = groups?.map((grp) => ({
    ...grp,
    items: q ? grp.items.filter((item) => item.toLowerCase().includes(q)) : grp.items,
  })).filter((grp) => grp.items.length > 0)

  const filteredOptions = q ? options.filter((opt) => opt.toLowerCase().includes(q)) : options

  const hasResults = groups
    ? (filteredGroups?.some((g) => g.items.length > 0) ?? false)
    : filteredOptions.length > 0

  return (
    <div ref={triggerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value)
            setQuery(e.target.value)
            openDropdown()
          }}
          onFocus={(e) => {
            e.target.select()
            setQuery('')
            openDropdown()
          }}
          placeholder={placeholder}
          className={`${className || GRID_CELL_INPUT} pr-5`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => (isOpen ? closeDropdown() : openDropdown())}
          className="absolute right-1 text-muted-foreground/40 hover:text-foreground p-0.5"
          title="Open dropdown"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-2xl overflow-hidden"
        >
          {/* Search box inside dropdown */}
          <div className="px-2 pb-1 pt-0.5 border-b border-border/40">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Search..."
              autoFocus
              className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {!hasResults ? (
              <div className="px-3 py-4 text-xs text-center text-muted-foreground">
                No results for &quot;{query}&quot;
              </div>
            ) : groups && groups.length > 0 ? (
              filteredGroups!.map((grp) => (
                <div key={grp.group} className="border-b border-border/40 last:border-b-0 pb-1">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-muted/60 sticky top-0 z-10 backdrop-blur-xs">
                    {grp.group}
                  </div>
                  {grp.items.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange(opt)
                        closeDropdown()
                      }}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-primary/10 hover:text-primary transition-colors ${
                        value === opt ? 'bg-primary/15 font-semibold text-primary' : 'text-foreground'
                      }`}
                    >
                      <span className="truncate pr-2">{opt}</span>
                      {value === opt && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(opt)
                    closeDropdown()
                  }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-primary/10 hover:text-primary transition-colors ${
                    value === opt ? 'bg-primary/15 font-semibold text-primary' : 'text-foreground'
                  }`}
                >
                  <span className="truncate pr-2">{opt}</span>
                  {value === opt && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sub-component: Interactive Accessory Item Combobox
   Shows saved items with Category & Item Code
───────────────────────────────────────────── */
function AccessoryItemCombobox({
  value,
  onChange,
  onSelectItem,
  savedItems,
  onSaveNewItem,
  placeholder = 'Select or type item name...',
  className,
}: {
  value: string
  onChange: (val: string) => void
  onSelectItem: (item: BoqSavedAccessoryItem) => void
  savedItems: BoqSavedAccessoryItem[]
  onSaveNewItem?: (name: string) => Promise<void> | void
  placeholder?: string
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [isSaving, setIsSaving] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 320),
        zIndex: 9999,
      })
    }
    setIsOpen(true)
  }

  const closeDropdown = () => {
    setIsOpen(false)
    setQuery('')
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        closeDropdown()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return
      closeDropdown()
    }
    const handleResize = () => closeDropdown()
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  const q = query.toLowerCase().trim()
  const filteredItems = (savedItems || []).filter((item) => {
    if (!q) return true
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.itemCode && item.itemCode.toLowerCase().includes(q))
    )
  })

  const exactMatch = (savedItems || []).some((it) => it.name.trim().toLowerCase() === q)

  return (
    <div ref={triggerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value)
            setQuery(e.target.value)
            openDropdown()
          }}
          onFocus={() => {
            setQuery('')
            openDropdown()
          }}
          placeholder={placeholder}
          className={`${className || GRID_CELL_BOLD} pr-6`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => (isOpen ? closeDropdown() : openDropdown())}
          className="absolute right-1 text-muted-foreground/50 hover:text-foreground p-0.5"
          title="Open saved accessories dropdown"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-2xl overflow-hidden"
        >
          <div className="px-2 pb-1.5 pt-1 border-b border-border/40">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Search saved items by name, category, or code..."
              autoFocus
              className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-pink-500/50 placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-3 text-xs text-center text-muted-foreground">
                No matching saved items.
              </div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelectItem(item)
                    closeDropdown()
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-xs text-left hover:bg-pink-500/10 hover:text-pink-900 dark:hover:text-pink-200 transition-colors border-b border-border/20 last:border-b-0 ${
                    value === item.name ? 'bg-pink-500/15 font-semibold text-pink-900 dark:text-pink-200' : 'text-foreground'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <span className="font-bold text-xs truncate">{item.name}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.category && (
                        <span className="inline-block text-[10px] px-1.5 py-0.2 rounded font-medium bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border border-pink-200/60 dark:border-pink-800/60">
                          {item.category}
                        </span>
                      )}
                      {item.itemCode && (
                        <span className="inline-block text-[10px] px-1.5 py-0.2 rounded font-mono bg-muted text-muted-foreground border border-border/50">
                          {item.itemCode}
                        </span>
                      )}
                    </div>
                  </div>
                  {value === item.name && <Check className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 shrink-0" />}
                </button>
              ))
            )}

            {onSaveNewItem && q && !exactMatch && (
              <button
                type="button"
                disabled={isSaving}
                onMouseDown={(e) => e.preventDefault()}
                onClick={async () => {
                  setIsSaving(true)
                  try {
                    await onSaveNewItem(query.trim())
                    closeDropdown()
                  } finally {
                    setIsSaving(false)
                  }
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors border-t border-border/50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save &quot;{query.trim()}&quot; to Accessories Library</span>
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sub-component: Dedicated Laminate & HPL Finish Picker
   Tabs: PRELAMINATED | HPL | DUCO
───────────────────────────────────────────── */
const PRELAMINATED_OPTIONS = ['Champaign Gold', 'Elegent', 'Starlight']
const DUCO_PAINT_OPTIONS = ['Glossy', 'Soft matt']

function LaminateFinishPicker({
  value,
  finishType,
  onChange,
  hplBrands = DEFAULT_CABINET_CATALOG.hplBrands,
  isBack = false,
  placeholder = 'Select finish...',
}: {
  value: string
  finishType?: 'PRELAMINATED' | 'HPL' | 'DUCO' | 'SOLID' | string
  onChange: (val: string, finishType: 'PRELAMINATED' | 'HPL' | 'DUCO') => void
  hplBrands?: string[]
  isBack?: boolean
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const detectTab = (): 'PRELAMINATED' | 'HPL' | 'DUCO' => {
    if (finishType === 'HPL' || hplBrands.includes(value)) return 'HPL'
    if (finishType === 'DUCO' || DUCO_PAINT_OPTIONS.includes(value)) return 'DUCO'
    return 'PRELAMINATED'
  }
  const [activeTab, setActiveTab] = useState<'PRELAMINATED' | 'HPL' | 'DUCO'>(detectTab)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: 300,
        zIndex: 9999,
      })
    }
    setIsOpen(true)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on scroll/resize so it doesn't drift — but NOT when scrolling inside the dropdown itself
  useEffect(() => {
    if (!isOpen) return
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return
      setIsOpen(false)
    }
    const handleResize = () => setIsOpen(false)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  const currentTab = detectTab()
  const isRawBoard = !value || value.trim() === '' || value.toLowerCase().includes('raw')

  const tabBadgeStyle = isRawBoard
    ? 'bg-slate-500/20 text-slate-800 dark:text-slate-200 border border-slate-500/40 hover:bg-slate-500/30'
    : currentTab === 'HPL'
    ? 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30'
    : currentTab === 'DUCO'
    ? 'bg-purple-500/20 text-purple-800 dark:text-purple-200 border border-purple-500/40 hover:bg-purple-500/30'
    : 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 hover:bg-amber-500/30'

  const tabBadgeLabel = isRawBoard ? 'Raw' : currentTab === 'HPL' ? 'HPL' : currentTab === 'DUCO' ? 'Duco' : 'Pre-lam'

  return (
    <div ref={triggerRef} className="relative w-full">
      <div className="relative flex items-center">
        {/* Current type badge */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setActiveTab(currentTab)
            openDropdown()
          }}
          className={`shrink-0 ml-1 px-1 py-0.5 rounded text-[10px] font-bold tracking-tight uppercase transition-colors ${tabBadgeStyle}`}
          title={isRawBoard ? 'Raw Board (Uncoated) - click to select finish' : 'Click to choose finish type'}
        >
          {tabBadgeLabel}
        </button>

        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            const val = e.target.value
            const detectedHpl = hplBrands.includes(val) || activeTab === 'HPL'
            const detectedDuco = DUCO_PAINT_OPTIONS.includes(val) || activeTab === 'DUCO'
            const fType = detectedHpl ? 'HPL' : detectedDuco ? 'DUCO' : 'PRELAMINATED'
            onChange(val, fType)
            openDropdown()
          }}
          onFocus={(e) => {
            e.target.select()
            openDropdown()
          }}
          placeholder={placeholder || 'Raw Board (None)'}
          className={`${GRID_CELL_INPUT} pl-1.5 pr-5`}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
          className="absolute right-1 text-muted-foreground/40 hover:text-foreground p-0.5"
          title="Open finish options"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          {/* Top Quick Shortcut: Raw Board (Uncoated) */}
          <div className="mb-1.5 pb-1 border-b border-border/40">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange('', 'PRELAMINATED')
                setIsOpen(false)
              }}
              className={`flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded hover:bg-slate-500/10 transition-colors ${
                isRawBoard ? 'bg-slate-500/15 font-bold text-slate-900 dark:text-slate-100' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <span>🪵</span>
                <span>Raw Board (Uncoated / None)</span>
              </span>
              {isRawBoard && <Check className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />}
            </button>
          </div>

          {/* 3 Tabs */}
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-muted/60 rounded-md mb-1.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveTab('PRELAMINATED')}
              className={`px-1.5 py-1 text-[10px] font-semibold rounded transition-colors ${
                activeTab === 'PRELAMINATED'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🪚 Pre-lam ({PRELAMINATED_OPTIONS.length})
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveTab('HPL')}
              className={`px-1.5 py-1 text-[10px] font-semibold rounded transition-colors ${
                activeTab === 'HPL'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🪵 HPL ({hplBrands.length})
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveTab('DUCO')}
              className={`px-1.5 py-1 text-[10px] font-semibold rounded transition-colors ${
                activeTab === 'DUCO'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🎨 Duco ({DUCO_PAINT_OPTIONS.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="max-h-56 overflow-y-auto divide-y divide-border/30">
            {activeTab === 'PRELAMINATED' && (
              <div className="py-0.5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Prelaminated Board Finish
                </div>
                {PRELAMINATED_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(opt, 'PRELAMINATED')
                      setIsOpen(false)
                    }}
                    className={`flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded hover:bg-amber-500/10 hover:text-amber-900 dark:hover:text-amber-200 transition-colors ${
                      value === opt && currentTab === 'PRELAMINATED' ? 'bg-amber-500/20 font-bold text-amber-900 dark:text-amber-200' : ''
                    }`}
                  >
                    <span>{opt}</span>
                    {value === opt && currentTab === 'PRELAMINATED' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'HPL' && (
              <div className="py-0.5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  HPL Pasting (Brand & Code)
                </div>
                {hplBrands.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(brand, 'HPL')
                      setIsOpen(false)
                    }}
                    className={`flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded hover:bg-cyan-500/10 hover:text-cyan-900 dark:hover:text-cyan-200 transition-colors ${
                      value === brand && currentTab === 'HPL' ? 'bg-cyan-500/20 font-bold text-cyan-900 dark:text-cyan-200' : ''
                    }`}
                  >
                    <span>{brand}</span>
                    {value === brand && currentTab === 'HPL' && <Check className="w-3.5 h-3.5 text-cyan-600" />}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'DUCO' && (
              <div className="py-0.5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Duco Paint Finish
                </div>
                {DUCO_PAINT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(opt, 'DUCO')
                      setIsOpen(false)
                    }}
                    className={`flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded hover:bg-purple-500/10 hover:text-purple-900 dark:hover:text-purple-200 transition-colors ${
                      value === opt && currentTab === 'DUCO' ? 'bg-purple-500/20 font-bold text-purple-900 dark:text-purple-200' : ''
                    }`}
                  >
                    <span>{opt}</span>
                    {value === opt && currentTab === 'DUCO' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                  </button>
                ))}
              </div>
            )}

            {isBack && (
              <div className="pt-1 mt-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Common Backing Shortcuts
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange('Same as Front (Both Side)', 'PRELAMINATED')
                    setIsOpen(false)
                  }}
                  className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <span>Same as Front (Both Side)</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange('Single Side Liner', 'PRELAMINATED')
                    setIsOpen(false)
                  }}
                  className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <span>Single Side Liner</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer: Clear button */}
          {value && (
            <div className="pt-1 mt-1 border-t border-border/40 flex justify-end">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange('', 'PRELAMINATED')
                  setIsOpen(false)
                }}
                className="px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10 rounded font-medium transition-colors"
              >
                Clear value
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
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
                <th className={`${GRID_TH} w-24`}>Thickness</th>
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

                    {/* 2. Usage (Dropdown with Shutter, Top Cabinet, Backply) */}
                    <td className={GRID_TD}>
                      <CabinetCombobox
                        value={attrs.usage || attrs.functionalUsage || item.productionPhase || ''}
                        onChange={(val) => {
                          onUpdateVariant(ri, 'usage', val)
                          onUpdateVariant(ri, 'functionalUsage', val)
                          onChange(ri, 'productionPhase', val)
                        }}
                        options={DEFAULT_CABINET_CATALOG.usageOptions}
                        placeholder="Shutter / Top / Backply"
                      />
                    </td>

                    {/* 3. Core Thickness (Dropdown + Manual) */}
                    <td className={GRID_TD}>
                      <CabinetCombobox
                        value={attrs.coreThickness || ''}
                        onChange={(val) => onUpdateVariant(ri, 'coreThickness', val)}
                        options={DEFAULT_CABINET_CATALOG.coreThicknesses}
                        placeholder="18mm"
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
                <th className={`${GRID_TH} min-w-[190px]`}>Item Name</th>
                <th className={`${GRID_TH} min-w-[210px]`}>Brand & Model Code</th>
                <th className={`${GRID_TH} min-w-[190px]`}>Outer Dimensions (W × H × D)</th>
                <th className={`${GRID_TH} min-w-[220px]`}>Cabinet Niche / Cut-Out Size</th>
                <th className={`${GRID_TH} min-w-[230px]`}>MEP & Utility Requirements</th>
                <th className={`${GRID_TH} w-24 text-center`}>Qty</th>
                <th className={`${GRID_TH} min-w-[130px]`}>Unit Price (BDT)</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Total Amount (BDT)</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const attrs: BoardVariantAttributes = item.variantAttributes || {}
                return (
                  <tr key={ri} className="divide-x divide-border/40 hover:bg-muted/30 transition-colors">
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.srNo || ''}
                        onChange={(e) => onUpdateVariant(ri, 'srNo', e.target.value)}
                        placeholder="1"
                        className={GRID_CELL_MONO}
                      />
                    </td>
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={item.materialName}
                        onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                        placeholder="Gas / Induction Hob"
                        className={GRID_CELL_BOLD}
                      />
                    </td>
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.brandModelCode || ''}
                        onChange={(e) => onUpdateVariant(ri, 'brandModelCode', e.target.value)}
                        placeholder="HAFELE 538.66.759"
                        className={GRID_CELL_INPUT}
                      />
                    </td>
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.outerDimensions || ''}
                        onChange={(e) => onUpdateVariant(ri, 'outerDimensions', e.target.value)}
                        placeholder="W860 × H135 × D520 mm"
                        className={GRID_CELL_INPUT}
                      />
                    </td>
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.cabinetNicheCutOutSize || ''}
                        onChange={(e) => onUpdateVariant(ri, 'cabinetNicheCutOutSize', e.target.value)}
                        placeholder="W840 × D480 mm (Counter Cut)"
                        className={GRID_CELL_INPUT}
                      />
                    </td>
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.mepUtilityRequirements || ''}
                        onChange={(e) => onUpdateVariant(ri, 'mepUtilityRequirements', e.target.value)}
                        placeholder="LPG/NG Gas Point + 16A Electric"
                        className={GRID_CELL_INPUT}
                      />
                    </td>
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.qtyLabel !== undefined ? attrs.qtyLabel : `${item.netQuantity} ${item.unit}`}
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
                            onUpdateVariant(ri, 'totalAmount', `৳${(qty * numP).toLocaleString('en-IN')}`)
                          }
                        }}
                        placeholder="৳70,000"
                        className={GRID_CELL_INPUT}
                      />
                    </td>
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={attrs.totalAmount || ''}
                        onChange={(e) => onUpdateVariant(ri, 'totalAmount', e.target.value)}
                        placeholder="৳70,000"
                        className={`${GRID_CELL_BOLD} text-teal-700 dark:text-teal-300`}
                      />
                    </td>
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
  onLoadAccessoryPreset,
  onLoadAppliancePreset,
  onLoadCeilingPreset,
  onToggleCollapse,
  onRemove,
  boqSavedAccessories,
  onSelectSavedAccessory,
  onSaveNewSavedAccessory,
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
}) {
  const viewMode = getViewModeForSection(section)
  const catLabel = WORK_CATEGORIES.find((c) => c.key === section.category)?.label ?? section.category
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
  const colors = CATEGORY_COLORS[section.category]
  const importedRows = rows.filter((item) => item.variantAttributes?.sourceScheduleKey)
  const pendingImportedRows = importedRows.filter((item) => item.variantAttributes?.sourceQuantityStatus === 'NEEDS_CONFIRMATION')
  const importedGroups = Array.from(new Set(importedRows.map((item) => String(item.variantAttributes?.sourceQuantityGroup || '')).filter(Boolean)))

  return (
    <div
      id={`section-dom-${section.id}`}
      data-boq-section-id={section.id}
      className={`rounded-2xl border-2 bg-card shadow-xs transition-all ${colors.border} ${colors.leftBorder}`}
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

/* ─────────────────────────────────────────────
   Sub-component: "Add Section" inline form
───────────────────────────────────────────── */
function AddSectionForm({ onAdd, onCancel }: {
  onAdd: (category: RequisitionWorkCategory, wpSubType?: WallPanelingSubType, cabSubType?: CabinetSubType, accSubType?: AccessoriesSubType, appSubType?: ApplianceSubType, ceilingSubType?: CeilingSubType, includeSourceSchedule?: boolean) => void
  onCancel: () => void
}) {
  const [cat, setCat] = useState<RequisitionWorkCategory>('WALL_PANELING')
  const [sub, setSub] = useState<WallPanelingSubType>('CORE_BOARDS')
  const [cabSub, setCabSub] = useState<CabinetSubType>('BOARD_SPEC')
  const [accSub, setAccSub] = useState<AccessoriesSubType>('HARDWARE_ACCESSORIES')
  const [appSub, setAppSub] = useState<ApplianceSubType>('CORE_APPLIANCES')
  const [ceilingSub, setCeilingSub] = useState<CeilingSubType>('CEILING_LIGHTING')
  const [includeSourceSchedule, setIncludeSourceSchedule] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 bg-muted/20 border-t border-border/70">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
        <Plus className="w-3.5 h-3.5 text-primary" />
        <span>New Section:</span>
      </div>
      <select
        value={cat}
        onChange={(e) => { setCat(e.target.value as RequisitionWorkCategory); setIncludeSourceSchedule(false) }}
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

      {cat === 'ACCESSORIES' && (
        <select
          value={accSub}
          onChange={(e) => setAccSub(e.target.value as AccessoriesSubType)}
          className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-pink-500 font-medium shadow-xs"
        >
          {ACCESSORIES_SUBTYPES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      )}

      {cat === 'APPLIANCES' && (
        <select
          value={appSub}
          onChange={(e) => setAppSub(e.target.value as ApplianceSubType)}
          className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 font-medium shadow-xs"
        >
          {APPLIANCE_SUBTYPES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      )}

      {cat === 'CEILING' && (
        <select
          value={ceilingSub}
          onChange={(e) => setCeilingSub(e.target.value as CeilingSubType)}
          className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-purple-500 font-medium shadow-xs"
        >
          {CEILING_SUBTYPES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      )}

      <ScheduleSelection category={cat} ceilingSubType={ceilingSub} checked={includeSourceSchedule} onChange={setIncludeSourceSchedule} />

      <button
        onClick={() => onAdd(
          cat,
          cat === 'WALL_PANELING' ? sub : undefined,
          cat === 'CABINETS_CLOSETS' ? cabSub : undefined,
          cat === 'ACCESSORIES' ? accSub : undefined,
          cat === 'APPLIANCES' ? appSub : undefined,
          cat === 'CEILING' ? ceilingSub : cat === 'ELECTRICAL_WORK' ? 'ELECTRICAL_DEVICES' : undefined,
          includeSourceSchedule
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

function ScheduleSelection({ category, ceilingSubType, checked, onChange }: {
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
      <input type="checkbox" className="mt-0.5 accent-sky-700" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span><span className="font-semibold text-foreground">Start with {label}</span><span className="ml-1 text-muted-foreground">({count} rows). Unspecified quantities stay blank and must be resolved before submission.</span></span>
    </label>
  )
}

/* ─────────────────────────────────────────────
   Sub-component: "Add Section" Modal Dialog
───────────────────────────────────────────── */
function AddSectionModal({
  isOpen,
  onClose,
  productTitle,
  onAdd,
}: {
  isOpen: boolean
  onClose: () => void
  productTitle: string
  onAdd: (category: RequisitionWorkCategory, wpSubType?: WallPanelingSubType, cabSubType?: CabinetSubType, accSubType?: AccessoriesSubType, appSubType?: ApplianceSubType, ceilingSubType?: CeilingSubType, includeSourceSchedule?: boolean) => void
}) {
  const [cat, setCat] = useState<RequisitionWorkCategory>('WALL_PANELING')
  const [sub, setSub] = useState<WallPanelingSubType>('CORE_BOARDS')
  const [cabSub, setCabSub] = useState<CabinetSubType>('BOARD_SPEC')
  const [accSub, setAccSub] = useState<AccessoriesSubType>('HARDWARE_ACCESSORIES')
  const [appSub, setAppSub] = useState<ApplianceSubType>('CORE_APPLIANCES')
  const [ceilingSub, setCeilingSub] = useState<CeilingSubType>('CEILING_LIGHTING')
  const [includeSourceSchedule, setIncludeSourceSchedule] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-border/70">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">New Section</span>
            </div>
            <h3 className="text-base font-bold text-foreground">Add Material Section</h3>
            <p className="text-xs text-muted-foreground truncate max-w-sm mt-0.5">Target: {productTitle}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">Work Category</label>
            <select
              value={cat}
              onChange={(e) => { setCat(e.target.value as RequisitionWorkCategory); setIncludeSourceSchedule(false) }}
              className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-primary shadow-xs"
            >
              {WORK_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {cat === 'WALL_PANELING' && (
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Wall Paneling Sub-Type</label>
              <select
                value={sub}
                onChange={(e) => setSub(e.target.value as WallPanelingSubType)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-primary shadow-xs"
              >
                {WALL_PANELING_SUBTYPES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {cat === 'CABINETS_CLOSETS' && (
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Cabinet / Closet Sub-Type</label>
              <select
                value={cabSub}
                onChange={(e) => setCabSub(e.target.value as CabinetSubType)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-amber-500 shadow-xs"
              >
                {CABINET_SUBTYPES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {cat === 'ACCESSORIES' && (
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Hardware / Accessories Sub-Type</label>
              <select
                value={accSub}
                onChange={(e) => setAccSub(e.target.value as AccessoriesSubType)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-pink-500 shadow-xs"
              >
                {ACCESSORIES_SUBTYPES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {cat === 'APPLIANCES' && (
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Appliance Sub-Type</label>
              <select
                value={appSub}
                onChange={(e) => setAppSub(e.target.value as ApplianceSubType)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-teal-500 shadow-xs"
              >
                {APPLIANCE_SUBTYPES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {cat === 'CEILING' && (
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Ceiling Sub-Type</label>
              <select
                value={ceilingSub}
                onChange={(e) => setCeilingSub(e.target.value as CeilingSubType)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-purple-500 shadow-xs"
              >
                {CEILING_SUBTYPES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          <ScheduleSelection category={cat} ceilingSubType={ceilingSub} checked={includeSourceSchedule} onChange={setIncludeSourceSchedule} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onAdd(
                cat,
                cat === 'WALL_PANELING' ? sub : undefined,
                cat === 'CABINETS_CLOSETS' ? cabSub : undefined,
                cat === 'ACCESSORIES' ? accSub : undefined,
                cat === 'APPLIANCES' ? appSub : undefined,
                cat === 'CEILING' ? ceilingSub : cat === 'ELECTRICAL_WORK' ? 'ELECTRICAL_DEVICES' : undefined,
                includeSourceSchedule
              )
              onClose()
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Confirm Add Section
          </button>
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

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export function RequisitionBuilderClient({
  lead,
  detailQuotation,
  existingRequisition,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [lastSavedStatus, setLastSavedStatus] = useState<SaveStatus | null>(
    existingRequisition?.status === 'SUBMITTED' ? 'SUBMITTED' : existingRequisition ? 'DRAFT' : null
  )
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [notes, setNotes] = useState<string>(existingRequisition?.notes || '')
  const [boqSavedAccessories, setBoqSavedAccessories] = useState<BoqSavedAccessoryItem[]>(DEFAULT_SAVED_ACCESSORIES)

  useEffect(() => {
    fetch('/api/boq/saved-accessories')
      .then((r) => r.json())
      .then((data: { success: boolean; items?: BoqSavedAccessoryItem[] }) => {
        if (data.success && data.items) setBoqSavedAccessories(data.items)
      })
      .catch(() => {})
  }, [])

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

  const sections = useMemo<QuotationSection[]>(() => quotation?.sections ?? [], [quotation])
  const areas = useMemo<QuotationArea[]>(() => quotation?.areas ?? [], [quotation])
  const lineItems = useMemo<QuotationLineItem[]>(
    () => (quotation?.lineItems ?? []).filter((li) => li.included),
    [quotation]
  )

  const areaMap = useMemo(() => {
    const m = new Map<string, QuotationArea>()
    for (const a of areas) m.set(a.id, a)
    return m
  }, [areas])

  // ── Product slides for Level 1 focus view ──
  const productSlides = useMemo(() => {
    const slides: {
      id: string
      type: 'LINE_ITEM' | 'EXTRA'
      index: number
      title: string
      areaName?: string
      sectionName?: string
      amount: number
      quantity?: number
      unit?: string
      materials?: string | null
      item?: QuotationLineItem
    }[] = []

    let idx = 1
    for (const s of sections) {
      const sItems = lineItems.filter((li) => li.sectionId === s.id)
      for (const li of sItems) {
        const area = li.areaId ? areaMap.get(li.areaId) : undefined
        slides.push({
          id: li.id,
          type: 'LINE_ITEM',
          index: idx++,
          title: li.description,
          areaName: area?.name,
          sectionName: s.name,
          amount: li.amount,
          quantity: li.quantity,
          unit: li.unit,
          materials: li.materials,
          item: li,
        })
      }
    }

    // Include line items without matching section if any
    const assignedIds = new Set(slides.map((s) => s.id))
    for (const li of lineItems) {
      if (!assignedIds.has(li.id)) {
        const area = li.areaId ? areaMap.get(li.areaId) : undefined
        slides.push({
          id: li.id,
          type: 'LINE_ITEM',
          index: idx++,
          title: li.description,
          areaName: area?.name,
          sectionName: 'General',
          amount: li.amount,
          quantity: li.quantity,
          unit: li.unit,
          materials: li.materials,
          item: li,
        })
      }
    }

    // Always include Extra & General Materials as the last slide
    slides.push({
      id: EXTRA_KEY,
      type: 'EXTRA',
      index: idx,
      title: 'Extra & General Materials',
      sectionName: 'Site Supplies & Sundries',
      amount: 0,
    })

    return slides
  }, [sections, lineItems, areaMap])

  // ── Slide view and drawer navigation state ──
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerSearch, setDrawerSearch] = useState('')
  const [viewModePreference, setViewModePreference] = useState<'SLIDE' | 'ALL'>('SLIDE')
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false)

  // Helper: navigate slides with direction tracking
  const goToSlide = useCallback((indexOrUpdater: number | ((prev: number) => number)) => {
    setActiveSlideIndex((prev) => {
      const next = typeof indexOrUpdater === 'function' ? indexOrUpdater(prev) : indexOrUpdater
      const clamped = Math.min(Math.max(0, next), Math.max(0, productSlides.length - 1))
      setSlideDirection(clamped >= prev ? 'right' : 'left')
      return clamped
    })
  }, [productSlides.length])

  const safeSlideIndex = Math.min(Math.max(0, activeSlideIndex), Math.max(0, productSlides.length - 1))
  const currentSlide = productSlides[safeSlideIndex] ?? productSlides[0]
  const currentCardKey = currentSlide?.id ?? EXTRA_KEY
  const currentSlideSections = sectionsMap[currentCardKey] ?? []

  // ── Active section detection for bottom smart action bar (IntersectionObserver) ──
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const visibleSectionRatios = useRef(new Map<string, number>())

  useEffect(() => {
    visibleSectionRatios.current.clear()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.getAttribute('data-boq-section-id')
          if (!sectionId) return
          if (entry.isIntersecting) {
            visibleSectionRatios.current.set(sectionId, entry.intersectionRatio)
          } else {
            visibleSectionRatios.current.delete(sectionId)
          }
        })

        const mostVisible = [...visibleSectionRatios.current.entries()].sort((a, b) => b[1] - a[1])[0]
        if (mostVisible) {
          setActiveSectionId(mostVisible[0])
        }
      },
      {
        rootMargin: '-10% 0px -40% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    const sectionElements = document.querySelectorAll('[data-boq-section-id]')
    sectionElements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [sectionsMap, safeSlideIndex, viewModePreference])

  const effectiveActiveSectionId = useMemo(() => {
    if (activeSectionId && currentSlideSections.some((s) => s.id === activeSectionId)) {
      return activeSectionId
    }
    return currentSlideSections[0]?.id ?? null
  }, [activeSectionId, currentSlideSections])

  const activeSectionObj = useMemo(
    () => currentSlideSections.find((s) => s.id === effectiveActiveSectionId) ?? currentSlideSections[0] ?? null,
    [currentSlideSections, effectiveActiveSectionId]
  )

  const activeSectionName = useMemo(() => {
    if (!activeSectionObj) return null
    return getSectionTypeLabel(activeSectionObj)
  }, [activeSectionObj])

  // ── Keyboard shortcuts: Alt + ArrowLeft / Right for slides, Esc for drawer ──
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return
      }

      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        goToSlide((prev) => Math.max(0, prev - 1))
      } else if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        goToSlide((prev) => Math.min(productSlides.length - 1, prev + 1))
      } else if (event.key === 'Escape' && isDrawerOpen) {
        event.preventDefault()
        setIsDrawerOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [productSlides.length, isDrawerOpen])

  const filteredSlides = useMemo(() => {
    if (!drawerSearch.trim()) return productSlides
    const query = drawerSearch.toLowerCase().trim()
    return productSlides.filter((slide) => {
      return (
        slide.title.toLowerCase().includes(query) ||
        (slide.areaName && slide.areaName.toLowerCase().includes(query)) ||
        (slide.sectionName && slide.sectionName.toLowerCase().includes(query)) ||
        (slide.materials && slide.materials.toLowerCase().includes(query))
      )
    })
  }, [productSlides, drawerSearch])

  // ── Section helpers ──
  const getSectionsForCard = (cardKey: string): CardSection[] => sectionsMap[cardKey] ?? []

  const getRowsForSection = (cardKey: string, sectionId: string): RequisitionItemInput[] =>
    itemsMap[sectionItemKey(cardKey, sectionId)] ?? []

  const addSection = (
    cardKey: string,
    category: RequisitionWorkCategory,
    wallPanelingSubType?: WallPanelingSubType,
    cabinetSubType?: CabinetSubType,
    accessoriesSubType?: AccessoriesSubType,
    applianceSubType?: ApplianceSubType,
    ceilingSubType?: CeilingSubType,
    quotationLineItemId?: string,
    includeSourceSchedule = false,
  ) => {
    const isElectrical = category === 'ELECTRICAL_WORK' || (category === 'CEILING' && ceilingSubType === 'ELECTRICAL_DEVICES')
    const isLighting = category === 'CEILING' && ceilingSubType !== 'ELECTRICAL_DEVICES'
    const scheduleKey = isLighting ? 'ceiling-light-xl-v2' : isElectrical ? 'ceiling-electrical-xl-v1' : null
    if (includeSourceSchedule && scheduleKey) {
      const alreadyLoaded = (sectionsMap[cardKey] ?? []).some((section) =>
        (itemsMap[sectionItemKey(cardKey, section.id)] ?? []).some((item) => item.variantAttributes?.sourceScheduleKey === scheduleKey),
      )
      if (alreadyLoaded) {
        setSaveError(`The ${isLighting ? 'ceiling lighting' : 'electrical devices'} schedule is already loaded for this quotation item. Add rows to the existing section instead of importing it again.`)
        return
      }
    }
    const sectionId = `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const initialRows = includeSourceSchedule && isLighting
      ? CEILING_LIGHTING_SCHEDULE.map((item) => ({ ...item, quotationLineItemId, variantAttributes: { ...(item.variantAttributes || {}), ceilingSubType: 'CEILING_LIGHTING' } }))
      : includeSourceSchedule && isElectrical
      ? ELECTRICAL_WORK_SCHEDULE.map((item) => ({ ...item, quotationLineItemId, variantAttributes: { ...(item.variantAttributes || {}), ceilingSubType: 'ELECTRICAL_DEVICES' } }))
      : category === 'APPLIANCES' && applianceSubType === 'CORE_APPLIANCES'
      ? SAMPLE_CORE_APPLIANCE_ITEMS.map((item) => ({
          ...item,
          quotationLineItemId,
          variantAttributes: { ...(item.variantAttributes || {}), applianceSubType },
        }))
      : (() => {
          const item = blankItem(category, wallPanelingSubType, cabinetSubType, accessoriesSubType, applianceSubType, ceilingSubType, quotationLineItemId)
          // Auto-set srNo '1' for first cabinet row
          if (category === 'CABINETS_CLOSETS') {
            item.variantAttributes = { ...item.variantAttributes, srNo: '1', lineNo: '1' }
          }
          return [item]
        })()

    setSectionsMap((prev) => ({
      ...prev,
      [cardKey]: [...(prev[cardKey] ?? []), { id: sectionId, category, wallPanelingSubType, cabinetSubType, accessoriesSubType, applianceSubType, ceilingSubType, collapsed: false }],
    }))
    setItemsMap((prev) => ({
      ...prev,
      [sectionItemKey(cardKey, sectionId)]: initialRows,
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

  const updateRow = (cardKey: string, sectionId: string, rowIndex: number, field: keyof RequisitionItemInput, rawValue: RequisitionFieldValue) => {
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => {
      const rows = [...(prev[key] ?? [])]
      const current = { ...rows[rowIndex], [field]: rawValue }
      if (field === 'netQuantity' && current.variantAttributes?.sourceScheduleKey) {
        const confirmed = rawValue !== '' && rawValue !== null && rawValue !== undefined && Number.isFinite(Number(rawValue))
        current.variantAttributes = { ...current.variantAttributes, sourceQuantityStatus: confirmed ? 'CONFIRMED' : 'NEEDS_CONFIRMATION' }
        if (confirmed && current.remarks?.includes('Quantity not specified in source list')) current.remarks = ''
      }
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
      // Auto-rebuild dimensions string when any individual dimension field changes
      if (field === 'dimW' || field === 'dimH' || field === 'dimD') {
        nextAttrs.dimensions = formatDimensions(nextAttrs.dimW, nextAttrs.dimD, nextAttrs.dimH)
      }
      current.variantAttributes = nextAttrs
      const specParts = [
        nextAttrs.coreThickness || nextAttrs.profileType || nextAttrs.fastenerType || nextAttrs.nailType || nextAttrs.chemicalClass || nextAttrs.accessoryCategory || nextAttrs.serviceCategory || nextAttrs.brandModelCode,
        nextAttrs.baseMaterial || nextAttrs.coreSubstrateType || nextAttrs.material || nextAttrs.lengthInches || nextAttrs.lengthSpec || nextAttrs.applicationMethod || nextAttrs.itemCode || nextAttrs.quantityUnit || nextAttrs.outerDimensions,
        nextAttrs.laminateTopSurface || nextAttrs.laminateFinishDetails || nextAttrs.frontLaminateCode || nextAttrs.accentFinish || nextAttrs.gaugeSize || nextAttrs.thicknessSpec || nextAttrs.dimensions || nextAttrs.rateType || nextAttrs.cabinetNicheCutOutSize,
        nextAttrs.surfaceCodeFinish || nextAttrs.backLaminateCode || nextAttrs.sideSpecification || nextAttrs.codeVariant || nextAttrs.materialFinish || nextAttrs.unitPrice || nextAttrs.estimatedTotal || nextAttrs.mepUtilityRequirements,
      ].filter(Boolean)
      if (specParts.length > 0) current.specifications = specParts.join(' | ')
      rows[rowIndex] = current
      return { ...prev, [key]: rows }
    })
  }

  const addRow = (cardKey: string, sectionId: string, quotationLineItemId?: string) => {
    const sectionInfo = (sectionsMap[cardKey] ?? []).find((s) => s.id === sectionId)
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => {
      const existingRows = prev[key] ?? []
      const newItem = blankItem(
        sectionInfo?.category ?? 'WALL_PANELING',
        sectionInfo?.wallPanelingSubType,
        sectionInfo?.cabinetSubType,
        sectionInfo?.accessoriesSubType,
        sectionInfo?.applianceSubType,
        sectionInfo?.ceilingSubType,
        quotationLineItemId
      )
      // Auto-increment srNo for cabinet rows
      if (sectionInfo?.category === 'CABINETS_CLOSETS') {
        const nextSrNo = String(existingRows.length + 1)
        newItem.variantAttributes = { ...newItem.variantAttributes, srNo: nextSrNo, lineNo: nextSrNo }
      }
      return { ...prev, [key]: [...existingRows, newItem] }
    })
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
      BOARD_SPEC: SAMPLE_CABINET_CORE_BOARD_ITEMS,
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

  const loadAccessoryPresetForSection = (cardKey: string, sectionId: string, subType: AccessoriesSubType, quotationLineItemId?: string) => {
    const presetMap: Record<AccessoriesSubType, RequisitionItemInput[]> = {
      HARDWARE_ACCESSORIES: SAMPLE_ACCESSORY_HARDWARE_ITEMS,
      SERVICES_DELIVERABLES: SAMPLE_ACCESSORY_SERVICES_ITEMS,
    }
    const presetItems = presetMap[subType].map((item) => {
      const attrs = item.variantAttributes || {}
      const parsed = parseDimensions(attrs.dimensions as string | undefined)
      return {
        ...item,
        quotationLineItemId,
        variantAttributes: {
          ...attrs,
          dimW: attrs.dimW || parsed.dimW,
          dimD: attrs.dimD || parsed.dimD,
          dimH: attrs.dimH || parsed.dimH,
          accessoriesSubType: subType,
        },
      }
    })
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...presetItems] }))
  }

  const handleSelectSavedAccessory = useCallback((cardKey: string, sectionId: string, rowIndex: number, item: BoqSavedAccessoryItem) => {
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => {
      const rows = [...(prev[key] ?? [])]
      const current = { ...rows[rowIndex] }
      current.materialName = item.name
      if (item.defaultUnit) current.unit = item.defaultUnit
      const prevAttrs: BoardVariantAttributes = current.variantAttributes || {}
      const nextAttrs: BoardVariantAttributes = {
        ...prevAttrs,
        accessoryCategory: item.category,
        itemCode: item.itemCode,
      }
      current.variantAttributes = nextAttrs
      const specParts = [
        nextAttrs.accessoryCategory,
        nextAttrs.itemCode ? `Code: ${nextAttrs.itemCode}` : '',
        nextAttrs.dimensions,
      ].filter(Boolean)
      if (specParts.length > 0) current.specifications = specParts.join(' | ')
      rows[rowIndex] = current
      return { ...prev, [key]: rows }
    })
  }, [])

  const handleSaveNewAccessory = useCallback(async (name: string, category?: string, itemCode?: string) => {
    try {
      const res = await fetch('/api/boq/saved-accessories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, itemCode }),
      })
      const data = await res.json()
      if (data.success && data.item) {
        setBoqSavedAccessories((prev) => [...prev, data.item])
      }
    } catch (e) {
      console.error('Failed to save accessory item to library', e)
    }
  }, [])

  const loadAppliancePresetForSection = (cardKey: string, sectionId: string, subType: ApplianceSubType, quotationLineItemId?: string) => {
    const presetMap: Record<ApplianceSubType, RequisitionItemInput[]> = {
      CORE_APPLIANCES: SAMPLE_CORE_APPLIANCE_ITEMS,
    }
    const presetItems = presetMap[subType].map((item) => ({
      ...item,
      quotationLineItemId,
      variantAttributes: { ...(item.variantAttributes || {}), applianceSubType: subType },
    }))
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...presetItems] }))
  }

  const loadCeilingPresetForSection = (cardKey: string, sectionId: string, subType: CeilingSubType, quotationLineItemId?: string) => {
    const presetItems = (subType === 'ELECTRICAL_DEVICES' ? CEILING_ELECTRICAL_SCHEDULE : CEILING_LIGHTING_SCHEDULE)
      .map((item) => ({
        ...item,
        quotationLineItemId,
        variantAttributes: { ...(item.variantAttributes || {}), ceilingSubType: subType },
      }))
    const key = sectionItemKey(cardKey, sectionId)
    setItemsMap((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...presetItems] }))
  }

  // ── Summary counts ──
  const requisitionItems = useMemo(() => flattenItems(itemsMap), [itemsMap])
  const totalMaterialRows = requisitionItems.length
  const coveredLineItems = useMemo(
    () => lineItems.filter((li) => (sectionsMap[li.id] ?? []).some((s) => (itemsMap[sectionItemKey(li.id, s.id)]?.length ?? 0) > 0)).length,
    [lineItems, sectionsMap, itemsMap]
  )
  const extraRowCount = useMemo(
    () => (sectionsMap[EXTRA_KEY] ?? []).reduce((sum, s) => sum + (itemsMap[sectionItemKey(EXTRA_KEY, s.id)]?.length ?? 0), 0),
    [sectionsMap, itemsMap]
  )
  const categorySummary = useMemo(() => {
    const summary: Partial<Record<RequisitionWorkCategory, number>> = {}
    for (const item of requisitionItems) {
      const category = item.workCategory as RequisitionWorkCategory
      summary[category] = (summary[category] ?? 0) + 1
    }
    return Object.entries(summary)
      .map(([category, count]) => `${getWorkCategoryLabel(category)}: ${count}`)
      .join('  |  ')
  }, [requisitionItems])
  const coveragePct = lineItems.length > 0 ? Math.round((coveredLineItems / lineItems.length) * 100) : 0

  // ── Save / Submit ──
  const saveRequisition = useCallback(async (status: SaveStatus = 'DRAFT', successMessage?: string) => {
    setSaveSuccess(null)
    setSaveError(null)
    try {
      const res = await saveMaterialRequisition({
        leadId: lead.id,
        quotationDraftId: detailQuotation?.id,
        status,
        notes,
        items: requisitionItems,
      })
      if (res.success) {
        setLastSavedAt(new Date())
        setLastSavedStatus(status)
        setSaveSuccess(
          successMessage ??
          (status === 'SUBMITTED'
            ? 'Material requisition submitted to Procurement team successfully!'
            : 'Material requisition draft saved successfully!')
        )
        router.refresh()
        return true
      }
      setSaveError(res.error || 'Failed to save material requisition.')
      return false
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save material requisition.')
      return false
    }
  }, [detailQuotation?.id, lead.id, notes, requisitionItems, router])

  const handleSave = useCallback((status: SaveStatus = 'DRAFT') => {
    if (status === 'SUBMITTED') {
      const pending = requisitionItems.filter((item) => item.variantAttributes?.sourceScheduleKey && item.variantAttributes?.sourceQuantityStatus === 'NEEDS_CONFIRMATION')
      if (pending.length) {
        setSaveError(`${pending.length} imported schedule ${pending.length === 1 ? 'quantity needs' : 'quantities need'} confirmation. Fill those quantities before submitting.`)
        setSaveSuccess(null)
        return
      }
      const groups = new Map<string, { label: string; expected: number; actual: number }>()
      for (const item of requisitionItems) {
        const attrs = item.variantAttributes
        if (!attrs?.sourceScheduleKey || !attrs.sourceQuantityGroup) continue
        const groupKey = `${item.quotationLineItemId || EXTRA_KEY}:${attrs.sourceScheduleKey}:${attrs.sourceQuantityGroup}`
        const group = groups.get(groupKey) ?? {
          label: attrs.sourceQuantityGroup === 'spot-light-allocation' ? 'Panel and spot light split' : 'Power supply split',
          expected: Number(attrs.sourceQuantityGroupTotal || 0),
          actual: 0,
        }
        group.actual += Number(item.netQuantity || 0)
        groups.set(groupKey, group)
      }
      const mismatch = [...groups.values()].find((group) => Math.abs(group.actual - group.expected) > 0.001)
      if (mismatch) {
        setSaveError(`${mismatch.label} must total ${mismatch.expected} pcs; current total is ${mismatch.actual} pcs.`)
        setSaveSuccess(null)
        return
      }
    }
    startTransition(() => {
      void saveRequisition(status)
    })
  }, [requisitionItems, saveRequisition, startTransition])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handleSave('DRAFT')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  const handleDownloadPdf = useCallback(async () => {
    if (totalMaterialRows === 0) {
      setSaveError('Add at least one material row before downloading the PDF.')
      return
    }

    setIsPdfGenerating(true)
    try {
      const saved = await saveRequisition('DRAFT', 'Draft saved. Requisition PDF is ready for download.')
      if (!saved) return

      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      const reqNo = existingRequisition?.requisitionNo || `DRAFT-${lead.id.slice(-6).toUpperCase()}`

      const logoImg = new Image()
      logoImg.src = '/Logo/HeaderLogo.png'
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })

      const pdfDoc = doc as unknown as PdfTableDoc
      const marginX = 10
      const topY = 34
      const bottomY = pageH - 18
      let cursorY = topY

      const drawChrome = () => {
        doc.setFillColor(255, 255, 255)
        doc.rect(0, 0, pageW, pageH, 'F')
        doc.addImage(logoImg, 'PNG', marginX, 10, 43.2, 8)
        doc.setDrawColor(31, 54, 61)
        doc.setLineWidth(0.7)
        doc.line(marginX, 23, pageW / 2 - 34, 23)
        doc.line(pageW / 2 + 34, 23, pageW - marginX, 23)
        doc.setTextColor(31, 54, 61)
        doc.setFont('times', 'italic')
        doc.setFontSize(12)
        doc.text('Material Requisition', pageW / 2, 24, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(100, 116, 139)
        doc.text(`Requisition: ${safePdfText(reqNo)} | Generated: ${today}`, pageW - marginX, 13, { align: 'right' })
        doc.setDrawColor(165, 124, 0)
        doc.setLineWidth(0.4)
        doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12)
        doc.setTextColor(71, 85, 105)
        doc.setFont('helvetica', 'bold')
        doc.text('Aesthetic Interior Studio', marginX, pageH - 7)
        doc.setFont('helvetica', 'normal')
        doc.text('183, East Senpara, Begum Rokeya Soroni, 3rd floor, Mirpur 10, Dhaka-1216', marginX + 42, pageH - 7)
        doc.text('www.aestheticinteriorbd.com', pageW - marginX, pageH - 7, { align: 'right' })
      }

      const drawPageFooter = () => {
        const pageNum = pdfDoc.internal.getCurrentPageInfo().pageNumber
        const pageCount = pdfDoc.internal.getNumberOfPages()
        doc.setFontSize(6.5)
        doc.setTextColor(148, 163, 184)
        doc.text(`Page ${pageNum} of ${pageCount}`, pageW / 2, pageH - 3.5, { align: 'center' })
      }

      const ensureSpace = (height: number) => {
        if (cursorY + height <= bottomY) return
        doc.addPage()
        drawChrome()
        cursorY = topY
      }

      const drawSummary = () => {
        drawChrome()
        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(226, 232, 240)
        doc.roundedRect(marginX, cursorY, pageW - marginX * 2, 26, 2, 2, 'FD')
        doc.setTextColor(15, 23, 42)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.text('Project / Client', marginX + 6, cursorY + 7)
        doc.text('Requisition Summary', pageW / 2 + 6, cursorY + 7)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.4)
        doc.setTextColor(71, 85, 105)
        doc.text(`Client: ${safePdfText(lead.name)}`, marginX + 6, cursorY + 13)
        doc.text(`Phone: ${safePdfText(lead.phone)}`, marginX + 6, cursorY + 18)
        doc.text(`Location: ${safePdfText(lead.location)}`, marginX + 6, cursorY + 23)
        doc.text(`Status: ${lastSavedStatus === 'SUBMITTED' ? 'Submitted' : 'Draft'}`, pageW / 2 + 6, cursorY + 13)
        doc.text(`Approved Quotation: ${safePdfText(formatBdtRounded(detailQuotation?.grandTotal ?? 0))}`, pageW / 2 + 6, cursorY + 18)
        doc.text(`Coverage: ${coveredLineItems}/${lineItems.length} products | Material Rows: ${totalMaterialRows}`, pageW / 2 + 6, cursorY + 23)
        cursorY += 33

        doc.setFillColor(239, 246, 255)
        doc.setDrawColor(191, 219, 254)
        doc.roundedRect(marginX, cursorY, pageW - marginX * 2, 14, 1.5, 1.5, 'FD')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(30, 64, 175)
        doc.text('PDF hierarchy: Quotation product -> Requisition section type -> Material rows', marginX + 5, cursorY + 5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105)
        doc.text(safePdfText(categorySummary || 'No category rows'), marginX + 5, cursorY + 10)
        cursorY += 20
      }

      const drawProductHeader = (title: string, meta: string, amount: number, index: number, isExtra = false) => {
        ensureSpace(18)
        doc.setFillColor(isExtra ? 255 : 243, isExtra ? 251 : 248, isExtra ? 235 : 247)
        doc.setDrawColor(isExtra ? 245 : 191, isExtra ? 158 : 219, isExtra ? 11 : 254)
        doc.roundedRect(marginX, cursorY, pageW - marginX * 2, 15, 2, 2, 'FD')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(isExtra ? 146 : 30, isExtra ? 64 : 64, isExtra ? 14 : 175)
        doc.text(isExtra ? 'EXTRA / GENERAL MATERIALS' : `PRODUCT ${index}`, marginX + 4, cursorY + 5)
        doc.setFontSize(9)
        doc.setTextColor(15, 23, 42)
        doc.text(doc.splitTextToSize(safePdfText(title), 145)[0] ?? safePdfText(title), marginX + 4, cursorY + 10.5)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(71, 85, 105)
        doc.text(safePdfText(meta), pageW - marginX - 4, cursorY + 5, { align: 'right' })
        if (!isExtra) {
          doc.setFont('helvetica', 'bold')
          doc.text(safePdfText(formatBdtRounded(amount)), pageW - marginX - 4, cursorY + 10.5, { align: 'right' })
        }
        cursorY += 19
      }

      const drawSection = (section: CardSection, rows: RequisitionItemInput[]) => {
        if (rows.length === 0) return
        const table = buildSectionPdfTable(section, rows)
        ensureSpace(24)
        doc.setFillColor(table.color[0], table.color[1], table.color[2])
        doc.roundedRect(marginX + 4, cursorY, pageW - marginX * 2 - 8, 9, 1.5, 1.5, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.4)
        doc.text(`Section type: ${cleanPdfLabel(getSectionTypeLabel(section))}`, marginX + 8, cursorY + 5.8)
        doc.setFont('helvetica', 'normal')
        doc.text(`${rows.length} material ${rows.length === 1 ? 'row' : 'rows'}`, pageW - marginX - 8, cursorY + 5.8, { align: 'right' })
        cursorY += 11

        const tableStartPage = pdfDoc.internal.getCurrentPageInfo().pageNumber

        autoTable(doc, {
          startY: cursorY,
          head: [table.head],
          body: table.body,
          theme: 'grid',
          headStyles: {
            fillColor: table.color,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 6.4,
            cellPadding: 1.7,
          },
          bodyStyles: {
            fontSize: 6.2,
            textColor: [15, 23, 42],
            cellPadding: 1.5,
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: table.columnStyles,
          margin: { left: marginX + 4, right: marginX + 4, top: topY, bottom: 18 },
          willDrawPage: () => {
            const currentPage = pdfDoc.internal.getCurrentPageInfo().pageNumber
            if (currentPage !== tableStartPage) {
              drawChrome()
            }
          },
          didDrawPage: () => {
            drawPageFooter()
          },
        })
        cursorY = (pdfDoc.lastAutoTable?.finalY ?? cursorY) + 5
      }

      drawSummary()

      lineItems.forEach((item, itemIndex) => {
        const cardSections = sectionsMap[item.id] ?? []
        const hasRows = cardSections.some((section) => (itemsMap[sectionItemKey(item.id, section.id)] ?? []).length > 0)
        if (!hasRows) return
        const sourceArea = item.areaId ? areaMap.get(item.areaId) : null
        drawProductHeader(
          item.description,
          `${sourceArea ? `${sourceArea.name} | ` : ''}${item.quantity} ${item.unit}`,
          item.amount,
          itemIndex + 1,
        )
        cardSections.forEach((section) => {
          drawSection(section, itemsMap[sectionItemKey(item.id, section.id)] ?? [])
        })
      })

      const extraSections = sectionsMap[EXTRA_KEY] ?? []
      const hasExtraRows = extraSections.some((section) => (itemsMap[sectionItemKey(EXTRA_KEY, section.id)] ?? []).length > 0)
      if (hasExtraRows) {
        drawProductHeader('Unlinked site supplies, hardware, and sundries', `${extraRowCount} general rows`, 0, 0, true)
        extraSections.forEach((section) => {
          drawSection(section, itemsMap[sectionItemKey(EXTRA_KEY, section.id)] ?? [])
        })
      }

      if (notes.trim()) {
        ensureSpace(22)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(15, 23, 42)
        doc.text('Factory Notes', marginX, cursorY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105)
        doc.text(doc.splitTextToSize(safePdfText(notes), pageW - marginX * 2), marginX, cursorY + 5)
      }

      drawPageFooter()
      doc.save(`material-requisition-${safeFilePart(lead.name)}-${safeFilePart(reqNo)}.pdf`)
    } catch (error) {
      console.error(error)
      setSaveError('Failed to generate requisition PDF. Please try again.')
    } finally {
      setIsPdfGenerating(false)
    }
  }, [
    areaMap,
    categorySummary,
    coveredLineItems,
    detailQuotation?.grandTotal,
    existingRequisition?.requisitionNo,
    extraRowCount,
    lastSavedStatus,
    lead.id,
    lead.location,
    lead.name,
    lead.phone,
    lineItems,
    itemsMap,
    notes,
    saveRequisition,
    sectionsMap,
    totalMaterialRows,
  ])

  const currentSlideRowsCount = useMemo(() => {
    return currentSlideSections.reduce((sum, s) => sum + getRowsForSection(currentCardKey, s.id).length, 0)
  }, [currentSlideSections, currentCardKey, itemsMap])

  /* ── RENDER ── */
  return (
    <div className="p-4 md:p-6 space-y-6 w-full pb-40">
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
            <span className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">Ctrl+S</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isPending || isPdfGenerating || totalMaterialRows === 0}
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-xs hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Receipt className="w-4 h-4 mr-2 text-blue-600" />
            {isPdfGenerating ? 'Building PDF...' : 'Requisition PDF'}
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

      {saveError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {saveError}
        </div>
      )}

      {/* ── Executive KPI Summary Strip ── */}
      {detailQuotation ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* KPI 1: Approved Quotation Total */}
          <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 dark:text-emerald-200">Approved Quotation</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                {detailQuotation.status}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100">
                {formatBdtRounded(detailQuotation.grandTotal)}
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5 font-medium">
                Rounded from saved quotation total for display
              </p>
            </div>
          </div>

          {/* KPI 2: Requisition Coverage Progress */}
          <div className="rounded-xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-200">Line Item Coverage</span>
              </div>
              <span className="text-xs font-bold text-blue-800 dark:text-blue-200 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                {coveragePct}%
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-blue-950 dark:text-blue-100">
                  {coveredLineItems} <span className="text-sm font-normal text-muted-foreground">/ {lineItems.length} items</span>
                </span>
                <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80 font-medium">
                  {lineItems.length - coveredLineItems} remaining
                </span>
              </div>
              {/* Vibrant multi-stop progress bar */}
              <div className="w-full bg-blue-100 dark:bg-blue-950/50 rounded-full h-2 overflow-hidden border border-blue-200/50 dark:border-blue-800/40">
                <div
                  className="h-full transition-all duration-500 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full"
                  style={{ width: `${coveragePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* KPI 3: Active Material Rows */}
          <div className="rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-950 dark:text-purple-200">Material Specs</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-500/30">
                Live Requisition
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-purple-950 dark:text-purple-100">
                {totalMaterialRows} <span className="text-sm font-normal text-muted-foreground">total rows</span>
              </div>
              <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 mt-0.5 font-medium">
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


      {/* ── Add Section Modal ── */}
      <AddSectionModal
        isOpen={isAddSectionModalOpen}
        onClose={() => setIsAddSectionModalOpen(false)}
        productTitle={currentSlide?.title ?? 'Quotation Product'}
        onAdd={(cat, wpSub, cabSub, accSub, appSub, ceilSub, includeSchedule) => {
          addSection(
            currentCardKey,
            cat,
            wpSub,
            cabSub,
            accSub,
            appSub,
            ceilSub,
            currentSlide?.type === 'LINE_ITEM' ? currentSlide.item?.id : undefined,
            includeSchedule
          )
        }}
      />

      {/* ── Left Product Drawer ── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
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
                    {coveredLineItems} of {lineItems.length} products configured ({coveragePct}%)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
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

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredSlides.map((slide) => {
                const isSelected = productSlides[safeSlideIndex]?.id === slide.id
                const sections = getSectionsForCard(slide.id)
                const rowsCount = sections.reduce((sum, s) => sum + getRowsForSection(slide.id, s.id).length, 0)
                const isConfigured = rowsCount > 0

                return (
                  <button
                    key={slide.id}
                    onClick={() => {
                      const targetIdx = productSlides.findIndex((s) => s.id === slide.id)
                      if (targetIdx !== -1) {
                        goToSlide(targetIdx)
                        setViewModePreference('SLIDE')
                      }
                      setIsDrawerOpen(false)
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40'
                        : 'border-border/70 bg-card hover:bg-muted/40 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            #{slide.index}
                          </span>
                          {slide.areaName && (
                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">
                              {slide.areaName}
                            </span>
                          )}
                          {slide.sectionName && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                              {slide.sectionName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-foreground truncate">{slide.title}</p>
                      </div>
                      {slide.amount > 0 && (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                          {formatBdtRounded(slide.amount)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-1.5">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3 h-3 opacity-70" />
                        <span>{sections.length} sections · {rowsCount} rows</span>
                      </div>
                      {slide.type === 'EXTRA' ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                          <Sparkles className="w-3 h-3" /> General
                        </span>
                      ) : isConfigured ? (
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
          </div>
        </div>
      )}

      {/* ── Floating Side Navigation Chevrons (Desktop) ── */}
      {viewModePreference === 'SLIDE' && (
        <>
          {safeSlideIndex > 0 && (
            <button
              onClick={() => goToSlide((prev) => Math.max(0, prev - 1))}
              className="fixed left-3 top-1/2 -translate-y-1/2 z-20 hidden 2xl:flex h-12 w-12 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-xl backdrop-blur-sm transition-all hover:scale-110 hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-95"
              title={`Previous: ${productSlides[safeSlideIndex - 1]?.title} (Alt + Left)`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {safeSlideIndex < productSlides.length - 1 && (
            <button
              onClick={() => goToSlide((prev) => Math.min(productSlides.length - 1, prev + 1))}
              className="fixed right-3 top-1/2 -translate-y-1/2 z-20 hidden 2xl:flex h-12 w-12 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-xl backdrop-blur-sm transition-all hover:scale-110 hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-95"
              title={`Next: ${productSlides[safeSlideIndex + 1]?.title} (Alt + Right)`}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </>
      )}

      {/* ── Product Navigation Bar (Slide Stepper & Drawer Trigger) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-xs">
        {/* Left: Product list drawer trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary shadow-2xs hover:bg-primary/20 transition-colors"
            title="Open Product Navigator"
          >
            <Layers className="w-4 h-4" />
            <span>Product List ({safeSlideIndex + 1}/{productSlides.length})</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>

        {/* Center: Slide Stepper Navigation */}
        <div className="flex items-center rounded-xl border border-border/80 bg-muted/40 p-1 shadow-2xs">
          <button
            onClick={() => goToSlide((prev) => Math.max(0, prev - 1))}
            disabled={safeSlideIndex === 0}
            className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-foreground rounded-lg hover:bg-background disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous Product (Alt + Left)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <span className="px-3 text-xs font-black text-foreground border-x border-border/60">
            Slide {safeSlideIndex + 1} of {productSlides.length}
          </span>

          <button
            onClick={() => goToSlide((prev) => Math.min(productSlides.length - 1, prev + 1))}
            disabled={safeSlideIndex === productSlides.length - 1}
            className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-foreground rounded-lg hover:bg-background disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next Product (Alt + Right)"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: View mode toggle */}
        <div className="flex items-center rounded-lg border border-border/70 bg-card p-0.5 text-xs">
          <button
            onClick={() => setViewModePreference('SLIDE')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              viewModePreference === 'SLIDE'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Slide View
          </button>
          <button
            onClick={() => setViewModePreference('ALL')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              viewModePreference === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Products
          </button>
        </div>
      </div>

      {/* ── Main Canvas ── */}
      {/* Slide animation keyframes injected once */}
      <style>{`
        @keyframes slideInRight { from { opacity: 0; transform: translateX(48px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInLeft  { from { opacity: 0; transform: translateX(-48px); } to { opacity: 1; transform: translateX(0); } }
        .slide-in-right { animation: slideInRight 0.32s cubic-bezier(0.22,1,0.36,1) both; }
        .slide-in-left  { animation: slideInLeft  0.32s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>
      {viewModePreference === 'SLIDE' ? (
        <div className="space-y-6">
          {/* Animated slide wrapper — key forces remount on slide change */}
          <div
            key={safeSlideIndex}
            className={slideDirection === 'right' ? 'slide-in-right' : 'slide-in-left'}
          >
          {currentSlide.type === 'LINE_ITEM' && currentSlide.item ? (
            <div className="space-y-6">
              {/* Level 1 Hero Banner */}
              <div className="rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-primary/[0.04] via-card to-primary/[0.02] p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                        Quotation Product
                      </span>
                      <span className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Slide {safeSlideIndex + 1} of {productSlides.length}
                      </span>
                      {currentSlide.areaName && (
                        <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                          {currentSlide.areaName}
                        </span>
                      )}
                      {currentSlide.sectionName && (
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {currentSlide.sectionName}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                      {currentSlide.title}
                    </h2>

                    {currentSlide.materials && (
                      <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 text-xs text-muted-foreground leading-relaxed">
                        <span className="font-bold text-foreground/80 uppercase text-[10px] tracking-wider block mb-0.5">
                          Quotation Material Spec:
                        </span>
                        {currentSlide.materials}
                      </div>
                    )}
                  </div>

                  {/* Right stats */}
                  <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
                    {currentSlide.amount > 0 && (
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-muted-foreground block">Quotation Budget</span>
                        <span className="text-lg md:text-xl font-black text-emerald-700 dark:text-emerald-300">
                          {formatBdtRounded(currentSlide.amount)}
                        </span>
                        {currentSlide.quantity && (
                          <span className="text-xs text-muted-foreground block font-medium">
                            Qty: {currentSlide.quantity} {currentSlide.unit}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-center shadow-2xs">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sections</span>
                        <span className="block text-sm font-black text-foreground">{currentSlideSections.length}</span>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-center shadow-2xs">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Material Rows</span>
                        <span className="block text-sm font-black text-foreground">{currentSlideRowsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Level 2 Requisition Sections for this active product */}
              <div className="space-y-5">
                {currentSlideSections.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-border/80 bg-card/50 p-8 text-center space-y-3">
                    <Package className="w-8 h-8 mx-auto text-muted-foreground/40" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">No material sections configured for this quotation item.</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add a section (Core Structural Boards, Fasteners, Hardware, etc.) to start specifying required materials.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddSectionModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add First Section
                    </button>
                  </div>
                ) : (
                  currentSlideSections.map((section) => (
                    <SectionBlock
                      key={section.id}
                      section={section}
                      rows={getRowsForSection(currentCardKey, section.id)}
                      onChange={(ri, field, val) => updateRow(currentCardKey, section.id, ri, field, val)}
                      onUpdateVariant={(ri, field, val) => updateVariant(currentCardKey, section.id, ri, field, val)}
                      onAddRow={() => addRow(currentCardKey, section.id, currentSlide.item?.id)}
                      onRemoveRow={(ri) => removeRow(currentCardKey, section.id, ri)}
                      onLoadPreset={(subType) => loadPresetForSection(currentCardKey, section.id, subType, currentSlide.item?.id)}
                      onLoadCabinetPreset={(subType) => loadCabinetPresetForSection(currentCardKey, section.id, subType, currentSlide.item?.id)}
                      onLoadAccessoryPreset={(subType) => loadAccessoryPresetForSection(currentCardKey, section.id, subType, currentSlide.item?.id)}
                      onLoadAppliancePreset={(subType) => loadAppliancePresetForSection(currentCardKey, section.id, subType, currentSlide.item?.id)}
                      onLoadCeilingPreset={(subType) => loadCeilingPresetForSection(currentCardKey, section.id, subType, currentSlide.item?.id)}
                      onToggleCollapse={() => toggleSectionCollapse(currentCardKey, section.id)}
                      onRemove={() => removeSection(currentCardKey, section.id)}
                      boqSavedAccessories={boqSavedAccessories}
                      onSelectSavedAccessory={(ri, item) => handleSelectSavedAccessory(currentCardKey, section.id, ri, item)}
                      onSaveNewSavedAccessory={handleSaveNewAccessory}
                    />
                  ))
                )}

                {/* Inline Add Section trigger */}
                <div className="rounded-xl border border-dashed border-border/80 bg-card/60 p-4 text-center">
                  <button
                    onClick={() => setIsAddSectionModalOpen(true)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Another Section to {currentSlide.title}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Extra & General Materials Slide */
            <div className="space-y-6">
              <div className="rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-amber-500/5 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        Extra & General Materials
                      </span>
                      <span className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Slide {safeSlideIndex + 1} of {productSlides.length}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-amber-500" />
                      Extra & General Materials
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Site supplies, general hardware, adhesives, and sundries not linked to a specific quotation product.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-center shadow-2xs">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sections</span>
                      <span className="block text-sm font-black text-foreground">{currentSlideSections.length}</span>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-center shadow-2xs">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Material Rows</span>
                      <span className="block text-sm font-black text-foreground">{currentSlideRowsCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {currentSlideSections.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-amber-500/30 bg-card/50 p-8 text-center space-y-3">
                    <Package className="w-8 h-8 mx-auto text-amber-500/40" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">No general sections added yet.</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add a Wall Paneling, Closet/Cabinet, Accessories, or Appliance section to specify site supplies.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddSectionModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add General Section
                    </button>
                  </div>
                ) : (
                  currentSlideSections.map((section) => (
                    <SectionBlock
                      key={section.id}
                      section={section}
                      rows={getRowsForSection(EXTRA_KEY, section.id)}
                      onChange={(ri, field, val) => updateRow(EXTRA_KEY, section.id, ri, field, val)}
                      onUpdateVariant={(ri, field, val) => updateVariant(EXTRA_KEY, section.id, ri, field, val)}
                      onAddRow={() => addRow(EXTRA_KEY, section.id, undefined)}
                      onRemoveRow={(ri) => removeRow(EXTRA_KEY, section.id, ri)}
                      onLoadPreset={(subType) => loadPresetForSection(EXTRA_KEY, section.id, subType, undefined)}
                      onLoadCabinetPreset={(subType) => loadCabinetPresetForSection(EXTRA_KEY, section.id, subType, undefined)}
                      onLoadAccessoryPreset={(subType) => loadAccessoryPresetForSection(EXTRA_KEY, section.id, subType, undefined)}
                      onLoadAppliancePreset={(subType) => loadAppliancePresetForSection(EXTRA_KEY, section.id, subType, undefined)}
                      onLoadCeilingPreset={(subType) => loadCeilingPresetForSection(EXTRA_KEY, section.id, subType, undefined)}
                      onToggleCollapse={() => toggleSectionCollapse(EXTRA_KEY, section.id)}
                      onRemove={() => removeSection(EXTRA_KEY, section.id)}
                      boqSavedAccessories={boqSavedAccessories}
                      onSelectSavedAccessory={(ri, item) => handleSelectSavedAccessory(EXTRA_KEY, section.id, ri, item)}
                      onSaveNewSavedAccessory={handleSaveNewAccessory}
                    />
                  ))
                )}

                <div className="rounded-xl border border-dashed border-border/80 bg-card/60 p-4 text-center">
                  <button
                    onClick={() => setIsAddSectionModalOpen(true)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Another Section to Extra & General
                  </button>
                </div>
              </div>
            </div>
          )}{/* end slide content conditional */}
          </div>{/* end animated slide wrapper */}
        </div>
      ) : (
        /* All Products Vertical View */
        <div className="space-y-8">
          {quotation && lineItems.length > 0 ? (
            <div className="space-y-8">
              {sections.map((section) => {
                const sectionItems = lineItems.filter((li) => li.sectionId === section.id)
                if (sectionItems.length === 0) return null

                return (
                  <div key={section.id} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border/70 bg-muted/10 px-2 pb-3 pt-3">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quotation group</p>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{section.name}</h2>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground ml-auto bg-muted px-2.5 py-0.5 rounded-full border border-border/40">
                        {sectionItems.length} {sectionItems.length !== 1 ? 'line items' : 'line item'}
                      </span>
                    </div>

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
                            onLoadAccessoryPreset={(sectionId, subType) => loadAccessoryPresetForSection(li.id, sectionId, subType, li.id)}
                            onLoadAppliancePreset={(sectionId, subType) => loadAppliancePresetForSection(li.id, sectionId, subType, li.id)}
                            onAddSection={(cat, wpSub, cabSub, accSub, appSub, ceilSub, includeSchedule) => addSection(li.id, cat, wpSub, cabSub, accSub, appSub, ceilSub, li.id, includeSchedule)}
                            onRemoveSection={(sectionId) => removeSection(li.id, sectionId)}
                            onToggleSectionCollapse={(sectionId) => toggleSectionCollapse(li.id, sectionId)}
                            boqSavedAccessories={boqSavedAccessories}
                            onSelectSavedAccessory={(sectionId, ri, item) => handleSelectSavedAccessory(li.id, sectionId, ri, item)}
                            onSaveNewSavedAccessory={handleSaveNewAccessory}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          {/* Extra Card in All View */}
          <ExtraCard
            sections={getSectionsForCard(EXTRA_KEY)}
            getRowsForSection={(sectionId) => getRowsForSection(EXTRA_KEY, sectionId)}
            onChangeRow={(sectionId, ri, field, val) => updateRow(EXTRA_KEY, sectionId, ri, field, val)}
            onUpdateVariant={(sectionId, ri, field, val) => updateVariant(EXTRA_KEY, sectionId, ri, field, val)}
            onAddRow={(sectionId) => addRow(EXTRA_KEY, sectionId, undefined)}
            onRemoveRow={(sectionId, ri) => removeRow(EXTRA_KEY, sectionId, ri)}
            onLoadPreset={(sectionId, subType) => loadPresetForSection(EXTRA_KEY, sectionId, subType, undefined)}
            onLoadCabinetPreset={(sectionId, subType) => loadCabinetPresetForSection(EXTRA_KEY, sectionId, subType, undefined)}
            onLoadAccessoryPreset={(sectionId, subType) => loadAccessoryPresetForSection(EXTRA_KEY, sectionId, subType, undefined)}
            onLoadAppliancePreset={(sectionId, subType) => loadAppliancePresetForSection(EXTRA_KEY, sectionId, subType, undefined)}
            onAddSection={(cat, wpSub, cabSub, accSub, appSub, ceilSub, includeSchedule) => addSection(EXTRA_KEY, cat, wpSub, cabSub, accSub, appSub, ceilSub, undefined, includeSchedule)}
            onRemoveSection={(sectionId) => removeSection(EXTRA_KEY, sectionId)}
            onToggleSectionCollapse={(sectionId) => toggleSectionCollapse(EXTRA_KEY, sectionId)}
            boqSavedAccessories={boqSavedAccessories}
            onSelectSavedAccessory={(sectionId, ri, item) => handleSelectSavedAccessory(EXTRA_KEY, sectionId, ri, item)}
            onSaveNewSavedAccessory={handleSaveNewAccessory}
          />
        </div>
      )}

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

      {/* ── Always-visible Bottom Workspace Bar (Contextual Smart Bar) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-background/95 px-4 py-2.5 shadow-2xl backdrop-blur-md md:px-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3">
          {/* Left: Product slide info & Navigator trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors shadow-2xs"
              title="Open Product List Drawer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="font-extrabold">{safeSlideIndex + 1}/{productSlides.length}</span>
              <span className="hidden sm:inline truncate max-w-[150px] font-semibold">{currentSlide?.title}</span>
            </button>

            {viewModePreference === 'SLIDE' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToSlide((prev) => Math.max(0, prev - 1))}
                  disabled={safeSlideIndex === 0}
                  className="p-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  title="Previous Product"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => goToSlide((prev) => Math.min(productSlides.length - 1, prev + 1))}
                  disabled={safeSlideIndex === productSlides.length - 1}
                  className="p-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  title="Next Product"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Center: Contextual Action Buttons ("Which section it will hit") */}
          <div className="flex flex-wrap items-center gap-2">
            {activeSectionObj ? (
              <>
                {/* Target section badge */}
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/60 text-xs">
                  <Target className="w-3.5 h-3.5 text-primary animate-pulse" />
                  <span className="text-muted-foreground font-medium">Target:</span>
                  <span className="font-bold text-foreground truncate max-w-[200px]">
                    {activeSectionName}
                  </span>
                </div>

                {/* Add Material to active section button */}
                <button
                  onClick={() => {
                    if (activeSectionObj) {
                      addRow(
                        currentCardKey,
                        activeSectionObj.id,
                        currentSlide?.type === 'LINE_ITEM' ? currentSlide.item?.id : undefined
                      )
                      if (activeSectionObj.collapsed) {
                        toggleSectionCollapse(currentCardKey, activeSectionObj.id)
                      }
                      setTimeout(() => {
                        document.getElementById(`section-dom-${activeSectionObj.id}`)?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'nearest',
                        })
                      }, 50)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-colors"
                  title={`Add a material row to ${activeSectionName}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Material</span>
                  <span className="hidden sm:inline font-semibold opacity-90">({activeSectionName})</span>
                </button>

                {/* Add Section button */}
                <button
                  onClick={() => setIsAddSectionModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted px-3 py-1.5 text-xs font-bold text-foreground shadow-2xs transition-colors"
                  title="Add a new section to this product"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>Add Section</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAddSectionModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 text-xs font-bold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Section to this Product</span>
              </button>
            )}
          </div>

          {/* Right: Save / Submit / PDF */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => handleSave('DRAFT')}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Save className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Save</span> Draft
              <span className="ml-1.5 hidden xl:inline rounded border border-border bg-muted px-1 py-0.5 text-[9px] font-bold text-muted-foreground">
                Ctrl+S
              </span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isPending || isPdfGenerating || totalMaterialRows === 0}
              className="inline-flex items-center justify-center rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
              {isPdfGenerating ? 'PDF...' : 'PDF'}
            </button>
            <button
              onClick={() => handleSave('SUBMITTED')}
              disabled={isPending || totalMaterialRows === 0}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Submit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

