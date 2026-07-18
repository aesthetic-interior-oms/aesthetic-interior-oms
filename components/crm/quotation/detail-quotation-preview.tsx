'use client'

import { Phone, Mail, MapPin, Globe } from 'lucide-react'
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

const PRIMARY = '#0f5b53'

type DetailQuotationPreviewProps = {
  content: QuotationDraftContent
  clientName: string
  clientAddress: string | null
  totals: QuotationTotals
  className?: string
}

function formatDateString(dateString: string) {
  if (!dateString) return 'N/A'
  try {
    let timestamp = Date.parse(dateString)
    if (isNaN(timestamp) && dateString.includes('-')) {
      const parts = dateString.split('-')
      if (parts.length === 3) {
        timestamp = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime()
      }
    }
    if (isNaN(timestamp)) return dateString
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

function getQuoteId(date: string) {
  let suffix = Math.floor(Math.random() * 1000000).toString()
  if (date) {
    let timestamp = Date.parse(date)
    if (isNaN(timestamp) && date.includes('-')) {
      const parts = date.split('-')
      if (parts.length === 3) {
        timestamp = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime()
      }
    }
    if (!isNaN(timestamp)) suffix = timestamp.toString().slice(-6)
  }
  return `QTN-${suffix}`
}

// Watermark component for pages
function WatermarkBackground() {
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center opacity-5 pointer-events-none">
      <img src="/android-chrome-512x512.png" alt="watermark" className="w-[400px] h-[400px] object-contain" />
    </div>
  )
}

function PageHeader({
  date,
  clientName,
  clientAddress,
}: {
  date: string
  clientName: string
  clientAddress: string | null
}) {
  const formattedDate =
    formatDateString(date) +
    ' ' +
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const quoteId = getQuoteId(date)

  return (
    <div className="flex flex-col mb-6 relative z-10">
      {/* Top section: Logo and Meta */}
      <div className="flex justify-between items-end pb-3">
        {/* Left: Logo */}
        <div className="w-[50%]">
          <img src="/Logo/HeaderLogo.png" alt="Logo" className="w-[160px] object-contain object-left" />
        </div>
        {/* Right: Quotation Details */}
        <div className="w-[50%] flex flex-col items-end gap-1">
          <p className="text-[10px] text-neutral-500"><span className="font-bold text-neutral-700">Quote ID:</span> {quoteId}</p>
          <p className="text-[10px] text-neutral-500"><span className="font-bold text-neutral-700">Date:</span> {formattedDate}</p>
        </div>
      </div>
    </div>
  )
}

function ClientInfoBlock({ clientName, clientAddress }: { clientName: string, clientAddress: string | null }) {
  return (
    <div className="flex justify-between pb-6">
      <div className="w-[100%]">
        <p className="text-[9px] text-[#a57c00] uppercase tracking-wider mb-1 font-bold">Prepared For</p>
        <p className="text-[14px] font-bold text-[#0f5b53] leading-snug mb-0.5">{clientName}</p>
        <p className="text-[10px] text-neutral-600 leading-snug max-w-[250px]">{clientAddress || '—'}</p>
      </div>
    </div>
  )
}

function PageFooter() {
  return (
    <div className="border-t border-[#a57c00] pt-3 mt-12 relative z-10 flex justify-between text-[9px] text-neutral-700">
      <div className="absolute -bottom-6 left-0 right-0 z-[-1] opacity-[0.12] pointer-events-none">
        <img src="/city.png" alt="" className="w-full h-[60px] object-cover object-bottom" />
      </div>
      <div className="w-[35%]">
        <p className="font-bold mb-1" style={{ color: PRIMARY }}>Aesthetic Interior Studio</p>
        <p>183, East Senpara, Begum Rokeya Soroni</p>
        <p>3rd floor, Mirpur 10, Dhaka-1216</p>
      </div>
      <div className="w-[30%] flex flex-col items-center">
        <p>+88 0132969 4663</p>
        <p>hello@aestheticinterior.com</p>
        <p className="font-bold" style={{ color: PRIMARY }}>www.aestheticinteriorbd.com</p>
      </div>
      <div className="w-[35%] flex flex-col justify-end items-end">
        <p className="text-neutral-500">© 2026 All rights reserved.</p>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] font-bold uppercase tracking-wider px-2 py-1.5 mt-4 mb-0"
      style={{ color: PRIMARY, backgroundColor: '#e6f0ef' }}
    >
      {children}
    </div>
  )
}

function TableHeader({ cols }: { cols: { label: string; className?: string }[] }) {
  return (
    <div
      className="flex text-[8px] font-bold uppercase border-b pt-2 pb-1.5"
      style={{ color: PRIMARY, borderColor: PRIMARY }}
    >
      {cols.map((col) => (
        <span key={col.label} className={col.className}>
          {col.label}
        </span>
      ))}
    </div>
  )
}

function formatMaterialText(text: string | null | undefined) {
  if (!text) return <span className="text-neutral-400">—</span>
  const lines = text.split('\n')
  return (
    <span className="block space-y-0.5">
      {lines.map((line, idx) => {
        const match = line.match(/^(\d{2}\.[^:]+:|[^:*]+:|\*[^:]+:)/)
        if (match) {
          const prefix = match[1]
          const rest = line.substring(prefix.length)
          return (
            <span key={idx} className="block text-[8px] leading-snug">
              <span className="font-bold">{prefix}</span>
              {rest}
            </span>
          )
        }
        return (
          <span key={idx} className="block text-[8px] leading-snug">
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
  const cleanIntro = (normalized.introLetter || '')
    .replace('Dear Sir,\n', '')
    .replace('Dear Sir,', '')
    .trim()

  return (
    <div className={`detail-quotation-preview w-full bg-neutral-100 ${className ?? ''}`}>
      {/* ── SUMMARY PAGE ─────────────────────────────── */}
      <section className="relative bg-white mx-auto w-[210mm] min-h-[297mm] px-10 pt-8 pb-16 box-border shadow-md mb-6 overflow-hidden">
        <WatermarkBackground />
        <PageHeader
          date={normalized.quotationDate ?? ''}
          clientName={clientName}
          clientAddress={clientAddress}
        />

        <ClientInfoBlock clientName={clientName} clientAddress={clientAddress} />

        {cleanIntro ? (
          <div className="mb-4 text-[9px] text-neutral-700 leading-relaxed">
            <p className="font-bold mb-1">Dear Sir,</p>
            <p className="text-justify whitespace-pre-wrap">{cleanIntro}</p>
          </div>
        ) : null}

        <SectionTitle>Project Summary</SectionTitle>

        <TableHeader
          cols={[
            { label: 'SL', className: 'w-[8%] text-center' },
            { label: 'Description', className: 'w-[70%]' },
            { label: 'Amount', className: 'w-[22%] text-right' },
          ]}
        />

        <div>
          {floorSummaries.map((entry, index) => (
            <div
              key={entry.floor.id}
              className="flex text-[9px] border-b py-2"
              style={{ borderColor: '#eeeeee' }}
            >
              <span className="w-[8%] text-center text-neutral-500">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="w-[70%] font-bold">{entry.floor.name}</span>
              <span className="w-[22%] text-right font-bold">{formatDetailAmount(entry.total)}</span>
            </div>
          ))}
        </div>

        {/* Grand Total */}
        <div className="flex justify-end items-center border-t pt-2 mt-2" style={{ borderColor: PRIMARY }}>
          <span className="text-[10px] font-bold pr-4" style={{ color: PRIMARY }}>Grand Total</span>
          <span className="text-[10px] font-bold" style={{ color: PRIMARY }}>
            {formatDetailAmount(totals.grandTotal)}
          </span>
        </div>
        <p className="text-right text-[8px] italic text-neutral-500 mt-1">
          In Words:{' '}
          <span className="font-bold not-italic">{amountInWordsTaka(totals.grandTotal)}</span>
        </p>

        {/* Footer pinned to bottom */}
        <div className="absolute bottom-6 left-10 right-10">
          <PageFooter />
        </div>
      </section>

      {/* ── DETAIL PAGES ─────────────────────────────── */}
      {floorSummaries.map((entry) => (
        <section
          key={entry.floor.id}
          className="relative bg-white mx-auto w-[210mm] min-h-[297mm] px-10 pt-8 pb-16 box-border shadow-md mb-6 flex flex-col overflow-hidden"
        >
          <WatermarkBackground />
          <PageHeader
            date={normalized.quotationDate ?? ''}
            clientName={clientName}
            clientAddress={clientAddress}
          />

          <SectionTitle>{entry.floor.name}</SectionTitle>

          <TableHeader
            cols={[
              { label: 'SL', className: 'w-[8%] text-center' },
              { label: 'Name', className: 'w-[22%]' },
              { label: 'Materials', className: 'w-[36%]' },
              { label: 'Qty/Sft', className: 'w-[10%] text-center' },
              { label: 'Unit Price', className: 'w-[12%] text-right' },
              { label: 'Total', className: 'w-[12%] text-right' },
            ]}
          />

          <div>
            {entry.lines.map((line, lineIndex) => (
              <div
                key={line.id}
                className="flex text-[9px] border-b py-2 items-start"
                style={{ borderColor: '#eeeeee' }}
              >
                <span className="w-[8%] text-center text-neutral-500 pt-0.5">
                  {String(lineIndex + 1).padStart(2, '0')}
                </span>
                <span className="w-[22%] font-bold pr-1 leading-snug">{line.description}</span>
                <span className="w-[36%] pr-1">{formatMaterialText(line.materials)}</span>
                <span className="w-[10%] text-center text-neutral-600">
                  {formatDetailQtyCell(line)}
                </span>
                <span className="w-[12%] text-right text-neutral-600">
                  {formatDetailUnitPriceCell(line)}
                </span>
                <span className="w-[12%] text-right font-bold" style={{ color: PRIMARY }}>
                  {formatDetailTotalCell(line)}
                  {line.description.toLowerCase().includes('electric wiring') ? (
                    <span className="block text-[7px] font-normal text-neutral-500">(Approx)</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>

          {/* Floor Total */}
          <div className="flex justify-end items-center border-t pt-2 mt-2" style={{ borderColor: PRIMARY }}>
            <span className="text-[10px] font-bold pr-4" style={{ color: PRIMARY }}>
              Total for {entry.floor.name}
            </span>
            <span className="text-[10px] font-bold" style={{ color: PRIMARY }}>
              {formatDetailAmount(entry.total)}
            </span>
          </div>
          <p className="text-right text-[8px] italic text-neutral-500 mt-1">
            In Words:{' '}
            <span className="font-bold not-italic">{amountInWordsTaka(entry.total)}</span>
          </p>

          {/* Footer */}
          <div className="absolute bottom-6 left-10 right-10">
            <PageFooter />
          </div>
        </section>
      ))}

      {/* ── TERMS PAGE ───────────────────────────────── */}
      <section className="relative bg-white mx-auto w-[210mm] min-h-[297mm] px-10 pt-8 pb-16 box-border shadow-md flex flex-col overflow-hidden">
        <WatermarkBackground />
        <PageHeader
          date={normalized.quotationDate ?? ''}
          clientName={clientName}
          clientAddress={clientAddress}
        />

        <SectionTitle>Terms &amp; Signatures</SectionTitle>

        <div className="mt-3 space-y-3 text-[9px]">
          {normalized.notes ? (
            <div>
              <p className="font-bold uppercase text-[8px] mb-1" style={{ color: PRIMARY }}>Notes</p>
              <p className="text-neutral-600 whitespace-pre-wrap leading-relaxed">{normalized.notes}</p>
            </div>
          ) : null}

          {normalized.terms ? (
            <div>
              <p className="font-bold uppercase text-[8px] mb-1" style={{ color: PRIMARY }}>Terms &amp; Conditions</p>
              <p className="text-neutral-600 whitespace-pre-wrap leading-relaxed">{normalized.terms}</p>
            </div>
          ) : null}

          <div className="flex gap-6">
            {normalized.paymentTerms ? (
              <div className="flex-1">
                <p className="font-bold uppercase text-[8px] mb-1" style={{ color: PRIMARY }}>Mode of Payment</p>
                <p className="text-neutral-600 whitespace-pre-wrap leading-relaxed">
                  {normalized.paymentTerms.replace('Mode of Payment\n', '').replace('Mode of Payment', '')}
                </p>
              </div>
            ) : null}
            {normalized.durationNotes ? (
              <div className="flex-1">
                <p className="font-bold uppercase text-[8px] mb-1" style={{ color: PRIMARY }}>Duration of Work</p>
                <p className="text-neutral-600 whitespace-pre-wrap leading-relaxed">
                  {normalized.durationNotes.replace('Duration Of Work:\n', '').replace('Duration Of Work:', '')}
                </p>
              </div>
            ) : null}
          </div>

          {normalized.drawingDesign ? (
            <p className="text-red-600 font-bold whitespace-pre-wrap leading-normal pt-2">
              {normalized.drawingDesign}
            </p>
          ) : null}
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end mt-16">
          <div>
            <div className="w-36 border-t border-neutral-800 pt-1">
              <p className="text-[9px] font-bold">Customer Approval</p>
              <p className="text-[8px] text-neutral-500">Sign &amp; Date</p>
            </div>
          </div>
          <div>
            <div className="w-36 border-t border-neutral-800 pt-1 text-right">
              <p className="text-[9px] font-bold">{normalized.signatoryName || 'Authorized Signature'}</p>
              <p className="text-[8px] text-neutral-500">{normalized.signatoryTitle || 'Aesthetic Interior'}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-10 right-10">
          <PageFooter />
        </div>
      </section>
    </div>
  )
}
