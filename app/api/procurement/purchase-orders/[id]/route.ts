import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { canApprovePO } from '@/lib/purchase-order'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response

  const roles = auth.actorRoles ?? []
  const departments = auth.actor.userDepartments ?? []

  const body = await request.json().catch(() => null)
  if (!body || !['APPROVED', 'REJECTED'].includes(body.action)) {
    return NextResponse.json({ error: 'action must be APPROVED or REJECTED' }, { status: 400 })
  }

  // Only Accounts can approve/reject
  if (!canApprovePO(roles, departments)) {
    return NextResponse.json({ error: 'Only Accounts team can approve or reject Purchase Orders' }, { status: 403 })
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id } })
  if (!po) return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 })
  if (po.status !== 'PENDING_ACCOUNTS_APPROVAL') {
    return NextResponse.json({ error: `Purchase Order is already ${po.status}` }, { status: 409 })
  }

  if (body.action === 'REJECTED' && !body.rejectionReason?.trim()) {
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data:
      body.action === 'APPROVED'
        ? {
            status: 'APPROVED',
            approvedById: auth.actorUserId,
            approvedAt: new Date(),
            accountsNote: body.accountsNote?.trim() || null,
          }
        : {
            status: 'REJECTED',
            rejectedById: auth.actorUserId,
            rejectedAt: new Date(),
            rejectionReason: body.rejectionReason.trim(),
            accountsNote: body.accountsNote?.trim() || null,
          },
    include: {
      approvedBy: { select: { fullName: true } },
      rejectedBy: { select: { fullName: true } },
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      indent: {
        include: {
          items: {
            include: {
              requisitionItem: {
                select: { materialName: true, unit: true, workCategory: true, specifications: true },
              },
            },
          },
          createdBy: { select: { fullName: true } },
        },
      },
      createdBy: { select: { fullName: true } },
      approvedBy: { select: { fullName: true } },
      rejectedBy: { select: { fullName: true } },
      lead: { select: { id: true, name: true, location: true } },
    },
  })

  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: po })
}
