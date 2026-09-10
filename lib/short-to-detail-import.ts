import { withDetailQuotationDefaults } from '@/lib/detail-quotation-format'
import { FLOOR_DETAIL_TEMPLATE_KEY } from '@/lib/floor-detail-quotation'
import type { ShortQuotationContent, ShortQuotationPackage } from '@/lib/short-quotation-types'
import type { QuotationArea, QuotationDraftContent, QuotationLineItem, QuotationSection } from '@/lib/quotation-types'

/**
 * Convert a ShortQuotationContent into a QuotationDraftContent so it can
 * be loaded and edited in the detail quotation builder.
 *
 * Mapping:
 *   short floor  →  detail section (floor)
 *   short room   →  detail area under that floor
 *   short line   →  detail line item
 *     line.name           → lineItem.description
 *     line.quantitySqft   → lineItem.quantity (unit = 'sqft')
 *     line.unitPrice      → lineItem.rate
 *     line.total          → lineItem.amount
 *     line.isLumpSum      → lineItem.unit = 'ls', lineItem.amount = line.total
 *     line.catalogItemId  → lineItem.templateId (if present)
 *     line.catalogTemplateKey → lineItem.catalogTemplateKey (if present)
 */
export function convertShortToDetailContent(
  short: ShortQuotationContent,
  options?: {
    /** Keep clientName / clientAddress / dates from the short quotation */
    preserveHeader?: boolean
  },
): QuotationDraftContent {
  const preserveHeader = options?.preserveHeader ?? true

  const sections: QuotationSection[] = short.floors.map((floor, idx) => ({
    id: floor.id,
    name: floor.name || `Floor ${idx + 1}`,
    sortOrder: floor.sortOrder,
  }))

  const areas: QuotationArea[] = short.rooms.map((room, idx) => ({
    id: room.id,
    floorId: room.floorId,
    name: room.name || `Room ${idx + 1}`,
    sortOrder: room.sortOrder,
  }))

  const lineItems: QuotationLineItem[] = short.rooms.flatMap((room) =>
    room.lines.map((line) => {
      const isLs = line.isLumpSum
      const rate = isLs ? 0 : (line.unitPrice ?? 0)
      const quantity = isLs ? 1 : (line.quantitySqft ?? 0)
      const amount = isLs ? (line.total ?? 0) : (line.unitPrice ?? 0) * (line.quantitySqft ?? 0)

      const item: QuotationLineItem = {
        id: line.id,
        sectionId: room.floorId,
        areaId: room.id,
        description: line.name || 'Item',
        materials: '',
        unit: isLs ? 'ls' : 'sqft',
        rate,
        quantity,
        amount,
        included: true,
        isCustom: true,
        ...(line.unitPriceLabel ? { unitPriceLabel: line.unitPriceLabel } : {}),
        ...(line.catalogItemId ? { templateId: line.catalogItemId } : {}),
        ...(line.catalogTemplateKey ? { catalogTemplateKey: line.catalogTemplateKey } : {}),
      }

      return item
    }),
  )

  const base: QuotationDraftContent = {
    version: 1,
    documentType: 'detail',
    templateKey: FLOOR_DETAIL_TEMPLATE_KEY,
    sections,
    areas,
    lineItems,
    discountPercent: short.discountPercent ?? 0,
    discountAmount: short.discountAmount ?? 0,
    taxPercent: 0,
    notes: '',
    terms: '',
    ...(preserveHeader
      ? {
          clientName: short.clientName,
          clientAddress: short.clientAddress,
          subject: short.subject,
          introLetter: short.introLetter,
          quotationDate: short.quotationDate,
        }
      : {}),
  }

  return withDetailQuotationDefaults(base)
}

/** Label for the source package tier shown in UI */
export function shortPackageTierLabel(tier: ShortQuotationPackage): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase()
}
