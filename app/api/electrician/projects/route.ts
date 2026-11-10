import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

export const dynamic = 'force-dynamic'

/**
 * GET /api/electrician/projects
 * Returns active site projects for the electrician portal.
 */
export async function GET() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const projects = await prisma.lead.findMany({
      where: {
        stage: {
          in: ['SITE_EXECUTION', 'CONVERSION', 'QUALITY_CHECK', 'HANDOVER'],
        },
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
