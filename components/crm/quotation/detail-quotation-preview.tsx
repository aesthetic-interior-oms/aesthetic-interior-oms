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

// QR Code inline SVG matching the one in the PDF
function QRCode() {
  return (
    <svg viewBox="0 0 296 296" width={40} height={40} className="flex-shrink-0">
      <path d="M32,236v-28h56v56H32V236L32,236z M80,236v-20H40v40h40V236L80,236z M48,236v-12h24v24H48V236L48,236z M104,260v-4h-8v-16h8v-24h8v-8H96v-8H64v-8h8v-8H56v16h-8v-8H32v-8h16v-16h-8v8h-8v-16h16v8h8v8h8v-8h8v8h16v-8h-8v-8H56v-8h24v-8H56v-8h-8v8H32v-24h8v8h48v-8h-8v-8H64v8h-8v-8H40V96h16v16h8v-8h16v-8h8v8h-8v8h8v8h8v-16h8v-8h-8V72h16v8h8v8h-8v8h8v48h-16v-8h-8v8h-8v8h-8v8h8v8h8v8h16v-8h-8v-8h-8v-8h16v16h8v-16h8v16h8v-24h8v-8h8v8h-8v8h8v8h24v-8h-8v-8h-8v-16h-8v-8h8v-8h8v-8h-8v-8h-8v16h-8v-8h-8v8h-8v-8h8v-8h-8V72h-8v-8h8v8h8V40h8v16h16v-8h-8V32h16v8h-8v8h16v-8h8v-8h16v24h-16v-8h-8v16h8v24h8v-8h8v40h16v-8h-8V96h16v24h16v-8h-8V96h8v16h8v-8h16v16h-8v-8h-8v8h-8v24h8v8h-8v8h-16v8h-8v8h-16v-8h-8v-8h-8v16h8v8h24v8h16v-8h-8v-8h8v-8h8v8h8v8h8v-16h-8v-8h16v24h-8v16h8v16h-8v24h8v8h-24v16h-24v-8h16v-8h-16v-16h-8v16h-8v8h8v8h-16v-24h-8v16h-8v-8h-8v-32h8v24h8v-24h8v-16h-8v-8h-8v-8h8v-8h-8v-8h-8v32h8v8h-16v16h-8v16h8v8h-8v8h16v8h-16v-8h-8v-8h-8v16h-32V260L104,260z M128,248v-8h8v-24h-16v8h8v8h-16v8h-8v8h8v8h16V248L128,248z M240,240v-8h8v-16h8v-8h-8v-24h-8v24h8v8h-8v8h-8v24h8V240L240,240z M200,236v-4h-8v8h8V236L200,236z M152,220v-4h-8v8h8V220L152,220z M224,212v-12h-24v24h24V212L224,212z M208,212v-4h8v8h-8V212L208,212z M144,204v-4h16v-8h-16v-8h-8v8h8v8h-16v-8h-8v8h-8v-8h-8v-8h-8v-8h-8v8h-8v8h8v-8h8v8h8v8h8v8h32V204L144,204z M120,180v-4h-8v8h8V180L120,180z M160,176v-8h-16v8h8v8h8V176L160,176z M208,164v-4h-8v8h8V164L208,164z M224,156v-4h8v-24h-8v8h-8v8h-8v-8h-16v-8h-8v-8h8V96h-8v-8h-8v-8h-8v8h-8V64h8v8h8v-8h-8v-8h-8v8h-8v24h8v8h8v-8h8v24h-8v8h-8v8h8v16h8v-8h16v8h8v8h16v8h8V156L224,156z M216,148v-4h8v8h-8V148L216,148z M88,140v-4h8v-8h-8v8h-8v8h8V140L88,140z M112,124v-4h-8v8h8V124L112,124z M112,84v-4h-8v8h8V84L112,84z M144,80v-8h-8v16h8V80L144,80z M192,44v-4h-8v8h8V44L192,44z M256,260v-4h8v8h-8V260L256,260z M256,144v-8h-8v-8h8v8h8v16h-8V144L256,144z M32,60V32h56v56H32V60L32,60zM80,60V40H40v40h40V60L80,60z M48,60V48h24v24H48V60L48,60z M208,60V32h56v56h-56V60L208,60z M256,60V40h-40v40h40V60L256,60zM224,60V48h24v24h-24V60L224,60z M96,60v-4h8v8h-8V60L96,60z M112,52v-4h-8V32h8v8h8v-8h8v8h-8v16h-8V52L112,52z" />
    </svg>
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
    <div className="flex justify-between items-start border-b border-neutral-200 pb-4 mb-5">
      {/* Left: Logo + Client */}
      <div className="flex flex-col gap-4">
        <img src="/Logo/HeaderLogo.png" alt="Logo" className="h-10 object-contain object-left" />
        <div>
          <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-0.5">Prepared For</p>
          <p className="text-[11px] font-bold text-[#0f5b53] leading-snug">{clientName}</p>
          <p className="text-[9px] text-neutral-500 mt-0.5 leading-snug max-w-[200px]">{clientAddress || '—'}</p>
        </div>
      </div>

      {/* Right: QUOTATION + QR + meta box */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold tracking-wider" style={{ color: PRIMARY }}>
            QUOTATION
          </span>
          <QRCode />
        </div>
        <div
          className="rounded text-[9px]"
          style={{
            backgroundColor: '#f5f9f8',
            borderLeft: `3px solid ${PRIMARY}`,
            padding: '6px 10px',
            minWidth: 170,
          }}
        >
          <div className="flex justify-between items-center gap-4 mb-1">
            <span className="text-neutral-400 uppercase text-[8px] font-bold">Date &amp; Time</span>
            <span className="font-bold text-neutral-800 text-[8px]">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-neutral-400 uppercase text-[8px] font-bold">Quote ID</span>
            <span className="font-bold text-neutral-800 text-[8px]">{quoteId}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PageFooter() {
  return (
    <div className="border-t border-neutral-200 pt-3 mt-6">
      <div className="flex justify-between text-[8px] text-neutral-500 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Phone className="w-2.5 h-2.5 flex-shrink-0" style={{ color: PRIMARY }} />
          <span>+88 01329 694660, +88 01329 694661</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Mail className="w-2.5 h-2.5 flex-shrink-0" style={{ color: PRIMARY }} />
          <span>aestheticinteriorstudio@gmail.com</span>
        </div>
      </div>
      <div className="flex justify-between text-[8px] text-neutral-500">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-2.5 h-2.5 flex-shrink-0" style={{ color: PRIMARY }} />
          <span>2nd Floor, 183 East Senpara Parbata, Mirpur 10, Dhaka</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Globe className="w-2.5 h-2.5 flex-shrink-0" style={{ color: PRIMARY }} />
          <span className="font-bold" style={{ color: PRIMARY }}>www.aestheticinteriorbd.com</span>
        </div>
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
      <section className="relative bg-white mx-auto w-[210mm] min-h-[297mm] px-10 pt-8 pb-16 box-border shadow-md mb-6">
        <PageHeader
          date={normalized.quotationDate ?? ''}
          clientName={clientName}
          clientAddress={clientAddress}
        />

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
          className="relative bg-white mx-auto w-[210mm] min-h-[297mm] px-10 pt-8 pb-16 box-border shadow-md mb-6"
        >
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
      <section className="relative bg-white mx-auto w-[210mm] min-h-[297mm] px-10 pt-8 pb-16 box-border shadow-md mb-6">
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
