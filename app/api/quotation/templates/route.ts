import { NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { canAccessQuotationDraft } from '@/lib/quotation-auth'
import { getQuotationTemplatesResponse } from '@/lib/quotation-template'

export async function GET() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = authResult.actor.userDepartments ?? []
    if (!canAccessQuotationDraft(actorDepartments)) {
      return NextResponse.json(
        { success: false, error: 'Only quotation team, Senior CRM, or Admin can access quotation templates' },
        { status: 403 },
      )
    }

    return NextResponse.json({
      success: true,
      data: getQuotationTemplatesResponse(),
    })
  } catch (error) {
    console.error('[quotation/templates][GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load quotation templates' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } })
}
