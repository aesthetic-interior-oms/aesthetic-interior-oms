import { withDetailQuotationDefaults } from '@/lib/detail-quotation-format'
import {
  createLineItemFromTemplate,
  resolveTemplateRate,
} from '@/lib/quotation-templates/helpers'
import { getQuotationTemplate, listQuotationTemplates, QUOTATION_TEMPLATES } from '@/lib/quotation-templates'
import type {
  QuotationDraftContent,
  QuotationFileType,
  QuotationArea,
  QuotationLineItem,
  QuotationSection,
  QuotationTemplateItem,
} from '@/lib/quotation-types'

export const FLOOR_DETAIL_TEMPLATE_KEY = 'floor-based'

export function buildDefaultFloorDetailContent(input?: {
  quotationType?: QuotationFileType
}): QuotationDraftContent {
  const template = getQuotationTemplate('ceiling-curtain')
  return withDetailQuotationDefaults({
    version: 1,
    documentType: 'detail',
    templateKey: FLOOR_DETAIL_TEMPLATE_KEY,
    sections: [],
    areas: [],
    lineItems: [],
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 0,
    notes: '',
    terms: template.defaultTerms,
    summarySubject: 'Quotation Summary for interior decoration work.',
  })
}

export function addFloorToContent(content: QuotationDraftContent, name = ''): QuotationDraftContent {
  const floor: QuotationSection = {
    id: crypto.randomUUID(),
    name,
    sortOrder: content.sections.length + 1,
  }
  return {
    ...content,
    sections: [...content.sections, floor],
    areas: [...(content.areas ?? []), { id: crypto.randomUUID(), floorId: floor.id, name: 'General Area', sortOrder: 1 }],
  }
}

export function updateFloorName(
  content: QuotationDraftContent,
  floorId: string,
  name: string,
): QuotationDraftContent {
  return {
    ...content,
    sections: content.sections.map((floor) => (floor.id === floorId ? { ...floor, name } : floor)),
  }
}

export function removeFloorFromContent(
  content: QuotationDraftContent,
  floorId: string,
): QuotationDraftContent {
  return {
    ...content,
    sections: content.sections.filter((floor) => floor.id !== floorId),
    areas: (content.areas ?? []).filter((area) => area.floorId !== floorId),
    lineItems: content.lineItems.filter((line) => line.sectionId !== floorId),
  }
}

export function addAreaToFloor(content: QuotationDraftContent, floorId: string, name = ''): QuotationDraftContent {
  const floorAreas = (content.areas ?? []).filter((area) => area.floorId === floorId)
  const area: QuotationArea = {
    id: crypto.randomUUID(),
    floorId,
    name,
    sortOrder: floorAreas.length + 1,
  }
  return { ...content, areas: [...(content.areas ?? []), area] }
}

export function updateAreaName(content: QuotationDraftContent, areaId: string, name: string): QuotationDraftContent {
  return {
    ...content,
    areas: (content.areas ?? []).map((area) => (area.id === areaId ? { ...area, name } : area)),
  }
}

export function removeAreaFromContent(content: QuotationDraftContent, areaId: string): QuotationDraftContent {
  return {
    ...content,
    areas: (content.areas ?? []).filter((area) => area.id !== areaId),
    lineItems: content.lineItems.filter((line) => line.areaId !== areaId),
  }
}

export function findCatalogItem(catalogTemplateKey: string, itemId: string, fullTemplates?: any[]) {
  const template = fullTemplates?.find(t => t.key === catalogTemplateKey) || getQuotationTemplate(catalogTemplateKey)
  return template.items.find((item: any) => item.id === itemId) ?? null
}

export function findCatalogItemAcrossTemplates(itemId: string, fullTemplates?: any[]) {
  const templates = fullTemplates?.length ? fullTemplates : listQuotationTemplates().map((t: any) => getQuotationTemplate(t.key))
  for (const template of templates) {
    const item = template.items.find((item: any) => item.id === itemId)
    if (item) return { template, item }
  }
  return null
}

export function addCatalogItemToFloor(
  content: QuotationDraftContent,
  floorId: string,
  catalogTemplateKey: string,
  templateItemId: string,
  quotationType: QuotationFileType,
  projectSqft: number | null,
  areaId?: string,
  fullTemplates?: any[],
): QuotationDraftContent | null {
  const item = findCatalogItem(catalogTemplateKey, templateItemId, fullTemplates)
  if (!item) return null

  const line = createLineItemFromTemplate(
    catalogTemplateKey,
    item,
    quotationType,
    projectSqft,
  )
  line.sectionId = floorId
  if (areaId) line.areaId = areaId
  line.catalogTemplateKey = catalogTemplateKey

  return {
    ...content,
    lineItems: [...content.lineItems, line],
  }
}

export function applyQuotationTypeToFloorContent(
  content: QuotationDraftContent,
  quotationType: QuotationFileType,
): QuotationDraftContent {
  return {
    ...content,
    lineItems: content.lineItems.map((line) => {
      if (line.isCustom || !line.templateId) return line

      const catalogKey = line.catalogTemplateKey ?? content.templateKey
      const item = findCatalogItem(catalogKey, line.templateId)
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

export function isFloorBasedDetailContent(content: QuotationDraftContent) {
  return content.templateKey === FLOOR_DETAIL_TEMPLATE_KEY || content.sections.length === 0
}

export const FINISHING_ELECTRICAL_SECTION_ID = 'finishing-electrical-works-section'

export function ensureFinishingElectricalSection(content: QuotationDraftContent): {
  content: QuotationDraftContent
  section: QuotationSection
} {
  const existing = content.sections.find(
    (s) => s.sectionType === 'FINISHING_ELECTRICAL' || s.id === FINISHING_ELECTRICAL_SECTION_ID || s.name === 'Finishing & Electrical Works',
  )
  if (existing) {
    return { content, section: existing }
  }

  const section: QuotationSection = {
    id: FINISHING_ELECTRICAL_SECTION_ID,
    name: 'Finishing & Electrical Works',
    sortOrder: 9999,
    sectionType: 'FINISHING_ELECTRICAL',
  }

  return {
    content: {
      ...content,
      sections: [...content.sections, section],
    },
    section,
  }
}

export function addFinishingElectricalWorkItem(
  content: QuotationDraftContent,
  itemData?: Partial<QuotationLineItem>,
): QuotationDraftContent {
  const { content: updatedContent, section } = ensureFinishingElectricalSection(content)

  const line: QuotationLineItem = {
    id: crypto.randomUUID(),
    sectionId: section.id,
    description: itemData?.description ?? 'Finishing & Electrical Work Item',
    materials: itemData?.materials ?? '',
    unit: itemData?.unit ?? 'sqft',
    rate: itemData?.rate ?? 0,
    quantity: itemData?.quantity ?? 1,
    amount: itemData?.amount ?? ((itemData?.rate ?? 0) * (itemData?.quantity ?? 1)),
    included: true,
    isCustom: true,
    isFinishingElectrical: true,
  }

  return {
    ...updatedContent,
    lineItems: [...updatedContent.lineItems, line],
  }
}

