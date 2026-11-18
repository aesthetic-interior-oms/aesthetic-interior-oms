import { LeadAssignmentDepartment, LeadStage, Prisma } from '@/generated/prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { calculateQuotationTotals, normalizeQuotationContent } from '@/lib/quotation-calculations'
import { isDetailQuotationContent } from '@/lib/quotation-document'
import { defaultAgreementContent, parseAgreementContent } from '@/lib/agreement-template'
import { ensureDepartmentAssignment } from '@/lib/lead-handoff'
import { promoteLeadToProduction } from '@/lib/production-workflow'
import { isProjectCoordinatorHead } from '@/lib/production-module'
import type { QuotationDraftContent } from '@/lib/quotation-types'

async function authorizedLead(leadId: string) {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return { response: auth.response } as const
  const departments = new Set(auth.actor.userDepartments ?? [])
  const actorRoleNames = auth.actorRoles ?? []
  const isAdmin = departments.has('ADMIN')
  const isSenior = departments.has('SR_CRM')
  const isBoqLeader = actorRoleNames.some((r) => r.trim().toUpperCase() === 'BOQ_TEAM_LEADER')
  const isPc = isProjectCoordinatorHead({ departments, roles: actorRoleNames })
  if (!isAdmin && !isSenior && !isBoqLeader && !isPc) {
    return { response: NextResponse.json({ success: false, error: 'Only Admin, Senior CRM, Project Coordinator, or BOQ Team Leader can access Agreement Leads' }, { status: 403 }) } as const
  }
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      OR: [{ stage: LeadStage.CONVERSION }, { agreementType: { not: null } }],
      ...(isSenior && !isAdmin ? { assignments: { some: { department: LeadAssignmentDepartment.SR_CRM, userId: auth.actorUserId } } } : {}),
    },
    include: {
      agreementDocument: true,
      quotationDrafts: { orderBy: { updatedAt: 'desc' }, select: { id: true, content: true, status: true, grandTotal: true, draftKey: true } },
      assignments: { where: { department: LeadAssignmentDepartment.SR_CRM }, orderBy: { createdAt: 'desc' }, take: 1, include: { user: { select: { fullName: true } } } },
    },
  })
  if (!lead) return { response: NextResponse.json({ success: false, error: 'Agreement lead not found' }, { status: 404 }) } as const
  return { auth, lead } as const
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params
    const access = await authorizedLead(leadId)
    if ('response' in access) return access.response
    const draft = access.lead.quotationDrafts.find((item) => item.status === 'FINALIZED' && isDetailQuotationContent(item.content))
      ?? access.lead.quotationDrafts.find((item) => isDetailQuotationContent(item.content))
      ?? null
    const quotation = draft ? normalizeQuotationContent(draft.content as QuotationDraftContent) : null
    const totals = quotation ? calculateQuotationTotals(quotation) : null
    const agreement = parseAgreementContent(access.lead.agreementDocument?.content) ?? defaultAgreementContent({
      leadId,
      name: access.lead.name,
      location: access.lead.location,
      srCrmName: access.lead.assignments[0]?.user.fullName,
      agreementValue: access.lead.agreementValue ?? totals?.grandTotal,
    })
    if (!agreement.agreementValue) agreement.agreementValue = String(access.lead.agreementValue ?? totals?.grandTotal ?? '')
    return NextResponse.json({ success: true, data: { agreement, quotation, totals, client: { id: leadId, name: access.lead.name, phone: access.lead.phone, email: access.lead.email, location: access.lead.location }, updatedAt: access.lead.agreementDocument?.updatedAt ?? null } })
  } catch (error) {
    console.error('[agreement-leads][detail][GET]', error)
    return NextResponse.json({ success: false, error: 'Failed to load agreement' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params
    const access = await authorizedLead(leadId)
    if ('response' in access) return access.response
    const payload = await request.json()
    const content = parseAgreementContent(payload?.agreement)
    if (!content) return NextResponse.json({ success: false, error: 'Agreement content is invalid' }, { status: 400 })
    const saved = await prisma.agreementDocument.upsert({
      where: { leadId },
      create: { leadId, content: content as Prisma.InputJsonValue, createdById: access.auth.actorUserId },
      update: { content: content as Prisma.InputJsonValue, updatedById: access.auth.actorUserId },
      select: { updatedAt: true },
    })
    return NextResponse.json({ success: true, updatedAt: saved.updatedAt })
  } catch (error) {
    console.error('[agreement-leads][detail][PUT]', error)
    return NextResponse.json({ success: false, error: 'Failed to save agreement' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params
    const access = await authorizedLead(leadId)
    if ('response' in access) return access.response
    const body = await request.json()
    const { agreementType } = body
    if (!agreementType || typeof agreementType !== 'string') {
      return NextResponse.json({ success: false, error: 'Valid agreementType is required' }, { status: 400 })
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { agreementType },
      select: { id: true, agreementType: true },
    })

    // Promote to Production Level (auto-assigns Project Coordinator and BOQ Team oversight)
    await promoteLeadToProduction({
      leadId,
      actorUserId: access.auth.actorUserId,
      note: `Agreement type set to ${agreementType.replace(/_/g, ' ')}`,
    }).catch((err) => {
      console.error('[agreement-leads][PATCH] Failed to promote lead to production:', err)
    })

    await prisma.activityLog.create({
      data: {
        leadId,
        userId: access.auth.actorUserId,
        type: 'STATUS_CHANGE',
        description: `Agreement type changed to ${agreementType.replace(/_/g, ' ')}`,
      },
    }).catch(() => null)

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[agreement-leads][detail][PATCH]', error)
    return NextResponse.json({ success: false, error: 'Failed to update agreement type' }, { status: 500 })
  }
}
