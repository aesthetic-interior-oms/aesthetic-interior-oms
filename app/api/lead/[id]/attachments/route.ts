import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { uploadToGCS } from '@/lib/gcs-storage'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

async function resolveLeadId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params
  const id = resolvedParams?.id

  if (typeof id !== 'string') return null

  const trimmed = id.trim()
  return trimmed.length > 0 ? trimmed : null
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

type UploadedAttachmentMeta = {
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

function toUploadedAttachmentMeta(value: unknown): UploadedAttachmentMeta | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const url = toOptionalString(record.url)
  const fileName = toOptionalString(record.fileName)
  const fileType = toOptionalString(record.fileType) ?? 'application/octet-stream'
  const sizeBytes = typeof record.sizeBytes === 'number' && Number.isFinite(record.sizeBytes) ? record.sizeBytes : 0
  if (!url || !fileName || sizeBytes <= 0) return null
  return { url, fileName, fileType, sizeBytes }
}

function getCategory(fileType: string): 'MEDIA' | 'FILE' {
  if (fileType.startsWith('image/') || fileType.startsWith('video/')) {
    return 'MEDIA'
  }

  return 'FILE'
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const leadId = await resolveLeadId(context)

  if (!leadId) {
    return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
  }

  try {
    const attachments = await prisma.leadAttachment.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: attachments,
      count: attachments.length,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      })
    }
    console.error('[lead/:id/attachments][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attachments' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const leadId = await resolveLeadId(context)

  if (!leadId) {
    return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
  }

  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    const contentType = request.headers.get('content-type') ?? ''
    let uploadedAttachment: UploadedAttachmentMeta

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { file?: unknown }
      const directFile = toUploadedAttachmentMeta(body.file)
      if (!directFile) {
        return NextResponse.json(
          { success: false, error: 'Direct-uploaded attachment metadata is required' },
          { status: 400 },
        )
      }
      uploadedAttachment = directFile
    } else {
      const formData = await request.formData()
      const fileEntry = formData.get('file')

      if (!(fileEntry instanceof File)) {
        return NextResponse.json(
          { success: false, error: 'Attachment file is required' },
          { status: 400 },
        )
      }

      if (!fileEntry.size) {
        return NextResponse.json(
          { success: false, error: 'Attachment file cannot be empty' },
          { status: 400 },
        )
      }

      const gcsResult = await uploadToGCS(fileEntry, `lead-attachments/${leadId}`)
      uploadedAttachment = {
        url: gcsResult.url,
        fileName: gcsResult.fileName,
        fileType: gcsResult.fileType,
        sizeBytes: gcsResult.sizeBytes,
      }
    }

    const attachment = await prisma.leadAttachment.create({
      data: {
        leadId,
        url: uploadedAttachment.url,
        fileName: uploadedAttachment.fileName,
        fileType: uploadedAttachment.fileType,
        category: getCategory(uploadedAttachment.fileType),
        sizeBytes: uploadedAttachment.sizeBytes,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: attachment,
        message: 'Attachment uploaded successfully',
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return NextResponse.json(
        { success: false, error: 'Attachments table is not ready yet. Please run migrations.' },
        { status: 503 },
      )
    }
    console.error('[lead/:id/attachments][POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload attachment' },
      { status: 500 },
    )
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
