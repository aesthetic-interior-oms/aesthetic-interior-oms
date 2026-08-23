import { NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { canAccessQuotationDraft } from '@/lib/quotation-auth'
import { getMergedQuotationTemplates } from '@/lib/quotation-overrides'
import type { QuotationFileType } from '@/lib/quotation-types'

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

    const mergedTemplates = await getMergedQuotationTemplates()

    return NextResponse.json({
      success: true,
      data: {
        templates: mergedTemplates.map(t => ({
          key: t.key,
          name: t.name,
          sourceDocument: t.sourceDocument,
          sectionCount: t.sections.length,
          itemCount: t.items.length
        })),
        fullTemplates: mergedTemplates, // Provide full templates so client doesn't need to guess
        quotationTypes: ['PREMIUM', 'STANDARD', 'BASIC', 'MIXED'] as QuotationFileType[],
        quotationTypeLabels: {
          PREMIUM: 'High (max rate from PDF)',
          STANDARD: 'Mid (average rate)',
          BASIC: 'Low (min rate from PDF)',
          MIXED: 'Mixed (manual per item)',
        },
        units: ['sqft', 'nos', 'ls', 'rmt', 'rft'] as const,
      },
    })
  } catch (error) {
    console.error('[quotation/templates][GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load quotation templates' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } })
}
