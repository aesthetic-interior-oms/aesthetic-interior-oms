import {
  CAD_BUCKET_UPLOAD_MAX_BYTES,
  DIRECT_BUCKET_UPLOAD_MAX_BYTES,
  VISUALIZER_BUCKET_UPLOAD_MAX_BYTES,
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
  | 'website-project'
  | 'website-team'
  | 'website-testimonial'

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
  cadFileType?: string
  quotationFileType?: string
  onProgress?: (percentage: number) => void
}

function getUploadMaxBytes(context: ClientGCSUploadContext): number {
  if (context === 'visualizer-work') return VISUALIZER_BUCKET_UPLOAD_MAX_BYTES
  if (context === 'cad-work') return CAD_BUCKET_UPLOAD_MAX_BYTES
  return DIRECT_BUCKET_UPLOAD_MAX_BYTES
}

/**
 * Upload a single file to Google Cloud Storage Bucket via the /api/gcs/upload endpoint.
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
      `"${file.name}" is ${formatBytesToMbLabel(file.size)}. Direct Google Cloud Bucket upload supports up to ${formatBytesToMbLabel(maxBytes)} per file.`,
    )
  }

  // 1. Request a V4 Signed Upload URL from server (light JSON payload < 1KB)
  const signedUrlRes = await fetch('/api/gcs/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type || undefined,
      sizeBytes: file.size,
      context,
      ownerId,
    }),
  })

  type SignedUrlPayload = {
    success?: boolean
    error?: string
    data?: { uploadUrl: string; publicUrl: string; fileName: string; fileType: string }
  }

  let payload: SignedUrlPayload | null = null

  try {
    payload = (await signedUrlRes.json()) as SignedUrlPayload
  } catch {
    payload = null
  }

  if (!signedUrlRes.ok || !payload?.success || !payload?.data?.uploadUrl) {
    const errorMsg =
      payload?.error ||
      `Failed to initialize direct Google Cloud Bucket upload (HTTP ${signedUrlRes.status}).`
    throw new Error(errorMsg)
  }

  const { uploadUrl, publicUrl, fileName, fileType } = payload.data
  const resolvedType = fileType || file.type || 'application/octet-stream'

  // 2. Direct Browser-to-GCS PUT Upload via Signed URL (Bypasses Vercel 4.5MB Payload Limit)
  return new Promise<UploadedGCSFileMeta>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentage = Math.round((event.loaded / event.total) * 100)
        onProgress(percentage)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve({
          url: publicUrl,
          fileName: fileName || file.name,
          fileType: resolvedType,
          sizeBytes: file.size,
        })
      } else {
        reject(
          new Error(
            `Direct Google Cloud Bucket upload failed with HTTP status ${xhr.status}.`,
          ),
        )
      }
    }

    xhr.onerror = () =>
      reject(
        new Error(
          'Direct Google Cloud Bucket upload failed due to network or CORS error. Please check your connection.',
        ),
      )

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', resolvedType)
    xhr.send(file)
  })
}

