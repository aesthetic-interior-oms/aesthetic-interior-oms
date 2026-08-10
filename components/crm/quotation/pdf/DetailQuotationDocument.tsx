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
    fontSize: 9,
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
    letterSpacing: 0.7,
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
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
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
    borderRightWidth: 0,
    borderRightColor: '#d7d7d7',
  },
  thColLast: {
    borderRightWidth: 0,
  },
  tRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0.5,
    borderColor: '#d7d7d7',
  },
  tRowAlt: {
    backgroundColor: '#fffdfa',
  },
  tdCol: {
    fontSize: 10,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 4,
    borderRightWidth: 0,
    borderRightColor: '#d7d7d7',
  },
  packageBadge: {
    alignSelf: 'center',
    borderRadius: 10,
    backgroundColor: '#fff8e6',
    color: GOLD,
    borderWidth: 0.5,
    borderColor: '#e2c46b',
    fontSize: 7,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 5,
    textTransform: 'uppercase',
  },
  tdColLast: {
    borderRightWidth: 0,
  },

  // Columns Detail
  wSl: { width: '6%', textAlign: 'center' },
  wName: { width: '16%' },
  wMats: { width: '46%' },
  wQty: { width: '10%', textAlign: 'center' },
  wPrice: { width: '10%', textAlign: 'right' },
  wTotal: { width: '12%', textAlign: 'right' },

  // Columns Summary
  wSumName: { width: '70%', paddingLeft: 10 },
  wSumTotal: { width: '22%', textAlign: 'right' },

  // Totals
  grandTotalRow: {
    flexDirection: 'row',
    paddingTop: 8,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: PRIMARY,
  },
  grandTotalLabel: {
    width: '88%',
    textAlign: 'right',
    paddingRight: 10,
    fontWeight: 'bold',
    fontSize: 10,
    color: PRIMARY,
  },
  grandTotalValue: {
    width: '12%',
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: 10,
    color: PRIMARY,
  },
  inWords: {
    fontSize: 11,
    color: '#000000',
    marginTop: 4,
    textAlign: 'left',
    fontFamily: 'Times-Roman',
    fontStyle: 'italic',
  },
  datePanel: { minWidth: 112, alignItems: 'flex-end' },
  metaLabel: { fontSize: 5.5, color: GOLD, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 7, color: PRIMARY, fontWeight: 'bold', textAlign: 'right' },
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
  matText: {
    fontSize: 9,
    color: '#444444',
    lineHeight: 1.2,
    marginBottom: 0,
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
    fontSize: 9,
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
    const timestamp = Date.parse(dateString)
    if (isNaN(timestamp)) return dateString
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
    <Text style={[styles.bold, { fontSize: 13, color: PRIMARY, marginBottom: 2 }]}>{clientName}</Text>
    <Text style={{ fontSize: 10, color: '#555555' }}>{clientAddress}</Text>
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

function getDetailTotalSqft(floorSummaries: ReturnType<typeof buildDetailFloorSummaries>) {
  return Math.round(
    floorSummaries.reduce((sum, entry) => sum + getDetailFloorSqft(entry), 0),
  )
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

        {cleanIntro ? (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.metaText, styles.bold]}>Dear Sir,</Text>
            <Text style={[styles.metaText, { textAlign: 'justify', lineHeight: 1.5 }]}>{cleanIntro}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Project Summary</Text>

        <View style={styles.tableWrapper}>
          <View style={styles.tHead} fixed>
            <Text style={[styles.thCol, styles.wSl]}>SL</Text>
            <Text style={[styles.thCol, styles.wSumName]}>Description</Text>
            <Text style={[styles.thCol, styles.wSumTotal, styles.thColLast]}>Amount ({BDT_SYMBOL})</Text>
          </View>
          {floorSummaries.map((entry, index) => (
            <View key={entry.floor.id} style={[styles.tRow, index % 2 === 1 ? styles.tRowAlt : {}]}>
              <Text style={[styles.tdCol, styles.wSl, styles.bold]}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={[styles.tdCol, styles.wSumName]}>{softWrapPdfText(entry.floor.name)}</Text>
              <Text style={[styles.tdCol, styles.wSumTotal, styles.tdColLast, styles.bold]}>{formatDetailTableAmount(entry.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Grand Total ({formatDetailAmount(totalSqft)} SQFT)</Text>
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
            {entry.lines.map((line, lineIndex) => {
              const isPkg = isPackageLine(line)
              const matLines = line.materials
                ? line.materials.split('\n').map(l => l.trim()).filter(Boolean)
                : []
              const displayMatLines = matLines.length > 0 ? matLines : ['']
              const rowCellStyle = { paddingTop: 2, paddingBottom: 2 }

              return displayMatLines.map((matText, matIndex) => {
                const isFirstMaterialRow = matIndex === 0
                const isLastMaterialRow = matIndex === displayMatLines.length - 1

                const quantityCell = isFirstMaterialRow && isPkg ? (
                  <View style={[styles.tdCol, styles.wQty, rowCellStyle]}>
                    <Text style={styles.packageBadge}>Package</Text>
                  </View>
                ) : (
                  <Text style={[styles.tdCol, styles.wQty, rowCellStyle]}>
                    {isFirstMaterialRow ? formatDetailQtyCell(line) : ''}
                  </Text>
                )
                const priceCell = (
                  <Text style={[styles.tdCol, styles.wPrice, rowCellStyle]}>
                    {isFirstMaterialRow ? (isPkg ? 'Per Design' : formatDetailUnitPriceCurrency(line)) : ''}
                  </Text>
                )

                return (
                  <View key={`${line.id}-${matIndex}`} style={[
                    styles.tRow,
                    lineIndex % 2 === 1 ? styles.tRowAlt : {},
                    !isLastMaterialRow ? { borderBottomWidth: 0 } : {},
                  ]}>
                    <Text style={[styles.tdCol, styles.wSl, styles.bold, rowCellStyle]}>
                      {isFirstMaterialRow ? String(lineIndex + 1).padStart(2, '0') : ''}
                    </Text>
                    <Text style={[styles.tdCol, styles.wName, rowCellStyle]}>
                      {isFirstMaterialRow ? softWrapPdfText(line.description) : ''}
                    </Text>
                    <View style={[styles.tdCol, styles.wMats, rowCellStyle]}>
                      <SingleMaterialLine text={matText} />
                    </View>
                    {quantityCell}
                    {priceCell}
                    <Text style={[styles.tdCol, styles.wTotal, styles.bold, { color: PRIMARY }, rowCellStyle]}>
                      {isFirstMaterialRow ? formatDetailTotalCurrency(line) : ''}
                      {isFirstMaterialRow && line.description?.toLowerCase().includes('electric wiring') ? '\n(Approx)' : ''}
                    </Text>
                  </View>
                )
              })
            })}
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
