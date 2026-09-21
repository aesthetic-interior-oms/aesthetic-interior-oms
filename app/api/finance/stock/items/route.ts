import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { StockCategory } from "@/generated/prisma/client"

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

// Helper to generate SKU if not provided
async function generateSKU(category: string): Promise<string> {
  const prefix = `STK-${category.slice(0, 3).toUpperCase()}`
  const count = await prisma.stockItem.count({
    where: { sku: { startsWith: prefix } },
  })
  return `${prefix}-${(count + 1).toString().padStart(4, "0")}`
}

export async function GET(request: NextRequest) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim() || ""
    const category = searchParams.get("category") || ""
    const lowStockOnly = searchParams.get("lowStockOnly") === "true"

    const where: any = { isActive: true }

    if (category && category !== "ALL") {
      where.category = category as StockCategory
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ]
    }

    let items = await prisma.stockItem.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            vendorId: true,
            vendorName: true,
            vendorCompanyName: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    if (lowStockOnly) {
      items = items.filter((item) => item.currentStock <= item.minStockAlert)
    }

    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error("GET /api/finance/stock/items error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch stock items" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, category, unit, minStockAlert, unitCostPrice, standardSellingPrice, vendorId, location, description, initialStock } = body

    if (!name || !category) {
      return NextResponse.json({ success: false, error: "Item name and category are required" }, { status: 400 })
    }

    let sku = body.sku?.trim()
    if (!sku) {
      sku = await generateSKU(category)
    }

    // Check duplicate SKU
    const existing = await prisma.stockItem.findUnique({ where: { sku } })
    if (existing) {
      return NextResponse.json({ success: false, error: `SKU '${sku}' already exists` }, { status: 400 })
    }

    const stockQty = Number(initialStock || 0)

    const item = await prisma.stockItem.create({
      data: {
        sku,
        name,
        category: category as StockCategory,
        unit: unit || "pcs",
        currentStock: stockQty,
        minStockAlert: Number(minStockAlert || 5),
        unitCostPrice: Number(unitCostPrice || 0),
        standardSellingPrice: standardSellingPrice ? Number(standardSellingPrice) : null,
        vendorId: vendorId || null,
        location: location || null,
        description: description || null,
      },
    })

    // If initial stock > 0, log initial stock movement
    if (stockQty > 0) {
      await prisma.stockMovement.create({
        data: {
          stockItemId: item.id,
          type: "STOCK_IN",
          quantity: stockQty,
          unitCost: Number(unitCostPrice || 0),
          totalValue: stockQty * Number(unitCostPrice || 0),
          referenceNo: "INIT-STOCK",
          vendorId: vendorId || null,
          createdById: user.id,
          notes: "Initial inventory setup",
        },
      })
    }

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error("POST /api/finance/stock/items error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to create stock item" }, { status: 500 })
  }
}
