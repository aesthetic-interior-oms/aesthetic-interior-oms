import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { TransactionType, PaymentAccount } from "@/generated/prisma/client"

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
    const account = searchParams.get("account") as PaymentAccount | null
    const startDateStr = searchParams.get("startDate")
    const endDateStr = searchParams.get("endDate")

    // Build the where clause for filtering transactions
    const where: Record<string, unknown> = {}
    if (leadId) where.leadId = leadId
    if (type) where.type = type
    if (category) where.category = category
    if (account) where.account = account

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
        },
        orderBy: {
          date: "desc",
        },
        // Cap at 500 rows for performance; pagination can be added later
        take: 500,
      }),
      // Single aggregation query for all-time balance (no filters applied here)
      prisma.transaction.groupBy({
        by: ["type", "account"],
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

    for (const group of aggregates) {
      const sum = group._sum.amount ?? 0
      if (group.type === TransactionType.INFLOW) {
        if (group.account === PaymentAccount.CASH) totalCashIn += sum
        else totalBankIn += sum
      } else {
        if (group.account === PaymentAccount.CASH) totalCashOut += sum
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
      account: string
      leadId?: string
      date?: string
      voucherNo?: string
    }
    const { type, category, particular, amount, account, leadId, date, voucherNo } = body

    if (!type || !category || !particular || typeof amount !== "number" || !account || !voucherNo) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (type, category, particular, amount, account, voucherNo)" },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.create({
      data: {
        type: type as TransactionType,
        category,
        particular,
        amount,
        account: account as PaymentAccount,
        leadId: leadId || null,
        recordedById: user.id,
        date: date ? new Date(date) : new Date(),
        voucherNo,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: transaction }, { status: 201 })
  } catch (error: unknown) {
    console.error("[POST /api/finance/transactions] failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
