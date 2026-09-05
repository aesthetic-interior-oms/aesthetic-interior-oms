import { calculateQuotationTotals, normalizeQuotationContent } from '@/lib/quotation-calculations'
import { buildShortQuotationSummary, normalizeShortQuotationContent } from '@/lib/short-quotation-calculations'
import { isShortQuotationContent } from '@/lib/quotation-document'
import type { QuotationDraftContent } from '@/lib/quotation-types'
import type { ShortQuotationContent } from '@/lib/short-quotation-types'

export type ProcessAgreementParams = {
  tx: any
  leadId: string
  actorUserId: string
  agreementValueInput?: number | null
  discountAmountInput?: number | null
}

export type ProcessAgreementResult = {
  settledAgreementValue: number | null
  quotationGrandTotal: number | null
  discountApplied: number
  quotationUpdated: boolean
}

export async function processAgreementAndDiscountSync({
  tx,
  leadId,
  actorUserId,
  agreementValueInput,
  discountAmountInput,
}: ProcessAgreementParams): Promise<ProcessAgreementResult> {
  const activeDraft = await tx.quotationDraft.findFirst({
    where: { leadId },
    orderBy: { updatedAt: 'desc' },
  })

  const discountAmount =
    discountAmountInput && !isNaN(discountAmountInput) && discountAmountInput > 0
      ? discountAmountInput
      : 0
  let settledAgreementValue: number | null =
    agreementValueInput !== undefined && agreementValueInput !== null && !isNaN(agreementValueInput)
      ? agreementValueInput
      : null
  let quotationGrandTotal: number | null = activeDraft?.grandTotal ?? null
  let quotationUpdated = false

  if (activeDraft) {
    // 1. Default agreementValue to quotation grand total if not explicitly provided
    if (settledAgreementValue === null) {
      settledAgreementValue = activeDraft.grandTotal
    }

    // 2. If discount amount is specified, apply discount to quotation content and recalculate
    if (discountAmount > 0) {
      const rawContent = activeDraft.content as any
      const isShort = isShortQuotationContent(rawContent)

      if (isShort) {
        const shortContent = normalizeShortQuotationContent(rawContent as ShortQuotationContent)
        const updatedContent: ShortQuotationContent = {
          ...shortContent,
          discountAmount: (shortContent.discountAmount || 0) + discountAmount,
        }
        const summary = buildShortQuotationSummary(updatedContent)
        const newGrandTotal = summary.grandTotal

        await tx.quotationDraft.update({
          where: { id: activeDraft.id },
          data: {
            content: updatedContent as any,
            grandTotal: newGrandTotal,
            updatedById: actorUserId,
          },
        })
        quotationGrandTotal = newGrandTotal
        settledAgreementValue = newGrandTotal
        quotationUpdated = true
      } else {
        const detailContent = normalizeQuotationContent(rawContent as QuotationDraftContent)
        const updatedContent: QuotationDraftContent = {
          ...detailContent,
          discountAmount: (detailContent.discountAmount || 0) + discountAmount,
        }
        const totals = calculateQuotationTotals(updatedContent)
        const newGrandTotal = totals.grandTotal

        await tx.quotationDraft.update({
          where: { id: activeDraft.id },
          data: {
            content: updatedContent as any,
            grandTotal: newGrandTotal,
            updatedById: actorUserId,
          },
        })
        quotationGrandTotal = newGrandTotal
        settledAgreementValue = newGrandTotal
        quotationUpdated = true
      }

      // Log discount and agreement settlement in activity log
      await tx.activityLog.create({
        data: {
          leadId,
          userId: actorUserId,
          type: 'NOTE',
          description: `Discount of ৳ ${discountAmount.toLocaleString()} applied to quotation. Agreement value settled at ৳ ${settledAgreementValue?.toLocaleString()}.`,
        },
      })
    }
  }

  return {
    settledAgreementValue,
    quotationGrandTotal,
    discountApplied: discountAmount,
    quotationUpdated,
  }
}
