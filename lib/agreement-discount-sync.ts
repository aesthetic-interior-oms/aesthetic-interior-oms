import { calculateQuotationTotals, normalizeQuotationContent } from '@/lib/quotation-calculations'
import { buildShortQuotationSummary, normalizeShortQuotationContent } from '@/lib/short-quotation-calculations'
import { isShortQuotationContent } from '@/lib/quotation-document'
import type { QuotationDraftContent } from '@/lib/quotation-types'
import type { ShortQuotationContent } from '@/lib/short-quotation-types'

export type ProcessAgreementParams = {
  tx: any
  leadId: string
  actorUserId: string
  selectedDraftId?: string | null
  selectedDraftKey?: string | null
  slotIndex?: number | null
  agreementValueInput?: number | null
  discountType?: 'FIXED' | 'PERCENTAGE'
  discountAmountInput?: number | null
  discountPercentInput?: number | null
}

export type ProcessAgreementResult = {
  settledAgreementValue: number | null
  quotationGrandTotal: number | null
  discountApplied: number
  quotationUpdated: boolean
  targetDraftKey: string | null
  versionTitle: string | null
}

export async function processAgreementAndDiscountSync({
  tx,
  leadId,
  actorUserId,
  selectedDraftId,
  selectedDraftKey,
  slotIndex,
  agreementValueInput,
  discountType = 'FIXED',
  discountAmountInput,
  discountPercentInput,
}: ProcessAgreementParams): Promise<ProcessAgreementResult> {
  // 1. Locate the target QuotationDraft
  let targetDraft: any = null

  if (selectedDraftId) {
    targetDraft = await tx.quotationDraft.findFirst({
      where: { id: selectedDraftId, leadId },
    })
  }

  if (!targetDraft && (slotIndex || selectedDraftKey)) {
    const baseKey = slotIndex
      ? slotIndex === 1
        ? 'detail'
        : `detail:slot:${slotIndex}`
      : selectedDraftKey!

    targetDraft = await tx.quotationDraft.findFirst({
      where: {
        leadId,
        OR: [
          { draftKey: baseKey },
          { draftKey: `${baseKey}:owner:${actorUserId}` },
          { draftKey: { startsWith: `${baseKey}:owner:` } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  if (!targetDraft) {
    targetDraft = await tx.quotationDraft.findFirst({
      where: { leadId },
      orderBy: { updatedAt: 'desc' },
    })
  }

  let settledAgreementValue: number | null =
    agreementValueInput !== undefined && agreementValueInput !== null && !isNaN(agreementValueInput)
      ? agreementValueInput
      : null
  let quotationGrandTotal: number | null = targetDraft?.grandTotal ?? null
  let quotationUpdated = false
  let versionTitle: string | null = null

  if (targetDraft) {
    const rawContent = targetDraft.content as any
    const isShort = isShortQuotationContent(rawContent)

    if (typeof rawContent?.versionTitle === 'string' && rawContent.versionTitle.trim()) {
      versionTitle = rawContent.versionTitle.trim()
    } else if (slotIndex) {
      versionTitle = `Version ${slotIndex}`
    }

    // Compute pre-discount subtotal
    let subTotal = 0
    if (isShort) {
      const shortContent = normalizeShortQuotationContent(rawContent as ShortQuotationContent)
      // Remove existing discount to find pre-discount subtotal
      const tempContent = { ...shortContent, discountAmount: 0 }
      subTotal = buildShortQuotationSummary(tempContent).grandTotal
    } else {
      const detailContent = normalizeQuotationContent(rawContent as QuotationDraftContent)
      const tempContent = { ...detailContent, discountAmount: 0, discountPercent: 0 }
      subTotal = calculateQuotationTotals(tempContent).subtotal
    }

    // Determine discount amount
    let calculatedDiscountAmount = 0
    let calculatedDiscountPercent = 0

    if (discountType === 'PERCENTAGE' && discountPercentInput && discountPercentInput > 0) {
      calculatedDiscountPercent = discountPercentInput
      calculatedDiscountAmount = Math.round((subTotal * discountPercentInput) / 100)
    } else if (discountAmountInput && !isNaN(discountAmountInput) && discountAmountInput > 0) {
      calculatedDiscountAmount = discountAmountInput
      calculatedDiscountPercent = subTotal > 0 ? Number(((discountAmountInput / subTotal) * 100).toFixed(2)) : 0
    } else if (settledAgreementValue !== null && settledAgreementValue < subTotal) {
      calculatedDiscountAmount = Math.max(0, subTotal - settledAgreementValue)
      calculatedDiscountPercent = subTotal > 0 ? Number(((calculatedDiscountAmount / subTotal) * 100).toFixed(2)) : 0
    }

    // Default settled agreement value to quotation subtotal - discount if not explicitly set
    if (settledAgreementValue === null) {
      settledAgreementValue = Math.max(0, subTotal - calculatedDiscountAmount)
    }

    // Update QuotationDraft if discount is applied or if custom agreement value was provided
    if (calculatedDiscountAmount > 0 || (settledAgreementValue !== null && settledAgreementValue !== targetDraft.grandTotal)) {
      const finalDiscount = calculatedDiscountAmount > 0 ? calculatedDiscountAmount : Math.max(0, subTotal - (settledAgreementValue ?? subTotal))

      if (isShort) {
        const shortContent = normalizeShortQuotationContent(rawContent as ShortQuotationContent)
        const updatedContent: ShortQuotationContent = {
          ...shortContent,
          discountAmount: finalDiscount,
        }
        const summary = buildShortQuotationSummary(updatedContent)
        const newGrandTotal = summary.grandTotal

        await tx.quotationDraft.update({
          where: { id: targetDraft.id },
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
          discountAmount: finalDiscount,
          discountPercent: calculatedDiscountPercent || detailContent.discountPercent || 0,
        }
        const totals = calculateQuotationTotals(updatedContent)
        const newGrandTotal = totals.grandTotal

        await tx.quotationDraft.update({
          where: { id: targetDraft.id },
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

      await tx.activityLog.create({
        data: {
          leadId,
          userId: actorUserId,
          type: 'NOTE',
          description: `Discount of ৳ ${finalDiscount.toLocaleString()} (${calculatedDiscountPercent > 0 ? `${calculatedDiscountPercent}%` : 'fixed'}) applied to ${versionTitle || 'Quotation'}. Agreement value settled at ৳ ${settledAgreementValue?.toLocaleString()}.`,
        },
      })
    }
  }

  return {
    settledAgreementValue,
    quotationGrandTotal,
    discountApplied: discountAmountInput || 0,
    quotationUpdated,
    targetDraftKey: targetDraft?.draftKey ?? null,
    versionTitle,
  }
}
