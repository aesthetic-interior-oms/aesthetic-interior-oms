import type { QuotationDraftContent, QuotationFileType, QuotationTotals } from '@/lib/quotation-types'

export type DetailPreviewContext = 'lead' | 'playground'

export type DetailPreviewPayload = {
  updatedAt: string
  context: DetailPreviewContext
  contextId: string
  clientName: string
  clientAddress: string | null
  quotationType: QuotationFileType
  projectSqft: number | null
  content: QuotationDraftContent
  totals: QuotationTotals
}

function storageKey(context: DetailPreviewContext, contextId: string) {
  return `detail-quotation-preview:${context}:${contextId}`
}

function channelName(context: DetailPreviewContext, contextId: string) {
  return `detail-quotation-preview:${context}:${contextId}`
}

export function publishDetailPreview(payload: DetailPreviewPayload) {
  if (typeof window === 'undefined') return

  const key = storageKey(payload.context, payload.contextId)
  window.sessionStorage.setItem(key, JSON.stringify(payload))

  const channel = new BroadcastChannel(channelName(payload.context, payload.contextId))
  channel.postMessage({ type: 'update', updatedAt: payload.updatedAt })
  channel.close()
}

export function readDetailPreview(
  context: DetailPreviewContext,
  contextId: string,
): DetailPreviewPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(storageKey(context, contextId))
    if (!raw) return null
    return JSON.parse(raw) as DetailPreviewPayload
  } catch {
    return null
  }
}

export function subscribeDetailPreview(
  context: DetailPreviewContext,
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

export function buildDetailPreviewUrl(input: {
  context: DetailPreviewContext
  contextId: string
}) {
  const params = new URLSearchParams({
    context: input.context,
    id: input.contextId,
  })
  return `/quotation-team/detail-preview?${params.toString()}`
}
