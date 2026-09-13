import { NextRequest, NextResponse } from 'next/server'
import { maybeRunFacebookFallbackSync } from '@/lib/facebook-sync-control'

export const runtime = 'nodejs'

function isCronAuthorized(request: NextRequest): boolean {
  const configuredSecret = process.env.FB_SYNC_CRON_SECRET?.trim()
  const authHeader = request.headers.get('authorization') ?? ''
  const incomingToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''

  if (configuredSecret) {
    return incomingToken.length > 0 && incomingToken === configuredSecret
  }

  // Fallback: require Vercel Cron header or authorization header
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  return isVercelCron || incomingToken.length > 0
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized cron request' },
      { status: 401 },
    )
  }

  try {
    const result = await maybeRunFacebookFallbackSync()
    return NextResponse.json({
      success: true,
      data: result,
      message: result.ran ? 'Fallback sync executed' : 'Fallback sync skipped',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Fallback sync failed',
      },
      { status: 500 },
    )
  }
}
