import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { downloadFromGCSUrl } from '@/lib/gcs-storage'

export async function GET(request: NextRequest) {
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) return authResult.response

  const { searchParams } = new URL(request.url)
  const fileUrl = searchParams.get('url')
  const customFileName = searchParams.get('fileName')

  if (!fileUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    const { buffer, contentType } = await downloadFromGCSUrl(fileUrl)

    // Determine filename
    let fileName = customFileName
    if (!fileName) {
      const urlObj = new URL(fileUrl)
      fileName = urlObj.pathname.split('/').pop() || 'download'
    }

    // Clean filename for Content-Disposition header
    const safeFileName = fileName.replace(/["\r\n]/g, '_')

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeFileName)}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[GCS Download Proxy Error]:', error)
    const message = error instanceof Error ? error.message : 'Failed to download file'
    const status = message.includes('credentials not configured') ? 503 : 404
    return NextResponse.json({ error: message }, { status })
  }
}
