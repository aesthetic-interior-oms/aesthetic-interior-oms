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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const item = await prisma.stockItem.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { id: true, vendorId: true, vendorName: true, vendorCompanyName: true },
        },
        movements: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            lead: { select: { id: true, name: true, phone: true } },
            vendor: { select: { id: true, vendorName: true, vendorCompanyName: true } },
            createdBy: { select: { id: true, fullName: true } },
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ success: false, error: "Stock item not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error("GET /api/finance/stock/items/[id] error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch item detail" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { sku, name, category, unit, minStockAlert, unitCostPrice, standardSellingPrice, vendorId, location, description } = body

    const updated = await prisma.stockItem.update({
      where: { id },
      data: {
        ...(sku && { sku: sku.trim() }),
        ...(name && { name }),
        ...(category && { category: category as StockCategory }),
        ...(unit && { unit }),
        ...(minStockAlert !== undefined && { minStockAlert: Number(minStockAlert) }),
        ...(unitCostPrice !== undefined && { unitCostPrice: Number(unitCostPrice) }),
        ...(standardSellingPrice !== undefined && { standardSellingPrice: standardSellingPrice ? Number(standardSellingPrice) : null }),
        ...(vendorId !== undefined && { vendorId: vendorId || null }),
        ...(location !== undefined && { location: location || null }),
        ...(description !== undefined && { description: description || null }),
      },
    })

    return NextResponse.json({ success: true, item: updated })
  } catch (error: any) {
    console.error("PUT /api/finance/stock/items/[id] error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to update item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    await prisma.stockItem.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: "Item archived successfully" })
  } catch (error: any) {
    console.error("DELETE /api/finance/stock/items/[id] error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to delete item" }, { status: 500 })
  }
}
