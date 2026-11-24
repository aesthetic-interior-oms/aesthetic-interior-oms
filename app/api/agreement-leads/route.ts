import { LeadAssignmentDepartment, LeadStage, Prisma } from '@/generated/prisma/client'
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
    const actorRoleNames = authResult.actorRoles ?? []
    const isAdmin = departments.has('ADMIN')
    const isSeniorCrm = departments.has('SR_CRM')
    const isBoqLeader = actorRoleNames.some(
      (r) => r.trim().toUpperCase() === 'BOQ_TEAM_LEADER',
    )
    const isPc =
      departments.has('PROJECT_COORDINATOR') ||
      departments.has('PROJECT_CORDINATOR') ||
      actorRoleNames.some((r) => r.toUpperCase().includes('PROJECT_COORDINATOR'))
    const isAccounts =
      departments.has('ACCOUNTS') ||
      actorRoleNames.some((r) => r.toUpperCase().includes('ACCOUNTS'))

    if (!isAdmin && !isSeniorCrm && !isBoqLeader && !isPc && !isAccounts) {
      return NextResponse.json(
        { success: false, error: 'Only Admin, Senior CRM, Accounts, Project Coordinator, or BOQ Team Leader can access Agreement Leads' },
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

    const srScope: Prisma.LeadWhereInput =
      isSeniorCrm && !isAdmin && !isAccounts
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
        {
          stage: {
            in: [
              LeadStage.PROJECT_SETUP,
              LeadStage.MATERIAL_PLANNING,
              LeadStage.PROCUREMENT,
              LeadStage.SITE_EXECUTION,
              LeadStage.QUALITY_CHECK,
              LeadStage.HANDOVER,
            ],
          },
        },
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
        accountStatus: true,
        isSiteWorkActive: true,
        siteWorkStartedAt: true,
        updated_at: true,
        siteWorkRequests: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            status: true,
            note: true,
            rejectionReason: true,
            createdAt: true,
            reviewedAt: true,
            requestedBy: { select: { id: true, fullName: true, email: true } },
            reviewedBy: { select: { id: true, fullName: true, email: true } },
          },
        },
        quotationDrafts: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            draftKey: true,
            quotationType: true,
            grandTotal: true,
            content: true,
            status: true,
            updatedAt: true,
          },
        },
        assignments: {
          where: {
            department: {
              in: [
                LeadAssignmentDepartment.SR_CRM,
                LeadAssignmentDepartment.BOQ,
                LeadAssignmentDepartment.QUOTATION,
                LeadAssignmentDepartment.PROJECT_COORDINATOR,
                LeadAssignmentDepartment.SITE_ENGINEER,
              ],
            },
            user: { isActive: true },
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: {
            id: true,
            department: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        cadWorkSubmissions: {
          where: { department: LeadAssignmentDepartment.QUOTATION },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            versionNumber: true,
            versionName: true,
            note: true,
            createdAt: true,
            submittedBy: { select: { id: true, fullName: true } },
            files: {
              select: {
                id: true,
                fileName: true,
                url: true,
                fileType: true,
              },
            },
          },
        },
      },
    })

    const data = leads.map((lead) => {
      const detailDraft =
        lead.quotationDrafts.find((draft) => draft.status === 'FINALIZED' && isDetailQuotationContent(draft.content)) ||
        lead.quotationDrafts.find((draft) => isDetailQuotationContent(draft.content)) ||
        null

      let slotIndex = 1
      if (detailDraft?.draftKey) {
        if (detailDraft.draftKey.includes('slot:2')) slotIndex = 2
        else if (detailDraft.draftKey.includes('slot:3')) slotIndex = 3
        else slotIndex = 1
      }

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
        accountStatus: lead.accountStatus,
        slotIndex,
        originalQuotationTotal,
        discountApplied,
        settledAgreementValue,
        updatedAt: lead.updated_at.toISOString(),
        detailQuotationAvailable: Boolean(detailDraft),
        isSiteWorkActive: Boolean(lead.isSiteWorkActive),
        siteWorkStartedAt: lead.siteWorkStartedAt ? lead.siteWorkStartedAt.toISOString() : null,
        latestSiteWorkRequest: lead.siteWorkRequests[0]
          ? {
              id: lead.siteWorkRequests[0].id,
              status: lead.siteWorkRequests[0].status,
              note: lead.siteWorkRequests[0].note,
              rejectionReason: lead.siteWorkRequests[0].rejectionReason,
              createdAt: lead.siteWorkRequests[0].createdAt.toISOString(),
              reviewedAt: lead.siteWorkRequests[0].reviewedAt ? lead.siteWorkRequests[0].reviewedAt.toISOString() : null,
              requestedBy: lead.siteWorkRequests[0].requestedBy,
              reviewedBy: lead.siteWorkRequests[0].reviewedBy,
            }
          : null,
        siteWorkRequests: lead.siteWorkRequests.map((r) => ({
          id: r.id,
          status: r.status,
          note: r.note,
          rejectionReason: r.rejectionReason,
          createdAt: r.createdAt.toISOString(),
          reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
          requestedBy: r.requestedBy,
          reviewedBy: r.reviewedBy,
        })),
        srCrm: lead.assignments.find((assignment) => assignment.department === LeadAssignmentDepartment.SR_CRM)?.user ?? null,
        boqAssignee: lead.assignments.find((assignment) => assignment.department === LeadAssignmentDepartment.BOQ)?.user ?? null,
        pcAssignee: lead.assignments.find((assignment) => assignment.department === LeadAssignmentDepartment.PROJECT_COORDINATOR)?.user ?? null,
        siteEngineerAssignee: lead.assignments.find((assignment) => assignment.department === LeadAssignmentDepartment.SITE_ENGINEER)?.user ?? null,
        siteEngineerAssignees: lead.assignments
          .filter((assignment) => assignment.department === LeadAssignmentDepartment.SITE_ENGINEER)
          .map((a) => a.user),
        quotationAssignee: lead.assignments.find((assignment) => assignment.department === LeadAssignmentDepartment.QUOTATION)?.user ?? null,
        quotationVersionsCount: lead.quotationDrafts.filter((d) => d.draftKey.includes('version:')).length,
        quotationSubmissions: lead.cadWorkSubmissions.map((sub) => ({
          id: sub.id,
          versionNumber: sub.versionNumber,
          versionName: sub.versionName,
          note: sub.note,
          createdAt: sub.createdAt.toISOString(),
          submittedBy: sub.submittedBy ? { id: sub.submittedBy.id, fullName: sub.submittedBy.fullName } : null,
          files: sub.files.map((f) => ({ id: f.id, fileName: f.fileName, url: f.url, fileType: f.fileType })),
        })),
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
