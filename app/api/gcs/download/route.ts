import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fileUrl = searchParams.get('url')
  const customFileName = searchParams.get('fileName')

  if (!fileUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    const response = await fetch(fileUrl)
    if (!response.ok) {
      return NextResponse.json({ error: 'File not found or inaccessible' }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const arrayBuffer = await response.arrayBuffer()

    // Determine filename
    let fileName = customFileName
    if (!fileName) {
      const urlObj = new URL(fileUrl)
      fileName = urlObj.pathname.split('/').pop() || 'download'
    }

    // Clean filename for Content-Disposition header
    const safeFileName = fileName.replace(/["\r\n]/g, '_')

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeFileName)}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[GCS Download Proxy Error]:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
