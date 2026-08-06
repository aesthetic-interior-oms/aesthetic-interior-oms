import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LeadPhaseTaskStatus, Prisma } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { hasJrArchitectureLeaderRole } from '@/lib/jr-architecture-roles'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

const activeCadStatuses = [LeadPhaseTaskStatus.OPEN, LeadPhaseTaskStatus.IN_REVIEW]

function formatDate(date: Date | null) {
  if (!date) return 'No deadline'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatLabel(value: string | null) {
  if (!value) return 'Not set'
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function JrArchitectureDashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      fullName: true,
      userDepartments: { select: { department: { select: { name: true } } } },
      userRoles: { select: { role: { select: { name: true } } } },
    },
  })

  if (!user || user.userDepartments.length === 0) redirect('/onboarding')

  const departmentNames = new Set(user.userDepartments.map((row) => row.department.name))
  const isJrArchitect = departmentNames.has('JR_ARCHITECT')
  if (!isJrArchitect) redirect('/')

  const roleNames = user.userRoles.map((row) => row.role.name)
  const isLeader = hasJrArchitectureLeaderRole(roleNames)
  const now = new Date()
  const taskScope: Prisma.LeadPhaseTaskWhereInput = isLeader ? {} : { assigneeUserId: user.id }
  const activeTaskScope: Prisma.LeadPhaseTaskWhereInput = {
    ...taskScope,
    phaseType: 'CAD',
    status: { in: activeCadStatuses },
  }

  const [openCadTasks, reviewCadTasks, overdueCadTasks, completedCadTasks, recentTasks, teamMembers, unassignedCadTasks] = await Promise.all([
    prisma.leadPhaseTask.count({ where: { ...taskScope, phaseType: 'CAD', status: LeadPhaseTaskStatus.OPEN } }),
    prisma.leadPhaseTask.count({ where: { ...taskScope, phaseType: 'CAD', status: LeadPhaseTaskStatus.IN_REVIEW } }),
    prisma.leadPhaseTask.count({ where: { ...activeTaskScope, dueAt: { lt: now } } }),
    prisma.leadPhaseTask.count({ where: { ...taskScope, phaseType: 'CAD', status: LeadPhaseTaskStatus.COMPLETED } }),
    prisma.leadPhaseTask.findMany({
      where: activeTaskScope,
      include: {
        lead: { select: { id: true, name: true, stage: true, subStatus: true } },
        assignee: { select: { fullName: true } },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: isLeader ? 8 : 5,
    }),
    isLeader
      ? prisma.user.findMany({
          where: { userDepartments: { some: { department: { name: 'JR_ARCHITECT' } } } },
          select: {
            id: true,
            fullName: true,
            phaseTasksAssigned: {
              where: { phaseType: 'CAD', status: { in: activeCadStatuses } },
              select: { id: true, status: true, dueAt: true },
            },
          },
          orderBy: { fullName: 'asc' },
        })
      : Promise.resolve([]),
    isLeader
      ? prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::BIGINT AS count
          FROM "LeadPhaseTask"
          WHERE "phaseType" = 'CAD'
            AND "assigneeUserId" IS NULL
            AND "status" IN ('OPEN', 'IN_REVIEW')
        `
      : Promise.resolve([{ count: 0 }]),
  ])
  const unassignedCadTaskCount = Number(unassignedCadTasks[0]?.count ?? 0)

  const activeCadTaskCount = openCadTasks + reviewCadTasks

  const title = isLeader ? 'JR Architect Command Center' : 'Junior Architect Dashboard'
  const subtitle = isLeader
    ? 'Leader view for CAD throughput, team workload, reassignment queues, and urgent reviews.'
    : 'Your CAD queue, priorities, and active lead work.'

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader title={title} subtitle={subtitle} />

      <main className="mx-auto max-w-[1440px] space-y-5 px-6 py-6">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge variant={isLeader ? 'default' : 'secondary'}>{isLeader ? 'Leader access' : 'Personal workspace'}</Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Welcome, {user.fullName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLeader ? 'Monitor every junior architect and jump into the pages leaders manage most.' : 'Focus on assigned CAD work and submit files for review on time.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild><Link href="/crm/jr-architecture/my-work">My Work</Link></Button>
              <Button asChild variant="outline"><Link href="/crm/jr-architecture/calendar">Calendar</Link></Button>
              {isLeader ? <Button asChild variant="outline"><Link href="/crm/jr-architecture/cad-phase-queue">CAD Phase Queue</Link></Button> : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            ['Open CAD Tasks', openCadTasks],
            ['In Review', reviewCadTasks],
            ['Overdue', overdueCadTasks],
            ['Completed', completedCadTasks],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardHeader><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
              <CardContent className="text-3xl font-semibold">{value}</CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader><CardTitle className="text-base">Priority CAD Work</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {recentTasks.length === 0 ? <p className="text-sm text-muted-foreground">No active CAD tasks yet.</p> : recentTasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{task.lead.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatLabel(task.lead.stage)} • {formatLabel(task.lead.subStatus)} • Due {formatDate(task.dueAt)}</p>
                    {isLeader ? <p className="mt-1 text-xs text-muted-foreground">Owner: {task.assignee?.fullName ?? 'Unassigned'}</p> : null}
                  </div>
                  <Badge variant={task.dueAt && task.dueAt < now ? 'destructive' : 'outline'}>{formatLabel(task.status)}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{isLeader ? 'Leader Controls' : 'Quick Links'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isLeader ? <div className="rounded-lg border border-dashed p-3"><p className="text-sm font-semibold">Unassigned CAD tasks</p><p className="mt-1 text-2xl font-semibold">{unassignedCadTaskCount}</p><p className="mt-1 text-xs text-muted-foreground">Use CAD Phase Queue to assign ownership.</p></div> : null}
              <Button asChild className="w-full" variant="outline"><Link href="/crm/jr-architecture/leads">Lead Workspace</Link></Button>
              <Button asChild className="w-full" variant="outline"><Link href="/crm/jr-architecture/visits">Visit Inputs</Link></Button>
              <Button asChild className="w-full" variant="outline"><Link href="/crm/jr-architecture/queue">Requests Queue</Link></Button>
            </CardContent>
          </Card>
        </div>

        {isLeader ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Team Workload</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {teamMembers.map((member) => {
                const overdueCount = member.phaseTasksAssigned.filter((task) => task.dueAt && task.dueAt < now).length
                return (
                  <div key={member.id} className="rounded-lg border p-3">
                    <p className="text-sm font-semibold">{member.fullName}</p>
                    <p className="mt-2 text-2xl font-semibold">{member.phaseTasksAssigned.length}</p>
                    <p className="text-xs text-muted-foreground">active CAD tasks</p>
                    {overdueCount > 0 ? <Badge className="mt-3" variant="destructive">{overdueCount} overdue</Badge> : <Badge className="mt-3" variant="outline">On track</Badge>}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  )
}
