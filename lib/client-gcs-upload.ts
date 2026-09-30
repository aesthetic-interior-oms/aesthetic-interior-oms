import {
  DIRECT_BLOB_UPLOAD_MAX_BYTES,
  VISUALIZER_WORK_UPLOAD_MAX_BYTES,
  formatBytesToMbLabel,
} from '@/lib/upload-limits'

export type ClientGCSUploadContext =
  | 'cad-work'
  | 'quotation-work'
  | 'visualizer-work'
  | 'visit-result'
  | 'visit-support-result'
  | 'lead-attachment'
  | 'transaction-receipt'

export type UploadedGCSFileMeta = {
  url: string
  fileName: string
  fileType: string
  sizeBytes: number
}

type UploadDirectGCSInput = {
  file: File
  context: ClientGCSUploadContext
  ownerId: string
  onProgress?: (percentage: number) => void
}

function getUploadMaxBytes(context: ClientGCSUploadContext): number {
  return context === 'visualizer-work'
    ? VISUALIZER_WORK_UPLOAD_MAX_BYTES
    : DIRECT_BLOB_UPLOAD_MAX_BYTES
}

/**
 * Upload a single file to Google Cloud Storage via the /api/gcs/upload endpoint.
 * Mirrors the API of uploadDirectBlobFile() from client-blob-upload.ts.
 */
export async function uploadDirectGCSFile({
  file,
  context,
  ownerId,
  onProgress,
}: UploadDirectGCSInput): Promise<UploadedGCSFileMeta> {
  const maxBytes = getUploadMaxBytes(context)
  if (file.size > maxBytes) {
    throw new Error(
      `"${file.name}" is ${formatBytesToMbLabel(file.size)}. Upload supports up to ${formatBytesToMbLabel(maxBytes)} per file.`,
    )
  }

  const form = new FormData()
  form.append('file', file)
  form.append('context', context)
  form.append('ownerId', ownerId)

  // Simulate upload progress since fetch doesn't support it natively
  onProgress?.(10)

  const response = await fetch('/api/gcs/upload', {
    method: 'POST',
    body: form,
  })

  onProgress?.(90)

  const payload = (await response.json()) as {
    success: boolean
    error?: string
    data?: UploadedGCSFileMeta
  }

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error ?? 'GCS upload failed')
  }

  onProgress?.(100)

  return payload.data
}
