'use client'

import { buildDetailFloorSummaries, formatDetailAmount, isPackageLine } from '@/lib/detail-quotation-format'
import { amountInWordsTaka } from '@/lib/number-to-words'
import { buildShortQuotationSummary } from '@/lib/short-quotation-calculations'
import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'
import type { ShortQuotationContent } from '@/lib/short-quotation-types'

type DetailInput = {
  clientName: string
  clientAddress: string | null
  content: QuotationDraftContent
  totals: QuotationTotals
}

type WordFormat = 'doc' | 'docx'

const encoder = new TextEncoder()

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}



function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wordText(value: unknown, preserveSpace = false) {
  const text = escapeXml(value)
  return `<w:t${preserveSpace || /^\s|\s$|\n/.test(String(value ?? '')) ? ' xml:space="preserve"' : ''}>${text}</w:t>`
}

function wordRun(value: unknown, options: { bold?: boolean; color?: string; size?: number } = {}) {
  const props = [
    options.bold ? '<w:b/>' : '',
    options.color ? `<w:color w:val="${options.color}"/>` : '',
    options.size ? `<w:sz w:val="${options.size}"/>` : '',
  ].join('')
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}${wordText(value, true)}</w:r>`
}

function wordParagraph(value: unknown, options: { bold?: boolean; heading?: boolean; color?: string; align?: 'left' | 'center' | 'right'; spacingAfter?: number } = {}) {
  const align = options.align && options.align !== 'left' ? `<w:jc w:val="${options.align}"/>` : ''
  const spacing = `<w:spacing w:after="${options.spacingAfter ?? 120}"/>`
  return `<w:p><w:pPr>${align}${spacing}</w:pPr>${wordRun(value, { bold: options.bold ?? options.heading, color: options.color, size: options.heading ? 28 : undefined })}</w:p>`
}

function wordMultilineParagraph(value: unknown, options: { bold?: boolean; color?: string } = {}) {
  return String(value ?? '')
    .split('\n')
    .filter((line, index, lines) => line.trim() || index === 0 || index === lines.length - 1)
    .map((line) => wordParagraph(line, options))
    .join('')
}

function tableCell(content: string, options: { width?: number; shade?: string; color?: string; align?: 'left' | 'center' | 'right'; bold?: boolean; colspan?: number } = {}) {
  const gridSpan = options.colspan ? `<w:gridSpan w:val="${options.colspan}"/>` : ''
  const shade = options.shade ? `<w:shd w:fill="${options.shade}"/>` : ''
  const width = options.width ? `<w:tcW w:w="${options.width}" w:type="pct"/>` : ''
  const paragraph = content.startsWith('<w:p') ? content : wordParagraph(content, { align: options.align, bold: options.bold, color: options.color, spacingAfter: 0 })
  return `<w:tc><w:tcPr>${width}${gridSpan}${shade}<w:vAlign w:val="top"/></w:tcPr>${paragraph}</w:tc>`
}

function tableRow(cells: string[]) {
  return `<w:tr>${cells.join('')}</w:tr>`
}

function wordTable(rows: string[]) {
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="6"/><w:left w:val="single" w:sz="6"/><w:bottom w:val="single" w:sz="6"/><w:right w:val="single" w:sz="6"/><w:insideH w:val="single" w:sz="6"/><w:insideV w:val="single" w:sz="6"/></w:tblBorders></w:tblPr>${rows.join('')}</w:tbl>`
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

function formatCurrency(value: number) {
  return `৳ ${formatAmount(value)}`
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function pageHtml(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    body{font-family:Arial,sans-serif;font-size:10pt;color:#111} h1{font-size:18pt} h2{font-size:13pt;margin-top:20px}
    table{border-collapse:collapse;width:100%;margin:8px 0 14px} th{background:#0070c0;color:#fff} th,td{border:1px solid #0070c0;padding:6px;vertical-align:top}
    .right{text-align:right}.center{text-align:center}.muted{color:#444}.total{font-weight:bold;background:#e8f1ff}.section{background:#0070c0;color:white;text-align:center;padding:8px;font-weight:bold;text-transform:uppercase}
  </style></head><body>${body}</body></html>`
}

function buildShortQuotationHtml(content: ShortQuotationContent) {
  const summary = buildShortQuotationSummary(content)
  const floors = summary.floors.map((floor) => `
    <h2>${escapeHtml(floor.floor.name || 'Floor')}</h2>
    ${floor.rooms.map((room) => `
      <h3>${escapeHtml(room.room.name || 'Room')}</h3>
      <table><thead><tr><th>SL</th><th>Name</th><th>Qty SFT</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>
        ${room.lines.map((line, lineIndex) => `<tr><td class="center">${lineIndex + 1}</td><td>${escapeHtml(line.name)}</td><td class="center">${line.quantitySqft != null ? formatAmount(line.quantitySqft) : '-'}</td><td class="center">${line.unitPrice != null ? formatAmount(line.unitPrice) : '-'}</td><td class="right">${formatCurrency(line.total)}</td></tr>`).join('')}
      </tbody></table>`).join('')}`).join('')
  const notes = content.footerNotes.length ? `<h2>Notes</h2><ol>${content.footerNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ol>` : ''
  return pageHtml('Short Quotation', `<h1>Short Quotation</h1><table><tr><td><b>Client Name</b><br>${escapeHtml(content.clientName)}<br><b>Address</b><br>${escapeHtml(content.clientAddress)}</td><td><b>Quotation Date</b><br>${escapeHtml(content.quotationDate)}<br><b>Package Tier</b><br>${escapeHtml(content.packageTier)}</td></tr></table><p><b>Subject:</b> ${escapeHtml(content.subject)}</p><p><b>Dear Sir,</b><br>${escapeHtml(content.introLetter)}</p>${floors}<table><tr class="total"><td>Grand Total</td><td class="right">${formatCurrency(summary.grandTotal)}</td></tr></table>${notes}`)
}

function buildDetailQuotationHtml(input: DetailInput) {
  const { clientName, clientAddress, content, totals } = input
  const floorSummaries = buildDetailFloorSummaries(content)
  const summaryRows = floorSummaries.map((entry, index) => `<tr><td class="center">${String(index + 1).padStart(2, '0')}</td><td>${escapeHtml(entry.floor.name)}</td><td class="right">${formatDetailAmount(entry.total)}</td></tr>`).join('')
  const detailTables = floorSummaries.map((entry) => `<h2 class="section">${escapeHtml(entry.floor.name)}</h2><table><thead><tr><th>SL</th><th>Name</th><th>Materials</th><th>Qty SFT</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${entry.lines.map((line, lineIndex) => {
    const isPkg = isPackageLine(line)
    return `<tr><td class="center">${String(lineIndex + 1).padStart(2, '0')}</td><td><b>${escapeHtml(line.description)}</b></td><td>${escapeHtml(line.materials || '—')}</td>${isPkg ? '<td class="center" colspan="2">Package As Per Design</td>' : `<td class="center">${line.quantity != null ? escapeHtml(line.quantity) : '—'}</td><td class="center">${line.rate != null ? formatDetailAmount(line.rate) : '—'}</td>`}<td class="right"><b>${formatDetailAmount(line.amount)}${line.description.toLowerCase().includes('electric wiring') ? ' (Approx)' : ''}</b></td></tr>`
  }).join('')}<tr class="total"><td colspan="5">TOTAL</td><td class="right">${formatDetailAmount(entry.total)}</td></tr></tbody></table><p><b><u>In Words:</u></b> <b>${escapeHtml(amountInWordsTaka(entry.total))}</b></p>`).join('')
  return pageHtml('Detail Quotation', `<h1>Detail Quotation</h1><table><tr><td><b>Quotation for:</b><br>${escapeHtml(clientName)}<br><b>Address:</b><br>${escapeHtml(clientAddress || '—')}</td><td><b>Date:</b><br>${escapeHtml(content.quotationDate ?? '')}</td></tr></table><p><b>Subject:</b> ${escapeHtml(content.summarySubject ?? content.subject ?? '')}</p><p><b>Dear Sir,</b><br>${escapeHtml((content.introLetter ?? '').replace('Dear Sir,\n', '').replace('Dear Sir,', ''))}</p><h2 class="section">Quotation Summary</h2><table><thead><tr><th>SL</th><th>Name</th><th>Total</th></tr></thead><tbody>${summaryRows}<tr class="total"><td colspan="2">GRAND TOTAL</td><td class="right">${formatDetailAmount(totals.grandTotal)}</td></tr></tbody></table><p><b><u>In Words:</u></b> <b>${escapeHtml(amountInWordsTaka(totals.grandTotal))}</b></p>${detailTables}<h2>Notes</h2><p>${escapeHtml(content.notes)}</p><h2>Terms & Condition</h2><p>${escapeHtml(content.terms)}</p><h2>Mode of Payment</h2><p>${escapeHtml(content.paymentTerms ?? '')}</p><h2>Duration Of Work</h2><p>${escapeHtml(content.durationNotes ?? '')}</p><p><b style="color:red">${escapeHtml(content.drawingDesign ?? '')}</b></p><br><table><tr><td>Customer Name & Sign</td><td><b>${escapeHtml(content.signatoryName ?? '')}</b><br>${escapeHtml(content.signatoryTitle ?? '')}</td></tr></table>`)
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let c = index
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(data: Uint8Array) {
  let c = 0xffffffff
  for (const byte of data) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function u16(value: number) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, value, true); return b }
function u32(value: number) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, value, true); return b }
function concat(parts: Uint8Array[]) { const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0; parts.forEach((part) => { out.set(part, offset); offset += part.length }); return out }

function zip(files: Array<{ name: string; data: Uint8Array }>) {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0
  files.forEach((file) => {
    const name = encoder.encode(file.name)
    const crc = crc32(file.data)
    const local = concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name, file.data])
    localParts.push(local)
    centralParts.push(concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]))
    offset += local.length
  })
  const central = concat(centralParts)
  return concat([...localParts, central, concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(central.length), u32(offset), u16(0)])])
}

function buildDocxBlob(html: string) {
  const files = [
    { name: '[Content_Types].xml', data: encoder.encode('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="htm" ContentType="text/html"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>') },
    { name: '_rels/.rels', data: encoder.encode('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>') },
    { name: 'word/_rels/document.xml.rels', data: encoder.encode('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="afchunk.htm"/></Relationships>') },
    { name: 'word/document.xml', data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:altChunk r:id="htmlChunk"/><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>') },
    { name: 'word/afchunk.htm', data: encoder.encode(html) },
  ]
  return new Blob([zip(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}


function buildDocxFromDocumentXml(bodyXml: string) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`
  const files = [
    { name: '[Content_Types].xml', data: encoder.encode('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>') },
    { name: '_rels/.rels', data: encoder.encode('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>') },
    { name: 'word/document.xml', data: encoder.encode(documentXml) },
  ]
  return new Blob([zip(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

function buildDetailQuotationDocxBlob(input: DetailInput) {
  const { clientName, clientAddress, content, totals } = input
  const normalized = content
  const floorSummaries = buildDetailFloorSummaries(normalized)
  const summaryRows = [
    tableRow([
      tableCell('SL', { shade: '0070C0', color: 'FFFFFF', align: 'center', bold: true }),
      tableCell('NAME', { shade: '0070C0', color: 'FFFFFF', bold: true }),
      tableCell('TOTAL', { shade: '0070C0', color: 'FFFFFF', align: 'center', bold: true }),
    ]),
    ...floorSummaries.map((entry, index) => tableRow([
      tableCell(String(index + 1).padStart(2, '0'), { align: 'center' }),
      tableCell(entry.floor.name),
      tableCell(formatDetailAmount(entry.total), { align: 'right' }),
    ])),
    tableRow([
      tableCell('GRAND TOTAL', { colspan: 2, shade: '0070C0', color: 'FFFFFF', align: 'center', bold: true }),
      tableCell(formatDetailAmount(totals.grandTotal), { shade: '0070C0', color: 'FFFFFF', align: 'right', bold: true }),
    ]),
  ]

  const detailTables = floorSummaries.map((entry) => {
    const rows = [
      tableRow([tableCell(entry.floor.name, { colspan: 6, shade: '76933C', color: 'FFFFFF', align: 'center', bold: true })]),
      tableRow(['SL', 'NAME', 'MATERIALS', 'QTY SFT', 'UNIT PRICE', 'TOTAL'].map((heading) => tableCell(heading, { shade: '0070C0', color: 'FFFFFF', align: 'center', bold: true }))),
      ...entry.lines.map((line, lineIndex) => {
        const isPkg = isPackageLine(line)
        return tableRow([
          tableCell(String(lineIndex + 1).padStart(2, '0'), { align: 'center', bold: true }),
          tableCell(line.description, { bold: true }),
          tableCell(wordMultilineParagraph(line.materials || '—')),
          tableCell(isPkg ? 'Package' : (line.quantity != null ? String(line.quantity) : '—'), { align: 'center' }),
          tableCell(isPkg ? 'As Per Design' : (line.rate != null ? formatDetailAmount(line.rate) : '—'), { align: 'center' }),
          tableCell(`${formatDetailAmount(line.amount)}${line.description.toLowerCase().includes('electric wiring') ? ' (Approx)' : ''}`, { align: 'right', bold: true }),
        ])
      }),
      tableRow([
        tableCell('TOTAL', { colspan: 5, shade: '0070C0', color: 'FFFFFF', align: 'center', bold: true }),
        tableCell(formatDetailAmount(entry.total), { shade: '0070C0', color: 'FFFFFF', align: 'right', bold: true }),
      ]),
    ]
    return [wordParagraph(entry.floor.name, { heading: true, align: 'center' }), wordTable(rows), wordParagraph(`In Words: ${amountInWordsTaka(entry.total)}`, { bold: true })].join('')
  }).join('')

  const header = [
    wordParagraph('Aesthetic Interior - Detail Quotation', { heading: true, align: 'center', color: '0F5B53' }),
    wordParagraph(`Quotation for: ${clientName}`, { bold: true }),
    wordParagraph(`Address: ${clientAddress || '—'}`),
    wordParagraph(`Date: ${content.quotationDate ?? ''}`),
    wordParagraph(`Subject: ${content.summarySubject ?? content.subject ?? ''}`, { bold: true }),
    wordParagraph('Dear Sir,', { bold: true }),
    wordMultilineParagraph((content.introLetter ?? '').replace('Dear Sir,\n', '').replace('Dear Sir,', '')),
  ].join('')

  const footer = [
    wordParagraph('Notes:', { bold: true }), wordMultilineParagraph(content.notes ?? ''),
    wordParagraph('Terms & Condition:', { bold: true }), wordMultilineParagraph(content.terms ?? ''),
    wordParagraph('Mode of Payment:', { bold: true }), wordMultilineParagraph(content.paymentTerms ?? ''),
    wordParagraph('Duration Of Work:', { bold: true }), wordMultilineParagraph(content.durationNotes ?? ''),
    content.drawingDesign ? wordMultilineParagraph(content.drawingDesign, { bold: true, color: 'FF0000' }) : '',
    wordParagraph(`Customer Name & Sign                       ${content.signatoryName ?? ''} ${content.signatoryTitle ?? ''}`, { bold: true }),
  ].join('')

  return buildDocxFromDocumentXml(`${header}${wordParagraph('Quotation Summary', { heading: true, align: 'center' })}${wordTable(summaryRows)}${wordParagraph(`In Words: ${amountInWordsTaka(totals.grandTotal)}`, { bold: true })}${detailTables}${footer}`)
}

function downloadWord(html: string, fileName: string, format: WordFormat) {
  if (format === 'doc') {
    saveBlob(new Blob([html], { type: 'application/msword;charset=utf-8' }), fileName)
    return
  }
  saveBlob(buildDocxBlob(html), fileName)
}

export function downloadShortQuotationWord(content: ShortQuotationContent, fileName: string, format: WordFormat) {
  downloadWord(buildShortQuotationHtml(content), fileName, format)
}

export function downloadDetailQuotationWord(input: DetailInput, fileName: string, format: WordFormat) {
  if (format === 'docx') {
    saveBlob(buildDetailQuotationDocxBlob(input), fileName)
    return
  }
  downloadWord(buildDetailQuotationHtml(input), fileName, format)
}
