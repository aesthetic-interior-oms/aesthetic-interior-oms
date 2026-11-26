import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { hasProcurementLeaderRole, hasProcurementRole } from '@/lib/procurement-roles'
import { Prisma } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

async function syncRequisitionStatus(requisitionId: string) {
  const remainingItems = await prisma.materialRequisitionItem.findMany({
    where: { requisitionId },
    select: {
      finalQuantity: true,
      indentItems: { select: { quantity: true } },
    },
  })
  const fullyBilled =
    remainingItems.length > 0 &&
    remainingItems.every(
      (item) =>
        item.indentItems.reduce((sum, row) => sum + Number(row.quantity), 0) >=
        item.finalQuantity - 0.0001,
    )
  const anyBilled = remainingItems.some((item) =>
    item.indentItems.some((row) => Number(row.quantity) > 0),
  )

  await prisma.materialRequisition.update({
    where: { id: requisitionId },
    data: {
      status: fullyBilled ? 'FULFILLED' : anyBilled ? 'IN_PROCUREMENT' : 'SUBMITTED',
    },
  })
}

/**
 * PATCH /api/procurement/indents/[id]
 * Supports:
 * 1. action: 'ADD_ITEMS' -> adds selected requisition items into this existing indent
 * 2. action: 'EDIT' (default) -> edits indent metadata and/or item quantities/prices/vendors
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const { id: indentId } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }

  try {
    const updatedIndent = await prisma.$transaction(async (tx) => {
      const existing = await tx.materialIndent.findUnique({
        where: { id: indentId },
        include: {
          requisition: {
            select: {
              id: true,
              status: true,
              procurementAssigneeId: true,
            },
          },
          items: {
            include: {
              requisitionItem: {
                include: { indentItems: true },
              },
            },
          },
          purchaseOrder: true,
        },
      })

      if (!existing) {
        throw new Error('Indent not found')
      }

      if (
        !isLeader &&
        existing.createdById !== auth.actorUserId &&
        existing.requisition.procurementAssigneeId !== auth.actorUserId
      ) {
        throw new Error('You do not have permission to modify this indent')
      }

      if (body.action === 'ADD_ITEMS') {
        if (!Array.isArray(body.items) || body.items.length === 0) {
          throw new Error('Select at least one requisition item to add')
        }

        const requested = new Map<
          string,
          { quantity: number; unitPrice: number; vendorName?: string | null }
        >()
        for (const row of body.items) {
          if (row?.unitPrice === undefined || row?.unitPrice === null || row?.unitPrice === '') {
            throw new Error('Enter a unit price for every selected item')
          }
          const quantity = Number(row?.quantity)
          const unitPrice = Number(row?.unitPrice)
          const rowVendor =
            typeof row?.vendorName === 'string' && row.vendorName.trim()
              ? row.vendorName.trim()
              : null
          if (
            typeof row?.itemId !== 'string' ||
            !Number.isFinite(quantity) ||
            quantity <= 0 ||
            !Number.isFinite(unitPrice) ||
            unitPrice < 0 ||
            requested.has(row.itemId)
          ) {
            throw new Error(
              'Each item needs a unique ID, positive quantity, and non-negative unit price',
            )
          }
          requested.set(row.itemId, { quantity, unitPrice, vendorName: rowVendor })
        }

        const reqItems = await tx.materialRequisitionItem.findMany({
          where: {
            requisitionId: existing.requisitionId,
            id: { in: [...requested.keys()] },
          },
          include: { indentItems: true },
        })

        if (reqItems.length !== requested.size) {
          throw new Error('One or more selected items do not belong to this indent’s requisition')
        }

        const existingByReqItemId = new Map(
          existing.items.map((item) => [item.requisitionItemId, item]),
        )

        const fallbackVendor =
          (typeof body.vendorName === 'string' && body.vendorName.trim()) ||
          existing.vendorName ||
          null

        for (const reqItem of reqItems) {
          const input = requested.get(reqItem.id)!
          const alreadyBilled = reqItem.indentItems.reduce(
            (sum, row) => sum + Number(row.quantity),
            0,
          )
          if (input.quantity + alreadyBilled > reqItem.finalQuantity + 0.0001) {
            throw new Error(`Quantity exceeds remaining amount for ${reqItem.materialName}`)
          }

          const existingLine = existingByReqItemId.get(reqItem.id)
          if (existingLine) {
            const newQty = Number(existingLine.quantity) + input.quantity
            const newTotal = newQty * input.unitPrice
            await tx.materialIndentItem.update({
              where: { id: existingLine.id },
              data: {
                quantity: new Prisma.Decimal(newQty),
                unitPrice: new Prisma.Decimal(input.unitPrice),
                total: new Prisma.Decimal(newTotal),
                vendorName: input.vendorName || existingLine.vendorName || fallbackVendor,
                billedById: auth.actorUserId,
                billedAt: new Date(),
              },
            })
          } else {
            await tx.materialIndentItem.create({
              data: {
                indentId: existing.id,
                requisitionItemId: reqItem.id,
                quantity: new Prisma.Decimal(input.quantity),
                unitPrice: new Prisma.Decimal(input.unitPrice),
                total: new Prisma.Decimal(input.quantity * input.unitPrice),
                vendorName: input.vendorName || fallbackVendor,
                billedById: auth.actorUserId,
              },
            })
          }
        }

        const allLines = await tx.materialIndentItem.findMany({
          where: { indentId: existing.id },
        })
        const subtotal = allLines.reduce((sum, row) => sum + Number(row.total), 0)
        const extraTransport = Number(body.transportCost ?? 0)
        const extraOther = Number(body.otherCosts ?? 0)
        const transportCost =
          Number(existing.transportCost) +
          (Number.isFinite(extraTransport) && extraTransport > 0 ? extraTransport : 0)
        const otherCosts =
          Number(existing.otherCosts) +
          (Number.isFinite(extraOther) && extraOther > 0 ? extraOther : 0)
        const total = subtotal + transportCost + otherCosts

        const saved = await tx.materialIndent.update({
          where: { id: existing.id },
          data: {
            subtotal: new Prisma.Decimal(subtotal),
            transportCost: new Prisma.Decimal(transportCost),
            otherCosts: new Prisma.Decimal(otherCosts),
            total: new Prisma.Decimal(total),
            ...(typeof body.notes === 'string' && body.notes.trim()
              ? {
                  notes: existing.notes
                    ? `${existing.notes}\n${body.notes.trim()}`
                    : body.notes.trim(),
                }
              : {}),
          },
          include: {
            items: {
              include: {
                requisitionItem: {
                  select: {
                    id: true,
                    materialName: true,
                    specifications: true,
                    workCategory: true,
                    finalQuantity: true,
                    unit: true,
                  },
                },
              },
            },
          },
        })

        if (existing.purchaseOrder) {
          await tx.purchaseOrder.update({
            where: { id: existing.purchaseOrder.id },
            data: {
              totalAmount: Number(saved.total),
              supplierName:
                saved.vendorName || allLines[0]?.vendorName || existing.purchaseOrder.supplierName,
            },
          })
        }

        return saved
      }

      // Default: EDIT indent & its line items
      const transportCost =
        body.transportCost !== undefined
          ? Number(body.transportCost)
          : Number(existing.transportCost)
      const otherCosts =
        body.otherCosts !== undefined ? Number(body.otherCosts) : Number(existing.otherCosts)

      if (![transportCost, otherCosts].every((n) => Number.isFinite(n) && n >= 0)) {
        throw new Error('Transport and other costs must be non-negative numbers')
      }

      const vendorName =
        body.vendorName !== undefined
          ? typeof body.vendorName === 'string'
            ? body.vendorName.trim() || null
            : null
          : existing.vendorName

      const notes =
        body.notes !== undefined
          ? typeof body.notes === 'string'
            ? body.notes.trim() || null
            : null
          : existing.notes

      if (Array.isArray(body.items)) {
        const lineById = new Map(existing.items.map((item) => [item.id, item]))
        for (const itemUpdate of body.items) {
          const line = lineById.get(itemUpdate?.id)
          if (!line) continue

          const nextQty = Number(itemUpdate.quantity)
          const nextPrice = Number(itemUpdate.unitPrice)
          if (!Number.isFinite(nextQty) || nextQty <= 0) {
            throw new Error(`Invalid quantity for ${line.requisitionItem.materialName}`)
          }
          if (!Number.isFinite(nextPrice) || nextPrice < 0) {
            throw new Error(`Invalid unit price for ${line.requisitionItem.materialName}`)
          }

          const billedElsewhere = line.requisitionItem.indentItems
            .filter((other) => other.id !== line.id)
            .reduce((sum, other) => sum + Number(other.quantity), 0)

          if (billedElsewhere + nextQty > line.requisitionItem.finalQuantity + 0.0001) {
            throw new Error(
              `Quantity exceeds remaining amount for ${line.requisitionItem.materialName} (max ${Math.max(0, line.requisitionItem.finalQuantity - billedElsewhere)})`,
            )
          }

          const nextVendor =
            itemUpdate.vendorName !== undefined
              ? typeof itemUpdate.vendorName === 'string'
                ? itemUpdate.vendorName.trim() || null
                : null
              : line.vendorName

          await tx.materialIndentItem.update({
            where: { id: line.id },
            data: {
              quantity: new Prisma.Decimal(nextQty),
              unitPrice: new Prisma.Decimal(nextPrice),
              total: new Prisma.Decimal(nextQty * nextPrice),
              vendorName: nextVendor,
            },
          })
        }
      }

      const allLines = await tx.materialIndentItem.findMany({
        where: { indentId: existing.id },
      })
      const subtotal = allLines.reduce((sum, row) => sum + Number(row.total), 0)
      const total = subtotal + transportCost + otherCosts

      const saved = await tx.materialIndent.update({
        where: { id: existing.id },
        data: {
          vendorName,
          transportCost: new Prisma.Decimal(transportCost),
          otherCosts: new Prisma.Decimal(otherCosts),
          subtotal: new Prisma.Decimal(subtotal),
          total: new Prisma.Decimal(total),
          notes,
        },
        include: {
          items: {
            include: {
              requisitionItem: {
                select: {
                  id: true,
                  materialName: true,
                  specifications: true,
                  workCategory: true,
                  finalQuantity: true,
                  unit: true,
                },
              },
            },
          },
        },
      })

      if (existing.purchaseOrder) {
        await tx.purchaseOrder.update({
          where: { id: existing.purchaseOrder.id },
          data: {
            totalAmount: Number(saved.total),
            supplierName:
              saved.vendorName || allLines[0]?.vendorName || existing.purchaseOrder.supplierName,
            notes: saved.notes,
          },
        })
      }

      return saved
    })

    await syncRequisitionStatus(updatedIndent.requisitionId)

    return NextResponse.json({ success: true, data: updatedIndent })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update indent' },
      { status: 400 },
    )
  }
}
