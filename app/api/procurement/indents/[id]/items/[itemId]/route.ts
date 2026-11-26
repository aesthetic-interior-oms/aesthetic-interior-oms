import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { hasProcurementLeaderRole, hasProcurementRole } from '@/lib/procurement-roles'
import { Prisma } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/procurement/indents/[id]/items/[itemId]
 * Removes a specific product from an indent, recalculates indent totals & PO total,
 * and unlocks the material in the requisition list.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response

  const roles = auth.actorRoles ?? []
  const departments = auth.actor.userDepartments ?? []
  if (!hasProcurementRole(roles, departments)) {
    return NextResponse.json({ error: 'Procurement access required' }, { status: 403 })
  }

  const isLeader =
    hasProcurementLeaderRole(roles) ||
    departments.some((d) => d.toUpperCase() === 'ADMIN') ||
    roles.some((r) => r.toUpperCase() === 'ADMIN')

  const { id: indentId, itemId } = await params

  try {
    const result = await prisma.$transaction(async (tx) => {
      const indent = await tx.materialIndent.findUnique({
        where: { id: indentId },
        include: {
          requisition: {
            select: { id: true, procurementAssigneeId: true },
          },
          purchaseOrder: true,
        },
      })

      if (!indent) {
        throw new Error('Indent not found')
      }

      if (
        !isLeader &&
        indent.createdById !== auth.actorUserId &&
        indent.requisition.procurementAssigneeId !== auth.actorUserId
      ) {
        throw new Error('You do not have permission to modify this indent')
      }

      const targetLine = await tx.materialIndentItem.findFirst({
        where: { id: itemId, indentId },
      })

      if (!targetLine) {
        throw new Error('Product not found in this indent')
      }

      await tx.materialIndentItem.delete({
        where: { id: targetLine.id },
      })

      // If this requisition item has no other indent items, reset its status back to NOTED
      const otherIndentItemsCount = await tx.materialIndentItem.count({
        where: { requisitionItemId: targetLine.requisitionItemId },
      })
      if (otherIndentItemsCount === 0) {
        await tx.materialRequisitionItem.update({
          where: { id: targetLine.requisitionItemId },
          data: {
            status: 'NOTED',
            purchasedQuantity: null,
            purchasedAt: null,
          },
        })
      }

      const remainingLines = await tx.materialIndentItem.findMany({
        where: { indentId },
      })

      const subtotal = remainingLines.reduce((sum, row) => sum + Number(row.total), 0)
      const total = subtotal + Number(indent.transportCost) + Number(indent.otherCosts)

      const updatedIndent = await tx.materialIndent.update({
        where: { id: indentId },
        data: {
          subtotal: new Prisma.Decimal(subtotal),
          total: new Prisma.Decimal(total),
        },
        include: {
          items: true,
        },
      })

      if (indent.purchaseOrder) {
        await tx.purchaseOrder.update({
          where: { id: indent.purchaseOrder.id },
          data: {
            totalAmount: Number(updatedIndent.total),
          },
        })
      }

      return updatedIndent
    })

    const reqItems = await prisma.materialRequisitionItem.findMany({
      where: { requisitionId: result.requisitionId },
      select: {
        finalQuantity: true,
        indentItems: { select: { quantity: true } },
      },
    })
    const fullyBilled =
      reqItems.length > 0 &&
      reqItems.every(
        (item) =>
          item.indentItems.reduce((sum, row) => sum + Number(row.quantity), 0) >=
          item.finalQuantity - 0.0001,
      )
    const anyBilled = reqItems.some((item) =>
      item.indentItems.some((row) => Number(row.quantity) > 0),
    )

    await prisma.materialRequisition.update({
      where: { id: result.requisitionId },
      data: {
        status: fullyBilled ? 'FULFILLED' : anyBilled ? 'IN_PROCUREMENT' : 'SUBMITTED',
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove product from indent' },
      { status: 400 },
    )
  }
}
