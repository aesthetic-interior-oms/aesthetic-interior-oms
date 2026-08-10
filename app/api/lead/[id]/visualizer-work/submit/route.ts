import { NextRequest, NextResponse } from 'next/server'
import {
  ActivityType,
  CadSubmissionFileType,
  LeadAssignmentDepartment,
  LeadStage,
  LeadSubStatus,
  NotificationType,
} from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  logActivity,
  logLeadSubStatusChanged,
} from '@/lib/activity-log-service'
import { sendPushToUser } from '@/lib/fcm-service'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

type SubmitVisualizerBody = {
  note?: unknown
  files?: unknown
}

type UploadedVisualizerFileMeta = {
  url: string
  fileName: string
  fileType: string
  sizeBytes: number
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toUploadedVisualizerFileMeta(
  value: unknown,
): UploadedVisualizerFileMeta | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const url = toOptionalString(record.url)
  const fileName = toOptionalString(record.fileName)
  const fileType =
    toOptionalString(record.fileType) ?? 'application/octet-stream'
  const sizeBytes =
    typeof record.sizeBytes === 'number' && Number.isFinite(record.sizeBytes)
      ? record.sizeBytes
      : 0
  if (!url || !fileName || sizeBytes <= 0) return null
  return { url, fileName, fileType, sizeBytes }
}

async function resolveLeadId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params
  const id = resolvedParams?.id
  if (typeof id !== 'string') return null
  const trimmed = id.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'Invalid lead id' },
        { status: 400 },
      )
    }

    const body = (await request
      .json()
      .catch(() => ({}))) as SubmitVisualizerBody
    const note = toOptionalString(body.note)
    const uploadedFiles = Array.isArray(body.files)
      ? body.files
          .map((item) => toUploadedVisualizerFileMeta(item))
          .filter((item): item is UploadedVisualizerFileMeta => Boolean(item))
      : []

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const isAdminOrSr =
      actorDepartments.has('ADMIN') || actorDepartments.has('SR_CRM')
    const isVisualizer =
      actorDepartments.has('VISUALIZER_3D') ||
      actorDepartments.has('3D_VISUALIZER')

    if (!isAdminOrSr && !isVisualizer) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Only assigned 3D Visualizer, Senior CRM, or Admin can submit visualizer work',
        },
        { status: 403 },
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({
        where: {
          id: leadId,
          stage: LeadStage.VISUALIZATION_PHASE,
          subStatus: LeadSubStatus.VISUAL_WORKING,
          ...(isAdminOrSr
            ? {}
            : {
                assignments: {
                  some: {
                    department: LeadAssignmentDepartment.VISUALIZER_3D,
                    userId: authResult.actorUserId,
                  },
                },
              }),
        },
        select: {
          id: true,
          name: true,
          subStatus: true,
          assignments: {
            where: {
              department: {
                in: [
                  LeadAssignmentDepartment.SR_CRM,
                  LeadAssignmentDepartment.VISUALIZER_3D,
                ],
              },
            },
            select: { userId: true, department: true },
          },
        },
      })

      if (!lead) throw new Error('LEAD_NOT_FOUND_OR_NOT_WORKING')

      const submission = await tx.cadWorkSubmission.create({
        data: {
          leadId: lead.id,
          submittedById: authResult.actorUserId,
          note: note ?? null,
          ...(uploadedFiles.length > 0
            ? {
                files: {
                  create: uploadedFiles.map((file) => ({
                    url: file.url,
                    fileName: file.fileName,
                    fileType: file.fileType,
                    sizeBytes: file.sizeBytes,
                    cadFileType: CadSubmissionFileType.OTHERS,
                  })),
                },
              }
            : {}),
        },
        select: { id: true },
      })

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: { subStatus: LeadSubStatus.VISUAL_COMPLETED },
        select: { id: true, stage: true, subStatus: true },
      })

      await logLeadSubStatusChanged(tx, {
        leadId: lead.id,
        userId: authResult.actorUserId,
        from: lead.subStatus,
        to: LeadSubStatus.VISUAL_COMPLETED,
        reason: '3D Visualizer submitted completed visualizer data for Senior CRM review.',
      })

      await logActivity(tx, {
        leadId: lead.id,
        userId: authResult.actorUserId,
        type: ActivityType.NOTE,
        description: note
          ? `3D visualization data submitted for Senior CRM review. Note: ${note}`
          : '3D visualization data submitted for Senior CRM review.',
      })

      const adminUsers = await tx.user.findMany({
        where: {
          isActive: true,
          userDepartments: { some: { department: { name: 'ADMIN' } } },
        },
        select: { id: true },
      })
      const targetUserIds = Array.from(
        new Set([
          ...lead.assignments
            .filter(
              (assignment) =>
                assignment.department === LeadAssignmentDepartment.SR_CRM,
            )
            .map((assignment) => assignment.userId),
          ...adminUsers.map((user) => user.id),
        ]),
      ).filter((userId) => userId !== authResult.actorUserId)

      if (targetUserIds.length > 0) {
        const now = new Date()
        await tx.notification.createMany({
          data: targetUserIds.map((userId) => ({
            userId,
            leadId: lead.id,
            type: NotificationType.LEAD_ASSIGNED_TO_YOU,
            title: '3D visualization submitted for review',
            message: `${lead.name} 3D visualization work is ready in Review Center.`,
            scheduledFor: now,
          })),
        })
        
        for (const userId of targetUserIds) {
          sendPushToUser(
            userId,
            '3D Visualization Ready for Review 🎨',
            `${lead.name} 3D visualization work is ready in the Review Center.`,
            { type: 'review', leadId: lead.id }
          ).catch(() => {})
        }
      }

      return { lead: updatedLead, submissionId: submission.id }
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: '3D visualization submitted to Senior CRM Review Center',
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'LEAD_NOT_FOUND_OR_NOT_WORKING'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Lead is not assigned to you or visualization work has not been started',
        },
        { status: 404 },
      )
    }
    console.error('[lead/:id/visualizer-work/submit][POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit visualization work' },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  })
}
