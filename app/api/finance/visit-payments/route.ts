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
    const search = searchParams.get("search") || ""

    const where: Record<string, any> = {
      category: "SITE_VISIT_PAYMENT",
    }

    if (startDateStr || endDateStr) {
      const dateFilter: Record<string, Date> = {}
      if (startDateStr) dateFilter.gte = new Date(startDateStr)
      if (endDateStr) {
        const end = new Date(endDateStr)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
      }
      where.date = dateFilter
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, location: true } },
        financeAccount: { select: { id: true, name: true } },
        collectedBy: { select: { id: true, fullName: true } },
        recordedBy: { select: { id: true, fullName: true } },
        visit: {
          select: {
            id: true,
            scheduledAt: true,
            visitFee: true,
            location: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: 500,
    })

    // Filter by search term (lead name)
    const filtered = search
      ? transactions.filter((tx) =>
          tx.lead?.name?.toLowerCase().includes(search.toLowerCase()) ||
          tx.visit?.location?.toLowerCase().includes(search.toLowerCase()) ||
          tx.particular?.toLowerCase().includes(search.toLowerCase())
        )
      : transactions

    // Compute totals
    const totalAmount = filtered.reduce((sum, tx) => sum + tx.amount, 0)

    return NextResponse.json({
      success: true,
      data: filtered,
      totalAmount,
      count: filtered.length,
    })
  } catch (error: any) {
    console.error("[GET /api/finance/visit-payments] failed", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
