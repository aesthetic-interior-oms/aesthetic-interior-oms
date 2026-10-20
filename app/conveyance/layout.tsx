import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { MainLayout } from '@/components/layout/mainlayout'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export default async function ConveyanceLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/')
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId }, select: { userDepartments: { select: { department: { select: { name: true } } } } } })
  if (!user || !user.userDepartments.length) redirect('/onboarding')
  const names = user.userDepartments.map((row) => row.department.name)
  if (names.some((name) => name.trim().toUpperCase() === 'ACCOUNTS')) redirect('/crm/accounts/conveyance')
  return <MainLayout role="Finance">{children}</MainLayout>
}
