import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { processAgreementAndDiscountSync } from '@/lib/agreement-discount-sync'
import { LeadAssignmentDepartment, LeadStage, LeadSubStatus } from '@/generated/prisma/client'

export async function POST(req: Request) {
  try {
    const authResult = await requireDatabaseRoles(['ADMIN'])
    if (!authResult.ok) {
      return authResult.response
    }
    const actor = authResult.actor

    const body = await req.json()
    const { leadId, srCrmId, visualizer3dId, agreementType, agreementValue, discount, discountAmount } = body

    if (!leadId || !agreementType) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    const discountInput = discountAmount !== undefined ? Number(discountAmount) : discount !== undefined ? Number(discount) : null
    const rawAgreementValue = agreementValue !== undefined && agreementValue !== null && agreementValue !== '' ? Number(agreementValue) : null

    const syncResult = await processAgreementAndDiscountSync({
      tx: prisma,
      leadId,
      actorUserId: actor.id,
      agreementValueInput: rawAgreementValue,
      discountAmountInput: discountInput,
    })

    const finalAgreementValue = syncResult.settledAgreementValue ?? (rawAgreementValue ?? 0)

    // 1. Update Lead
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        agreementType,
        agreementValue: finalAgreementValue,
        accountStatus: 'PENDING',
        stage: LeadStage.CONVERSION,
        subStatus: LeadSubStatus.CLIENT_CONFIRMED,
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
            department: LeadAssignmentDepartment.SR_CRM,
            userId: srCrmId,
          }
        },
        update: {},
        create: {
          leadId,
          department: LeadAssignmentDepartment.SR_CRM,
          userId: srCrmId,
        }
      })
    }

    if (visualizer3dId) {
      await prisma.leadAssignment.upsert({
        where: {
          leadId_department_userId: {
            leadId,
            department: LeadAssignmentDepartment.VISUALIZER_3D,
            userId: visualizer3dId,
          }
        },
        update: {},
        create: {
          leadId,
          department: LeadAssignmentDepartment.VISUALIZER_3D,
          userId: visualizer3dId,
        }
      })
    }

    const accountsUser = await prisma.user.findFirst({
      where: {
        isActive: true,
        userDepartments: { some: { department: { name: 'ACCOUNTS' } } },
      },
      select: { id: true },
      orderBy: [{ fullName: 'asc' }, { created_at: 'asc' }],
    })

    if (accountsUser) {
      await prisma.leadAssignment.upsert({
        where: {
          leadId_department_userId: {
            leadId,
            department: LeadAssignmentDepartment.ACCOUNTS,
            userId: accountsUser.id,
          },
        },
        update: {},
        create: {
          leadId,
          department: LeadAssignmentDepartment.ACCOUNTS,
          userId: accountsUser.id,
        },
      })
    }

    // 3. Log Activity
    await prisma.activityLog.create({
      data: {
        leadId,
        userId: actor.id,
        type: 'NOTE',
        description: `Agreement confirmed: Type ${agreementType}, Value ${finalAgreementValue}. Sent to Accounts pending first transaction before 3D Visualizer release.`,
      }
    })

    return NextResponse.json({ success: true, lead: updatedLead })
  } catch (error: unknown) {
    console.error('[finance/start] error:', error)
    const message = error instanceof Error ? error.message : 'Failed to start finance'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
