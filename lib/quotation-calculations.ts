import type { QuotationDraftContent, QuotationLineItem, QuotationTotals } from '@/lib/quotation-types'

export function calculateLineAmount(rate: number, quantity: number): number {
  const safeRate = Number.isFinite(rate) ? rate : 0
  const safeQty = Number.isFinite(quantity) ? quantity : 0
  return Math.round(safeRate * safeQty * 100) / 100
}

export function normalizeLineItem(line: QuotationLineItem): QuotationLineItem {
  const rate = Number.isFinite(line.rate) ? Math.max(0, line.rate) : 0
  const quantity = Number.isFinite(line.quantity) ? Math.max(0, line.quantity) : 0
  // For package lines (unit 'ls', or zero qty with a fixed amount), preserve the manually set amount
  const isPackage = line.unit === 'ls' || (quantity <= 0 && line.amount > 0)
  const amount = isPackage
    ? (Number.isFinite(line.amount) ? Math.max(0, line.amount) : 0)
    : calculateLineAmount(rate, quantity)
  return {
    ...line,
    rate,
    quantity,
    amount,
  }
}

export function normalizeQuotationContent(content: QuotationDraftContent): QuotationDraftContent {
  const lineItems = content.lineItems.map(normalizeLineItem)
  const totals = calculateQuotationTotals({
    ...content,
    lineItems,
  })

  return {
    ...content,
    lineItems,
    discountAmount: totals.discountAmount,
  }
}

export function calculateQuotationTotals(content: QuotationDraftContent): QuotationTotals {
  const includedItems = content.lineItems.filter((line) => line.included)
  const subtotal = includedItems.reduce((sum, line) => sum + line.amount, 0)

  const discountPercent = Number.isFinite(content.discountPercent)
    ? Math.min(100, Math.max(0, content.discountPercent))
    : 0
  const discountFromPercent = Math.round(subtotal * (discountPercent / 100) * 100) / 100
  const manualDiscount = Number.isFinite(content.discountAmount)
    ? Math.max(0, content.discountAmount)
    : 0
  const discountAmount = Math.min(subtotal, Math.max(discountFromPercent, manualDiscount))

  const taxableAmount = Math.max(0, subtotal - discountAmount)
  const taxPercent = Number.isFinite(content.taxPercent) ? Math.max(0, content.taxPercent) : 0
  const taxAmount = Math.round(taxableAmount * (taxPercent / 100) * 100) / 100
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100

  const itemsMissingPrice = includedItems.filter((line) => line.rate <= 0).length

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    taxAmount,
    grandTotal,
    includedItemCount: includedItems.length,
    itemsMissingPrice,
  }
}
