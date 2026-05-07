import { upload } from '@vercel/blob/client'
import { DIRECT_BLOB_UPLOAD_MAX_BYTES, formatBytesToMbLabel } from '@/lib/upload-limits'

export type ClientBlobUploadContext = 'cad-work' | 'visit-result' | 'visit-support-result' | 'lead-attachment'

export type UploadedBlobFileMeta = {
  url: string
  fileName: string
  fileType: string
  sizeBytes: number
}

type UploadDirectBlobInput = {
  file: File
  context: ClientBlobUploadContext
  ownerId: string
  cadFileType?: string
  onProgress?: (percentage: number) => void
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function getPathPrefix(context: ClientBlobUploadContext): string {
  switch (context) {
    case 'cad-work':
      return 'cad-work-submissions'
    case 'visit-result':
      return 'visit-results'
    case 'visit-support-result':
      return 'visit-support-results'
    case 'lead-attachment':
      return 'leads'
  }
}

export async function uploadDirectBlobFile({
  file,
  context,
  ownerId,
  cadFileType,
  onProgress,
}: UploadDirectBlobInput): Promise<UploadedBlobFileMeta> {
  if (file.size > DIRECT_BLOB_UPLOAD_MAX_BYTES) {
    throw new Error(
      `"${file.name}" is ${formatBytesToMbLabel(file.size)}. Direct browser upload supports up to ${formatBytesToMbLabel(
        DIRECT_BLOB_UPLOAD_MAX_BYTES,
      )} per file.`,
    )
  }

  const safeName = sanitizeFileName(file.name || 'attachment')
  const pathname = `${getPathPrefix(context)}/${ownerId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/client-upload',
    clientPayload: JSON.stringify({
      context,
      ownerId,
      fileName: file.name || safeName,
      fileType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      cadFileType,
    }),
    contentType: file.type || 'application/octet-stream',
    multipart: file.size > 8 * 1024 * 1024,
    onUploadProgress: ({ percentage }) => onProgress?.(percentage),
  })

  return {
    url: blob.url,
    fileName: file.name || safeName,
    fileType: file.type || blob.contentType || 'application/octet-stream',
    sizeBytes: file.size,
  }
}
