import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { hasVisitTeamLeadershipRole } from '@/lib/visit-team-roles'
import {
  BEHAVIOUR_TAG_OPTIONS,
  getBehaviourPointsForTag,
  getMonthlyVisitTeamPerformance,
} from '@/lib/visit-performance'
import { normalizeMonthKey } from '@/lib/quotation-performance'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'
export const dynamic = 'force-dynamic'

function checkLeaderOrAdmin(authResult: {
  actorRoles: string[]
  actor: { userDepartments: string[] }
}) {
  const isAdmin = authResult.actor.userDepartments.includes('ADMIN')
  const isVisitMember =
    authResult.actor.userDepartments.includes('VISIT_TEAM') ||
    authResult.actor.userDepartments.includes('SPECIALIST_DESIGN_CONSULTANTS')

  const isLeader = (isVisitMember || isAdmin) && hasVisitTeamLeadershipRole(authResult.actorRoles)
  return isAdmin || isLeader
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    if (!checkLeaderOrAdmin(authResult)) {
      return NextResponse.json(
        { success: false, error: 'Only Visit Team Leaders or Admins can access performance settings' },
        { status: 403 },
      )
    }

    const monthKey = normalizeMonthKey(request.nextUrl.searchParams.get('month'))
    const { members } = await getMonthlyVisitTeamPerformance(monthKey)

    return NextResponse.json({
      success: true,
      monthKey,
      members,
      behaviourTagOptions: BEHAVIOUR_TAG_OPTIONS,
    })
  } catch (error) {
    console.error('[visit-team/performance-settings][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load visit team performance settings' },
      { status: 500 },
    )
  }
}

type AssessmentInput = {
  userId: string
  absentDays: number
  attendanceScore?: number
  behaviourTag: string | null
  behaviourScore?: number
  notes?: string | null
  isEnabled?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    if (!checkLeaderOrAdmin(authResult)) {
      return NextResponse.json(
        { success: false, error: 'Only Visit Team Leaders or Admins can update performance assessments' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as {
      monthKey?: string
      assessments?: AssessmentInput[]
    }

    const monthKey = normalizeMonthKey(body.monthKey)
    const assessments = Array.isArray(body.assessments) ? body.assessments : []

    if (assessments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No assessments provided' },
        { status: 400 },
      )
    }

    // Upsert each assessment in transaction or parallel
    await prisma.$transaction(
      assessments.map((item) => {
        const absentDays = Math.max(0, Math.floor(Number(item.absentDays) || 0))
        const attendanceScore = typeof item.attendanceScore === 'number'
          ? Math.max(0, Math.min(10, item.attendanceScore))
          : Math.max(0, 10 - absentDays * 2)

        const behaviourTag = item.behaviourTag ? item.behaviourTag.trim().toUpperCase() : null
        const behaviourScore = typeof item.behaviourScore === 'number'
          ? item.behaviourScore
          : getBehaviourPointsForTag(behaviourTag)

        const notes = item.notes?.trim() || null
        const isEnabled = typeof item.isEnabled === 'boolean' ? item.isEnabled : true

        return prisma.visitMemberMonthlyAssessment.upsert({
          where: {
            userId_monthKey: {
              userId: item.userId,
              monthKey,
            },
          },
          create: {
            userId: item.userId,
            monthKey,
            absentDays,
            attendanceScore,
            behaviourTag,
            behaviourScore,
            notes,
            isEnabled,
            updatedById: authResult.actorUserId,
          },
          update: {
            absentDays,
            attendanceScore,
            behaviourTag,
            behaviourScore,
            notes,
            isEnabled,
            updatedById: authResult.actorUserId,
          },
        })
      }),
    )

    // Recalculate and return the fresh performance data
    const updated = await getMonthlyVisitTeamPerformance(monthKey)

    return NextResponse.json({
      success: true,
      monthKey,
      message: 'Monthly attendance and behaviour assessments updated successfully',
      members: updated.members,
    })
  } catch (error) {
    console.error('[visit-team/performance-settings][POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save visit performance assessments' },
      { status: 500 },
    )
  }
}
