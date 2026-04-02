import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { ActivityType, LeadStage, ProjectStatus } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { autoCompletePendingFollowups } from '@/lib/followup-auto-complete'
import { logActivity, logLeadStageChanged } from '@/lib/activity-log-service'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

async function resolveVisitId(context: RouteContext): Promise<string | null> {
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

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function getLeadAttachmentCategory(fileType: string): 'MEDIA' | 'FILE' {
  if (fileType.startsWith('image/') || fileType.startsWith('video/')) {
    return 'MEDIA'
  }
  return 'FILE'
}

function toProjectStatus(value: unknown): ProjectStatus | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  return Object.values(ProjectStatus).includes(normalized as ProjectStatus)
    ? (normalized as ProjectStatus)
    : null
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const visitId = await resolveVisitId(context)
    if (!visitId) {
      return NextResponse.json({ success: false, error: 'Invalid visit schedule id' }, { status: 400 })
    }

    const result = await prisma.visitResult.findUnique({
      where: { visitId },
      include: {
        files: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!result) {
      return NextResponse.json({ success: false, error: 'Visit result not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[visit-schedule/:id/result][GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch visit result' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const visitId = await resolveVisitId(context)
    if (!visitId) {
      return NextResponse.json({ success: false, error: 'Invalid visit schedule id' }, { status: 400 })
    }

    const actor = await prisma.user.findUnique({
      where: { id: authResult.actorUserId },
      select: {
        id: true,
        userDepartments: {
          select: {
            department: { select: { name: true } },
          },
        },
      },
    })

    const departments = new Set((actor?.userDepartments ?? []).map((row) => row.department.name))
    const isVisitTeam = departments.has('VISIT_TEAM')
    const isAdmin = departments.has('ADMIN')

    if (!isVisitTeam && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only visit team can submit visit results' },
        { status: 403 },
      )
    }

    const formData = await request.formData()
    const summary = toOptionalString(formData.get('summary'))
    const clientMood = toOptionalString(formData.get('clientMood'))
    const note = toOptionalString(formData.get('note'))
    const projectStatus = toProjectStatus(formData.get('projectStatus'))

    if (!summary) {
      return NextResponse.json({ success: false, error: 'Summary is required' }, { status: 400 })
    }
    if (formData.get('projectStatus') !== null && !projectStatus) {
      return NextResponse.json(
        { success: false, error: 'projectStatus must be UNDER_CONSTRUCTION or READY' },
        { status: 400 },
      )
    }

    const files = formData
      .getAll('files')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)

    const result = await prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUnique({
        where: { id: visitId },
        select: {
          id: true,
          leadId: true,
          assignedToId: true,
          lead: {
            select: { stage: true },
          },
          result: {
            select: { id: true },
          },
        },
      })

      if (!visit) {
        throw new Error('VISIT_NOT_FOUND')
      }

      if (visit.result) {
        throw new Error('RESULT_EXISTS')
      }

      if (isVisitTeam && !isAdmin && visit.assignedToId !== authResult.actorUserId) {
        throw new Error('NOT_ASSIGNED')
      }

      const createdResult = await tx.visitResult.create({
        data: {
          visitId,
          summary,
          clientMood,
        },
      })

      await tx.visit.update({
        where: { id: visit.id },
        data: {
          status: 'COMPLETED',
          ...(projectStatus ? { projectStatus } : {}),
        },
      })

      if (note) {
        await tx.note.create({
          data: {
            leadId: visit.leadId,
            userId: authResult.actorUserId,
            content: note,
          },
        })
      }

      if (files.length > 0) {
        const relativeDir = path.join('uploads', 'visit-results', visitId)
        const uploadDir = path.join(process.cwd(), 'public', relativeDir)
        await mkdir(uploadDir, { recursive: true })

        for (const file of files) {
          const safeName = sanitizeFileName(file.name || 'attachment')
          const storedFileName = `${Date.now()}-${randomUUID()}-${safeName}`
          const fullPath = path.join(uploadDir, storedFileName)
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          await writeFile(fullPath, buffer)

          await tx.attachment.create({
            data: {
              visitResultId: createdResult.id,
              url: `/${relativeDir}/${storedFileName}`.replace(/\\/g, '/'),
              fileName: file.name || safeName,
              fileType: file.type || 'application/octet-stream',
            },
          })

          await tx.leadAttachment.create({
            data: {
              leadId: visit.leadId,
              url: `/${relativeDir}/${storedFileName}`.replace(/\\/g, '/'),
              fileName: file.name || safeName,
              fileType: file.type || 'application/octet-stream',
              category: getLeadAttachmentCategory(file.type || 'application/octet-stream'),
              sizeBytes: file.size,
            },
          })
        }
      }

      if (visit.lead.stage !== LeadStage.VISIT_COMPLETED) {
        await tx.lead.update({
          where: { id: visit.leadId },
          data: {
            stage: LeadStage.VISIT_COMPLETED,
            subStatus: null,
          },
        })

        await logLeadStageChanged(tx, {
          leadId: visit.leadId,
          userId: authResult.actorUserId,
          from: visit.lead.stage,
          to: LeadStage.VISIT_COMPLETED,
          reason: 'Visit result submitted',
        })
      }

      await logActivity(tx, {
        leadId: visit.leadId,
        userId: authResult.actorUserId,
        type: ActivityType.NOTE,
        description: `Visit ${visit.id} marked completed with a submitted visit result.`,
      })

      await autoCompletePendingFollowups(tx, {
        leadId: visit.leadId,
        userId: authResult.actorUserId,
        action: 'visit completed',
      })

      return tx.visitResult.findUnique({
        where: { id: createdResult.id },
        include: {
          files: {
            orderBy: { createdAt: 'desc' },
          },
          visit: {
            select: {
              id: true,
              status: true,
              leadId: true,
            },
          },
        },
      })
    })

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Visit result submitted successfully',
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'VISIT_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Visit schedule not found' }, { status: 404 })
    }

    if (error instanceof Error && error.message === 'RESULT_EXISTS') {
      return NextResponse.json(
        { success: false, error: 'Visit result already exists for this visit' },
        { status: 409 },
      )
    }

    if (error instanceof Error && error.message === 'NOT_ASSIGNED') {
      return NextResponse.json(
        { success: false, error: 'You can only submit results for visits assigned to you' },
        { status: 403 },
      )
    }

    console.error('[visit-schedule/:id/result][POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit visit result' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, POST, OPTIONS',
    },
  })
}
