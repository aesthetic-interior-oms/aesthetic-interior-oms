'use client'

// Summary PDF Document — one-page project cost summary combining detail + furniture + electrical quotation data
import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { QuotationDraftContent } from '@/lib/quotation-types'
import type { FurnitureQuotationContent } from '@/lib/furniture-quotation-template'
import type { ElectricalQuotationContent } from '@/lib/electrical-quotation-template'
import {
  buildDetailFloorSummaries,
  formatDetailAmount,
} from '@/lib/detail-quotation-format'
import { calculateElectricalGrandTotal } from '@/lib/electrical-quotation-template'
import { amountInWordsTaka } from '@/lib/number-to-words'

// ─── Constants ──────────────────────────────────────────────────────────────
const PRIMARY = '#1f363d'
const GOLD = '#a57c00'
const PAGE_SIDE_PADDING = 7
const BDT_SYMBOL = '৳'

// ─── Environment helpers ─────────────────────────────────────────────────────
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://www.aestheticinteriortech.com'
}

const isBrowser = typeof window !== 'undefined'

const fontRegular = isBrowser
  ? '/fonts/NotoSansBengali-Regular.ttf'
  : typeof process !== 'undefined' && process.cwd
    ? `${process.cwd()}/public/fonts/NotoSansBengali-Regular.ttf`
    : '/fonts/NotoSansBengali-Regular.ttf'

const fontBold = isBrowser
  ? '/fonts/NotoSansBengali-Bold.ttf'
  : typeof process !== 'undefined' && process.cwd
    ? `${process.cwd()}/public/fonts/NotoSansBengali-Bold.ttf`
    : '/fonts/NotoSansBengali-Bold.ttf'

const watermarkSrc = isBrowser
  ? '/android-chrome-512x512.png'
  : typeof process !== 'undefined' && process.cwd
    ? `${process.cwd()}/public/android-chrome-512x512.png`
    : '/android-chrome-512x512.png'

// ─── Font Registration ───────────────────────────────────────────────────────
Font.register({
  family: 'Noto Sans Bengali',
  fonts: [
    { src: fontRegular },
    { src: fontRegular, fontStyle: 'italic' },
    { src: fontBold, fontWeight: 'bold' },
    { src: fontBold, fontWeight: 'bold', fontStyle: 'italic' },
  ],
})

Font.registerHyphenationCallback((word) => [word])

// ─── Styles ──────────────────────────────────────────────────────────────────
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

  // ── Header (identical pattern to DetailQuotationDocument) ────────────────
  header: {
    position: 'absolute',
    top: 20,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    height: 58,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 58,
    opacity: 0.08,
  },
  headerRuleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerRule: { height: 2.2, backgroundColor: PRIMARY },
  headerTitle: {
    color: PRIMARY,
    fontSize: 10,
    fontFamily: 'Times-Roman',
    fontStyle: 'italic',
    letterSpacing: 2,
    marginHorizontal: 12,
    textTransform: 'uppercase',
  },
  datePanel: { minWidth: 130, alignItems: 'flex-end' },
  metaLabel: { fontSize: 6, color: GOLD, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 9.5, color: PRIMARY, fontWeight: 'bold', textAlign: 'right' },

  // ── Footer ────────────────────────────────────────────────────────────────
  footerFixed: {
    position: 'absolute',
    bottom: 14,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    height: 52,
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

  // ── Client info ───────────────────────────────────────────────────────────
  bold: { fontWeight: 'bold', color: '#000000' },

  // ── Summary Table ────────────────────────────────────────────────────────
  tableWrapper: { width: '100%', marginTop: 16 },
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
  thColLast: { borderRightWidth: 0 },
  tRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.5,
    borderColor: '#d7d7d7',
  },
  tdCol: {
    fontSize: 10,
    lineHeight: 1.15,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#d7d7d7',
  },
  tdColLast: { borderRightWidth: 0 },

  // Summary column widths
  wSl: { width: '6%', textAlign: 'center' },
  wSumName: { width: '72%', paddingLeft: 10 },
  wSumTotal: { width: '22%', textAlign: 'right' },

  summaryFloorRow: { backgroundColor: '#f3f8f7' },
  summaryTdCol: { borderRightWidth: 0 },
  areaTotalRow: { backgroundColor: '#fff8e6' },

  // Grand total & in-words
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
    textTransform: 'uppercase',
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
    marginTop: 14,
    textAlign: 'left',
    fontFamily: 'Noto Sans Bengali',
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
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
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDetailCurrency = (value: number) => `${BDT_SYMBOL} ${formatDetailAmount(value)}`

function formatDateString(dateString: string | null | undefined) {
  if (!dateString) return 'N/A'
  try {
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString.trim())) {
      const [d, m, y] = dateString.trim().split('-').map(Number)
      const dateObj = new Date(y, m - 1, d)
      if (!isNaN(dateObj.getTime())) {
        return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(dateObj)
      }
    }
    const timestamp = Date.parse(dateString)
    if (isNaN(timestamp)) return dateString
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(timestamp))
  } catch {
    return dateString
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const WatermarkBackground = () => (
  <View
    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: -1, opacity: 0.05 }}
    fixed
  >
    <Image src={watermarkSrc} style={{ width: 400, height: 400 }} />
  </View>
)

const GlobalHeader = ({ date }: { date: string }) => {
  const formattedDate = formatDateString(date)
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
  )
}

const FooterFixed = ({ generatedAt }: { generatedAt?: string | null }) => (
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
      <Text style={[styles.footerMeta, { marginTop: 0, textAlign: 'left' }]}>Project Cost Summary</Text>
      {generatedAt ? (
        <Text style={[styles.footerMeta, { marginTop: 0, textAlign: 'right' }]}>Generated: {generatedAt}</Text>
      ) : null}
    </View>
  </View>
)

// ─── Props ────────────────────────────────────────────────────────────────────
export type SummaryDocumentProps = {
  clientName: string
  clientAddress: string | null
  quotationDate?: string | null
  detailContent: QuotationDraftContent | null
  furnitureContent: FurnitureQuotationContent | null
  electricalContent: ElectricalQuotationContent | null
}

// ─── Main Document ────────────────────────────────────────────────────────────
export function SummaryDocument({
  clientName,
  clientAddress,
  quotationDate,
  detailContent,
  furnitureContent,
  electricalContent,
}: SummaryDocumentProps) {
  // Build floor summaries from detail quotation
  const floorSummaries = detailContent ? buildDetailFloorSummaries(detailContent) : []

  // Furniture total
  const furnitureTotal =
    furnitureContent && furnitureContent.items.length > 0
      ? Math.round(furnitureContent.items.reduce((sum, item) => sum + item.quantity * item.rate, 0))
      : null

  // Electrical total
  let electricalTotal: number | null = null
  let electricalIsApprox = false
  if (electricalContent) {
    const { grandTotal, isApproximate } = calculateElectricalGrandTotal(electricalContent)
    if (grandTotal > 0) {
      electricalTotal = Math.round(grandTotal)
      electricalIsApprox = isApproximate || Boolean(electricalContent.useApproximateTotal)
    }
  }

  // Grand total
  const detailTotal = floorSummaries.reduce((sum, entry) => sum + entry.total, 0)
  const grandTotal = detailTotal + (furnitureTotal ?? 0) + (electricalTotal ?? 0)

  const today = new Date()
  const generatedAt = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(today)

  const displayDate = quotationDate ?? today.toISOString().slice(0, 10)

  let sl = 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <WatermarkBackground />

        {/* Header */}
        <GlobalHeader date={displayDate} />

        {/* Footer */}
        <FooterFixed generatedAt={generatedAt} />

        {/* Client Info Block */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 7, color: GOLD, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Prepared For
          </Text>
          <Text style={[styles.bold, { fontSize: 12, color: PRIMARY, marginBottom: 4, lineHeight: 1.25 }]}>
            {clientName}
          </Text>
          {clientAddress ? (
            <Text style={{ fontSize: 10, color: '#555555', lineHeight: 1.4 }}>{clientAddress}</Text>
          ) : null}
        </View>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Project Cost Summary</Text>

        {/* Summary Table */}
        <View style={styles.tableWrapper}>
          {/* Table Header */}
          <View style={styles.tHead}>
            <Text style={[styles.thCol, styles.wSl]}>SL</Text>
            <Text style={[styles.thCol, styles.wSumName]}>Description</Text>
            <Text style={[styles.thCol, styles.wSumTotal, styles.thColLast]}>
              Amount ({BDT_SYMBOL})
            </Text>
          </View>

          {/* Detail Quotation Rows */}
          {floorSummaries.map((entry) => {
            sl += 1
            return (
              <View key={entry.floor.id} style={[styles.tRow, styles.summaryFloorRow]} wrap={false}>
                <Text style={[styles.tdCol, styles.wSl]}>{sl}</Text>
                <Text style={[styles.tdCol, styles.wSumName]}>{entry.floor.name}</Text>
                <Text style={[styles.tdCol, styles.summaryTdCol, styles.wSumTotal, styles.tdColLast]}>
                  {formatDetailAmount(entry.total)}
                </Text>
              </View>
            )
          })}

          {/* Furniture Row */}
          {furnitureTotal !== null && (
            (() => {
              sl += 1
              return (
                <View style={[styles.tRow, { backgroundColor: '#fff8e6' }]} wrap={false}>
                  <Text style={[styles.tdCol, styles.wSl]}>{sl}</Text>
                  <Text style={[styles.tdCol, styles.wSumName]}>Furniture Works</Text>
                  <Text style={[styles.tdCol, styles.summaryTdCol, styles.wSumTotal, styles.tdColLast]}>
                    {formatDetailAmount(furnitureTotal)}
                  </Text>
                </View>
              )
            })()
          )}

          {/* Electrical Row */}
          {electricalTotal !== null && (
            (() => {
              sl += 1
              return (
                <View style={[styles.tRow, { backgroundColor: '#f0f8ff' }]} wrap={false}>
                  <Text style={[styles.tdCol, styles.wSl]}>{sl}</Text>
                  <Text style={[styles.tdCol, styles.wSumName]}>
                    Electrical Works{electricalIsApprox ? ' (approx.)' : ''}
                  </Text>
                  <Text style={[styles.tdCol, styles.summaryTdCol, styles.wSumTotal, styles.tdColLast]}>
                    {formatDetailAmount(electricalTotal)}
                  </Text>
                </View>
              )
            })()
          )}
        </View>

        {/* Grand Total */}
        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
          <Text style={styles.grandTotalValue}>{formatDetailCurrency(grandTotal)}</Text>
        </View>

        {/* In Words */}
        {grandTotal > 0 ? (
          <Text style={styles.inWords}>In Words: {amountInWordsTaka(grandTotal)}</Text>
        ) : null}
      </Page>
    </Document>
  )
}
