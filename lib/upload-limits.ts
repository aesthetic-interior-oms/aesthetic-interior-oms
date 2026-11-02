export const DIRECT_BUCKET_UPLOAD_MAX_BYTES = 20 * 1024 * 1024
export const DIRECT_GCS_UPLOAD_MAX_BYTES = DIRECT_BUCKET_UPLOAD_MAX_BYTES
export const DIRECT_BLOB_UPLOAD_MAX_BYTES = DIRECT_BUCKET_UPLOAD_MAX_BYTES

export const CAD_BUCKET_UPLOAD_MAX_BYTES = 200 * 1024 * 1024
export const CAD_WORK_UPLOAD_MAX_BYTES = CAD_BUCKET_UPLOAD_MAX_BYTES

export const VISUALIZER_BUCKET_UPLOAD_MAX_BYTES = 500 * 1024 * 1024
export const VISUALIZER_WORK_UPLOAD_MAX_BYTES = VISUALIZER_BUCKET_UPLOAD_MAX_BYTES

export function formatBytesToMbLabel(sizeBytes: number): string {
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`
}

export const DIRECT_BUCKET_UPLOAD_LIMIT_MESSAGE = `Files upload directly from your browser to Google Cloud Bucket and can be up to ${formatBytesToMbLabel(DIRECT_BUCKET_UPLOAD_MAX_BYTES)} each.`
export const DIRECT_GCS_UPLOAD_LIMIT_MESSAGE = DIRECT_BUCKET_UPLOAD_LIMIT_MESSAGE
export const DIRECT_BLOB_UPLOAD_LIMIT_MESSAGE = DIRECT_BUCKET_UPLOAD_LIMIT_MESSAGE

export const CAD_BUCKET_UPLOAD_LIMIT_MESSAGE = `CAD submissions upload directly to Google Cloud Bucket and can be up to ${formatBytesToMbLabel(CAD_BUCKET_UPLOAD_MAX_BYTES)} each.`
export const CAD_WORK_UPLOAD_LIMIT_MESSAGE = CAD_BUCKET_UPLOAD_LIMIT_MESSAGE

export const VISUALIZER_BUCKET_UPLOAD_LIMIT_MESSAGE = `3D Visualizer submissions upload directly from your browser to Google Cloud Bucket and can be up to ${formatBytesToMbLabel(VISUALIZER_BUCKET_UPLOAD_MAX_BYTES)} each.`
export const VISUALIZER_WORK_UPLOAD_LIMIT_MESSAGE = VISUALIZER_BUCKET_UPLOAD_LIMIT_MESSAGE

