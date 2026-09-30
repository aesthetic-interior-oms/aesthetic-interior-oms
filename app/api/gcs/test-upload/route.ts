import { NextResponse } from 'next/server'
import { uploadToGCS } from '@/lib/gcs-storage'

export async function POST() {
  try {
    const testContent = `Aesthetic CRM Google Cloud Storage connection test executed at ${new Date().toISOString()}`
    const buffer = Buffer.from(testContent, 'utf-8')
    const fileName = `test-connection-${Date.now()}.txt`

    const uploadResult = await uploadToGCS(
      {
        name: fileName,
        type: 'text/plain',
        buffer,
      },
      'system-tests',
    )

    return NextResponse.json({
      success: true,
      data: {
        message: 'File successfully uploaded to Google Cloud Storage!',
        file: uploadResult,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Test upload failed',
      },
      { status: 500 },
    )
  }
}
