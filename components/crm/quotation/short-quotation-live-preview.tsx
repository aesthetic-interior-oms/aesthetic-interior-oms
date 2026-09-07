'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  return `SQ-${packageTier ? packageTier.slice(0, 3) : 'PRE'}-${datePart}-${timePart}-${randomPart}`
}

export function ShortQuotationLivePreview({
  context,
  contextId,
  autoDownload = false,
}: {
  context: ShortPreviewContext
  contextId: string
  autoDownload?: boolean
}) {
  const [payload, setPayload] = useState<ShortPreviewPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const downloadedRef = useRef(false)

  const loadPayload = useCallback(async () => {
    const cached = readShortPreview(context, contextId)
    if (cached) {
      setPayload(cached)
      setLoading(false)
      return
    }

    if (context === 'lead') {
      try {
        const response = await fetch(`/api/lead/${contextId}/quotation-draft?documentType=short`, { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result?.success && result?.data) {
          const source = result.data.draft ?? result.data.defaultShortDraft
          if (source?.content) {
            const content = normalizeShortQuotationContent(source.content)
            setPayload({
              updatedAt: new Date().toISOString(),
              context,
              contextId,
              content,
            })
          }
        }
      } catch (err) {
        console.error('Failed to load short quotation draft from API:', err)
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [context, contextId])

  useEffect(() => {
    void loadPayload()
    return subscribeShortPreview(context, contextId, () => void loadPayload())
  }, [context, contextId, loadPayload])

  const handleDownloadPdf = useCallback(async (currentPayload: ShortPreviewPayload) => {
    setGeneratingPdf(true)
    try {
      const downloadedAt = new Date().toISOString()
      const contentForDownload = normalizeShortQuotationContent({
        ...currentPayload.content,
        quotationCode: currentPayload.content.quotationCode || generateShortQuotationCode(currentPayload.content.packageTier),
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
  }, [])

  useEffect(() => {
    if (autoDownload && payload && !downloadedRef.current && !generatingPdf) {
      downloadedRef.current = true
      void handleDownloadPdf(payload)
    }
  }, [autoDownload, payload, generatingPdf, handleDownloadPdf])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center space-y-3 p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>{autoDownload ? 'Preparing Short Quotation PDF download...' : 'Loading short quotation preview...'}</p>
          </CardContent>
        </Card>
      </div>
    )
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
        <Button type="button" disabled={generatingPdf} onClick={() => void handleDownloadPdf(payload)}>
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
