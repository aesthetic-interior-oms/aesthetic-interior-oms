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

  // 1. Request a V4 Signed Upload URL from server (light JSON payload < 1KB)
  let signedUrlData: {
    uploadUrl: string
    publicUrl: string
    fileName: string
    fileType: string
  } | null = null

  try {
    const signedUrlRes = await fetch('/api/gcs/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        sizeBytes: file.size,
        context,
        ownerId,
      }),
    })

    if (signedUrlRes.ok) {
      const payload = (await signedUrlRes.json()) as {
        success: boolean
        error?: string
        data?: { uploadUrl: string; publicUrl: string; fileName: string; fileType: string }
      }
      if (payload.success && payload.data?.uploadUrl) {
        signedUrlData = payload.data
      }
    }
  } catch (err) {
    console.warn('[uploadDirectGCSFile] Failed to obtain signed upload URL, attempting fallback:', err)
  }

  // 2. Direct Browser-to-GCS PUT Upload via Signed URL (Bypasses Vercel 4.5MB Payload Limit)
  if (signedUrlData) {
    const { uploadUrl, publicUrl, fileName, fileType } = signedUrlData
    const resolvedType = fileType || file.type || 'application/octet-stream'

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
          reject(new Error(`Direct GCS upload failed with HTTP status ${xhr.status}`))
        }
      }

      xhr.onerror = () => reject(new Error('Direct GCS upload failed due to network error'))

      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', resolvedType)
      xhr.send(file)
    })
  }

  // 3. Fallback: Proxy upload for small files (<= 4.5MB)
  if (file.size > 4.5 * 1024 * 1024) {
    throw new Error('File exceeds serverless payload limits. Direct storage upload failed.')
  }

  const form = new FormData()
  form.append('file', file)
  form.append('context', context)
  form.append('ownerId', ownerId)

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

