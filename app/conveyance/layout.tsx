import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { MainLayout } from '@/components/layout/mainlayout'
import { normalizeDepartmentName } from '@/lib/department-normalization'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

function resolveDepartmentRole(deptNames: string[], roleNames: string[]): string {
  const normDepts = deptNames.map((d) => normalizeDepartmentName(d))
  const normRoles = roleNames.map((r) => r.trim().toUpperCase().replace(/\s+/g, '_'))

  if (normRoles.includes('ADMIN') || normDepts.includes('ADMIN')) return 'Admin'
  if (
    normRoles.includes('PROJECT_COORDINATOR') ||
    normRoles.includes('PROJECT_CORDINATOR') ||
    normDepts.includes('PROJECT_COORDINATOR') ||
    normDepts.includes('PROJECT_CORDINATOR')
  ) {
    return 'Project Coordinator'
  }
  if (
    normRoles.includes('SITE_ENGINEER') ||
    normDepts.includes('SITE_ENGINEER') ||
    normDepts.includes('PROJECT_ENGINEER') ||
    normDepts.includes('IMPLEMENTATION_TEAM')
  ) {
    return 'Site Engineer'
  }
  if (normRoles.includes('BOQ_TEAM_LEADER')) return 'BOQ Team Leader'
  if (normRoles.includes('BOQ_TEAM_MEMBER') || normDepts.includes('BOQ')) return 'BOQ Team Member'
  if (normRoles.includes('PROCUREMENT_TEAM_LEADER')) return 'Procurement Team Leader'
  if (normRoles.includes('PROCUREMENT_TEAM_MEMBER') || normDepts.includes('PROCUREMENT')) return 'Procurement Team Member'
  if (normRoles.includes('JR_ARCHITECT') || normDepts.includes('JR_ARCHITECTURE') || normDepts.includes('JR_ARCHITECT')) return 'Jr Architect'
  if (
    normRoles.includes('VISUALIZER') ||
    normRoles.includes('3D_VISUALIZER') ||
    normDepts.includes('3D_VISUALIZER') ||
    normDepts.includes('VISUALIZER')
  ) {
    return '3D Visualizer'
  }
  if (normRoles.includes('SPECIALIST_DESIGN_CONSULTANTS') || normDepts.includes('SPECIALIST_DESIGN_CONSULTANTS')) {
    return 'Specialist Design Consultants'
  }
  if (normRoles.includes('VISIT_TEAM') || normDepts.includes('VISIT_TEAM') || normDepts.includes('VISIT')) return 'Visit Team'
  if (normRoles.includes('QUOTATION_TEAM') || normDepts.includes('QUOTATION_TEAM') || normDepts.includes('QUOTATION')) return 'Quotation Team'
  if (normRoles.includes('SENIOR_CRM') || normRoles.includes('SR_CRM') || normDepts.includes('SENIOR_CRM') || normDepts.includes('SR_CRM')) {
    return 'Senior CRM'
  }
  if (normRoles.includes('JR_CRM') || normDepts.includes('JR_CRM') || normDepts.includes('CRM')) return 'JR CRM'
  if (normRoles.includes('HR') || normRoles.includes('HUMAN_RESOURCES') || normDepts.includes('HR') || normDepts.includes('HUMAN_RESOURCES')) {
    return 'Human Resources'
  }
  if (normRoles.includes('ELECTRICIAN') || normDepts.includes('ELECTRICIAN')) return 'Electrician'
  if (normRoles.includes('ELECTRIC_ENGINEER') || normDepts.includes('ELECTRIC_ENGINEER')) return 'Electric Engineer'

  return deptNames[0] || 'JR CRM'
}

export default async function ConveyanceLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      userDepartments: { select: { department: { select: { name: true } } } },
      userRoles: { select: { role: { select: { name: true } } } },
    },
  })

  if (!user || !user.userDepartments.length) redirect('/onboarding')

  const deptNames = user.userDepartments.map((row) => row.department.name)
  const roleNames = user.userRoles.map((row) => row.role.name)

  if (deptNames.some((name) => name.trim().toUpperCase() === 'ACCOUNTS')) {
    redirect('/crm/accounts/conveyance')
  }

  // Preserve the user's actual department sidebar instead of hardcoding "Finance"
  const role = resolveDepartmentRole(deptNames, roleNames)

  return <MainLayout role={role}>{children}</MainLayout>
}
