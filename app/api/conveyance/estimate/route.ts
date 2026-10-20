import { NextRequest, NextResponse } from 'next/server'
import { canRequestConveyance, getConveyanceActor } from '@/lib/conveyance'
import { takaAmountInWords } from '@/lib/conveyance-bills'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export async function POST(request: NextRequest) {
  const actor = await getConveyanceActor()
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!canRequestConveyance(actor)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const amounts = body?.amounts
  if (!Array.isArray(amounts) || !amounts.length || amounts.length > 100) return NextResponse.json({ success: false, error: 'Invalid bill amounts.' }, { status: 400 })
  let cents = 0
  for (const value of amounts) {
    const amount = Number(value)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return NextResponse.json({ success: false, error: 'Enter a positive amount on every bill row.' }, { status: 400 })
    const rowCents = Math.round((amount + Number.EPSILON) * 100)
    if (Math.abs(rowCents / 100 - amount) > 0.000001) return NextResponse.json({ success: false, error: 'Bill amounts can have at most two decimal places.' }, { status: 400 })
    cents += rowCents
  }
  const amount = cents / 100
  if (!Number.isSafeInteger(cents) || amount > 1000000000) return NextResponse.json({ success: false, error: 'Total amount is too large.' }, { status: 400 })
  return NextResponse.json({ success: true, amount, amountInWords: takaAmountInWords(amount) })
}
