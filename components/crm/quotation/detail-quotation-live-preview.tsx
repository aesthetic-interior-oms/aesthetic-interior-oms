'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { DetailQuotationPreview } from '@/components/crm/quotation/detail-quotation-preview'
import { DetailQuotationDocument } from '@/components/crm/quotation/pdf/DetailQuotationDocument'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import {
  buildDetailPreviewUrl,
  readDetailPreview,
  subscribeDetailPreview,
  type DetailPreviewContext,
  type DetailPreviewPayload,
} from '@/lib/detail-quotation-preview-sync'
import { withDetailQuotationDefaults } from '@/lib/detail-quotation-format'
import { calculateQuotationTotals } from '@/lib/quotation-calculations'
import { buildDefaultFloorDetailContent } from '@/lib/floor-detail-quotation'
import { loadPlaygroundDetailDraft } from '@/lib/quotation-playground-storage'

type DetailQuotationLivePreviewProps = {
  context: DetailPreviewContext
  contextId: string
}

export function DetailQuotationLivePreview({
  context,
  contextId,
}: DetailQuotationLivePreviewProps) {
  const [payload, setPayload] = useState<DetailPreviewPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const loadPayload = useCallback(async () => {
    const cached = readDetailPreview(context, contextId)
    if (cached) {
      setPayload(cached)
      setLoading(false)
      return
    }

    if (context === 'lead') {
      try {
        const response = await fetch(`/api/lead/${contextId}/quotation-draft?documentType=detail`, { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result?.success && result?.data) {
          const source = result.data.draft ?? result.data.defaultDetailDraft
          if (source?.content) {
            const content = withDetailQuotationDefaults(source.content)
            const totals = calculateQuotationTotals(content)
            const qType = source.quotationType
            const validQType = (qType === 'BASIC' || qType === 'STANDARD' || qType === 'PREMIUM' || qType === 'MIXED') ? qType : 'STANDARD'
            setPayload({
              updatedAt: new Date().toISOString(),
              context,
              contextId,
              clientName: result.data.lead?.name ?? 'Client',
              clientAddress: result.data.lead?.location ?? null,
              quotationType: validQType,
              projectSqft: source.projectSqft ?? null,
              content,
              totals,
            })
          }
        }
      } catch {
        // fall through to empty state
      }
    } else if (context === 'playground') {
      const stored = loadPlaygroundDetailDraft()
      if (stored) {
        const normalized = withDetailQuotationDefaults(stored.content)
        setPayload({
          updatedAt: stored.savedAt,
          context,
          contextId,
          clientName: 'Sample Client',
          clientAddress: 'Sample address for testing',
          quotationType: stored.quotationType,
          projectSqft: stored.projectSqft,
          content: normalized,
          totals: calculateQuotationTotals(normalized),
        })
      } else {
        const empty = buildDefaultFloorDetailContent()
        setPayload({
          updatedAt: new Date().toISOString(),
          context,
          contextId,
          clientName: 'Sample Client',
          clientAddress: 'Sample address for testing',
          quotationType: 'STANDARD',
          projectSqft: null,
          content: empty,
          totals: calculateQuotationTotals(empty),
        })
      }
    }

    setLoading(false)
  }, [context, contextId])

  const handleDownloadPdf = async () => {
    if (!payload) return
    setDownloading(true)
    try {
      const safeClientName = payload.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      await downloadPdfFromDocument(
        <DetailQuotationDocument
          clientName={payload.clientName}
          clientAddress={payload.clientAddress}
          content={payload.content}
          totals={payload.totals}
        />,
        `Detail_Quotation_${safeClientName}.pdf`,
      )
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      const msg = error instanceof Error ? error.message : String(error)
      if (/taint|cross-origin|security/i.test(msg)) {
        alert('Failed to generate PDF: rendering error. Check console for details.')
      } else {
        alert('Failed to generate PDF')
      }
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    void loadPayload()
    return subscribeDetailPreview(context, contextId, () => {
      const next = readDetailPreview(context, contextId)
      if (next) setPayload(next)
    })
  }, [context, contextId, loadPayload])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading live preview...
        </div>
      </div>
    )
  }

  if (!payload) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No preview data yet. Open the detail quotation editor and click{' '}
          <strong>Live Preview</strong>.
        </p>
        <p className="text-xs text-muted-foreground">
          Editor URL: {buildDetailPreviewUrl({ context, contextId })}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-200 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[920px] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <div className="rounded-lg border bg-white px-4 py-3 text-sm shadow-sm">
          <p className="font-medium">Live preview</p>
          <p className="text-muted-foreground">
            Updates automatically when you edit in the other tab. Last update:{' '}
            {new Date(payload.updatedAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted"
            onClick={() => window.print()}
          >
            Print
          </button>
          <button
            type="button"
            disabled={downloading}
            className="rounded-md border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted flex items-center gap-1.5 disabled:opacity-50"
            onClick={() => void handleDownloadPdf()}
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              'Download PDF'
            )}
          </button>
        </div>
      </div>
      <DetailQuotationPreview
        content={payload.content}
        clientName={payload.clientName}
        clientAddress={payload.clientAddress}
        totals={payload.totals}
      />
    </div>
  )
}
