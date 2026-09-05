import {
  AccountStatus,
  LeadAssignmentDepartment,
  LeadStage,
  LeadSubStatus,
  NotificationType,
  Prisma,
  TransactionType,
} from '@/generated/prisma/client'

type WorkflowTx = Prisma.TransactionClient

type VisualizerReleasePayload = {
  released: boolean
  leadId: string
  leadName?: string
  visualizerUserId?: string | null
  visualizerName?: string | null
  message: string
}

function nextAccountStatus(totalPaid: number, agreementValue: number | null): AccountStatus {
  if (agreementValue && agreementValue > 0 && totalPaid >= agreementValue) {
    return AccountStatus.FULL_PAID
  }
  return AccountStatus.PARTIAL_PAID
}

export async function releaseVisualizerAfterPaymentGate({
  tx,
  leadId,
  actorUserId,
  bypassPayment = false,
  reason,
}: {
  tx: WorkflowTx
  leadId: string
  actorUserId: string
  bypassPayment?: boolean
  reason?: string | null
}): Promise<VisualizerReleasePayload> {
  const lead = await tx.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      name: true,
      stage: true,
      subStatus: true,
      agreementType: true,
      agreementValue: true,
      accountStatus: true,
      assignments: {
        where: { department: LeadAssignmentDepartment.VISUALIZER_3D },
        select: {
          userId: true,
          user: { select: { fullName: true } },
        },
        take: 1,
      },
    },
  })

  if (!lead?.agreementType) {
    return { released: false, leadId, message: 'Lead has no confirmed agreement.' }
  }

  if (
    lead.stage === LeadStage.VISUALIZATION_PHASE &&
    lead.subStatus === LeadSubStatus.VISUAL_ASSIGNED
  ) {
    return {
      released: false,
      leadId,
      leadName: lead.name,
      visualizerUserId: lead.assignments[0]?.userId ?? null,
      visualizerName: lead.assignments[0]?.user.fullName ?? null,
      message: '3D Visualizer is already assigned.',
    }
  }

  const visualizer = lead.assignments[0] ?? null
  if (!visualizer) {
    return {
      released: false,
      leadId,
      leadName: lead.name,
      message: 'No pending 3D Visualizer assignment found.',
    }
  }

  const paidAggregate = await tx.transaction.aggregate({
    where: { leadId, type: TransactionType.INFLOW },
    _sum: { amount: true },
    _count: { _all: true },
  })
  const totalPaid = paidAggregate._sum.amount ?? 0

  if (!bypassPayment && (paidAggregate._count._all === 0 || totalPaid <= 0)) {
    return {
      released: false,
      leadId,
      leadName: lead.name,
      visualizerUserId: visualizer.userId,
      visualizerName: visualizer.user.fullName,
      message: 'Waiting for first client transaction before releasing to 3D Visualizer.',
    }
  }

  const accountStatus = bypassPayment
    ? (lead.accountStatus ?? AccountStatus.PROCESSING)
    : nextAccountStatus(totalPaid, lead.agreementValue)

  await tx.lead.update({
    where: { id: leadId },
    data: {
      stage: LeadStage.VISUALIZATION_PHASE,
      subStatus: LeadSubStatus.VISUAL_ASSIGNED,
      accountStatus,
    },
  })

  if (lead.stage !== LeadStage.VISUALIZATION_PHASE) {
    await tx.leadStatusHistory.create({
      data: {
        leadId,
        oldStatus: lead.stage,
        newStatus: LeadStage.VISUALIZATION_PHASE,
        changedById: actorUserId,
      },
    })
  }

  await tx.activityLog.create({
    data: {
      leadId,
      userId: actorUserId,
      type: 'STATUS_CHANGE',
      description: bypassPayment
        ? `Admin approved early 3D Visualizer release${reason ? `: ${reason}` : '.'}`
        : `First client transaction received. Released to 3D Visualizer with ${totalPaid.toLocaleString()} BDT paid.`,
    },
  })

  await tx.notification.create({
    data: {
      userId: visualizer.userId,
      leadId,
      type: NotificationType.LEAD_ASSIGNED_TO_YOU,
      title: '3D Visualizer work released',
      message: `${lead.name} is ready for 3D visualization.`,
    },
  })

  return {
    released: true,
    leadId,
    leadName: lead.name,
    visualizerUserId: visualizer.userId,
    visualizerName: visualizer.user.fullName,
    message: 'Lead released to 3D Visualizer.',
  }
}

export async function requestVisualizerReleaseApproval({
  tx,
  leadId,
  actorUserId,
  reason,
}: {
  tx: WorkflowTx
  leadId: string
  actorUserId: string
  reason?: string | null
}) {
  const lead = await tx.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      name: true,
      agreementType: true,
      accountStatus: true,
      assignments: {
        where: { department: LeadAssignmentDepartment.VISUALIZER_3D },
        select: { user: { select: { fullName: true } } },
        take: 1,
      },
    },
  })

  if (!lead?.agreementType) {
    throw new Error('Only confirmed agreement projects can request 3D Visualizer release.')
  }

  const admins = await tx.user.findMany({
    where: {
      isActive: true,
      userDepartments: { some: { department: { name: 'ADMIN' } } },
    },
    select: { id: true },
  })

  if (admins.length === 0) {
    throw new Error('No active admin users found for approval request.')
  }

  const visualizerName = lead.assignments[0]?.user.fullName ?? 'selected 3D Visualizer'
  const message = `${lead.name} needs early release to ${visualizerName} before the first transaction.${reason ? ` Reason: ${reason}` : ''}`

  await tx.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      leadId,
      type: NotificationType.LEAD_ASSIGNED_TO_YOU,
      title: '3D Visualizer early release request',
      message,
    })),
  })

  await tx.activityLog.create({
    data: {
      leadId,
      userId: actorUserId,
      type: 'NOTE',
      description: `Accounts requested admin approval for early 3D Visualizer release.${reason ? ` Reason: ${reason}` : ''}`,
    },
  })

  return { adminCount: admins.length, message }
}
