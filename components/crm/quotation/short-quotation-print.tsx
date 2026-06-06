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
    <div className="short-quotation-print mx-auto max-w-[900px] bg-white p-8 text-black">
      <div className="mb-6 space-y-2 text-sm">
        <div className="flex flex-wrap justify-between gap-4">
          <p>
            <span className="font-semibold">Quotation for:</span> {content.clientName}
          </p>
          <p>
            <span className="font-semibold">Date:</span>
            {formatShortQuotationDate(content.quotationDate)}
          </p>
        </div>
        <p>
          <span className="font-semibold">Address:</span> {content.clientAddress}
        </p>
        <p>
          <span className="font-semibold">Subject:</span> {content.subject}
        </p>
        <p className="whitespace-pre-wrap pt-2">{content.introLetter}</p>
        <p className="pt-2 text-base font-bold tracking-wide">{content.packageTier}</p>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black">
            <th className="px-2 py-2 text-left font-semibold">SL</th>
            <th className="px-2 py-2 text-left font-semibold">NAME</th>
            <th className="px-2 py-2 text-right font-semibold">QTY SFT</th>
            <th className="px-2 py-2 text-right font-semibold">UNIT PRICE</th>
            <th className="px-2 py-2 text-right font-semibold">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {summary.floors.map((floorSummary) => (
            <Fragment key={floorSummary.floor.id}>
              {floorSummary.rooms.map((roomSummary) => (
                <Fragment key={roomSummary.room.id}>
                  <tr>
                    <td colSpan={5} className="px-2 pt-4 pb-1 text-sm font-bold uppercase">
                      {roomSummary.room.name}
                    </td>
                  </tr>
                  {roomSummary.lines.map((line) => (
                    <tr key={line.id} className="border-b border-black/10">
                      <td className="px-2 py-1 align-top">{line.serialNo}</td>
                      <td className="px-2 py-1 align-top">{line.name}</td>
                      <td className="px-2 py-1 text-right align-top">
                        {line.isLumpSum || line.quantitySqft === null ? '' : formatAmount(line.quantitySqft)}
                      </td>
                      <td className="px-2 py-1 text-right align-top">
                        {line.isLumpSum || line.unitPrice === null ? '' : formatAmount(line.unitPrice)}
                      </td>
                      <td className="px-2 py-1 text-right align-top font-medium">
                        {formatAmount(line.total)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} className="px-2 py-1 text-right font-bold">
                      TOTAL
                    </td>
                    <td className="px-2 py-1 text-right font-bold">
                      {formatAmount(roomSummary.total)}
                    </td>
                  </tr>
                </Fragment>
              ))}
              <tr>
                <td colSpan={4} className="px-2 pt-3 pb-1 text-right text-sm font-bold uppercase">
                  {floorSummary.floor.name} — ALL TOTAL
                </td>
                <td className="px-2 pt-3 pb-1 text-right text-sm font-bold">
                  {formatAmount(floorSummary.total)}
                </td>
              </tr>
            </Fragment>
          ))}
          <tr>
            <td colSpan={4} className="px-2 pt-4 text-right text-base font-bold">
              GRAND TOTAL
            </td>
            <td className="px-2 pt-4 text-right text-base font-bold">
              {formatAmount(summary.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>

      {content.footerNotes.length > 0 ? (
        <div className="mt-6 space-y-1 text-sm">
          {content.footerNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}
    </div>
  )
}
