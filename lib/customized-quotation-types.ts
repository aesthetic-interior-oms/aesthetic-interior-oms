export type CustomizedQuotationUnit = 'sqft' | 'nos' | 'ls' | 'rmt' | 'rft'

export type CustomizedQuotationSection = {
  id: string
  name: string
  sortOrder: number
}

export type CustomizedQuotationArea = {
  id: string
  floorId: string
  name: string
  sortOrder: number
}

export type CustomizedQuotationLineItem = {
  id: string
  sectionId: string
  areaId?: string
  serialNo?: number
  description: string
  materials?: string
  unit: CustomizedQuotationUnit
  rate: number
  quantity: number
  amount: number
  included: boolean
  unitPriceLabel?: string
  notes?: string
}

export type CustomizedQuotationContent = {
  version: 1
  documentType: 'customized'
  title: string
  quotationDate: string
  quotationCode?: string
  downloadedAt?: string
  clientName: string
  clientAddress: string
  subject: string
  introLetter: string
  notes: string
  terms: string
  paymentTerms: string
  durationNotes: string
  drawingDesign: string
  signatoryName: string
  signatoryTitle: string
  projectSqft: number | null
  sections: CustomizedQuotationSection[]
  areas: CustomizedQuotationArea[]
  lineItems: CustomizedQuotationLineItem[]
}

export type CustomizedQuotationTotals = {
  subtotal: number
  grandTotal: number
  totalSqft: number
  totalNos: number
  itemCount: number
}

export const DEFAULT_CUSTOMIZED_TITLE = 'Customized Quotation'

export const DEFAULT_CUSTOMIZED_INTRO = `Dear Sir,
We are pleased to submit our customized quotation for the proposed interior and fit-out work. Below is the detailed breakdown itemized by area and scope of work.`

export const DEFAULT_CUSTOMIZED_PAYMENT_TERMS = `Mode of Payment:
1. 60% advance payment upon signing the work order.
2. 40% payment when 50% work is completed on site.`

export const DEFAULT_CUSTOMIZED_DURATION = `Duration Of Work:
1. Work will proceed according to the agreed schedule and payment milestones.
2. Timeline commences upon site handover and receipt of initial advance.`

export const DEFAULT_CUSTOMIZED_TERMS = `Terms & Conditions:
1. All materials will be supplied as per agreed specifications.
2. Any additional work or variation requested by the client will be billed separately.
3. Rates are valid for 30 days from the quotation date.`

export function buildDefaultCustomizedQuotationContent(input?: {
  title?: string
  clientName?: string
  clientAddress?: string
  projectSqft?: number | null
}): CustomizedQuotationContent {
  const sectionId = 'sec-1'
  const areaId = 'area-1'

  return {
    version: 1,
    documentType: 'customized',
    title: input?.title?.trim() || DEFAULT_CUSTOMIZED_TITLE,
    quotationDate: new Date().toISOString().slice(0, 10),
    clientName: input?.clientName ?? '',
    clientAddress: input?.clientAddress ?? '',
    subject: `${input?.title?.trim() || DEFAULT_CUSTOMIZED_TITLE} for interior work`,
    introLetter: DEFAULT_CUSTOMIZED_INTRO,
    notes: '',
    terms: DEFAULT_CUSTOMIZED_TERMS,
    paymentTerms: DEFAULT_CUSTOMIZED_PAYMENT_TERMS,
    durationNotes: DEFAULT_CUSTOMIZED_DURATION,
    drawingDesign: 'All work will be executed strictly in accordance with approved drawing designs.',
    signatoryName: 'Md Johirul Islam',
    signatoryTitle: 'Chief Executive Officer',
    projectSqft: input?.projectSqft ?? null,
    sections: [
      {
        id: sectionId,
        name: 'General Scope',
        sortOrder: 1,
      },
    ],
    areas: [
      {
        id: areaId,
        floorId: sectionId,
        name: 'Main Area',
        sortOrder: 1,
      },
    ],
    lineItems: [
      {
        id: 'line-1',
        sectionId,
        areaId,
        serialNo: 1,
        description: 'Sample Customized Work',
        materials: 'Specification and materials details',
        unit: 'sqft',
        rate: 0,
        quantity: input?.projectSqft ?? 1,
        amount: 0,
        included: true,
      },
    ],
  }
}

export function calculateCustomizedQuotationTotals(content: CustomizedQuotationContent): CustomizedQuotationTotals {
  const activeItems = (content.lineItems ?? []).filter((line) => line.included !== false)

  let subtotal = 0
  let totalSqft = 0
  let totalNos = 0

  for (const item of activeItems) {
    subtotal += Number(item.amount) || 0
    if (item.unit === 'sqft' && Number(item.quantity) > 0) {
      totalSqft += Number(item.quantity)
    } else if (item.unit === 'nos' && Number(item.quantity) > 0) {
      totalNos += Number(item.quantity)
    }
  }

  return {
    subtotal: Math.round(subtotal),
    grandTotal: Math.round(subtotal),
    totalSqft: Math.round(totalSqft),
    totalNos: Math.round(totalNos),
    itemCount: activeItems.length,
  }
}

export function formatCustomizedQty(quantity: number, unit: CustomizedQuotationUnit): string {
  if (quantity <= 0) return '—'
  const formattedNum = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(quantity)
  if (unit === 'nos') return `${formattedNum} Nos`
  if (unit === 'sqft') return `${formattedNum} Sft`
  if (unit === 'ls') return '1 Ls'
  return `${formattedNum} ${unit}`
}
