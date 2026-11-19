'use client'
/* eslint-disable jsx-a11y/alt-text */

import { Document, Page, StyleSheet, Text, View, Image, Font } from '@react-pdf/renderer'
import type { CustomizedQuotationContent, CustomizedQuotationTotals } from '@/lib/customized-quotation-types'
import { amountInWordsTaka } from '@/lib/number-to-words'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://www.aestheticinteriortech.com'
}

Font.register({
  family: 'Noto Sans Bengali',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSansBengali-Regular.ttf` },
    { src: `${getBaseUrl()}/fonts/NotoSansBengali-Bold.ttf`, fontWeight: 'bold' },
  ],
})

Font.registerHyphenationCallback((word) => [word])

const PRIMARY = '#1f363d'
const GOLD = '#a57c00'
const PAGE_SIDE_PADDING = 7
const BDT_SYMBOL = '৳'
const DETAIL_ROW_LINE_HEIGHT = 1.15

const styles = StyleSheet.create({
  page: {
    paddingTop: 82,
    paddingBottom: 95,
    paddingLeft: PAGE_SIDE_PADDING,
    paddingRight: PAGE_SIDE_PADDING,
    fontFamily: 'Noto Sans Bengali',
    fontSize: 9.5,
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
  metaText: {
    fontSize: 9.5,
    color: '#444444',
    marginBottom: 3,
  },
  bold: {
    fontWeight: 'bold',
    color: '#000000',
  },

  // Prepared for Block
  preparedForHeading: {
    fontSize: 7.5,
    color: '#a57c00',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 4,
    lineHeight: 1.25,
  },
  clientAddress: {
    fontSize: 9.5,
    color: '#555555',
    lineHeight: 1.4,
  },

  // Section / Floor Title
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: PRIMARY,
    letterSpacing: 2,
    backgroundColor: '#f3f8f7',
    padding: 6,
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // Area Title
  areaTitleRow: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.5,
    borderTopWidth: 0.5,
    borderColor: '#d7d7d7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  areaTitleText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PRIMARY,
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  // Table
  tableWrapper: {
    width: '100%',
    marginBottom: 10,
  },
  tHead: {
    flexDirection: 'row',
    borderTopWidth: 0.75,
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: '#d7d7d7',
    backgroundColor: '#ffffff',
  },
  thCol: {
    fontSize: 9,
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
    fontSize: 9,
    lineHeight: DETAIL_ROW_LINE_HEIGHT,
    paddingTop: 5,
    paddingBottom: 5,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#d7d7d7',
  },
  tdColLast: {
    borderRightWidth: 0,
  },

  // Columns Widths matching Detail Quotation
  wSl: { width: '6%', textAlign: 'center' },
  wName: { width: '20%' },
  wMats: { width: '40%' },
  wQty: { width: '10%', textAlign: 'center' },
  wPrice: { width: '12%', textAlign: 'right', paddingRight: 4 },
  wTotal: { width: '12%', textAlign: 'right', paddingRight: 4 },

  // Totals
  grandTotalRow: {
    flexDirection: 'row',
    paddingTop: 8,
    marginTop: 6,
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
    paddingRight: 4,
  },
  inWords: {
    fontSize: 9.5,
    color: '#000000',
    marginTop: 12,
    textAlign: 'left',
    fontFamily: 'Noto Sans Bengali',
    fontWeight: 'bold',
    textDecoration: 'underline',
  },

  // Footer Fixed
  footerFixed: {
    position: 'absolute',
    bottom: 12,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    paddingTop: 6,
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
  watermark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.05,
    zIndex: -1,
  },
})

function formatDateString(dateString: string) {
  if (!dateString) return 'N/A'
  try {
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

function formatTableAmount(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

function formatCurrency(value: number) {
  return `${BDT_SYMBOL} ${formatTableAmount(value)}`
}

export function CustomizedQuotationDocument({
  content,
  totals,
}: {
  content: CustomizedQuotationContent
  totals: CustomizedQuotationTotals
}) {
  // Determine title to display: NEVER say "Customized Quotation"
  const rawTitle = content.title?.trim()
  const displayTitle =
    rawTitle && rawTitle.toLowerCase() !== 'customized quotation'
      ? rawTitle
      : 'QUOTATION'

  const formattedDate = formatDateString(content.quotationDate)
  const clientName = content.clientName || 'Valued Client'
  const clientAddress = content.clientAddress || ''

  // Clean intro letter to ensure "Dear Sir," isn't duplicated
  const rawIntro = content.introLetter || ''
  const cleanIntro = rawIntro.replace(/^Dear Sir,\s*/i, '').trim()

  const floors = content.sections ?? []
  const areas = content.areas ?? []
  const lines = content.lineItems ?? []

  let slCounter = 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Background Watermark */}
        <View style={styles.watermark} fixed>
          <Image src={`${getBaseUrl()}/android-chrome-512x512.png`} style={{ width: 400, height: 400 }} />
        </View>

        {/* Global Fixed Header */}
        <View style={styles.header} fixed>
          <Image src={`${getBaseUrl()}/backgrounddata.svg`} style={styles.headerPattern} />
          <View style={{ paddingTop: 3 }}>
            <View style={styles.headerRuleRow}>
              <View style={[styles.headerRule, { flexGrow: 1.65 }]} />
              <Text style={styles.headerTitle}>{displayTitle.toUpperCase()}</Text>
              <View style={[styles.headerRule, { flexGrow: 0.85 }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Image src={`${getBaseUrl()}/Logo/HeaderLogo.png`} style={{ width: 154 }} />
              </View>
              <View style={styles.datePanel}>
                <Text style={[styles.metaLabel, { textAlign: 'right' }]}>Quotation Date</Text>
                <Text style={styles.metaValue}>{formattedDate}</Text>
                {content.quotationCode ? (
                  <>
                    <Text style={[styles.metaLabel, { textAlign: 'right', marginTop: 2 }]}>Code</Text>
                    <Text style={styles.metaValue}>{content.quotationCode}</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* P R E P A R E D   F O R Block */}
        <View style={{ marginBottom: 14 }}>
          <Text style={styles.preparedForHeading}>P R E P A R E D   F O R</Text>
          <Text style={styles.clientName}>{clientName}</Text>
          {clientAddress ? <Text style={styles.clientAddress}>{clientAddress}</Text> : null}
        </View>

        {/* Subject */}
        <Text style={{ fontSize: 9.5, marginBottom: 12 }}>
          <Text style={styles.bold}>Subject: </Text>
          {content.subject?.trim() || 'Quotation for Customize section work'}
        </Text>

        {/* Dear Sir, & Intro Letter */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.metaText, styles.bold]}>Dear Sir,</Text>
          <Text style={[styles.metaText, { textAlign: 'justify', lineHeight: 1.5 }]}>
            {cleanIntro ||
              'We are delighted to partner with you on transforming your residence into an aesthetic, thoughtfully designed space. Separate cost estimates have been provided for each room to give you a clear breakdown of the budget and scope.'}
          </Text>
        </View>

        {/* Tables by Floor and Area */}
        {floors.map((floor) => {
          const floorAreas = areas.filter((a) => a.floorId === floor.id).sort((a, b) => a.sortOrder - b.sortOrder)
          const floorLines = lines.filter((l) => l.sectionId === floor.id && l.included !== false)

          if (floorLines.length === 0) return null

          return (
            <View key={floor.id} style={styles.tableWrapper}>
              {/* Floor Header Bar */}
              <Text style={styles.sectionTitle}>{floor.name || 'Floor'}</Text>

              {/* Table Head */}
              <View style={styles.tHead}>
                <Text style={[styles.thCol, styles.wSl]}>SL</Text>
                <Text style={[styles.thCol, styles.wName]}>Name</Text>
                <Text style={[styles.thCol, styles.wMats]}>Materials / Specifications</Text>
                <Text style={[styles.thCol, styles.wQty]}>Qty/Unit</Text>
                <Text style={[styles.thCol, styles.wPrice]}>U/P ({BDT_SYMBOL})</Text>
                <Text style={[styles.thCol, styles.wTotal, styles.thColLast]}>Total ({BDT_SYMBOL})</Text>
              </View>

              {floorAreas.length > 0 ? (
                floorAreas.map((area) => {
                  const areaLines = floorLines.filter((l) => l.areaId === area.id)
                  if (areaLines.length === 0) return null

                  return (
                    <View key={area.id}>
                      {area.name ? (
                        <View style={styles.areaTitleRow} wrap={false}>
                          <Text style={styles.areaTitleText}>{area.name}</Text>
                        </View>
                      ) : null}

                      {areaLines.map((line, idx) => {
                        slCounter += 1
                        const slStr = String(slCounter).padStart(2, '0')
                        const qtyDisplay =
                          line.unit === 'nos'
                            ? `${line.quantity.toLocaleString()} Nos`
                            : line.unit === 'sqft'
                              ? `${line.quantity.toLocaleString()} Sft`
                              : line.unit === 'ls'
                                ? '1 Ls'
                                : line.quantity > 0
                                  ? `${line.quantity.toLocaleString()} ${line.unit}`
                                  : '—'

                        return (
                          <View
                            key={line.id}
                            style={[styles.tRow, idx % 2 === 1 ? styles.tRowAlt : {}]}
                            wrap={false}
                          >
                            <Text style={[styles.tdCol, styles.wSl, styles.bold]}>{slStr}</Text>
                            <Text style={[styles.tdCol, styles.wName, styles.bold]}>{line.description}</Text>
                            <Text style={[styles.tdCol, styles.wMats]}>{line.materials || '—'}</Text>
                            <Text style={[styles.tdCol, styles.wQty]}>{qtyDisplay}</Text>
                            <Text style={[styles.tdCol, styles.wPrice]}>
                              {line.rate > 0 ? formatTableAmount(line.rate) : '—'}
                            </Text>
                            <Text style={[styles.tdCol, styles.wTotal, styles.tdColLast, styles.bold, { color: PRIMARY }]}>
                              {line.amount > 0 ? formatTableAmount(line.amount) : '—'}
                            </Text>
                          </View>
                        )
                      })}
                    </View>
                  )
                })
              ) : (
                floorLines.map((line, idx) => {
                  slCounter += 1
                  const slStr = String(slCounter).padStart(2, '0')
                  const qtyDisplay =
                    line.unit === 'nos'
                      ? `${line.quantity.toLocaleString()} Nos`
                      : line.unit === 'sqft'
                        ? `${line.quantity.toLocaleString()} Sft`
                        : line.unit === 'ls'
                          ? '1 Ls'
                          : line.quantity > 0
                            ? `${line.quantity.toLocaleString()} ${line.unit}`
                            : '—'

                  return (
                    <View
                      key={line.id}
                      style={[styles.tRow, idx % 2 === 1 ? styles.tRowAlt : {}]}
                      wrap={false}
                    >
                      <Text style={[styles.tdCol, styles.wSl, styles.bold]}>{slStr}</Text>
                      <Text style={[styles.tdCol, styles.wName, styles.bold]}>{line.description}</Text>
                      <Text style={[styles.tdCol, styles.wMats]}>{line.materials || '—'}</Text>
                      <Text style={[styles.tdCol, styles.wQty]}>{qtyDisplay}</Text>
                      <Text style={[styles.tdCol, styles.wPrice]}>
                        {line.rate > 0 ? formatTableAmount(line.rate) : '—'}
                      </Text>
                      <Text style={[styles.tdCol, styles.wTotal, styles.tdColLast, styles.bold, { color: PRIMARY }]}>
                        {line.amount > 0 ? formatTableAmount(line.amount) : '—'}
                      </Text>
                    </View>
                  )
                })
              )}
            </View>
          )
        })}

        {/* Grand Total Row */}
        <View style={styles.grandTotalRow} wrap={false}>
          <Text style={styles.grandTotalLabel}>TOTAL AMOUNT</Text>
          <Text style={styles.grandTotalValue}>{formatCurrency(totals.grandTotal)}</Text>
        </View>

        {/* IN WORDS */}
        <Text style={styles.inWords} wrap={false}>
          In Words: {amountInWordsTaka(totals.grandTotal)}
        </Text>

        {/* Official Fixed Footer */}
        <View style={styles.footerFixed} fixed>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: GOLD,
              paddingTop: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: '35%' }}>
              <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold', marginBottom: 2, fontSize: 8.5 }]}>
                Aesthetic Interior Studio
              </Text>
              <Text style={styles.footerText}>183, East Senpara, Begum Rokeya Soroni</Text>
              <Text style={styles.footerText}>3rd floor, Mirpur 10, Dhaka-1216</Text>
            </View>
            <View style={{ width: '30%', alignItems: 'center' }}>
              <Text style={styles.footerText}>+88 0132969 4663</Text>
              <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold' }]}>
                www.aestheticinteriorbd.com
              </Text>
            </View>
            <View style={{ width: '35%', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
              <Text style={styles.footerText}>© 2026 All rights reserved.</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={[styles.footerMeta, { textAlign: 'left' }]}>
              Quotation Code: {content.quotationCode ?? 'Not generated yet'}
            </Text>
            <Text style={[styles.footerMeta, { textAlign: 'right' }]}>
              Generated: {formatDownloadDateTime(content.downloadedAt)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
