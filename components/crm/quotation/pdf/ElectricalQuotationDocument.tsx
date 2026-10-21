'use client'

import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { amountInWordsTaka } from '@/lib/number-to-words'
import {
  calculateElectricalGrandTotal,
  type ElectricalQuotationContent,
  type ElectricalQuotationItem,
} from '@/lib/electrical-quotation-template'

const getBaseUrl = () => (typeof window !== 'undefined' ? window.location.origin : 'https://www.aestheticinteriorbd.com')
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
  page: {
    paddingTop: 78,
    paddingBottom: 104,
    paddingLeft: PAGE_SIDE_PADDING,
    paddingRight: PAGE_SIDE_PADDING,
    fontFamily: 'Noto Sans Bengali',
    fontSize: 9,
    color: '#000',
    backgroundColor: '#fff',
    lineHeight: 1.4,
  },
  header: {
    position: 'absolute',
    top: 20,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    height: 58,
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
  headerRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerRule: {
    height: 2.2,
    backgroundColor: PRIMARY,
  },
  headerTitle: {
    color: PRIMARY,
    fontSize: 10,
    fontFamily: 'Times-Roman',
    fontStyle: 'italic',
    letterSpacing: 2,
    marginHorizontal: 12,
    textTransform: 'uppercase',
  },
  datePanel: {
    minWidth: 130,
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 6,
    color: GOLD,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 9.5,
    color: PRIMARY,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  watermark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
    opacity: 0.05,
  },
  client: {
    marginBottom: 14,
  },
  clientLabel: {
    fontSize: 7,
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  clientName: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: 'bold',
    marginBottom: 3,
    lineHeight: 1.25,
  },
  clientAddress: {
    fontSize: 9.5,
    color: '#555',
    lineHeight: 1.35,
  },
  subject: {
    marginBottom: 10,
    fontSize: 9,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: PRIMARY,
    letterSpacing: 1.5,
    backgroundColor: '#f3f8f7',
    padding: 7,
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
  },
  tableHead: {
    flexDirection: 'row',
    borderWidth: 0.75,
    borderColor: BORDER,
    backgroundColor: '#f9fbfa',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.5,
    borderColor: BORDER,
  },
  alternateRow: {
    backgroundColor: '#fffdfa',
  },
  headCell: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: PRIMARY,
    textTransform: 'uppercase',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: BORDER,
  },
  cell: {
    fontSize: 8,
    color: '#222',
    lineHeight: 1.25,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: BORDER,
  },
  lastCell: {
    borderRightWidth: 0,
  },
  // Detailed Table Widths
  serial: {
    width: '6%',
    textAlign: 'center',
  },
  description: {
    width: '48%',
  },
  quantity: {
    width: '10%',
    textAlign: 'right',
  },
  unit: {
    width: '10%',
    textAlign: 'center',
  },
  rate: {
    width: '12%',
    textAlign: 'right',
  },
  total: {
    width: '14%',
    textAlign: 'right',
  },
  // Approx Table Widths (only SL, Name/Description, and Unit Price)
  approxSerial: {
    width: '7%',
    textAlign: 'center',
  },
  approxDescription: {
    width: '73%',
  },
  approxRate: {
    width: '20%',
    textAlign: 'right',
  },
  itemName: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 7.5,
    color: '#555',
    lineHeight: 1.3,
    whiteSpace: 'pre-wrap',
  },
  grandTotalRow: {
    flexDirection: 'row',
    paddingTop: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: PRIMARY,
  },
  grandTotalLabel: {
    width: '74%',
    textAlign: 'right',
    paddingRight: 10,
    fontWeight: 'bold',
    fontSize: 9.5,
    color: PRIMARY,
    textTransform: 'uppercase',
  },
  grandTotalValue: {
    width: '26%',
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: 10,
    color: PRIMARY,
  },
  inWords: {
    fontSize: 9.5,
    color: '#000',
    marginTop: 10,
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  blockTitle: {
    marginTop: 12,
    marginBottom: 3,
    fontSize: 8.5,
    fontWeight: 'bold',
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  blockText: {
    fontSize: 8,
    lineHeight: 1.35,
    color: '#555',
    whiteSpace: 'pre-wrap',
  },
  footer: {
    position: 'absolute',
    bottom: 14,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    paddingTop: 7,
    backgroundColor: '#fff',
  },
  footerText: {
    fontSize: 7,
    color: '#666',
    marginLeft: 4,
  },
  footerMeta: {
    fontSize: 6.5,
    color: '#888',
    marginTop: 3,
  },
})

function formatDate(value: string) {
  if (!value) return 'N/A'
  const parsed = /^\d{1,2}-\d{1,2}-\d{4}$/.test(value.trim())
    ? (() => {
        const [day, month, year] = value.trim().split('-').map(Number)
        return new Date(year, month - 1, day)
      })()
    : new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed)
}

function formatMoney(value: number) {
  return Math.round(value).toLocaleString('en-BD')
}

function GlobalHeader({ date, isApprox }: { date: string; isApprox: boolean }) {
  return (
    <View style={styles.header} fixed>
      <Image src={`${getBaseUrl()}/backgrounddata.svg`} style={styles.headerPattern} />
      <View style={{ paddingTop: 3 }}>
        <View style={styles.headerRuleRow}>
          <View style={[styles.headerRule, { flexGrow: 1.65 }]} />
          <Text style={styles.headerTitle}>{isApprox ? 'Approximate Quotation' : 'Quotation'}</Text>
          <View style={[styles.headerRule, { flexGrow: 0.85 }]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Image src={`${getBaseUrl()}/Logo/HeaderLogo.png`} style={{ width: 154 }} />
          </View>
          <View style={styles.datePanel}>
            <Text style={[styles.metaLabel, { textAlign: 'right' }]}>Quotation Date</Text>
            <Text style={styles.metaValue}>{formatDate(date)}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

function Footer({ isApprox }: { isApprox: boolean }) {
  return (
    <View style={styles.footer} fixed>
      <View style={{ borderTopWidth: 1, borderTopColor: GOLD, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: '35%' }}>
          <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold', marginBottom: 2, fontSize: 8.5 }]}>
            Aesthetic Interior Studio
          </Text>
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={[styles.footerMeta, { marginTop: 0 }]}>
          {isApprox ? 'Electrical Quotation (Approximate)' : 'Electrical Quotation'}
        </Text>
        <Text style={[styles.footerMeta, { marginTop: 0, textAlign: 'right' }]}>Prepared for the client</Text>
      </View>
    </View>
  )
}

// 1. Detailed table: all columns (SL, Name / Scope, Qty, Unit, U/P, Total)
function DetailedItemTable({ items }: { items: ElectricalQuotationItem[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        <Text style={[styles.headCell, styles.serial]}>SL</Text>
        <Text style={[styles.headCell, styles.description]}>Name / Scope of Work</Text>
        <Text style={[styles.headCell, styles.quantity]}>Qty</Text>
        <Text style={[styles.headCell, styles.unit]}>Unit</Text>
        <Text style={[styles.headCell, styles.rate]}>U/P (৳)</Text>
        <Text style={[styles.headCell, styles.total, styles.lastCell]}>Total (৳)</Text>
      </View>
      {items.map((item, index) => {
        const hasQty = typeof item.quantity === 'number' && item.quantity > 0
        const hasRate = typeof item.rate === 'number' && item.rate > 0
        const isLump = item.unit?.toLowerCase().includes('lump')

        return (
          <View key={item.id} style={[styles.tableRow, index % 2 ? styles.alternateRow : {}]} wrap={false}>
            <Text style={[styles.cell, styles.serial]}>{String(item.serialNo ?? index + 1).padStart(2, '0')}</Text>
            <View style={[styles.cell, styles.description]}>
              <Text style={styles.itemName}>{item.name || '—'}</Text>
              {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}
            </View>
            <Text style={[styles.cell, styles.quantity]}>{hasQty ? item.quantity!.toLocaleString() : '—'}</Text>
            <Text style={[styles.cell, styles.unit]}>{item.unit || '—'}</Text>
            <Text style={[styles.cell, styles.rate]}>{hasRate ? formatMoney(item.rate!) : '—'}</Text>
            <Text style={[styles.cell, styles.total, styles.lastCell]}>
              {hasQty && hasRate ? formatMoney(item.quantity! * item.rate!) : isLump ? 'Lump sum' : '—'}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

// 2. Approx table: ONLY SL, Name / Scope of Work, and Unit Price (৳)
function ApproxItemTable({ items }: { items: ElectricalQuotationItem[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        <Text style={[styles.headCell, styles.approxSerial]}>SL</Text>
        <Text style={[styles.headCell, styles.approxDescription]}>Name / Scope of Work</Text>
        <Text style={[styles.headCell, styles.approxRate, styles.lastCell]}>Unit Price (৳)</Text>
      </View>
      {items.map((item, index) => {
        const hasRate = typeof item.rate === 'number' && item.rate > 0
        const isLump = item.unit?.toLowerCase().includes('lump')

        return (
          <View key={item.id} style={[styles.tableRow, index % 2 ? styles.alternateRow : {}]} wrap={false}>
            <Text style={[styles.cell, styles.approxSerial]}>
              {String(item.serialNo ?? index + 1).padStart(2, '0')}
            </Text>
            <View style={[styles.cell, styles.approxDescription]}>
              <Text style={styles.itemName}>{item.name || '—'}</Text>
              {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}
            </View>
            <Text style={[styles.cell, styles.approxRate, styles.lastCell]}>
              {hasRate ? formatMoney(item.rate!) : isLump ? 'Lump sum' : '—'}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export function ElectricalQuotationDocument({
  content,
  leadName,
  leadLocation,
  variant = 'detailed',
}: {
  content: ElectricalQuotationContent
  leadName: string
  leadLocation: string | null
  variant?: 'detailed' | 'approx'
}) {
  const isApproxVariant = variant === 'approx'
  const { grandTotal, isApproximate } = calculateElectricalGrandTotal(content)
  const showAsApprox = isApproxVariant || isApproximate

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.watermark} fixed>
          <Image src={`${getBaseUrl()}/android-chrome-512x512.png`} style={{ width: 400, height: 400 }} />
        </View>
        <GlobalHeader date={content.quotationDate} isApprox={isApproxVariant} />
        <Footer isApprox={isApproxVariant} />

        <View style={styles.client}>
          <Text style={styles.clientLabel}>Prepared For</Text>
          <Text style={styles.clientName}>{leadName}</Text>
          {leadLocation ? <Text style={styles.clientAddress}>{leadLocation}</Text> : null}
        </View>

        {content.subject ? (
          <Text style={styles.subject}>
            <Text style={{ fontWeight: 'bold', color: PRIMARY }}>Subject: </Text>
            {content.subject}
          </Text>
        ) : null}

        <View wrap>
          <Text style={styles.sectionTitle}>Electrical Works &amp; Installation</Text>
          {content.items.length > 0 ? (
            isApproxVariant ? (
              <ApproxItemTable items={content.items} />
            ) : (
              <DetailedItemTable items={content.items} />
            )
          ) : (
            <View style={{ padding: 16, borderWidth: 0.5, borderColor: BORDER, alignItems: 'center' }}>
              <Text style={{ fontSize: 8, color: '#777' }}>No specific item lines listed. Scope as per design specifications.</Text>
            </View>
          )}
        </View>

        <View style={styles.grandTotalRow} wrap={false}>
          <Text style={styles.grandTotalLabel}>
            {showAsApprox ? 'APPROXIMATE GRAND TOTAL' : 'GRAND TOTAL'}
          </Text>
          <Text style={styles.grandTotalValue}>
            ৳ {formatMoney(grandTotal)}
            {showAsApprox ? ' (Approx.)' : ''}
          </Text>
        </View>

        <Text style={styles.inWords}>
          In Words: {amountInWordsTaka(grandTotal)}
          {showAsApprox ? ' (Approximate)' : ''}
        </Text>

        {content.excludedItems ? (
          <View wrap={false}>
            <Text style={styles.blockTitle}>Excluded Items</Text>
            <Text style={styles.blockText}>{content.excludedItems}</Text>
          </View>
        ) : null}

        {content.notes ? (
          <View wrap={false}>
            <Text style={styles.blockTitle}>Notes &amp; Terms</Text>
            <Text style={styles.blockText}>{content.notes}</Text>
          </View>
        ) : null}

        {/* Note: Signatures section removed as requested */}
      </Page>
    </Document>
  )
}
