'use client'

import { useEffect, useState } from 'react'

const CLIPBOARD_STORAGE_KEY = 'aesthetic_quotation_clipboard'
const CLIPBOARD_EVENT_NAME = 'quotation-clipboard-updated'

export type QuotationClipboardType = 'floor' | 'area' | 'item'

export interface QuotationClipboardItem {
  description: string
  materials?: string
  unit: string
  rate: number
  rateMin?: number
  rateMax?: number
  quantity: number
  amount: number
  included?: boolean
  isCustom?: boolean
  isFinishingElectrical?: boolean
  catalogTemplateKey?: string
  templateId?: string
  priceOnRequest?: boolean
  unitPriceLabel?: string
  isLumpSum?: boolean
}

export interface QuotationClipboardArea {
  name: string
  lines: QuotationClipboardItem[]
}

export interface QuotationClipboardFloor {
  name: string
  sectionType?: 'STANDARD' | 'FINISHING_ELECTRICAL'
  areas: QuotationClipboardArea[]
}

export interface QuotationClipboardData {
  type: QuotationClipboardType
  sourceLeadId?: string | null
  sourceLeadTitle?: string | null
  copiedAt: string
  title: string
  itemCount: number
  data: QuotationClipboardFloor | QuotationClipboardArea | QuotationClipboardItem
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function notifyClipboardChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CLIPBOARD_EVENT_NAME))
  }
}

export function getQuotationClipboard(): QuotationClipboardData | null {
  if (!canUseStorage()) return null
  try {
    const raw = window.localStorage.getItem(CLIPBOARD_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as QuotationClipboardData
    if (!parsed || !parsed.type || !parsed.data) return null
    return parsed
  } catch {
    return null
  }
}

export function saveQuotationClipboard(payload: QuotationClipboardData): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(payload))
    notifyClipboardChange()
  } catch (err) {
    console.error('Failed to save quotation clipboard to localStorage', err)
  }
}

export function clearQuotationClipboard(): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(CLIPBOARD_STORAGE_KEY)
    notifyClipboardChange()
  } catch (err) {
    console.error('Failed to clear quotation clipboard', err)
  }
}

export function copyFloorToClipboard(
  floor: { name: string; sectionType?: 'STANDARD' | 'FINISHING_ELECTRICAL' },
  areas: { name: string; lines: QuotationClipboardItem[] }[],
  meta?: { leadId?: string | null; leadTitle?: string | null },
): void {
  const totalItems = areas.reduce((sum, a) => sum + (a.lines?.length || 0), 0)
  const floorData: QuotationClipboardFloor = {
    name: floor.name || 'Floor',
    sectionType: floor.sectionType,
    areas: areas.map((a) => ({
      name: a.name || 'Area',
      lines: (a.lines || []).map((l) => ({ ...l })),
    })),
  }

  saveQuotationClipboard({
    type: 'floor',
    sourceLeadId: meta?.leadId ?? null,
    sourceLeadTitle: meta?.leadTitle ?? null,
    copiedAt: new Date().toISOString(),
    title: floor.name || 'Floor',
    itemCount: totalItems,
    data: floorData,
  })
}

export function copyAreaToClipboard(
  area: { name: string },
  lines: QuotationClipboardItem[],
  meta?: { leadId?: string | null; leadTitle?: string | null },
): void {
  const areaData: QuotationClipboardArea = {
    name: area.name || 'Area',
    lines: (lines || []).map((l) => ({ ...l })),
  }

  saveQuotationClipboard({
    type: 'area',
    sourceLeadId: meta?.leadId ?? null,
    sourceLeadTitle: meta?.leadTitle ?? null,
    copiedAt: new Date().toISOString(),
    title: area.name || 'Area / Room',
    itemCount: lines?.length || 0,
    data: areaData,
  })
}

export function copyItemToClipboard(
  item: QuotationClipboardItem,
  meta?: { leadId?: string | null; leadTitle?: string | null },
): void {
  saveQuotationClipboard({
    type: 'item',
    sourceLeadId: meta?.leadId ?? null,
    sourceLeadTitle: meta?.leadTitle ?? null,
    copiedAt: new Date().toISOString(),
    title: item.description || 'Product Item',
    itemCount: 1,
    data: { ...item },
  })
}

/**
 * React hook to access and subscribe to the persistent quotation clipboard.
 * Updates immediately across components and across different browser tabs.
 */
export function useQuotationClipboard() {
  const [clipboard, setClipboard] = useState<QuotationClipboardData | null>(null)

  useEffect(() => {
    setClipboard(getQuotationClipboard())

    const handleUpdate = () => {
      setClipboard(getQuotationClipboard())
    }

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === CLIPBOARD_STORAGE_KEY) {
        setClipboard(getQuotationClipboard())
      }
    }

    window.addEventListener(CLIPBOARD_EVENT_NAME, handleUpdate)
    window.addEventListener('storage', handleStorageEvent)

    return () => {
      window.removeEventListener(CLIPBOARD_EVENT_NAME, handleUpdate)
      window.removeEventListener('storage', handleStorageEvent)
    }
  }, [])

  return {
    clipboard,
    clearClipboard: clearQuotationClipboard,
    hasFloor: clipboard?.type === 'floor',
    hasArea: clipboard?.type === 'area',
    hasItem: clipboard?.type === 'item',
  }
}
