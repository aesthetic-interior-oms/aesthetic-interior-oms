import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'

export default async function VisualizerQueuePage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/')
  }

  const actor = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      userDepartments: {
        select: {
          department: {
            select: { name: true },
          },
        },
      },
    },
  })

  const departmentNames = new Set((actor?.userDepartments ?? []).map((row) => row.department.name))
  const canAccessQueue =
    departmentNames.has('ADMIN') ||
    departmentNames.has('SR_CRM') ||
    departmentNames.has('VISUALIZER_3D') ||
    departmentNames.has('3D_VISUALIZER')

  if (!canAccessQueue) {
    redirect('/crm/visualizer/dashboard')
  }

  return (
    <CadPhaseQueueBoard
      title="Visualizer Queue"
      subtitle="3D Visualizer queue with reassignment controls and meeting handoff actions."
      leadBasePath="/crm/visualizer/leads"
      queueEndpoint="/api/cad-work/visualizer-queue"
      assigneeDepartment="VISUALIZER_3D"
      assigneeLabel="3D Visualizer"
    />
  )
}
