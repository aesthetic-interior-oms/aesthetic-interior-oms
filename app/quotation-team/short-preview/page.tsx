import { ShortQuotationLivePreview } from '@/components/crm/quotation/short-quotation-live-preview'
import type { ShortPreviewContext } from '@/lib/short-quotation-preview-sync'

type ShortPreviewPageProps = {
  searchParams: Promise<{ context?: string; id?: string; download?: string }>
}

export default async function ShortPreviewPage({ searchParams }: ShortPreviewPageProps) {
  const params = await searchParams
  const context: ShortPreviewContext = params.context === 'playground' ? 'playground' : 'lead'
  const contextId = params.id?.trim() || (context === 'playground' ? 'playground' : '')
  const autoDownload = params.download === 'true' || params.download === '1'

  if (!contextId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
        Missing preview id. Open Live Preview from the short quotation editor.
      </div>
    )
  }

  return <ShortQuotationLivePreview context={context} contextId={contextId} autoDownload={autoDownload} />
}
