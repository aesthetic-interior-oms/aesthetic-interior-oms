import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

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
    if (!authResult.ok) {
      return authResult.response
    }

    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        agreementValue: true,
        initialAgreementValue: true,
        budget: true,
        quotationDrafts: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            draftKey: true,
            grandTotal: true,
            updatedAt: true,
            content: true,
          },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    const logs = await prisma.agreementValueLog.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    const initialValue = lead.initialAgreementValue ?? lead.agreementValue ?? lead.budget ?? 0
    const currentAgreementValue = lead.agreementValue ?? lead.budget ?? 0
    const adjustmentTotal = logs.reduce((sum: number, log: any) => sum + log.amount, 0)

    return NextResponse.json({
      success: true,
      leadName: lead.name,
      initialAgreementValue: initialValue,
      currentAgreementValue,
      adjustmentTotal,
      logs,
      quotationDrafts: lead.quotationDrafts ?? [],
    })
  } catch (error) {
    console.error('Error fetching agreement value logs:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch agreement logs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) {
      return authResult.response
    }

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    if (!actorDepartments.has('ACCOUNTS') && !actorDepartments.has('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Accounts or Admin permission required' }, { status: 403 })
    }

    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const rawAmount = Number(body?.amount)
    const targetAgreementValue = body?.targetAgreementValue != null ? Number(body.targetAgreementValue) : null
    const note = typeof body?.note === 'string' ? body.note.trim() : ''
    const quotationDraftId = typeof body?.quotationDraftId === 'string' ? body.quotationDraftId.trim() : null
    const versionTitle = typeof body?.versionTitle === 'string' ? body.versionTitle.trim() : null

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        agreementValue: true,
        initialAgreementValue: true,
        budget: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    const currentBaseValue = lead.agreementValue ?? lead.budget ?? 0

    let amount = 0
    let newAgreementValue = currentBaseValue

    if (targetAgreementValue != null && Number.isFinite(targetAgreementValue) && targetAgreementValue >= 0) {
      newAgreementValue = targetAgreementValue
      amount = targetAgreementValue - currentBaseValue
    } else if (Number.isFinite(rawAmount) && rawAmount !== 0) {
      amount = rawAmount
      newAgreementValue = currentBaseValue + amount
    } else {
      return NextResponse.json({ success: false, error: 'Please provide a valid adjustment amount or target agreement value' }, { status: 400 })
    }

    // Freeze initialAgreementValue if not set yet
    const initialAgreementValue = lead.initialAgreementValue ?? currentBaseValue

    const [newLog, updatedLead] = await prisma.$transaction([
      prisma.agreementValueLog.create({
        data: {
          leadId,
          quotationDraftId: quotationDraftId || null,
          versionTitle: versionTitle || null,
          amount,
          note: note || null,
          createdById: authResult.actor.id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: {
          agreementValue: newAgreementValue,
          initialAgreementValue,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Agreement value updated successfully',
      log: newLog,
      updatedAgreementValue: updatedLead.agreementValue,
    })
  } catch (error) {
    console.error('Error logging agreement value update:', error)
    return NextResponse.json({ success: false, error: 'Failed to update agreement value' }, { status: 500 })
  }
}
