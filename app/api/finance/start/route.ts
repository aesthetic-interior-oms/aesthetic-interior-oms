import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'

export async function POST(req: Request) {
  try {
    const authResult = await requireDatabaseRoles(['ADMIN'])
    if (!authResult.ok) {
      return authResult.response
    }
    const actor = authResult.actor

    const body = await req.json()
    const { leadId, srCrmId, visualizer3dId, agreementType, agreementValue } = body

    if (!leadId || !agreementType || agreementValue === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    // 1. Update Lead
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        agreementType,
        agreementValue: Number(agreementValue),
        accountStatus: 'PENDING',
        stage: 'VISUALIZATION_PHASE',
        subStatus: 'VISUAL_ASSIGNED',
        ...(srCrmId ? { primaryOwnerUserId: srCrmId, assignedTo: srCrmId } : {}),
      },
    })

    // 2. Upsert Lead Assignments for SR_CRM and VISUALIZER_3D
    if (srCrmId) {
      // Find existing SR_CRM assignment for this lead if any, we want to replace it ideally, but let's just upsert
      // Wait, there might be multiple, but upsert with compound unique key is safe.
      await prisma.leadAssignment.upsert({
        where: {
          leadId_department_userId: {
            leadId,
            department: 'SR_CRM',
            userId: srCrmId,
          }
        },
        update: {},
        create: {
          leadId,
          department: 'SR_CRM',
          userId: srCrmId,
        }
      })
    }

    if (visualizer3dId) {
      await prisma.leadAssignment.upsert({
        where: {
          leadId_department_userId: {
            leadId,
            department: 'VISUALIZER_3D',
            userId: visualizer3dId,
          }
        },
        update: {},
        create: {
          leadId,
          department: 'VISUALIZER_3D',
          userId: visualizer3dId,
        }
      })
    }

    // 3. Log Activity
    await prisma.activityLog.create({
      data: {
        leadId,
        userId: actor.id,
        type: 'NOTE',
        description: `Finance started: Agreement Type ${agreementType}, Value ${agreementValue}. Moved to Visualization Phase.`,
      }
    })

    return NextResponse.json({ success: true, lead: updatedLead })
  } catch (error: any) {
    console.error('[finance/start] error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
