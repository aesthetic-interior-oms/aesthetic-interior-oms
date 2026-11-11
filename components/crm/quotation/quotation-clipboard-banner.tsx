'use client'

import { ClipboardCopy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuotationClipboard } from '@/lib/quotation-clipboard'

interface QuotationClipboardBannerProps {
  currentLeadId?: string | null
  currentLeadTitle?: string | null
}

export function QuotationClipboardBanner({ currentLeadId, currentLeadTitle }: QuotationClipboardBannerProps) {
  const { clipboard, clearClipboard } = useQuotationClipboard()

  if (!clipboard) return null

  const isDifferentLead =
    Boolean(clipboard.sourceLeadId) &&
    Boolean(currentLeadId) &&
    clipboard.sourceLeadId !== currentLeadId

  const typeLabel =
    clipboard.type === 'floor'
      ? 'Floor'
      : clipboard.type === 'area'
        ? 'Room / Area'
        : 'Product Item'

  return (
    <div className="fixed bottom-16 right-4 z-50 max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200 print:hidden">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/95 p-3 text-white shadow-xl backdrop-blur-md dark:border-emerald-500/50 dark:bg-emerald-950/95">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
          <ClipboardCopy className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 text-xs">
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="text-emerald-300">Copied {typeLabel}:</span>
            <span className="truncate max-w-[160px] text-white" title={clipboard.title}>
              {clipboard.title}
            </span>
            <Badge variant="outline" className="border-emerald-400/40 text-[10px] text-emerald-200 px-1 py-0">
              {clipboard.type === 'floor' || clipboard.type === 'area'
                ? `${clipboard.itemCount} items`
                : '1 item'}
            </Badge>
          </div>

          <div className="mt-0.5 text-[11px] text-emerald-200/80">
            {isDifferentLead ? (
              <span>
                From {clipboard.sourceLeadTitle ? `"${clipboard.sourceLeadTitle}"` : 'another lead'} • Click{' '}
                <span className="font-semibold text-emerald-200">Paste</span> on any target floor/area
              </span>
            ) : (
              <span>Ready to paste • Click <span className="font-semibold text-emerald-200">Paste</span> on any floor or area</span>
            )}
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-emerald-200/70 hover:bg-emerald-800/50 hover:text-white"
          onClick={clearClipboard}
          title="Clear copied item"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
