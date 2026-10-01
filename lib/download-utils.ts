/**
 * Returns a download URL tailored to the storage backend where the file is hosted.
 * - GCS files using path-style, console, or bucket-subdomain URLs are routed
 *   through /api/gcs/download to force Content-Disposition attachment download.
 * - Vercel Blob files (blob.vercel-storage.com) append ?download=1 to force browser download.
 * - Other URLs are returned as-is.
 */
export function getSmartDownloadUrl(url: string, fileName?: string): string {
  if (!url) return ''

  if (isGoogleCloudStorageUrl(url)) {
    const params = new URLSearchParams()
    params.set('url', url)
    if (fileName) {
      params.set('fileName', fileName)
    }
    return `/api/gcs/download?${params.toString()}`
  }

  if (url.includes('blob.vercel-storage.com')) {
    return url.includes('?') ? `${url}&download=1` : `${url}?download=1`
  }

  return url
}

function isGoogleCloudStorageUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return (
      hostname === 'storage.googleapis.com' ||
      hostname === 'storage.cloud.google.com' ||
      hostname.endsWith('.storage.googleapis.com')
    )
  } catch {
    return false
  }
}
