import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { hasProcurementLeaderRole, hasProcurementRole } from '@/lib/procurement-roles'
import { Prisma } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const leadId = searchParams.get('leadId')
  const requisitionId = searchParams.get('requisitionId')

  const indents = await prisma.materialIndent.findMany({
    where: {
      ...(leadId ? { leadId } : {}),
      ...(requisitionId ? { requisitionId } : {}),
      ...(isLeader
        ? {}
        : {
            OR: [
              { createdById: auth.actorUserId },
              { requisition: { procurementAssigneeId: auth.actorUserId } },
            ],
          }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      lead: {
        select: { id: true, name: true, phone: true, location: true },
      },
      requisition: {
        select: { id: true, requisitionNo: true, status: true },
      },
      createdBy: {
        select: { id: true, fullName: true },
      },
      purchaseOrder: {
        select: { id: true, poNo: true, status: true, totalAmount: true },
      },
      items: {
        orderBy: { billedAt: 'asc' },
        include: {
          requisitionItem: {
            select: {
              id: true,
              materialName: true,
              specifications: true,
              workCategory: true,
              finalQuantity: true,
              unit: true,
              variantAttributes: true,
            },
          },
          billedBy: {
            select: { id: true, fullName: true },
          },
        },
      },
    },
  })

  return NextResponse.json({ success: true, data: indents })
}

export async function POST(request: Request) {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response
  if (!hasProcurementRole(auth.actorRoles, auth.actor.userDepartments)) return NextResponse.json({ error: 'Procurement access required' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body.requisitionId !== 'string' || !Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: 'Select at least one requisition item' }, { status: 400 })
  const transportCost = Number(body.transportCost ?? 0)
  const otherCosts = Number(body.otherCosts ?? 0)
  if (![transportCost, otherCosts].every((n) => Number.isFinite(n) && n >= 0)) return NextResponse.json({ error: 'Costs must be valid non-negative amounts' }, { status: 400 })
  const requested = new Map<string, { quantity: number; unitPrice: number; vendorName?: string | null }>()
  for (const row of body.items) {
    if (row?.unitPrice === undefined || row?.unitPrice === null || row?.unitPrice === '') return NextResponse.json({ error: 'Enter a unit price for every selected item' }, { status: 400 })
    const quantity = Number(row?.quantity)
    const unitPrice = Number(row?.unitPrice)
    const rowVendor = typeof row?.vendorName === 'string' && row.vendorName.trim() ? row.vendorName.trim() : null
    if (typeof row?.itemId !== 'string' || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || requested.has(row.itemId)) return NextResponse.json({ error: 'Each item needs a unique ID, positive quantity, and non-negative unit price' }, { status: 400 })
    requested.set(row.itemId, { quantity, unitPrice, vendorName: rowVendor })
  }
  try {
    const indent = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear()
      // Serialize indent creation for the year so numbering and remaining-quantity
      // checks cannot race against another simultaneous request.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`material-indent-${year}`}))`
      const requisition = await tx.materialRequisition.findUnique({ where: { id: body.requisitionId }, include: { items: { where: { id: { in: [...requested.keys()] } }, include: { indentItems: true } } } })
      if (!requisition || !['SUBMITTED', 'IN_PROCUREMENT'].includes(requisition.status)) throw new Error('Requisition is not available for billing')
      const isLeader = (auth.actorRoles ?? []).some((r) => r.toUpperCase().includes('PROCUREMENT_TEAM_LEADER'))
      const isAdmin = (auth.actorRoles ?? []).some((r) => r.toUpperCase() === 'ADMIN') || auth.actor.userDepartments.some((d) => d.toUpperCase() === 'ADMIN')
      if (!isLeader && !isAdmin && requisition.procurementAssigneeId !== auth.actorUserId) throw new Error('This requisition is assigned to another procurement member')
      if (requisition.items.length !== requested.size) throw new Error('One or more selected items do not belong to this requisition')
      for (const item of requisition.items) {
        const alreadyBilled = item.indentItems.reduce((sum, row) => sum + Number(row.quantity), 0)
        if (requested.get(item.id)!.quantity + alreadyBilled > item.finalQuantity + 0.0001) throw new Error(`Quantity exceeds remaining amount for ${item.materialName}`)
      }
      const previous = await tx.materialIndent.count({ where: { indentNo: { startsWith: `IND-${year}-` } } })
      const indentNo = `IND-${year}-${String(previous + 1).padStart(3, '0')}`
      const fallbackVendor = typeof body.vendorName === 'string' ? body.vendorName.trim() || null : null
      const lineData = requisition.items.map((item) => {
        const input = requested.get(item.id)!
        const total = input.quantity * input.unitPrice
        return {
          requisitionItemId: item.id,
          quantity: new Prisma.Decimal(input.quantity),
          unitPrice: new Prisma.Decimal(input.unitPrice),
          total: new Prisma.Decimal(total),
          vendorName: input.vendorName || fallbackVendor,
          billedById: auth.actorUserId,
        }
      })
      const subtotal = lineData.reduce((sum, row) => sum + Number(row.total), 0)
      const createdIndent = await tx.materialIndent.create({
        data: {
          indentNo,
          requisitionId: requisition.id,
          leadId: requisition.leadId,
          vendorName: fallbackVendor,
          transportCost: new Prisma.Decimal(transportCost),
          otherCosts: new Prisma.Decimal(otherCosts),
          subtotal: new Prisma.Decimal(subtotal),
          total: new Prisma.Decimal(subtotal + transportCost + otherCosts),
          notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
          createdById: auth.actorUserId,
          items: { create: lineData },
        },
        include: { items: true },
      })

      // Optionally / automatically create Purchase Order for Accounts review & dispatch
      if (body.createPurchaseOrder !== false) {
        const prevPoCount = await tx.purchaseOrder.count({
          where: { poNo: { startsWith: `PO-${year}-` } },
        })
        const poNo = `PO-${year}-${String(prevPoCount + 1).padStart(3, '0')}`
        await tx.purchaseOrder.create({
          data: {
            poNo,
            indentId: createdIndent.id,
            leadId: createdIndent.leadId,
            totalAmount: Number(createdIndent.total),
            supplierName: fallbackVendor || lineData[0]?.vendorName || null,
            notes: createdIndent.notes,
            createdById: auth.actorUserId,
            status: 'PENDING_ACCOUNTS_APPROVAL',
          },
        })
      }

      return createdIndent
    })
    const remainingItems = await prisma.materialRequisitionItem.findMany({ where: { requisitionId: body.requisitionId }, select: { finalQuantity: true, indentItems: { select: { quantity: true } } } })
    const fullyBilled = remainingItems.every((item) => item.indentItems.reduce((sum, row) => sum + Number(row.quantity), 0) >= item.finalQuantity - 0.0001)
    if (fullyBilled) await prisma.materialRequisition.update({ where: { id: body.requisitionId }, data: { status: 'FULFILLED' } })
    return NextResponse.json({ success: true, data: indent }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create indent' }, { status: 400 })
  }
}
