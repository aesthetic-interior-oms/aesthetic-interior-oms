import type {
  ShortQuotationContent,
  ShortQuotationFloorSummary,
  ShortQuotationLine,
  ShortQuotationLineWithSerial,
  ShortQuotationRoomSummary,
  ShortQuotationSummary,
} from '@/lib/short-quotation-types'

export function calculateShortLineTotal(line: ShortQuotationLine): number {
  if (line.isLumpSum) {
    return Number.isFinite(line.total) ? Math.max(0, line.total) : 0
  }
  const qty = line.quantitySqft !== null && Number.isFinite(line.quantitySqft) ? line.quantitySqft : 0
  const rate = line.unitPrice !== null && Number.isFinite(line.unitPrice) ? line.unitPrice : 0
  return Math.round(qty * rate)
}

export function normalizeShortLine(line: ShortQuotationLine): ShortQuotationLine {
  const total = calculateShortLineTotal(line)
  return { ...line, total }
}

export function normalizeShortQuotationContent(content: ShortQuotationContent): ShortQuotationContent {
  return {
    ...content,
    rooms: content.rooms.map((room) => ({
      ...room,
      lines: room.lines.map(normalizeShortLine),
    })),
  }
}

export function buildShortQuotationSummary(content: ShortQuotationContent): ShortQuotationSummary {
  const floors = [...content.floors].sort((a, b) => a.sortOrder - b.sortOrder)
  const rooms = [...content.rooms].sort((a, b) => a.sortOrder - b.sortOrder)
  const floorNameById = new Map(floors.map((floor) => [floor.id, floor.name]))

  let serial = 0
  const allLines: ShortQuotationLineWithSerial[] = []

  const floorSummaries: ShortQuotationFloorSummary[] = floors.map((floor) => {
    const floorRooms = rooms
      .filter((room) => room.floorId === floor.id)
      .map((room): ShortQuotationRoomSummary => {
        const lines = room.lines.map((line) => {
          serial += 1
          const normalized = normalizeShortLine(line)
          const withSerial: ShortQuotationLineWithSerial = {
            ...normalized,
            serialNo: serial,
            roomId: room.id,
            roomName: room.name,
            floorId: floor.id,
            floorName: floor.name,
          }
          allLines.push(withSerial)
          return withSerial
        })
        const total = lines.reduce((sum, line) => sum + line.total, 0)
        return { room, floorName: floor.name, lines, total }
      })

    const total = floorRooms.reduce((sum, room) => sum + room.total, 0)
    return { floor, rooms: floorRooms, total }
  })

  const subTotal = floorSummaries.reduce((sum, floor) => sum + floor.total, 0)
  const discount = content.discountAmount && Number.isFinite(content.discountAmount) ? content.discountAmount : 0
  const grandTotal = Math.max(0, subTotal - discount)

  return { floors: floorSummaries, grandTotal, allLines }
}

export function formatShortQuotationDate(value: string): string {
  if (!value) return ''
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export function todayShortQuotationDate(): string {
  return formatShortQuotationDate(new Date().toISOString())
}
