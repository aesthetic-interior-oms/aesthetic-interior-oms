import { ActivityType, FollowUpStatus, Prisma } from '@/generated/prisma/client'

type AutoCompleteInput = {
  leadId: string
  userId?: string | null
  action?: string | null
}

export async function autoCompletePendingFollowups(
  tx: Prisma.TransactionClient,
  input: AutoCompleteInput
): Promise<{ updatedCount: number }> {
  const now = new Date()

  const late = await tx.followUp.updateMany({
    where: {
      leadId: input.leadId,
      status: FollowUpStatus.PENDING,
      followupDate: { lt: now },
    },
    data: { status: FollowUpStatus.LATELY_DONE },
  })

  const onTime = await tx.followUp.updateMany({
    where: {
      leadId: input.leadId,
      status: FollowUpStatus.PENDING,
      followupDate: { gte: now },
    },
    data: { status: FollowUpStatus.DONE },
  })

  const updatedCount = late.count + onTime.count

  if (updatedCount > 0 && input.userId) {
    const actionPart = input.action ? ` due to ${input.action}` : ''
    const plural = updatedCount === 1 ? '' : 's'
    await tx.activityLog.create({
      data: {
        leadId: input.leadId,
        userId: input.userId,
        type: ActivityType.FOLLOWUP_COMPLETED,
        description: `Auto-completed ${updatedCount} pending follow-up${plural}${actionPart}.`,
      },
    })
  }

  return { updatedCount }
}
