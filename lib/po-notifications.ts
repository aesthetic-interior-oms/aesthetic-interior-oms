import prisma from '@/lib/prisma'
import { NotificationType } from '@/generated/prisma/client'

export async function notifyPOLeadVerifiers(params: {
  leadId: string
  poNo: string
  totalAmount: number
  createdById: string
}) {
  try {
    const [lead, creator, verifiers] = await Promise.all([
      prisma.lead.findUnique({
        where: { id: params.leadId },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: params.createdById },
        select: { fullName: true },
      }),
      prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            {
              userRoles: {
                some: {
                  role: {
                    name: {
                      in: [
                        'PROCUREMENT_TEAM_LEADER',
                        'Procurement Team Leader',
                        'PROJECT_COORDINATOR',
                        'PROJECT_CORDINATOR',
                      ],
                    },
                  },
                },
              },
            },
            {
              userDepartments: {
                some: {
                  department: {
                    name: {
                      in: ['PROJECT_COORDINATOR', 'PROJECT_CORDINATOR'],
                    },
                  },
                },
              },
            },
          ],
        },
        select: { id: true },
      }),
    ])

    const recipientIds = Array.from(new Set(verifiers.map((v) => v.id))).filter(
      (id) => id !== params.createdById,
    )
    if (recipientIds.length === 0) return

    await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        leadId: params.leadId,
        type: NotificationType.LEAD_ASSIGNED_TO_YOU,
        title: 'Purchase Order Verification Required',
        message: `${creator?.fullName || 'Procurement'} created ${params.poNo} for ${lead?.name || 'project'} (৳${params.totalAmount.toLocaleString('en-BD')}). Please verify before forwarding to Accounts.`,
        scheduledFor: new Date(),
      })),
    })
  } catch (err) {
    console.error('[notifyPOLeadVerifiers] Failed:', err)
  }
}
