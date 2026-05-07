import { randomUUID } from 'crypto'
import { head, put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

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

async function resolveAttachmentReadUrl(url: string): Promise<string> {
  if (!url.includes('.private.blob.vercel-storage.com')) {
    return url
  }

  try {
    const blobMeta = await head(url)
    return blobMeta.downloadUrl || url
  } catch {
    return url
  }
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

    const withReadableUrls = await Promise.all(
      attachments.map(async (item) => ({
        ...item,
        url: await resolveAttachmentReadUrl(item.url),
      })),
    )

    return NextResponse.json({
      success: true,
      data: withReadableUrls,
      count: withReadableUrls.length,
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

      const safeName = sanitizeFileName(fileEntry.name || 'attachment')
      const storedFileName = `${Date.now()}-${randomUUID()}-${safeName}`
      const fileType = fileEntry.type || 'application/octet-stream'
      const blob = await put(`leads/${leadId}/${storedFileName}`, fileEntry, {
        access: 'public',
        contentType: fileType,
      })
      uploadedAttachment = {
        url: blob.url,
        fileName: fileEntry.name || safeName,
        fileType,
        sizeBytes: fileEntry.size,
      }
    }

    const attachment = await prisma.leadAttachment.create({
      data: {
        leadId,
        // Store a browser-openable URL.
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
    if (error instanceof Error && error.message.includes('BLOB_READ_WRITE_TOKEN')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN in environment variables.',
        },
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
