import type { QuotationDraftContent, QuotationFileType } from '@/lib/quotation-types'
import { isShortQuotationContent } from '@/lib/quotation-document'
import type { ShortQuotationContent, ShortQuotationPackage } from '@/lib/short-quotation-types'

const PLAYGROUND_SHORT_KEY = 'quotation-playground-short'
const PLAYGROUND_DETAIL_KEY = 'quotation-playground-detail'

export type PlaygroundDetailDraft = {
  quotationType: QuotationFileType
  projectSqft: number | null
  templateKey: string
  content: QuotationDraftContent
  savedAt: string
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function playgroundShortKey(packageTier?: ShortQuotationPackage) {
  return packageTier ? `${PLAYGROUND_SHORT_KEY}:${packageTier.toLowerCase()}` : PLAYGROUND_SHORT_KEY
}

export function loadPlaygroundShortDraft(packageTier?: ShortQuotationPackage): ShortQuotationContent | null {
  if (!canUseStorage()) return null
  try {
    const raw = window.localStorage.getItem(playgroundShortKey(packageTier))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isShortQuotationContent(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function savePlaygroundShortDraft(content: ShortQuotationContent) {
  if (!canUseStorage()) return
  window.localStorage.setItem(playgroundShortKey(content.packageTier), JSON.stringify(content))
}

export function loadPlaygroundDetailDraft(): PlaygroundDetailDraft | null {
  if (!canUseStorage()) return null
  try {
    const raw = window.localStorage.getItem(PLAYGROUND_DETAIL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PlaygroundDetailDraft
    if (!parsed?.content || typeof parsed.content !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function savePlaygroundDetailDraft(draft: Omit<PlaygroundDetailDraft, 'savedAt'>) {
  if (!canUseStorage()) return
  const payload: PlaygroundDetailDraft = {
    ...draft,
    savedAt: new Date().toISOString(),
  }
  window.localStorage.setItem(PLAYGROUND_DETAIL_KEY, JSON.stringify(payload))
}

export function clearPlaygroundDrafts() {
  if (!canUseStorage()) return
  window.localStorage.removeItem(PLAYGROUND_SHORT_KEY)
  window.localStorage.removeItem(playgroundShortKey('PLATINUM'))
  window.localStorage.removeItem(playgroundShortKey('PREMIUM'))
  window.localStorage.removeItem(playgroundShortKey('LUXURY'))
  window.localStorage.removeItem(PLAYGROUND_DETAIL_KEY)
}
