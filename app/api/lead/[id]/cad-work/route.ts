import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { getJrArchitectWorkflowControlState } from '@/lib/jr-architect-workflow-control'
import { LeadStage } from '@/generated/prisma/client'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

const LOCKED_STAGES_FOR_RESUBMISSION = new Set<LeadStage>([
  LeadStage.QUOTATION_PHASE,
  LeadStage.PARTIAL_QUOTATION_PHASE,
  LeadStage.BUDGET_PHASE,
  LeadStage.VISUALIZATION_PHASE,
  LeadStage.CONVERSION,
  LeadStage.CLOSED,
])

async function resolveLeadId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params
  const id = resolvedParams?.id
  if (typeof id !== 'string') return null
  const trimmed = id.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
    }

    const [lead, submissions, workflowControl] = await Promise.all([
      prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          name: true,
          stage: true,
          subStatus: true,
          visits: {
            where: { status: 'COMPLETED' },
            orderBy: { scheduledAt: 'desc' },
            take: 1,
            select: { projectSqft: true },
          },
        },
      }),
      prisma.cadWorkSubmission.findMany({
        where: { leadId },
        orderBy: [{ submittedAt: 'desc' }, { versionNumber: 'desc' }],
        include: {
          submittedBy: {
            select: { id: true, fullName: true, email: true },
          },
          files: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      getJrArchitectWorkflowControlState(),
    ])

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    const completeResubmissionEnabled = workflowControl.completeResubmissionEnabled
    const isStageLocked = LOCKED_STAGES_FOR_RESUBMISSION.has(lead.stage)
    const canSubmit = completeResubmissionEnabled || !isStageLocked

    const existingProjectSqft = lead.visits?.[0]?.projectSqft ?? null

    return NextResponse.json({
      success: true,
      data: {
        lead: {
          id: lead.id,
          name: lead.name,
          stage: lead.stage,
          subStatus: lead.subStatus,
          projectSqft: existingProjectSqft,
        },
        submissions,
        nextVersionNumber: submissions.length + 1,
        completeResubmissionEnabled,
        canSubmit,
        isStageLocked,
        currentUserId: authResult.actorUserId,
      },
    })
  } catch (error) {
    console.error('[lead/:id/cad-work][GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch CAD submissions' }, { status: 500 })
  }
}
