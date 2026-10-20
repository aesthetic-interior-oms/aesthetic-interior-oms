export const CONVEYANCE_MODES = [
  { value: 'WALKING', label: 'Walking' },
  { value: 'RICKSHAW', label: 'Rickshaw' },
  { value: 'CNG', label: 'CNG / Auto-rickshaw' },
  { value: 'BUS', label: 'Bus' },
  { value: 'TRAIN', label: 'Train' },
  { value: 'RIDE_SHARE', label: 'Ride share' },
  { value: 'TAXI', label: 'Taxi' },
  { value: 'CAR', label: 'Car' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'LAUNCH', label: 'Launch' },
  { value: 'FERRY', label: 'Ferry' },
  { value: 'OTHER', label: 'Other' },
] as const

export type ConveyanceBillInput = {
  date: string
  from: string
  to: string
  mode: string
  purpose: string
  amount: number
}

export function parseConveyanceBills(input: unknown): { bills: ConveyanceBillInput[]; total: number } | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > 100) return null
  const modeValues = new Set<string>(CONVEYANCE_MODES.map((mode) => mode.value))
  const bills: ConveyanceBillInput[] = []
  let totalCents = 0
  for (const value of input) {
    if (!value || typeof value !== 'object') return null
    const row = value as Record<string, unknown>
    const date = typeof row.date === 'string' ? row.date : ''
    const from = typeof row.from === 'string' ? row.from.trim() : ''
    const to = typeof row.to === 'string' ? row.to.trim() : ''
    const mode = typeof row.mode === 'string' ? row.mode : ''
    const purpose = typeof row.purpose === 'string' ? row.purpose.trim() : ''
    const amount = typeof row.amount === 'number' ? row.amount : Number(row.amount)
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : null
    if (!parsedDate || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return null
    if (!from || from.length > 250 || !to || to.length > 250 || !purpose || purpose.length > 500) return null
    if (!modeValues.has(mode) || !Number.isFinite(amount) || amount <= 0 || amount > 100000000) return null
    const cents = Math.round((amount + Number.EPSILON) * 100)
    if (Math.abs(cents / 100 - amount) > 0.000001) return null
    totalCents += cents
    bills.push({ date, from, to, mode, purpose, amount: cents / 100 })
  }
  const total = totalCents / 100
  if (!Number.isSafeInteger(totalCents) || total > 1000000000) return null
  return { bills, total }
}

const smallNumbers = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function belowThousand(value: number): string {
  const parts: string[] = []
  if (value >= 100) {
    parts.push(`${smallNumbers[Math.floor(value / 100)]} Hundred`)
    value %= 100
  }
  if (value >= 20) {
    parts.push(`${tens[Math.floor(value / 10)]}${value % 10 ? ` ${smallNumbers[value % 10]}` : ''}`)
  } else if (value > 0) {
    parts.push(smallNumbers[value])
  }
  return parts.join(' ')
}

function wholeRupeesInWords(value: number): string {
  if (value === 0) return 'Zero'
  const parts: string[] = []
  const groups: Array<[number, string]> = [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand'], [1, '']]
  let remaining = value
  for (const [size, label] of groups) {
    if (remaining >= size) {
      const count = Math.floor(remaining / size)
      const words = size === 1 ? belowThousand(count) : wholeRupeesInWords(count)
      parts.push(label ? `${words} ${label}` : words)
      remaining %= size
    }
  }
  return parts.join(' ')
}

export function takaAmountInWords(amount: number): string {
  const totalPaisa = Math.round((amount + Number.EPSILON) * 100)
  const taka = Math.floor(totalPaisa / 100)
  const paisa = totalPaisa % 100
  const takaWords = `${wholeRupeesInWords(taka)} Taka`
  return paisa ? `${takaWords} and ${wholeRupeesInWords(paisa)} Paisa only` : `${takaWords} only`
}
