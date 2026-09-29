import { NextResponse } from 'next/server'
import { checkGCSConnection } from '@/lib/gcs-storage'

export async function GET() {
  try {
    const status = await checkGCSConnection()
    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check Google Cloud Storage status',
      },
      { status: 500 },
    )
  }
}
