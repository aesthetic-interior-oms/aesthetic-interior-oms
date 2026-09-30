import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { uploadToGCS } from '@/lib/gcs-storage'
import {
  ALLOWED_CAD_UPLOAD_EXTENSIONS,
  ALLOWED_CAD_UPLOAD_MIME_TYPES,
  CAD_EXTENSION_CONTENT_TYPE_MAP,
  getCadFileExtension,
  sanitizeCadFileName,
  MAX_CAD_SUBMISSION_FILE_SIZE_BYTES,
} from '@/lib/cad-work'

/**
 * POST /api/gcs/upload
 *
 * Receives a single file (multipart/form-data) from the browser client
 * and uploads it to Google Cloud Storage.
 *
 * Expected form fields:
 *   file     - the File blob
 *   context  - e.g. "cad-work", "quotation-work", "visualizer-work"
 *   ownerId  - leadId / orderId used for folder namespacing
 *
 * Returns:
 *   { success: true, data: { url, fileName, fileType, sizeBytes } }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'Expected multipart/form-data' },
        { status: 400 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const context = (formData.get('context') as string | null)?.trim() ?? 'attachments'
    const ownerId = (formData.get('ownerId') as string | null)?.trim() ?? 'unknown'

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // Validate size and type for CAD uploads
    if (context === 'cad-work') {
      if (file.size > MAX_CAD_SUBMISSION_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: `File "${file.name}" exceeds the ${Math.floor(MAX_CAD_SUBMISSION_FILE_SIZE_BYTES / (1024 * 1024))}MB limit`,
          },
          { status: 400 },
        )
      }

      const fileType = (file.type || '').trim().toLowerCase()
      const extension = getCadFileExtension(file.name || '')
      const isAllowed =
        (fileType && ALLOWED_CAD_UPLOAD_MIME_TYPES.has(fileType)) ||
        ALLOWED_CAD_UPLOAD_EXTENSIONS.has(extension)

      if (!isAllowed) {
        return NextResponse.json(
          {
            success: false,
            error: `File "${file.name}" type "${file.type || 'unknown'}" is not allowed for CAD uploads`,
          },
          { status: 400 },
        )
      }
    }

    // Resolve the GCS folder path from context + ownerId
    const folder = resolveGCSFolder(context, ownerId)

    // Resolve content type (especially for CAD files with no MIME)
    const resolvedFileType =
      file.type ||
      CAD_EXTENSION_CONTENT_TYPE_MAP[getCadFileExtension(file.name || '')] ||
      'application/octet-stream'

    // Sanitize filename based on context
    const safeName =
      context === 'cad-work'
        ? sanitizeCadFileName(file.name || 'cad-file')
        : file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

    const fileWithType = new File([await file.arrayBuffer()], safeName, {
      type: resolvedFileType,
    })

    const result = await uploadToGCS(fileWithType, folder)

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('credentials not configured')) {
      return NextResponse.json(
        { success: false, error: 'Google Cloud Storage is not configured on this server' },
        { status: 503 },
      )
    }
    console.error('[api/gcs/upload][POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'File upload to Google Cloud Storage failed' },
      { status: 500 },
    )
  }
}

function resolveGCSFolder(context: string, ownerId: string): string {
  switch (context) {
    case 'cad-work':
      return `cad-work-submissions/${ownerId}`
    case 'quotation-work':
      return `quotation-work-submissions/${ownerId}`
    case 'visualizer-work':
      return `visualizer-work-submissions/${ownerId}`
    case 'visit-result':
      return `visit-results/${ownerId}`
    case 'lead-attachment':
      return `lead-attachments/${ownerId}`
    case 'transaction-receipt':
      return `transaction-receipts/${ownerId}`
    default:
      return `attachments/${ownerId}`
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  })
}
