import { LeadAssignmentDepartment, LeadStage, Prisma } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { ensureDepartmentAssignment } from '@/lib/lead-handoff'
import { POST_AGREEMENT_PRODUCTION_STAGES } from '@/lib/production-module'
import { sendPushToUser } from '@/lib/fcm-service'

export interface PromoteToProductionInput {
  leadId: string
  actorUserId?: string | null
  preferredPcUserId?: string | null
  preferredBoqUserId?: string | null
  note?: string | null
  targetStage?: LeadStage
  tx?: Prisma.TransactionClient
}

export interface PromoteToProductionResult {
  success: boolean
  alreadyInProduction: boolean
  stageChanged: boolean
  newStage: LeadStage
  pcUserId: string | null
  boqUserId: string | null
  message: string
}

/**
 * Promotes/transitions a Lead into the Production Level post-agreement.
 * Automatically provisions oversight assignments for both top-level heads:
 * 1. Project Coordinator (Execution & site oversight)
 * 2. BOQ Team Leader / Member (Estimation & requisition oversight)
 */
export async function promoteLeadToProduction(
  input: PromoteToProductionInput,
): Promise<PromoteToProductionResult> {
  const { leadId, actorUserId, preferredPcUserId, preferredBoqUserId, note, targetStage } = input

  const runWithTx = async (tx: Prisma.TransactionClient): Promise<PromoteToProductionResult> => {
    const lead = await tx.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        stage: true,
        agreementType: true,
        agreementValue: true,
        assignments: {
          select: {
            id: true,
            userId: true,
            department: true,
          },
        },
      },
    })

    if (!lead) {
      throw new Error(`Lead with id "${leadId}" not found.`)
    }

    const currentStage = lead.stage
    const isAlreadyPostAgreement = (POST_AGREEMENT_PRODUCTION_STAGES as readonly LeadStage[]).includes(currentStage)

    // Determine target production stage: if not post-agreement, advance to PROJECT_SETUP
    const nextStage = targetStage ?? (isAlreadyPostAgreement ? currentStage : LeadStage.PROJECT_SETUP)
    const stageChanged = currentStage !== nextStage

    // Update lead stage if needed
    if (stageChanged) {
      await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: nextStage,
        },
      })

      if (actorUserId) {
        await tx.leadStatusHistory.create({
          data: {
            leadId,
            changedById: actorUserId,
            oldStatus: currentStage,
            newStatus: nextStage,
          },
        }).catch(() => null)
      }
    }

    // 1. Auto-assign Project Coordinator (Production Execution Head)
    const pcAssignment = await ensureDepartmentAssignment({
      tx,
      leadId,
      department: LeadAssignmentDepartment.PROJECT_COORDINATOR,
      preferredUserId: preferredPcUserId,
      actorUserId,
    })

    // 2. Auto-assign BOQ Team (Production Estimation Head)
    const boqAssignment = await ensureDepartmentAssignment({
      tx,
      leadId,
      department: LeadAssignmentDepartment.BOQ,
      preferredUserId: preferredBoqUserId,
      actorUserId,
    })

    const finalPcUserId = pcAssignment.userId ?? lead.assignments.find((a) => a.department === LeadAssignmentDepartment.PROJECT_COORDINATOR)?.userId ?? null
    const finalBoqUserId = boqAssignment.userId ?? lead.assignments.find((a) => a.department === LeadAssignmentDepartment.BOQ)?.userId ?? null

    // 3. Log audit activity
    const activityDesc = note
      ? `Promoted to Production Level under Project Coordinator and BOQ Team Leader: ${note}`
      : `Promoted to Production Level. Top-level oversight assigned to Project Coordinator and BOQ Team Leader.`

    if (actorUserId) {
      await tx.activityLog.create({
        data: {
          leadId,
          userId: actorUserId,
          type: 'STATUS_CHANGE',
          description: activityDesc,
        },
      }).catch(() => null)
    }

    // 4. In-app notifications to assigned heads
    const notificationReceivers = [
      { userId: finalPcUserId, roleTitle: 'Project Coordinator' },
      { userId: finalBoqUserId, roleTitle: 'BOQ Team' },
    ].filter((item): item is { userId: string; roleTitle: string } => Boolean(item.userId))

    for (const item of notificationReceivers) {
      await tx.notification.create({
        data: {
          userId: item.userId,
          leadId,
          title: 'Project Inducted into Production',
          message: `Project "${lead.name}" has entered Production Level and is ready for post-agreement delivery.`,
          type: 'LEAD_ASSIGNED_TO_YOU',
        },
      }).catch(() => null)
    }

    return {
      success: true,
      alreadyInProduction: isAlreadyPostAgreement,
      stageChanged,
      newStage: nextStage,
      pcUserId: finalPcUserId,
      boqUserId: finalBoqUserId,
      message: `Lead successfully inducted into Production Level.`,
    }
  }

  let result: PromoteToProductionResult
  if (input.tx) {
    result = await runWithTx(input.tx)
  } else {
    result = await prisma.$transaction(async (tx) => runWithTx(tx))
  }

  // Push notifications dispatched outside database transaction
  const leadName = (await prisma.lead.findUnique({ where: { id: leadId }, select: { name: true } }))?.name ?? 'Project'
  if (result.pcUserId) {
    sendPushToUser(
      result.pcUserId,
      'Project Inducted into Production',
      `Project "${leadName}" has entered Production Level for post-agreement coordination.`,
      { leadId, url: `/crm/pc/projects` },
    ).catch(() => null)
  }

  if (result.boqUserId) {
    sendPushToUser(
      result.boqUserId,
      'Project Inducted into Production',
      `Project "${leadName}" has entered Production Level for BOQ and requisition planning.`,
      { leadId, url: `/crm/boq/assigned-task` },
    ).catch(() => null)
  }

  return result
}
