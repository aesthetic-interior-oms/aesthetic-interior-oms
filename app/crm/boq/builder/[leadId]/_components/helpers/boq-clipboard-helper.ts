import type {
  CardSection,
  RequisitionWorkCategory,
  WallPanelingSubType,
  CabinetSubType,
  AccessoriesSubType,
  ApplianceSubType,
  CeilingSubType,
} from '../types/boq-builder-types'
import type { RequisitionItemInput } from '@/lib/boq-service'

export const BOQ_GLOBAL_CLIPBOARD_STORAGE_KEY = 'boq-global-copied-row'
export const BOQ_LEGACY_CLIPBOARD_STORAGE_KEY = 'boq-copied-material'
export const BOQ_CLIPBOARD_EVENT = 'boq-clipboard-updated'

export interface BoqCopiedRowPayload {
  item: RequisitionItemInput
  sourceSectionId?: string
  sourceCardKey?: string
  category: RequisitionWorkCategory
  wallPanelingSubType?: WallPanelingSubType
  cabinetSubType?: CabinetSubType
  accessoriesSubType?: AccessoriesSubType
  applianceSubType?: ApplianceSubType
  ceilingSubType?: CeilingSubType
  typeKey: string
  typeLabel: string
  copiedAt: number
}

export type SectionTypeTarget = {
  category: RequisitionWorkCategory
  wallPanelingSubType?: WallPanelingSubType
  cabinetSubType?: CabinetSubType
  accessoriesSubType?: AccessoriesSubType
  applianceSubType?: ApplianceSubType
  ceilingSubType?: CeilingSubType
}

/**
 * Returns canonical typeKey and human-readable typeLabel for a section.
 */
export function getSectionCanonicalType(section: SectionTypeTarget): {
  typeKey: string
  typeLabel: string
} {
  const cat = section.category

  if (cat === 'WALL_PANELING') {
    const sub = section.wallPanelingSubType || 'CORE_BOARDS'
    switch (sub) {
      case 'CORE_BOARDS':
        return { typeKey: 'WALL_PANELING:CORE_BOARDS', typeLabel: 'Wall Paneling (Boards)' }
      case 'LOUVERS_PROFILES':
        return { typeKey: 'WALL_PANELING:LOUVERS_PROFILES', typeLabel: 'Wall Paneling (Decorative Panels)' }
      case 'SCREWS_FASTENERS':
        return { typeKey: 'WALL_PANELING:SCREWS_FASTENERS', typeLabel: 'Hardware (Screws & Fasteners)' }
      case 'NAILS_PINS':
        return { typeKey: 'WALL_PANELING:NAILS_PINS', typeLabel: 'Nails, Pins & Anchors' }
      case 'ADHESIVES':
        return { typeKey: 'WALL_PANELING:ADHESIVES', typeLabel: 'Adhesives & Chemical Solvents' }
      default:
        return { typeKey: `WALL_PANELING:${sub}`, typeLabel: `Wall Paneling (${sub})` }
    }
  }

  if (cat === 'CABINETS_CLOSETS') {
    const sub = section.cabinetSubType || 'BOARD_SPEC'
    if (sub === 'HPL_PASTING') {
      return { typeKey: 'CABINETS_CLOSETS:HPL_PASTING', typeLabel: 'Cabinets & Closets (HPL Pasting)' }
    }
    return { typeKey: 'CABINETS_CLOSETS:BOARD_SPEC', typeLabel: 'Cabinets & Closets (Board Specification)' }
  }

  if (cat === 'ACCESSORIES') {
    const sub = section.accessoriesSubType || 'HARDWARE_ACCESSORIES'
    if (sub === 'SERVICES_DELIVERABLES') {
      return { typeKey: 'ACCESSORIES:SERVICES_DELIVERABLES', typeLabel: 'Additional Deliverables & Services' }
    }
    return { typeKey: 'ACCESSORIES:HARDWARE_ACCESSORIES', typeLabel: 'Kitchen & Closet Hardware Accessories' }
  }

  if (cat === 'APPLIANCES') {
    return { typeKey: 'APPLIANCES:CORE_APPLIANCES', typeLabel: 'Core Appliances' }
  }

  if (cat === 'CEILING') {
    const sub = section.ceilingSubType || 'CEILING_LIGHTING'
    if (sub === 'ELECTRICAL_DEVICES') {
      return { typeKey: 'CEILING:ELECTRICAL_DEVICES', typeLabel: 'Ceiling (Electrical Devices)' }
    }
    return { typeKey: 'CEILING:CEILING_LIGHTING', typeLabel: 'Ceiling (Lighting & Profiles)' }
  }

  if (cat === 'ELECTRICAL_WORK') {
    return { typeKey: 'ELECTRICAL_WORK:ELECTRICAL_DEVICES', typeLabel: 'Electrical Work' }
  }

  if (cat === 'PAINT') {
    return { typeKey: 'PAINT:STANDARD', typeLabel: 'Paint Work' }
  }

  if (cat === 'FURNITURE') {
    return { typeKey: 'FURNITURE:STANDARD', typeLabel: 'Furniture' }
  }

  return { typeKey: `${cat}:STANDARD`, typeLabel: String(cat) }
}

/**
 * Infer canonical type from item attributes when section object is not immediately available.
 */
export function inferItemCanonicalType(item: RequisitionItemInput): {
  typeKey: string
  typeLabel: string
} {
  const cat = item.workCategory || 'WALL_PANELING'
  const attrs = (item.variantAttributes || {}) as Record<string, unknown>

  if (cat === 'WALL_PANELING') {
    const wpSub = attrs.wpSubType as WallPanelingSubType | undefined
    if (wpSub) {
      return getSectionCanonicalType({ category: 'WALL_PANELING', wallPanelingSubType: wpSub })
    }
    if (attrs.accentFinish || attrs.codeVariant) {
      return getSectionCanonicalType({ category: 'WALL_PANELING', wallPanelingSubType: 'LOUVERS_PROFILES' })
    }
    if (attrs.lengthInches || attrs.usagePurpose || (item.materialName && /screw/i.test(item.materialName))) {
      return getSectionCanonicalType({ category: 'WALL_PANELING', wallPanelingSubType: 'SCREWS_FASTENERS' })
    }
    if (attrs.lengthSpec || (item.materialName && /(nail|pin|anchor)/i.test(item.materialName))) {
      return getSectionCanonicalType({ category: 'WALL_PANELING', wallPanelingSubType: 'NAILS_PINS' })
    }
    if (attrs.applicationMethod || (item.materialName && /(adhesive|glue|solvent)/i.test(item.materialName))) {
      return getSectionCanonicalType({ category: 'WALL_PANELING', wallPanelingSubType: 'ADHESIVES' })
    }
    return getSectionCanonicalType({ category: 'WALL_PANELING', wallPanelingSubType: 'CORE_BOARDS' })
  }

  if (cat === 'CABINETS_CLOSETS') {
    const cabSub = attrs.cabinetSubType as CabinetSubType | undefined
    return getSectionCanonicalType({ category: 'CABINETS_CLOSETS', cabinetSubType: cabSub })
  }

  if (cat === 'ACCESSORIES') {
    const accSub = (attrs.accessoriesSubType as AccessoriesSubType | undefined) ||
      (attrs.serviceCategory ? 'SERVICES_DELIVERABLES' : 'HARDWARE_ACCESSORIES')
    return getSectionCanonicalType({ category: 'ACCESSORIES', accessoriesSubType: accSub })
  }

  if (cat === 'APPLIANCES') {
    return getSectionCanonicalType({ category: 'APPLIANCES', applianceSubType: 'CORE_APPLIANCES' })
  }

  if (cat === 'CEILING') {
    const ceilSub = (attrs.ceilingSubType as CeilingSubType | undefined) ||
      (attrs.deviceCategory ? 'ELECTRICAL_DEVICES' : 'CEILING_LIGHTING')
    return getSectionCanonicalType({ category: 'CEILING', ceilingSubType: ceilSub })
  }

  return getSectionCanonicalType({ category: cat })
}

/**
 * Reads global BOQ clipboard from localStorage.
 */
export function readGlobalBoqClipboard(): BoqCopiedRowPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(BOQ_GLOBAL_CLIPBOARD_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as BoqCopiedRowPayload
      if (parsed && parsed.item && parsed.typeKey) {
        return parsed
      }
    }
    // Fallback to legacy key if present
    const legacy = localStorage.getItem(BOQ_LEGACY_CLIPBOARD_STORAGE_KEY)
    if (legacy) {
      const item = JSON.parse(legacy) as RequisitionItemInput
      if (item && item.workCategory) {
        const meta = inferItemCanonicalType(item)
        return {
          item,
          category: item.workCategory,
          typeKey: meta.typeKey,
          typeLabel: meta.typeLabel,
          copiedAt: Date.now(),
        }
      }
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * Writes global BOQ clipboard to localStorage and broadcasts update event.
 */
export function writeGlobalBoqClipboard(payload: BoqCopiedRowPayload): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(BOQ_GLOBAL_CLIPBOARD_STORAGE_KEY, JSON.stringify(payload))
    localStorage.setItem(BOQ_LEGACY_CLIPBOARD_STORAGE_KEY, JSON.stringify(payload.item))
    window.dispatchEvent(
      new CustomEvent<BoqCopiedRowPayload>(BOQ_CLIPBOARD_EVENT, { detail: payload })
    )
  } catch (err) {
    console.error('Failed to write global boq clipboard:', err)
  }
}

/**
 * Checks whether a copied row is compatible to be pasted into the target section.
 */
export function isBoqRowCompatible(
  copied: BoqCopiedRowPayload | null,
  targetSection: SectionTypeTarget | null | undefined
): boolean {
  if (!copied || !targetSection) return false
  const targetMeta = getSectionCanonicalType(targetSection)
  return copied.typeKey === targetMeta.typeKey
}
