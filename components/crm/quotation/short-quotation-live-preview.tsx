'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ShortQuotationPrint } from '@/components/crm/quotation/short-quotation-print'
import { ShortQuotationDocument } from '@/components/crm/quotation/pdf/ShortQuotationDocument'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import { normalizeShortQuotationContent } from '@/lib/short-quotation-calculations'
import { toast } from '@/components/ui/sonner'
import {
  readShortPreview,
  subscribeShortPreview,
  type ShortPreviewContext,
  type ShortPreviewPayload,
} from '@/lib/short-quotation-preview-sync'


function generateShortQuotationCode(packageTier: string) {
  const now = new Date()
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  const timePart = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `SQ-${packageTier.slice(0, 3)}-${datePart}-${timePart}-${randomPart}`
}

export function ShortQuotationLivePreview({
  context,
  contextId,
}: {
  context: ShortPreviewContext
  contextId: string
}) {
  const [payload, setPayload] = useState<ShortPreviewPayload | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    const load = () => setPayload(readShortPreview(context, contextId))
    load()
    return subscribeShortPreview(context, contextId, load)
  }, [context, contextId])

  const handleDownloadPdf = async () => {
    if (!payload) return
    setGeneratingPdf(true)
    try {
      const downloadedAt = new Date().toISOString()
      const contentForDownload = normalizeShortQuotationContent({
        ...payload.content,
        quotationCode: generateShortQuotationCode(payload.content.packageTier),
        downloadedAt,
      })
      const safeClientName = (contentForDownload.clientName || 'Quotation').replace(/[^a-z0-9]/gi, '_').toLowerCase()
      await downloadPdfFromDocument(
        <ShortQuotationDocument content={contentForDownload} />,
        `Short_Quotation_${safeClientName}_${contentForDownload.quotationCode}.pdf`,
      )
      toast.success(`PDF downloaded with quotation code ${contentForDownload.quotationCode}`)
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

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
        <Button type="button" disabled={generatingPdf} onClick={() => void handleDownloadPdf()}>
          {generatingPdf ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download Short Quotation PDF
            </>
          )}
        </Button>
      </div>
      <ShortQuotationPrint content={payload.content} />
    </div>
  )
}
