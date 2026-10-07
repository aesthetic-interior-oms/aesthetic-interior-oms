import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { LeadAssignmentDepartment } from '@/generated/prisma/client'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) return authResult.response

  const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
  const actorRoles = new Set(authResult.actorRoles.map((r) => r.trim().toLowerCase()))
  const canAccess =
    actorDepartments.has('ADMIN') ||
    actorDepartments.has('SR_CRM') ||
    actorDepartments.has('BOQ') ||
    actorRoles.has('admin')

  if (!canAccess) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      accountStatus: true,
      subStatus: true,
      quotationDrafts: {
        where: { draftKey: { startsWith: 'detail' } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { id: true, status: true },
      },
      materialRequisitions: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { status: true, _count: { select: { items: true } } },
      },
      assignments: {
        where: { department: LeadAssignmentDepartment.BOQ },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
    },
  })

  if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })

  return NextResponse.json({
    success: true,
    data: {
      accountStatus: lead.accountStatus,
      subStatus: lead.subStatus,
      detailQuotationStatus: lead.quotationDrafts[0]?.status ?? null,
      requisitionStatus: lead.materialRequisitions[0]?.status ?? 'NOT_STARTED',
      requisitionItemCount: lead.materialRequisitions[0]?._count.items ?? 0,
      assignment: lead.assignments[0] ?? null,
    },
  })
}
