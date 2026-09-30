import { NextRequest, NextResponse } from 'next/server'
import {
  ActivityType,
  CadSubmissionFileType,
  LeadAssignmentDepartment,
  LeadPhaseTaskStatus,
  LeadPhaseType,
  LeadStage,
  LeadSubStatus,
  NotificationType,
} from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  ALLOWED_CAD_UPLOAD_EXTENSIONS,
  ALLOWED_CAD_UPLOAD_MIME_TYPES,
  isCadSubmissionFileTypeValue,
  MAX_CAD_SUBMISSION_FILE_SIZE_BYTES,
  getCadFileExtension,
} from '@/lib/cad-work'
import { logActivity, logLeadStageChanged, logLeadSubStatusChanged } from '@/lib/activity-log-service'
import { sendPushToUser } from '@/lib/fcm-service'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

async function resolveLeadId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params
  const id = resolvedParams?.id
  if (typeof id !== 'string') return null
  const trimmed = id.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null
  if (typeof value !== 'string') return null
  const normalized = value.replace(/,/g, '').trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function toUploadedCadFileMeta(value: unknown): UploadedCadFileMeta | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const url = toOptionalString(record.url)
  const fileName = toOptionalString(record.fileName)
  const fileType = toOptionalString(record.fileType) ?? 'application/octet-stream'
  const sizeBytes = typeof record.sizeBytes === 'number' && Number.isFinite(record.sizeBytes) ? record.sizeBytes : 0
  const cadFileTypeRaw = toOptionalString(record.cadFileType)?.toUpperCase()
  if (!url || !fileName || !cadFileTypeRaw || !isCadSubmissionFileTypeValue(cadFileTypeRaw) || sizeBytes <= 0) {
    return null
  }
  return {
    url,
    fileName,
    fileType,
    sizeBytes,
    cadFileType: cadFileTypeRaw as CadSubmissionFileType,
  }
}

function toLeadAttachmentCategory(fileType: string): 'MEDIA' | 'FILE' {
  if (fileType.startsWith('image/') || fileType.startsWith('video/')) {
    return 'MEDIA'
  }
  return 'FILE'
}

function isAllowedCadUploadFile(file: File): boolean {
  const fileType = (file.type || '').trim().toLowerCase()
  if (fileType && ALLOWED_CAD_UPLOAD_MIME_TYPES.has(fileType)) {
    return true
  }
  const extension = getCadFileExtension(file.name || '')
  return ALLOWED_CAD_UPLOAD_EXTENSIONS.has(extension)
}

function isAllowedCadUploadMeta(file: Pick<UploadedCadFileMeta, 'fileName' | 'fileType'>): boolean {
  const fileType = (file.fileType || '').trim().toLowerCase()
  if (fileType && ALLOWED_CAD_UPLOAD_MIME_TYPES.has(fileType)) return true
  return ALLOWED_CAD_UPLOAD_EXTENSIONS.has(getCadFileExtension(file.fileName || ''))
}

type UploadedCadFileMeta = {
  url: string
  fileName: string
  fileType: string
  sizeBytes: number
  cadFileType: CadSubmissionFileType
}

type FailedCadUploadMeta = {
  fileName: string
  reason: string
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
    }

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const isAdmin = actorDepartments.has('ADMIN')
    const isSeniorCrm = actorDepartments.has('SR_CRM')
    const isJrArchitect = actorDepartments.has('JR_ARCHITECT')
    const isVisualizer = actorDepartments.has('VISUALIZER_3D')

    if (!isAdmin && !isSeniorCrm && !isJrArchitect && !isVisualizer) {
      return NextResponse.json(
        { success: false, error: 'Only JR Architect, 3D Visualizer, Senior CRM, or Admin can submit CAD work' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as { note?: unknown; files?: unknown; projectSqft?: unknown }
    const note = toOptionalString(body.note)
    const projectSqft = toPositiveNumber(body.projectSqft)

    const uploadedFiles: UploadedCadFileMeta[] = Array.isArray(body.files)
      ? body.files.map((item) => toUploadedCadFileMeta(item)).filter((item): item is UploadedCadFileMeta => Boolean(item))
      : []

    for (const uploaded of uploadedFiles) {
      if (uploaded.sizeBytes > MAX_CAD_SUBMISSION_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: `File "${uploaded.fileName}" exceeds the CAD file size limit` },
          { status: 400 },
        )
      }
      if (!isAllowedCadUploadMeta(uploaded)) {
        return NextResponse.json(
          { success: false, error: `File "${uploaded.fileName}" type "${uploaded.fileType || 'unknown'}" is not allowed` },
          { status: 400 },
        )
      }
    }

    if (!projectSqft) {
      return NextResponse.json({ success: false, error: 'Project sqft is required and must be greater than 0' }, { status: 400 })
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        ...(isAdmin || isSeniorCrm
          ? {}
          : {
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
            }),
      },
      select: {
        id: true,
        stage: true,
        subStatus: true,
      },
    })

    if (!lead) {
      throw new Error('LEAD_NOT_FOUND')
    }

    if (lead.subStatus === LeadSubStatus.CAD_COMPLETED || lead.subStatus === LeadSubStatus.CAD_APPROVED) {
      throw new Error('ALREADY_SUBMITTED')
    }

    if (!(lead.stage === LeadStage.CAD_PHASE && lead.subStatus === LeadSubStatus.CAD_WORKING)) {
      throw new Error('WORK_NOT_STARTED')
    }

    const failedUploads: FailedCadUploadMeta[] = []


    const payload = await prisma.$transaction(
      async (tx) => {
        const scopedLead = await tx.lead.findFirst({
          where: {
            id: lead.id,
            stage: LeadStage.CAD_PHASE,
            subStatus: LeadSubStatus.CAD_WORKING,
          },
          select: {
            id: true,
            name: true,
            stage: true,
            subStatus: true,
            assignments: {
              where: { department: LeadAssignmentDepartment.SR_CRM },
              select: { userId: true },
            },
          },
        })

        if (!scopedLead) {
          throw new Error('WORK_STATE_CHANGED')
        }

        const submission = await tx.cadWorkSubmission.create({
          data: {
            leadId: scopedLead.id,
            submittedById: authResult.actorUserId,
            note,
          },
        })

        if (uploadedFiles.length > 0) {
          await tx.cadWorkSubmissionFile.createMany({
            data: uploadedFiles.map((uploaded) => ({
              submissionId: submission.id,
              url: uploaded.url,
              fileName: uploaded.fileName,
              fileType: uploaded.fileType,
              cadFileType: uploaded.cadFileType,
              sizeBytes: uploaded.sizeBytes,
            })),
          })

          await tx.leadAttachment.createMany({
            data: uploadedFiles.map((uploaded) => ({
              leadId: scopedLead.id,
              url: uploaded.url,
              fileName: uploaded.fileName,
              fileType: uploaded.fileType,
              category: toLeadAttachmentCategory(uploaded.fileType),
              sizeBytes: uploaded.sizeBytes,
            })),
          })
        }

        const now = new Date()

        const latestVisit = await tx.visit.findFirst({
          where: { leadId: scopedLead.id },
          orderBy: { scheduledAt: 'desc' },
          select: { id: true },
        })

        if (latestVisit) {
          await tx.visit.update({
            where: { id: latestVisit.id },
            data: { projectSqft },
          })
        }

        await tx.leadPhaseTask.updateMany({
          where: {
            leadId: scopedLead.id,
            phaseType: LeadPhaseType.CAD,
            status: LeadPhaseTaskStatus.OPEN,
          },
          data: {
            status: LeadPhaseTaskStatus.IN_REVIEW,
            updatedAt: now,
          },
        })

        const updatedLead = await tx.lead.update({
          where: { id: scopedLead.id },
          data: {
            stage: LeadStage.CAD_PHASE,
            subStatus: LeadSubStatus.CAD_COMPLETED,
          },
          select: {
            id: true,
            stage: true,
            subStatus: true,
          },
        })

        if (scopedLead.stage !== LeadStage.CAD_PHASE) {
          await logLeadStageChanged(tx, {
            leadId: scopedLead.id,
            userId: authResult.actorUserId,
            from: scopedLead.stage,
            to: LeadStage.CAD_PHASE,
            reason: 'CAD work submitted for review',
          })
        }

        await logLeadSubStatusChanged(tx, {
          leadId: scopedLead.id,
          userId: authResult.actorUserId,
          from: scopedLead.subStatus,
          to: LeadSubStatus.CAD_COMPLETED,
          reason: 'JR Architect submitted CAD files',
        })

        await logActivity(tx, {
          leadId: scopedLead.id,
          userId: authResult.actorUserId,
          type: ActivityType.NOTE,
          description: `CAD work submitted with ${uploadedFiles.length} file${uploadedFiles.length === 1 ? '' : 's'} for Senior CRM review.`,
        })

        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)

        const adminUsers = await tx.user.findMany({
          where: {
            isActive: true,
            userDepartments: {
              some: {
                department: { name: 'ADMIN' },
              },
            },
          },
          select: { id: true },
        })

        const targetUserIds = Array.from(
          new Set([...scopedLead.assignments.map((item) => item.userId), ...adminUsers.map((item) => item.id)]),
        ).filter((userId) => userId !== authResult.actorUserId)

        if (targetUserIds.length > 0) {
          const existingToday = await tx.notification.findMany({
            where: {
              userId: { in: targetUserIds },
              leadId: scopedLead.id,
              type: NotificationType.LEAD_ASSIGNED_TO_YOU,
              title: 'CAD work submitted for review',
              createdAt: { gte: startOfToday },
            },
            select: { userId: true },
          })
          const existingUsers = new Set(existingToday.map((item) => item.userId))

          const notifications = targetUserIds
            .filter((userId) => !existingUsers.has(userId))
            .map((userId) => ({
              userId,
              leadId: scopedLead.id,
              type: NotificationType.LEAD_ASSIGNED_TO_YOU,
              title: 'CAD work submitted for review',
              message: `${scopedLead.name} CAD files are ready in Review Center.`,
              scheduledFor: now,
            }))

          if (notifications.length > 0) {
            await tx.notification.createMany({ data: notifications })
          }

          // Fire-and-forget FCM push to SR CRM + admins
          for (const userId of targetUserIds) {
            sendPushToUser(
              userId,
              'CAD Work Ready for Review ✏️',
              `${scopedLead.name} CAD files are ready in the Review Center.`,
              { type: 'review', leadId: scopedLead.id },
            ).catch(() => {})
          }
        }

        return {

          lead: updatedLead,
          submissionId: submission.id,
          uploadWarnings:
            failedUploads.length > 0
              ? {
                  failedCount: failedUploads.length,
                  failedFiles: failedUploads.map((item) => item.fileName),
                }
              : null,
        }
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      },
    )

    return NextResponse.json(
      {
        success: true,
        data: payload,
        message: 'CAD files submitted successfully and moved to CAD Completed',
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'LEAD_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Lead not found or not assigned to you' },
        { status: 404 },
      )
    }

    if (error instanceof Error && error.message === 'WORK_NOT_STARTED') {
      return NextResponse.json(
        { success: false, error: 'Please click Start Work before submitting CAD files' },
        { status: 409 },
      )
    }
    if (error instanceof Error && error.message === 'WORK_STATE_CHANGED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Lead status changed while uploading. Refresh and try again.',
        },
        { status: 409 },
      )
    }

    if (error instanceof Error && error.message === 'ALREADY_SUBMITTED') {
      return NextResponse.json(
        { success: false, error: 'CAD work has already been submitted for this lead' },
        { status: 409 },
      )
    }
    if (error instanceof Error && error.message === 'CAD_UPLOAD_FAILED') {
      return NextResponse.json(
        {
          success: false,
          error: 'All file uploads failed after retries. Please try again.',
        },
        { status: 503 },
      )
    }

    if (error instanceof Error && error.message.includes('BLOB_READ_WRITE_TOKEN')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN in environment variables.',
        },
        { status: 503 },
      )
    }

    console.error('[lead/:id/cad-work/submit][POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit CAD work' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  })
}
