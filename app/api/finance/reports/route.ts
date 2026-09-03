import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export const runtime = "nodejs"
export const preferredRegion = "sin1"

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
    const mode = searchParams.get("mode") // "monthly" or "project"
    const monthStr = searchParams.get("month") // e.g., "2026-06"
    const leadId = searchParams.get("leadId") // for detailed project breakdown

    if (mode === "monthly") {
      const targetDate = monthStr ? new Date(monthStr + "-01") : new Date()
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999)

      // Fetch all transactions in the target month
      const transactions = await prisma.transaction.findMany({
        where: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        include: {
          lead: {
            select: { id: true, name: true },
          },
          financeAccount: { select: { id: true, name: true } },
          recordedBy: { select: { fullName: true } },
        },
      })

      // Aggregate overhead categories
      const overheadBreakdown: Record<string, number> = {}
      let totalOverhead = 0
      let totalProjectExpenses = 0
      let totalInflow = 0

      transactions.forEach((tx) => {
        if (tx.type === "INFLOW") {
          totalInflow += tx.amount
        } else {
          // If transaction is associated with a project/lead, it's a project expense
          if (tx.leadId) {
            totalProjectExpenses += tx.amount
          } else {
            // Otherwise, it's an office overhead
            overheadBreakdown[tx.category] = (overheadBreakdown[tx.category] || 0) + tx.amount
            totalOverhead += tx.amount
          }
        }
      })

      // Group site-wise totals for the month
      const siteExpensesBreakdown: Record<string, { name: string; amount: number }> = {}
      transactions.forEach((tx) => {
        if (tx.type === "OUTFLOW" && tx.leadId && tx.lead) {
          if (!siteExpensesBreakdown[tx.leadId]) {
            siteExpensesBreakdown[tx.leadId] = { name: tx.lead.name, amount: 0 }
          }
          siteExpensesBreakdown[tx.leadId].amount += tx.amount
        }
      })

      return NextResponse.json({
        success: true,
        month: monthStr || `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
        totals: {
          inflow: totalInflow,
          overhead: totalOverhead,
          projectExpenses: totalProjectExpenses,
          net: totalInflow - (totalOverhead + totalProjectExpenses),
        },
        overheadBreakdown,
        siteExpensesBreakdown: Object.values(siteExpensesBreakdown),
        transactions,
      })
    }

    if (mode === "project") {
      if (leadId) {
        const startDateStr = searchParams.get("startDate")
        const endDateStr = searchParams.get("endDate")

        const whereClause: any = { leadId }
        if (startDateStr || endDateStr) {
          whereClause.date = {}
          if (startDateStr) {
            const start = new Date(startDateStr)
            start.setHours(0, 0, 0, 0)
            whereClause.date.gte = start
          }
          if (endDateStr) {
            const end = new Date(endDateStr)
            end.setHours(23, 59, 59, 999)
            whereClause.date.lte = end
          }
        }

        // Detailed category-wise expenses and payments for a single project
        const transactions = await prisma.transaction.findMany({
          where: whereClause,
          include: {
            recordedBy: { select: { fullName: true } },
            financeAccount: { select: { id: true, name: true } },
          },
          orderBy: { date: "asc" },
        })

        // All-time inflow total for lead
        const allTimeInflowAgg = await prisma.transaction.aggregate({
          where: { leadId, type: "INFLOW" },
          _sum: { amount: true },
        })
        const allTimeTotalPaid = allTimeInflowAgg._sum.amount ?? 0

        const categoryTotals: Record<string, number> = {}
        let totalInflow = 0
        let totalOutflow = 0

        transactions.forEach((tx) => {
          if (tx.type === "OUTFLOW") {
            categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount
            totalOutflow += tx.amount
          } else if (tx.type === "INFLOW") {
            totalInflow += tx.amount
          }
        })

        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { id: true, name: true, phone: true, location: true, budget: true, agreementValue: true },
        })

        const agreementValue = lead?.agreementValue ?? lead?.budget ?? null
        const isFiltered = Boolean(startDateStr || endDateStr)
        const totalPaid = isFiltered ? totalInflow : allTimeTotalPaid
        const paymentDue = agreementValue !== null ? agreementValue - totalPaid : null
        const profitEstimate = agreementValue !== null ? agreementValue - totalOutflow : null

        return NextResponse.json({
          success: true,
          project: lead,
          transactions,
          categoryTotals,
          allTimeTotalPaid,
          totalPaid,
          totalInflow,
          totalOutflow,
          agreementValue,
          paymentDue,
          profitEstimate,
          isFiltered,
        })
      } else {
        // Project-basis Daily Expenses breakdown (Replaces Project Basis daily expenses.pdf)
        // Fetches transactions grouped by project for a grid matrix
        const activeProjects = await prisma.lead.findMany({
          where: {
            stage: "CONVERSION", // standard converted projects
          },
          select: { id: true, name: true },
        })

        const projectIds = activeProjects.map((p) => p.id)

        // Get all transactions for active projects
        const transactions = await prisma.transaction.findMany({
          where: {
            leadId: { in: projectIds },
            type: "OUTFLOW",
          },
          include: {
            lead: { select: { id: true, name: true } },
          },
          orderBy: { date: "desc" },
        })

        return NextResponse.json({
          success: true,
          projects: activeProjects,
          transactions,
        })
      }
    }

    return NextResponse.json({ success: false, error: "Invalid mode parameter" }, { status: 400 })
  } catch (error: any) {
    console.error("[GET /api/finance/reports] failed", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
