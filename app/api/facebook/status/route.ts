import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  checkFacebookGraphConnection,
  getFacebookConfigStatus,
  syncRecentFacebookConversationsToLeads,
} from '@/lib/facebook'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export async function GET(request: NextRequest) {
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) {
    return authResult.response
  }

  const config = getFacebookConfigStatus()
  const graphConnection = await checkFacebookGraphConnection()
  const runSync = request.nextUrl.searchParams.get('sync') === '1'

  let syncResult: Awaited<ReturnType<typeof syncRecentFacebookConversationsToLeads>> | null = null
  if (runSync && config.configured) {
    syncResult = await syncRecentFacebookConversationsToLeads({ limit: 20 })
  }

  return NextResponse.json({
    success: true,
    data: {
      checkedAt: new Date().toISOString(),
      config: {
        configured: config.configured,
        tokenConfigured: config.tokenConfigured,
        pageIdConfigured: config.pageIdConfigured,
        graphVersion: config.graphVersion,
        pageId: config.pageId,
        verifyTokenConfigured: Boolean(
          process.env.FB_WEBHOOK_VERIFY_TOKEN || process.env.FB_VERIFY_TOKEN,
        ),
      },
      graphConnection,
      syncResult,
      webhookPath: '/api/webhooks/facebook',
    },
  })
}
