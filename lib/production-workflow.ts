import { LeadAssignmentDepartment, LeadStage, Prisma } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { ensureDepartmentAssignment } from '@/lib/lead-handoff'
import { POST_AGREEMENT_PRODUCTION_STAGES } from '@/lib/production-module'
import { sendPushToUser } from '@/lib/fcm-service'
import { getDepartmentNameAliases } from '@/lib/department-normalization'

export interface PromoteToProductionInput {
  leadId: string
  actorUserId?: string | null
  preferredAccountsUserId?: string | null
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
  accountsUserId: string | null
  pcUserId: string | null
  boqUserId: string | null
  message: string
}

/**
 * Promotes/transitions a Lead into the Production phase post-agreement.
 * Exposes the project immediately to the three initial entry-point roles:
 * 1. Accounts (Payment verification, booking advance, financial clearance)
 * 2. BOQ Team Leader (Intake, scope review, bill of quantities, delegation to BOQ members)
 * 3. Project Coordinator (Production oversight, field delivery, delegation to Site Engineers)
 *
 * Downstream execution roles (BOQ members, Site Engineers) receive access downstream
 * only after explicit intake/assignment by these three entry-point roles.
 */
export async function promoteLeadToProduction(
  input: PromoteToProductionInput,
): Promise<PromoteToProductionResult> {
  const {
    leadId,
    actorUserId,
    preferredAccountsUserId,
    preferredPcUserId,
    preferredBoqUserId,
    note,
    targetStage,
  } = input

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

    // Once a lead moves to Agreement status (CONVERSION), it transitions directly into Production phase (PROJECT_SETUP).
    let nextStage: LeadStage
    if (targetStage && targetStage !== LeadStage.CONVERSION) {
      nextStage = targetStage
    } else if (isAlreadyPostAgreement && currentStage !== LeadStage.CONVERSION) {
      nextStage = currentStage
    } else {
      nextStage = LeadStage.PROJECT_SETUP
    }

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

    // ─── Entry-Point Role 1: Accounts ─────────────────────────────────────────
    const accountsAssignment = await ensureDepartmentAssignment({
      tx,
      leadId,
      department: LeadAssignmentDepartment.ACCOUNTS,
      preferredUserId: preferredAccountsUserId,
      actorUserId,
    })
    const finalAccountsUserId =
      accountsAssignment.userId ??
      lead.assignments.find((a) => a.department === LeadAssignmentDepartment.ACCOUNTS)?.userId ??
      null

    // ─── Entry-Point Role 2: Project Coordinator ──────────────────────────────
    const pcAssignment = await ensureDepartmentAssignment({
      tx,
      leadId,
      department: LeadAssignmentDepartment.PROJECT_COORDINATOR,
      preferredUserId: preferredPcUserId,
      actorUserId,
    })
    const finalPcUserId =
      pcAssignment.userId ??
      lead.assignments.find((a) => a.department === LeadAssignmentDepartment.PROJECT_COORDINATOR)?.userId ??
      null

    // ─── Entry-Point Role 3: BOQ Team Leader ──────────────────────────────────
    // Look up user holding BOQ_TEAM_LEADER role so we route specifically to the leader,
    // not downstream BOQ members.
    let targetBoqUserId: string | null = preferredBoqUserId ?? null
    if (!targetBoqUserId) {
      const boqLeader = await tx.user.findFirst({
        where: {
          isActive: true,
          userRoles: {
            some: {
              role: {
                name: 'BOQ_TEAM_LEADER',
              },
            },
          },
        },
        select: { id: true },
        orderBy: [{ created_at: 'asc' }],
      })
      if (boqLeader) {
        targetBoqUserId = boqLeader.id
      }
    }

    let finalBoqUserId: string | null = null
    const existingBoqAssignment = lead.assignments.find((a) => a.department === LeadAssignmentDepartment.BOQ)

    if (existingBoqAssignment) {
      finalBoqUserId = existingBoqAssignment.userId
    } else if (targetBoqUserId) {
      // Assign specifically to BOQ Team Leader / Preferred BOQ User
      const boqAssignment = await tx.leadAssignment.create({
        data: {
          leadId,
          department: LeadAssignmentDepartment.BOQ,
          userId: targetBoqUserId,
        },
      })
      finalBoqUserId = boqAssignment.userId
    } else {
      // Do NOT auto-assign random BOQ members (Overrides Point #4).
      // Downstream BOQ members only receive access after BOQ Leader intake.
      finalBoqUserId = null
    }

    // ─── Log audit activity ───────────────────────────────────────────────────
    const activityDesc = note
      ? `Inducted into Production phase: ${note}. Routed to Accounts, Project Coordinator, and BOQ Team Leader.`
      : `Inducted into Production phase. Initial routing exposed to Accounts, Project Coordinator, and BOQ Team Leader.`

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

    // ─── In-App Notifications for Entry-Point Roles ───────────────────────────
    const notificationReceivers: { userId: string; roleTitle: string; note: string }[] = []

    if (finalAccountsUserId) {
      notificationReceivers.push({
        userId: finalAccountsUserId,
        roleTitle: 'Accounts',
        note: 'Project is ready for Accounts verification and payment clearance.',
      })
    } else {
      // If no specific accounts user assigned, notify active accounts staff
      const accountsAliases = getDepartmentNameAliases('ACCOUNTS')
      const accountsStaff = await tx.user.findMany({
        where: {
          isActive: true,
          userDepartments: {
            some: {
              department: {
                name: { in: accountsAliases },
              },
            },
          },
        },
        select: { id: true },
        take: 5,
      })
      for (const staff of accountsStaff) {
        notificationReceivers.push({
          userId: staff.id,
          roleTitle: 'Accounts',
          note: 'Project is ready for Accounts verification and payment clearance.',
        })
      }
    }

    if (finalPcUserId) {
      notificationReceivers.push({
        userId: finalPcUserId,
        roleTitle: 'Project Coordinator',
        note: 'Project has entered Production phase for project coordination and execution planning.',
      })
    }

    if (finalBoqUserId) {
      notificationReceivers.push({
        userId: finalBoqUserId,
        roleTitle: 'BOQ Team Leader',
        note: 'Project has entered Production phase for BOQ intake and estimation delegation.',
      })
    } else if (targetBoqUserId) {
      notificationReceivers.push({
        userId: targetBoqUserId,
        roleTitle: 'BOQ Team Leader',
        note: 'Project has entered Production phase for BOQ intake and estimation delegation.',
      })
    }

    for (const item of notificationReceivers) {
      await tx.notification.create({
        data: {
          userId: item.userId,
          leadId,
          title: 'Project Inducted into Production',
          message: `Project "${lead.name}": ${item.note}`,
          type: 'LEAD_ASSIGNED_TO_YOU',
        },
      }).catch(() => null)
    }

    return {
      success: true,
      alreadyInProduction: isAlreadyPostAgreement,
      stageChanged,
      newStage: nextStage,
      accountsUserId: finalAccountsUserId,
      pcUserId: finalPcUserId,
      boqUserId: finalBoqUserId ?? targetBoqUserId,
      message: `Lead successfully inducted into Production phase with initial routing to Accounts, BOQ Team Leader, and Project Coordinator.`,
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

  if (result.accountsUserId) {
    sendPushToUser(
      result.accountsUserId,
      'Project Inducted into Production',
      `Project "${leadName}" has entered Production phase. Pending Accounts verification.`,
      { leadId, url: `/crm/accounts/projects` },
    ).catch(() => null)
  }

  if (result.pcUserId) {
    sendPushToUser(
      result.pcUserId,
      'Project Inducted into Production',
      `Project "${leadName}" has entered Production phase for project coordination.`,
      { leadId, url: `/crm/pc/projects` },
    ).catch(() => null)
  }

  if (result.boqUserId) {
    sendPushToUser(
      result.boqUserId,
      'Project Inducted into Production',
      `Project "${leadName}" has entered Production phase for BOQ intake.`,
      { leadId, url: `/crm/boq/assigned-task` },
    ).catch(() => null)
  }

  return result
}
