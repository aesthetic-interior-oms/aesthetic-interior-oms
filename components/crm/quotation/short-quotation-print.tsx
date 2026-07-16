'use client'

import { Fragment } from 'react'
import {
  buildShortQuotationSummary,
  formatShortQuotationDate,
} from '@/lib/short-quotation-calculations'
import type { ShortQuotationContent } from '@/lib/short-quotation-types'

type ShortQuotationPrintProps = {
  content: ShortQuotationContent
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

export function ShortQuotationPrint({ content }: ShortQuotationPrintProps) {
  const summary = buildShortQuotationSummary(content)

  return (
    <div className="short-quotation-print mx-auto max-w-[900px] bg-white p-8 text-black font-sans leading-relaxed">
      <div className="mb-6 space-y-2 text-sm text-black">
        <div className="flex flex-wrap justify-between gap-4">
          <p>
            <span className="font-bold">Quotation for:</span>
            <br />
            {content.clientName}
          </p>
          <p className="text-right">
            <span className="font-bold">Date:</span> {formatShortQuotationDate(content.quotationDate)}
          </p>
        </div>
        <p>
          <span className="font-bold">Address:</span> {content.clientAddress}
        </p>
        <p>
          <span className="font-bold">Subject:</span> {content.subject}
        </p>
        <p className="font-bold pt-2">Dear Sir,</p>
        <p className="whitespace-pre-wrap pt-1 font-medium">{content.introLetter}</p>
      </div>

      <table className="w-full border-collapse border border-black text-sm text-black">
        <thead>
          {/* Package Tier Header (Green) */}
          <tr className="bg-[#76933c] text-black">
            <th colSpan={5} className="border border-black px-2 py-2 text-center text-base font-bold uppercase tracking-wider">
              {content.packageTier}
            </th>
          </tr>
          {/* Columns Header (Blue) */}
          <tr className="bg-[#0070c0] text-black">
            <th className="border border-black px-2 py-2 text-center font-bold w-[6%]">SL</th>
            <th className="border border-black px-2 py-2 text-center font-bold w-[54%]">NAME</th>
            <th className="border border-black px-2 py-2 text-center font-bold w-[12%]">QTY SFT</th>
            <th className="border border-black px-2 py-2 text-center font-bold w-[13%]">UNIT PRICE</th>
            <th className="border border-black px-2 py-2 text-center font-bold w-[15%]">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {summary.floors.map((floorSummary) => (
            <Fragment key={floorSummary.floor.id}>
              {/* Floor Header Row (Gold/Brown) */}
              <tr className="bg-[#bf9000] text-black">
                <td colSpan={5} className="border border-black px-2 py-2 text-center font-bold uppercase">
                  {floorSummary.floor.name || 'Floor'}
                </td>
              </tr>
              {floorSummary.rooms.map((roomSummary) => (
                <Fragment key={roomSummary.room.id}>
                  {/* Room Header Row (White) */}
                  <tr className="bg-white text-black">
                    <td colSpan={5} className="border border-black px-2 py-2 text-center font-bold uppercase">
                      {roomSummary.room.name || 'Room'}
                    </td>
                  </tr>
                  {/* Item Rows */}
                  {roomSummary.lines.map((line, lineIndex) => (
                    <tr key={line.id} className="bg-white text-black">
                      <td className="border border-black px-2 py-1.5 text-center align-middle font-medium">
                        {lineIndex + 1}
                      </td>
                      <td className="border border-black px-3 py-1.5 text-left align-middle font-medium">
                        {line.name}
                      </td>
                      {line.isLumpSum ? (
                        <td colSpan={2} className="border border-black px-2 py-1.5 text-center align-middle font-medium">
                          Package
                        </td>
                      ) : (
                        <>
                          <td className="border border-black px-2 py-1.5 text-center align-middle font-medium">
                            {line.quantitySqft !== null ? formatAmount(line.quantitySqft) : ''}
                          </td>
                          <td className="border border-black px-2 py-1.5 text-center align-middle font-medium">
                            {line.unitPrice !== null ? formatAmount(line.unitPrice) : ''}
                          </td>
                        </>
                      )}
                      <td className="border border-black px-2 py-1.5 text-center align-middle font-medium">
                        {formatAmount(line.total)}
                      </td>
                    </tr>
                  ))}
                  {/* Room Total Row (Blue) */}
                  <tr className="bg-[#0070c0] text-black font-bold">
                    <td colSpan={4} className="border border-black px-2 py-1.5 text-center font-bold uppercase">
                      TOTAL
                    </td>
                    <td className="border border-black px-2 py-1.5 text-center font-bold">
                      {formatAmount(roomSummary.total)}
                    </td>
                  </tr>
                </Fragment>
              ))}
              {/* Floor All Total Row (Green) */}
              <tr className="bg-[#76933c] text-black font-bold">
                <td colSpan={4} className="border border-black px-2 py-2 text-center font-bold uppercase">
                  ALL TOTAL
                </td>
                <td className="border border-black px-2 py-2 text-center font-bold">
                  {formatAmount(floorSummary.total)}
                </td>
              </tr>
            </Fragment>
          ))}
          {/* Grand Total Row (Gold/Brown) */}
          <tr className="bg-[#bf9000] text-black font-bold">
            <td colSpan={4} className="border border-black px-2 py-2 text-center font-bold uppercase">
              GRAND TOTAL
            </td>
            <td className="border border-black px-2 py-2 text-center font-bold">
              {formatAmount(summary.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>

      {content.footerNotes.length > 0 ? (
        <div className="mt-8 space-y-2 text-sm text-black font-bold">
          {content.footerNotes.map((note, index) => (
            <div key={index} className="flex items-start gap-4">
              <span className="w-5 flex-shrink-0 text-left">{index + 1}</span>
              <span>{note}</span>
            </div>
          ))}
        </div>
      ) : null}

      <style jsx global>{`
        .short-quotation-print {
          font-family: Arial, Helvetica, sans-serif !important;
        }
        @media print {
          .short-quotation-print {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .short-quotation-print table {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .short-quotation-print tr {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .short-quotation-print th {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: inherit !important;
            border: 1px solid black !important;
          }
          .short-quotation-print td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: inherit !important;
            border: 1px solid black !important;
          }
          /* Custom overrides for standard classes in print mode */
          .short-quotation-print .bg-\\[\\#76933c\\] {
            background-color: #76933c !important;
          }
          .short-quotation-print .bg-\\[\\#0070c0\\] {
            background-color: #0070c0 !important;
          }
          .short-quotation-print .bg-\\[\\#bf9000\\] {
            background-color: #bf9000 !important;
          }
          .short-quotation-print .bg-white {
            background-color: #ffffff !important;
          }
        }
      `}</style>
    </div>
  )
}

