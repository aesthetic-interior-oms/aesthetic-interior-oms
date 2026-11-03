import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  canAssignJrArchitect,
  canRequestJrArchitectWork,
  canViewVisitCompleteQueue,
  getQueuePermissionFlags,
  listVisitCompleteQueueItems,
} from '@/lib/visit-complete-queue'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const flags = getQueuePermissionFlags(
      authResult.actor.userDepartments ?? [],
      authResult.actorRoles ?? [],
    )

    const visitTypeParam = request.nextUrl.searchParams.get('visitType')
    const visitType = visitTypeParam === 'PARTIAL_WORK_VISIT' ? 'PARTIAL_WORK_VISIT' : 'NORMAL'

    if (!canViewVisitCompleteQueue(flags, visitType)) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view visit complete queue' },
        { status: 403 },
      )
    }

    const [queue, jrArchitectUsers] = await Promise.all([
      canViewVisitCompleteQueue(flags, visitType)
        ? listVisitCompleteQueueItems({
            srAssigneeUserId:
              flags.isSeniorCrm && !flags.isAdmin && visitType !== 'PARTIAL_WORK_VISIT'
                ? authResult.actorUserId
                : null,
            visitType,
          })
        : Promise.resolve([]),
      canAssignJrArchitect(flags, visitType)
        ? prisma.userDepartment.findMany({
            where: {
              department: {
                name: 'JR_ARCHITECT',
              },
              user: {
                isActive: true,
              },
            },
            select: {
              user: {
                select: { id: true, fullName: true, email: true },
              },
            },
            orderBy: {
              user: {
                fullName: 'asc',
              },
            },
          }).then((rows) => {
            const uniqueById = new Map<string, { id: string; fullName: string; email: string }>()
            for (const row of rows) {
              const user = row.user
              if (!uniqueById.has(user.id)) {
                uniqueById.set(user.id, user)
              }
            }
            return Array.from(uniqueById.values())
          })
        : Promise.resolve([]),
    ])

    return NextResponse.json({
      success: true,
      data: queue,
      jrArchitectUsers,
      permissions: {
        canView: canViewVisitCompleteQueue(flags, visitType),
        canAssign: canAssignJrArchitect(flags, visitType),
        canRequest: canRequestJrArchitectWork(flags),
        isJrArchitectureLeader: flags.isJrArchitectureLeader,
        isSpecialistDesignConsultant: flags.isSpecialistDesignConsultant,
      },
    })
  } catch (error) {
    console.error('[visit-complete-queue][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load visit complete queue' },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS' },
  })
}
