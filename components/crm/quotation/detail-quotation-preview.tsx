'use client'

import { formatShortQuotationDate } from '@/lib/short-quotation-calculations'
import { amountInWordsTaka } from '@/lib/number-to-words'
import {
  buildDetailFloorSummaries,
  formatDetailAmount,
  formatDetailQtyCell,
  formatDetailTotalCell,
  formatDetailUnitPriceCell,
  withDetailQuotationDefaults,
} from '@/lib/detail-quotation-format'
import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'

type DetailQuotationPreviewProps = {
  content: QuotationDraftContent
  clientName: string
  clientAddress: string | null
  totals: QuotationTotals
  className?: string
}

function DetailHeader({
  clientName,
  clientAddress,
  date,
  subject,
  introLetter,
}: {
  clientName: string
  clientAddress: string | null
  date: string
  subject: string
  introLetter: string
}) {
  return (
    <div className="space-y-2 text-[13px] leading-relaxed text-black">
      <div className="flex flex-wrap justify-between gap-4">
        <p>
          <span className="font-semibold">Quotation for:</span> {clientName}
        </p>
        <p>
          <span className="font-semibold">Date:</span>
          {formatShortQuotationDate(date)}
        </p>
      </div>
      <p>
        <span className="font-semibold">Address:</span> {clientAddress || '—'}
      </p>
      <p>
        <span className="font-semibold">Subject:</span> {subject}
      </p>
      <p className="whitespace-pre-wrap">{introLetter}</p>
    </div>
  )
}

function DetailFooter({
  notes,
  terms,
  paymentTerms,
  durationNotes,
  drawingDesign,
  signatoryName,
  signatoryTitle,
}: {
  notes: string
  terms: string
  paymentTerms: string
  durationNotes: string
  drawingDesign: string
  signatoryName: string
  signatoryTitle: string
}) {
  return (
    <div className="mt-6 space-y-3 text-[13px] leading-relaxed text-black">
      {notes ? (
        <div>
          <p className="font-semibold">Notes</p>
          <p className="whitespace-pre-wrap">{notes}</p>
        </div>
      ) : null}
      <div>
        <p className="font-semibold">Terms &amp;Condition:</p>
        <p className="whitespace-pre-wrap">{terms}</p>
      </div>
      <p className="whitespace-pre-wrap">{paymentTerms}</p>
      <p className="whitespace-pre-wrap">{durationNotes}</p>
      <p className="whitespace-pre-wrap">{drawingDesign}</p>
      <div className="pt-3">
        <p>
          <span className="font-semibold">Customer Name &amp; Sign</span> {signatoryName}
        </p>
        <p>{signatoryTitle}</p>
      </div>
    </div>
  )
}

export function DetailQuotationPreview({
  content,
  clientName,
  clientAddress,
  totals,
  className,
}: DetailQuotationPreviewProps) {
  const normalized = withDetailQuotationDefaults(content)
  const floorSummaries = buildDetailFloorSummaries(normalized)

  if (floorSummaries.length === 0) {
    return (
      <div
        className={`detail-quotation-preview mx-auto max-w-[920px] bg-white p-8 text-black ${className ?? ''}`}
      >
        <DetailHeader
          clientName={clientName}
          clientAddress={clientAddress}
          date={normalized.quotationDate ?? ''}
          subject={normalized.subject ?? ''}
          introLetter={normalized.introLetter ?? ''}
        />
        <p className="mt-10 text-center text-sm text-black/60">
          Add floors and items to generate the detailed quotation preview.
        </p>
      </div>
    )
  }

  return (
    <div
      className={`detail-quotation-preview mx-auto max-w-[920px] bg-white p-8 text-black ${className ?? ''}`}
    >
      {/* Page 1 — Summary (Yamim PDF) */}
      <section className="mb-12 border-b border-black/20 pb-10">
        <div className="mb-4 text-[13px]">
          <p>
            <span className="font-semibold">Quotation Summary for:</span>{' '}
            <span className="font-semibold">Date:</span>
            {formatShortQuotationDate(normalized.quotationDate ?? '')}
          </p>
          <p className="mt-1 font-medium">{clientName}</p>
        </div>
        <DetailHeader
          clientName={clientName}
          clientAddress={clientAddress}
          date={normalized.quotationDate ?? ''}
          subject={normalized.summarySubject ?? normalized.subject ?? ''}
          introLetter={normalized.introLetter ?? ''}
        />
        <table className="mt-6 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-black">
              <th className="w-14 px-2 py-2 text-left font-semibold">SL</th>
              <th className="px-2 py-2 text-left font-semibold">NAME</th>
              <th className="w-36 px-2 py-2 text-right font-semibold">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {floorSummaries.map((entry, index) => (
              <tr key={entry.floor.id} className="border-b border-black/10">
                <td className="px-2 py-2 align-top">{String(index + 1).padStart(2, '0')}</td>
                <td className="px-2 py-2 align-top font-medium">{entry.floor.name}</td>
                <td className="px-2 py-2 text-right align-top font-medium">
                  {formatDetailAmount(entry.total)}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} className="px-2 pt-4 text-right text-base font-bold">
                GRAND TOTAL
              </td>
              <td className="px-2 pt-4 text-right text-base font-bold">
                {formatDetailAmount(totals.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-4 text-[13px]">
          <span className="font-semibold">In Words:</span> {amountInWordsTaka(totals.grandTotal)}
        </p>
      </section>

      {/* Per-floor detail pages */}
      {floorSummaries.map((entry) => (
        <section
          key={entry.floor.id}
          className="mb-12 border-b border-black/20 pb-10 last:mb-0 last:border-b-0"
        >
          <DetailHeader
            clientName={clientName}
            clientAddress={clientAddress}
            date={normalized.quotationDate ?? ''}
            subject={normalized.subject ?? ''}
            introLetter={normalized.introLetter ?? ''}
          />
          <p className="mt-6 text-sm font-bold uppercase tracking-wide">{entry.floor.name}</p>
          <table className="mt-4 w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-black">
                <th className="w-10 px-1 py-2 text-left font-semibold">SL</th>
                <th className="min-w-[110px] px-1 py-2 text-left font-semibold">NAME</th>
                <th className="min-w-[220px] px-1 py-2 text-left font-semibold">MATERIALS</th>
                <th className="w-24 px-1 py-2 text-right font-semibold">QTY SFT</th>
                <th className="w-24 px-1 py-2 text-right font-semibold">UNIT PRICE</th>
                <th className="w-24 px-1 py-2 text-right font-semibold">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {entry.lines.map((line, lineIndex) => (
                <tr key={line.id} className="border-b border-black/10 align-top">
                  <td className="px-1 py-2">{line.serialNo ?? lineIndex + 1}</td>
                  <td className="px-1 py-2 whitespace-pre-wrap font-medium">{line.description}</td>
                  <td className="px-1 py-2 whitespace-pre-wrap leading-relaxed">
                    {line.materials || '—'}
                  </td>
                  <td className="px-1 py-2 text-right whitespace-pre-wrap">
                    {formatDetailQtyCell(line)}
                  </td>
                  <td className="px-1 py-2 text-right whitespace-pre-wrap">
                    {formatDetailUnitPriceCell(line)}
                  </td>
                  <td className="px-1 py-2 text-right font-medium">{formatDetailTotalCell(line)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} className="px-1 pt-3 text-right font-bold">
                  TOTAL
                </td>
                <td className="px-1 pt-3 text-right font-bold">
                  {formatDetailAmount(entry.total)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-4 text-[13px]">
            <span className="font-semibold">In Words:</span> {amountInWordsTaka(entry.total)}
          </p>
          <DetailFooter
            notes={normalized.notes}
            terms={normalized.terms}
            paymentTerms={normalized.paymentTerms ?? ''}
            durationNotes={normalized.durationNotes ?? ''}
            drawingDesign={normalized.drawingDesign ?? ''}
            signatoryName={normalized.signatoryName ?? ''}
            signatoryTitle={normalized.signatoryTitle ?? ''}
          />
        </section>
      ))}
    </div>
  )
}
