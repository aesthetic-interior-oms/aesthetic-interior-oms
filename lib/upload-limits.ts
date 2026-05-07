export const DIRECT_BLOB_UPLOAD_MAX_BYTES = 20 * 1024 * 1024

export function formatBytesToMbLabel(sizeBytes: number): string {
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`
}

export const DIRECT_BLOB_UPLOAD_LIMIT_MESSAGE = `Files upload directly from your browser to Vercel Blob and can be up to ${formatBytesToMbLabel(DIRECT_BLOB_UPLOAD_MAX_BYTES)} each.`
