import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/mobile-auth'
import {
  getOrCreateProcurementWallet,
  recordProcurementExpense,
} from '@/lib/procurement-wallet-service'
import { ProcurementPaidFrom } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { user } = authResult

    const wallet = await getOrCreateProcurementWallet(user.id)

    const [transactions, activeProjects] = await Promise.all([
      prisma.procurementWalletTransaction.findMany({
        where: { walletId: wallet.id },
        include: {
          lead: {
            select: { id: true, name: true, location: true },
          },
          materialRequisition: {
            select: { id: true, requisitionNo: true },
          },
        },
        orderBy: { date: 'desc' },
        take: 100,
      }),
      prisma.lead.findMany({
        where: {
          stage: {
            notIn: ['CLOSED', 'VISIT_CANCELLED'],
          },
        },
        select: { id: true, name: true, location: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
    ])

    return NextResponse.json({
      ok: true,
      data: {
        wallet: {
          id: wallet.id,
          advanceBalance: wallet.advanceBalance,
          pendingReimbursement: wallet.pendingReimbursement,
          totalSpent: wallet.totalSpent,
        },
        transactions: transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          status: tx.status,
          date: tx.date,
          amount: tx.amount,
          charge: tx.charge,
          totalAmount: tx.totalAmount,
          paymentMethod: tx.paymentMethod,
          paidFrom: tx.paidFrom,
          category: tx.category,
          particular: tx.particular,
          voucherNo: tx.voucherNo,
          receiptUrl: tx.receiptUrl,
          leadId: tx.leadId,
          leadName: tx.lead?.name || null,
          requisitionNo: tx.materialRequisition?.requisitionNo || null,
        })),
        activeProjects,
      },
    })
  } catch (error) {
    console.error('[GET /api/mobile/procurement/wallet] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to load wallet' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { user } = authResult
    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { ok: false, error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const {
      amount,
      charge = 0,
      paymentMethod = 'CASH',
      paidFrom = 'COMPANY_ADVANCE',
      category = 'RAW_MATERIALS',
      particular,
      voucherNo,
      receiptUrl,
      leadId,
      materialRequisitionId,
    } = body

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Amount must be greater than zero' },
        { status: 400 },
      )
    }

    if (!particular || !particular.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Particular / Description is required' },
        { status: 400 },
      )
    }

    const paidFromEnum =
      paidFrom === 'PERSONAL_POCKET'
        ? ProcurementPaidFrom.PERSONAL_POCKET
        : ProcurementPaidFrom.COMPANY_ADVANCE

    const result = await recordProcurementExpense({
      userId: user.id,
      amount: Number(amount),
      charge: Number(charge || 0),
      paymentMethod,
      paidFrom: paidFromEnum,
      category,
      particular: particular.trim(),
      voucherNo: voucherNo?.trim(),
      receiptUrl: receiptUrl || undefined,
      leadId: leadId || undefined,
      materialRequisitionId: materialRequisitionId || undefined,
      submittedById: user.id,
    })

    return NextResponse.json({
      ok: true,
      data: result,
      message: 'Expense recorded successfully',
    })
  } catch (error) {
    console.error('[POST /api/mobile/procurement/wallet] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to record expense'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    )
  }
}
