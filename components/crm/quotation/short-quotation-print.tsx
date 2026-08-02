'use client'

import { Fragment } from 'react'
import { amountInWordsTaka } from '@/lib/number-to-words'
import { buildShortQuotationSummary, formatShortQuotationDate } from '@/lib/short-quotation-calculations'
import type { ShortQuotationContent } from '@/lib/short-quotation-types'

const PRIMARY = '#0f5b53'
const GOLD = '#a57c00'

function formatAmount(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

function formatCurrency(value: number) {
  return `৳ ${formatAmount(value)}`
}

function WatermarkBackground() {
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center opacity-5 pointer-events-none">
      <img src="/android-chrome-512x512.png" alt="watermark" className="h-[400px] w-[400px] object-contain" />
    </div>
  )
}

function formatDownloadDateTime(value: string | undefined) {
  if (!value) return 'Not downloaded yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function PageHeader({ content }: { content: ShortQuotationContent }) {
  const formattedDate = formatShortQuotationDate(content.quotationDate)
  return (
    <div className="relative z-10 mb-6 flex flex-col">
      <div className="border-t-2 pt-3" style={{ borderColor: PRIMARY }}>
        <div className="flex items-center justify-between border-b border-[#e7d49a] pb-3">
          <div className="w-1/2">
            <img src="/Logo/HeaderLogo.png" alt="Logo" className="w-[150px] object-contain object-left" />
          </div>
          <div className="ml-auto rounded-xl border border-[#e7d49a] bg-[#fffdf7] px-4 py-2 text-right shadow-sm">
            <p className="text-[7px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>Quotation Date</p>
            <p className="mt-0.5 text-[10px] font-bold" style={{ color: PRIMARY }}>{formattedDate}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PageFooter({ content }: { content: ShortQuotationContent }) {
  return (
    <div className="relative z-10 mt-12 border-t border-[#a57c00] pt-3 text-[9px] text-neutral-700">
      <div className="flex justify-between">
        <div className="w-[35%]">
          <p className="mb-1 font-bold" style={{ color: PRIMARY }}>Aesthetic Interior Studio</p>
          <p>183, East Senpara, Begum Rokeya Soroni</p>
          <p>3rd floor, Mirpur 10, Dhaka-1216</p>
        </div>
        <div className="flex w-[30%] flex-col items-center">
          <p>+88 0132969 4663</p>
          <p>hello@aestheticinterior.com</p>
          <p className="font-bold" style={{ color: PRIMARY }}>www.aestheticinteriorbd.com</p>
        </div>
        <div className="flex w-[35%] flex-col items-end justify-end">
          <p className="text-neutral-500">© 2026 All rights reserved.</p>
        </div>
      </div>
      <p className="mt-1 text-right text-[6px] text-neutral-400">Quotation Code: {content.quotationCode ?? 'Not generated yet'} • Generated: {formatDownloadDateTime(content.downloadedAt)}</p>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-0 mt-4 px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider" style={{ color: PRIMARY, backgroundColor: '#f3f8f7' }}>{children}</div>
}

export function ShortQuotationPrint({ content }: { content: ShortQuotationContent }) {
  const summary = buildShortQuotationSummary(content)
  const cleanIntro = (content.introLetter || '').replace('Dear Sir,\n', '').replace('Dear Sir,', '').trim()
  const lineSerials = new Map<string, number>()
  summary.floors.forEach((floorSummary) => {
    floorSummary.rooms.forEach((roomSummary) => {
      roomSummary.lines.forEach((line) => lineSerials.set(line.id, lineSerials.size + 1))
    })
  })

  return (
    <div className="short-quotation-print w-full bg-neutral-100">
      <section className="relative mx-auto mb-6 min-h-[297mm] w-[210mm] overflow-hidden bg-white px-10 pb-16 pt-8 shadow-md">
        <WatermarkBackground />
        <PageHeader content={content} />

        <div className="pb-3">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#a57c00]">Prepared For</p>
          <p className="mb-0.5 text-[14px] font-bold leading-snug text-[#0f5b53]">{content.clientName}</p>
          <p className="max-w-[360px] text-[10px] leading-snug text-neutral-600">{content.clientAddress || '—'}</p>
        </div>

        {content.subject ? <p className="mb-3 text-[9px] text-neutral-700"><span className="font-bold">Subject:</span> {content.subject}</p> : null}
        {cleanIntro ? <div className="mb-4 text-[9px] leading-relaxed text-neutral-700"><p className="mb-1 font-bold">Dear Sir,</p><p className="whitespace-pre-wrap text-justify">{cleanIntro}</p></div> : null}

        <SectionTitle>{content.packageTier} Short Quotation Summary</SectionTitle>
        <div className="flex border-b pb-1.5 pt-2 text-[8px] font-bold uppercase" style={{ color: PRIMARY, borderColor: PRIMARY }}>
          <span className="w-[8%] text-center">SL</span><span className="w-[70%]">Description</span><span className="w-[22%] text-right">Amount</span>
        </div>
        {summary.floors.map((floorSummary, index) => (
          <div key={floorSummary.floor.id} className="flex border-b py-2 text-[9px]" style={{ borderColor: '#eeeeee', backgroundColor: index % 2 === 1 ? '#fefdf9' : '#ffffff' }}>
            <span className="w-[8%] text-center text-neutral-500">{String(index + 1).padStart(2, '0')}</span>
            <span className="w-[70%] font-bold">{floorSummary.floor.name}</span>
            <span className="w-[22%] text-right font-bold">{formatCurrency(floorSummary.total)}</span>
          </div>
        ))}
        <div className="mt-2 flex items-center justify-end border-t pt-2" style={{ borderColor: PRIMARY }}>
          <span className="pr-4 text-[10px] font-bold" style={{ color: PRIMARY }}>Grand Total</span>
          <span className="text-[10px] font-bold" style={{ color: PRIMARY }}>{formatCurrency(summary.grandTotal)}</span>
        </div>
        <p className="mt-1 text-left text-[10px] font-bold text-neutral-900">In Words: <span>{amountInWordsTaka(summary.grandTotal)}</span></p>
        <div className="absolute bottom-6 left-10 right-10"><PageFooter content={content} /></div>
      </section>

      {summary.floors.map((floorSummary, floorIndex) => (
        <section key={floorSummary.floor.id} className="relative mx-auto mb-6 min-h-[297mm] w-[210mm] overflow-hidden bg-white px-10 pb-16 pt-8 shadow-md">
          <WatermarkBackground />
          <PageHeader content={content} />
          <SectionTitle>{floorSummary.floor.name}</SectionTitle>
          <div className="flex border-b pb-1.5 pt-2 text-[8px] font-bold uppercase" style={{ color: PRIMARY, borderColor: PRIMARY }}>
            <span className="w-[8%] text-center">SL</span><span className="w-[42%]">Name</span><span className="w-[12%] text-center">Qty/Sft</span><span className="w-[18%] text-right">Unit Price</span><span className="w-[20%] text-right">Total</span>
          </div>
          {floorSummary.rooms.map((roomSummary) => (
            <Fragment key={roomSummary.room.id}>
              <div className="mt-3 px-2 py-1 text-center text-[9px] font-bold uppercase" style={{ color: PRIMARY, backgroundColor: '#f3f8f7' }}>{roomSummary.room.name}</div>
              {roomSummary.lines.map((line, lineIndex) => (
                <div key={line.id} className="flex items-start border-b py-2 text-[9px]" style={{ borderColor: '#eeeeee', backgroundColor: lineIndex % 2 === 1 ? '#fefdf9' : '#ffffff' }}>
                  <span className="w-[8%] text-center text-neutral-500">{String(lineSerials.get(line.id) ?? lineIndex + 1).padStart(2, '0')}</span>
                  <span className="w-[42%] pr-1 font-bold leading-snug">{line.name}</span>
                  <span className="w-[12%] text-center text-neutral-600">{line.isLumpSum ? <span className="inline-block rounded-full bg-[#fff8e6] px-2 py-0.5 text-[7px] font-bold uppercase text-[#a57c00]">Package</span> : formatAmount(line.quantitySqft ?? 0)}</span>
                  <span className="w-[18%] text-right text-neutral-600">{line.isLumpSum ? '--' : formatCurrency(line.unitPrice ?? 0)}</span>
                  <span className="w-[20%] text-right font-bold" style={{ color: PRIMARY }}>{formatCurrency(line.total)}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-end text-[9px] font-bold" style={{ color: PRIMARY }}><span className="pr-4">Total for {roomSummary.room.name}</span><span>{formatAmount(roomSummary.total)}</span></div>
            </Fragment>
          ))}
          <div className="mt-3 flex justify-end border-t pt-2 text-[10px] font-bold" style={{ borderColor: PRIMARY, color: PRIMARY }}><span className="pr-4">Total for {floorSummary.floor.name}</span><span>{formatCurrency(floorSummary.total)}</span></div>
          <p className="mt-1 text-left text-[10px] font-bold text-neutral-900">In Words: <span>{amountInWordsTaka(floorSummary.total)}</span></p>
          {floorIndex === summary.floors.length - 1 && content.footerNotes.length > 0 ? (
            <div className="mt-5">
              <SectionTitle>Notes</SectionTitle>
              <div className="mt-3 space-y-2 text-[9px] text-neutral-600">
                {content.footerNotes.map((note, index) => <p key={index}><span className="font-bold" style={{ color: PRIMARY }}>{index + 1}.</span> {note}</p>)}
              </div>
            </div>
          ) : null}
          <div className="absolute bottom-6 left-10 right-10"><PageFooter content={content} /></div>
        </section>
      ))}
    </div>
  )
}
