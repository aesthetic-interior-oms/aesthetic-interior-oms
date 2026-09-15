import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export const runtime = "nodejs"
export const preferredRegion = "sin1"
export const dynamic = "force-dynamic"

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
    const startDateStr = searchParams.get("startDate")
    const endDateStr = searchParams.get("endDate")

    const dateFilter: Record<string, Date> = {}
    if (startDateStr) dateFilter.gte = new Date(startDateStr)
    if (endDateStr) {
      const end = new Date(endDateStr)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }

    const where: Record<string, unknown> = {}
    if (startDateStr || endDateStr) {
      where.date = dateFilter
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        financeAccount: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    })

    type SummaryRow = {
      accountId: string
      accountName: string
      leadId: string | null
      leadName: string
      amount: number
      txCount: number
    }

    const inflowMap = new Map<string, SummaryRow>()
    const outflowMap = new Map<string, SummaryRow>()
    let totalInflow = 0
    let totalOutflow = 0

    for (const tx of transactions) {
      const accountId = tx.financeAccountId ?? "no-account"
      const accountName = tx.financeAccount?.name ?? "Unknown Account"
      const leadId = tx.leadId ?? null
      const leadName = tx.lead?.name ?? "General"
      const key = `${accountId}__${leadId ?? "null"}`

      if (tx.type === "INFLOW") {
        const existing = inflowMap.get(key)
        if (existing) {
          existing.amount += tx.amount
          existing.txCount++
        } else {
          inflowMap.set(key, { accountId, accountName, leadId, leadName, amount: tx.amount, txCount: 1 })
        }
        totalInflow += tx.amount
      } else {
        const existing = outflowMap.get(key)
        if (existing) {
          existing.amount += tx.amount
          existing.txCount++
        } else {
          outflowMap.set(key, { accountId, accountName, leadId, leadName, amount: tx.amount, txCount: 1 })
        }
        totalOutflow += tx.amount
      }
    }

    const inflowRows = Array.from(inflowMap.values()).sort(
      (a, b) => a.accountName.localeCompare(b.accountName) || a.leadName.localeCompare(b.leadName)
    )
    const outflowRows = Array.from(outflowMap.values()).sort(
      (a, b) => a.accountName.localeCompare(b.accountName) || a.leadName.localeCompare(b.leadName)
    )

    return NextResponse.json({
      success: true,
      inflow: inflowRows,
      outflow: outflowRows,
      totalInflow,
      totalOutflow,
      netBalance: totalInflow - totalOutflow,
    })
  } catch (error: unknown) {
    console.error("[GET /api/finance/summary] failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
