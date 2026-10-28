import type { RequisitionItemInput } from '@/lib/boq-service'
import type {
  CardSection,
  RequisitionWorkCategory,
  BoardVariantAttributes,
  ViewModeType,
} from '../types/boq-builder-types'
import {
  WORK_CATEGORIES,
  WALL_PANELING_SUBTYPES,
  CABINET_SUBTYPES,
  ACCESSORIES_SUBTYPES,
  APPLIANCE_SUBTYPES,
  CEILING_SUBTYPES,
} from '../constants/boq-builder-constants'
import { isReadymadePanel } from './boq-panel-classification'

export type SaveStatus = 'DRAFT' | 'SUBMITTED'

export type PdfTableDoc = {
  internal: {
    getCurrentPageInfo: () => { pageNumber: number }
    getNumberOfPages: () => number
  }
  lastAutoTable?: { finalY?: number }
}

export type PdfRgb = [number, number, number]

export type PdfColumnStyles = Record<
  number,
  {
    cellWidth?: number | 'auto'
    halign?: 'left' | 'center' | 'right'
    fontStyle?: 'normal' | 'bold'
  }
>

export type RequisitionPdfTableConfig = {
  head: string[]
  body: Array<Array<string | number>>
  columnStyles: PdfColumnStyles
  color: PdfRgb
}

export function getViewModeForSection(section: CardSection): ViewModeType {
  if (section.category === 'WALL_PANELING') {
    switch (section.wallPanelingSubType) {
      case 'CORE_BOARDS':
        return 'BOARD_SPEC'
      case 'LOUVERS_PROFILES':
        return 'LOUVER_SPEC'
      case 'SCREWS_FASTENERS':
        return 'SCREW_SPEC'
      case 'NAILS_PINS':
        return 'NAIL_SPEC'
      case 'ADHESIVES':
        return 'ADHESIVE_SPEC'
      default:
        return 'BOARD_SPEC'
    }
  }
  if (section.category === 'CABINETS_CLOSETS') {
    return 'CABINET_CORE_SPEC'
  }
  if (section.category === 'ACCESSORIES') {
    switch (section.accessoriesSubType) {
      case 'HARDWARE_ACCESSORIES':
        return 'HARDWARE_ACCESSORY_SPEC'
      case 'SERVICES_DELIVERABLES':
        return 'SERVICES_DELIVERABLE_SPEC'
      default:
        return 'HARDWARE_ACCESSORY_SPEC'
    }
  }
  if (section.category === 'APPLIANCES') {
    switch (section.applianceSubType) {
      case 'CORE_APPLIANCES':
        return 'CORE_APPLIANCE_SPEC'
      default:
        return 'CORE_APPLIANCE_SPEC'
    }
  }
  if (section.category === 'CEILING') {
    switch (section.ceilingSubType) {
      case 'ELECTRICAL_DEVICES':
        return 'CEILING_ELECTRICAL_SPEC'
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

export function getWorkCategoryLabel(category: RequisitionWorkCategory | string): string {
  return WORK_CATEGORIES.find((item) => item.key === category)?.label ?? String(category).replace(/_/g, ' ')
}

export function formatBdtRounded(value: number): string {
  return `৳${Math.round(Number(value) || 0).toLocaleString('en-IN')}`
}

export function safePdfText(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback
  return String(value).replace(/[৳—–]/g, (match) => (match === '৳' ? 'BDT ' : '-'))
}

export function safeFilePart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'requisition'
}

export function cleanPdfLabel(value: string): string {
  return safePdfText(value.replace(/[^\x20-\x7E]/g, '').trim())
}

export function getSectionTypeLabel(section: CardSection): string {
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

export function pdfAttr(item: RequisitionItemInput, key: keyof BoardVariantAttributes): string {
  const value = item.variantAttributes?.[key]
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

export function pdfQty(item: RequisitionItemInput): string {
  if (
    item.variantAttributes?.sourceScheduleKey &&
    item.variantAttributes?.sourceQuantityStatus === 'NEEDS_CONFIRMATION'
  )
    return 'Needs quantity'
  const label = pdfAttr(item, 'qtyLabel') || pdfAttr(item, 'quantityUnit')
  if (label) return safePdfText(label)
  return Number(item.finalQuantity || item.netQuantity || 0).toLocaleString('en-IN')
}

export function buildSectionPdfTable(
  section: CardSection,
  rows: RequisitionItemInput[],
): RequisitionPdfTableConfig {
  const viewMode = getViewModeForSection(section)
  const text = (value: unknown) => safePdfText(value)

  if (viewMode === 'BOARD_SPEC') {
    return {
      color: [146, 64, 14],
      head: [
        'SL NO',
        'Base Material',
        'Thickness',
        'Front / Top Laminate',
        'Back / Bottom Laminate',
        'Unit',
        'Qty',
        'Edging Tape Qty',
        'Usage',
      ],
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
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 38, fontStyle: 'bold' },
        2: { cellWidth: 22 },
        3: { cellWidth: 36 },
        4: { cellWidth: 36 },
        5: { cellWidth: 16 },
        6: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 28 },
        8: { cellWidth: 'auto' },
      },
    }
  }

  if (viewMode === 'LOUVER_SPEC') {
    return {
      color: [79, 70, 229],
      head: [
        'SL NO',
        'Panel / Profile',
        'Type',
        'Thickness',
        'Accent / Finish',
        'Code / Variant',
        'Unit',
        'Qty',
        'Usage',
        'Notes',
      ],
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
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 40, fontStyle: 'bold' },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 20 },
        4: { cellWidth: 30 },
        5: { cellWidth: 28 },
        6: { cellWidth: 16 },
        7: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 38 },
        9: { cellWidth: 'auto' },
      },
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
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 32, fontStyle: 'bold' },
        2: { cellWidth: 28 },
        3: { cellWidth: 18 },
        4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 48 },
        6: { cellWidth: 'auto' },
      },
    }
  }

  if (viewMode === 'NAIL_SPEC') {
    return {
      color: [190, 18, 60],
      head: ['SL NO', 'Item Name', 'Length', 'Unit', 'Qty', 'Usage', 'Notes'],
      body: rows.map((item, idx) => [
        String(idx + 1).padStart(2, '0'),
        text(item.materialName || pdfAttr(item, 'nailType') || 'Nail'),
        text(pdfAttr(item, 'lengthSpec')),
        text(item.unit),
        pdfQty(item),
        text(pdfAttr(item, 'functionalUsage') || item.productionPhase),
        text(pdfAttr(item, 'column1') || item.remarks),
      ]),
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 34, fontStyle: 'bold' },
        2: { cellWidth: 26 },
        3: { cellWidth: 18 },
        4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 48 },
        6: { cellWidth: 'auto' },
      },
    }
  }

  if (viewMode === 'ADHESIVE_SPEC') {
    return {
      color: [5, 150, 105],
      head: ['SL NO', 'Product Name', 'Application / Purpose', 'Unit', 'Qty', 'Packaging / Specs', 'Notes'],
      body: rows.map((item, idx) => [
        String(idx + 1).padStart(2, '0'),
        text(item.materialName || pdfAttr(item, 'chemicalClass') || 'Adhesive'),
        text(pdfAttr(item, 'applicationMethod') || pdfAttr(item, 'functionalUsage') || item.productionPhase),
        text(item.unit),
        pdfQty(item),
        text(pdfAttr(item, 'packagingUnit') || pdfAttr(item, 'column1') || item.specifications),
        text(item.remarks || '-'),
      ]),
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 34, fontStyle: 'bold' },
        2: { cellWidth: 46 },
        3: { cellWidth: 18 },
        4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 38 },
        6: { cellWidth: 'auto' },
      },
    }
  }

  if (viewMode === 'CABINET_CORE_SPEC' || viewMode === 'CABINET_HPL_SPEC') {
    return {
      color: [146, 64, 14],
      head: [
        'SL NO',
        'Usage',
        'Base Material',
        'Thickness',
        'Front Laminate',
        'Back Laminate',
        'Edging Tape',
        'Unit',
        'Qty',
      ],
      body: rows.map((item, idx) => [
        String(idx + 1).padStart(2, '0'),
        text(pdfAttr(item, 'usage') || item.productionPhase),
        text(pdfAttr(item, 'baseMaterial') || pdfAttr(item, 'coreSubstrateType')),
        text(pdfAttr(item, 'coreThickness')),
        text(pdfAttr(item, 'frontLaminateCode')),
        text(pdfAttr(item, 'backLaminateCode') || '-'),
        text(pdfAttr(item, 'edgingTapeQty') || '-'),
        text(item.unit),
        pdfQty(item),
      ]),
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 28, fontStyle: 'bold' },
        2: { cellWidth: 34 },
        3: { cellWidth: 22 },
        4: { cellWidth: 36 },
        5: { cellWidth: 36 },
        6: { cellWidth: 24 },
        7: { cellWidth: 16 },
        8: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
      },
    }
  }

  if (viewMode === 'HARDWARE_ACCESSORY_SPEC') {
    return {
      color: [219, 39, 119],
      head: ['SL', 'Item Name', 'Category', 'Code', 'Dimensions', 'Qty', 'Unit Price', 'Total'],
      body: rows.map((item) => [
        text(pdfAttr(item, 'srNo')),
        text(item.materialName),
        text(pdfAttr(item, 'accessoryCategory')),
        text(pdfAttr(item, 'itemCode')),
        text(pdfAttr(item, 'dimensions')),
        pdfQty(item),
        text(pdfAttr(item, 'unitPrice')),
        text(pdfAttr(item, 'totalAmount')),
      ]),
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 42, fontStyle: 'bold' },
        2: { cellWidth: 24 },
        3: { cellWidth: 26 },
        4: { cellWidth: 32 },
        5: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 22, halign: 'right' },
        7: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
      },
    }
  }

  if (viewMode === 'SERVICES_DELIVERABLE_SPEC') {
    return {
      color: [147, 51, 234],
      head: ['SL', 'Service / Deliverable', 'Specifications / Scope', 'Unit', 'Rate Type', 'Est. Total'],
      body: rows.map((item) => [
        text(pdfAttr(item, 'srNo')),
        text(item.materialName),
        text(item.specifications),
        text(pdfAttr(item, 'quantityUnit') || item.unit),
        text(pdfAttr(item, 'rateType')),
        text(pdfAttr(item, 'estimatedTotal')),
      ]),
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 44, fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20 },
        4: { cellWidth: 24 },
        5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      },
    }
  }

  if (viewMode === 'CORE_APPLIANCE_SPEC') {
    return {
      color: [13, 148, 136],
      head: [
        'SL',
        'Item Name',
        'Brand & Model Code',
        'Outer Dimensions (W×D×H)',
        'Cabinet Niche / Cut-Out Size',
        'Qty',
        'Unit Price',
        'Total Amount',
      ],
      body: rows.map((item) => {
        const dim =
          pdfAttr(item, 'dimW') || pdfAttr(item, 'dimD') || pdfAttr(item, 'dimH')
            ? `W${pdfAttr(item, 'dimW')} × D${pdfAttr(item, 'dimD')} × H${pdfAttr(item, 'dimH')} mm`
            : pdfAttr(item, 'outerDimensions')
        return [
          text(pdfAttr(item, 'srNo')),
          text(item.materialName),
          text(pdfAttr(item, 'brandModelCode')),
          text(dim),
          text(pdfAttr(item, 'cabinetNicheCutOutSize')),
          pdfQty(item),
          text(pdfAttr(item, 'unitPrice')),
          text(pdfAttr(item, 'totalAmount')),
        ]
      }),
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 38, fontStyle: 'bold' },
        2: { cellWidth: 36 },
        3: { cellWidth: 36 },
        4: { cellWidth: 46 },
        5: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 26, halign: 'right' },
        7: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
      },
    }
  }

  if (viewMode === 'CEILING_LIGHTING_SPEC') {
    return {
      color: [147, 51, 234],
      head: [
        'SL NO',
        'Item Name',
        'Color Temp / Specs',
        'Size / Dimension',
        'Voltage / Wattage',
        'Qty',
        'Unit',
        'Remarks',
      ],
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
      head: [
        'SL NO',
        'Item Name',
        'Specification / Type',
        'Rating / Dimension',
        'Voltage / Wattage',
        'Qty',
        'Unit',
        'Remarks',
      ],
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
    head: [
      'Category',
      'Material Name',
      'Specification',
      'Net Qty',
      'Waste %',
      'Final Qty',
      'UOM',
      'Phase / Usage',
      'Remarks',
    ],
    body: rows.map((item) => [
      text(getWorkCategoryLabel(item.workCategory)),
      text(item.materialName),
      text(item.specifications),
      pdfQty(item),
      Number(item.wastagePercent || 0).toLocaleString('en-IN'),
      item.variantAttributes?.sourceQuantityStatus === 'NEEDS_CONFIRMATION'
        ? 'Needs quantity'
        : Number(item.finalQuantity || 0).toLocaleString('en-IN'),
      text(item.unit),
      text(item.productionPhase),
      text(item.remarks),
    ]),
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 62 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 18 },
      7: { cellWidth: 38 },
      8: { cellWidth: 'auto' },
    },
  }
}
