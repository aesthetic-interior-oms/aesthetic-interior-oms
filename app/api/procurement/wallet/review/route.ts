import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { reviewProcurementExpense } from '@/lib/procurement-wallet-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/procurement/wallet/review
 * Approve or Reject an expense transaction.
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
        { success: false, error: 'Only Accounts or Admin can review expenses' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { transactionId, decision, notes } = body

    if (!transactionId || !['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transactionId or decision' },
        { status: 400 },
      )
    }

    const result = await reviewProcurementExpense(
      transactionId,
      actor.id,
      decision as 'APPROVED' | 'REJECTED',
      notes,
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: `Transaction ${decision.toLowerCase()} successfully`,
    })
  } catch (error: unknown) {
    console.error('[POST /api/procurement/wallet/review] Error:', error)
    const message = error instanceof Error ? error.message : 'Review action failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
