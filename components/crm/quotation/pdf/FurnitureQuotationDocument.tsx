'use client'

import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { amountInWordsTaka } from '@/lib/number-to-words'
import type { FurnitureQuotationContent, FurnitureQuotationItem } from '@/lib/furniture-quotation-template'

const getBaseUrl = () => typeof window !== 'undefined' ? window.location.origin : 'https://www.aestheticinteriorbd.com'
const PRIMARY = '#1f363d'
const GOLD = '#a57c00'
const BORDER = '#d7d7d7'
const PAGE_SIDE_PADDING = 7

Font.register({
  family: 'Noto Sans Bengali',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSansBengali-Regular.ttf` },
    { src: `${getBaseUrl()}/fonts/NotoSansBengali-Bold.ttf`, fontWeight: 'bold' },
  ],
})
Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: { paddingTop: 78, paddingBottom: 104, paddingLeft: PAGE_SIDE_PADDING, paddingRight: PAGE_SIDE_PADDING, fontFamily: 'Noto Sans Bengali', fontSize: 9, color: '#000', backgroundColor: '#fff', lineHeight: 1.4 },
  header: { position: 'absolute', top: 20, left: PAGE_SIDE_PADDING, right: PAGE_SIDE_PADDING, height: 58, overflow: 'hidden' },
  headerPattern: { position: 'absolute', top: 0, left: 0, right: 0, height: 58, opacity: 0.08 },
  headerRuleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerRule: { height: 2.2, backgroundColor: PRIMARY },
  headerTitle: { color: PRIMARY, fontSize: 10, fontFamily: 'Times-Roman', fontStyle: 'italic', letterSpacing: 2, marginHorizontal: 12, textTransform: 'uppercase' },
  datePanel: { minWidth: 130, alignItems: 'flex-end' },
  metaLabel: { fontSize: 6, color: GOLD, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 9.5, color: PRIMARY, fontWeight: 'bold', textAlign: 'right' },
  watermark: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: -1, opacity: 0.05 },
  client: { marginBottom: 16 },
  clientLabel: { fontSize: 7, color: GOLD, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  clientName: { fontSize: 12, color: PRIMARY, fontWeight: 'bold', marginBottom: 4, lineHeight: 1.25 },
  clientAddress: { fontSize: 10, color: '#555', lineHeight: 1.4 },
  subject: { marginBottom: 10, fontSize: 9, color: '#333' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: PRIMARY, letterSpacing: 2, backgroundColor: '#f3f8f7', padding: 8, marginTop: 12, textAlign: 'center', textTransform: 'uppercase' },
  table: { width: '100%' },
  tableHead: { flexDirection: 'row', borderWidth: 0.75, borderColor: BORDER },
  tableRow: { flexDirection: 'row', alignItems: 'stretch', borderLeftWidth: 0.75, borderRightWidth: 0.75, borderBottomWidth: 0.5, borderColor: BORDER },
  alternateRow: { backgroundColor: '#fffdfa' },
  headCell: { fontSize: 8, fontWeight: 'bold', color: PRIMARY, textTransform: 'uppercase', paddingVertical: 5, paddingHorizontal: 4, borderRightWidth: 0.5, borderRightColor: BORDER },
  cell: { fontSize: 8, color: '#222', lineHeight: 1.25, paddingVertical: 6, paddingHorizontal: 4, borderRightWidth: 0.5, borderRightColor: BORDER },
  lastCell: { borderRightWidth: 0 },
  serial: { width: '7%', textAlign: 'center' },
  description: { width: '43%' },
  quantity: { width: '10%', textAlign: 'right' },
  unit: { width: '10%', textAlign: 'center' },
  rate: { width: '14%', textAlign: 'right' },
  total: { width: '16%', textAlign: 'right' },
  itemName: { fontSize: 8.5, fontWeight: 'bold', color: PRIMARY, marginBottom: 2 },
  itemDescription: { fontSize: 7.5, color: '#555', lineHeight: 1.3, whiteSpace: 'pre-wrap' },
  sectionTotal: { paddingTop: 6, textAlign: 'right', fontSize: 9, fontWeight: 'bold', color: PRIMARY },
  grandTotalRow: { flexDirection: 'row', paddingTop: 8, marginTop: 10, borderTopWidth: 1, borderTopColor: PRIMARY },
  grandTotalLabel: { width: '78%', textAlign: 'right', paddingRight: 10, fontWeight: 'bold', fontSize: 10, color: PRIMARY, textTransform: 'uppercase' },
  grandTotalValue: { width: '22%', textAlign: 'right', fontWeight: 'bold', fontSize: 10, color: PRIMARY },
  inWords: { fontSize: 10, color: '#000', marginTop: 14, fontWeight: 'bold', textDecoration: 'underline' },
  notesTitle: { marginTop: 14, marginBottom: 3, fontSize: 9, fontWeight: 'bold', color: PRIMARY, textTransform: 'uppercase' },
  notes: { fontSize: 8, lineHeight: 1.4, color: '#555', whiteSpace: 'pre-wrap' },
  footer: { position: 'absolute', bottom: 14, left: PAGE_SIDE_PADDING, right: PAGE_SIDE_PADDING, paddingTop: 7, backgroundColor: '#fff' },
  footerText: { fontSize: 7, color: '#666', marginLeft: 4 },
  footerMeta: { fontSize: 6.5, color: '#888', marginTop: 3 },
})

function formatDate(value: string) {
  if (!value) return 'N/A'
  const parsed = /^\d{1,2}-\d{1,2}-\d{4}$/.test(value.trim())
    ? (() => { const [day, month, year] = value.trim().split('-').map(Number); return new Date(year, month - 1, day) })()
    : new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed)
}

function formatMoney(value: number) { return Math.round(value).toLocaleString('en-BD') }

function GlobalHeader({ date }: { date: string }) {
  return <View style={styles.header} fixed>
    <Image src={`${getBaseUrl()}/backgrounddata.svg`} style={styles.headerPattern} />
    <View style={{ paddingTop: 3 }}>
      <View style={styles.headerRuleRow}><View style={[styles.headerRule, { flexGrow: 1.65 }]} /><Text style={styles.headerTitle}>Quotation</Text><View style={[styles.headerRule, { flexGrow: 0.85 }]} /></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}><Image src={`${getBaseUrl()}/Logo/HeaderLogo.png`} style={{ width: 154 }} /></View>
        <View style={styles.datePanel}><Text style={[styles.metaLabel, { textAlign: 'right' }]}>Quotation Date</Text><Text style={styles.metaValue}>{formatDate(date)}</Text></View>
      </View>
    </View>
  </View>
}

function Footer() {
  return <View style={styles.footer} fixed>
    <View style={{ borderTopWidth: 1, borderTopColor: GOLD, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ width: '35%' }}><Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold', marginBottom: 3, fontSize: 9 }]}>Aesthetic Interior Studio</Text><Text style={styles.footerText}>183, East Senpara, Begum Rokeya Soroni</Text><Text style={styles.footerText}>3rd floor, Mirpur 10, Dhaka-1216</Text></View>
      <View style={{ width: '30%', alignItems: 'center' }}><Text style={styles.footerText}>+88 0132969 4663</Text><Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold' }]}>www.aestheticinteriorbd.com</Text></View>
      <View style={{ width: '35%', alignItems: 'flex-end', justifyContent: 'flex-end' }}><Text style={styles.footerText}>© 2026 All rights reserved.</Text></View>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}><Text style={[styles.footerMeta, { marginTop: 0 }]}>Furniture Quotation</Text><Text style={[styles.footerMeta, { marginTop: 0, textAlign: 'right' }]}>Prepared for the client</Text></View>
  </View>
}

function parseMarkdownBold(text: string) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <Text key={idx} style={{ fontWeight: 'bold', color: '#111' }}>
          {part.slice(2, -2)}
        </Text>
      )
    }
    return part
  })
}

function parseLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return null
  const labelMatch = line.match(/^([A-Za-z0-9\s/&()_-]+:)\s*(.*)$/)
  if (labelMatch) {
    const label = labelMatch[1]
    const rest = labelMatch[2]
    return (
      <Text>
        <Text style={{ fontWeight: 'bold', color: PRIMARY }}>{label} </Text>
        {parseMarkdownBold(rest)}
      </Text>
    )
  }
  return parseMarkdownBold(line)
}

function FormattedDescription({ text }: { text?: string | null }) {
  if (!text || !text.trim()) return null
  const lines = text.split('\n')
  return (
    <Text style={styles.itemDescription}>
      {lines.map((line, idx) => (
        <Text key={idx}>
          {idx > 0 ? '\n' : null}
          {parseLine(line)}
        </Text>
      ))}
    </Text>
  )
}

function ItemTable({ items }: { items: FurnitureQuotationItem[] }) {
  return <View style={styles.table}>
    <View style={styles.tableHead}>
      <Text style={[styles.headCell, styles.serial]}>SL</Text><Text style={[styles.headCell, styles.description]}>Name / Materials</Text><Text style={[styles.headCell, styles.quantity]}>Qty</Text><Text style={[styles.headCell, styles.unit]}>Unit</Text><Text style={[styles.headCell, styles.rate]}>U/P (৳)</Text><Text style={[styles.headCell, styles.total, styles.lastCell]}>Total (৳)</Text>
    </View>
    {items.map((item, index) => <View key={item.id} style={[styles.tableRow, index % 2 ? styles.alternateRow : {}]} wrap={false}>
      <Text style={[styles.cell, styles.serial]}>{String(item.serialNo ?? index + 1).padStart(2, '0')}</Text>
      <View style={[styles.cell, styles.description]}>
        <Text style={styles.itemName}>{item.name || '—'}</Text>
        <FormattedDescription text={item.description} />
      </View>
      <Text style={[styles.cell, styles.quantity]}>{item.quantity.toLocaleString()}</Text><Text style={[styles.cell, styles.unit]}>{item.unit}</Text><Text style={[styles.cell, styles.rate]}>{formatMoney(item.rate)}</Text><Text style={[styles.cell, styles.total, styles.lastCell]}>{formatMoney(item.quantity * item.rate)}</Text>
    </View>)}
  </View>
}

export function FurnitureQuotationDocument({ content, leadName, leadLocation }: { content: FurnitureQuotationContent; leadName: string; leadLocation: string | null }) {
  const sections: Array<{ name: FurnitureQuotationItem['section']; items: FurnitureQuotationItem[] }> = [
    { name: 'Furniture', items: content.items.filter((item) => item.section === 'Furniture') },
    ...(content.showElectricalSection ? [{ name: 'Electrical Item' as const, items: content.items.filter((item) => item.section === 'Electrical Item') }] : []),
  ]
  const grandTotal = content.items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  return <Document>
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.watermark} fixed><Image src={`${getBaseUrl()}/android-chrome-512x512.png`} style={{ width: 400, height: 400 }} /></View>
      <GlobalHeader date={content.quotationDate} />
      <Footer />
      <View style={styles.client}>
        <Text style={styles.clientLabel}>Prepared For</Text><Text style={styles.clientName}>{leadName}</Text>{leadLocation ? <Text style={styles.clientAddress}>{leadLocation}</Text> : null}
      </View>
      {content.subject ? <Text style={styles.subject}><Text style={{ fontWeight: 'bold', color: PRIMARY }}>Subject: </Text>{content.subject}</Text> : null}
      {sections.map(({ name, items }) => {
        if (!items.length && name === 'Electrical Item') return null
        const sectionTotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
        return <View key={name} wrap>
          <Text style={styles.sectionTitle}>{name}</Text>
          <ItemTable items={items} />
          <Text style={styles.sectionTotal}>{name} Total: ৳ {formatMoney(sectionTotal)}</Text>
        </View>
      })}
      <View style={styles.grandTotalRow} wrap={false}><Text style={styles.grandTotalLabel}>GRAND TOTAL</Text><Text style={styles.grandTotalValue}>৳ {formatMoney(grandTotal)}</Text></View>
      <Text style={styles.inWords}>In Words: {amountInWordsTaka(grandTotal)}</Text>
      {content.notes ? <View wrap={false}><Text style={styles.notesTitle}>Notes</Text><Text style={styles.notes}>{content.notes}</Text></View> : null}
    </Page>
  </Document>
}
