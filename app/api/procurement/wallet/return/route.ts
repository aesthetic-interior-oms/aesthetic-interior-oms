import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { returnProcurementFloat } from '@/lib/procurement-wallet-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/procurement/wallet/return
 * Record return of unspent advance float from user to Accounts (INFLOW).
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actor = authResult.actor
    const departments = new Set(actor.userDepartments.map((d) => d.toUpperCase()))
    const isAccountsOrAdmin =
      departments.has('ACCOUNTS') ||
      departments.has('ADMIN') ||
      actor.id === 'admin'

    if (!isAccountsOrAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only Accounts or Admin can process float returns' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const {
      userId,
      financeAccountId,
      amount,
      paymentMethod = 'CASH',
      particular,
    } = body

    if (!userId || !financeAccountId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required return fields' },
        { status: 400 },
      )
    }

    const result = await returnProcurementFloat({
      userId,
      financeAccountId,
      amount: Number(amount),
      paymentMethod,
      particular,
      recordedById: actor.id,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Advance float of ৳${Number(amount).toLocaleString()} returned successfully`,
    })
  } catch (error: unknown) {
    console.error('[POST /api/procurement/wallet/return] Error:', error)
    const message = error instanceof Error ? error.message : 'Return failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
