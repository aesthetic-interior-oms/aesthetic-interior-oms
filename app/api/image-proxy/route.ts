import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

    // Basic validation: only allow http(s)
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
    }

    const res = await fetch(url)
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const buffer = await res.arrayBuffer()

    const response = new NextResponse(Buffer.from(buffer))
    response.headers.set('Content-Type', contentType)
    // Allow cross-origin for html2canvas requests
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Cache-Control', 'public, max-age=86400')
    return response
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}
