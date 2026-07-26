'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ShortQuotationPrint } from '@/components/crm/quotation/short-quotation-print'
import {
  readShortPreview,
  subscribeShortPreview,
  type ShortPreviewContext,
  type ShortPreviewPayload,
} from '@/lib/short-quotation-preview-sync'

export function ShortQuotationLivePreview({
  context,
  contextId,
}: {
  context: ShortPreviewContext
  contextId: string
}) {
  const [payload, setPayload] = useState<ShortPreviewPayload | null>(null)

  useEffect(() => {
    const load = () => setPayload(readShortPreview(context, contextId))
    load()
    return subscribeShortPreview(context, contextId, load)
  }, [context, contextId])

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
        <Card className="max-w-md">
          <CardContent className="space-y-3 p-6 text-center text-sm text-muted-foreground">
            <p>No short quotation preview is available yet.</p>
            <p>Open Live Preview from the short quotation editor to start the separate preview page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[794px] items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-sm print:hidden">
        <div>
          <p className="text-sm font-semibold">Short quotation live preview</p>
          <p className="text-xs text-muted-foreground">Updates automatically while you edit.</p>
        </div>
        <Button type="button" onClick={() => window.print()}>Print</Button>
      </div>
      <ShortQuotationPrint content={payload.content} />
    </div>
  )
}
