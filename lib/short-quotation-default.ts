import { todayShortQuotationDate } from '@/lib/short-quotation-calculations'
import type { ShortQuotationContent, ShortQuotationPackage } from '@/lib/short-quotation-types'

export const DEFAULT_SHORT_INTRO_LETTER = `Dear sir ,
We are genuinely delighted to have the opportunity to work on the interior design of your residence and look forward to transforming your vision into a Aesthetic and thoughtfully designed space.
We have prepared and submitted a separate estimated costing for each room of your residence, allowing you to clearly understand the proposed budget and scope of work for each individual space.`

export const DEFAULT_SHORT_TERMS = `Quotation Validity: This tentative quotation shall remain valid for 30 (thirty) days from the date of issuance.
Project-Specific Pricing: The prices quoted herein are specific to this project only and may not be applicable to any other project or location.
VAT & TAX: All prices mentioned in this quotation are exclusive of applicable VAT, TAX, and any other statutory charges, which shall be borne by the client as applicable.
Tentative Costing & Design Revision: This quotation is tentative and subject to revision. Upon completion and approval of the 3D design, the final costing will be prepared based on the approved design, specifications, quantities, and selected materials. Accordingly, the materials, specifications, and associated costs may be revised to reflect the final approved design.`

export const DEFAULT_SHORT_FOOTER_NOTES = [
  '1. Total electrical wiring and lighting bill will be submitted after 3D design.',
  '2. Complete wall paint bill including measurements of the area to be painted will be submitted at the time of project handover.',
  '3. Any work beyond the quotation we submit will be billed as additional work.',
]

export function buildDefaultShortQuotationContent(input: {
  clientName: string
  clientAddress: string | null
  packageTier?: ShortQuotationPackage
}): ShortQuotationContent {
  const floorId = crypto.randomUUID()

  return {
    version: 1,
    documentType: 'short',
    packageTier: input.packageTier ?? 'PREMIUM',
    quotationDate: todayShortQuotationDate(),
    clientName: input.clientName,
    clientAddress: input.clientAddress ?? '',
    subject: 'Quotation for interior decoration work',
    introLetter: DEFAULT_SHORT_INTRO_LETTER,
    terms: DEFAULT_SHORT_TERMS,
    floors: [{ id: floorId, name: '', sortOrder: 1 }],
    rooms: [{ id: crypto.randomUUID(), floorId, name: '', sortOrder: 1, lines: [] }],
    footerNotes: [...DEFAULT_SHORT_FOOTER_NOTES],
  }
}
