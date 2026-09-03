'use client'

// Detail Quotation Document component for PDF generation with Noto Sans Bengali font support
import { Document, Page, StyleSheet, Text, View, Image, Font } from '@react-pdf/renderer'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://www.aestheticinteriorbd.com'
}

Font.register({
  family: 'Noto Sans Bengali',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSansBengali-Regular.ttf` },
    { src: `${getBaseUrl()}/fonts/NotoSansBengali-Bold.ttf`, fontWeight: 'bold' }
  ]
});

Font.register({
  family: 'Playfair Display',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/playfairdisplay/v10/9MkijrV-dEJ0-_NWV7E6N218GKU_F_kIyfK-gGC-Yzs.ttf',
      fontStyle: 'italic',
    },
  ],
});

import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'
import {
  buildDetailFloorSummaries,
  formatDetailAmount,
  formatDetailQtyCell,
  formatDetailTotalCell,
  formatDetailUnitPriceCell,
  isPackageLine,
  isRateOnlyLine,
} from '@/lib/detail-quotation-format'
import { amountInWordsTaka } from '@/lib/number-to-words'

const PRIMARY = '#1f363d';
const GOLD = '#a57c00';
const PAGE_SIDE_PADDING = 7;
const BDT_SYMBOL = '৳';
const DETAIL_ROW_LINE_HEIGHT = 1.15;
const DETAIL_ROW_VERTICAL_PADDING = 3;

const styles = StyleSheet.create({
  page: {
    paddingTop: 78,
    paddingBottom: 104,
    paddingLeft: PAGE_SIDE_PADDING,
    paddingRight: PAGE_SIDE_PADDING,
    fontFamily: 'Noto Sans Bengali',
    fontSize: 9,
    color: '#000000',
    backgroundColor: '#ffffff',
    lineHeight: 1.4,
  },
  detailPage: {
    paddingTop: 90,
    paddingBottom: 104,
    paddingLeft: PAGE_SIDE_PADDING,
    paddingRight: PAGE_SIDE_PADDING,
    fontFamily: 'Noto Sans Bengali',
    fontSize: 9,
    color: '#000000',
    backgroundColor: '#ffffff',
    lineHeight: 1.4,
  },
  header: {
    position: 'absolute',
    top: 20,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    height: 58,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  logo: {
    width: 150,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PRIMARY,
    letterSpacing: 1,
  },
  metaBox: {
    backgroundColor: '#f5f9f8',
    padding: 6,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    marginTop: 8,
    minWidth: 160,
  },
  metaRowFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaBoxLabel: {
    fontSize: 7,
    color: '#555555',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  metaBoxValue: {
    fontSize: 7.5,
    color: '#000000',
    fontWeight: 'bold',
    textAlign: 'right',
    maxWidth: 130,
  },
  metaText: {
    fontSize: 10,
    color: '#555555',
    marginBottom: 3,
  },
  bold: {
    fontWeight: 'bold',
    color: '#000000',
  },

  // Table
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PRIMARY,
    letterSpacing: 2,
    backgroundColor: '#f3f8f7',
    padding: 8,
    marginTop: 15,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  detailFixedHeader: {
    position: 'absolute',
    top: 78,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    backgroundColor: '#ffffff',
  },
  tableWrapper: {
    width: '100%',
  },
  tHead: {
    flexDirection: 'row',
    borderTopWidth: 0.75,
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: '#d7d7d7',
  },
  thCol: {
    fontSize: 10,
    fontWeight: 'bold',
    color: PRIMARY,
    textTransform: 'uppercase',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#d7d7d7',
  },
  thColLast: {
    borderRightWidth: 0,
  },
  summaryThCol: {
    borderRightWidth: 0,
  },
  tRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.5,
    borderColor: '#d7d7d7',
  },
  tRowAlt: {
    backgroundColor: '#fffdfa',
  },
  tdCol: {
    fontSize: 10,
    lineHeight: DETAIL_ROW_LINE_HEIGHT,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#d7d7d7',
  },
  tdColLast: {
    borderRightWidth: 0,
  },

  // Columns Detail
  wSl: { width: '6%', textAlign: 'center' },
  wName: { width: '16%' },
  wMats: { width: '44%' },
  wQty: { width: '10%', textAlign: 'center' },
  wPrice: { width: '12%', textAlign: 'right' },
  wTotal: { width: '12%', textAlign: 'right' },

  // Columns Summary
  wSumName: { width: '72%', paddingLeft: 10 },
  wSumTotal: { width: '22%', textAlign: 'right' },
  summaryFloorRow: { backgroundColor: '#f3f8f7' },
  summaryAreaName: { paddingLeft: 18, color: '#555555' },
  summaryTdCol: { borderRightWidth: 0 },
  areaTotalRow: { backgroundColor: '#fff8e6' },
  areaTotalLabel: { textAlign: 'right', color: PRIMARY },

  // Totals
  grandTotalRow: {
    flexDirection: 'row',
    paddingTop: 8,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: PRIMARY,
  },
  grandTotalLabel: {
    width: '78%',
    textAlign: 'right',
    paddingRight: 10,
    fontWeight: 'bold',
    fontSize: 10,
    color: PRIMARY,
  },
  grandTotalValue: {
    width: '22%',
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: 10,
    color: PRIMARY,
  },
  inWords: {
    fontSize: 10,
    color: '#000000',
    marginTop: 4,
    textAlign: 'left',
    fontFamily: 'Noto Sans Bengali',
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  datePanel: { minWidth: 130, alignItems: 'flex-end' },
  metaLabel: { fontSize: 6, color: GOLD, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 9.5, color: PRIMARY, fontWeight: 'bold', textAlign: 'right' },
  headerPattern: { position: 'absolute', top: 0, left: 0, right: 0, height: 58, opacity: 0.08 },
  headerRuleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerRule: { height: 2.2, backgroundColor: PRIMARY },
  headerTitle: { color: PRIMARY, fontSize: 10, fontFamily: 'Times-Roman', fontStyle: 'italic', letterSpacing: 2, marginHorizontal: 12, textTransform: 'uppercase' },

  // Footer
  footerFixed: {
    position: 'absolute',
    bottom: 14,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    paddingTop: 7,
    backgroundColor: '#ffffff',
  },
  footerText: {
    fontSize: 7,
    color: '#666666',
    marginLeft: 4,
  },
  footerMeta: {
    fontSize: 6.5,
    color: '#888888',
    marginTop: 3,
  },

  // Materials
  areaTitleRow: { backgroundColor: '#f3f8f7', borderLeftWidth: 0.75, borderRightWidth: 0.75, borderBottomWidth: 0.5, borderColor: '#d7d7d7', paddingVertical: 5, paddingHorizontal: 8 },
  areaTitleText: { fontSize: 10, fontWeight: 'bold', color: PRIMARY, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2 },

  matText: {
    fontSize: 9,
    color: '#444444',
    lineHeight: DETAIL_ROW_LINE_HEIGHT,
    marginBottom: 0,
  },
  matCell: {
    lineHeight: DETAIL_ROW_LINE_HEIGHT,
  },

  // Terms
  termTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 3,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  termContent: {
    fontSize: 10,
    color: '#555555',
    lineHeight: 1.5,
  },
  sigLine: {
    width: 150,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 5,
  }
});

const formatDateString = (dateString: string) => {
  if (!dateString) return 'N/A'
  try {
    // If date string is formatted like DD-MM-YYYY (e.g. 17-08-2026)
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString.trim())) {
      const [d, m, y] = dateString.trim().split('-').map(Number)
      const dateObj = new Date(y, m - 1, d)
      if (!isNaN(dateObj.getTime())) {
        return new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(dateObj)
      }
    }
    const timestamp = Date.parse(dateString)
    if (isNaN(timestamp)) return dateString
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(timestamp))
  } catch {
    return dateString
  }
}

const WatermarkBackground = () => (
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: -1, opacity: 0.05 }} fixed>
    <Image src={`${getBaseUrl()}/android-chrome-512x512.png`} style={{ width: 400, height: 400 }} />
  </View>
);


const GlobalHeader = ({ date, subject, clientName, clientAddress }: any) => {
  const formattedDate = formatDateString(date);

  return (
    <View style={styles.header} fixed>
      <Image src={`${getBaseUrl()}/backgrounddata.svg`} style={styles.headerPattern} />
      <View style={{ paddingTop: 3 }}>
        <View style={styles.headerRuleRow}>
          <View style={[styles.headerRule, { flexGrow: 1.65 }]} />
          <Text style={styles.headerTitle}>Quotation</Text>
          <View style={[styles.headerRule, { flexGrow: 0.85 }]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Image src={`${getBaseUrl()}/Logo/HeaderLogo.png`} style={{ width: 154 }} />
          </View>
          <View style={styles.datePanel}>
            <Text style={[styles.metaLabel, { textAlign: 'right' }]}>Quotation Date</Text>
            <Text style={styles.metaValue}>{formattedDate}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const ClientInfoBlock = ({ clientName, clientAddress }: { clientName: string, clientAddress: string | null }) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={{ fontSize: 7, color: '#a57c00', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Prepared For</Text>
    <Text style={[styles.bold, { fontSize: 12, color: PRIMARY, marginBottom: 4, lineHeight: 1.25 }]}>{clientName}</Text>
    <Text style={{ fontSize: 10, color: '#555555', lineHeight: 1.4 }}>{clientAddress}</Text>
  </View>
);

function formatDownloadDateTime(value: string | null | undefined) {
  if (!value) return 'Not generated yet'
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


function getDetailFloorSqft(entry: ReturnType<typeof buildDetailFloorSummaries>[number]) {
  return Math.round(
    entry.lines.reduce((lineSum, line) => {
      if (line.unit !== 'sqft' || isPackageLine(line) || line.quantity <= 0) return lineSum
      return lineSum + line.quantity
    }, 0),
  )
}

function getDetailAreaSqft(lines: QuotationDraftContent['lineItems']) {
  return Math.round(
    lines.reduce((lineSum, line) => {
      if (line.unit !== 'sqft' || isPackageLine(line) || line.quantity <= 0) return lineSum
      return lineSum + line.quantity
    }, 0),
  )
}

function getDetailAreaTotal(lines: QuotationDraftContent['lineItems']) {
  return lines.reduce((lineSum, line) => lineSum + line.amount, 0)
}

function getDetailTotalSqft(floorSummaries: ReturnType<typeof buildDetailFloorSummaries>) {
  return floorSummaries.reduce((sum, entry) => sum + getDetailFloorSqft(entry), 0)
}

const formatDetailCurrency = (value: number) => `${BDT_SYMBOL} ${formatDetailAmount(value)}`
const formatDetailTableAmount = (value: number) => formatDetailAmount(value)

function formatDetailUnitPriceCurrency(line: QuotationDraftContent['lineItems'][number]) {
  if (isRateOnlyLine(line)) return `---- ${formatDetailTableAmount(line.rate)} ----`
  if (line.rate <= 0) return formatDetailUnitPriceCell(line)
  return formatDetailTableAmount(line.rate)
}

function formatDetailTotalCurrency(line: QuotationDraftContent['lineItems'][number]) {
  if (isRateOnlyLine(line)) return formatDetailTotalCell(line)
  return formatDetailTableAmount(line.amount)
}

const FooterFixed = ({ content }: { content: QuotationDraftContent }) => (
  <View style={styles.footerFixed} fixed>
    <View style={{ borderTopWidth: 1, borderTopColor: '#a57c00', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ width: '35%' }}>
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold', marginBottom: 3, fontSize: 9 }]}>Aesthetic Interior Studio</Text>
        <Text style={styles.footerText}>183, East Senpara, Begum Rokeya Soroni</Text>
        <Text style={styles.footerText}>3rd floor, Mirpur 10, Dhaka-1216</Text>
      </View>
      <View style={{ width: '30%', alignItems: 'center' }}>
        <Text style={styles.footerText}>+88 0132969 4663</Text>
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold' }]}>www.aestheticinteriorbd.com</Text>
      </View>
      <View style={{ width: '35%', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        <Text style={styles.footerText}>© 2026 All rights reserved.</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
      <Text style={[styles.footerMeta, { marginTop: 0, textAlign: 'left' }]}>Quotation Code: {content.quotationCode ?? 'Not generated yet'}</Text>
      <Text style={[styles.footerMeta, { marginTop: 0, textAlign: 'right' }]}>Generated: {formatDownloadDateTime(content.downloadedAt)}</Text>
    </View>
  </View>
);


function softWrapPdfText(value: string | null | undefined, chunkSize = 24) {
  if (!value) return ''
  return value
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part.length <= chunkSize) return part
      const chunks = part.match(new RegExp(`.{1,${chunkSize}}`, 'g')) ?? [part]
      return chunks.join('\u200B')
    })
    .join('')
}

function splitPdfTableLines(value: string | null | undefined, lineLength: number) {
  const text = (value ?? '').trim()
  if (!text) return ['']

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const words = line.split(/\s+/)
      const output: string[] = []
      let current = ''

      words.forEach((word) => {
        const wordParts = word.match(new RegExp(`.{1,${lineLength}}`, 'g')) ?? [word]

        wordParts.forEach((part) => {
          if (!current) {
            current = part
            return
          }

          if (`${current} ${part}`.length > lineLength) {
            output.push(current)
            current = part
            return
          }

          current = `${current} ${part}`
        })
      })

      if (current) output.push(current)
      return output.length > 0 ? output : ['']
    })
}

function SingleMaterialLine({ text }: { text: string }) {
  if (!text) return <Text wrap={false} style={styles.matText}>—</Text>
  const match = text.match(/^(\d{2}\.[^:]+:|[^:*]+:|\*[^:]+:)/)
  const isWithoutWiring = text.toLowerCase().includes('without supplying wiring') || text.toLowerCase().includes('without suppling wiring');
  if (!match) {
    return <Text wrap={false} style={styles.matText}>
      <Text style={isWithoutWiring ? styles.bold : {}}>{softWrapPdfText(text)}</Text>
    </Text>
  }
  const prefix = match[1]
  const rest = text.substring(prefix.length)
  return (
    <Text wrap={false} style={styles.matText}>
      <Text style={styles.bold}>{softWrapPdfText(prefix)}</Text>
      <Text style={isWithoutWiring ? styles.bold : {}}>{softWrapPdfText(rest)}</Text>
    </Text>
  )
}

export function DetailQuotationDocument({
  clientName,
  clientAddress,
  content,
  totals,
}: {
  clientName: string
  clientAddress: string | null
  content: QuotationDraftContent
  totals: QuotationTotals
}) {
  const floorSummaries = buildDetailFloorSummaries(content)
  const cleanIntro = (content.introLetter || '').replace('Dear Sir,\n', '').replace('Dear Sir,', '').trim();
  const totalSqft = getDetailTotalSqft(floorSummaries)
  const getAreaGroups = (entry: ReturnType<typeof buildDetailFloorSummaries>[number]) => {
    const floorAreas = [...(content.areas ?? [])]
      .filter((area) => area.floorId === entry.floor.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const unassignedLines = entry.lines.filter((line) => !line.areaId)
    if (floorAreas.length === 0) return [{ id: `general-${entry.floor.id}`, name: 'General Area', lines: entry.lines }]

    return [
      { id: `general-${entry.floor.id}`, name: 'General Area', lines: unassignedLines },
      ...floorAreas.map((area) => ({
        id: area.id,
        name: area.name || 'Area',
        lines: entry.lines.filter((line) => line.areaId === area.id),
      })),
    ].filter((area) => area.lines.length > 0)
  }

  return (
    <Document>
      {/* SUMMARY PAGE */}
      <Page size="A4" style={styles.page}>
        <WatermarkBackground />
        <GlobalHeader
          date={content.quotationDate ?? ''}
          subject={content.subject ?? ''}
          clientName={clientName}
          clientAddress={clientAddress || ''}
        />

        <ClientInfoBlock clientName={clientName} clientAddress={clientAddress} />

        {content.summarySubject ? <Text style={{ fontSize: 10, marginBottom: 12 }}><Text style={styles.bold}>Subject: </Text>{content.summarySubject}</Text> : null}

        {cleanIntro ? (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.metaText, styles.bold]}>Dear Sir,</Text>
            <Text style={[styles.metaText, { textAlign: 'justify', lineHeight: 1.5 }]}>{cleanIntro}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Project Summary</Text>

        <View style={styles.tableWrapper}>
          <View style={[styles.tHead, { marginBottom: 3 }]} fixed>
            <Text style={[styles.thCol, styles.summaryThCol, styles.wSl]}>SL</Text>
            <Text style={[styles.thCol, styles.summaryThCol, styles.wSumName]}>Description</Text>
            <Text style={[styles.thCol, styles.summaryThCol, styles.wSumTotal, styles.thColLast]}>Amount ({BDT_SYMBOL})</Text>
          </View>
          {floorSummaries.map((entry, index) => (
            <View key={entry.floor.id}>
              <View style={[styles.tRow, styles.summaryFloorRow]}>
                <Text style={[styles.tdCol, styles.summaryTdCol, styles.wSl, styles.bold]}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={[styles.tdCol, styles.summaryTdCol, styles.wSumName, styles.bold]}>{softWrapPdfText(entry.floor.name)}</Text>
                <Text style={[styles.tdCol, styles.summaryTdCol, styles.wSumTotal, styles.tdColLast, styles.bold]}>{formatDetailTableAmount(entry.total)}</Text>
              </View>
              {getAreaGroups(entry).map((area) => (
                <View key={`${entry.floor.id}-${area.id}`} style={styles.tRow}>
                  <Text style={[styles.tdCol, styles.summaryTdCol, styles.wSl]} />
                  <Text style={[styles.tdCol, styles.summaryTdCol, styles.wSumName, styles.summaryAreaName]}>{softWrapPdfText(area.name)}</Text>
                  <Text style={[styles.tdCol, styles.summaryTdCol, styles.wSumTotal, styles.tdColLast]}>{formatDetailTableAmount(getDetailAreaTotal(area.lines))}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Grand Total</Text>
          <Text style={styles.grandTotalValue}>{formatDetailCurrency(totals.grandTotal)}</Text>
        </View>
        <Text style={styles.inWords}>In Words: {amountInWordsTaka(totals.grandTotal)}</Text>

        <FooterFixed content={content} />
      </Page>

      {/* DETAIL PAGES */}
      {floorSummaries.map((entry) => (
        <Page key={entry.floor.id} size="A4" style={styles.detailPage}>
          <WatermarkBackground />
          <GlobalHeader
            date={content.quotationDate ?? ''}
            subject={content.subject ?? ''}
            clientName={clientName}
            clientAddress={clientAddress || ''}
          />

          <Text style={styles.sectionTitle}>{softWrapPdfText(entry.floor.name)}</Text>


          <View style={styles.tableWrapper}>
            <View style={styles.tHead} fixed>
              <Text style={[styles.thCol, styles.wSl]}>SL</Text>
              <Text style={[styles.thCol, styles.wName]}>Name</Text>
              <Text style={[styles.thCol, styles.wMats]}>Materials</Text>
              <Text style={[styles.thCol, styles.wQty]}>Qty/Sft</Text>
              <Text style={[styles.thCol, styles.wPrice]}>U/P ({BDT_SYMBOL})</Text>
              <Text style={[styles.thCol, styles.wTotal, styles.thColLast]}>Total ({BDT_SYMBOL})</Text>
            </View>
            {getAreaGroups(entry).map((area) => (
              <View key={area.id}>
                <View style={styles.areaTitleRow} wrap={false}>
                  <Text style={styles.areaTitleText}>{softWrapPdfText(area.name)}</Text>
                </View>
                {area.lines.map((line, lineIndex) => {
              const isPkg = isPackageLine(line)
              const nameLines = splitPdfTableLines(line.description, 14)
              const materialLines = splitPdfTableLines(line.materials, 76)
              const tableLineCount = Math.max(nameLines.length, materialLines.length)
              const rowCellStyle = {
                paddingTop: DETAIL_ROW_VERTICAL_PADDING,
                paddingBottom: DETAIL_ROW_VERTICAL_PADDING,
              }

              return Array.from({ length: tableLineCount }, (_, rowIndex) => {
                const isFirstMaterialRow = rowIndex === 0
                const isLastSubRow = rowIndex === tableLineCount - 1
                const nameText = nameLines[rowIndex] ?? ''
                const matText = materialLines[rowIndex] ?? ''
                let quantityCell
                let priceText = ''

                if (isFirstMaterialRow && isPkg) {
                  quantityCell = <Text style={[styles.tdCol, styles.wQty, rowCellStyle]}>Package</Text>
                  priceText = line.unitPriceLabel?.trim() || 'as per project design'
                } else {
                  quantityCell = <Text style={[styles.tdCol, styles.wQty, rowCellStyle]}>{isFirstMaterialRow ? formatDetailQtyCell(line) : ''}</Text>
                  priceText = isFirstMaterialRow ? formatDetailUnitPriceCurrency(line) : ''
                }

                const priceCell = <Text style={[styles.tdCol, styles.wPrice, rowCellStyle]}>{priceText}</Text>

                return (
                  <View key={`${line.id}-${rowIndex}`} wrap={false} style={[styles.tRow, lineIndex % 2 === 1 ? styles.tRowAlt : {}, !isLastSubRow ? { borderBottomWidth: 0 } : {}]}>
                    <Text style={[styles.tdCol, styles.wSl, styles.bold, rowCellStyle]}>{isFirstMaterialRow ? String(lineIndex + 1).padStart(2, '0') : ''}</Text>
                    <Text wrap={false} style={[styles.tdCol, styles.wName, rowCellStyle]}>{nameText ? softWrapPdfText(nameText) : ''}</Text>
                    <View style={[styles.tdCol, styles.wMats, styles.matCell, rowCellStyle]}>{matText || isFirstMaterialRow ? <SingleMaterialLine text={matText} /> : <Text wrap={false} style={styles.matText}></Text>}</View>
                    {quantityCell}
                    {priceCell}
                    <Text style={[styles.tdCol, styles.wTotal, styles.tdColLast, styles.bold, { color: PRIMARY }, rowCellStyle]}>{isFirstMaterialRow ? formatDetailTotalCurrency(line) : ''}{isFirstMaterialRow && line.description?.toLowerCase().includes('electric wiring') ? '\n(Approx)' : ''}</Text>
                  </View>
                )
              })
            })}
                <View style={[styles.tRow, styles.areaTotalRow]} wrap={false}>
                  <Text style={[styles.tdCol, styles.wSl]} />
                  <Text style={[styles.tdCol, styles.wName]} />
                  <Text style={[styles.tdCol, styles.wMats, styles.bold, styles.areaTotalLabel]}>Total for {softWrapPdfText(area.name)}</Text>
                  <Text style={[styles.tdCol, styles.wQty, styles.bold]}>{formatDetailAmount(getDetailAreaSqft(area.lines))}</Text>
                  <Text style={[styles.tdCol, styles.wPrice]} />
                  <Text style={[styles.tdCol, styles.wTotal, styles.tdColLast, styles.bold, { color: PRIMARY }]}>{formatDetailCurrency(getDetailAreaTotal(area.lines))}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.grandTotalRow, { marginTop: 15 }]} wrap={false}>
            <Text style={styles.grandTotalLabel}>Total for {softWrapPdfText(entry.floor.name)} ({formatDetailAmount(getDetailFloorSqft(entry))} SQFT)</Text>
            <Text style={styles.grandTotalValue}>{formatDetailCurrency(entry.total)}</Text>
          </View>
          <Text style={styles.inWords}>In Words: {amountInWordsTaka(entry.total)}</Text>

          <FooterFixed content={content} />
        </Page>
      ))}

      {/* TERMS PAGE */}
      <Page size="A4" style={styles.page}>
        <WatermarkBackground />
        <GlobalHeader
          date={content.quotationDate ?? ''}
          subject={content.subject ?? ''}
          clientName={clientName}
          clientAddress={clientAddress || ''}
        />

        <Text style={styles.sectionTitle}>Terms &amp; Signatures</Text>

        <View style={{ marginTop: 10 }}>
          {content.notes ? (
            <View>
              <Text style={styles.termTitle}>Notes</Text>
              <Text style={styles.termContent}>{content.notes}</Text>
            </View>
          ) : null}

          {content.terms ? (
            <View>
              <Text style={styles.termTitle}>Terms &amp; Conditions</Text>
              <Text style={styles.termContent}>{content.terms}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: '48%' }}>
              {content.paymentTerms ? (
                <View>
                  <Text style={styles.termTitle}>Mode of Payment</Text>
                  <Text style={styles.termContent}>{content.paymentTerms}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ width: '48%' }}>
              {content.durationNotes ? (
                <View>
                  <Text style={styles.termTitle}>Duration of Work</Text>
                  <Text style={styles.termContent}>{content.durationNotes}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {content.drawingDesign ? (
            <Text style={[styles.termContent, { color: '#d32f2f', fontWeight: 'bold', marginTop: 10 }]}>
              {content.drawingDesign}
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 60 }}>
          <View>
            <View style={styles.sigLine} />
            <Text style={[styles.metaText, styles.bold, { marginTop: 4 }]}>Customer Approval</Text>
            <Text style={styles.metaText}>Sign &amp; Date</Text>
          </View>

          <View>
            <View style={styles.sigLine} />
            <Text style={[styles.metaText, styles.bold, { marginTop: 4 }]}>{content.signatoryName || 'Authorized Signature'}</Text>
            <Text style={styles.metaText}>{content.signatoryTitle || 'Aesthetic Interior'}</Text>
          </View>
        </View>

        <FooterFixed content={content} />
      </Page>
    </Document>
  )
}
