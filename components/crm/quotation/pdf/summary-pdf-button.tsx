'use client'

import { useEffect, useState } from 'react'
import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { Download, FileText, Loader2 } from 'lucide-react'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import type { QuotationDraftContent } from '@/lib/quotation-types'
import type { FurnitureQuotationContent } from '@/lib/furniture-quotation-template'
import type { ElectricalQuotationContent } from '@/lib/electrical-quotation-template'
import {
  buildDetailFloorSummaries,
  formatDetailAmount,
} from '@/lib/detail-quotation-format'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type SummarySlot = {
  slotIndex: number
  title: string
  exists: boolean
  grandTotal: number
}

type CustomizedItem = {
  draftKey?: string
  title: string
  grandTotal: number
}

type SummaryApiData = {
  lead: { id: string; name: string; location: string | null }
  selectedSlot: number
  detailVersionTitle: string
  availableSlots: SummarySlot[]
  detailContent: QuotationDraftContent | null
  furnitureContent: FurnitureQuotationContent | null
  furnitureTotal: number | null
  electricalContent: ElectricalQuotationContent | null
  electricalTotal: number | null
  electricalIsApprox: boolean
  customizedQuotations: CustomizedItem[]
  quotationDate: string | null
}

type Props = {
  leadId: string
  leadName?: string
}

export function SummaryPdfButton({ leadId, leadName }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SummaryApiData | null>(null)

  const fetchSummaryData = async (slot: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/lead/${leadId}/summary-quotation?slot=${slot}`, {
        cache: 'no-store',
      })
      const payload = (await res.json()) as {
        success: boolean
        error?: string
        data?: SummaryApiData
      }
      if (!res.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error ?? 'Failed to load summary data')
      }
      setData(payload.data)
      setSelectedSlot(payload.data.selectedSlot)
    } catch (err) {
      console.error('Error fetching summary data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch summary data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      void fetchSummaryData(selectedSlot)
    }
  }, [open, selectedSlot])

  const handleDownload = async () => {
    if (!data) return
    setDownloading(true)
    setError(null)
    try {
      const { SummaryDocument } = await import('@/components/crm/quotation/pdf/SummaryDocument')

      const doc = React.createElement(SummaryDocument, {
        clientName: data.lead.name || leadName || 'Client',
        clientAddress: data.lead.location,
        quotationDate: data.quotationDate,
        detailContent: data.detailContent,
        detailVersionTitle: data.detailVersionTitle,
        furnitureContent: data.furnitureContent,
        electricalContent: data.electricalContent,
        customizedQuotations: data.customizedQuotations,
      })

      const safeName = (data.lead.name || leadName || 'client')
        .replace(/[^a-zA-Z0-9-_ ]/g, '')
        .trim()
      await downloadPdfFromDocument(
        doc as Parameters<typeof pdf>[0],
        `${safeName} - Project Summary.pdf`,
      )
      setOpen(false)
    } catch (err) {
      console.error('Error generating Summary PDF:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setDownloading(false)
    }
  }

  // Calculate live preview totals
  const detailTotal = data?.detailContent
    ? buildDetailFloorSummaries(data.detailContent).reduce((sum, item) => sum + item.total, 0)
    : 0
  const furnitureTotal = data?.furnitureTotal ?? 0
  const electricalTotal = data?.electricalTotal ?? 0
  const customizedTotal = (data?.customizedQuotations ?? []).reduce(
    (sum, item) => sum + (Number(item.grandTotal) || 0),
    0,
  )
  const grandTotal = detailTotal + furnitureTotal + electricalTotal + customizedTotal

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex w-fit items-center justify-center gap-1.5 rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <FileText className="h-4 w-4 text-emerald-600" />
          Summary PDF
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <FileText className="h-5 w-5 text-emerald-600" />
            Project Cost Summary PDF
          </DialogTitle>
          <DialogDescription>
            Generate a combined one-page project cost summary PDF. Choose which Detail Quotation
            tier to include alongside all active quotations.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
        ) : null}

        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">Loading quotation records...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Slot selector */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detail Quotation Version (Select Tier)
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((sIndex) => {
                  const slotMeta = data?.availableSlots.find((s) => s.slotIndex === sIndex)
                  const isSelected = selectedSlot === sIndex
                  const title = slotMeta?.title || (sIndex === 1 ? 'Premium' : sIndex === 2 ? 'Platinum' : 'Luxury')
                  const hasDraft = Boolean(slotMeta?.exists)
                  const slotTotal = slotMeta?.grandTotal ?? 0

                  return (
                    <button
                      key={sIndex}
                      type="button"
                      onClick={() => setSelectedSlot(sIndex)}
                      className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-colors ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600 dark:bg-emerald-950/20'
                          : 'border-border bg-card hover:bg-muted/60'
                      }`}
                    >
                      <span className="text-xs font-bold text-foreground">
                        Slot {sIndex}: {title}
                      </span>
                      <span className="mt-1 text-[11px] font-semibold text-muted-foreground">
                        {hasDraft ? `৳ ${formatDetailAmount(slotTotal)}` : 'Not Created'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Inclusions summary preview box */}
            <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1.5">
                <span>Quotation Item</span>
                <span>Amount</span>
              </div>

              {/* Detail Quotation row */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                  Detail Quotation ({data?.detailVersionTitle ?? 'Selected Slot'})
                </span>
                <span className="font-semibold text-foreground">
                  {detailTotal > 0 ? `৳ ${formatDetailAmount(detailTotal)}` : '—'}
                </span>
              </div>

              {/* Furniture Quotation row */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Furniture Works</span>
                <span className="text-muted-foreground">
                  {furnitureTotal > 0 ? (
                    <span className="font-semibold text-foreground">
                      ৳ {formatDetailAmount(furnitureTotal)}
                    </span>
                  ) : (
                    'Not added'
                  )}
                </span>
              </div>

              {/* Electrical Quotation row */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Electrical Works</span>
                <span className="text-muted-foreground">
                  {electricalTotal > 0 ? (
                    <span className="font-semibold text-foreground">
                      ৳ {formatDetailAmount(electricalTotal)}
                      {data?.electricalIsApprox ? ' (approx.)' : ''}
                    </span>
                  ) : (
                    'Not added'
                  )}
                </span>
              </div>

              {/* Customized Quotations list with real names */}
              <div className="space-y-1 pt-1 border-t">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Customized Quotation(s)</span>
                  <span>{(data?.customizedQuotations ?? []).length} added</span>
                </div>
                {(data?.customizedQuotations ?? []).length > 0 ? (
                  data?.customizedQuotations.map((item, idx) => (
                    <div
                      key={item.draftKey || `cust-${idx}`}
                      className="flex items-center justify-between pl-2 text-sm text-foreground"
                    >
                      <span className="font-medium">
                        • {item.title || 'Quotation'}
                      </span>
                      <span className="font-semibold">
                        ৳ {formatDetailAmount(item.grandTotal)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="pl-2 text-xs text-muted-foreground">None added for this lead</p>
                )}
              </div>

              {/* Grand Total Row */}
              <div className="flex items-center justify-between pt-2 border-t border-emerald-300 dark:border-emerald-800 text-sm font-bold text-foreground">
                <span className="text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
                  Combined Grand Total
                </span>
                <span className="text-emerald-800 dark:text-emerald-400 text-base">
                  ৳ {formatDetailAmount(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex sm:justify-between items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={downloading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleDownload}
            disabled={loading || downloading || !data}
            className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Summary PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
