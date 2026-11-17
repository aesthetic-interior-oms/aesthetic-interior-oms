import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { MainLayout } from '@/components/layout/mainlayout'
import { normalizeDepartmentName } from '@/lib/department-normalization'
import { hasBoqLeaderRole } from '@/lib/boq-roles'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

const ADMIN_DASHBOARD = '/crm/admin/dashboard'
const JR_CRM_DASHBOARD = '/crm/jr/dashboard'
const JR_ARCHITECT_DASHBOARD = '/crm/jr-architecture/dashboard'
const SR_CRM_DASHBOARD = '/crm/sr/dashboard'
const VISIT_DASHBOARD = '/visit-team/visit-dashboard'
const VISUALIZER_DASHBOARD = '/crm/visualizer/dashboard'
const PC_DASHBOARD = '/crm/pc/dashboard'
const ACCOUNTS_DASHBOARD = '/crm/admin/finance'

export default async function BoqLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  if (!user || user.userDepartments.length === 0) {
    redirect('/onboarding')
  }

  const departmentNames = new Set(
    user.userDepartments
      .map((row) => normalizeDepartmentName(row.department.name))
      .filter((name): name is string => Boolean(name)),
  )

  const roleNames = user.userRoles.map((row) => row.role.name)
  const isBoqLeader = hasBoqLeaderRole(roleNames)

  if (departmentNames.has('BOQ')) {
    // BOQ Team Leader gets a distinct role string so the sidebar displays
    // the Agreement Leads navigation link exclusively to leaders.
    const boqRole = isBoqLeader ? 'BOQ Team Leader' : 'BOQ Team Member'
    return <MainLayout role={boqRole}>{children}</MainLayout>
  }

  if (departmentNames.has('ADMIN')) {
    return <MainLayout role="Admin">{children}</MainLayout>
  }

  if (departmentNames.has('JR_CRM')) {
    redirect(JR_CRM_DASHBOARD)
  }

  if (departmentNames.has('JR_ARCHITECT')) {
    redirect(JR_ARCHITECT_DASHBOARD)
  }

  if (departmentNames.has('SR_CRM')) {
    redirect(SR_CRM_DASHBOARD)
  }

  if (departmentNames.has('VISIT_TEAM')) {
    redirect(VISIT_DASHBOARD)
  }

  if (departmentNames.has('VISUALIZER_3D') || departmentNames.has('3D_VISUALIZER')) {
    redirect(VISUALIZER_DASHBOARD)
  }

  if (departmentNames.has('PROJECT_COORDINATOR')) {
    redirect(PC_DASHBOARD)
  }

  if (departmentNames.has('ACCOUNTS') || departmentNames.has('FINANCE')) {
    redirect(ACCOUNTS_DASHBOARD)
  }

  redirect(ADMIN_DASHBOARD)
}
