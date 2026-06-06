export type ShortQuotationPackage = 'PLATINUM' | 'PREMIUM' | 'LUXURY'

export type ShortQuotationLine = {
  id: string
  name: string
  quantitySqft: number | null
  unitPrice: number | null
  total: number
  isLumpSum: boolean
}

export type ShortQuotationRoom = {
  id: string
  floorId: string
  name: string
  sortOrder: number
  lines: ShortQuotationLine[]
}

export type ShortQuotationFloor = {
  id: string
  name: string
  sortOrder: number
}

export type ShortQuotationContent = {
  version: 1
  documentType: 'short'
  packageTier: ShortQuotationPackage
  quotationDate: string
  clientName: string
  clientAddress: string
  subject: string
  introLetter: string
  floors: ShortQuotationFloor[]
  rooms: ShortQuotationRoom[]
  footerNotes: string[]
}

export type ShortQuotationLineWithSerial = ShortQuotationLine & {
  serialNo: number
  roomId: string
  roomName: string
  floorId: string
  floorName: string
}

export type ShortQuotationRoomSummary = {
  room: ShortQuotationRoom
  floorName: string
  lines: ShortQuotationLineWithSerial[]
  total: number
}

export type ShortQuotationFloorSummary = {
  floor: ShortQuotationFloor
  rooms: ShortQuotationRoomSummary[]
  total: number
}

export type ShortQuotationSummary = {
  floors: ShortQuotationFloorSummary[]
  grandTotal: number
  allLines: ShortQuotationLineWithSerial[]
}
