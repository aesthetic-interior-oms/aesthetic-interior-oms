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

import { amountInWordsTaka } from '@/lib/number-to-words'
import { buildShortQuotationSummary, formatShortQuotationDate } from '@/lib/short-quotation-calculations'
import type { ShortQuotationContent } from '@/lib/short-quotation-types'

const PRIMARY = '#0f5b53'

const styles = StyleSheet.create({
  page: { paddingTop: 110, paddingBottom: 90, paddingLeft: 40, paddingRight: 40, fontSize: 9, fontFamily: 'Noto Sans Bengali', color: '#000', backgroundColor: '#fff', lineHeight: 1.4 },
  header: { position: 'absolute', top: 40, left: 40, right: 40 },
  bold: { fontWeight: 'bold', color: '#000' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: PRIMARY, backgroundColor: '#e6f0ef', padding: 8, marginTop: 15, textTransform: 'uppercase' },
  tHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: PRIMARY, paddingBottom: 6, paddingTop: 10 },
  thCol: { fontSize: 8, fontWeight: 'bold', color: PRIMARY, textTransform: 'uppercase', paddingHorizontal: 4 },
  tRow: { flexDirection: 'row', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#eeeeee' },
  tRowAlt: { backgroundColor: '#f5f5ea' },
  tdCol: { fontSize: 9, paddingVertical: 8, paddingHorizontal: 4 },
  wSl: { width: '8%', textAlign: 'center' },
  wSumName: { width: '70%', paddingLeft: 10 },
  wSumTotal: { width: '22%', textAlign: 'right' },
  wName: { width: '42%' },
  wQty: { width: '12%', textAlign: 'center' },
  wPrice: { width: '18%', textAlign: 'right' },
  wTotal: { width: '20%', textAlign: 'right' },
  grandTotalRow: { flexDirection: 'row', paddingTop: 8, marginTop: 5, borderTopWidth: 1, borderTopColor: PRIMARY },
  grandTotalLabel: { width: '78%', textAlign: 'right', paddingRight: 10, fontWeight: 'bold', fontSize: 10, color: PRIMARY },
  grandTotalValue: { width: '22%', textAlign: 'right', fontWeight: 'bold', fontSize: 10, color: PRIMARY },
  inWords: { fontSize: 8, color: '#666', marginTop: 4, textAlign: 'right' },
  footerFixed: { position: 'absolute', bottom: 20, left: 40, right: 40, paddingTop: 8 },
  footerText: { fontSize: 7, color: '#666', marginLeft: 4 },
})

function formatAmount(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}
function formatCurrency(value: number) {
  return `৳ ${formatAmount(value)}`
}
function getQuoteId(date: string) {
  const timestamp = Date.parse(date)
  const suffix = Number.isNaN(timestamp) ? '000000' : timestamp.toString().slice(-6)
  return `QTN-${suffix}`
}

const WatermarkBackground = () => (
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: -1, opacity: 0.05 }} fixed>
    <Image src={`${getBaseUrl()}/android-chrome-512x512.png`} style={{ width: 400, height: 400 }} />
  </View>
)

const GlobalHeader = ({ date }: { date: string }) => (
  <View style={styles.header} fixed>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 10 }}>
      <View style={{ flex: 1 }}><Image src={`${getBaseUrl()}/Logo/HeaderLogo.png`} style={{ width: 140 }} /></View>
      <View style={{ width: '50%', alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 9, color: '#555', marginBottom: 3 }}><Text style={styles.bold}>Quote ID:</Text> {getQuoteId(date)}</Text>
        <Text style={{ fontSize: 9, color: '#555' }}><Text style={styles.bold}>Date:</Text> {formatShortQuotationDate(date)}</Text>
      </View>
    </View>
  </View>
)

const FooterFixed = () => (
  <View style={styles.footerFixed} fixed>
    <View style={{ borderTopWidth: 1, borderTopColor: '#a57c00', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ width: '35%' }}>
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold', marginBottom: 3 }]}>Aesthetic Interior Studio</Text>
        <Text style={styles.footerText}>183, East Senpara, Begum Rokeya Soroni</Text>
        <Text style={styles.footerText}>3rd floor, Mirpur 10, Dhaka-1216</Text>
      </View>
      <View style={{ width: '30%', alignItems: 'center' }}>
        <Text style={styles.footerText}>+88 0132969 4663</Text>
        <Text style={styles.footerText}>hello@aestheticinterior.com</Text>
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold' }]}>www.aestheticinteriorbd.com</Text>
      </View>
      <View style={{ width: '35%', alignItems: 'flex-end', justifyContent: 'flex-end' }}><Text style={styles.footerText}>© 2026 All rights reserved.</Text></View>
    </View>
  </View>
)

export function ShortQuotationDocument({ content }: { content: ShortQuotationContent }) {
  const summary = buildShortQuotationSummary(content)
  const cleanIntro = (content.introLetter || '').replace('Dear Sir,\n', '').replace('Dear Sir,', '').trim()

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <WatermarkBackground /><GlobalHeader date={content.quotationDate} />
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 7, color: '#a57c00', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Prepared For</Text>
          <Text style={[styles.bold, { fontSize: 13, color: PRIMARY, marginBottom: 2 }]}>{content.clientName}</Text>
          <Text style={{ fontSize: 10, color: '#555' }}>{content.clientAddress}</Text>
        </View>
        {content.subject ? <Text style={{ fontSize: 9, marginBottom: 8 }}><Text style={styles.bold}>Subject: </Text>{content.subject}</Text> : null}
        {cleanIntro ? <View style={{ marginBottom: 20 }}><Text style={[styles.bold, { fontSize: 9, marginBottom: 3 }]}>Dear Sir,</Text><Text style={{ fontSize: 9, textAlign: 'justify' }}>{cleanIntro}</Text></View> : null}
        <Text style={styles.sectionTitle}>{content.packageTier} Short Quotation Summary</Text>
        <View style={styles.tHead}><Text style={[styles.thCol, styles.wSl]}>SL</Text><Text style={[styles.thCol, styles.wSumName]}>Description</Text><Text style={[styles.thCol, styles.wSumTotal]}>Amount</Text></View>
        {summary.floors.map((entry, index) => <View key={entry.floor.id} style={[styles.tRow, index % 2 === 1 ? styles.tRowAlt : {}]}><Text style={[styles.tdCol, styles.wSl]}>{String(index + 1).padStart(2, '0')}</Text><Text style={[styles.tdCol, styles.wSumName, styles.bold]}>{entry.floor.name}</Text><Text style={[styles.tdCol, styles.wSumTotal, styles.bold]}>{formatCurrency(entry.total)}</Text></View>)}
        <View style={styles.grandTotalRow}><Text style={styles.grandTotalLabel}>Grand Total</Text><Text style={styles.grandTotalValue}>{formatCurrency(summary.grandTotal)}</Text></View>
        <Text style={styles.inWords}>In Words: <Text style={styles.bold}>{amountInWordsTaka(summary.grandTotal)}</Text></Text>
        <FooterFixed />
      </Page>
      {summary.floors.map((floor) => <Page key={floor.floor.id} size="A4" style={styles.page}><WatermarkBackground /><GlobalHeader date={content.quotationDate} /><Text style={styles.sectionTitle}>{floor.floor.name}</Text><View style={styles.tHead}><Text style={[styles.thCol, styles.wSl]}>SL</Text><Text style={[styles.thCol, styles.wName]}>Name</Text><Text style={[styles.thCol, styles.wQty]}>Qty/Sft</Text><Text style={[styles.thCol, styles.wPrice]}>Unit Price</Text><Text style={[styles.thCol, styles.wTotal]}>Total</Text></View>{floor.rooms.map((room) => <View key={room.room.id}><Text style={[styles.sectionTitle, { fontSize: 9, marginTop: 10 }]}>{room.room.name}</Text>{room.lines.map((line, index) => <View key={line.id} style={[styles.tRow, index % 2 === 1 ? styles.tRowAlt : {}]}><Text style={[styles.tdCol, styles.wSl]}>{String(index + 1).padStart(2, '0')}</Text><Text style={[styles.tdCol, styles.wName, styles.bold]}>{line.name}</Text><Text style={[styles.tdCol, styles.wQty]}>{line.isLumpSum ? 'Package' : formatAmount(line.quantitySqft ?? 0)}</Text><Text style={[styles.tdCol, styles.wPrice]}>{line.isLumpSum ? '—' : formatCurrency(line.unitPrice ?? 0)}</Text><Text style={[styles.tdCol, styles.wTotal, styles.bold, { color: PRIMARY }]}>{formatCurrency(line.total)}</Text></View>)}</View>)}<View style={styles.grandTotalRow}><Text style={styles.grandTotalLabel}>Total for {floor.floor.name}</Text><Text style={styles.grandTotalValue}>{formatCurrency(floor.total)}</Text></View><Text style={styles.inWords}>In Words: <Text style={styles.bold}>{amountInWordsTaka(floor.total)}</Text></Text><FooterFixed /></Page>)}
      {content.footerNotes.length > 0 ? <Page size="A4" style={styles.page}><WatermarkBackground /><GlobalHeader date={content.quotationDate} /><Text style={styles.sectionTitle}>Terms &amp; Notes</Text>{content.footerNotes.map((note, index) => <Text key={index} style={{ fontSize: 9, marginTop: 8 }}><Text style={[styles.bold, { color: PRIMARY }]}>{index + 1}. </Text>{note}</Text>)}<FooterFixed /></Page> : null}
    </Document>
  )
}
