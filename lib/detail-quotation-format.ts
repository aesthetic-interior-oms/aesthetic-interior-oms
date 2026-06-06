import { todayShortQuotationDate } from '@/lib/short-quotation-calculations'
import type { QuotationDraftContent, QuotationLineItem, QuotationSection } from '@/lib/quotation-types'

export const DEFAULT_DETAIL_INTRO_LETTER = `Dear Sir,
Yours sincerely, I am interested in working on the interior of your Flat. So, the details of my work are described below.`

export const DEFAULT_DETAIL_SUBJECT = 'Quotation for interior decoration work.'
export const DEFAULT_DETAIL_SUMMARY_SUBJECT = 'Quotation Summary for interior decoration work.'

export const DEFAULT_DETAIL_PAYMENT_TERMS = `Mode of Payment
1.60% of the total amount will be given by the client at time of work order given.
2.40% of the total amount will be given by the client when 50 % work will be done.`

export const DEFAULT_DETAIL_DURATION = `Duration Of Work:
1.It will take 2 Months to complete the work. Depends on Payment Schedule, Political Issue & Environment.
2.Day will be counted from the 3 next days after getting the work order.`

export const DEFAULT_DRAWING_DESIGN =
  'Drawing Design: All fabrication work will be implemented by approved drawing design, so client should be approved all drawing & design.'

export const DEFAULT_SIGNATORY_NAME = 'Md Johirul Islam'
export const DEFAULT_SIGNATORY_TITLE = 'Chief Executive Officer'

export type DetailQuotationLayoutMode = 'split-right' | 'split-left' | 'stacked' | 'tabs'

export const DETAIL_QUOTATION_LAYOUT_STORAGE_KEY = 'detail-quotation-layout-mode'

export function withDetailQuotationDefaults(
  content: QuotationDraftContent,
): QuotationDraftContent {
  return {
    ...content,
    quotationDate: content.quotationDate ?? todayShortQuotationDate(),
    subject: content.subject ?? DEFAULT_DETAIL_SUBJECT,
    introLetter: content.introLetter ?? DEFAULT_DETAIL_INTRO_LETTER,
    paymentTerms: content.paymentTerms ?? DEFAULT_DETAIL_PAYMENT_TERMS,
    durationNotes: content.durationNotes ?? DEFAULT_DETAIL_DURATION,
    drawingDesign: content.drawingDesign ?? DEFAULT_DRAWING_DESIGN,
    signatoryName: content.signatoryName ?? DEFAULT_SIGNATORY_NAME,
    signatoryTitle: content.signatoryTitle ?? DEFAULT_SIGNATORY_TITLE,
    summarySubject: content.summarySubject ?? DEFAULT_DETAIL_SUMMARY_SUBJECT,
  }
}

export function formatDetailAmount(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

export function isPackageLine(line: QuotationLineItem) {
  return line.unit === 'ls' || (line.quantity <= 0 && line.amount > 0)
}

export function isRateOnlyLine(line: QuotationLineItem) {
  return line.quantity <= 0 && line.rate > 0 && line.amount <= 0
}

export function formatDetailQtyCell(line: QuotationLineItem) {
  if (isPackageLine(line)) return 'Package As Per Design'
  if (isRateOnlyLine(line)) return '----'
  if (line.quantity <= 0) return '----'
  return formatDetailAmount(line.quantity)
}

export function formatDetailUnitPriceCell(line: QuotationLineItem) {
  if (isPackageLine(line)) {
    if (line.rate > 0) return formatDetailAmount(line.rate)
    if (line.amount > 0) return formatDetailAmount(line.amount)
    return '----'
  }
  if (isRateOnlyLine(line)) return `---- ${formatDetailAmount(line.rate)} ----`
  if (line.rate <= 0) return '----'
  return formatDetailAmount(line.rate)
}

export function formatDetailTotalCell(line: QuotationLineItem) {
  if (isRateOnlyLine(line)) return '----'
  if (isPackageLine(line)) return formatDetailAmount(line.amount)
  return formatDetailAmount(line.amount)
}

export type DetailFloorSummary = {
  floor: QuotationSection
  lines: QuotationLineItem[]
  total: number
}

/** @deprecated use DetailFloorSummary */
export type DetailSectionSummary = DetailFloorSummary

export function buildDetailFloorSummaries(content: QuotationDraftContent): DetailFloorSummary[] {
  const floors = [...content.sections].sort((a, b) => a.sortOrder - b.sortOrder)

  return floors
    .map((floor) => {
      const lines = content.lineItems.filter((line) => line.sectionId === floor.id && line.included)
      const total = Math.round(
        lines.reduce((sum, line) => {
          if (isRateOnlyLine(line)) return sum
          return sum + line.amount
        }, 0),
      )

      return {
        floor,
        lines,
        total,
      }
    })
    .filter((entry) => entry.lines.length > 0)
}

export function buildDetailSectionSummaries(content: QuotationDraftContent): DetailFloorSummary[] {
  return buildDetailFloorSummaries(content)
}
