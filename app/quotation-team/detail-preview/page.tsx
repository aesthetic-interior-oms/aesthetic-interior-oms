import { DetailQuotationLivePreview } from '@/components/crm/quotation/detail-quotation-live-preview'
import type { DetailPreviewContext } from '@/lib/detail-quotation-preview-sync'

type DetailPreviewPageProps = {
  searchParams: Promise<{ context?: string; id?: string; slot?: string }>
}

export default async function DetailPreviewPage({ searchParams }: DetailPreviewPageProps) {
  const params = await searchParams
  const context: DetailPreviewContext = params.context === 'playground' ? 'playground' : 'lead'
  const contextId = params.id?.trim() || (context === 'playground' ? 'playground' : '')
  const slotIndex = params.slot ? parseInt(params.slot, 10) || 1 : 1

  if (!contextId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
        Missing preview id. Open Live Preview from the detail quotation editor.
      </div>
    )
  }

  return <DetailQuotationLivePreview context={context} contextId={contextId} slotIndex={slotIndex} />
}
