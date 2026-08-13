import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { TransactionType, PaymentAccount } from "@/generated/prisma/client"

export const runtime = "nodejs"
export const preferredRegion = "sin1"

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

    const where: any = {}
    if (leadId) where.leadId = leadId
    if (type) where.type = type
    if (category) where.category = category
    if (account) where.account = account

    if (startDateStr || endDateStr) {
      where.date = {}
      if (startDateStr) where.date.gte = new Date(startDateStr)
      if (endDateStr) where.date.lte = new Date(endDateStr)
    }

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
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
    })

    // Compute Daily Opening & Closing balance calculations for Cash/Bank
    // (This acts as the calculation logic from Daily Expanses.pdf)
    const allInflows = await prisma.transaction.findMany({
      where: { type: TransactionType.INFLOW },
      select: { amount: true, account: true },
    })

    const allOutflows = await prisma.transaction.findMany({
      where: { type: TransactionType.OUTFLOW },
      select: { amount: true, account: true },
    })

    let totalCashIn = 0
    let totalBankIn = 0
    let totalCashOut = 0
    let totalBankOut = 0

    allInflows.forEach((tx) => {
      if (tx.account === PaymentAccount.CASH) totalCashIn += tx.amount
      else totalBankIn += tx.amount
    })

    allOutflows.forEach((tx) => {
      if (tx.account === PaymentAccount.CASH) totalCashOut += tx.amount
      else totalBankOut += tx.amount
    })

    return NextResponse.json({
      success: true,
      data: transactions,
      balances: {
        cash: totalCashIn - totalCashOut,
        bank: totalBankIn - totalBankOut,
        total: (totalCashIn - totalCashOut) + (totalBankIn - totalBankOut),
      },
    })
  } catch (error: any) {
    console.error("[GET /api/finance/transactions] failed", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, category, particular, amount, account, leadId, date } = body

    if (!type || !category || !particular || typeof amount !== "number" || !account) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (type, category, particular, amount, account)" },
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
  } catch (error: any) {
    console.error("[POST /api/finance/transactions] failed", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
