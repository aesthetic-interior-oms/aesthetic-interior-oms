import { uploadDirectGCSFile, type ClientGCSUploadContext } from '@/lib/client-gcs-upload'

export type ClientBlobUploadContext = ClientGCSUploadContext

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
  quotationFileType?: 'PREMIUM' | 'STANDARD' | 'BASIC' | 'MIXED' | 'PLATINUM' | 'LUXURY' | 'DETAIL'
  onProgress?: (percentage: number) => void
}

/**
 * Upload direct file. Now backed by Google Cloud Storage (GCS)
 * instead of Vercel Blob.
 */
export async function uploadDirectBlobFile({
  file,
  context,
  ownerId,
  onProgress,
}: UploadDirectBlobInput): Promise<UploadedBlobFileMeta> {
  return uploadDirectGCSFile({
    file,
    context,
    ownerId,
    onProgress,
  })
}
