import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { LeadAssignmentDepartment, LeadStage, LeadSubStatus } from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import {
  ALLOWED_CAD_UPLOAD_MIME_TYPES,
  ALLOWED_CAD_UPLOAD_EXTENSIONS,
  getCadFileExtension,
  isCadSubmissionFileTypeValue,
} from '@/lib/cad-work'
import { DIRECT_BLOB_UPLOAD_MAX_BYTES } from '@/lib/upload-limits'

type ClientUploadPayload = {
  context?: string
  ownerId?: string
  fileName?: string
  fileType?: string
  sizeBytes?: number
  cadFileType?: string
}

function parseClientPayload(value: string | null): ClientUploadPayload {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return typeof parsed === 'object' && parsed !== null ? (parsed as ClientUploadPayload) : {}
  } catch {
    return {}
  }
}

function assertPathnameScope(pathname: string, prefix: string, ownerId: string) {
  if (!pathname.startsWith(`${prefix}/${ownerId}/`)) {
    throw new Error('UPLOAD_PATH_NOT_ALLOWED')
  }
}

function isAllowedCadContent(pathname: string, fileType: string | undefined): boolean {
  const normalizedType = (fileType || '').trim().toLowerCase()
  if (normalizedType && ALLOWED_CAD_UPLOAD_MIME_TYPES.has(normalizedType)) return true
  return ALLOWED_CAD_UPLOAD_EXTENSIONS.has(getCadFileExtension(pathname))
}

async function authorizeCadUpload(input: {
  actorUserId: string
  actorDepartments: Set<string>
  ownerId: string
  pathname: string
  payload: ClientUploadPayload
}) {
  assertPathnameScope(input.pathname, 'cad-work-submissions', input.ownerId)
  const cadFileType = typeof input.payload.cadFileType === 'string' ? input.payload.cadFileType.toUpperCase() : ''
  if (!isCadSubmissionFileTypeValue(cadFileType)) throw new Error('INVALID_CAD_FILE_TYPE')
  if (!isAllowedCadContent(input.pathname, input.payload.fileType)) throw new Error('CAD_FILE_TYPE_NOT_ALLOWED')

  const isAdmin = input.actorDepartments.has('ADMIN')
  const isSeniorCrm = input.actorDepartments.has('SR_CRM')
  const isJrArchitect = input.actorDepartments.has('JR_ARCHITECT')
  const isVisualizer = input.actorDepartments.has('VISUALIZER_3D')
  if (!isAdmin && !isSeniorCrm && !isJrArchitect && !isVisualizer) throw new Error('FORBIDDEN')

  const lead = await prisma.lead.findFirst({
    where: {
      id: input.ownerId,
      ...(isAdmin || isSeniorCrm
        ? {}
        : {
            assignments: {
              some: {
                userId: input.actorUserId,
                department: {
                  in: [LeadAssignmentDepartment.JR_ARCHITECT, LeadAssignmentDepartment.VISUALIZER_3D],
                },
              },
            },
          }),
    },
    select: { id: true, stage: true, subStatus: true },
  })
  if (!lead) throw new Error('LEAD_NOT_FOUND')
  if (!(lead.stage === LeadStage.CAD_PHASE && lead.subStatus === LeadSubStatus.CAD_WORKING)) {
    throw new Error('WORK_NOT_STARTED')
  }
}

async function authorizeVisitUpload(input: {
  actorUserId: string
  actorDepartments: Set<string>
  ownerId: string
  pathname: string
  isSupport: boolean
}) {
  assertPathnameScope(input.pathname, input.isSupport ? 'visit-support-results' : 'visit-results', input.ownerId)
  const visit = await prisma.visit.findUnique({
    where: { id: input.ownerId },
    select: {
      assignedToId: true,
      supportAssignments: { select: { supportUserId: true }, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!visit) throw new Error('VISIT_NOT_FOUND')
  const isAdmin = input.actorDepartments.has('ADMIN')
  const isAssignedLeader = visit.assignedToId === input.actorUserId
  const primarySupport = visit.supportAssignments[0] ?? null
  const isPrimarySupport = primarySupport?.supportUserId === input.actorUserId
  if (input.isSupport) {
    if (!isAdmin && !isPrimarySupport) throw new Error('NOT_ASSIGNED')
    return
  }
  if (!isAdmin && !isAssignedLeader) throw new Error('NOT_ASSIGNED')
}

async function authorizeLeadAttachmentUpload(input: { ownerId: string; pathname: string }) {
  assertPathnameScope(input.pathname, 'leads', input.ownerId)
  const lead = await prisma.lead.findUnique({ where: { id: input.ownerId }, select: { id: true } })
  if (!lead) throw new Error('LEAD_NOT_FOUND')
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody

    if (body.type === 'blob.upload-completed') {
      const completedResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async () => {
          throw new Error('UPLOAD_CONTEXT_NOT_ALLOWED')
        },
        onUploadCompleted: async () => {},
      })
      return NextResponse.json(completedResponse)
    }

    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parseClientPayload(clientPayload)
        const context = typeof payload.context === 'string' ? payload.context : ''
        const ownerId = typeof payload.ownerId === 'string' ? payload.ownerId.trim() : ''
        if (!ownerId) throw new Error('UPLOAD_OWNER_REQUIRED')
        if (typeof payload.sizeBytes === 'number' && payload.sizeBytes > DIRECT_BLOB_UPLOAD_MAX_BYTES) {
          throw new Error('UPLOAD_TOO_LARGE')
        }

        const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
        if (context === 'cad-work') {
          await authorizeCadUpload({
            actorUserId: authResult.actorUserId,
            actorDepartments,
            ownerId,
            pathname,
            payload,
          })
        } else if (context === 'visit-result') {
          await authorizeVisitUpload({
            actorUserId: authResult.actorUserId,
            actorDepartments,
            ownerId,
            pathname,
            isSupport: false,
          })
        } else if (context === 'visit-support-result') {
          await authorizeVisitUpload({
            actorUserId: authResult.actorUserId,
            actorDepartments,
            ownerId,
            pathname,
            isSupport: true,
          })
        } else if (context === 'lead-attachment') {
          await authorizeLeadAttachmentUpload({ ownerId, pathname })
        } else {
          throw new Error('UPLOAD_CONTEXT_NOT_ALLOWED')
        }

        return {
          maximumSizeInBytes: DIRECT_BLOB_UPLOAD_MAX_BYTES,
          tokenPayload: JSON.stringify({ context, ownerId, userId: authResult.actorUserId }),
          validUntil: Date.now() + 10 * 60 * 1000,
        }
      },
      onUploadCompleted: async () => {},
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[blob/client-upload][POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to authorize direct file upload' }, { status: 400 })
  }
}
