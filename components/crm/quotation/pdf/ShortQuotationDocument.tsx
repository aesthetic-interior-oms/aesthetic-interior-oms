'use client'

import { Document, Page, StyleSheet, Text, View, Image, Font } from '@react-pdf/renderer'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://www.aestheticinteriorbd.com'
}

Font.register({
  family: 'Noto Sans Bengali',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSansBengali-Regular.ttf` },
    { src: `${getBaseUrl()}/fonts/NotoSansBengali-Bold.ttf`, fontWeight: 'bold' },
  ],
})

Font.register({
  family: 'Playfair Display',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/playfairdisplay/v10/9MkijrV-dEJ0-_NWV7E6N218GKU_F_kIyfK-gGC-Yzs.ttf',
      fontStyle: 'italic',
    },
  ],
})

import { amountInWordsTaka } from '@/lib/number-to-words'
import { buildShortQuotationSummary, formatShortQuotationDate } from '@/lib/short-quotation-calculations'
import type { ShortQuotationContent } from '@/lib/short-quotation-types'

const PRIMARY = '#1f363d'
const GOLD = '#a57c00'
const HEADER_RESERVED_SPACE = 96
const FOOTER_RESERVED_SPACE = 122

const styles = StyleSheet.create({
  page: { paddingTop: HEADER_RESERVED_SPACE, paddingBottom: FOOTER_RESERVED_SPACE, paddingLeft: 28, paddingRight: 28, fontSize: 9, fontFamily: 'Noto Sans Bengali', color: '#000', backgroundColor: '#fff', lineHeight: 1.4 },
  header: { position: 'absolute', top: 20, left: 28, right: 28, height: 58, paddingHorizontal: 0, overflow: 'hidden' },
  bold: { fontWeight: 'bold', color: '#000' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: PRIMARY, backgroundColor: '#f3f8f7', padding: 8, marginTop: 15, marginBottom: 8, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1.5, borderBottomWidth: 1, borderBottomColor: PRIMARY },
  tHead: { flexDirection: 'row', borderTopWidth: 0.75, borderLeftWidth: 0.75, borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: '#d7d7d7' },
  thCol: { fontSize: 10, fontWeight: 'bold', color: PRIMARY, textTransform: 'uppercase', paddingVertical: 1, paddingHorizontal: 4 },
  tRow: { flexDirection: 'row', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#eeeeee' },
  tRowAlt: { backgroundColor: '#fefdf9' },
  tdCol: { fontSize: 10, paddingVertical: 6, paddingHorizontal: 4, borderRightWidth: 0.5, borderRightColor: '#d7d7d7' },
  roomTitleRow: { backgroundColor: '#f3f8f7', borderLeftWidth: 0.75, borderRightWidth: 0.75, borderBottomWidth: 0.5, borderColor: '#d7d7d7', paddingVertical: 5, paddingHorizontal: 8 },
  roomTitleText: { fontSize: 10, fontWeight: 'bold', color: PRIMARY, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2 },
  packageBadge: { alignSelf: 'center', borderRadius: 8, backgroundColor: '#fff8e6', color: GOLD, fontSize: 7, fontWeight: 'bold', paddingVertical: 2, paddingHorizontal: 5, textTransform: 'uppercase' },
  wSumSl: { width: '8%', textAlign: 'center' },
  wSl: { width: '6%', textAlign: 'center' },
  wSumName: { width: '52%', paddingLeft: 10 },
  wSumSqft: { width: '18%', textAlign: 'right' },
  wSumTotal: { width: '22%', textAlign: 'right' },
  summaryFloorRow: { backgroundColor: '#f3f8f7' },
  summaryRoomRow: { backgroundColor: '#ffffff' },
  summaryRoomName: { paddingLeft: 22, color: '#555' },
  wName: { width: '50%' },
  wQty: { width: '12%', textAlign: 'center' },
  wPrice: { width: '15%', textAlign: 'right' },
  wTotal: { width: '17%', textAlign: 'right' },
  grandTotalRow: { flexDirection: 'row', paddingTop: 8, marginTop: 5, borderTopWidth: 1, borderTopColor: PRIMARY },
  grandTotalLabel: { width: '78%', textAlign: 'right', paddingRight: 10, fontWeight: 'bold', fontSize: 10, color: PRIMARY },
  grandTotalValue: { width: '22%', textAlign: 'right', fontWeight: 'bold', fontSize: 10, color: PRIMARY },
  inWords: { fontSize: 10, color: '#000', marginTop: 8, textAlign: 'left', fontFamily: 'Playfair Display', fontStyle: 'italic' },
  datePanel: { minWidth: 112, alignItems: 'flex-end' },
  metaLabel: { fontSize: 6, color: GOLD, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 7, color: PRIMARY, fontWeight: 'bold', textAlign: 'right' },
  headerPattern: { position: 'absolute', top: 0, left: 0, right: 0, height: 58, opacity: 0.08 },
  headerRuleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerRule: { height: 2.2, backgroundColor: PRIMARY },
  headerTitle: { color: PRIMARY, fontSize: 10, fontFamily: 'Times-Italic', letterSpacing: 2.4, marginHorizontal: 12, textTransform: 'uppercase' },
  footerFixed: { position: 'absolute', bottom: 14, left: 28, right: 28, paddingTop: 8, paddingBottom: 6 },
  footerDivider: { height: 1.4, backgroundColor: GOLD, marginBottom: 8 },
  footerText: { fontSize: 7, color: '#666', marginLeft: 4 },
  footerMeta: { fontSize: 5.5, color: '#8a8a8a', marginTop: 5, textAlign: 'right' },
})

function formatAmount(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}
function formatCurrency(value: number) {
  return formatAmount(value)
}

function getRoomSqft(room: ReturnType<typeof buildShortQuotationSummary>['floors'][number]['rooms'][number]) {
  return Math.round(
    room.lines.reduce((sum, line) => {
      if (line.isLumpSum || !line.quantitySqft || line.quantitySqft <= 0) return sum
      return sum + line.quantitySqft
    }, 0),
  )
}

function getFloorSqft(floor: ReturnType<typeof buildShortQuotationSummary>['floors'][number]) {
  return Math.round(floor.rooms.reduce((sum, room) => sum + getRoomSqft(room), 0))
}

function getTotalSqft(summary: ReturnType<typeof buildShortQuotationSummary>) {
  return Math.round(summary.floors.reduce((sum, floor) => sum + getFloorSqft(floor), 0))
}

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

const WatermarkBackground = () => (
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: -1, opacity: 0.05 }} fixed>
    <Image src={`${getBaseUrl()}/android-chrome-512x512.png`} style={{ width: 400, height: 400 }} />
  </View>
)

const GlobalHeader = ({ content, showDate = true }: { content: ShortQuotationContent; showDate?: boolean }) => (
  <View style={styles.header} fixed>
    <Image src={`${getBaseUrl()}/backgrounddata.svg`} style={styles.headerPattern} />
    <View style={{ paddingTop: 8 }}>
      <View style={styles.headerRuleRow}>
        <View style={[styles.headerRule, { flexGrow: 1.65 }]} />
        <Text style={styles.headerTitle}>Quotation</Text>
        <View style={[styles.headerRule, { flexGrow: 0.85 }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}><Image src={`${getBaseUrl()}/Logo/HeaderLogo.png`} style={{ width: 154 }} /></View>
        <View style={styles.datePanel}>
          {showDate ? (
            <>
              <Text style={[styles.metaLabel, { textAlign: 'right' }]}>Quotation Date</Text>
              <Text style={styles.metaValue}>{formatShortQuotationDate(content.quotationDate)}</Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  </View>
)

const FooterFixed = ({ content }: { content: ShortQuotationContent }) => (
  <View style={styles.footerFixed} fixed>
    <View style={styles.footerDivider} />
    <View style={{ paddingTop: 2, flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ width: '48%' }}>
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold', marginBottom: 3 }]}>Aesthetic Interior Studio</Text>
        <Text style={styles.footerText}>183, East Senpara, Begum Rokeya Soroni</Text>
        <Text style={styles.footerText}>3rd floor, Mirpur 10, Dhaka-1216</Text>
      </View>
      <View style={{ width: '48%', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        <Text style={styles.footerText}>+88 0132969 4663</Text>
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold' }]}>www.aestheticinteriorbd.com</Text>
        <Text style={styles.footerText}>© 2026 All rights reserved.</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
      <Text style={[styles.footerMeta, { marginTop: 0, textAlign: 'left' }]}>Quotation Code: {content.quotationCode ?? 'Not generated yet'}</Text>
      <Text style={[styles.footerMeta, { marginTop: 0, textAlign: 'right' }]}>Generated: {formatDownloadDateTime(content.downloadedAt)}</Text>
    </View>
  </View>
)

export function ShortQuotationDocument({ content }: { content: ShortQuotationContent }) {
  const summary = buildShortQuotationSummary(content)
  const cleanIntro = (content.introLetter || '').replace('Dear Sir,\n', '').replace('Dear Sir,', '').trim()
  const lineSerials = new Map<string, number>()
  summary.floors.forEach((floor) => {
    floor.rooms.forEach((room) => {
      room.lines.forEach((line) => lineSerials.set(line.id, lineSerials.size + 1))
    })
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <WatermarkBackground /><GlobalHeader content={content} />
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 7, color: '#a57c00', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Prepared For</Text>
          <Text style={[styles.bold, { fontSize: 12, color: PRIMARY, marginBottom: 4, lineHeight: 1.25 }]}>{content.clientName}</Text>
          <Text style={{ fontSize: 10, color: '#555', lineHeight: 1.4 }}>{content.clientAddress}</Text>
        </View>
        {content.subject ? <Text style={{ fontSize: 10, marginBottom: 8 }}><Text style={styles.bold}>Subject: </Text>{content.subject}</Text> : null}
        {cleanIntro ? <View style={{ marginBottom: 8 }}><Text style={[styles.bold, { fontSize: 10, marginBottom: 8 }]}>Dear Sir,</Text><Text style={{ fontSize: 10, textAlign: 'justify', lineHeight: 1.5 }}>{cleanIntro}</Text></View> : null}
        <Text style={styles.sectionTitle}>{content.packageTier} Short Quotation Summary</Text>
        <View style={[styles.tHead, { borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }]}><Text style={[styles.thCol, styles.wSumSl]}>SL</Text><Text style={[styles.thCol, styles.wSumName]}>Description</Text><Text style={[styles.thCol, styles.wSumSqft]}>Sqft</Text><Text style={[styles.thCol, styles.wSumTotal]}>Amount</Text></View>
        {summary.floors.map((entry, index) => (
          <View key={entry.floor.id}>
            <View style={[styles.tRow, styles.summaryFloorRow]}>
              <Text style={[styles.tdCol, styles.wSumSl, { borderRightWidth: 0 }]}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={[styles.tdCol, styles.wSumName, styles.bold, { borderRightWidth: 0 }]}>{softWrapPdfText(entry.floor.name)}</Text>
              <Text style={[styles.tdCol, styles.wSumSqft, styles.bold, { borderRightWidth: 0 }]}>{formatAmount(getFloorSqft(entry))}</Text>
              <Text style={[styles.tdCol, styles.wSumTotal, styles.bold, { borderRightWidth: 0 }]}>{formatCurrency(entry.total)}</Text>
            </View>
            {entry.rooms.map((room) => (
              <View key={`${entry.floor.id}-${room.room.id}`} style={[styles.tRow, styles.summaryRoomRow]}>
                <Text style={[styles.tdCol, styles.wSumSl, { borderRightWidth: 0 }]} />
                <Text style={[styles.tdCol, styles.wSumName, styles.summaryRoomName, { borderRightWidth: 0 }]}>• {softWrapPdfText(room.room.name)}</Text>
                <Text style={[styles.tdCol, styles.wSumSqft, { borderRightWidth: 0 }]}>{formatAmount(getRoomSqft(room))}</Text>
                <Text style={[styles.tdCol, styles.wSumTotal, { borderRightWidth: 0 }]}>{formatCurrency(room.total)}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={styles.grandTotalRow}><Text style={styles.grandTotalLabel}>TOTAL SQFT</Text><Text style={styles.grandTotalValue}>{formatAmount(getTotalSqft(summary))}</Text></View>
        <View style={[styles.grandTotalRow, { marginTop: 0, borderTopWidth: 0 }]}><Text style={styles.grandTotalLabel}>GRAND TOTAL</Text><Text style={styles.grandTotalValue}>{formatCurrency(summary.grandTotal)}</Text></View>
        <Text style={styles.inWords}>In Words: {amountInWordsTaka(summary.grandTotal)}</Text>
        <FooterFixed content={content} />
      </Page>
        {summary.floors.map((floor, floorIndex) => <Page key={floor.floor.id} size="A4" style={styles.page}><WatermarkBackground /><GlobalHeader content={content} showDate={false} /><Text style={styles.sectionTitle}>{softWrapPdfText(floor.floor.name)}</Text><View style={styles.tHead}><Text style={[styles.thCol, styles.wSl]}>SL</Text><Text style={[styles.thCol, styles.wName]}>Name</Text><Text style={[styles.thCol, styles.wQty]}>Qty/Sft</Text><Text style={[styles.thCol, styles.wPrice]}>Unit Price</Text><Text style={[styles.thCol, styles.wTotal]}>Total</Text></View>{floor.rooms.map((room) => <View key={room.room.id}><View style={styles.roomTitleRow}><Text style={styles.roomTitleText}>{softWrapPdfText(room.room.name)}</Text></View>{room.lines.map((line, index) => <View key={line.id} style={[styles.tRow, index % 2 === 1 ? styles.tRowAlt : {}]}><Text style={[styles.tdCol, styles.wSl]}>{String(lineSerials.get(line.id) ?? index + 1).padStart(2, '0')}</Text><Text style={[styles.tdCol, styles.wName, styles.bold]}>{softWrapPdfText(line.name)}</Text><View style={[styles.tdCol, styles.wQty]}>{line.isLumpSum ? <Text style={styles.packageBadge}>Package</Text> : <Text>{formatAmount(line.quantitySqft ?? 0)}</Text>}</View><Text style={[styles.tdCol, styles.wPrice]}>{line.isLumpSum ? '--' : formatAmount(line.unitPrice ?? 0)}</Text><Text style={[styles.tdCol, styles.wTotal, styles.bold, { color: PRIMARY }]}>{formatAmount(line.total)}</Text></View>)}<View style={{ marginTop: 4, flexDirection: 'row', justifyContent: 'flex-end' }}><Text style={{ fontSize: 9, fontWeight: 'bold', color: PRIMARY, paddingRight: 10 }}>TOTAL FOR {softWrapPdfText(room.room.name).toUpperCase()}</Text><Text style={{ fontSize: 9, fontWeight: 'bold', color: PRIMARY }}>{formatAmount(room.total)}</Text></View></View>)}<View style={styles.grandTotalRow}><Text style={styles.grandTotalLabel}>TOTAL FOR {softWrapPdfText(floor.floor.name).toUpperCase()}</Text><Text style={styles.grandTotalValue}>{formatCurrency(floor.total)}</Text></View><Text style={styles.inWords}>In Words: {amountInWordsTaka(floor.total)}</Text>{floorIndex === summary.floors.length - 1 && content.footerNotes.length > 0 ? <View style={{ marginTop: 18 }}><Text style={styles.sectionTitle}>Notes</Text>{content.footerNotes.map((note, index) => <Text key={index} style={{ fontSize: 10, marginTop: 8 }}><Text style={[styles.bold, { color: PRIMARY }]}>{index + 1}. </Text>{softWrapPdfText(note)}</Text>)}</View> : null}<FooterFixed content={content} /></Page>)}
    </Document>
  )
}
