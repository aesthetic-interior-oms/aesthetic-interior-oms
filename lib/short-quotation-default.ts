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
    subject: 'Quotation for interior decoration work',
    introLetter: `Dear Sir,
Yours sincerely, I am interested in working on the interior of your Flat. So, the details of my work are described below.`,
    floors: [{ id: floorId, name: '', sortOrder: 1 }],
    rooms: [{ id: crypto.randomUUID(), floorId, name: '', sortOrder: 1, lines: [] }],
    footerNotes: [],
  }
}
