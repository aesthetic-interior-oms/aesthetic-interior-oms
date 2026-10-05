import { Storage } from '@google-cloud/storage'

function getGCSCredentials() {
  const clientEmail = process.env.GCS_CLIENT_EMAIL
  const privateKey = process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const projectId = process.env.GCS_PROJECT_ID || 'weighty-yew-413809'
  const bucketName = process.env.GCS_BUCKET_NAME || 'aesthetic-interior-database-storage'

  if (!clientEmail || !privateKey) {
    return null
  }

  return { clientEmail, privateKey, projectId, bucketName }
}

let storageInstance: Storage | null = null

export function getGCSStorage(): Storage | null {
  const creds = getGCSCredentials()
  if (!creds) return null

  if (!storageInstance) {
    storageInstance = new Storage({
      projectId: creds.projectId,
      credentials: {
        client_email: creds.clientEmail,
        private_key: creds.privateKey,
      },
    })
  }

  return storageInstance
}

export type GCSUploadResult = {
  url: string
  fileName: string
  fileType: string
  sizeBytes: number
}

type GCSUrlParts = {
  bucketName: string
  objectName: string
}

function getGCSUrlParts(url: string): GCSUrlParts | null {
  try {
    const parsed = new URL(url)
    const pathSegments = parsed.pathname.split('/').filter(Boolean)
    let bucketName: string | undefined
    let objectSegments: string[] = []

    if (parsed.hostname === 'storage.googleapis.com' || parsed.hostname === 'storage.cloud.google.com') {
      bucketName = pathSegments[0]
      objectSegments = pathSegments.slice(1)
    } else if (parsed.hostname.endsWith('.storage.googleapis.com')) {
      bucketName = parsed.hostname.slice(0, -'.storage.googleapis.com'.length)
      objectSegments = pathSegments
    } else {
      return null
    }

    const objectName = decodeURIComponent(objectSegments.join('/'))
    return bucketName && objectName ? { bucketName, objectName } : null
  } catch {
    return null
  }
}

/**
 * Returns whether a public URL belongs to this application's configured GCS
 * bucket and, optionally, to a specific object-prefix folder.
 */
export function isGCSUploadUrl(url: string, folder?: string): boolean {
  const parts = getGCSUrlParts(url)
  const bucketName = getGCSCredentials()?.bucketName || 'aesthetic-interior-database-storage'
  const normalizedFolder = folder?.replace(/^\/+|\/+$/g, '')

  return Boolean(
    parts &&
      parts.bucketName === bucketName &&
      (!normalizedFolder || parts.objectName.startsWith(`${normalizedFolder}/`)),
  )
}

/**
 * Reads an object through the configured service account. This keeps downloads
 * working when the GCS bucket is private, rather than relying on anonymous
 * access to the public storage.googleapis.com URL.
 */
export async function downloadFromGCSUrl(url: string): Promise<{
  buffer: Buffer
  contentType: string
}> {
  if (!isGCSUploadUrl(url)) {
    throw new Error('The requested file is not stored in the configured Google Cloud Storage bucket')
  }

  const storage = getGCSStorage()
  const creds = getGCSCredentials()
  if (!storage || !creds) {
    throw new Error('Google Cloud Storage credentials not configured')
  }

  const parts = getGCSUrlParts(url)
  if (!parts) {
    throw new Error('Invalid Google Cloud Storage object path')
  }

  const file = storage.bucket(creds.bucketName).file(parts.objectName)
  const [metadata] = await file.getMetadata()
  const [buffer] = await file.download()

  return {
    buffer,
    contentType: metadata.contentType || 'application/octet-stream',
  }
}

/**
 * Upload a File or Buffer to Google Cloud Storage.
 * Returns public URL and metadata.
 */
export async function uploadToGCS(
  fileOrBuffer: File | { name: string; type: string; buffer: Buffer },
  folder: string = 'attachments',
): Promise<GCSUploadResult> {
  const storage = getGCSStorage()
  if (!storage) {
    throw new Error('Google Cloud Storage credentials not configured')
  }

  const creds = getGCSCredentials()!
  const bucket = storage.bucket(creds.bucketName)

  let buffer: Buffer
  let fileName: string
  let fileType: string
  let sizeBytes: number

  if (fileOrBuffer instanceof File) {
    buffer = Buffer.from(await fileOrBuffer.arrayBuffer())
    fileName = fileOrBuffer.name
    fileType = fileOrBuffer.type || 'application/octet-stream'
    sizeBytes = fileOrBuffer.size
  } else {
    buffer = fileOrBuffer.buffer
    fileName = fileOrBuffer.name
    fileType = fileOrBuffer.type || 'application/octet-stream'
    sizeBytes = buffer.length
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const destination = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
  const fileRef = bucket.file(destination)

  await fileRef.save(buffer, {
    contentType: fileType,
    resumable: false,
  })

  const publicUrl = `https://storage.googleapis.com/${creds.bucketName}/${destination}`

  return {
    url: publicUrl,
    fileName,
    fileType,
    sizeBytes,
  }
}

export type GCSSignedUploadUrlResult = {
  uploadUrl: string
  publicUrl: string
  fileName: string
  fileType: string
}

/**
 * Generate a V4 Signed Upload URL for direct browser-to-GCS upload.
 * Bypasses serverless function payload size limits.
 */
export async function generateGCSSignedUploadUrl({
  fileName,
  fileType,
  folder = 'attachments',
}: {
  fileName: string
  fileType: string
  folder?: string
}): Promise<GCSSignedUploadUrlResult> {
  const storage = getGCSStorage()
  if (!storage) {
    throw new Error('Google Cloud Storage credentials not configured')
  }

  const creds = getGCSCredentials()!
  const bucket = storage.bucket(creds.bucketName)

  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const destination = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
  const fileRef = bucket.file(destination)

  const resolvedFileType = fileType || 'application/octet-stream'

  const [uploadUrl] = await fileRef.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: resolvedFileType,
  })

  const publicUrl = `https://storage.googleapis.com/${creds.bucketName}/${destination}`

  return {
    uploadUrl,
    publicUrl,
    fileName,
    fileType: resolvedFileType,
  }
}

export type GCSStatusResult = {
  configured: boolean
  connected: boolean
  projectId: string
  bucketName: string
  clientEmailConfigured: boolean
  privateKeyConfigured: boolean
  error?: string
}

export async function checkGCSConnection(): Promise<GCSStatusResult> {
  const creds = getGCSCredentials()
  if (!creds) {
    return {
      configured: false,
      connected: false,
      projectId: process.env.GCS_PROJECT_ID || 'weighty-yew-413809',
      bucketName: process.env.GCS_BUCKET_NAME || 'aesthetic-interior-database-storage',
      clientEmailConfigured: Boolean(process.env.GCS_CLIENT_EMAIL?.trim()),
      privateKeyConfigured: Boolean(process.env.GCS_PRIVATE_KEY?.trim()),
      error: 'Missing GCS_CLIENT_EMAIL or GCS_PRIVATE_KEY environment variables',
    }
  }

  try {
    const storage = getGCSStorage()
    if (!storage) {
      throw new Error('Failed to initialize Storage client')
    }

    const [exists] = await storage.bucket(creds.bucketName).exists()
    return {
      configured: true,
      connected: exists,
      projectId: creds.projectId,
      bucketName: creds.bucketName,
      clientEmailConfigured: true,
      privateKeyConfigured: true,
      error: exists ? undefined : `Bucket "${creds.bucketName}" does not exist or account lacks permission`,
    }
  } catch (err) {
    return {
      configured: true,
      connected: false,
      projectId: creds.projectId,
      bucketName: creds.bucketName,
      clientEmailConfigured: true,
      privateKeyConfigured: true,
      error: err instanceof Error ? err.message : 'Failed to connect to Google Cloud Storage',
    }
  }
}
