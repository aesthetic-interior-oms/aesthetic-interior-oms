import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Vercel Blob upload has been replaced by Google Cloud Storage. Use /api/gcs/upload instead.',
    },
    { status: 410 },
  )
}
