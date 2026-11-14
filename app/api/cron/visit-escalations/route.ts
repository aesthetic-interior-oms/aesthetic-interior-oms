import { NextRequest, NextResponse } from 'next/server'
import {
  checkIncompleteVisitEscalations,
  checkAndSendLeaderboardRankChanges,
} from '@/lib/visit-notifications'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check for optional authorization token if CRON_SECRET is configured
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // If header doesn't match and it's not a Vercel cron internal trigger
      const vercelCronHeader = request.headers.get('x-vercel-cron')
      if (!vercelCronHeader) {
        return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
      }
    }

    const escalations = await checkIncompleteVisitEscalations()
    const leaderboard = await checkAndSendLeaderboardRankChanges()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      escalations,
      leaderboard,
    })
  } catch (error) {
    console.error('[cron/visit-escalations] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process visit escalations' },
      { status: 500 },
    )
  }
}
