import 'server-only'

import prisma from '@/lib/prisma'

type FacebookConversation = {
  id: string
  updated_time?: string
  participants?: {
    data?: Array<{
      id?: string
      name?: string
    }>
  }
  messages?: {
    data?: Array<{
      id?: string
      message?: string
      created_time?: string
      from?: {
        id?: string
        name?: string
      }
    }>
  }
}

type FacebookConversationResponse = {
  data?: FacebookConversation[]
  paging?: {
    cursors?: {
      before?: string
      after?: string
    }
    next?: string
  }
}

type FacebookPageProfile = {
  id?: string
  name?: string
}

type SyncFacebookOptions = {
  limit?: number
}

type SyncFacebookResult = {
  fetchedConversations: number
  createdLeads: number
}

type FetchFacebookConversationPageOptions = {
  limit?: number
  afterCursor?: string | null
}

type FetchFacebookConversationPageResult = {
  conversations: FacebookConversation[]
  nextCursor: string | null
}

type SyncFacebookIncrementalOptions = {
  limit?: number
  afterCursor?: string | null
  watermarkIso?: string | null
}

type SyncFacebookIncrementalResult = {
  fetchedConversations: number
  createdLeads: number
  nextCursor: string | null
  maxUpdatedTimeIso: string | null
}

const FB_DEFAULT_LIMIT = 20
const FB_LOG_PREFIX = '[facebook-lib]'

function getFacebookConfig() {
  const token = process.env.FB_PAGE_ACCESS_TOKEN
  const pageId = process.env.FB_PAGE_ID
  const graphVersion = process.env.FB_GRAPH_VERSION || 'v25.0'
  return { token, pageId, graphVersion }
}

export function isFacebookConfigured(): boolean {
  const { token, pageId } = getFacebookConfig()
  return Boolean(token && pageId)
}

export function getFacebookConfigStatus() {
  const { token, pageId, graphVersion } = getFacebookConfig()
  return {
    tokenConfigured: Boolean(token),
    pageIdConfigured: Boolean(pageId),
    graphVersion,
    pageId: pageId ?? null,
    configured: Boolean(token && pageId),
  }
}

function conversationMarker(conversationId: string): string {
  return `FB_CONVERSATION_ID:${conversationId}`
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const { token, graphVersion } = getFacebookConfig()
  if (!token) {
    console.warn(`${FB_LOG_PREFIX} graph_get aborted reason=missing_access_token path=${path}`)
    throw new Error('FB_PAGE_ACCESS_TOKEN is missing')
  }

  const query = new URLSearchParams({
    ...params,
    access_token: token,
  })
  const url = `https://graph.facebook.com/${graphVersion}${path}?${query.toString()}`
  console.info(
    `${FB_LOG_PREFIX} graph_get start path=${path} graph_version=${graphVersion} param_keys=${Object.keys(params).join(',')}`,
  )

  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    const errorText = await response.text()
    console.error(
      `${FB_LOG_PREFIX} graph_get failed path=${path} status=${response.status} error=${errorText}`,
    )
    throw new Error(`Facebook Graph API error (${response.status}): ${errorText}`)
  }

  console.info(`${FB_LOG_PREFIX} graph_get success path=${path} status=${response.status}`)
  return (await response.json()) as T
}

export async function fetchRecentFacebookConversations(limit = FB_DEFAULT_LIMIT): Promise<FacebookConversation[]> {
  const page = await fetchFacebookConversationPage({ limit })
  return page.conversations
}

export async function fetchFacebookConversationPage(
  options: FetchFacebookConversationPageOptions = {},
): Promise<FetchFacebookConversationPageResult> {
  const { pageId } = getFacebookConfig()
  if (!pageId) {
    console.warn(`${FB_LOG_PREFIX} fetch_conversations aborted reason=missing_page_id`)
    throw new Error('FB_PAGE_ID is missing')
  }
  const limit = options.limit ?? FB_DEFAULT_LIMIT
  const afterCursor = options.afterCursor?.trim() || null
  console.info(
    `${FB_LOG_PREFIX} fetch_conversations start page_id=${pageId} limit=${limit} after_cursor=${afterCursor ?? 'null'}`,
  )

  const payload = await graphGet<FacebookConversationResponse>(`/${pageId}/conversations`, {
    fields:
      'id,updated_time,participants.limit(10){id,name},messages.limit(1){id,message,created_time,from{id,name}}',
    limit: String(limit),
    ...(afterCursor ? { after: afterCursor } : {}),
  })

  const conversations = Array.isArray(payload.data) ? payload.data : []
  const nextCursor = payload.paging?.next ? payload.paging?.cursors?.after ?? null : null
  console.info(
    `${FB_LOG_PREFIX} fetch_conversations success count=${conversations.length} next_cursor=${nextCursor ?? 'null'}`,
  )
  return { conversations, nextCursor }
}

export async function checkFacebookGraphConnection() {
  const { pageId } = getFacebookConfig()
  console.info(`${FB_LOG_PREFIX} graph_connection_check start page_id_configured=${Boolean(pageId)}`)
  if (!pageId) {
    console.warn(`${FB_LOG_PREFIX} graph_connection_check failed reason=missing_page_id`)
    return {
      ok: false as const,
      error: 'FB_PAGE_ID is missing',
    }
  }

  try {
    const page = await graphGet<FacebookPageProfile>(`/${pageId}`, {
      fields: 'id,name',
    })
    const conversations = await fetchRecentFacebookConversations(3)
    console.info(
      `${FB_LOG_PREFIX} graph_connection_check success page_id=${page.id ?? pageId} page_name=${page.name ?? 'null'} sample_count=${conversations.length}`,
    )
    return {
      ok: true as const,
      pageId: page.id ?? pageId,
      pageName: page.name ?? null,
      sampleConversationCount: conversations.length,
    }
  } catch (error) {
    console.error(`${FB_LOG_PREFIX} graph_connection_check failed:`, error)
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Unknown Graph API error',
    }
  }
}

function extractCustomerName(conversation: FacebookConversation, pageId: string): string | null {
  const participants = conversation.participants?.data ?? []
  const customer = participants.find((participant) => participant.id && participant.id !== pageId)
  const normalized = customer?.name?.trim()
  return normalized && normalized.length > 0 ? normalized : null
}

async function importConversationToLead(conversation: FacebookConversation, pageId: string): Promise<boolean> {
  if (!conversation.id) {
    return false
  }

  const marker = conversationMarker(conversation.id)
  const existing = await prisma.lead.findFirst({
    where: {
      source: { equals: 'Facebook', mode: 'insensitive' },
      remarks: { contains: marker },
    },
    select: { id: true },
  })

  if (existing) {
    return false
  }

  const customerName =
    extractCustomerName(conversation, pageId) ??
    `Facebook User ${conversation.id.slice(-6)}`

  const lastMessage = conversation.messages?.data?.[0]?.message?.trim() ?? ''

  await prisma.lead.create({
    data: {
      name: customerName,
      source: 'Facebook',
      remarks: lastMessage
        ? `${marker}\nImported from Facebook.\nLast message: ${lastMessage}`
        : `${marker}\nImported from Facebook conversation.`,
    },
  })

  return true
}

export async function syncRecentFacebookConversationsToLeads(
  options: SyncFacebookOptions = {},
): Promise<SyncFacebookResult> {
  const { pageId } = getFacebookConfig()
  const limit = options.limit ?? FB_DEFAULT_LIMIT
  console.info(
    `${FB_LOG_PREFIX} sync start page_id_configured=${Boolean(pageId)} config_ok=${isFacebookConfigured()} limit=${limit}`,
  )
  if (!pageId || !isFacebookConfigured()) {
    console.warn(`${FB_LOG_PREFIX} sync skipped reason=incomplete_config`)
    return { fetchedConversations: 0, createdLeads: 0 }
  }

  const { conversations } = await fetchFacebookConversationPage({ limit })
  let createdLeads = 0

  for (const conversation of conversations) {
    if (await importConversationToLead(conversation, pageId)) {
      createdLeads += 1
    }
  }

  console.info(
    `${FB_LOG_PREFIX} sync completed fetched=${conversations.length} created=${createdLeads}`,
  )
  return {
    fetchedConversations: conversations.length,
    createdLeads,
  }
}

export async function syncFacebookConversationsIncremental(
  options: SyncFacebookIncrementalOptions = {},
): Promise<SyncFacebookIncrementalResult> {
  const { pageId } = getFacebookConfig()
  const limit = options.limit ?? FB_DEFAULT_LIMIT
  const afterCursor = options.afterCursor?.trim() || null
  const watermark = options.watermarkIso ? new Date(options.watermarkIso) : null
  const watermarkMs = watermark && !Number.isNaN(watermark.getTime()) ? watermark.getTime() : null
  console.info(
    `${FB_LOG_PREFIX} sync_incremental start page_id_configured=${Boolean(pageId)} config_ok=${isFacebookConfigured()} limit=${limit} after_cursor=${afterCursor ?? 'null'} watermark=${options.watermarkIso ?? 'null'}`,
  )

  if (!pageId || !isFacebookConfigured()) {
    console.warn(`${FB_LOG_PREFIX} sync_incremental skipped reason=incomplete_config`)
    return {
      fetchedConversations: 0,
      createdLeads: 0,
      nextCursor: null,
      maxUpdatedTimeIso: options.watermarkIso ?? null,
    }
  }

  const { conversations, nextCursor } = await fetchFacebookConversationPage({ limit, afterCursor })
  let createdLeads = 0
  let maxUpdatedMs = watermarkMs

  for (const conversation of conversations) {
    const updatedMs = conversation.updated_time ? new Date(conversation.updated_time).getTime() : null
    const isValidUpdatedMs = updatedMs !== null && !Number.isNaN(updatedMs)

    if (afterCursor === null && watermarkMs !== null && isValidUpdatedMs && updatedMs <= watermarkMs) {
      continue
    }

    if (isValidUpdatedMs) {
      maxUpdatedMs = maxUpdatedMs === null ? updatedMs : Math.max(maxUpdatedMs, updatedMs)
    }

    if (await importConversationToLead(conversation, pageId)) {
      createdLeads += 1
    }
  }

  const maxUpdatedTimeIso = maxUpdatedMs === null ? null : new Date(maxUpdatedMs).toISOString()
  console.info(
    `${FB_LOG_PREFIX} sync_incremental completed fetched=${conversations.length} created=${createdLeads} next_cursor=${nextCursor ?? 'null'} max_updated=${maxUpdatedTimeIso ?? 'null'}`,
  )
  return {
    fetchedConversations: conversations.length,
    createdLeads,
    nextCursor,
    maxUpdatedTimeIso,
  }
}
