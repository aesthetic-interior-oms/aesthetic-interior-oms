import { applyQuotationTypeToFloorContent, buildDefaultFloorDetailContent } from '@/lib/floor-detail-quotation'
import type { QuotationDraftContent, QuotationFileType } from '@/lib/quotation-types'
import { CEILING_CURTAIN_TEMPLATE } from '@/lib/quotation-templates/ceiling-curtain'
import { FOLDING_SLIDING_DOOR_TEMPLATE } from '@/lib/quotation-templates/folding-sliding-door'
import { TV_UNIT_TEMPLATE } from '@/lib/quotation-templates/tv-unit'
import {
  applyQuotationTypeToTemplateContent,
  buildContentFromTemplate,
} from '@/lib/quotation-templates/helpers'

export const QUOTATION_TEMPLATES = [
  CEILING_CURTAIN_TEMPLATE,
  TV_UNIT_TEMPLATE,
  FOLDING_SLIDING_DOOR_TEMPLATE,
] as const

export const DEFAULT_QUOTATION_TEMPLATE_KEY = CEILING_CURTAIN_TEMPLATE.key

const templateByKey = new Map(QUOTATION_TEMPLATES.map((template) => [template.key, template]))

export function getQuotationTemplate(key?: string | null) {
  if (!key) return CEILING_CURTAIN_TEMPLATE
  return templateByKey.get(key) ?? CEILING_CURTAIN_TEMPLATE
}

export function listQuotationTemplates() {
  return QUOTATION_TEMPLATES.map((template) => ({
    key: template.key,
    name: template.name,
    sourceDocument: template.sourceDocument,
    sectionCount: template.sections.length,
    itemCount: template.items.length,
  }))
}

export function buildDefaultQuotationContent(input?: {
  templateKey?: string | null
  quotationType?: QuotationFileType
  projectSqft?: number | null
}): QuotationDraftContent {
  return buildDefaultFloorDetailContent({
    quotationType: input?.quotationType ?? 'STANDARD',
  })
}

export function applyQuotationTypeToContent(
  content: QuotationDraftContent,
  quotationType: QuotationFileType,
): QuotationDraftContent {
  if (content.templateKey === 'floor-based') {
    return applyQuotationTypeToFloorContent(content, quotationType)
  }
  const template = getQuotationTemplate(content.templateKey)
  return applyQuotationTypeToTemplateContent(content, template, quotationType)
}

export function getQuotationTemplatesResponse() {
  return {
    templates: listQuotationTemplates(),
    quotationTypes: ['PREMIUM', 'STANDARD', 'BASIC', 'MIXED'] as QuotationFileType[],
    quotationTypeLabels: {
      PREMIUM: 'High (max rate from PDF)',
      STANDARD: 'Mid (average rate)',
      BASIC: 'Low (min rate from PDF)',
      MIXED: 'Mixed (manual per item)',
    },
    units: ['sqft', 'nos', 'ls', 'rmt', 'rft'] as const,
  }
}

export function getQuotationTemplateDetail(key: string) {
  const template = getQuotationTemplate(key)
  return {
    key: template.key,
    name: template.name,
    sourceDocument: template.sourceDocument,
    sections: template.sections,
    items: template.items,
  }
}

// Backward-compatible re-exports
export { CEILING_CURTAIN_TEMPLATE, TV_UNIT_TEMPLATE, FOLDING_SLIDING_DOOR_TEMPLATE }
