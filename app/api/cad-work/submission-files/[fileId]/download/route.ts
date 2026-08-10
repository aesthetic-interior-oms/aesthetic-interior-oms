import { NextRequest, NextResponse } from 'next/server'
import { LeadAssignmentDepartment, LeadStage } from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'

type RouteContext = { params: { fileId: string } | Promise<{ fileId: string }> }

async function resolveFileId(context: RouteContext): Promise<string | null> {
  const params = await context.params
  const fileId = params?.fileId
  if (typeof fileId !== 'string') return null
  const trimmed = fileId.trim()
  return trimmed.length > 0 ? trimmed : null
}

function withDownloadParam(url: string): string {
  return url.includes('?') ? `${url}&download=1` : `${url}?download=1`
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const fileId = await resolveFileId(context)
    if (!fileId) {
      return NextResponse.json({ success: false, error: 'Invalid file id' }, { status: 400 })
    }

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const isAdmin = actorDepartments.has('ADMIN')
    const isSeniorCrm = actorDepartments.has('SR_CRM')
    const isQuotation = actorDepartments.has('QUOTATION') || actorDepartments.has('QUOTATION_TEAM')

    if (!isAdmin && !isSeniorCrm && !isQuotation) {
      return NextResponse.json(
        { success: false, error: 'Only Senior CRM, Admin, or Quotation Team can access quotation files' },
        { status: 403 },
      )
    }

    const file = await prisma.cadWorkSubmissionFile.findFirst({
      where: {
        id: fileId,
        submission: {
          lead: {
            ...(isAdmin
              ? {}
              : isSeniorCrm
                ? {
                    assignments: {
                      some: {
                        userId: authResult.actorUserId,
                        department: LeadAssignmentDepartment.SR_CRM,
                      },
                    },
                  }
                : {
                    stage: LeadStage.QUOTATION_PHASE,
                    assignments: {
                      some: {
                        userId: authResult.actorUserId,
                        department: LeadAssignmentDepartment.QUOTATION,
                      },
                    },
                  }),
          },
        },
      },
      select: { url: true },
    })

    if (!file) {
      return NextResponse.json({ success: false, error: 'File not found or not accessible' }, { status: 404 })
    }

    return NextResponse.redirect(withDownloadParam(file.url))
  } catch (error) {
    console.error('[cad-work/submission-files/:fileId/download][GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to access quotation file' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } })
}
