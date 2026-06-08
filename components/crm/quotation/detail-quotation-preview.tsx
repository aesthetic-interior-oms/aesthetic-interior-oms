'use client'

import { Fragment } from 'react'
import { Phone, Mail, MapPin, Globe, Instagram, Facebook } from 'lucide-react'
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

function HeaderLogo() {
  return (
    <div className="w-full flex justify-between items-center border-b-2 border-[#0f5b53] pb-3 font-sans select-none pointer-events-none">
      <div className="flex items-center gap-3">
        <img
          src="/android-chrome-192x192.png"
          className="h-[48px] w-[48px] object-contain flex-shrink-0"
          alt="Logo"
        />
        <div className="flex flex-col">
          <h1 className="text-xl font-bold font-serif tracking-wide text-[#bf9000] uppercase leading-none">
            Aesthetic Interior
          </h1>
          <div className="bg-[#0f5b53] text-white text-[9px] font-bold tracking-[0.25em] px-2.5 py-0.5 mt-1.5 text-center uppercase font-sans rounded-[2px] leading-tight">
            Interior Studio
          </div>
        </div>
      </div>
      <div className="border border-neutral-300 p-1 bg-white rounded-sm shadow-sm flex items-center justify-center">
        <svg width="45" height="45" viewBox="0 0 29 29" className="text-black fill-current">
          <path d="M0 0h9v9H0zm1 1v7h7V1zm8 0h1v1H9zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h2v1h-2zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h4v4h-4zm3 1v2h-2V2zm-2 2h1v1h-1zm-3-2h1v1h-1zm1 1h1v1h-1zm-2 0h1v1h-1zm-1 1h1v1h-1zm-2-2h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm5 1h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm-9 1h1v1H9zm1 0h2v1h-2zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm-8 1h1v1H9zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm1 0h1v1h-1zm-9 1h1v1H9zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h2v1h-2zm-9 1h3v1H9zm4 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm-9 1h1v1H9zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h2v1h-2zm-12 1h1v1H0zm1 0h2v1H1zm2 0h1v1H3zm1 0h1v1H4zm2 0h3v1H6zm4 0h1v1h-1zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm1 0h3v1h-3zm-19 1v7h7v-7zm1 1h5v5h-5zm7-1h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h2v1h-2zm3 0h1v1h-1zm-8 1h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h2v1h-2zm1 0h1v1h-1zm1 0h1v1h-1zm-7 1h2v1h-2zm4 0h2v1h-2zm4 0h1v1h-1zm-10 1h1v1H8zm2 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm-9 1h1v1H9zm2 0h1v1h-1zm2 0h2v1h-2zm2 0h1v1h-1zm2 0h2v1h-2zm-9 1h1v1H9zm3 0h1v1h-1zm1 0h1v1h-1zm3 0h2v1h-2zm1 0h1v1h-1zm-19 1h9v9H0zm1 1v7h7V21zm11-1h1v1h-1zm2 0h1v1h-1zm1 0h2v1h-2zm2 0h1v1h-1zm1 0h2v1h-2zm-7 1h1v1h-1zm2 0h1v1h-1zm3 0h2v1h-2zm1 0h1v1h-1zm-7 1h1v1H9zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h2v1h-2zm4 0h1v1h-1zm1 0h1v1h-1zm-9 1h2v1H9zm3 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm-7 1h1v1H9zm1 0h1v1h-1zm2 0h1v1h-1zm2 0h2v1h-2zm2 0h1v1h-1zm-8 1h1v1H9zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1z" />
        </svg>
      </div>
    </div>
  )
}

function FooterContacts() {
  return (
    <div className="w-full flex flex-col font-sans select-none pointer-events-none">
      <div className="w-full border-t border-neutral-300 pt-3 pb-2 flex justify-between items-start text-[11px] leading-tight text-neutral-800">
        <div className="space-y-2.5">
          <div className="flex items-start gap-2">
            <Phone className="h-3.5 w-3.5 text-[#0f5b53] mt-0.5 flex-shrink-0" />
            <div className="font-bold text-neutral-900">
              <p>+88 01329 694660</p>
              <p>+88 01329 694661</p>
              <p>+88 01329 694662</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-[#0f5b53] flex-shrink-0" />
            <p className="font-bold text-neutral-900">aestheticinteriorstudio@gmail.com</p>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 text-[#0f5b53] mt-0.5 flex-shrink-0" />
            <div className="font-bold text-neutral-900 leading-normal">
              <p>2nd Floor,183 East Senpara Parbata,</p>
              <p>Begum Rokeya Sarani,Mirpur 10,Dhaka</p>
            </div>
          </div>
        </div>
        <div className="h-[75px] opacity-[0.15] text-neutral-600 flex items-end">
          <svg width="140" height="70" viewBox="0 0 140 70" className="fill-current">
            <path d="M0 70h140V45h-15V32h-10V18h-15V5h-20v15H80V27H70V40H55V55H35V40H20v30zM50 70H35V60h15v10zm45 0H80V50h15v20zm40 0h-15V55h15v15z" />
          </svg>
        </div>
      </div>
      <div className="bg-[#0f5b53] text-white text-[10px] font-bold py-1.5 px-4 flex justify-between items-center rounded-sm leading-none">
        <div className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-white/90" />
          <span>www.aestheticinteriorbd.com</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Instagram className="h-3.5 w-3.5 text-white/90" />
          <span>aesthetic.interior.studio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Facebook className="h-3.5 w-3.5 text-white/90" />
          <span>facebook.com/aestheticinteriorofficial</span>
        </div>
      </div>
    </div>
  )
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

  const ScreenHeader = () => (
    <div className="print-page-header absolute top-0 left-0 right-0 h-[35mm] px-8 pt-6 select-none pointer-events-none print:hidden">
      <HeaderLogo />
    </div>
  )

  const ScreenFooter = () => (
    <div className="print-page-footer absolute bottom-0 left-0 right-0 h-[38mm] px-8 pb-6 select-none pointer-events-none print:hidden">
      <FooterContacts />
    </div>
  )

  const ScreenWatermark = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] print:hidden select-none">
      <img src="/aesthetic-icon.png" className="max-w-[75%] max-h-[60%] object-contain" alt="Watermark" />
    </div>
  )

  return (
    <div className={`detail-quotation-preview w-full bg-neutral-100 ${className ?? ''}`}>
      <div className="fixed-print-header hidden fixed top-0 left-0 right-0 h-[32mm] bg-white z-50 px-8 pt-6 print:block">
        <HeaderLogo />
      </div>
      <div className="fixed-print-footer hidden fixed bottom-0 left-0 right-0 h-[35mm] bg-white z-50 px-8 pb-6 print:block">
        <FooterContacts />
      </div>

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
              <tr className="bg-[#0070c0] text-white">
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
              <tr className="bg-[#0070c0] text-white font-bold">
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
                <tr className="bg-[#76933c] text-white">
                  <th colSpan={6} className="border border-black px-2 py-2 text-center text-sm font-bold uppercase tracking-wider">
                    {entry.floor.name}
                  </th>
                </tr>
                <tr className="bg-[#0070c0] text-white">
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
                <tr className="bg-[#0070c0] text-white font-bold">
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
            background-image: url('/aesthetic-icon.png') !important;
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
