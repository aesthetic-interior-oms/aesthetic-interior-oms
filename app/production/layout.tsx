import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { MainLayout } from '@/components/layout/mainlayout'
import { normalizeDepartmentName } from '@/lib/department-normalization'
import { hasBoqLeaderRole, hasBoqMemberRole } from '@/lib/boq-roles'
import { hasProcurementRole } from '@/lib/procurement-roles'
import { isAccountsUser } from '@/lib/purchase-order'

export const runtime = 'nodejs'

const PRODUCTION_DEPARTMENTS = new Set([
  'ACCOUNTS', 'FINANCE',
  'BOQ',
  'PROJECT_COORDINATOR', 'PROJECT_CORDINATOR',
  'PROCUREMENT', 'PROCUREMENT_DEPARTMENT', 'PROCUREMENT_SUPPLY_CHAIN',
  'SITE_ENGINEER',
  'ADMIN',
])

const PRODUCTION_ROLES = new Set([
  'BOQ_TEAM_LEADER', 'BOQ_TEAM_MEMBER',
  'PROCUREMENT_TEAM_LEADER', 'PROCUREMENT_TEAM_MEMBER',
  'PROJECT_COORDINATOR',
  'ADMIN',
])

export default async function ProductionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      userDepartments: {
        select: { department: { select: { name: true } } },
      },
      userRoles: {
        select: { role: { select: { name: true } } },
      },
    },
  })

  if (!user) redirect('/onboarding')

  const deptNames = user.userDepartments
    .map((r) => normalizeDepartmentName(r.department.name))
    .filter((d): d is string => Boolean(d))

  const roleNames = user.userRoles.map((r) => r.role.name.trim().toUpperCase().replace(/\s+/g, '_'))

  const hasAccess =
    deptNames.some((d) => PRODUCTION_DEPARTMENTS.has(d)) ||
    roleNames.some((r) => PRODUCTION_ROLES.has(r))

  if (!hasAccess) redirect('/onboarding')

  // Determine friendly role label
  let roleLabel = 'Production Team'
  if (roleNames.includes('BOQ_TEAM_LEADER')) roleLabel = 'BOQ Team Leader'
  else if (roleNames.includes('BOQ_TEAM_MEMBER')) roleLabel = 'BOQ Team Member'
  else if (roleNames.includes('PROCUREMENT_TEAM_LEADER')) roleLabel = 'Procurement Leader'
  else if (roleNames.includes('PROCUREMENT_TEAM_MEMBER')) roleLabel = 'Procurement Member'
  else if (roleNames.includes('PROJECT_COORDINATOR') || deptNames.includes('PROJECT_COORDINATOR') || deptNames.includes('PROJECT_CORDINATOR')) roleLabel = 'Project Coordinator'
  else if (deptNames.includes('ACCOUNTS') || deptNames.includes('FINANCE')) roleLabel = 'Accounts'
  else if (deptNames.includes('SITE_ENGINEER')) roleLabel = 'Site Engineer'
  else if (deptNames.includes('ADMIN') || roleNames.includes('ADMIN')) roleLabel = 'Admin'

  return <MainLayout role={roleLabel}>{children}</MainLayout>
}
