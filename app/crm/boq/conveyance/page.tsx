import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { hasBoqLeaderRole } from '@/lib/boq-roles'
import { normalizeDepartmentName } from '@/lib/department-normalization'
import { ConveyanceVerificationModule } from '@/components/conveyance/conveyance-verification-module'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export default async function BoqConveyancePage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      userDepartments: {
        select: {
          department: {
            select: { name: true },
          },
        },
      },
      userRoles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
  })

  if (!user) {
    redirect('/onboarding')
  }

  const departmentNames = new Set(
    user.userDepartments
      .map((row) => normalizeDepartmentName(row.department.name))
      .filter((name): name is string => Boolean(name)),
  )

  const roleNames = user.userRoles.map((row) => row.role.name)
  const isAdmin =
    departmentNames.has('ADMIN') ||
    roleNames.some((r) => r.trim().toLowerCase() === 'admin')
  const isBoqLeader = hasBoqLeaderRole(roleNames)

  // Exclusive access to BOQ Team Leader (and system Admin)
  if (!isAdmin && !isBoqLeader) {
    redirect('/crm/boq/dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <ConveyanceVerificationModule
        roleTitle="BOQ Team Leader"
        roleSubtitle="Review, verify, and approve or reject employee conveyance expense requests."
        departmentBadgeText="BOQ Team Leader"
      />
    </div>
  )
}
