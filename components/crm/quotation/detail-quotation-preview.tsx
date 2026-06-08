'use client'

import { Fragment } from 'react'
import { formatShortQuotationDate } from '@/lib/short-quotation-calculations'
import { amountInWordsTaka } from '@/lib/number-to-words'
import {
  buildDetailFloorSummaries,
  formatDetailAmount,
  formatDetailQtyCell,
  formatDetailTotalCell,
  formatDetailUnitPriceCell,
  isPackageLine,
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
  isSummary = false,
}: {
  clientName: string
  clientAddress: string | null
  date: string
  subject: string
  introLetter: string
  isSummary?: boolean
}) {
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed text-black font-sans">
      <div className="flex flex-wrap justify-between items-start">
        <div>
          <span className="font-bold">{isSummary ? 'Quotation Summary for:' : 'Quotation for:'}</span>
          <p className="font-medium text-black mt-0.5">{clientName}</p>
        </div>
        <div className="text-right">
          <span className="font-bold">Date:</span> {formatShortQuotationDate(date)}
        </div>
      </div>
      <p>
        <span className="font-bold">Address:</span> {clientAddress || '—'}
      </p>
      <p>
        <span className="font-bold">Subject:</span> {subject}
      </p>
      <p className="font-bold pt-2">Dear Sir,</p>
      <div className="pt-0.5 font-medium whitespace-pre-wrap leading-relaxed">
        {introLetter.replace('Dear Sir,\n', '').replace('Dear Sir,', '')}
      </div>
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
    <div className="mt-8 space-y-4 text-[13px] leading-relaxed text-black font-sans border-t border-black/10 pt-4 print:border-t-0 print:pt-0">
      {notes ? (
        <div>
          <p className="font-bold underline uppercase">Notes:</p>
          <p className="whitespace-pre-wrap mt-1 font-medium">{notes}</p>
        </div>
      ) : null}

      {terms && (
        <div>
          <p className="font-bold underline uppercase">Terms &amp;Condition:</p>
          <p className="whitespace-pre-wrap mt-1 font-medium">{terms}</p>
        </div>
      )}

      {paymentTerms && (
        <div>
          <p className="font-bold underline uppercase">Mode of Payment:</p>
          <p className="whitespace-pre-wrap mt-1 font-medium">{paymentTerms.replace('Mode of Payment\n', '').replace('Mode of Payment', '')}</p>
        </div>
      )}

      {durationNotes && (
        <div>
          <p className="font-bold underline uppercase">Duration Of Work:</p>
          <p className="whitespace-pre-wrap mt-1 font-medium">{durationNotes.replace('Duration Of Work:\n', '').replace('Duration Of Work:', '')}</p>
        </div>
      )}

      {drawingDesign && (
        <p className="text-red-600 font-bold whitespace-pre-wrap leading-normal pt-2">
          {drawingDesign}
        </p>
      )}

      {/* Signature blocks */}
      <div className="pt-12 flex justify-between items-end">
        <div className="w-[40%] text-left">
          <div className="border-t border-black/40 pt-1.5 font-bold">
            Customer Name &amp; Sign
          </div>
        </div>
        <div className="w-[45%] text-right">
          <div className="border-t border-black/40 pt-1.5">
            <p className="font-bold">{signatoryName}</p>
            <p className="text-black/80 font-medium text-xs mt-0.5">{signatoryTitle}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatMaterialText(text: string | null | undefined) {
  if (!text) return '—'
  const lines = text.split('\n')
  return (
    <span className="space-y-0.5 block">
      {lines.map((line, idx) => {
        const match = line.match(/^(\d{2}\.[^:]+:|[^:*]+:|\*[^:]+:)/)
        if (match) {
          const prefix = match[1]
          const rest = line.substring(prefix.length)
          return (
            <span key={idx} className="block">
              <span className="font-bold">{prefix}</span>
              {rest}
            </span>
          )
        }
        return (
          <span key={idx} className="block font-medium">
            {line}
          </span>
        )
      })}
    </span>
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
      <div className={`detail-quotation-preview mx-auto max-w-[920px] bg-white p-8 text-black ${className ?? ''}`}>
        <DetailHeader
          clientName={clientName}
          clientAddress={clientAddress}
          date={normalized.quotationDate ?? ''}
          subject={normalized.subject ?? ''}
          introLetter={normalized.introLetter ?? ''}
        />
        <p className="mt-10 text-center text-sm text-black/60 font-sans">
          Add floors and items to generate the detailed quotation preview.
        </p>
      </div>
    )
  }

  // Header, watermark and footer reusable elements for on-screen templates
  const ScreenHeader = () => (
    <div className="print-page-header absolute top-0 left-0 right-0 h-[35mm] px-8 pt-6 select-none pointer-events-none print:hidden flex items-start justify-between">
      <img src="/images/detail-header.jpg" className="w-full h-auto object-contain max-h-[25mm]" alt="HeaderLogo" />
    </div>
  )

  const ScreenFooter = () => (
    <div className="print-page-footer absolute bottom-0 left-0 right-0 h-[38mm] px-8 pb-6 select-none pointer-events-none print:hidden flex items-end justify-between">
      <img src="/images/detail-footer.jpg" className="w-full h-auto object-contain max-h-[28mm]" alt="FooterLogo" />
    </div>
  )

  const ScreenWatermark = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] print:hidden select-none">
      <img src="/images/detail-watermark.jpg" className="max-w-[75%] max-h-[60%] object-contain" alt="Watermark" />
    </div>
  )

  return (
    <div className={`detail-quotation-preview w-full bg-neutral-100 ${className ?? ''}`}>
      {/* Repeating background assets in print view using position: fixed */}
      <div className="fixed-print-header hidden fixed top-0 left-0 right-0 h-[32mm] bg-white z-50 print:block">
        <img src="/images/detail-header.jpg" className="w-full h-full object-contain" alt="PrintHeader" />
      </div>
      <div className="fixed-print-footer hidden fixed bottom-0 left-0 right-0 h-[35mm] bg-white z-50 print:block">
        <img src="/images/detail-footer.jpg" className="w-full h-full object-contain" alt="PrintFooter" />
      </div>

      {/* Page 1 — Summary Page */}
      <section className="print-page relative bg-white mx-auto w-[210mm] min-h-[297mm] p-[38mm_15mm_42mm_15mm] box-border shadow-md mb-6 page-break-after-always">
        <ScreenWatermark />
        <ScreenHeader />
        
        <div className="relative z-10 space-y-4">
          <DetailHeader
            clientName={clientName}
            clientAddress={clientAddress}
            date={normalized.quotationDate ?? ''}
            subject={normalized.summarySubject ?? normalized.subject ?? ''}
            introLetter={normalized.introLetter ?? ''}
            isSummary={true}
          />
          
          <table className="w-full border-collapse border border-black text-[13px] font-sans text-black">
            <thead>
              <tr className="bg-[#0070c0] text-black">
                <th className="w-14 border border-black px-3 py-2 text-center font-bold">SL</th>
                <th className="border border-black px-3 py-2 text-left font-bold">NAME</th>
                <th className="w-36 border border-black px-3 py-2 text-center font-bold">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {floorSummaries.map((entry, index) => (
                <tr key={entry.floor.id} className="border border-black font-medium">
                  <td className="border border-black px-3 py-2 text-center">{String(index + 1).padStart(2, '0')}</td>
                  <td className="border border-black px-3 py-2 text-left">{entry.floor.name}</td>
                  <td className="border border-black px-3 py-2 text-center">
                    {formatDetailAmount(entry.total)}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#0070c0] text-black font-bold">
                <td colSpan={2} className="border border-black px-3 py-2 text-center font-bold">
                  GRAND TOTAL
                </td>
                <td className="border border-black px-3 py-2 text-center font-bold">
                  {formatDetailAmount(totals.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
          
          <p className="text-[13px] font-sans text-black">
            <span className="font-bold underline">In Words:</span>{' '}
            <span className="font-semibold">{amountInWordsTaka(totals.grandTotal)}</span>
          </p>
        </div>

        <ScreenFooter />
      </section>

      {/* Per-floor detail pages */}
      {floorSummaries.map((entry) => (
        <section
          key={entry.floor.id}
          className="print-page relative bg-white mx-auto w-[210mm] min-h-[297mm] p-[38mm_15mm_42mm_15mm] box-border shadow-md mb-6 page-break-after-always"
        >
          <ScreenWatermark />
          <ScreenHeader />

          <div className="relative z-10 space-y-4">
            <DetailHeader
              clientName={clientName}
              clientAddress={clientAddress}
              date={normalized.quotationDate ?? ''}
              subject={normalized.subject ?? ''}
              introLetter={normalized.introLetter ?? ''}
            />

            <table className="w-full border-collapse border border-black text-[11px] font-sans text-black">
              <thead>
                {/* Floor Header (Green) */}
                <tr className="bg-[#76933c] text-black">
                  <th colSpan={6} className="border border-black px-2 py-2 text-center text-sm font-bold uppercase tracking-wider">
                    {entry.floor.name}
                  </th>
                </tr>
                {/* Columns Header (Blue) */}
                <tr className="bg-[#0070c0] text-black">
                  <th className="border border-black px-1.5 py-1.5 text-center w-[5%] font-bold">SL</th>
                  <th className="border border-black px-1.5 py-1.5 text-center w-[18%] font-bold">NAME</th>
                  <th className="border border-black px-1.5 py-1.5 text-center w-[47%] font-bold">MATERIALS</th>
                  <th className="border border-black px-1.5 py-1.5 text-center w-[10%] font-bold">QTY SFT</th>
                  <th className="border border-black px-1.5 py-1.5 text-center w-[10%] font-bold">UNIT PRICE</th>
                  <th className="border border-black px-1.5 py-1.5 text-center w-[10%] font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line, lineIndex) => (
                  <tr key={line.id} className="bg-white text-black align-top font-medium">
                    <td className="border border-black px-1 py-1.5 text-center font-bold align-top">
                      {String(line.serialNo ?? lineIndex + 1).padStart(2, '0')}
                    </td>
                    <td className="border border-black px-2 py-1.5 text-left font-bold align-top whitespace-pre-wrap">
                      {line.description}
                    </td>
                    <td className="border border-black px-2 py-1.5 text-left font-normal align-top whitespace-pre-wrap leading-normal">
                      {formatMaterialText(line.materials)}
                    </td>
                    {isPackageLine(line) ? (
                      <>
                        <td className="border border-black px-1 py-1.5 text-center align-middle font-medium">
                          Package
                        </td>
                        <td className="border border-black px-1 py-1.5 text-center align-middle font-medium">
                          As Per Design
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border border-black px-1 py-1.5 text-center align-top font-medium">
                          {formatDetailQtyCell(line)}
                        </td>
                        <td className="border border-black px-1 py-1.5 text-center align-top font-medium">
                          {formatDetailUnitPriceCell(line)}
                        </td>
                      </>
                    )}
                    <td className="border border-black px-1 py-1.5 text-center align-top font-bold">
                      {formatDetailTotalCell(line)}
                      {line.description.toLowerCase().includes('electric wiring') ? ' (Approx)' : ''}
                    </td>
                  </tr>
                ))}
                {/* Floor Subtotal (Blue) */}
                <tr className="bg-[#0070c0] text-black font-bold">
                  <td colSpan={5} className="border border-black px-2 py-1.5 text-center font-bold uppercase">
                    TOTAL
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">
                    {formatDetailAmount(entry.total)}
                  </td>
                </tr>
              </tbody>
            </table>

            <p className="text-[13px] font-sans text-black">
              <span className="font-bold underline">In Words:</span>{' '}
              <span className="font-semibold">{amountInWordsTaka(entry.total)}</span>
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
          </div>

          <ScreenFooter />
        </section>
      ))}

      <style jsx global>{`
        .detail-quotation-preview {
          font-family: Arial, Helvetica, sans-serif !important;
        }
        @media print {
          body {
            background-color: white !important;
            background-image: url('/images/detail-watermark.jpg') !important;
            background-repeat: repeat-y !important;
            background-position: center 50% !important;
            background-size: 75% auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .detail-quotation-preview {
            background-color: transparent !important;
            padding: 0 !important;
          }
          .print-page {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 35mm 0 40mm 0 !important;
            width: 100% !important;
            min-height: 297mm !important;
            page-break-after: always !important;
            background-color: transparent !important;
          }
          .print-page table {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .print-page tr {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-page th {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: inherit !important;
            border: 1px solid black !important;
          }
          .print-page td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: inherit !important;
            border: 1px solid black !important;
          }
          .print-page .bg-\\[\\#76933c\\] {
            background-color: #76933c !important;
          }
          .print-page .bg-\\[\\#0070c0\\] {
            background-color: #0070c0 !important;
          }
          .print-page .bg-\\[\\#bf9000\\] {
            background-color: #bf9000 !important;
          }
          .print-page .bg-white {
            background-color: transparent !important;
          }
          @page {
            margin-top: 35mm !important;
            margin-bottom: 40mm !important;
            margin-left: 15mm !important;
            margin-right: 15mm !important;
          }
        }
      `}</style>
    </div>
  )
}

