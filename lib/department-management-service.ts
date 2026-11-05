import prisma from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

export type DeleteDepartmentOptions = {
  departmentId: string
  deleteUsers?: boolean
  actorUserId: string
}

export type DeleteDepartmentResult = {
  success: boolean
  departmentName: string
  deletedUsersCount: number
  detachedUsersCount: number
  message: string
}

/**
 * Permanently removes a department and optionally all associated users.
 */
export async function deleteDepartmentWithUsers(
  options: DeleteDepartmentOptions,
): Promise<DeleteDepartmentResult> {
  const { departmentId, deleteUsers = false } = options

  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    include: {
      userDepartments: {
        include: {
          user: {
            include: {
              userDepartments: true,
            },
          },
        },
      },
    },
  })

  if (!dept) {
    throw new Error('Department not found')
  }

  const deptNameUpper = dept.name.trim().toUpperCase()
  if (deptNameUpper === 'ADMIN') {
    throw new Error('The ADMIN department is protected and cannot be deleted.')
  }

  let deletedUsersCount = 0
  let detachedUsersCount = 0

  if (deleteUsers) {
    // 1. Classify users into those who only belong to this department vs multi-department users
    const usersToDelete: typeof dept.userDepartments[0]['user'][] = []
    const usersToDetach: typeof dept.userDepartments[0]['user'][] = []

    for (const ud of dept.userDepartments) {
      const u = ud.user
      const otherDepts = u.userDepartments.filter((d) => d.departmentId !== departmentId)
      if (otherDepts.length > 0) {
        usersToDetach.push(u)
      } else {
        usersToDelete.push(u)
      }
    }

    // 2. Delete linked Clerk accounts for users who are being permanently deleted
    try {
      const client = await clerkClient()
      for (const u of usersToDelete) {
        if (u.clerkUserId) {
          try {
            await client.users.deleteUser(u.clerkUserId)
          } catch (clerkErr) {
            console.warn(`[deleteDepartmentWithUsers] Clerk delete warning for ${u.id}:`, clerkErr)
          }
        }
      }
    } catch (err) {
      console.warn('[deleteDepartmentWithUsers] Error initializing clerk client:', err)
    }

    // 3. Database operations
    await prisma.$transaction(async (tx) => {
      // For multi-department users: remove their link to this department
      if (usersToDetach.length > 0) {
        await tx.userDepartment.deleteMany({
          where: {
            departmentId,
            userId: { in: usersToDetach.map((u) => u.id) },
          },
        })
        detachedUsersCount = usersToDetach.length
      }

      // For users being completely deleted
      if (usersToDelete.length > 0) {
        const userIds = usersToDelete.map((u) => u.id)

        // Clean up lead assignments and lead assignment references
        await tx.leadAssignment.deleteMany({
          where: { userId: { in: userIds } },
        })

        // Unassign leads and optional references
        await tx.lead.updateMany({
          where: { assignedTo: { in: userIds } },
          data: { assignedTo: null },
        })

        await tx.lead.updateMany({
          where: { primaryOwnerUserId: { in: userIds } },
          data: { primaryOwnerUserId: null },
        })

        // Clean up visit assignments and resolution references
        await tx.visit.updateMany({
          where: { assignedToId: { in: userIds } },
          data: { assignedToId: null },
        })

        await tx.visitUpdateRequest.updateMany({
          where: { resolvedById: { in: userIds } },
          data: { resolvedById: null },
        })

        // Clean up quotation draft updater references
        await tx.quotationDraft.updateMany({
          where: { updatedById: { in: userIds } },
          data: { updatedById: null },
        })

        await tx.furnitureQuotationDraft.updateMany({
          where: { updatedById: { in: userIds } },
          data: { updatedById: null },
        })

        await tx.electricalQuotationDraft.updateMany({
          where: { updatedById: { in: userIds } },
          data: { updatedById: null },
        })

        await tx.partialQuotationDraft.updateMany({
          where: { updatedById: { in: userIds } },
          data: { updatedById: null },
        })

        // Clean up conveyance, stock, requisitions, and wallet reviewer references
        await tx.conveyanceRequest.updateMany({
          where: { reviewedById: { in: userIds } },
          data: { reviewedById: null },
        })

        await tx.requisitionAmendment.updateMany({
          where: { acknowledgedById: { in: userIds } },
          data: { acknowledgedById: null },
        })

        await tx.stockMovement.updateMany({
          where: { recipientUserId: { in: userIds } },
          data: { recipientUserId: null },
        })

        await tx.procurementWalletTransaction.updateMany({
          where: { reviewedById: { in: userIds } },
          data: { reviewedById: null },
        })

        await tx.user.updateMany({
          where: { approvedById: { in: userIds } },
          data: { approvedById: null },
        })

        // Clean up device tokens and notifications
        await tx.deviceToken.deleteMany({
          where: { userId: { in: userIds } },
        })

        await tx.notification.deleteMany({
          where: { userId: { in: userIds } },
        })

        await tx.notification.updateMany({
          where: { subjectUserId: { in: userIds } },
          data: { subjectUserId: null },
        })

        // Clean up user roles & user departments
        await tx.userRole.deleteMany({
          where: { userId: { in: userIds } },
        })

        await tx.userDepartment.deleteMany({
          where: { userId: { in: userIds } },
        })

        // Clean up procurement wallet if exists
        await tx.procurementWallet.deleteMany({
          where: { userId: { in: userIds } },
        })

        // Safely check each user for restricted historical records before deleting
        for (const u of usersToDelete) {
          const userWithHistory = await tx.user.findUnique({
            where: { id: u.id },
            select: {
              _count: {
                select: {
                  transactionsRecorded: true,
                  transactionsCollected: true,
                  conveyanceRequests: true,
                  materialRequisitionsCreated: true,
                  requisitionAmendmentsRequested: true,
                  stockMovements: true,
                  siteDeliveriesReceived: true,
                  procurementWalletTxSubmitted: true,
                  cadWorkSubmissions: true,
                  visitsCreated: true,
                  activities: true,
                  followUps: true,
                },
              },
            },
          })

          const totalHistoricalRecords = userWithHistory?._count
            ? Object.values(userWithHistory._count).reduce((sum, count) => sum + count, 0)
            : 0

          if (totalHistoricalRecords === 0) {
            await tx.user.delete({ where: { id: u.id } })
          } else {
            // Soft-delete and anonymize so user is completely removed from all active rosters
            await tx.user.update({
              where: { id: u.id },
              data: {
                isActive: false,
                clerkUserId: null,
                fullName: `${u.fullName} (Deleted)`,
                email: `deleted-${u.id}@removed.local`,
                phone: `deleted-${u.id}`,
              },
            })
          }
          deletedUsersCount++
        }
      }

      // 4. Ensure any remaining department links are cleared, then delete department
      await tx.userDepartment.deleteMany({
        where: { departmentId },
      })

      await tx.department.delete({
        where: { id: departmentId },
      })
    })
  } else {
    // Just delete the department and its UserDepartment links
    await prisma.$transaction(async (tx) => {
      await tx.userDepartment.deleteMany({
        where: { departmentId },
      })
      await tx.department.delete({
        where: { id: departmentId },
      })
    })
  }

  return {
    success: true,
    departmentName: dept.name,
    deletedUsersCount,
    detachedUsersCount,
    message: deleteUsers
      ? `Department "${dept.name}" and ${deletedUsersCount} user(s) removed successfully.`
      : `Department "${dept.name}" removed successfully.`,
  }
}
