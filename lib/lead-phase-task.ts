import {
  ActivityType,
  LeadAssignmentDepartment,
  LeadPhaseTaskStatus,
  LeadPhaseType,
  LeadSubStatus,
  Prisma,
} from '@/generated/prisma/client'
import { logActivity } from '@/lib/activity-log-service'
import { DEFAULT_CAD_WORK_DETAILS } from '@/lib/sr-task-service'

function phaseTypeFromSubStatus(subStatus: LeadSubStatus | null | undefined): LeadPhaseType | null {
  if (!subStatus) return null

  if (
    subStatus === LeadSubStatus.CAD_ASSIGNED ||
    subStatus === LeadSubStatus.CAD_WORKING ||
    subStatus === LeadSubStatus.CAD_COMPLETED ||
    subStatus === LeadSubStatus.CAD_APPROVED
  ) {
    return LeadPhaseType.CAD
  }

  if (
    subStatus === LeadSubStatus.QUOTATION_ASSIGNED ||
    subStatus === LeadSubStatus.QUOTATION_WORKING ||
    subStatus === LeadSubStatus.QUOTATION_COMPLETED ||
    subStatus === LeadSubStatus.QUOTATION_APPROVED ||
    subStatus === LeadSubStatus.QUOTATION_CORRECTION
  ) {
    return LeadPhaseType.QUOTATION
  }

  return null
}

export async function ensurePhaseTaskForSubStatus(input: {
  tx: Prisma.TransactionClient
  leadId: string
  subStatus: LeadSubStatus | null | undefined
  actorUserId: string
}): Promise<void> {
  const phaseType = phaseTypeFromSubStatus(input.subStatus)
  if (!phaseType) return

  const existingOpenTask = await input.tx.leadPhaseTask.findFirst({
    where: {
      leadId: input.leadId,
      phaseType,
      status: { in: [LeadPhaseTaskStatus.OPEN, LeadPhaseTaskStatus.IN_REVIEW] },
    },
    select: { id: true },
  })
  if (existingOpenTask) return

  const targetDepartment =
    phaseType === LeadPhaseType.CAD
      ? LeadAssignmentDepartment.JR_ARCHITECT
      : LeadAssignmentDepartment.QUOTATION

  const assignment = await input.tx.leadAssignment.findFirst({
    where: {
      leadId: input.leadId,
      department: targetDepartment,
      user: { isActive: true },
    },
    orderBy: { createdAt: 'desc' },
    select: { userId: true },
  })

  const actor = await input.tx.user.findFirst({
    where: { id: input.actorUserId, isActive: true },
    select: { id: true },
  })

  const fallbackUser = assignment || actor
    ? null
    : await input.tx.user.findFirst({
        where: {
          isActive: true,
          userDepartments: {
            some: {
              department: {
                name: targetDepartment,
              },
            },
          },
        },
        orderBy: [{ fullName: 'asc' }, { created_at: 'asc' }],
        select: { id: true },
      })

  const assigneeUserId = assignment?.userId ?? actor?.id ?? fallbackUser?.id
  if (!assigneeUserId) return

  const dueAt = new Date()
  dueAt.setDate(dueAt.getDate() + 3)

  await input.tx.leadPhaseTask.create({
    data: {
      leadId: input.leadId,
      phaseType,
      workDetails: phaseType === LeadPhaseType.CAD ? DEFAULT_CAD_WORK_DETAILS : null,
      assigneeUserId,
      startedAt: new Date(),
      dueAt,
      createdById: input.actorUserId,
    },
  })

  await logActivity(input.tx, {
    leadId: input.leadId,
    userId: input.actorUserId,
    type: ActivityType.PHASE_DEADLINE_SET,
    description: `Auto-created ${phaseType} task with default deadline.`,
  })
}
