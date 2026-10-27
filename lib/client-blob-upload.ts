/**
 * @deprecated Use @/lib/client-gcs-upload directly.
 * All uploads are stored in Google Cloud Storage (GCS).
 */
import {
  uploadDirectGCSFile,
  type ClientGCSUploadContext,
  type UploadedGCSFileMeta,
} from '@/lib/client-gcs-upload'

export type ClientBlobUploadContext = ClientGCSUploadContext
export type UploadedBlobFileMeta = UploadedGCSFileMeta

export const uploadDirectBlobFile = uploadDirectGCSFile
export { uploadDirectGCSFile }
