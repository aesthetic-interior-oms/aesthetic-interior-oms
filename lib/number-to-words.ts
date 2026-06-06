const BELOW_TWENTY = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function wordsBelowThousand(value: number): string {
  if (value === 0) return ''
  if (value < 20) return BELOW_TWENTY[value]
  if (value < 100) {
    const tens = Math.floor(value / 10)
    const ones = value % 10
    return ones ? `${TENS[tens]} ${BELOW_TWENTY[ones]}` : TENS[tens]
  }

  const hundreds = Math.floor(value / 100)
  const remainder = value % 100
  const hundredPart = `${BELOW_TWENTY[hundreds]} Hundred`
  if (!remainder) return hundredPart
  return `${hundredPart} ${wordsBelowThousand(remainder)}`
}

function convertIndianNumber(value: number): string {
  if (value === 0) return 'Zero'

  const crore = Math.floor(value / 10000000)
  const lakh = Math.floor((value % 10000000) / 100000)
  const thousand = Math.floor((value % 100000) / 1000)
  const remainder = value % 1000

  const parts: string[] = []
  if (crore) parts.push(`${wordsBelowThousand(crore)} Crore`)
  if (lakh) parts.push(`${wordsBelowThousand(lakh)} Lakh`)
  if (thousand) parts.push(`${wordsBelowThousand(thousand)} Thousand`)
  if (remainder) parts.push(wordsBelowThousand(remainder))

  return parts.join(' ')
}

export function amountInWordsTaka(amount: number): string {
  const rounded = Math.round(Math.max(0, amount))
  if (rounded === 0) return 'Zero Taka Only.'
  return `${convertIndianNumber(rounded)} Taka Only.`
}
