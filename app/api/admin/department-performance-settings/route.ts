import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { normalizeMonthKey } from '@/lib/quotation-performance'
import {
  DepartmentType,
  getDepartmentMemberMonthlySettings,
  updateDepartmentMemberMonthlySettings,
} from '@/lib/department-performance-settings'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'
export const dynamic = 'force-dynamic'

function checkAdminOrLeader(authResult: {
  actorRoles: string[]
  actor: { userDepartments: string[] }
}) {
  const isAdmin = authResult.actor.userDepartments.includes('ADMIN')
  const isSuperUser = authResult.actorRoles.includes('ADMIN') || authResult.actorRoles.includes('Super Admin')
  return isAdmin || isSuperUser
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    if (!checkAdminOrLeader(authResult)) {
      return NextResponse.json(
        { success: false, error: 'Only Admins can access department performance settings' },
        { status: 403 },
      )
    }

    const searchParams = request.nextUrl.searchParams
    const department = (searchParams.get('department') || 'SR_CRM').toUpperCase() as DepartmentType
    const monthKey = normalizeMonthKey(searchParams.get('month'))

    const validDepartments: DepartmentType[] = ['SR_CRM', 'JR_ARCHITECT', 'QUOTATION', 'VISIT_TEAM']
    if (!validDepartments.includes(department)) {
      return NextResponse.json(
        { success: false, error: `Invalid department: ${department}` },
        { status: 400 },
      )
    }

    const members = await getDepartmentMemberMonthlySettings(department, monthKey)

    return NextResponse.json({
      success: true,
      department,
      monthKey,
      members,
    })
  } catch (error) {
    console.error('[admin/department-performance-settings][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load department member settings' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    if (!checkAdminOrLeader(authResult)) {
      return NextResponse.json(
        { success: false, error: 'Only Admins can update department performance settings' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as {
      department?: DepartmentType
      monthKey?: string
      settings?: Array<{ userId: string; isEnabled: boolean; notes?: string | null }>
    }

    const department = (body.department || 'SR_CRM').toUpperCase() as DepartmentType
    const monthKey = normalizeMonthKey(body.monthKey)
    const settings = Array.isArray(body.settings) ? body.settings : []

    const validDepartments: DepartmentType[] = ['SR_CRM', 'JR_ARCHITECT', 'QUOTATION', 'VISIT_TEAM']
    if (!validDepartments.includes(department)) {
      return NextResponse.json(
        { success: false, error: `Invalid department: ${department}` },
        { status: 400 },
      )
    }

    await updateDepartmentMemberMonthlySettings(
      department,
      monthKey,
      settings,
      authResult.actorUserId,
    )

    const updated = await getDepartmentMemberMonthlySettings(department, monthKey)

    return NextResponse.json({
      success: true,
      department,
      monthKey,
      message: `${department} member visibility and performance settings updated`,
      members: updated,
    })
  } catch (error) {
    console.error('[admin/department-performance-settings][POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save department member settings' },
      { status: 500 },
    )
  }
}
