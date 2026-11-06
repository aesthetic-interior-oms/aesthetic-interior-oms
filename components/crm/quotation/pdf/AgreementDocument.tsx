'use client'

import { Circle, Document, Font, Image, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
import type { AgreementContent } from '@/lib/agreement-template'
import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'
import {
  buildDetailFloorSummaries,
  formatDetailAmount,
  formatDetailQtyCell,
  formatDetailUnitPriceCell,
  formatDetailTotalCell,
  isPackageLine,
  isRateOnlyLine,
} from '@/lib/detail-quotation-format'
import { amountInWordsTaka } from '@/lib/number-to-words'

const PRIMARY = '#1f363d'
const GOLD = '#a57c00'
const BORDER = '#d7d7d7'
const BG_LIGHT = '#f7faf9'
const BG_ALT = '#fffdfa'
const TEXT_DARK = '#1a202c'
const TEXT_MUTED = '#64748b'
const PAGE_PADDING = 28
const BDT_SYMBOL = '৳'
const DETAIL_ROW_LINE_HEIGHT = 1.15
const DETAIL_ROW_VERTICAL_PADDING = 3

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

Font.register({
  family: 'Noto Sans Bengali',
  fonts: [
    { src: fontRegular },
    { src: fontRegular, fontStyle: 'italic' },
    { src: fontBold, fontWeight: 'bold' },
    { src: fontBold, fontWeight: 'bold', fontStyle: 'italic' },
  ],
})

const playfairRegular = isBrowser
  ? '/fonts/PlayfairDisplay-Regular.ttf'
  : typeof process !== 'undefined' && process.cwd
    ? `${process.cwd()}/public/fonts/PlayfairDisplay-Regular.ttf`
    : '/fonts/PlayfairDisplay-Regular.ttf'

const playfairBold = isBrowser
  ? '/fonts/PlayfairDisplay-Bold.ttf'
  : typeof process !== 'undefined' && process.cwd
    ? `${process.cwd()}/public/fonts/PlayfairDisplay-Bold.ttf`
    : '/fonts/PlayfairDisplay-Bold.ttf'

Font.register({
  family: 'Playfair Display',
  fonts: [
    { src: playfairRegular },
    { src: playfairBold, fontWeight: 'bold' },
  ],
})

Font.registerHyphenationCallback((word) => [word])

const logoSrc = isBrowser
  ? '/Logo/HeaderLogo.png'
  : typeof process !== 'undefined' && process.cwd
    ? `${process.cwd()}/public/Logo/HeaderLogo.png`
    : '/Logo/HeaderLogo.png'


const watermarkSrc = isBrowser
  ? '/android-chrome-512x512.png'
  : typeof process !== 'undefined' && process.cwd
    ? `${process.cwd()}/public/android-chrome-512x512.png`
    : '/android-chrome-512x512.png'

const styles = StyleSheet.create({
  // ─── Luxury Minimalist Cover Page Styles (White Background) ───
  coverPage: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 46,
    paddingBottom: 36,
    paddingHorizontal: 40,
  },
  coverOuterBorder: {
    position: 'absolute',
    top: 22,
    left: 22,
    right: 22,
    bottom: 22,
    borderWidth: 1,
    borderColor: GOLD,
    opacity: 0.45,
  },
  coverInnerBorder: {
    position: 'absolute',
    top: 26,
    left: 26,
    right: 26,
    bottom: 26,
    borderWidth: 0.5,
    borderColor: GOLD,
    opacity: 0.25,
  },
  coverCornerTL: {
    position: 'absolute',
    top: 24.5,
    left: 24.5,
    width: 3.5,
    height: 3.5,
    backgroundColor: GOLD,
  },
  coverCornerTR: {
    position: 'absolute',
    top: 24.5,
    right: 24.5,
    width: 3.5,
    height: 3.5,
    backgroundColor: GOLD,
  },
  coverCornerBL: {
    position: 'absolute',
    bottom: 24.5,
    left: 24.5,
    width: 3.5,
    height: 3.5,
    backgroundColor: GOLD,
  },
  coverCornerBR: {
    position: 'absolute',
    bottom: 24.5,
    right: 24.5,
    width: 3.5,
    height: 3.5,
    backgroundColor: GOLD,
  },
  coverContentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    zIndex: 2,
  },
  coverTopSection: {
    alignItems: 'center',
    width: '100%',
  },
  coverArchWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLogo: {
    width: 155,
    height: 42,
    objectFit: 'contain',
    marginTop: 6,
  },
  coverStudioLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 4.5,
    marginTop: 8,
    textAlign: 'center',
  },
  coverCenterSection: {
    alignItems: 'center',
    width: '100%',
    marginTop: 38,
    marginBottom: 38,
  },
  coverMainTitle: {
    fontFamily: 'Playfair Display',
    fontWeight: 'bold',
    fontSize: 36,
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 7,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 3.5,
    marginTop: 8,
    textAlign: 'center',
  },
  coverGoldDivider: {
    width: 44,
    height: 1.5,
    backgroundColor: GOLD,
    marginTop: 12,
    marginBottom: 10,
    alignSelf: 'center',
  },
  coverTagline: {
    fontFamily: 'Playfair Display',
    fontStyle: 'italic',
    fontSize: 9.5,
    color: TEXT_MUTED,
    letterSpacing: 1,
    textAlign: 'center',
  },
  coverBottomSection: {
    alignItems: 'center',
    width: '100%',
  },
  coverMetaGroup: {
    alignItems: 'center',
    marginBottom: 12,
  },
  coverMetaLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 3,
    textAlign: 'center',
  },
  coverClientName: {
    fontFamily: 'Playfair Display',
    fontSize: 15,
    fontWeight: 'bold',
    color: PRIMARY,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  coverProjectText: {
    fontSize: 9.5,
    color: TEXT_DARK,
    textAlign: 'center',
    maxWidth: 380,
  },
  coverAddressSub: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 380,
  },
  coverDateValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PRIMARY,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  page: {
    paddingTop: 80,
    paddingBottom: 72,
    paddingHorizontal: PAGE_PADDING,
    fontFamily: 'Noto Sans Bengali',
    fontSize: 9.5,
    color: TEXT_DARK,
    backgroundColor: '#ffffff',
    lineHeight: 1.5,
  },
  detailPage: {
    paddingTop: 80,
    paddingBottom: 72,
    paddingLeft: 14,
    paddingRight: 14,
    fontFamily: 'Noto Sans Bengali',
    fontSize: 9,
    color: '#000000',
    backgroundColor: '#ffffff',
    lineHeight: 1.4,
  },
  watermark: {
    position: 'absolute',
    top: 220,
    left: 98,
    width: 400,
    height: 400,
    zIndex: -1,
    opacity: 0.1,
  },
  header: {
    position: 'absolute',
    top: 18,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    height: 52,
    borderBottomWidth: 1.5,
    borderBottomColor: GOLD,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerBrand: {
    width: 140,
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  headerDocTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerSubText: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  footerFixed: {
    position: 'absolute',
    bottom: 12,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    height: 38,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  footerText: {
    fontSize: 7.5,
    color: '#666666',
  },
  footerMeta: {
    fontSize: 6.5,
    color: '#888888',
  },
  titleBanner: {
    backgroundColor: BG_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  docTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  docSubTitle: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: PRIMARY,
    backgroundColor: BG_LIGHT,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 10,
    marginBottom: 6,
    borderLeftWidth: 2.5,
    borderLeftColor: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailSectionTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: PRIMARY,
    backgroundColor: '#f3f8f7',
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 4,
    marginBottom: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    borderRightWidth: 3,
    borderRightColor: GOLD,
  },
  paragraph: {
    marginBottom: 6,
    lineHeight: 1.5,
    fontSize: 9.5,
    color: '#2d3748',
  },
  bold: {
    fontWeight: 'bold',
    color: PRIMARY,
  },
  card: {
    backgroundColor: BG_LIGHT,
    borderWidth: 0.75,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 8,
    marginBottom: 8,
  },
  table: {
    width: '100%',
    borderTopWidth: 0.75,
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: BORDER,
    marginBottom: 8,
  },
  tHead: {
    flexDirection: 'row',
    backgroundColor: PRIMARY,
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  thCol: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  tRowAlt: {
    backgroundColor: BG_ALT,
  },
  tdCol: {
    fontSize: 9,
    color: TEXT_DARK,
  },
  totalsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: PRIMARY,
    backgroundColor: BG_LIGHT,
    paddingVertical: 5,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  inWordsBlock: {
    backgroundColor: BG_LIGHT,
    borderLeftWidth: 2.5,
    borderLeftColor: GOLD,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 2,
    marginBottom: 8,
  },
  inWordsText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  clauseRow: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingBottom: 4,
    borderBottomWidth: 0.4,
    borderBottomColor: '#edf2f7',
  },
  clauseNum: {
    width: 24,
    fontSize: 8.5,
    fontWeight: 'bold',
    color: GOLD,
  },
  clauseBody: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.45,
    color: '#2d3748',
  },
  sigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  sigBlock: {
    width: '45%',
    borderTopWidth: 0.8,
    borderTopColor: PRIMARY,
    paddingTop: 5,
  },
  sigName: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 1.5,
  },
  sigRole: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    lineHeight: 1.3,
  },
  witnessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  witnessCol: {
    width: '30%',
    borderTopWidth: 0.6,
    borderTopColor: '#94a3b8',
    paddingTop: 4,
  },
  gmCard: {
    marginTop: 10,
    padding: 8,
    borderWidth: 0.8,
    borderColor: GOLD,
    backgroundColor: '#fffdfa',
    borderRadius: 3,
  },

  // ─── Work Order Front Page (Page 1) Design ───
  woPageContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  woTopSection: {
    width: '100%',
  },
  woTitleContainer: {
    marginBottom: 14,
  },
  woBadge: {
    alignSelf: 'flex-start',
    marginBottom: 3,
  },
  woBadgeText: {
    color: GOLD,
    fontSize: 7.8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  woDocTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  woMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    alignItems: 'center',
  },
  woMetaText: {
    fontSize: 7.5,
    color: '#475569',
  },
  woMetaSep: {
    fontSize: 7.5,
    color: GOLD,
    marginHorizontal: 4,
  },
  woDossierCard: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderWidth: 0.75,
    borderColor: '#cbd5e1',
    borderTopWidth: 2,
    borderTopColor: GOLD,
    borderRadius: 3,
    padding: 9,
    marginBottom: 14,
  },
  woPartyCol: {
    flex: 1,
  },
  woPartyDivider: {
    width: 0.8,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 8,
  },
  woPartyTag: {
    fontSize: 8,
    fontWeight: 'bold',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  woPartyName: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 3,
  },
  woPartyDetail: {
    fontSize: 8.2,
    color: '#475569',
    lineHeight: 1.35,
  },
  woSummaryStrip: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderWidth: 0.75,
    borderColor: '#e2e8f0',
    borderRadius: 3,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 14,
    justifyContent: 'space-between',
  },
  woSummaryItem: {
    flex: 1,
    paddingHorizontal: 4,
  },
  woSummaryItemBorder: {
    borderRightWidth: 0.6,
    borderRightColor: '#cbd5e1',
  },
  woSummaryLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  woSummaryValue: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  woSummaryValueHighlight: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: GOLD,
  },
  woLetterArea: {
    borderLeftWidth: 2,
    borderLeftColor: GOLD,
    paddingLeft: 8,
    marginBottom: 14,
  },
  woSubjectRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  woSubjectLabel: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: PRIMARY,
    marginRight: 4,
  },
  woSubjectText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#334155',
    flex: 1,
  },
  woSalutation: {
    fontSize: 8.8,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 6,
  },
  woParagraph: {
    fontSize: 8.5,
    lineHeight: 1.48,
    color: '#334155',
    marginBottom: 6,
    textAlign: 'justify',
  },
  woClosing: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: PRIMARY,
    marginTop: 10,
  },

  // Detail Quotation specific styles (identical to DetailQuotationDocument)
  detailTableWrapper: {
    width: '100%',
  },
  detailTHead: {
    flexDirection: 'row',
    borderTopWidth: 0.75,
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: '#d7d7d7',
    backgroundColor: '#f3f8f7',
  },
  detailThCol: {
    fontSize: 9.5,
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
  detailTRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.5,
    borderColor: '#d7d7d7',
  },
  detailTRowAlt: {
    backgroundColor: '#fffdfa',
  },
  detailTdCol: {
    fontSize: 9,
    lineHeight: DETAIL_ROW_LINE_HEIGHT,
    paddingTop: DETAIL_ROW_VERTICAL_PADDING,
    paddingBottom: DETAIL_ROW_VERTICAL_PADDING,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#d7d7d7',
    color: '#000000',
  },
  wSl: { width: '6%', textAlign: 'center' },
  wName: { width: '16%' },
  wMats: { width: '44%' },
  wQty: { width: '10%', textAlign: 'center' },
  wPrice: { width: '12%', textAlign: 'center' },
  wTotal: { width: '12%', textAlign: 'center' },

  areaTitleRow: {
    backgroundColor: '#f3f8f7',
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.5,
    borderColor: '#d7d7d7',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  areaTitleText: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: PRIMARY,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  areaTotalRow: {
    backgroundColor: '#fff8e6',
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.5,
    borderColor: '#d7d7d7',
  },
  areaTotalLabel: {
    textAlign: 'right',
    color: PRIMARY,
    textTransform: 'uppercase',
  },
  matText: {
    fontSize: 8.5,
    color: '#444444',
    lineHeight: DETAIL_ROW_LINE_HEIGHT,
    marginBottom: 0,
  },
  matCell: {
    lineHeight: DETAIL_ROW_LINE_HEIGHT,
  },
  grandTotalRow: {
    flexDirection: 'row',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: PRIMARY,
  },
  grandTotalLabel: {
    width: '76%',
    textAlign: 'right',
    paddingRight: 10,
    fontWeight: 'bold',
    fontSize: 9.5,
    color: PRIMARY,
    textTransform: 'uppercase',
  },
  grandTotalValue: {
    width: '24%',
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: 9.5,
    color: PRIMARY,
  },
  inWords: {
    fontSize: 9,
    color: '#000000',
    marginTop: 6,
    textAlign: 'left',
    fontFamily: 'Noto Sans Bengali',
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
})

function formatDateString(dateString: string | undefined | null) {
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

const WatermarkBackground = () => (
  <View style={styles.watermark} fixed>
    <Image src={watermarkSrc} style={{ width: 400, height: 400 }} />
  </View>
)

const GlobalHeader = ({
  code,
  date,
  title = 'Agreement Paper',
  sidePadding = PAGE_PADDING,
}: {
  code: string
  date: string
  title?: string
  sidePadding?: number
}) => (
  <View style={[styles.header, { left: sidePadding, right: sidePadding }]} fixed>
    <View style={styles.headerBrand}>
      <Image src={logoSrc} style={{ width: 130 }} />
    </View>
    <View style={styles.headerMeta}>
      <Text style={styles.headerDocTitle}>{title}</Text>
      <Text style={styles.headerSubText}>Date: {formatDateString(date)}</Text>
      <Text style={styles.headerSubText}>WO ID: {code}</Text>
    </View>
  </View>
)

const GlobalFooter = ({
  workOrderId,
  reference,
  sidePadding = PAGE_PADDING,
}: {
  workOrderId: string
  reference: string
  sidePadding?: number
}) => (
  <View style={[styles.footerFixed, { left: sidePadding, right: sidePadding }]} fixed>
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: GOLD,
        paddingTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <View style={{ width: '35%' }}>
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold', fontSize: 8 }]}>
          Aesthetic Interior Studio
        </Text>
        <Text style={styles.footerText}>183, East Senpara, Mirpur-10, Dhaka-1216</Text>
      </View>
      <View style={{ width: '30%', alignItems: 'center' }}>
        <Text style={styles.footerText}>+88 0132969 4663 · +88 0132969 4660</Text>
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold' }]}>
          www.aestheticinteriortech.com
        </Text>
      </View>
      <View style={{ width: '35%', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        <Text
          style={styles.footerText}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
        <Text style={[styles.footerMeta, { marginTop: 2 }]}>
          Ref: {reference || workOrderId} · WO: {workOrderId}
        </Text>
      </View>
    </View>
  </View>
)

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
  if (!value) return ['']
  const rawLines = value.split(/\r?\n/)
  if (rawLines.length === 0) return ['']

  const result: string[] = []

  for (const rawLine of rawLines) {
    if (rawLine === '') {
      result.push('')
      continue
    }

    const words = rawLine.split(' ')
    let current = ''

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const wordChunks =
        word.length > lineLength
          ? word.match(new RegExp(`.{1,${lineLength}}`, 'g')) ?? [word]
          : [word]

      for (let j = 0; j < wordChunks.length; j++) {
        const chunk = wordChunks[j]
        if (!current) {
          current = chunk
        } else if (current.length + 1 + chunk.length > lineLength) {
          result.push(current)
          current = chunk
        } else {
          current = `${current} ${chunk}`
        }
      }
    }

    if (current || rawLine !== '') {
      result.push(current)
    }
  }

  return result.length > 0 ? result : ['']
}

function parseMarkdownBoldPdf(text: string, defaultBold = false) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <Text key={idx} style={styles.bold}>
          {softWrapPdfText(part.slice(2, -2))}
        </Text>
      )
    }
    return (
      <Text key={idx} style={defaultBold ? styles.bold : {}}>
        {softWrapPdfText(part)}
      </Text>
    )
  })
}

function SingleMaterialLine({ text, isFirstRowAndEmpty }: { text: string; isFirstRowAndEmpty?: boolean }) {
  if (!text) {
    if (isFirstRowAndEmpty) {
      return <Text wrap={false} style={styles.matText}>—</Text>
    }
    return <Text wrap={false} style={styles.matText}>{'\u00A0'}</Text>
  }
  const match = text.match(/^(\d{2}\.[^:]+:|[^:*]+:|\*[^:]+:)/)
  const isWithoutWiring =
    text.toLowerCase().includes('without supplying wiring') ||
    text.toLowerCase().includes('without suppling wiring')
  if (!match) {
    return (
      <Text wrap={false} style={styles.matText}>
        {parseMarkdownBoldPdf(text, isWithoutWiring)}
      </Text>
    )
  }
  const prefix = match[1]
  const rest = text.substring(prefix.length)
  return (
    <Text wrap={false} style={styles.matText}>
      <Text style={styles.bold}>{softWrapPdfText(prefix)}</Text>
      {parseMarkdownBoldPdf(rest, isWithoutWiring)}
    </Text>
  )
}

function formatDetailUnitPriceCurrency(line: QuotationDraftContent['lineItems'][number]) {
  if (isRateOnlyLine(line)) return formatDetailAmount(line.rate)
  if (line.rate <= 0) return formatDetailUnitPriceCell(line)
  return formatDetailAmount(line.rate)
}

function formatDetailTotalCurrency(line: QuotationDraftContent['lineItems'][number]) {
  if (isRateOnlyLine(line)) return formatDetailTotalCell(line)
  if (!line.amount || line.amount <= 0) return '---'
  return formatDetailAmount(line.amount)
}

export function AgreementDocumentPdf({
  agreement,
  quotation,
  totals,
  clientName,
  agreementValue,
}: {
  agreement: AgreementContent
  quotation: QuotationDraftContent | null
  totals: QuotationTotals | null
  clientName: string
  agreementValue: number | null
}) {
  const rows = quotation ? buildDetailFloorSummaries(quotation) : []
  const finalValue = Number(agreement.agreementValue) || agreementValue || totals?.grandTotal || 0
  const subtotalValue = totals?.subtotal ?? finalValue
  const discountAmount = totals?.discountAmount ?? 0

  const paymentPercentTotal = agreement.paymentSchedule.reduce(
    (sum, item) => sum + (Number.parseFloat(item.percentage.replace('%', '')) || 0),
    0,
  )
  const paymentAmountTotal = agreement.paymentSchedule.reduce(
    (sum, item) => sum + (Number.parseFloat(item.amount.replace(/,/g, '')) || 0),
    0,
  )

  const getAreaGroups = (entry: ReturnType<typeof buildDetailFloorSummaries>[number]) => {
    const isFinishingElectrical =
      entry.floor.sectionType === 'FINISHING_ELECTRICAL' ||
      entry.floor.id === 'finishing-electrical-works-section' ||
      Boolean(entry.floor.name && /finishing|electrical/i.test(entry.floor.name))

    if (isFinishingElectrical) {
      return [{ id: `fe-${entry.floor.id}`, name: '', lines: entry.lines }]
    }

    const floorAreas = [...(quotation?.areas ?? [])]
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

  // Precompute continuous global SL numbers across all sections
  const lineSlMap = new Map<string, number>()
  let globalSlCounter = 0
  rows.forEach((entry) => {
    const areaGroups = getAreaGroups(entry)
    areaGroups.forEach((area) => {
      area.lines.forEach((line) => {
        globalSlCounter += 1
        lineSlMap.set(line.id, globalSlCounter)
      })
    })
  })

  // Clean letter paragraphs for Work Order front page
  const cleanLetterLines = (agreement.letterBody || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^thanking\s*you/i.test(line))

  return (
    <Document title={`Agreement - ${clientName}`} author="Aesthetic Interior">
      {/* ─── FRONT COVER PAGE (LUXURY MINIMALIST EDITORIAL - WHITE) ─── */}
      <Page size="A4" style={styles.coverPage} wrap={false}>
        {/* Thin Double-Line Rectangular Border with Antique Gold Accents */}
        <View style={styles.coverOuterBorder} />
        <View style={styles.coverInnerBorder} />
        <View style={styles.coverCornerTL} />
        <View style={styles.coverCornerTR} />
        <View style={styles.coverCornerBL} />
        <View style={styles.coverCornerBR} />

        {/* Botanical Plant-Leaf Decoration in Brand Colors */}
        <Svg width={180} height={200} viewBox="0 0 180 200" style={{ position: 'absolute', top: 26, left: 26, zIndex: 1 }}>
          <Path d="M 0 0 C 18 20, 36 50, 62 88 C 88 126, 112 154, 148 178" stroke={PRIMARY} strokeWidth={1.2} fill="none" opacity={0.4} />
          <Path d="M 62 88 C 74 108, 84 132, 88 158" stroke={PRIMARY} strokeWidth={0.8} fill="none" opacity={0.3} />

          {/* Leaves along upper stem */}
          <Path d="M 22 28 C 38 20, 55 24, 61 36 C 55 48, 38 44, 22 28 Z" fill={PRIMARY} opacity={0.25} />
          <Path d="M 16 42 C 10 58, 18 72, 30 74 C 36 66, 32 52, 16 42 Z" fill={GOLD} opacity={0.35} />
          <Path d="M 42 60 C 62 52, 82 58, 90 72 C 80 84, 62 80, 42 60 Z" fill={PRIMARY} opacity={0.3} />
          <Path d="M 45 76 C 38 95, 44 114, 55 120 C 65 112, 62 94, 45 76 Z" fill={GOLD} opacity={0.3} />

          {/* Leaves along mid & lower stem */}
          <Path d="M 76 108 C 97 100, 118 108, 128 122 C 114 134, 95 128, 76 108 Z" fill={PRIMARY} opacity={0.25} />
          <Path d="M 81 120 C 74 140, 84 156, 97 160 C 105 150, 101 134, 81 120 Z" fill={GOLD} opacity={0.35} />
          <Path d="M 122 154 C 141 154, 158 164, 164 176 C 151 182, 134 174, 122 154 Z" fill={PRIMARY} opacity={0.25} />

          {/* Gold berry / dot accents */}
          <Circle cx={52} cy={48} r={2} fill={GOLD} opacity={0.85} />
          <Circle cx={86} cy={95} r={2} fill={GOLD} opacity={0.85} />
          <Circle cx={120} cy={144} r={2} fill={GOLD} opacity={0.85} />
        </Svg>

        {/* Symmetrical Content Wrapper with Balanced Whitespace */}
        <View style={styles.coverContentWrapper} wrap={false}>
          {/* 1. TOP: Architectural Geometric Arch & Original Logo */}
          <View style={styles.coverTopSection}>
            <View style={styles.coverArchWrapper}>
              <Svg width={180} height={95} viewBox="0 0 180 95">
                {/* Outer concentric architectural arch */}
                <Path d="M 22 95 L 22 68 A 68 68 0 0 1 158 68 L 158 95" stroke={GOLD} strokeWidth={0.8} fill="none" opacity={0.5} />

                {/* Middle concentric arch */}
                <Path d="M 34 95 L 34 68 A 56 56 0 0 1 146 68 L 146 95" stroke={GOLD} strokeWidth={0.5} fill="none" opacity={0.35} />

                {/* Inner decorative arch */}
                <Path d="M 46 95 L 46 68 A 44 44 0 0 1 134 68 L 134 95" stroke={GOLD} strokeWidth={0.6} fill="none" opacity={0.45} />

                {/* Keystone & Apex dot */}
                <Circle cx={90} cy={12} r={2} fill={GOLD} opacity={0.9} />
                <Circle cx={90} cy={12} r={4.5} stroke={GOLD} strokeWidth={0.5} fill="none" opacity={0.5} />

                {/* Central Monogram Ring */}
                <Circle cx={90} cy={54} r={17} stroke={GOLD} strokeWidth={0.75} fill="#FFFFFF" opacity={0.95} />
              </Svg>

              {/* Monogram 'AI' Centered Inside the Arch Ring */}
              <View style={{ position: 'absolute', top: 43, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Playfair Display', fontWeight: 'bold', fontSize: 13, color: PRIMARY, letterSpacing: 1.5 }}>AI</Text>
              </View>
            </View>

            {/* Original Exact Header Logo */}
            <Image src={logoSrc} style={styles.coverLogo} />

            {/* Uppercase Studio Label */}
            <Text style={styles.coverStudioLabel}>INTERIOR DESIGN STUDIO</Text>
          </View>

          {/* 2. MIDDLE: Prominent Main Title, Subtitle & Description */}
          <View style={styles.coverCenterSection}>
            <Text style={styles.coverMainTitle}>AGREEMENT</Text>
            <Text style={styles.coverSubtitle}>INTERIOR DESIGN & PROJECT EXECUTION</Text>
            <View style={styles.coverGoldDivider} />
            <Text style={styles.coverTagline}>&ldquo;Designing spaces, creating experiences.&rdquo;</Text>
          </View>

          {/* 3. BOTTOM: Client, Project & Agreement Date */}
          <View style={styles.coverBottomSection}>
            {/* Client Name */}
            <View style={styles.coverMetaGroup}>
              <Text style={styles.coverMetaLabel}>CLIENT</Text>
              <Text style={styles.coverClientName}>{agreement.ownerName || clientName}</Text>
            </View>

            {/* Project Name & Address */}
            <View style={styles.coverMetaGroup}>
              <Text style={styles.coverMetaLabel}>PROJECT</Text>
              <Text style={styles.coverProjectText}>
                {agreement.projectName || agreement.projectAddress || 'Interior Architecture & Renovation'}
              </Text>
              {agreement.projectAddress && agreement.projectName && agreement.projectAddress !== agreement.projectName ? (
                <Text style={styles.coverAddressSub}>{agreement.projectAddress}</Text>
              ) : null}
            </View>

            {/* Agreement Date */}
            <View style={[styles.coverMetaGroup, { marginBottom: 0 }]}>
              <Text style={styles.coverMetaLabel}>AGREEMENT DATE</Text>
              <Text style={styles.coverDateValue}>{formatDateString(agreement.agreementDate)}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ─── PAGE 2: WORK ORDER FOR INTERIOR WORKS ─────────────────── */}
      <Page size="A4" style={styles.page}>
        <WatermarkBackground />
        <GlobalHeader code={agreement.workOrderId} date={agreement.agreementDate} title="Work Order" />

        <View style={styles.woPageContainer}>
          <View style={styles.woTopSection}>
            {/* 1. Work order header section - old one */}
            <View style={styles.woTitleContainer}>
              <View style={styles.woBadge}>
                <Text style={styles.woBadgeText}>OFFICIAL WORK ORDER</Text>
              </View>
              <Text style={styles.woDocTitle}>WORK ORDER FOR INTERIOR WORKS</Text>
              <View style={styles.woMetaRow}>
                <Text style={styles.woMetaText}>
                  Work Order ID: <Text style={styles.bold}>{agreement.workOrderId}</Text>
                </Text>
                <Text style={styles.woMetaSep}>·</Text>
                <Text style={styles.woMetaText}>
                  Reference: <Text style={styles.bold}>{agreement.reference}</Text>
                </Text>
                <Text style={styles.woMetaSep}>·</Text>
                <Text style={styles.woMetaText}>
                  Sub Contract ID: <Text style={styles.bold}>{agreement.subContractId}</Text>
                </Text>
                <Text style={styles.woMetaSep}>·</Text>
                <Text style={styles.woMetaText}>
                  Issuance Date: <Text style={styles.bold}>{formatDateString(agreement.agreementDate)}</Text>
                </Text>
              </View>
            </View>

            {/* 2. Client and Executant Introduction - old one */}
            <View style={styles.woDossierCard}>
              <View style={styles.woPartyCol}>
                <Text style={styles.woPartyTag}>ISSUED BY (CLIENT)</Text>
                <Text style={styles.woPartyName}>{agreement.ownerName || clientName}</Text>
                <Text style={styles.woPartyDetail}>
                  Project Site: {agreement.projectAddress || agreement.ownerAddress || agreement.projectName || 'Dhaka, Bangladesh'}
                </Text>
                <Text style={styles.woPartyDetail}>
                  Capacity: Authorized Property Owner / Client
                </Text>
              </View>
              <View style={styles.woPartyDivider} />
              <View style={styles.woPartyCol}>
                <Text style={styles.woPartyTag}>AWARDED TO (EXECUTANT)</Text>
                <Text style={styles.woPartyName}>AESTHETIC INTERIOR</Text>
                <Text style={styles.woPartyDetail}>
                  Head Office: 3rd Floor, 183 East Senpara Parbata, Mirpur 10, Dhaka-1216
                </Text>
                <Text style={styles.woPartyDetail}>
                  Hotlines: 01329-694660, 01329-694661 · Trade Lic: TRAD/DNCC/037755/2025
                </Text>
              </View>
            </View>

            {/* 3. Stats of overview - old one */}
            <View style={styles.woSummaryStrip}>
              <View style={[styles.woSummaryItem, styles.woSummaryItemBorder]}>
                <Text style={styles.woSummaryLabel}>AGREED VALUE</Text>
                <Text style={styles.woSummaryValueHighlight}>
                  {finalValue > 0 ? `${BDT_SYMBOL} ${formatDetailAmount(finalValue)}` : 'As Approved'}
                </Text>
              </View>
              <View style={[styles.woSummaryItem, styles.woSummaryItemBorder]}>
                <Text style={styles.woSummaryLabel}>PROJECT LOCATION</Text>
                <Text style={styles.woSummaryValue}>
                  {agreement.projectName || agreement.ownerAddress || 'Turnkey Project Site'}
                </Text>
              </View>
              <View style={[styles.woSummaryItem, styles.woSummaryItemBorder]}>
                <Text style={styles.woSummaryLabel}>TIMELINE</Text>
                <Text style={styles.woSummaryValue}>150 Working Days</Text>
              </View>
              <View style={styles.woSummaryItem}>
                <Text style={styles.woSummaryLabel}>SCOPE</Text>
                <Text style={styles.woSummaryValue}>Turnkey Interior Works</Text>
              </View>
            </View>

            {/* 4. Work order Letter - old one */}
            <View style={styles.woLetterArea}>
              <View style={styles.woSubjectRow}>
                <Text style={styles.woSubjectLabel}>SUBJECT:</Text>
                <Text style={styles.woSubjectText}>
                  Work Order for Interior Fit-out &amp; Turnkey Execution of {agreement.projectName || 'the designated Project Site'}
                </Text>
              </View>

              <Text style={styles.woSalutation}>Dear Aesthetic Interior,</Text>

              {cleanLetterLines.map((line, index) => (
                <Text key={index} style={styles.woParagraph}>
                  {line}
                </Text>
              ))}

              <Text style={styles.woClosing}>Thanking you,</Text>
            </View>
          </View>

          {/* 5. Anchored Bottom: Caption & Signatures - current one */}
          <View style={{ marginTop: 'auto', paddingTop: 8 }}>
            {/* a simple Caption ( in italic font ) - taken up from signature section */}
            <Text style={{ fontSize: 7.5, color: TEXT_MUTED, fontStyle: 'italic', textAlign: 'center', marginBottom: 20 }}>
              This Work Order is formally executed by the Client and accepted by Aesthetic Interior as an integral part of the Agreement.
            </Text>

            {/* Work order Signature - current one */}
            <View style={styles.sigRow}>
              <View style={[styles.sigBlock, { width: '46%' }]}>
                <Text style={[styles.bold, { fontSize: 7.8, color: GOLD, textTransform: 'uppercase', marginBottom: 18 }]}>
                  Work Order Issued By
                </Text>
                <Text style={styles.sigName}>{agreement.ownerName || clientName}</Text>
                <Text style={styles.sigRole}>Owner / Client (Project)</Text>
                <Text style={styles.sigRole}>Date: {formatDateString(agreement.agreementDate)}</Text>
              </View>

              <View style={[styles.sigBlock, { width: '46%' }]}>
                <Text style={[styles.bold, { fontSize: 7.8, color: GOLD, textTransform: 'uppercase', marginBottom: 18 }]}>
                  Work Order Accepted By
                </Text>
                <Text style={styles.sigName}>
                  {agreement.companyRepresentative || agreement.srCrmName || 'Md. Nazrul Islam'}
                </Text>
                <Text style={styles.sigRole}>
                  {agreement.companyRepresentativeTitle || 'General Manager'}, Aesthetic Interior
                </Text>
                <Text style={styles.sigRole}>Date: {formatDateString(agreement.agreementDate)}</Text>
              </View>
            </View>
          </View>
        </View>

        <GlobalFooter workOrderId={agreement.workOrderId} reference={agreement.reference} />
      </Page>

      {/* ─── PAGE 2: AGREEMENT AND RECITALS ───────────────────────── */}
      <Page size="A4" style={styles.page}>
        <WatermarkBackground />
        <GlobalHeader code={agreement.workOrderId} date={agreement.agreementDate} title="Agreement Paper" />

        <View style={styles.titleBanner}>
          <Text style={styles.docTitle}>AGREEMENT</Text>
          <Text style={styles.docSubTitle}>
            THIS AGREEMENT is made at Dhaka dated at {formatDateString(agreement.agreementDate)}.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.bold, { fontSize: 8.5, color: GOLD, marginBottom: 2, textTransform: 'uppercase' }]}>
            BETWEEN
          </Text>
          <Text style={[styles.paragraph, { marginBottom: 5 }]}>
            <Text style={styles.bold}>{agreement.ownerName || clientName}</Text>, Owner of the Apartment at{' '}
            {agreement.ownerAddress || agreement.projectAddress || 'Dhaka, Bangladesh'}. (Hereinafter referred to as the{' '}
            <Text style={styles.bold}>&quot;Owner&quot;</Text>)
          </Text>

          <Text style={[styles.bold, { fontSize: 8.5, color: GOLD, marginBottom: 2, textTransform: 'uppercase' }]}>
            AND
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>AESTHETIC INTERIOR</Text>, having registered address at 3rd Floor, 183 East Senpara,
            Begum Rokeya Sarani, Mirpur-10, Trade License No: <Text style={styles.bold}>TRAD/DNCC/037755/2025</Text>,
            Represented by <Text style={styles.bold}>{agreement.companyRepresentative || 'Md. Nazrul Islam'}</Text>,
            Designation: {agreement.companyRepresentativeTitle || 'General Manager'}, (hereinafter referred to as the{' '}
            <Text style={styles.bold}>&quot;Consultant&quot;</Text> which expression shall, unless it be repugnant to the context or meaning
            thereof, be deemed to mean and include its successors and assigns) of the other part.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Recitals</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>WHEREAS</Text> the Owner is desirous of getting the Interior Design, Work and Execution for
          their proposed flat at {agreement.projectAddress || agreement.ownerAddress || 'Dhaka, Bangladesh'}.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>AND WHEREAS</Text> the Consultant is a Design and Build Contractor having vast experience in
          interior turnkey works and has agreed to do the interior works in the above-mentioned site.
        </Text>

        <Text style={styles.sectionTitle}>NOW IT IS AGREED BY AND BETWEEN BOTH PARTIES AS FOLLOWS:</Text>
        <View style={{ marginBottom: 6 }}>
          <View style={styles.clauseRow}>
            <Text style={styles.clauseNum}>1.</Text>
            <Text style={styles.clauseBody}>
              The Aesthetic Interior shall undertake and complete the design, supply, manufacturing, installation, execution,
              furnishing, and completion of the interior works of the Project in accordance with the terms and conditions of this
              Agreement, the approved Schedule of Rates, approved drawings and designs, material specifications, and any written
              instructions issued by the Owner or the Owner&apos;s duly authorized representative.
            </Text>
          </View>
          <View style={styles.clauseRow}>
            <Text style={styles.clauseNum}>2.</Text>
            <Text style={styles.clauseBody}>
              All works shall be carried out in accordance with the approved design, specifications, agreed quality standards, and
              applicable project requirements, under the supervision and coordination of the Owner&apos;s authorized representative,
              and to the reasonable satisfaction of the Owner, subject to the terms and conditions of this Agreement.
            </Text>
          </View>
          <View style={styles.clauseRow}>
            <Text style={styles.clauseNum}>3.</Text>
            <Text style={styles.clauseBody}>
              The detailed scope of work, description of works, specifications, Schedule of Rates, approved drawings, materials,
              finishes, and other contractual requirements shall constitute an integral part of this Agreement.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.bold, { fontSize: 8, textTransform: 'uppercase', marginBottom: 3 }]}>
            Contract Overview
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>Project: <Text style={{ color: PRIMARY, fontWeight: 'bold' }}>{agreement.projectName || agreement.ownerName}</Text></Text>
            <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>WO ID: <Text style={{ color: PRIMARY, fontWeight: 'bold' }}>{agreement.workOrderId}</Text></Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>Senior CRM: <Text style={{ color: PRIMARY }}>{agreement.srCrmName || 'Assigned Coordinator'}</Text></Text>
            <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>Agreement Value: <Text style={{ color: GOLD, fontWeight: 'bold' }}>৳ {formatDetailAmount(finalValue)}</Text></Text>
          </View>
        </View>

        <GlobalFooter workOrderId={agreement.workOrderId} reference={agreement.reference} />
      </Page>

      {/* ─── PAGE 3: QUOTATION SUMMARY & PAYMENT SCHEDULE ─────────── */}
      <Page size="A4" style={styles.page}>
        <WatermarkBackground />
        <GlobalHeader code={agreement.workOrderId} date={agreement.agreementDate} title="Quotation & Payment" />

        <Text style={styles.sectionTitle}>Quotation Summary</Text>
        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.thCol, { width: '8%', textAlign: 'center' }]}>SL</Text>
            <Text style={[styles.thCol, { width: '64%' }]}>ITEM NAME</Text>
            <Text style={[styles.thCol, { width: '28%', textAlign: 'right' }]}>TOTAL (৳)</Text>
          </View>

          {rows.length > 0 ? (
            rows.map((section, index) => (
              <View key={section.floor.id} style={[styles.tRow, index % 2 ? styles.tRowAlt : {}]}>
                <Text style={[styles.tdCol, { width: '8%', textAlign: 'center' }]}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={[styles.tdCol, { width: '64%' }]}>{section.floor.name}</Text>
                <Text style={[styles.tdCol, { width: '28%', textAlign: 'right' }]}>{formatDetailAmount(section.total)}</Text>
              </View>
            ))
          ) : (
            <>
              <View style={styles.tRow}>
                <Text style={[styles.tdCol, { width: '8%', textAlign: 'center' }]}>01</Text>
                <Text style={[styles.tdCol, { width: '64%' }]}>Interior Work</Text>
                <Text style={[styles.tdCol, { width: '28%', textAlign: 'right' }]}>{formatDetailAmount(subtotalValue)}</Text>
              </View>
              <View style={[styles.tRow, styles.tRowAlt]}>
                <Text style={[styles.tdCol, { width: '8%', textAlign: 'center' }]}>02</Text>
                <Text style={[styles.tdCol, { width: '64%', fontSize: 7, color: TEXT_MUTED }]}>
                  Electrical work (Approx) (The electricity bill will be calculated after the material approval meeting, as there are variations in many brands).
                </Text>
                <Text style={[styles.tdCol, { width: '28%', textAlign: 'right', color: TEXT_MUTED }]}>------</Text>
              </View>
              <View style={styles.tRow}>
                <Text style={[styles.tdCol, { width: '8%', textAlign: 'center' }]}>03</Text>
                <Text style={[styles.tdCol, { width: '64%', fontSize: 7, color: TEXT_MUTED }]}>
                  Paint work (We will submit the painting bill after installing all the cabinets for the project. However, the painting rates are specified in this agreement.)
                </Text>
                <Text style={[styles.tdCol, { width: '28%', textAlign: 'right', color: TEXT_MUTED }]}>------</Text>
              </View>
            </>
          )}

          <View style={styles.tRow}>
            <Text style={[styles.tdCol, { width: '8%' }]} />
            <Text style={[styles.tdCol, { width: '64%', fontWeight: 'bold', color: PRIMARY }]}>Total</Text>
            <Text style={[styles.tdCol, { width: '28%', textAlign: 'right', fontWeight: 'bold' }]}>
              {formatDetailAmount(subtotalValue)}
            </Text>
          </View>

          {discountAmount > 0 ? (
            <View style={styles.tRow}>
              <Text style={[styles.tdCol, { width: '8%' }]} />
              <Text style={[styles.tdCol, { width: '64%', fontWeight: 'bold', color: GOLD }]}>Honor / Discount</Text>
              <Text style={[styles.tdCol, { width: '28%', textAlign: 'right', fontWeight: 'bold', color: GOLD }]}>
                - {formatDetailAmount(discountAmount)}
              </Text>
            </View>
          ) : null}

          <View style={styles.totalsRow}>
            <Text style={[styles.thCol, { width: '8%' }]} />
            <Text style={[styles.thCol, { width: '64%', color: PRIMARY, fontSize: 8.5 }]}>Grand Total</Text>
            <Text style={[styles.thCol, { width: '28%', textAlign: 'right', color: PRIMARY, fontSize: 9 }]}>
              ৳ {formatDetailAmount(finalValue)}
            </Text>
          </View>
        </View>

        <View style={styles.inWordsBlock}>
          <Text style={styles.inWordsText}>In Word: {amountInWordsTaka(finalValue)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Payment Schedule</Text>
        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.thCol, { width: '8%', textAlign: 'center' }]}>SL</Text>
            <Text style={[styles.thCol, { width: '56%' }]}>Payment Stage</Text>
            <Text style={[styles.thCol, { width: '16%', textAlign: 'center' }]}>Percentage</Text>
            <Text style={[styles.thCol, { width: '20%', textAlign: 'right' }]}>Taka (৳)</Text>
          </View>

          {agreement.paymentSchedule.map((item, index) => (
            <View key={index} style={[styles.tRow, index % 2 ? styles.tRowAlt : {}]}>
              <Text style={[styles.tdCol, { width: '8%', textAlign: 'center' }]}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={[styles.tdCol, { width: '56%' }]}>{item.stage}</Text>
              <Text style={[styles.tdCol, { width: '16%', textAlign: 'center' }]}>{item.percentage}</Text>
              <Text style={[styles.tdCol, { width: '20%', textAlign: 'right' }]}>{item.amount}</Text>
            </View>
          ))}

          <View style={styles.totalsRow}>
            <Text style={[styles.thCol, { width: '8%' }]} />
            <Text style={[styles.thCol, { width: '56%', color: PRIMARY }]}>Total</Text>
            <Text style={[styles.thCol, { width: '16%', textAlign: 'center', color: PRIMARY }]}>
              {paymentPercentTotal.toFixed(2).replace(/\.00$/, '')}%
            </Text>
            <Text style={[styles.thCol, { width: '20%', textAlign: 'right', color: PRIMARY }]}>
              ৳ {formatDetailAmount(paymentAmountTotal || finalValue)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Annexures</Text>
        {agreement.annexures.map((item, index) => (
          <View key={index} style={{ marginBottom: 3 }}>
            <Text style={[styles.paragraph, { fontSize: 7.5, color: '#333333' }]}>
              <Text style={styles.bold}>Annexure A{index + 1}: </Text>
              {item.replace(/^Annexure\s*A\d+:\s*/i, '')}
            </Text>
          </View>
        ))}

        <GlobalFooter workOrderId={agreement.workOrderId} reference={agreement.reference} />
      </Page>

      {/* ─── PAGES 4+: DETAIL QUOTATION (EXACT DETAILQUOTATION DESIGN) ─── */}
      {quotation && rows.length > 0
        ? rows.map((entry) => (
            <Page key={entry.floor.id} size="A4" style={styles.detailPage}>
              <WatermarkBackground />
              <GlobalHeader
                code={agreement.workOrderId}
                date={agreement.agreementDate}
                title="Schedule of Rates"
                sidePadding={14}
              />

              <Text style={styles.detailSectionTitle}>{softWrapPdfText(entry.floor.name)}</Text>

              <View style={styles.detailTableWrapper}>
                <View style={styles.detailTHead}>
                  <Text style={[styles.detailThCol, styles.wSl]}>SL</Text>
                  <Text style={[styles.detailThCol, styles.wName]}>Name</Text>
                  <Text style={[styles.detailThCol, styles.wMats]}>Material Description</Text>
                  <Text style={[styles.detailThCol, styles.wQty]}>Qty/Sft</Text>
                  <Text style={[styles.detailThCol, styles.wPrice]}>U/P ({BDT_SYMBOL})</Text>
                  <Text style={[styles.detailThCol, styles.wTotal, styles.thColLast]}>Total ({BDT_SYMBOL})</Text>
                </View>

                {getAreaGroups(entry).map((area) => (
                  <View key={area.id}>
                    {area.name ? (
                      <View style={styles.areaTitleRow} wrap={false}>
                        <Text style={styles.areaTitleText}>{softWrapPdfText(area.name)}</Text>
                      </View>
                    ) : null}

                    {area.lines.map((line, lineIndex) => {
                      const isPkg = isPackageLine(line)
                      const nameLines = splitPdfTableLines(line.description, 14)
                      const materialLines = splitPdfTableLines(line.materials, 50)

                      let priceTextRaw = ''
                      if (isPkg) {
                        const userWritten = line.unitPriceLabel?.trim()
                        priceTextRaw = userWritten && userWritten !== 'as per project design' ? userWritten : '--'
                      } else {
                        priceTextRaw = formatDetailUnitPriceCurrency(line)
                      }

                      const priceLines = isPkg
                        ? splitPdfTableLines(priceTextRaw, 18)
                        : splitPdfTableLines(priceTextRaw, 9)

                      const isFinishingElectricalEntry =
                        Boolean(line.isFinishingElectrical) ||
                        entry.floor.sectionType === 'FINISHING_ELECTRICAL' ||
                        entry.floor.id === 'finishing-electrical-works-section' ||
                        Boolean(entry.floor.name && /finishing|electrical/i.test(entry.floor.name)) ||
                        Boolean(area.name && /finishing|electrical/i.test(area.name))

                      const feRate = Number.isFinite(line.rate) ? line.rate : 0
                      const feQty = Number.isFinite(line.quantity) ? line.quantity : 0
                      const isFEPackageMode =
                        isFinishingElectricalEntry && line.amount > 0 && !(feRate > 0 && feQty > 0)

                      let totalTextRaw = ''
                      if (isFinishingElectricalEntry) {
                        if (line.amount && line.amount > 0) {
                          totalTextRaw = `${formatDetailAmount(line.amount)}\n(approx.)`
                        } else {
                          totalTextRaw = '---'
                        }
                      } else if (isPkg) {
                        if (line.amount && line.amount > 0) {
                          totalTextRaw = formatDetailAmount(line.amount)
                        } else {
                          totalTextRaw = '---'
                        }
                      } else {
                        totalTextRaw = formatDetailTotalCurrency(line)
                      }
                      const totalLines = splitPdfTableLines(totalTextRaw, 9)

                      const tableLineCount = Math.max(
                        nameLines.length,
                        materialLines.length,
                        priceLines.length,
                        totalLines.length,
                      )
                      const rowCellStyle = {
                        paddingTop: DETAIL_ROW_VERTICAL_PADDING,
                        paddingBottom: DETAIL_ROW_VERTICAL_PADDING,
                      }
                      const slNumber = String(lineSlMap.get(line.id) ?? lineIndex + 1).padStart(2, '0')

                      return Array.from({ length: tableLineCount }, (_, rowIndex) => {
                        const isFirstMaterialRow = rowIndex === 0
                        const isLastSubRow = rowIndex === tableLineCount - 1
                        const nameText = nameLines[rowIndex] ?? ''
                        const matText = materialLines[rowIndex] ?? ''
                        const priceText = priceLines[rowIndex] ?? ''
                        const totalText = totalLines[rowIndex] ?? ''

                        return (
                          <View
                            key={`${line.id}-${rowIndex}`}
                            wrap={false}
                            style={[
                              styles.detailTRow,
                              lineIndex % 2 === 1 ? styles.detailTRowAlt : {},
                              !isLastSubRow ? { borderBottomWidth: 0 } : {},
                            ]}
                          >
                            <Text style={[styles.detailTdCol, styles.wSl, styles.bold, rowCellStyle]}>
                              {isFirstMaterialRow ? slNumber : ''}
                            </Text>
                            <Text wrap={false} style={[styles.detailTdCol, styles.wName, rowCellStyle]}>
                              {nameText ? softWrapPdfText(nameText) : ''}
                            </Text>
                            <View style={[styles.detailTdCol, styles.wMats, styles.matCell, rowCellStyle]}>
                              <SingleMaterialLine
                                text={matText}
                                isFirstRowAndEmpty={isFirstMaterialRow && !line.materials?.trim()}
                              />
                            </View>
                            {isFEPackageMode ? (
                              <Text
                                style={[
                                  styles.detailTdCol,
                                  { width: '22%', textAlign: 'center' },
                                  rowCellStyle,
                                  { fontSize: 8.5 },
                                ]}
                              >
                                {isFirstMaterialRow ? 'Package' : ''}
                              </Text>
                            ) : (
                              <>
                                <Text
                                  style={[
                                    styles.detailTdCol,
                                    styles.wQty,
                                    rowCellStyle,
                                    { fontSize: 8.5 },
                                  ]}
                                >
                                  {isFirstMaterialRow ? (isPkg ? 'Package' : formatDetailQtyCell(line)) : ''}
                                </Text>
                                <Text
                                  style={[
                                    styles.detailTdCol,
                                    styles.wPrice,
                                    rowCellStyle,
                                    { fontSize: 8.5 },
                                  ]}
                                >
                                  {isFirstMaterialRow ? (priceText ? softWrapPdfText(priceText) : '') : ''}
                                </Text>
                              </>
                            )}
                            <Text
                              style={[
                                styles.detailTdCol,
                                styles.wTotal,
                                styles.thColLast,
                                styles.bold,
                                { color: PRIMARY },
                                rowCellStyle,
                              ]}
                            >
                              {totalText ? softWrapPdfText(totalText) : ''}
                            </Text>
                          </View>
                        )
                      })
                    })}

                    {area.name &&
                    area.name !== 'Finishing & Electrical Works' &&
                    area.name !== 'Finishing & Electrical' ? (
                      <View style={[styles.detailTRow, styles.areaTotalRow]} wrap={false}>
                        <Text style={[styles.detailTdCol, styles.wSl]} />
                        <Text style={[styles.detailTdCol, styles.wName]} />
                        <Text style={[styles.detailTdCol, styles.wMats, styles.bold, styles.areaTotalLabel]}>
                          TOTAL FOR {softWrapPdfText(area.name).toUpperCase()}
                        </Text>
                        <Text style={[styles.detailTdCol, styles.wQty]} />
                        <Text style={[styles.detailTdCol, styles.wPrice]} />
                        <Text
                          style={[
                            styles.detailTdCol,
                            styles.wTotal,
                            styles.thColLast,
                            styles.bold,
                            { color: PRIMARY },
                          ]}
                        >
                          ৳ {formatDetailAmount(area.lines.reduce((s, l) => s + l.amount, 0))}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>

              {entry.total > 0 ? (
                <>
                  <View style={[styles.grandTotalRow, { marginTop: 12 }]} wrap={false}>
                    <Text style={styles.grandTotalLabel}>
                      TOTAL FOR {softWrapPdfText(entry.floor.name).toUpperCase()}
                    </Text>
                    <Text style={styles.grandTotalValue}>
                      ৳ {formatDetailAmount(entry.total)}
                      {entry.floor.sectionType === 'FINISHING_ELECTRICAL' ||
                      entry.floor.name === 'Finishing & Electrical Works'
                        ? ' (approx.)'
                        : ''}
                    </Text>
                  </View>
                  <Text style={styles.inWords}>In Words: {amountInWordsTaka(entry.total)}</Text>
                </>
              ) : null}

              <GlobalFooter
                workOrderId={agreement.workOrderId}
                reference={agreement.reference}
                sidePadding={14}
              />
            </Page>
          ))
        : null}

      {/* ─── PAGES AFTER DETAIL QUOTATION: AGREEMENT CLAUSES ───────── */}
      {agreement.clauseGroups.map((group, groupIndex) => (
        <Page key={group.title || groupIndex} size="A4" style={styles.page}>
          <WatermarkBackground />
          <GlobalHeader code={agreement.workOrderId} date={agreement.agreementDate} title="Agreement Clauses" />

          <View style={styles.titleBanner}>
            <Text style={styles.docTitle}>AGREEMENT CLAUSES</Text>
            <Text style={styles.docSubTitle}>
              Section {groupIndex + 1}: {group.title}
            </Text>
          </View>

          {group.clauses.map((clause, index) => {
            const colonIndex = clause.indexOf(':')
            const hasHeader = colonIndex > 0 && colonIndex < 40
            const header = hasHeader ? clause.slice(0, colonIndex + 1) : null
            const body = hasHeader ? clause.slice(colonIndex + 1).trim() : clause

            return (
              <View key={index} style={styles.clauseRow} wrap={false}>
                <Text style={styles.clauseNum}>
                  {groupIndex + 1}.{index + 1}
                </Text>
                <Text style={styles.clauseBody}>
                  {header ? <Text style={styles.bold}>{header} </Text> : null}
                  {body}
                </Text>
              </View>
            )
          })}

          <GlobalFooter workOrderId={agreement.workOrderId} reference={agreement.reference} />
        </Page>
      ))}

      {/* ─── FINAL PAGE: SIGNATURES, WITNESSES & ACKNOWLEDGEMENT ──── */}
      <Page size="A4" style={styles.page}>
        <WatermarkBackground />
        <GlobalHeader code={agreement.workOrderId} date={agreement.agreementDate} title="Signatures" />

        <View style={styles.titleBanner}>
          <Text style={styles.docTitle}>SIGNATURES & ACKNOWLEDGEMENT</Text>
        </View>

        <Text style={[styles.paragraph, { marginTop: 4, lineHeight: 1.5 }]}>
          <Text style={styles.bold}>IN WITNESS WHEREOF</Text>, the Parties hereto, having read, understood, and agreed to all
          the terms and conditions contained in this Agreement, have caused this Agreement to be duly executed by their
          respective duly authorized representatives on the date first written above.
        </Text>
        <Text style={[styles.paragraph, { lineHeight: 1.5 }]}>
          The Parties confirm that they have entered into this Agreement voluntarily, with free consent, and with full authority
          to undertake and perform the obligations stated herein. This Agreement shall become effective upon execution by the
          authorized representatives of both Parties and shall be binding upon the Parties and their respective successors and
          permitted assigns, subject to the applicable laws of Bangladesh.
        </Text>

        <Text style={styles.sectionTitle}>Witnesses</Text>
        <View style={styles.witnessGrid}>
          {agreement.witnessNames.map((name, index) => (
            <View key={index} style={styles.witnessCol}>
              <Text style={{ fontSize: 6.5, color: TEXT_MUTED, marginBottom: 10 }}>Witness {index + 1}</Text>
              <Text style={styles.sigName}>{name || `1. __________________`}</Text>
              <Text style={styles.sigRole}>Signature &amp; Date</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={styles.sigRow}>
            <View style={styles.sigBlock}>
              <Text style={styles.sigName}>{agreement.ownerName || clientName}</Text>
              <Text style={styles.sigRole}>Owner (Project)</Text>
              <Text style={styles.sigRole}>Date: {agreement.agreementDate}</Text>
            </View>
            <View style={styles.sigBlock}>
              <Text style={styles.sigName}>{agreement.ceoName || 'Md Johirul Islam'}</Text>
              <Text style={styles.sigRole}>Chief Executive Officer (CEO)</Text>
              <Text style={styles.sigRole}>Aesthetic Interior</Text>
            </View>
          </View>
        </View>

        {/* General Manager Official Acknowledgment Block */}
        <View style={styles.gmCard}>
          <Text style={[styles.bold, { fontSize: 8, color: PRIMARY, marginBottom: 3, textTransform: 'uppercase' }]}>
            Consultant Declaration &amp; Acknowledgment
          </Text>
          <Text style={[styles.paragraph, { fontSize: 7, color: '#333333', marginBottom: 6, lineHeight: 1.4 }]}>
            I, <Text style={styles.bold}>{agreement.companyRepresentative || 'Md. Nazrul Islam'}</Text>,{' '}
            {agreement.companyRepresentativeTitle || 'General Manager'} of Aesthetic Interior, hereby confirm that I am fully
            aware of and have reviewed the terms and conditions of this Work Order/Agreement, including the approved scope of
            work, Schedule of Rates, specifications, payment terms, project timeline, and other contractual requirements. I
            acknowledge that the contents of this Work Order/Agreement have been duly communicated to and understood by the
            concerned management and project team of Aesthetic Interior, and that the Company shall execute the Project in
            accordance with the agreed contractual terms and conditions.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 3, borderTopWidth: 0.5, borderTopColor: BORDER, width: '45%' }}>
            <Text style={{ fontSize: 6.5, color: TEXT_MUTED }}>Acknowledged by:</Text>
            <Text style={[styles.sigName, { marginTop: 1 }]}>{agreement.companyRepresentative || 'Md. Nazrul Islam'}</Text>
            <Text style={styles.sigRole}>{agreement.companyRepresentativeTitle || 'General Manager (GM)'}</Text>
            <Text style={styles.sigRole}>Aesthetic Interior</Text>
          </View>
        </View>

        <GlobalFooter workOrderId={agreement.workOrderId} reference={agreement.reference} />
      </Page>
    </Document>
  )
}
