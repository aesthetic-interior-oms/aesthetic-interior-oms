import { applyQuotationTypeToFloorContent, buildDefaultFloorDetailContent } from '@/lib/floor-detail-quotation'
import type { QuotationDraftContent, QuotationFileType } from '@/lib/quotation-types'
import { BASIN_CABINET_SHOWER_TEMPLATE } from '@/lib/quotation-templates/basin-cabinet-shower'
import { CEILING_CURTAIN_TEMPLATE } from '@/lib/quotation-templates/ceiling-curtain'
import { CLOSET_TEMPLATE } from '@/lib/quotation-templates/closet'
import { DINNER_WAGON_TEMPLATE } from '@/lib/quotation-templates/dinner-wagon'
import { DRESSING_TEMPLATE } from '@/lib/quotation-templates/dressing'
import { FOLDING_SLIDING_DOOR_TEMPLATE } from '@/lib/quotation-templates/folding-sliding-door'
import { KITCHEN_CABINET_TEMPLATE } from '@/lib/quotation-templates/kitchen-cabinet'
import { SHOE_CABINET_TEMPLATE } from '@/lib/quotation-templates/shoe-cabinet'
import { STUDY_TABLE_TEMPLATE } from '@/lib/quotation-templates/study-table'
import { TV_UNIT_TEMPLATE } from '@/lib/quotation-templates/tv-unit'
import { WALL_PANELING_TEMPLATE } from '@/lib/quotation-templates/wall-paneling'
import { applyQuotationTypeToTemplateContent } from '@/lib/quotation-templates/helpers'

export const QUOTATION_TEMPLATES = [
  CEILING_CURTAIN_TEMPLATE,
  TV_UNIT_TEMPLATE,
  FOLDING_SLIDING_DOOR_TEMPLATE,
  WALL_PANELING_TEMPLATE,
  SHOE_CABINET_TEMPLATE,
  DINNER_WAGON_TEMPLATE,
  BASIN_CABINET_SHOWER_TEMPLATE,
  KITCHEN_CABINET_TEMPLATE,
  CLOSET_TEMPLATE,
  DRESSING_TEMPLATE,
  STUDY_TABLE_TEMPLATE,
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
export {
  CEILING_CURTAIN_TEMPLATE,
  TV_UNIT_TEMPLATE,
  FOLDING_SLIDING_DOOR_TEMPLATE,
  WALL_PANELING_TEMPLATE,
  SHOE_CABINET_TEMPLATE,
  DINNER_WAGON_TEMPLATE,
  BASIN_CABINET_SHOWER_TEMPLATE,
  KITCHEN_CABINET_TEMPLATE,
  CLOSET_TEMPLATE,
  DRESSING_TEMPLATE,
  STUDY_TABLE_TEMPLATE,
}
