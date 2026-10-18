import type { ShortQuotationContent } from '@/lib/short-quotation-types'

export type ShortPreviewContext = 'lead' | 'playground'

export type ShortPreviewPayload = {
  updatedAt: string
  context: ShortPreviewContext
  contextId: string
  packageTier?: string
  content: ShortQuotationContent
}

function storageKey(context: ShortPreviewContext, contextId: string, packageTier?: string) {
  const tier = packageTier ? packageTier.toLowerCase() : ''
  return tier
    ? `short-quotation-preview:${context}:${contextId}:${tier}`
    : `short-quotation-preview:${context}:${contextId}`
}

function channelName(context: ShortPreviewContext, contextId: string, packageTier?: string) {
  const tier = packageTier ? packageTier.toLowerCase() : ''
  return tier
    ? `short-quotation-preview:${context}:${contextId}:${tier}`
    : `short-quotation-preview:${context}:${contextId}`
}

export function publishShortPreview(payload: ShortPreviewPayload) {
  if (typeof window === 'undefined') return

  const tier = payload.packageTier || payload.content?.packageTier || 'PREMIUM'
  const key = storageKey(payload.context, payload.contextId, tier)
  window.localStorage.setItem(key, JSON.stringify(payload))
  window.localStorage.setItem(storageKey(payload.context, payload.contextId), JSON.stringify(payload))

  const channel = new BroadcastChannel(channelName(payload.context, payload.contextId, tier))
  channel.postMessage({ type: 'update', updatedAt: payload.updatedAt })
  channel.close()

  const baseChannel = new BroadcastChannel(channelName(payload.context, payload.contextId))
  baseChannel.postMessage({ type: 'update', updatedAt: payload.updatedAt })
  baseChannel.close()
}

export function readShortPreview(
  context: ShortPreviewContext,
  contextId: string,
  packageTier?: string,
): ShortPreviewPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const rawTier = packageTier ? window.localStorage.getItem(storageKey(context, contextId, packageTier)) : null
    const raw = rawTier || window.localStorage.getItem(storageKey(context, contextId))
    if (!raw) return null
    return JSON.parse(raw) as ShortPreviewPayload
  } catch {
    return null
  }
}

export function subscribeShortPreview(
  context: ShortPreviewContext,
  contextId: string,
  onUpdate: () => void,
  packageTier?: string,
) {
  if (typeof window === 'undefined') return () => undefined

  const channel = new BroadcastChannel(channelName(context, contextId, packageTier))
  const handleMessage = () => onUpdate()
  const handleStorage = (event: StorageEvent) => {
    if (
      (packageTier && event.key === storageKey(context, contextId, packageTier)) ||
      event.key === storageKey(context, contextId)
    ) {
      onUpdate()
    }
  }

  channel.addEventListener('message', handleMessage)
  window.addEventListener('storage', handleStorage)

  return () => {
    channel.removeEventListener('message', handleMessage)
    channel.close()
    window.removeEventListener('storage', handleStorage)
  }
}

export function buildShortPreviewUrl(input: {
  context: ShortPreviewContext
  contextId: string
  packageTier?: string
  download?: boolean
}) {
  const params = new URLSearchParams({
    context: input.context,
    id: input.contextId,
  })
  if (input.packageTier) {
    params.set('packageTier', input.packageTier)
  }
  if (input.download) {
    params.set('download', 'true')
  }
  return `/quotation-team/short-preview?${params.toString()}`
}
