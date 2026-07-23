export type QuotationUnit = 'sqft' | 'nos' | 'ls' | 'rmt' | 'rft'

export type QuotationFileType = 'PREMIUM' | 'STANDARD' | 'BASIC' | 'MIXED'

export type QuotationPriceMode = 'fixed' | 'range' | 'on-request'

export type QuotationSection = {
  id: string
  name: string
  sortOrder: number
}

export type QuotationLineItem = {
  id: string
  sectionId: string
  catalogTemplateKey?: string
  templateId?: string
  serialNo?: number
  description: string
  materials?: string
  unit: QuotationUnit
  priceOnRequest?: boolean
  rate: number
  rateMin?: number
  rateMax?: number
  quantity: number
  amount: number
  included: boolean
  isCustom: boolean
  notes?: string
}

export type QuotationDraftContent = {
  version: 1
  documentType?: 'detail'
  templateKey: string
  sections: QuotationSection[]
  lineItems: QuotationLineItem[]
  discountPercent: number
  discountAmount: number
  taxPercent: number
  notes: string
  terms: string
  quotationDate?: string
  subject?: string
  introLetter?: string
  paymentTerms?: string
  durationNotes?: string
  drawingDesign?: string
  signatoryName?: string
  signatoryTitle?: string
  summarySubject?: string
}

export type QuotationTemplateItem = {
  id: string
  sectionId: string
  serialNo?: number
  description: string
  materials: string
  unit: QuotationUnit
  priceMode: QuotationPriceMode
  premiumRate?: number
  standardRate?: number
  basicRate?: number
  rateMin?: number
  rateMax?: number
  defaultIncluded?: boolean
}

export type QuotationTemplateDefinition = {
  key: string
  name: string
  sourceDocument: string
  sections: QuotationSection[]
  items: QuotationTemplateItem[]
  defaultTerms: string
}

export type QuotationTotals = {
  subtotal: number
  discountAmount: number
  taxableAmount: number
  taxAmount: number
  grandTotal: number
  includedItemCount: number
  itemsMissingPrice: number
}

export type QuotationDraftPayload = {
  draftKey?: string
  createdById?: string
  quotationType: QuotationFileType
  projectSqft: number | null
  content: QuotationDraftContent
  grandTotal: number
  status: 'DRAFT' | 'FINALIZED'
}
