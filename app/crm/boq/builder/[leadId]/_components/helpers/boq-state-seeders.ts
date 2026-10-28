import type { RequisitionItemInput } from '@/lib/boq-service'
import type {
  RequisitionWorkCategory,
  WallPanelingSubType,
  CabinetSubType,
  AccessoriesSubType,
  ApplianceSubType,
  CeilingSubType,
  SectionsMap,
  ItemsMap,
  SavedRequisitionItem,
  BoardVariantAttributes,
  Props,
} from '../types/boq-builder-types'
import { EXTRA_KEY, DEFAULT_SAVED_APPLIANCES } from '../constants/boq-builder-constants'
import {
  CEILING_LIGHTING_CATALOG,
  CEILING_ELECTRICAL_CATALOG,
} from '../constants/boq-lighting-electrical-catalogs'
import { SAMPLE_WALL_PANEL_ITEMS } from '../constants/boq-seed-catalogs'

export function sectionItemKey(cardKey: string, sectionId: string): string {
  return `${cardKey}::${sectionId}`
}

/* ─────────────────────────────────────────────
   Helper – build a blank requisition item
───────────────────────────────────────────── */
export function blankItem(
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

  if (
    category === 'ELECTRICAL_WORK' ||
    (category === 'CEILING' && ceilingSubType === 'ELECTRICAL_DEVICES')
  ) {
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
    const def = DEFAULT_SAVED_APPLIANCES[0]
    return {
      ...base,
      materialName: def.name,
      unit: def.defaultUnit || 'Nos',
      productionPhase: 'Core Appliances',
      variantAttributes: {
        srNo: '1',
        applianceCategory: def.category,
        brandModelCode: def.brandModelCode,
        dimW: def.dimW || '',
        dimD: def.dimD || '',
        dimH: def.dimH || '',
        cabinetNicheCutOutSize: def.cabinetNicheCutOutSize || '—',
        qtyLabel: '1 nos',
        unitPrice: def.defaultUnitPrice || '',
        totalAmount: def.defaultUnitPrice || '',
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

export function flattenItems(map: ItemsMap): RequisitionItemInput[] {
  return Object.values(map).flat()
}

export function parseDimensions(dimStr?: string): { dimW: string; dimD: string; dimH: string } {
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

export function formatDimensions(dimW?: string, dimD?: string, dimH?: string): string {
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

export function seedFromExisting(
  rawItems: SavedRequisitionItem[],
): { sectionsMap: SectionsMap; itemsMap: ItemsMap } {
  const sectionsMap: SectionsMap = {}
  const itemsMap: ItemsMap = {}
  const sectionRegistry: Record<string, string> = {}

  for (const it of rawItems) {
    const cardKey: string = it.quotationLineItemId || EXTRA_KEY

    let attrs: BoardVariantAttributes = {}
    if (typeof it.variantAttributes === 'string') {
      try {
        attrs = JSON.parse(it.variantAttributes)
      } catch {
        attrs = {}
      }
    } else if (it.variantAttributes && typeof it.variantAttributes === 'object') {
      attrs = it.variantAttributes as BoardVariantAttributes
    }

    const category: RequisitionWorkCategory = it.workCategory || 'WALL_PANELING'
    const wpSubType = attrs.wpSubType as WallPanelingSubType | undefined
    const cabSubType = attrs.cabinetSubType as CabinetSubType | undefined
    const accSubType = attrs.accessoriesSubType as AccessoriesSubType | undefined
    const appSubType =
      category === 'APPLIANCES'
        ? ((attrs.applianceSubType as ApplianceSubType | undefined) ?? 'CORE_APPLIANCES')
        : undefined
    const ceilingSubType =
      category === 'CEILING' || category === 'ELECTRICAL_WORK'
        ? (attrs.ceilingSubType as CeilingSubType | undefined) ??
          (category === 'ELECTRICAL_WORK' ? 'ELECTRICAL_DEVICES' : 'CEILING_LIGHTING')
        : undefined

    const registryKey = `${cardKey}::${category}::${wpSubType ?? ''}::${cabSubType ?? ''}::${accSubType ?? ''}::${appSubType ?? ''}::${ceilingSubType ?? ''}`

    let secId = sectionRegistry[registryKey]
    if (!secId) {
      secId = `sec-${cardKey}-${category}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      sectionRegistry[registryKey] = secId
      if (!sectionsMap[cardKey]) sectionsMap[cardKey] = []
      sectionsMap[cardKey].push({
        id: secId,
        category,
        wallPanelingSubType: wpSubType,
        cabinetSubType: cabSubType,
        accessoriesSubType: accSubType,
        applianceSubType: appSubType,
        ceilingSubType,
        collapsed: false,
      })
    }

    const sKey = sectionItemKey(cardKey, secId)
    if (!itemsMap[sKey]) itemsMap[sKey] = []

    const net = Number(it.netQuantity ?? 0)
    const waste = Number(it.wastagePercent ?? 0)
    const final_ = Number(it.finalQuantity ?? (net > 0 ? Math.ceil(net * (1 + waste / 100)) : 0))

    itemsMap[sKey].push({
      quotationLineItemId: it.quotationLineItemId ?? undefined,
      workCategory: category,
      materialName: it.materialName ?? '',
      specifications: it.specifications ?? '',
      netQuantity: net,
      wastagePercent: waste,
      finalQuantity: final_,
      unit: it.unit ?? 'pcs',
      productionPhase: it.productionPhase ?? '',
      remarks: it.remarks ?? '',
      variantAttributes: {
        ...attrs,
        wpSubType,
        cabinetSubType: cabSubType,
        accessoriesSubType: accSubType,
        applianceSubType: appSubType,
        ceilingSubType,
      },
    })
  }

  return { sectionsMap, itemsMap }
}

export function computeInitialState(
  existingRequisition: Props['existingRequisition'],
): { sectionsMap: SectionsMap; itemsMap: ItemsMap } {
  if (existingRequisition?.items && existingRequisition.items.length > 0) {
    return seedFromExisting(existingRequisition.items)
  }
  const defaultSectionId = 'section-default'
  return {
    sectionsMap: {
      [EXTRA_KEY]: [
        {
          id: defaultSectionId,
          category: 'WALL_PANELING',
          wallPanelingSubType: 'CORE_BOARDS',
          collapsed: false,
        },
      ],
    },
    itemsMap: {
      [sectionItemKey(EXTRA_KEY, defaultSectionId)]: [...SAMPLE_WALL_PANEL_ITEMS],
    },
  }
}
