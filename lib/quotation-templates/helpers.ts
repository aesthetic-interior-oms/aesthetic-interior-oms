import { withDetailQuotationDefaults } from '@/lib/detail-quotation-format'
import type {
  QuotationDraftContent,
  QuotationFileType,
  QuotationLineItem,
  QuotationPriceMode,
  QuotationTemplateDefinition,
  QuotationTemplateItem,
} from '@/lib/quotation-types'

export function rangeRates(min: number, max: number) {
  const midpoint = Math.round(((min + max) / 2) * 100) / 100
  return {
    priceMode: 'range' as QuotationPriceMode,
    basicRate: min,
    standardRate: midpoint,
    premiumRate: max,
    rateMin: min,
    rateMax: max,
  }
}

export function fixedRates(value: number) {
  return {
    priceMode: 'fixed' as QuotationPriceMode,
    basicRate: value,
    standardRate: value,
    premiumRate: value,
    rateMin: value,
    rateMax: value,
  }
}

/** Item has no price in the source PDF — user must enter manually. */
export function onRequestRates() {
  return {
    priceMode: 'on-request' as QuotationPriceMode,
    basicRate: 0,
    standardRate: 0,
    premiumRate: 0,
    rateMin: undefined,
    rateMax: undefined,
  }
}

export function resolveTemplateRate(
  item: QuotationTemplateItem,
  quotationType: QuotationFileType,
): number {
  if (item.priceMode === 'on-request') return 0
  if (quotationType === 'PREMIUM') return item.premiumRate ?? 0
  if (quotationType === 'BASIC') return item.basicRate ?? 0
  return item.standardRate ?? 0
}

export function createLineItemFromTemplate(
  templateKey: string,
  item: QuotationTemplateItem,
  quotationType: QuotationFileType,
  projectSqft: number | null,
  lineInstanceId?: string,
): QuotationLineItem {
  const rate = resolveTemplateRate(item, quotationType)
  const defaultQty =
    item.unit === 'sqft' && projectSqft ? projectSqft : item.unit === 'ls' ? 1 : 0

  const line: QuotationLineItem = {
    id: lineInstanceId ?? `${templateKey}-${item.id}-${crypto.randomUUID()}`,
    sectionId: item.sectionId,
    templateId: item.id,
    serialNo: item.serialNo,
    description: item.description,
    materials: item.materials,
    unit: item.unit,
    priceOnRequest: item.priceMode === 'on-request',
    rate,
    quantity: defaultQty,
    amount: rate * defaultQty,
    included: true,
    isCustom: false,
  }

  if (item.rateMin !== undefined) line.rateMin = item.rateMin
  if (item.rateMax !== undefined) line.rateMax = item.rateMax

  return line
}

export function buildContentFromTemplate(input: {
  template: QuotationTemplateDefinition
  quotationType: QuotationFileType
  projectSqft?: number | null
}): QuotationDraftContent {
  const projectSqft = input.projectSqft && input.projectSqft > 0 ? input.projectSqft : null

  return withDetailQuotationDefaults({
    version: 1,
    templateKey: input.template.key,
    sections: input.template.sections,
    lineItems: [],
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 0,
    notes: '',
    terms: input.template.defaultTerms,
  })
}

/** Converts old drafts (full catalog with checkboxes) into selected-line format. */
export function prepareQuotationContentForEditing(
  content: QuotationDraftContent,
  template: QuotationTemplateDefinition,
): QuotationDraftContent {
  const catalogIds = new Set(template.items.map((item) => item.id))
  const catalogLines = content.lineItems.filter(
    (line) => line.templateId && catalogIds.has(line.templateId),
  )
  const looksLikeLegacyBulkCatalog =
    catalogLines.length >= Math.max(3, Math.ceil(template.items.length * 0.5))

  if (looksLikeLegacyBulkCatalog) {
    const kept = content.lineItems.filter((line) => line.included || line.isCustom)
    return withDetailQuotationDefaults({
      ...content,
      lineItems: kept.map((line) => ({ ...line, included: true })),
    })
  }

  return withDetailQuotationDefaults({
    ...content,
    lineItems: content.lineItems.map((line) =>
      line.isCustom ? line : { ...line, included: true },
    ),
  })
}

export function addTemplateItemToContent(
  content: QuotationDraftContent,
  template: QuotationTemplateDefinition,
  templateItemId: string,
  quotationType: QuotationFileType,
  projectSqft: number | null,
): QuotationDraftContent | null {
  const item = template.items.find((entry) => entry.id === templateItemId)
  if (!item) return null

  const line = createLineItemFromTemplate(
    template.key,
    item,
    quotationType,
    projectSqft,
  )

  return {
    ...content,
    lineItems: [...content.lineItems, line],
  }
}

export function applyQuotationTypeToTemplateContent(
  content: QuotationDraftContent,
  template: QuotationTemplateDefinition,
  quotationType: QuotationFileType,
): QuotationDraftContent {
  const templateById = new Map(template.items.map((item) => [item.id, item]))

  return {
    ...content,
    lineItems: content.lineItems.map((line) => {
      if (line.isCustom || !line.templateId) return line
      const item = templateById.get(line.templateId)
      if (!item) return line

      // Only apply the template rate if the user has NOT manually set a price yet.
      // A non-zero rate means the user intentionally entered it — preserve it.
      const templateRate = resolveTemplateRate(item, quotationType)
      const rate = line.rate > 0 ? line.rate : templateRate
      const next: QuotationLineItem = {
        ...line,
        priceOnRequest: item.priceMode === 'on-request',
        rate,
        amount: line.unit === 'ls' ? line.amount : rate * line.quantity,
      }
      if (item.rateMin !== undefined) next.rateMin = item.rateMin
      else delete next.rateMin
      if (item.rateMax !== undefined) next.rateMax = item.rateMax
      else delete next.rateMax
      return next
    }),
  }
}

export function formatTemplatePriceHint(item: QuotationTemplateItem | QuotationLineItem): string {
  if ('priceMode' in item && item.priceMode === 'on-request') return 'Price not in PDF'
  if ('priceOnRequest' in item && item.priceOnRequest && (!('rate' in item) || item.rate <= 0)) {
    return 'Enter price manually'
  }

  const min = item.rateMin
  const max = item.rateMax
  if (min !== undefined && max !== undefined && min !== max) return `${min}–${max}`
  if (min !== undefined && max !== undefined) return String(min)
  if ('rate' in item && item.rate > 0) return String(item.rate)
  return 'Enter price'
}
