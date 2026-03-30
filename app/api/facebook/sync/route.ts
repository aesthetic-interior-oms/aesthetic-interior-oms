import { NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { isFacebookConfigured, syncRecentFacebookConversationsToLeads } from '@/lib/facebook'

export async function POST() {
  console.info('[POST /api/facebook/sync] started')
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) {
    console.warn('[POST /api/facebook/sync] unauthorized request')
    return authResult.response
  }

  if (!isFacebookConfigured()) {
    console.warn('[POST /api/facebook/sync] config missing, aborting')
    return NextResponse.json(
      { success: false, error: 'Facebook Graph API is not configured' },
      { status: 400 },
    )
  }

  try {
    console.info('[POST /api/facebook/sync] running sync with limit=20')
    const result = await syncRecentFacebookConversationsToLeads({ limit: 20 })
    console.info(
      `[POST /api/facebook/sync] sync completed fetched=${result.fetchedConversations} created=${result.createdLeads}`,
    )
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Facebook conversations synced to leads',
    })
  } catch (error) {
    console.error('[POST /api/facebook/sync] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync Facebook conversations' },
      { status: 500 },
    )
  }
}
