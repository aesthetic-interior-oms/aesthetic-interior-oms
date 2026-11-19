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
const PAGE_SIDE_PADDING = 8
const BDT_SYMBOL = '৳'

const styles = StyleSheet.create({
  page: {
    paddingTop: 85,
    paddingBottom: 75,
    paddingLeft: PAGE_SIDE_PADDING,
    paddingRight: PAGE_SIDE_PADDING,
    fontFamily: 'Noto Sans Bengali',
    fontSize: 9,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    lineHeight: 1.35,
  },
  header: {
    position: 'absolute',
    top: 18,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    height: 60,
  },
  headerRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  headerRule: {
    height: 1,
    backgroundColor: GOLD,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  metaLabel: {
    fontSize: 7,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  clientBox: {
    marginBottom: 14,
    padding: 8,
    backgroundColor: '#f8faf9',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  clientTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 2,
  },
  clientAddress: {
    fontSize: 9,
    color: '#444444',
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tHead: {
    flexDirection: 'row',
    backgroundColor: '#1f363d',
    color: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  thCol: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleRow: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  areaTitleRow: {
    backgroundColor: '#f8fafc',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  areaTitleText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#475569',
  },
  tRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#edf2f7',
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'flex-start',
  },
  tRowAlt: {
    backgroundColor: '#fafbfc',
  },
  tdCol: {
    fontSize: 8.5,
    color: '#1e293b',
  },
  wSl: { width: '5%', textAlign: 'center' },
  wName: { width: '22%', paddingRight: 4 },
  wMats: { width: '33%', paddingRight: 4 },
  wQty: { width: '14%', textAlign: 'center' },
  wPrice: { width: '12%', textAlign: 'right', paddingRight: 4 },
  wTotal: { width: '14%', textAlign: 'right' },
  bold: { fontWeight: 'bold' },
  totalCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 4,
    backgroundColor: '#f8faf9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 14,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: '#cbd5e1',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  grandTotalValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  wordsText: {
    fontSize: 8.5,
    fontStyle: 'italic',
    color: '#475569',
    marginTop: 4,
  },
  notesSection: {
    marginTop: 8,
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#fdfdfd',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesContent: {
    fontSize: 8,
    color: '#334155',
    lineHeight: 1.4,
  },
  signatoryRow: {
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signatoryBlock: {
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    paddingTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    borderTopWidth: 1,
    borderTopColor: GOLD,
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7.5,
    color: '#64748b',
  },
  watermark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.04,
    zIndex: -1,
  },
})

function formatMoney(value: number): string {
  return `${BDT_SYMBOL} ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`
}

export function CustomizedQuotationDocument({
  content,
  totals,
}: {
  content: CustomizedQuotationContent
  totals: CustomizedQuotationTotals
}) {
  const displayTitle = content.title?.trim() || 'Customized Quotation'
  const sections = content.sections ?? []
  const areas = content.areas ?? []
  const lines = content.lineItems ?? []

  // Global continuous SL counter
  let slCounter = 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark Background */}
        <View style={styles.watermark} fixed>
          <Image src={`${getBaseUrl()}/android-chrome-512x512.png`} style={{ width: 380, height: 380 }} />
        </View>

        {/* Global Fixed Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerRuleRow}>
            <View style={[styles.headerRule, { flexGrow: 1.5 }]} />
            <Text style={styles.headerTitle}>{displayTitle}</Text>
            <View style={[styles.headerRule, { flexGrow: 1 }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Image src={`${getBaseUrl()}/Logo/HeaderLogo.png`} style={{ width: 140 }} />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metaLabel}>Quotation Date</Text>
              <Text style={styles.metaValue}>{content.quotationDate}</Text>
              {content.quotationCode ? (
                <>
                  <Text style={[styles.metaLabel, { marginTop: 2 }]}>Code</Text>
                  <Text style={styles.metaValue}>{content.quotationCode}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {/* Client Box */}
        <View style={styles.clientBox}>
          <Text style={styles.metaLabel}>Prepared For</Text>
          <Text style={styles.clientTitle}>{content.clientName || 'Valued Client'}</Text>
          {content.clientAddress ? <Text style={styles.clientAddress}>{content.clientAddress}</Text> : null}
        </View>

        {/* Table */}
        <View style={styles.tableWrapper}>
          <View style={styles.tHead}>
            <Text style={[styles.thCol, styles.wSl]}>SL</Text>
            <Text style={[styles.thCol, styles.wName]}>Name</Text>
            <Text style={[styles.thCol, styles.wMats]}>Materials / Specifications</Text>
            <Text style={[styles.thCol, styles.wQty]}>Qty / Unit</Text>
            <Text style={[styles.thCol, styles.wPrice]}>U/P ({BDT_SYMBOL})</Text>
            <Text style={[styles.thCol, styles.wTotal]}>Total ({BDT_SYMBOL})</Text>
          </View>

          {sections.map((section) => {
            const sectionAreas = areas.filter((a) => a.floorId === section.id).sort((a, b) => a.sortOrder - b.sortOrder)
            const sectionLines = lines.filter((l) => l.sectionId === section.id && l.included !== false)

            if (sectionLines.length === 0) return null

            return (
              <View key={section.id}>
                <View style={styles.sectionTitleRow} wrap={false}>
                  <Text style={styles.sectionTitleText}>{section.name || 'Section'}</Text>
                </View>

                {sectionAreas.length > 0 ? (
                  sectionAreas.map((area) => {
                    const areaLines = sectionLines.filter((l) => l.areaId === area.id)
                    if (areaLines.length === 0) return null

                    return (
                      <View key={area.id}>
                        {area.name ? (
                          <View style={styles.areaTitleRow} wrap={false}>
                            <Text style={styles.areaTitleText}>Area: {area.name}</Text>
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
                                {line.rate > 0 ? line.rate.toLocaleString() : '—'}
                              </Text>
                              <Text style={[styles.tdCol, styles.wTotal, styles.bold, { color: PRIMARY }]}>
                                {line.amount > 0 ? line.amount.toLocaleString() : '—'}
                              </Text>
                            </View>
                          )
                        })}
                      </View>
                    )
                  })
                ) : (
                  sectionLines.map((line, idx) => {
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
                          {line.rate > 0 ? line.rate.toLocaleString() : '—'}
                        </Text>
                        <Text style={[styles.tdCol, styles.wTotal, styles.bold, { color: PRIMARY }]}>
                          {line.amount > 0 ? line.amount.toLocaleString() : '—'}
                        </Text>
                      </View>
                    )
                  })
                )}
              </View>
            )
          })}
        </View>

        {/* Total Box */}
        <View style={styles.totalCard} wrap={false}>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total ({displayTitle})</Text>
            <Text style={styles.grandTotalValue}>{formatMoney(totals.grandTotal)}</Text>
          </View>
          <Text style={styles.wordsText}>In Words: {amountInWordsTaka(totals.grandTotal)}</Text>
        </View>

        {/* Notes & Terms */}
        {content.terms ? (
          <View style={styles.notesSection} wrap={false}>
            <Text style={styles.notesTitle}>Terms & Conditions</Text>
            <Text style={styles.notesContent}>{content.terms}</Text>
          </View>
        ) : null}

        {/* Signatures */}
        <View style={styles.signatoryRow} wrap={false}>
          <View style={styles.signatoryBlock}>
            <Text style={[styles.bold, { color: PRIMARY, fontSize: 9 }]}>{content.signatoryName || 'Md Johirul Islam'}</Text>
            <Text style={{ fontSize: 8, color: '#64748b' }}>{content.signatoryTitle || 'Chief Executive Officer'}</Text>
            <Text style={{ fontSize: 7.5, color: '#94a3b8' }}>Aesthetic Interior Studio</Text>
          </View>
          <View style={[styles.signatoryBlock, { alignItems: 'flex-end' }]}>
            <Text style={[styles.bold, { color: PRIMARY, fontSize: 9 }]}>Client Acceptance</Text>
            <Text style={{ fontSize: 8, color: '#64748b' }}>Signature & Date</Text>
          </View>
        </View>

        {/* Fixed Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Aesthetic Interior Studio • 183 East Senpara, Mirpur 10, Dhaka-1216</Text>
          <Text style={styles.footerText}>Phone: +88 0132969 4663 • www.aestheticinteriorbd.com</Text>
        </View>
      </Page>
    </Document>
  )
}
