import { NextRequest, NextResponse } from 'next/server'
import { LeadAssignmentDepartment, LeadStage } from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { downloadFromGCSUrl, isGCSUploadUrl } from '@/lib/gcs-storage'
import { isGoogleCloudStorageUrl } from '@/lib/download-utils'

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

export async function GET(request: NextRequest, context: RouteContext) {
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
    const isJrArchitect = actorDepartments.has('JR_ARCHITECT')
    const isVisualizer = actorDepartments.has('VISUALIZER_3D')

    if (!isAdmin && !isSeniorCrm && !isQuotation && !isJrArchitect && !isVisualizer) {
      return NextResponse.json(
        { success: false, error: 'Only Senior CRM, Admin, or authorized team members can access CAD submission files' },
        { status: 403 },
      )
    }

    const file = await prisma.cadWorkSubmissionFile.findFirst({
      where: {
        id: fileId,
        ...(isAdmin || isSeniorCrm
          ? {}
          : isQuotation
            ? {
                submission: {
                  lead: {
                    stage: LeadStage.QUOTATION_PHASE,
                    assignments: {
                      some: {
                        userId: authResult.actorUserId,
                        department: LeadAssignmentDepartment.QUOTATION,
                      },
                    },
                  },
                },
              }
            : {
                submission: {
                  OR: [
                    { submittedById: authResult.actorUserId },
                    {
                      lead: {
                        assignments: {
                          some: {
                            userId: authResult.actorUserId,
                            department: {
                              in: [
                                LeadAssignmentDepartment.JR_ARCHITECT,
                                LeadAssignmentDepartment.VISUALIZER_3D,
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              }),
      },
      select: {
        id: true,
        url: true,
        fileName: true,
        fileType: true,
      },
    })

    if (!file) {
      return NextResponse.json({ success: false, error: 'File not found or not accessible' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const customFileName = searchParams.get('fileName')
    const isInline = searchParams.get('inline') === '1' || searchParams.get('inline') === 'true'
    const isDownload = searchParams.get('download') === '1' || searchParams.get('download') === 'true'
    const disposition = (!isDownload && isInline) ? 'inline' : 'attachment'

    if (isGCSUploadUrl(file.url) || isGoogleCloudStorageUrl(file.url)) {
      try {
        const { buffer, contentType } = await downloadFromGCSUrl(file.url)

        const fileName = customFileName || file.fileName || 'cad-file'
        const safeFileName = fileName.replace(/["\r\n]/g, '_')

        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': contentType || file.fileType || 'application/octet-stream',
            'Content-Disposition': `${disposition}; filename="${encodeURIComponent(safeFileName)}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
            'Content-Length': String(buffer.length),
            'Cache-Control': 'private, no-store',
          },
        })
      } catch (gcsError) {
        console.error('[cad-work/submission-files/:fileId/download] GCS stream error:', gcsError)
        const gcsParams = new URLSearchParams()
        gcsParams.set('url', file.url)
        if (customFileName || file.fileName) {
          gcsParams.set('fileName', customFileName || file.fileName)
        }
        return NextResponse.redirect(new URL(`/api/gcs/download?${gcsParams.toString()}`, request.url))
      }
    }

    return NextResponse.redirect(withDownloadParam(file.url))
  } catch (error) {
    console.error('[cad-work/submission-files/:fileId/download][GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to access CAD submission file' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } })
}
