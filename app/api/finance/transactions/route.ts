import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { TransactionType } from "@/generated/prisma/client"
import { sendPushToUser } from "@/lib/fcm-service"
import { releaseVisualizerAfterPaymentGate } from "@/lib/visualizer-release"

export const runtime = "nodejs"
export const preferredRegion = "sin1"
export const dynamic = "force-dynamic"

// Helper to get local DB user from Clerk auth
async function getDbUser() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null
  return prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  })
}

export async function GET(request: NextRequest) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId") || undefined
    const type = searchParams.get("type") as TransactionType | null
    const category = searchParams.get("category")
    const financeAccountId = searchParams.get("financeAccountId")
    const startDateStr = searchParams.get("startDate")
    const endDateStr = searchParams.get("endDate")

    // Build the where clause for filtering transactions
    const where: Record<string, unknown> = {}
    if (leadId) where.leadId = leadId
    if (type) where.type = type
    if (category) where.category = category
    if (financeAccountId) where.financeAccountId = financeAccountId

    if (startDateStr || endDateStr) {
      const dateFilter: Record<string, Date> = {}
      if (startDateStr) dateFilter.gte = new Date(startDateStr)
      if (endDateStr) {
        // Set to end of day
        const end = new Date(endDateStr)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
      }
      where.date = dateFilter
    }

    // Run both queries in parallel: filtered transactions + aggregate totals (all-time for balance)
    const [transactions, aggregates] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              stage: true,
            },
          },
          recordedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          collectedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          visit: {
            select: {
              id: true,
              scheduledAt: true,
              visitFee: true,
            },
          },
          financeAccount: true,
        },
        orderBy: {
          date: "desc",
        },
        // Cap at 500 rows for performance; pagination can be added later
        take: 500,
      }),
      // Single aggregation query for all-time balance (no filters applied here)
      prisma.transaction.groupBy({
        by: ["type", "financeAccountId"],
        _sum: {
          amount: true,
        },
      }),
    ])

    // Compute balances from aggregate
    let totalCashIn = 0
    let totalBankIn = 0
    let totalCashOut = 0
    let totalBankOut = 0

    // To properly map balances to "cash" vs "bank", we need to know the account type.
    // We will just fetch all accounts first to classify them.
    const allAccounts = await prisma.financeAccount.findMany()
    const accountTypeMap = new Map(allAccounts.map(a => [a.id, a.name.toUpperCase().includes('BANK') ? 'BANK' : 'CASH']))

    for (const group of aggregates) {
      const sum = group._sum.amount ?? 0
      const accType = group.financeAccountId ? accountTypeMap.get(group.financeAccountId) : 'CASH'
      if (group.type === "INFLOW") {
        if (accType === "CASH") totalCashIn += sum
        else totalBankIn += sum
      } else {
        if (accType === "CASH") totalCashOut += sum
        else totalBankOut += sum
      }
    }

    return NextResponse.json({
      success: true,
      data: transactions,
      balances: {
        cash: totalCashIn - totalCashOut,
        bank: totalBankIn - totalBankOut,
        total: (totalCashIn - totalCashOut) + (totalBankIn - totalBankOut),
      },
    })
  } catch (error: unknown) {
    console.error("[GET /api/finance/transactions] failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json() as {
      type: string
      category: string
      particular: string
      amount: number
      financeAccountId: string
      leadId?: string
      visitId?: string
      collectedById?: string
      date?: string
      imageUrl?: string
    }
    const { type, category, particular, amount, financeAccountId, leadId, visitId, collectedById, date, imageUrl } = body

    if (!type || !category || !particular || typeof amount !== "number" || !financeAccountId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (type, category, particular, amount, financeAccountId)" },
        { status: 400 }
      )
    }
    if (!Object.values(TransactionType).includes(type as TransactionType)) {
      return NextResponse.json({ success: false, error: "Invalid transaction type" }, { status: 400 })
    }

    // If visitId is provided but no leadId, auto-fill leadId from the visit
    let resolvedLeadId = leadId || null
    if (visitId && !resolvedLeadId) {
      const visit = await prisma.visit.findUnique({
        where: { id: visitId },
        select: { leadId: true },
      })
      if (visit) resolvedLeadId = visit.leadId
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          type: type as TransactionType,
          category,
          particular,
          amount,
          financeAccountId,
          leadId: resolvedLeadId,
          visitId: visitId || null,
          collectedById: collectedById || null,
          recordedById: user.id,
          date: date ? new Date(date) : new Date(),
          imageUrl: imageUrl || null,
        }
      })

      const generatedVoucherNo = `v-${String(transaction.serialNo).padStart(6, '0')}`

      const updatedTransaction = await tx.transaction.update({
        where: { id: transaction.id },
        data: { voucherNo: generatedVoucherNo },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
            },
          },
          collectedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      })

      const visualizerRelease =
        resolvedLeadId && type === TransactionType.INFLOW
          ? await releaseVisualizerAfterPaymentGate({
              tx,
              leadId: resolvedLeadId,
              actorUserId: user.id,
            })
          : null

      return { transaction: updatedTransaction, visualizerRelease }
    })

    if (result.visualizerRelease?.released && result.visualizerRelease.visualizerUserId) {
      sendPushToUser(
        result.visualizerRelease.visualizerUserId,
        '3D Visualizer work released',
        `${result.visualizerRelease.leadName ?? 'Project'} is ready for 3D visualization.`,
        { type: 'VISUALIZER_RELEASED', leadId: result.visualizerRelease.leadId },
      ).catch((pushErr) => console.error('[POST /api/finance/transactions] visualizer release push failed', pushErr))
    }

    return NextResponse.json({
      success: true,
      data: result.transaction,
      visualizerRelease: result.visualizerRelease,
    }, { status: 201 })
  } catch (error: unknown) {
    console.error("[POST /api/finance/transactions] failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json() as { id: string; imageUrl: string }
    const { id, imageUrl } = body

    if (!id || !imageUrl) {
      return NextResponse.json({ success: false, error: "Missing id or imageUrl" }, { status: 400 })
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: { imageUrl },
    })

    return NextResponse.json({ success: true, data: transaction })
  } catch (error: unknown) {
    console.error("[PATCH /api/finance/transactions] failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
