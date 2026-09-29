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
