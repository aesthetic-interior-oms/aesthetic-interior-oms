import { LeadAssignmentDepartment, LeadStage, LeadSubStatus, Prisma } from '@/generated/prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { calculateQuotationTotals, normalizeQuotationContent } from '@/lib/quotation-calculations'
import { isDetailQuotationContent } from '@/lib/quotation-document'
import type { QuotationDraftContent } from '@/lib/quotation-types'

function toOptionalString(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const departments = new Set(authResult.actor.userDepartments ?? [])
    const isAdmin = departments.has('ADMIN')
    const isSeniorCrm = departments.has('SR_CRM')

    if (!isAdmin && !isSeniorCrm) {
      return NextResponse.json(
        { success: false, error: 'Only Admin or Senior CRM can access Agreement Leads' },
        { status: 403 },
      )
    }

    const search = toOptionalString(request.nextUrl.searchParams.get('search'))
    const searchScope: Prisma.LeadWhereInput | null = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
          ],
        }
      : null

    // Match the existing Conversion & Payment visibility rule:
    // Senior CRM members see their assigned leads; Admin sees all.
    const srScope: Prisma.LeadWhereInput =
      isSeniorCrm && !isAdmin
        ? {
            assignments: {
              some: {
                department: LeadAssignmentDepartment.SR_CRM,
                userId: authResult.actorUserId,
              },
            },
          }
        : {}

    const phaseScope: Prisma.LeadWhereInput = {
      OR: [
        { stage: LeadStage.CONVERSION },
        { agreementType: { not: null } },
      ],
    }

    const leads = await prisma.lead.findMany({
      where: {
        AND: [phaseScope, srScope, ...(searchScope ? [searchScope] : [])],
      },
      orderBy: { updated_at: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        location: true,
        stage: true,
        subStatus: true,
        agreementType: true,
        agreementValue: true,
        initialAgreementValue: true,
        updated_at: true,
        quotationDrafts: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            draftKey: true,
            quotationType: true,
            grandTotal: true,
            content: true,
            updatedAt: true,
          },
        },
        assignments: {
          where: {
            department: LeadAssignmentDepartment.SR_CRM,
            user: { isActive: true },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    })

    const data = leads.map((lead) => {
      const detailDraft = lead.quotationDrafts.find((draft) => {
        return isDetailQuotationContent(draft.content)
      }) ?? null

      let originalQuotationTotal = detailDraft?.grandTotal ?? 0
      let discountApplied = 0

      if (detailDraft && isDetailQuotationContent(detailDraft.content)) {
        const content = normalizeQuotationContent(detailDraft.content as QuotationDraftContent)
        const totals = calculateQuotationTotals(content)
        originalQuotationTotal = totals.subtotal
        discountApplied = Math.max(0, Number(content.discountAmount) || 0)
      }

      const settledAgreementValue =
        lead.agreementValue ??
        (originalQuotationTotal > 0 ? Math.max(0, originalQuotationTotal - discountApplied) : null)

      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        location: lead.location,
        stage: lead.stage,
        subStatus: lead.subStatus,
        agreementType: lead.agreementType,
        originalQuotationTotal,
        discountApplied,
        settledAgreementValue,
        updatedAt: lead.updated_at.toISOString(),
        detailQuotationAvailable: Boolean(detailDraft),
        srCrm: lead.assignments[0]?.user ?? null,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[agreement-leads][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Agreement Leads' },
      { status: 500 },
    )
  }
}
