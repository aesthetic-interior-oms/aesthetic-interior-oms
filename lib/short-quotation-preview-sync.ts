import type { ShortQuotationContent } from '@/lib/short-quotation-types'

export type ShortPreviewContext = 'lead' | 'playground'

export type ShortPreviewPayload = {
  updatedAt: string
  context: ShortPreviewContext
  contextId: string
  content: ShortQuotationContent
}

function storageKey(context: ShortPreviewContext, contextId: string) {
  return `short-quotation-preview:${context}:${contextId}`
}

function channelName(context: ShortPreviewContext, contextId: string) {
  return `short-quotation-preview:${context}:${contextId}`
}

export function publishShortPreview(payload: ShortPreviewPayload) {
  if (typeof window === 'undefined') return

  const key = storageKey(payload.context, payload.contextId)
  window.sessionStorage.setItem(key, JSON.stringify(payload))

  const channel = new BroadcastChannel(channelName(payload.context, payload.contextId))
  channel.postMessage({ type: 'update', updatedAt: payload.updatedAt })
  channel.close()
}

export function readShortPreview(
  context: ShortPreviewContext,
  contextId: string,
): ShortPreviewPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(storageKey(context, contextId))
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
) {
  if (typeof window === 'undefined') return () => undefined

  const channel = new BroadcastChannel(channelName(context, contextId))
  const handleMessage = () => onUpdate()
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey(context, contextId)) onUpdate()
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
}) {
  const params = new URLSearchParams({
    context: input.context,
    id: input.contextId,
  })
  return `/quotation-team/short-preview?${params.toString()}`
}
