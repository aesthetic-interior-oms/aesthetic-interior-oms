import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { disburseProcurementAdvance } from '@/lib/procurement-wallet-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/procurement/wallet/disburse
 * Disburse float from an Accounts FinanceAccount to a Procurement user's wallet.
 * Accepts amount + charge (e.g. bKash cashout fee) together.
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
        { success: false, error: 'Only Accounts or Admin can disburse advance funds' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const {
      userId,
      financeAccountId,
      amount,
      charge = 0,
      paymentMethod = 'BKASH',
      particular,
    } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Target user is required' },
        { status: 400 },
      )
    }

    if (!financeAccountId) {
      return NextResponse.json(
        { success: false, error: 'Source Finance Account is required' },
        { status: 400 },
      )
    }

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Disbursement amount must be greater than zero' },
        { status: 400 },
      )
    }

    const result = await disburseProcurementAdvance({
      userId,
      financeAccountId,
      amount: Number(amount),
      charge: Number(charge || 0),
      paymentMethod,
      particular,
      recordedById: actor.id,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Advance of ৳${Number(amount).toLocaleString()} disbursed successfully`,
    })
  } catch (error: unknown) {
    console.error('[POST /api/procurement/wallet/disburse] Error:', error)
    const message = error instanceof Error ? error.message : 'Disbursement failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
