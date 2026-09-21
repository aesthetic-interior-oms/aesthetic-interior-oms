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

export async function GET() {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const items = await prisma.stockItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        category: true,
        currentStock: true,
        minStockAlert: true,
        unitCostPrice: true,
      },
    })

    let totalInventoryValue = 0
    let lowStockCount = 0
    const categoryStats: Record<string, { count: number; totalValue: number }> = {}

    items.forEach((item) => {
      const itemVal = item.currentStock * item.unitCostPrice
      totalInventoryValue += itemVal

      if (item.currentStock <= item.minStockAlert) {
        lowStockCount++
      }

      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { count: 0, totalValue: 0 }
      }
      categoryStats[item.category].count += 1
      categoryStats[item.category].totalValue += itemVal
    })

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const monthlyMovements = await prisma.stockMovement.findMany({
      where: {
        createdAt: { gte: startOfMonth },
      },
      select: {
        type: true,
        quantity: true,
        totalValue: true,
        department: true,
      },
    })

    let totalStockInValueMonth = 0
    let totalProjectIssuedValueMonth = 0
    let totalDeptIssuedValueMonth = 0
    const departmentStats: Record<string, number> = {}

    monthlyMovements.forEach((m) => {
      if (m.type === "STOCK_IN") {
        totalStockInValueMonth += m.totalValue
      } else if (m.type === "PROJECT_ISSUE") {
        totalProjectIssuedValueMonth += m.totalValue
      } else if (m.type === "DEPARTMENT_ISSUE" || m.type === "STAFF_ISSUE") {
        totalDeptIssuedValueMonth += m.totalValue
        const dept = m.department || "GENERAL_OFFICE"
        departmentStats[dept] = (departmentStats[dept] || 0) + m.totalValue
      }
    })

    return NextResponse.json({
      success: true,
      summary: {
        totalInventoryValue,
        totalItemsCount: items.length,
        lowStockCount,
        totalStockInValueMonth,
        totalProjectIssuedValueMonth,
        totalDeptIssuedValueMonth,
        categoryStats,
        departmentStats,
      },
    })
  } catch (error: any) {
    console.error("GET /api/finance/stock/summary error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch stock summary" }, { status: 500 })
  }
}
