import type { QuotationDraftContent, QuotationFileType, QuotationTotals } from '@/lib/quotation-types'

export type DetailPreviewContext = 'lead' | 'playground'

export type DetailPreviewPayload = {
  updatedAt: string
  context: DetailPreviewContext
  contextId: string
  slotIndex?: number
  clientName: string
  clientAddress: string | null
  quotationType: QuotationFileType
  projectSqft: number | null
  content: QuotationDraftContent
  totals: QuotationTotals
}

function storageKey(context: DetailPreviewContext, contextId: string, slotIndex: number = 1) {
  return `detail-quotation-preview:${context}:${contextId}:${slotIndex}`
}

function channelName(context: DetailPreviewContext, contextId: string, slotIndex: number = 1) {
  return `detail-quotation-preview:${context}:${contextId}:${slotIndex}`
}

export function publishDetailPreview(payload: DetailPreviewPayload) {
  if (typeof window === 'undefined') return

  const slot = payload.slotIndex ?? 1
  const key = storageKey(payload.context, payload.contextId, slot)
  window.localStorage.setItem(key, JSON.stringify(payload))

  const channel = new BroadcastChannel(channelName(payload.context, payload.contextId, slot))
  channel.postMessage({ type: 'update', updatedAt: payload.updatedAt })
  channel.close()
}

export function readDetailPreview(
  context: DetailPreviewContext,
  contextId: string,
  slotIndex: number = 1,
): DetailPreviewPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey(context, contextId, slotIndex))
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
  slotIndex: number = 1,
) {
  if (typeof window === 'undefined') return () => undefined

  const channel = new BroadcastChannel(channelName(context, contextId, slotIndex))
  const handleMessage = () => onUpdate()
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey(context, contextId, slotIndex)) onUpdate()
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
  slotIndex?: number
}) {
  const params = new URLSearchParams({
    context: input.context,
    id: input.contextId,
  })
  if (input.slotIndex && input.slotIndex > 1) {
    params.set('slot', String(input.slotIndex))
  }
  return `/quotation-team/detail-preview?${params.toString()}`
}
