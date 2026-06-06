'use client'

import { formatShortQuotationDate } from '@/lib/short-quotation-calculations'
import { amountInWordsTaka } from '@/lib/number-to-words'
import {
  buildDetailSectionSummaries,
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
  templateName: string
  totals: QuotationTotals
  className?: string
}

export function DetailQuotationPreview({
  content,
  clientName,
  clientAddress,
  templateName,
  totals,
  className,
}: DetailQuotationPreviewProps) {
  const normalized = withDetailQuotationDefaults(content)
  const sectionSummaries = buildDetailSectionSummaries(normalized)
  const showSummary = sectionSummaries.length > 1

  const headerBlock = (
    <div className="space-y-2 text-sm leading-relaxed">
      <div className="flex flex-wrap justify-between gap-4">
        <p>
          <span className="font-semibold">Quotation for:</span> {clientName}
        </p>
        <p>
          <span className="font-semibold">Date:</span>
          {formatShortQuotationDate(normalized.quotationDate ?? '')}
        </p>
      </div>
      <p>
        <span className="font-semibold">Address:</span> {clientAddress || '—'}
      </p>
      <p>
        <span className="font-semibold">Subject:</span> {normalized.subject}
      </p>
      <p className="whitespace-pre-wrap">{normalized.introLetter}</p>
    </div>
  )

  const footerBlock = (
    <div className="space-y-4 text-sm leading-relaxed">
      {normalized.notes ? (
        <div>
          <p className="font-semibold">Notes</p>
          <p className="whitespace-pre-wrap">{normalized.notes}</p>
        </div>
      ) : null}
      <div>
        <p className="font-semibold">Terms &amp; Condition:</p>
        <p className="whitespace-pre-wrap">{normalized.terms}</p>
      </div>
      <p className="whitespace-pre-wrap">{normalized.paymentTerms}</p>
      <p className="whitespace-pre-wrap">{normalized.durationNotes}</p>
      <p className="whitespace-pre-wrap">{normalized.drawingDesign}</p>
      <div className="pt-4">
        <p>
          <span className="font-semibold">Customer Name &amp; Sign</span> {normalized.signatoryName}
        </p>
        <p>{normalized.signatoryTitle}</p>
      </div>
    </div>
  )

  return (
    <div
      className={`detail-quotation-preview mx-auto max-w-[920px] bg-white p-8 text-black ${className ?? ''}`}
    >
      {showSummary ? (
        <section className="mb-10 border-b border-black/20 pb-8">
          <div className="mb-4">
            <p className="text-base font-semibold">Quotation Summary for: {clientName}</p>
            <p className="text-sm text-black/70">{templateName}</p>
          </div>
          {headerBlock}
          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black">
                <th className="px-2 py-2 text-left font-semibold">SL</th>
                <th className="px-2 py-2 text-left font-semibold">NAME</th>
                <th className="px-2 py-2 text-right font-semibold">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {sectionSummaries.map((entry, index) => (
                <tr key={entry.section.id} className="border-b border-black/10">
                  <td className="px-2 py-2 align-top">{String(index + 1).padStart(2, '0')}</td>
                  <td className="px-2 py-2 align-top font-medium">{entry.section.name}</td>
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
          <p className="mt-4 text-sm">
            <span className="font-semibold">In Words:</span> {amountInWordsTaka(totals.grandTotal)}
          </p>
        </section>
      ) : null}

      {sectionSummaries.length === 0 ? (
        <section>
          {headerBlock}
          <p className="mt-8 text-center text-sm text-black/60">
            Add items from the saved list to see the detailed quotation preview.
          </p>
        </section>
      ) : (
        sectionSummaries.map((entry) => (
          <section key={entry.section.id} className="mb-10 border-b border-black/20 pb-8 last:border-b-0">
            {headerBlock}
            <p className="mt-6 text-base font-bold uppercase tracking-wide">{entry.section.name}</p>
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-black">
                  <th className="w-12 px-2 py-2 text-left font-semibold">SL</th>
                  <th className="min-w-[120px] px-2 py-2 text-left font-semibold">NAME</th>
                  <th className="min-w-[240px] px-2 py-2 text-left font-semibold">MATERIALS</th>
                  <th className="px-2 py-2 text-right font-semibold">QTY SFT</th>
                  <th className="px-2 py-2 text-right font-semibold">UNIT PRICE</th>
                  <th className="px-2 py-2 text-right font-semibold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line, lineIndex) => (
                  <tr key={line.id} className="border-b border-black/10 align-top">
                    <td className="px-2 py-2">{line.serialNo ?? lineIndex + 1}</td>
                    <td className="px-2 py-2 whitespace-pre-wrap font-medium">{line.description}</td>
                    <td className="px-2 py-2 whitespace-pre-wrap text-[12px] leading-relaxed">
                      {line.materials || '—'}
                    </td>
                    <td className="px-2 py-2 text-right whitespace-pre-wrap">
                      {formatDetailQtyCell(line)}
                    </td>
                    <td className="px-2 py-2 text-right whitespace-pre-wrap">
                      {formatDetailUnitPriceCell(line)}
                    </td>
                    <td className="px-2 py-2 text-right font-medium">{formatDetailTotalCell(line)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} className="px-2 pt-3 text-right font-bold">
                    TOTAL
                  </td>
                  <td className="px-2 pt-3 text-right font-bold">
                    {formatDetailAmount(entry.total)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-4 text-sm">
              <span className="font-semibold">In Words:</span> {amountInWordsTaka(entry.total)}
            </p>
            {!showSummary ? footerBlock : null}
          </section>
        ))
      )}

      {showSummary && sectionSummaries.length > 0 ? footerBlock : null}
    </div>
  )
}
