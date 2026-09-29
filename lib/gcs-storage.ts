import { Storage } from '@google-cloud/storage'

function getGCSCredentials() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GCP_CLIENT_EMAIL
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || process.env.GCP_PRIVATE_KEY)?.replace(/\\n/g, '\n')
  const projectId = process.env.GOOGLE_PROJECT_ID || process.env.GCP_PROJECT_ID || 'vaulted-bus-495308-q0'
  const bucketName = process.env.GOOGLE_STORAGE_BUCKET || process.env.GCP_STORAGE_BUCKET || 'aesthetic-crm-storage'

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
