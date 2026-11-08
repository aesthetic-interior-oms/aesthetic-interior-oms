import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/mobile-auth'
import { getOrCreateProcurementWallet } from '@/lib/procurement-wallet-service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { user } = authResult

    // 1. Fetch KPI metrics and recent requisitions in parallel
    const [
      totalRequisitions,
      submittedCount,
      inProcurementCount,
      fulfilledCount,
      leadsWithProcurement,
      recentRequisitionsRaw,
      wallet,
    ] = await Promise.all([
      prisma.materialRequisition.count(),
      prisma.materialRequisition.count({ where: { status: 'SUBMITTED' } }),
      prisma.materialRequisition.count({ where: { status: 'IN_PROCUREMENT' } }),
      prisma.materialRequisition.count({ where: { status: 'FULFILLED' } }),
      prisma.materialRequisition.findMany({
        where: { status: { in: ['IN_PROCUREMENT', 'FULFILLED'] } },
        select: { leadId: true },
        distinct: ['leadId'],
      }),
      prisma.materialRequisition.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          lead: {
            select: { id: true, name: true, phone: true, location: true },
          },
          createdBy: {
            select: { fullName: true },
          },
          _count: {
            select: { items: true },
          },
          items: {
            select: { variantAttributes: true },
          },
        },
      }),
      getOrCreateProcurementWallet(user.id),
    ])

    // Recent requisitions mapped with billed count
    const recentRequisitions = recentRequisitionsRaw.map((req) => {
      const billedCount = req.items.filter((item) => {
        const attrs = (item.variantAttributes as Record<string, unknown>) || {}
        return Boolean(attrs.billingRecord || attrs.purchaseRecord)
      }).length

      return {
        id: req.id,
        requisitionNo: req.requisitionNo,
        status: req.status,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        lead: req.lead,
        createdBy: req.createdBy.fullName || 'BOQ Team',
        totalItems: req._count.items,
        billedItems: billedCount,
      }
    })

    // 2. Fetch recent 5 wallet transactions for current user
    const recentTransactions = await prisma.procurementWalletTransaction.findMany({
      where: { walletId: wallet.id },
      include: {
        lead: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 5,
    })

    return NextResponse.json({
      ok: true,
      data: {
        metrics: {
          totalRequisitions,
          submittedCount,
          inProcurementCount,
          fulfilledCount,
          activeProjectsCount: leadsWithProcurement.length,
        },
        wallet: {
          advanceBalance: wallet.advanceBalance,
          pendingReimbursement: wallet.pendingReimbursement,
          totalSpent: wallet.totalSpent,
        },
        recentRequisitions,
        recentTransactions: recentTransactions.map((tx) => ({
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
          leadName: tx.lead?.name || null,
        })),
      },
    })
  } catch (error) {
    console.error('[GET /api/mobile/procurement/dashboard] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to load procurement dashboard' },
      { status: 500 },
    )
  }
}
