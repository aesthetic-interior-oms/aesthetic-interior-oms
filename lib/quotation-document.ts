import type { QuotationDraftContent } from '@/lib/quotation-types'
import type { ShortQuotationContent } from '@/lib/short-quotation-types'

export type QuotationDocumentType = 'short' | 'detail'

export type QuotationStoredContent = ShortQuotationContent | QuotationDraftContent

export function isShortQuotationContent(value: unknown): value is ShortQuotationContent {
  if (typeof value !== 'object' || value === null) return false
  return (value as Record<string, unknown>).documentType === 'short'
}

export function isDetailQuotationContent(value: unknown): value is QuotationDraftContent {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (record.documentType === 'short') return false
  return Array.isArray(record.sections) && Array.isArray(record.lineItems)
}

export function resolveQuotationDocumentType(value: unknown): QuotationDocumentType {
  if (isShortQuotationContent(value)) return 'short'
  return 'detail'
}
