import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { canViewPO } from '@/lib/purchase-order'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { leadId } = await params
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      assignments: {
        include: {
          user: { select: { id: true, fullName: true, phone: true } },
        },
      },
      materialRequisitions: {
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { fullName: true } },
          procurementAssignee: { select: { id: true, fullName: true } },
          _count: { select: { items: true } },
          indents: {
            orderBy: { createdAt: 'desc' },
            include: {
              createdBy: { select: { fullName: true } },
              purchaseOrder: {
                include: {
                  createdBy: { select: { fullName: true } },
                  approvedBy: { select: { fullName: true } },
                  rejectedBy: { select: { fullName: true } },
                },
              },
            },
          },
        },
      },
      siteDeliveryLogs: {
        orderBy: { deliveryDate: 'desc' },
        take: 20,
        include: {
          receivedBy: { select: { fullName: true } },
        },
      },
      vendorAgreements: {
        where: { workCategory: 'CEILING' },
        include: {
          vendor: { select: { vendorName: true, vendorCompanyName: true } },
          createdBy: { select: { fullName: true } },
        },
      },
    },
  })

  if (!lead) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const roles = auth.actorRoles ?? []
  const departments = auth.actor.userDepartments ?? []

  return NextResponse.json({
    success: true,
    data: lead,
    permissions: {
      canViewPO: canViewPO(roles, departments),
      currentUserId: auth.actorUserId,
    },
  })
}
