import type { RequisitionItemInput } from '@/lib/boq-service'
import type { QuotationLineItem } from '@/lib/quotation-types'

export type RequisitionWorkCategory =
  | 'CEILING'
  | 'WALL_PANELING'
  | 'CABINETS_CLOSETS'
  | 'FURNITURE'
  | 'ACCESSORIES'
  | 'ELECTRICAL_WORK'
  | 'PAINT'
  | 'APPLIANCES'

export type WallPanelingSubType =
  | 'CORE_BOARDS'
  | 'LOUVERS_PROFILES'
  | 'SCREWS_FASTENERS'
  | 'NAILS_PINS'
  | 'ADHESIVES'

export type CabinetSubType = 'BOARD_SPEC' | 'CORE_BOARD_SPEC' | 'HPL_PASTING'
export type AccessoriesSubType = 'HARDWARE_ACCESSORIES' | 'SERVICES_DELIVERABLES'
export type ApplianceSubType = 'CORE_APPLIANCES'
export type CeilingSubType = 'CEILING_LIGHTING' | 'ELECTRICAL_DEVICES'

export type ViewModeType =
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

export interface CardSection {
  id: string
  category: RequisitionWorkCategory
  wallPanelingSubType?: WallPanelingSubType
  cabinetSubType?: CabinetSubType
  accessoriesSubType?: AccessoriesSubType
  applianceSubType?: ApplianceSubType
  ceilingSubType?: CeilingSubType
  collapsed: boolean
}

export type SectionsMap = Record<string, CardSection[]>
/** ItemsMap key = `${cardKey}::${sectionId}` */
export type ItemsMap = Record<string, RequisitionItemInput[]>

export type RequisitionFieldValue = string | number | Record<string, unknown> | undefined

export type SavedRequisitionItem = {
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
  applianceCategory?: string
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

export interface BoqSavedAccessoryItem {
  id: string
  name: string
  category: string
  itemCode: string
  defaultUnit: string
}

export type BoqSavedApplianceItem = {
  id: string
  name: string
  category: string
  brandModelCode: string
  dimW?: string
  dimD?: string
  dimH?: string
  cabinetNicheCutOutSize?: string
  defaultUnitPrice?: string
  defaultUnit?: string
}

export interface RequisitionBuilderProps {
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

export interface ProductSlide {
  id: string
  type: 'LINE_ITEM' | 'EXTRA'
  index: number
  title: string
  floorId?: string
  areaId?: string
  areaName?: string
  sectionName?: string
  amount: number
  quantity?: number
  unit?: string
  materials?: string | null
  item?: QuotationLineItem
}

export type Props = RequisitionBuilderProps
