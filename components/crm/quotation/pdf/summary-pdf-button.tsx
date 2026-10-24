'use client'

import { useState } from 'react'
import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import type { QuotationDraftContent } from '@/lib/quotation-types'
import type { FurnitureQuotationContent } from '@/lib/furniture-quotation-template'
import type { ElectricalQuotationContent } from '@/lib/electrical-quotation-template'

type SummaryApiData = {
  lead: { id: string; name: string; location: string | null }
  detailContent: QuotationDraftContent | null
  furnitureContent: FurnitureQuotationContent | null
  electricalContent: ElectricalQuotationContent | null
  quotationDate: string | null
}

type Props = {
  leadId: string
  leadName?: string
}

export function SummaryPdfButton({ leadId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/lead/${leadId}/summary-quotation`, { cache: 'no-store' })
      const payload = await res.json() as { success: boolean; error?: string; data?: SummaryApiData }
      if (!res.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error ?? 'Failed to load summary data')
      }

      const { data } = payload

      // Lazy-import to keep bundle light and avoid SSR issues
      const { SummaryDocument } = await import('@/components/crm/quotation/pdf/SummaryDocument')

      const doc = React.createElement(SummaryDocument, {
        clientName: data.lead.name,
        clientAddress: data.lead.location,
        quotationDate: data.quotationDate,
        detailContent: data.detailContent,
        furnitureContent: data.furnitureContent,
        electricalContent: data.electricalContent,
      })

      const safeName = (data.lead.name ?? 'client').replace(/[^a-zA-Z0-9-_ ]/g, '').trim()
      await downloadPdfFromDocument(
        doc as Parameters<typeof pdf>[0],
        `${safeName} - Project Summary.pdf`,
      )
    } catch (err) {
      console.error('Error generating Summary PDF:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex w-fit items-center justify-center rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Summary PDF'}
      </button>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
