import { NextRequest, NextResponse } from 'next/server'
import { LeadAssignmentDepartment, LeadStage, LeadSubStatus, Prisma } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toPositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

function toBooleanParam(value: string | null, fallback = false): boolean {
  const normalized = toOptionalString(value)?.toLowerCase()
  if (!normalized) return fallback
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}


function parseVisitMonth(value: string | null): { start: Date; end: Date } | null {
  const normalized = toOptionalString(value)
  if (!normalized || normalized === 'NO_VISIT_DATE') return null
  const match = /^(\d{4})-(\d{2})$/.exec(normalized)
  if (!match) return null
  const year = Number.parseInt(match[1], 10)
  const monthIndex = Number.parseInt(match[2], 10) - 1
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return null
  return {
    start: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0)),
  }
}

function getAuthorizedFileUrl(fileId: string): string {
  return `/api/cad-work/submission-files/${fileId}/download`
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const isAdmin = actorDepartments.has('ADMIN')
    const isSeniorCrm = actorDepartments.has('SR_CRM')

    if (!isAdmin && !isSeniorCrm) {
      return NextResponse.json(
        { success: false, error: 'Only Senior CRM or Admin can access review center' },
        { status: 403 },
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(toPositiveInt(searchParams.get('limit'), 20), 60)
    const offset = toPositiveInt(searchParams.get('offset'), 0)
    const search = toOptionalString(searchParams.get('search'))
    const myLeadsOnly = toBooleanParam(searchParams.get('myLeadsOnly'), true)
    const srCrmId = toOptionalString(searchParams.get('srCrmId'))
    const visitMonth = toOptionalString(searchParams.get('visitMonth'))
    const visitMonthRange = parseVisitMonth(visitMonth)

    if (visitMonth && visitMonth !== 'NO_VISIT_DATE' && !visitMonthRange) {
      return NextResponse.json({ success: false, error: 'Invalid visitMonth' }, { status: 400 })
    }

    const scopeToAssignedSrLeads = !isAdmin || myLeadsOnly

    const reviewableLeadScope: Prisma.LeadWhereInput = {
      OR: [
        { stage: LeadStage.CAD_PHASE, subStatus: LeadSubStatus.CAD_COMPLETED },
        { stage: LeadStage.QUOTATION_PHASE, subStatus: LeadSubStatus.QUOTATION_COMPLETED },
        { stage: LeadStage.VISUALIZATION_PHASE, subStatus: LeadSubStatus.VISUAL_COMPLETED },
      ],
      ...(scopeToAssignedSrLeads
        ? {
            assignments: {
              some: {
                userId: authResult.actorUserId,
                department: LeadAssignmentDepartment.SR_CRM,
              },
            },
          }
        : srCrmId
          ? {
              assignments: {
                some: {
                  userId: srCrmId,
                  department: LeadAssignmentDepartment.SR_CRM,
                },
              },
            }
          : {}),
      ...(visitMonth === 'NO_VISIT_DATE'
        ? {
            visits: {
              none: { status: 'COMPLETED' },
            },
          }
        : visitMonthRange
          ? {
              visits: {
                some: {
                  status: 'COMPLETED',
                  scheduledAt: {
                    gte: visitMonthRange.start,
                    lt: visitMonthRange.end,
                  },
                },
              },
            }
          : {}),
    }

    const where: Prisma.CadWorkSubmissionWhereInput = {
      lead: reviewableLeadScope,
      ...(search
        ? {
            OR: [
              { lead: { name: { contains: search, mode: 'insensitive' } } },
              { lead: { phone: { contains: search, mode: 'insensitive' } } },
              { files: { some: { fileName: { contains: search, mode: 'insensitive' } } } },
              { note: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [total, submissions] = await Promise.all([
      prisma.cadWorkSubmission.count({ where }),
      prisma.cadWorkSubmission.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              location: true,
              stage: true,
              subStatus: true,
              assignments: {
                where: { department: LeadAssignmentDepartment.SR_CRM },
                take: 1,
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                },
              },
              visits: {
                where: { status: 'COMPLETED' },
                orderBy: { scheduledAt: 'desc' },
                take: 1,
                select: {
                  id: true,
                  scheduledAt: true,
                },
              },
            },
          },
          submittedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          files: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ])

    const latestSubmissionByLead = new Set<string>()
    const latestSubmissions = submissions.filter((submission) => {
      if (latestSubmissionByLead.has(submission.leadId)) return false
      latestSubmissionByLead.add(submission.leadId)
      return true
    })

    const withReadableUrls = await Promise.all(
      latestSubmissions.map(async (submission) => {
        const srCrmAssignment = submission.lead.assignments[0] ?? null
        const latestCompletedVisit = submission.lead.visits[0] ?? null

        return {
          ...submission,
          lead: {
            id: submission.lead.id,
            name: submission.lead.name,
            phone: submission.lead.phone,
            location: submission.lead.location,
            stage: submission.lead.stage,
            subStatus: submission.lead.subStatus,
            srCrmAssignment,
            latestCompletedVisit,
          },
          files: await Promise.all(
            submission.files.map(async (file) => ({
              ...file,
              url: getAuthorizedFileUrl(file.id),
            })),
          ),
        }
      }),
    )

    const nextOffset = offset + latestSubmissions.length
    const hasMore = nextOffset < total

    return NextResponse.json({
      success: true,
      data: withReadableUrls,
      meta: {
        total,
        limit,
        offset,
        nextOffset: hasMore ? nextOffset : null,
        hasMore,
      },
    })
  } catch (error) {
    console.error('[cad-work/review-center][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch review submissions' },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, OPTIONS',
    },
  })
}
