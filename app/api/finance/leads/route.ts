import prisma from '@/lib/prisma';
import { LeadAssignmentDepartment, LeadStage, Prisma } from '@/generated/prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { requireDatabaseRoles } from '@/lib/authz';

export const runtime = 'nodejs';

// Only stages at or after Quotation Phase should appear in the Finance project picker
const POST_QUOTATION_STAGES: LeadStage[] = [
  LeadStage.QUOTATION_PHASE,
  LeadStage.BUDGET_PHASE,
  LeadStage.VISUALIZATION_PHASE,
  LeadStage.CONVERSION,
  LeadStage.CLOSED,
];

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([]);
    if (!authResult.ok) return authResult.response;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim() || '';
    const srCrmUserId = searchParams.get('srCrmId')?.trim() || '';

    const where: Prisma.LeadWhereInput = {
      stage: { in: POST_QUOTATION_STAGES },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(srCrmUserId
        ? {
            assignments: {
              some: {
                department: LeadAssignmentDepartment.SR_CRM,
                userId: srCrmUserId,
              },
            },
          }
        : {}),
    };

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      take: 200,
      select: {
        id: true,
        name: true,
        phone: true,
        location: true,
        stage: true,
        subStatus: true,
        assignments: {
          where: { department: LeadAssignmentDepartment.SR_CRM },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            user: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    const enriched = leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      location: lead.location,
      stage: lead.stage,
      subStatus: lead.subStatus,
      srCrm: lead.assignments[0]?.user?.fullName ?? null,
      srCrmId: lead.assignments[0]?.user?.id ?? null,
    }));

    // Collect distinct SR CRMs for the filter dropdown
    const srCrmMap = new Map<string, string>();
    for (const lead of enriched) {
      if (lead.srCrmId && lead.srCrm) {
        srCrmMap.set(lead.srCrmId, lead.srCrm);
      }
    }
    const srCrms = Array.from(srCrmMap.entries()).map(([id, name]) => ({ id, name }));

    return NextResponse.json({ success: true, data: enriched, srCrms });
  } catch (error) {
    console.error('[GET /api/finance/leads]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch finance leads' }, { status: 500 });
  }
}
