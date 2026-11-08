import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { id: requisitionId } = await context.params
    const body = await request.json().catch(() => null)

    if (!body || !body.itemId) {
      return NextResponse.json(
        { ok: false, error: 'Item ID is required' },
        { status: 400 },
      )
    }

    const {
      itemId,
      supplierId,
      supplierName,
      unitRate = 0,
      purchasedQty,
      notes,
      receiptUrl,
      isBought = true,
    } = body

    const existingItem = await prisma.materialRequisitionItem.findUnique({
      where: { id: itemId },
    })

    if (!existingItem || existingItem.requisitionId !== requisitionId) {
      return NextResponse.json(
        { ok: false, error: 'Requisition item not found' },
        { status: 404 },
      )
    }

    const currentAttrs = (existingItem.variantAttributes as Record<string, unknown>) || {}
    const finalQty = Number(purchasedQty ?? existingItem.finalQuantity ?? 1)
    const rate = Number(unitRate || 0)
    const totalCost = finalQty * rate

    const purchaseRecord = {
      isBought: Boolean(isBought),
      supplierId: supplierId || null,
      supplierName: supplierName || null,
      unitRate: rate,
      purchasedQty: finalQty,
      totalCost,
      notes: notes || null,
      receiptUrl: receiptUrl || null,
      updatedAt: new Date().toISOString(),
      updatedById: authResult.user.id,
    }

    const updatedAttrs = {
      ...currentAttrs,
      purchaseRecord,
      billingRecord: purchaseRecord,
    }

    const updatedItem = await prisma.materialRequisitionItem.update({
      where: { id: itemId },
      data: {
        variantAttributes: updatedAttrs,
      },
    })

    // Also update requisition status to IN_PROCUREMENT if it was SUBMITTED
    await prisma.materialRequisition.updateMany({
      where: {
        id: requisitionId,
        status: 'SUBMITTED',
      },
      data: {
        status: 'IN_PROCUREMENT',
      },
    })

    return NextResponse.json({
      ok: true,
      data: updatedItem,
      message: 'Item purchase logged successfully',
    })
  } catch (error) {
    console.error('[POST .../item-purchase] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to record purchase' },
      { status: 500 },
    )
  }
}
