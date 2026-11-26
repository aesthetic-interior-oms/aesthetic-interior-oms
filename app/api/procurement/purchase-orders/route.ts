import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { canCreatePO, canVerifyPOLeadStage, canViewPO, isAccountsUser } from '@/lib/purchase-order'
import { notifyPOLeadVerifiers } from '@/lib/po-notifications'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response

  const roles = auth.actorRoles ?? []
  const departments = auth.actor.userDepartments ?? []

  if (!canViewPO(roles, departments)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const leadId = params.get('leadId')
  const indentId = params.get('indentId')
  const statusParam = params.get('status')

  const isAccountsOnly =
    isAccountsUser(departments) &&
    !canVerifyPOLeadStage(roles, departments) &&
    !canCreatePO(roles, departments)

  const where: Record<string, unknown> = {}
  if (leadId) where.leadId = leadId
  if (indentId) where.indentId = indentId
  if (statusParam && statusParam !== 'ALL') {
    where.status = statusParam
  } else if (isAccountsOnly) {
    // Accounts should only see POs after Procurement Leader / PC / Admin verification
    where.status = { not: 'PENDING_LEAD_APPROVAL' }
  }

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where,
    include: {
      lead: { select: { id: true, name: true, location: true, phone: true } },
      indent: {
        include: {
          items: {
            include: {
              requisitionItem: {
                select: { materialName: true, unit: true, workCategory: true, status: true },
              },
            },
          },
        },
      },
      createdBy: { select: { fullName: true } },
      leadVerifiedBy: { select: { fullName: true } },
      approvedBy: { select: { fullName: true } },
      rejectedBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: purchaseOrders })
}

export async function POST(request: NextRequest) {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response

  const roles = auth.actorRoles ?? []
  const departments = auth.actor.userDepartments ?? []

  if (!canCreatePO(roles, departments)) {
    return NextResponse.json({ error: 'Only Procurement team can create Purchase Orders' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body.indentId !== 'string') {
    return NextResponse.json({ error: 'indentId is required' }, { status: 400 })
  }

  const supplierName = typeof body.supplierName === 'string' ? body.supplierName.trim() || null : null
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

  try {
    const po = await prisma.$transaction(async (tx) => {
      // Lock on year for serial numbering
      const year = new Date().getFullYear()
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`purchase-order-${year}`}))`

      const indent = await tx.materialIndent.findUnique({
        where: { id: body.indentId },
        include: { purchaseOrder: true },
      })

      if (!indent) throw new Error('Indent not found')
      if (indent.purchaseOrder) throw new Error('A Purchase Order already exists for this indent')

      const prevCount = await tx.purchaseOrder.count({
        where: { poNo: { startsWith: `PO-${year}-` } },
      })
      const poNo = `PO-${year}-${String(prevCount + 1).padStart(3, '0')}`

      return tx.purchaseOrder.create({
        data: {
          poNo,
          indentId: indent.id,
          leadId: indent.leadId,
          status: 'PENDING_LEAD_APPROVAL',
          totalAmount: Number(indent.total),
          supplierName,
          notes,
          createdById: auth.actorUserId,
        },
        include: {
          createdBy: { select: { fullName: true } },
        },
      })
    })

    await notifyPOLeadVerifiers({
      leadId: po.leadId,
      poNo: po.poNo,
      totalAmount: po.totalAmount,
      createdById: auth.actorUserId,
    })

    return NextResponse.json({ success: true, data: po }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Purchase Order' },
      { status: 400 },
    )
  }
}
