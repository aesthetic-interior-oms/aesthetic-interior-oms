import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  getOrCreateProcurementWallet,
  recordProcurementExpense,
} from '@/lib/procurement-wallet-service'
import { ProcurementPaidFrom } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/procurement/wallet
 * Returns:
 * - Wallet overview & transactions for current user (or all wallets for Accounts/Admin)
 * - Active projects (leads) for project tagging
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actor = authResult.actor
    const departments = new Set(actor.userDepartments.map((d) => d.toUpperCase()))
    const isAccountsOrAdmin =
      departments.has('ACCOUNTS') ||
      departments.has('ADMIN') ||
      actor.id === 'admin'

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode')
    const targetUserId = searchParams.get('userId')

    // If Accounts/Admin requests all wallets
    if (mode === 'all' && isAccountsOrAdmin) {
      const wallets = await prisma.procurementWallet.findMany({
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })

      // Also get procurement users who don't have a wallet yet so Accounts can initialize them
      const procurementUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          userDepartments: {
            some: {
              department: {
                name: {
                  in: [
                    'Procurement',
                    'PROCUREMENT',
                    'PROCUREMENT_DEPARTMENT',
                    'PROCUREMENT_SUPPLY_CHAIN',
                    'Supply Chain',
                  ],
                },
              },
            },
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      })

      const financeAccounts = await prisma.financeAccount.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })

      // Aggregate totals
      const totalAdvanceHeld = wallets.reduce((sum, w) => sum + w.advanceBalance, 0)
      const totalPendingReimbursement = wallets.reduce((sum, w) => sum + w.pendingReimbursement, 0)
      const totalSpentAcrossTeam = wallets.reduce((sum, w) => sum + w.totalSpent, 0)

      return NextResponse.json({
        success: true,
        data: {
          wallets,
          procurementUsers,
          financeAccounts,
          metrics: {
            totalAdvanceHeld,
            totalPendingReimbursement,
            totalSpentAcrossTeam,
          },
        },
      })
    }

    // Single wallet view
    const effectiveUserId = (isAccountsOrAdmin && targetUserId) ? targetUserId : actor.id
    const wallet = await getOrCreateProcurementWallet(effectiveUserId)

    const transactions = await prisma.procurementWalletTransaction.findMany({
      where: { walletId: wallet.id },
      include: {
        lead: {
          select: { id: true, name: true, location: true },
        },
        materialRequisition: {
          select: { id: true, requisitionNo: true },
        },
        financeAccount: {
          select: { id: true, name: true },
        },
        submittedBy: {
          select: { id: true, fullName: true },
        },
        reviewedBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 100,
    })

    // Get active projects for tagging
    const activeProjects = await prisma.lead.findMany({
      where: {
        stage: {
          notIn: ['CLOSED', 'VISIT_CANCELLED'],
        },
      },
      select: { id: true, name: true, location: true },
      orderBy: { name: 'asc' },
      take: 200,
    })

    // Get finance accounts if Accounts/Admin
    let financeAccounts: Array<{ id: string; name: string }> = []
    if (isAccountsOrAdmin) {
      financeAccounts = await prisma.financeAccount.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        wallet,
        transactions,
        activeProjects,
        financeAccounts,
        isAccountsOrAdmin,
      },
    })
  } catch (error: unknown) {
    console.error('[GET /api/procurement/wallet] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/procurement/wallet
 * Log a new procurement expense (User enters payment amount + charge together).
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actor = authResult.actor
    const body = await request.json()

    const {
      amount,
      charge = 0,
      paymentMethod = 'CASH',
      paidFrom = ProcurementPaidFrom.COMPANY_ADVANCE,
      category = 'RAW_MATERIALS',
      particular,
      voucherNo,
      receiptUrl,
      leadId,
      materialRequisitionId,
      targetUserId,
    } = body

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than zero' },
        { status: 400 },
      )
    }

    if (!particular || !particular.trim()) {
      return NextResponse.json(
        { success: false, error: 'Particular / Description is required' },
        { status: 400 },
      )
    }

    const effectiveUserId = targetUserId || actor.id

    const result = await recordProcurementExpense({
      userId: effectiveUserId,
      amount: Number(amount),
      charge: Number(charge || 0),
      paymentMethod,
      paidFrom: paidFrom as ProcurementPaidFrom,
      category,
      particular: particular.trim(),
      voucherNo: voucherNo?.trim(),
      receiptUrl,
      leadId: leadId || undefined,
      materialRequisitionId: materialRequisitionId || undefined,
      submittedById: actor.id,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Expense recorded successfully',
    })
  } catch (error: unknown) {
    console.error('[POST /api/procurement/wallet] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to record expense'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
