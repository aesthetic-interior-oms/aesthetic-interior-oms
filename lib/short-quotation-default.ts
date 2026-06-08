import { todayShortQuotationDate } from '@/lib/short-quotation-calculations'
import type { ShortQuotationContent, ShortQuotationPackage } from '@/lib/short-quotation-types'

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
    subject: '',
    introLetter: '',
    floors: [{ id: floorId, name: '', sortOrder: 1 }],
    rooms: [{ id: crypto.randomUUID(), floorId, name: '', sortOrder: 1, lines: [] }],
    footerNotes: [],
  }
}
