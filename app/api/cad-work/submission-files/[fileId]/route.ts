import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { hasJrArchitectureLeadershipRole } from '@/lib/jr-architecture-roles'
import { deleteFromGCSUrl } from '@/lib/gcs-storage'
import { logActivity } from '@/lib/activity-log-service'
import { ActivityType } from '@/generated/prisma/client'

type RouteContext = { params: Promise<{ fileId: string }> }

async function resolveFileId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params
  const fileId = resolvedParams?.fileId
  if (typeof fileId !== 'string') return null
  const trimmed = fileId.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const fileId = await resolveFileId(context)
    if (!fileId) {
      return NextResponse.json({ success: false, error: 'Invalid file ID' }, { status: 400 })
    }

    const file = await prisma.cadWorkSubmissionFile.findUnique({
      where: { id: fileId },
      include: {
        submission: {
          select: {
            id: true,
            leadId: true,
            submittedById: true,
            versionName: true,
          },
        },
      },
    })

    if (!file) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 })
    }

    const actorDepartments = authResult.actor.userDepartments ?? []
    const isAdmin = actorDepartments.includes('ADMIN')
    const isJrArchitectLeader =
      actorDepartments.includes('JR_ARCHITECT') && hasJrArchitectureLeadershipRole(authResult.actorRoles)
    const isOwner = authResult.actorUserId === file.submission.submittedById

    if (!isOwner && !isAdmin && !isJrArchitectLeader) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this file' },
        { status: 403 },
      )
    }

    // 1. Delete from GCS
    await deleteFromGCSUrl(file.url)

    // 2. Delete matching LeadAttachment
    await prisma.leadAttachment.deleteMany({
      where: {
        leadId: file.submission.leadId,
        url: file.url,
      },
    })

    // 3. Delete from database
    await prisma.cadWorkSubmissionFile.delete({
      where: { id: fileId },
    })

    // 4. Log activity
    await logActivity(prisma, {
      leadId: file.submission.leadId,
      userId: authResult.actorUserId,
      type: ActivityType.NOTE,
      description: `CAD file "${file.fileName}" was deleted from ${file.submission.versionName ?? 'submission'}.`,
    })

    return NextResponse.json({
      success: true,
      message: `File "${file.fileName}" deleted successfully`,
    })
  } catch (error) {
    console.error('[cad-work/submission-files/:fileId][DELETE] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete file' }, { status: 500 })
  }
}
