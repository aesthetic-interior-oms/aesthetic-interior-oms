import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { StockMovementType, TransactionType } from "@/generated/prisma/client"

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
    const stockItemId = searchParams.get("stockItemId") || undefined
    const leadId = searchParams.get("leadId") || undefined
    const vendorId = searchParams.get("vendorId") || undefined
    const department = searchParams.get("department") || undefined
    const type = searchParams.get("type") || undefined
    const limit = Number(searchParams.get("limit") || 100)

    const where: any = {}
    if (stockItemId) where.stockItemId = stockItemId
    if (leadId) where.leadId = leadId
    if (vendorId) where.vendorId = vendorId
    if (department && department !== "ALL") where.department = department
    if (type && type !== "ALL") where.type = type as StockMovementType

    const movements = await prisma.stockMovement.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        stockItem: {
          select: { id: true, sku: true, name: true, unit: true, category: true },
        },
        lead: {
          select: { id: true, name: true, phone: true, location: true },
        },
        vendor: {
          select: { id: true, vendorId: true, vendorName: true, vendorCompanyName: true },
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
        recipientUser: {
          select: { id: true, fullName: true, email: true },
        },
        transaction: {
          select: { id: true, voucherNo: true, amount: true },
        },
      },
    })

    return NextResponse.json({ success: true, movements })
  } catch (error: any) {
    console.error("GET /api/finance/stock/movements error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch movements" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      stockItemId,
      type,
      quantity,
      unitCost,
      referenceNo,
      leadId,
      vendorId,
      department,
      recipientUserId,
      notes,
      createFinanceTransaction,
      transactionCategory,
      financeAccountId,
    } = body

    if (!stockItemId || !type || quantity === undefined) {
      return NextResponse.json({ success: false, error: "Stock item, movement type, and quantity are required" }, { status: 400 })
    }

    const item = await prisma.stockItem.findUnique({ where: { id: stockItemId } })
    if (!item) {
      return NextResponse.json({ success: false, error: "Stock item not found" }, { status: 404 })
    }

    const qty = Number(quantity)
    if (isNaN(qty) || qty === 0) {
      return NextResponse.json({ success: false, error: "Quantity must be a non-zero number" }, { status: 400 })
    }

    const movementType = type as StockMovementType
    const cost = unitCost !== undefined && unitCost !== "" ? Number(unitCost) : item.unitCostPrice
    let newStock = item.currentStock

    if (movementType === "STOCK_IN" || movementType === "PROJECT_RETURN") {
      if (qty < 0) {
        return NextResponse.json({ success: false, error: "Quantity must be positive for Stock In / Return" }, { status: 400 })
      }
      newStock = item.currentStock + qty
    } else if (movementType === "PROJECT_ISSUE" || movementType === "DEPARTMENT_ISSUE" || movementType === "STAFF_ISSUE" || movementType === "VENDOR_RETURN") {
      if (qty < 0) {
        return NextResponse.json({ success: false, error: "Quantity must be positive for Issue / Vendor Return" }, { status: 400 })
      }
      if (qty > item.currentStock) {
        return NextResponse.json({
          success: false,
          error: `Insufficient stock! Currently available: ${item.currentStock} ${item.unit}`,
        }, { status: 400 })
      }
      newStock = item.currentStock - qty
    } else if (movementType === "ADJUSTMENT") {
      newStock = Math.max(0, item.currentStock + qty)
    }

    const totalValue = Math.abs(qty) * cost

    // Perform inside Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      let createdTransactionId: string | null = null

      // If user opted to record a financial transaction for Stock In
      if (createFinanceTransaction && movementType === "STOCK_IN" && totalValue > 0) {
        const txCategory = transactionCategory || "BOARD_MATERIAL"
        const financialTx = await tx.transaction.create({
          data: {
            type: TransactionType.OUTFLOW,
            particular: `Stock Purchase: ${item.name} (${qty} ${item.unit})`,
            amount: totalValue,
            category: txCategory,
            recordedById: user.id,
            leadId: leadId || null,
            financeAccountId: financeAccountId || null,
          },
        })
        createdTransactionId = financialTx.id
      }

      // Create Movement record
      const movement = await tx.stockMovement.create({
        data: {
          stockItemId: item.id,
          type: movementType,
          quantity: qty,
          unitCost: cost,
          totalValue,
          referenceNo: referenceNo || null,
          leadId: leadId || null,
          vendorId: vendorId || item.vendorId || null,
          department: department || null,
          recipientUserId: recipientUserId || null,
          transactionId: createdTransactionId,
          createdById: user.id,
          notes: notes || null,
        },
      })

      // Update StockItem current stock & unit cost price if updated
      await tx.stockItem.update({
        where: { id: item.id },
        data: {
          currentStock: newStock,
          ...(movementType === "STOCK_IN" && cost > 0 && { unitCostPrice: cost }),
        },
      })

      return movement
    })

    return NextResponse.json({ success: true, movement: result })
  } catch (error: any) {
    console.error("POST /api/finance/stock/movements error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to record movement" }, { status: 500 })
  }
}
