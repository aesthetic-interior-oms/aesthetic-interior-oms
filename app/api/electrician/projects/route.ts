import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

export const dynamic = 'force-dynamic'

/**
 * GET /api/electrician/projects
 * Returns active site projects assigned to the logged-in electrician.
 * Admin and Project Coordinator can view all active site projects.
 */
export async function GET() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(
      (authResult.actor.userDepartments ?? []).map((d: unknown) =>
        typeof d === 'string' ? d.trim().toUpperCase().replace(/\s+/g, '_') : '',
      ),
    )
    const actorRoles = authResult.actorRoles ?? []
    const isAdmin =
      actorDepartments.has('ADMIN') ||
      actorRoles.some((r) => r.toUpperCase() === 'ADMIN')
    const isPc =
      actorDepartments.has('PROJECT_COORDINATOR') ||
      actorDepartments.has('PROJECT_CORDINATOR') ||
      actorRoles.some((r) => r.toUpperCase().includes('PROJECT_COORDINATOR'))

    const canViewAll = isAdmin || isPc

    const projects = await prisma.lead.findMany({
      where: {
        stage: {
          in: ['SITE_EXECUTION', 'CONVERSION', 'QUALITY_CHECK', 'HANDOVER'],
        },
        ...(!canViewAll
          ? {
              OR: [
                { assignments: { some: { userId: authResult.actorUserId } } },
                { assignedTo: authResult.actorUserId },
                { primaryOwnerUserId: authResult.actorUserId },
                { phaseTasks: { some: { assigneeUserId: authResult.actorUserId } } },
              ],
            }
          : {}),
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        location: true,
        phone: true,
        stage: true,
        subStatus: true,
        budget: true,
        created_at: true,
      },
    })

    return NextResponse.json({ success: true, data: { projects } })
  } catch (error) {
    console.error('[electrician/projects][GET]', error)
    return NextResponse.json({ success: false, error: 'Failed to load projects' }, { status: 500 })
  }
}
