import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireDatabaseRoles(['admin'])
  if (!authResult.ok) return authResult.response

  const { id } = await params
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      accountStatus: true,
      subStatus: true,
      quotationDrafts: {
        where: { draftKey: 'detail' },
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
        where: { department: 'BOQ' },
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
