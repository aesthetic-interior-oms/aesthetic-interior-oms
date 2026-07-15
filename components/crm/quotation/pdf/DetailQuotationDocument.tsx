'use client'

import { Document, Page, StyleSheet, Text, View, Image } from '@react-pdf/renderer'
import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'
import {
  buildDetailFloorSummaries,
  formatDetailAmount,
  formatDetailQtyCell,
  formatDetailTotalCell,
  formatDetailUnitPriceCell,
} from '@/lib/detail-quotation-format'
import { amountInWordsTaka } from '@/lib/number-to-words'

const PRIMARY = '#0f5b53';
const TEXT_MAIN = '#333333';
const TEXT_LIGHT = '#666666';
const BORDER = '#cccccc';
const BG_ALT = '#f5f9f8';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 70,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: TEXT_MAIN,
  },
  detailPage: {
    paddingTop: 160,
    paddingBottom: 70,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: TEXT_MAIN,
  },
  
  // Global Header
  globalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
    paddingBottom: 10,
  },
  logo: {
    width: 140,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PRIMARY,
    letterSpacing: 2,
    marginBottom: 5,
  },
  metaText: {
    fontSize: 9,
    color: TEXT_LIGHT,
    marginBottom: 2,
  },
  metaValue: {
    color: TEXT_MAIN,
    fontWeight: 'bold',
  },

  // Boxes for Client Info
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoBox: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  infoTitle: {
    fontSize: 8,
    color: PRIMARY,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    paddingBottom: 4,
  },
  infoContent: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoSub: {
    fontSize: 9,
    color: TEXT_LIGHT,
    lineHeight: 1.4,
  },

  // Intro
  introBox: {
    marginBottom: 20,
  },
  introGreeting: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  introText: {
    color: TEXT_LIGHT,
    lineHeight: 1.4,
    textAlign: 'justify',
  },

  // Tables
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: BORDER,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PRIMARY,
  },
  thCell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 8,
    textTransform: 'uppercase',
    borderRightWidth: 1,
    borderRightColor: '#ffffff',
    textAlign: 'center',
  },
  thCellLast: {
    borderRightWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: BG_ALT,
  },
  tdCell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 8.5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  tdCellLast: {
    borderRightWidth: 0,
  },

  // Column Widths
  colSl: { width: '6%', textAlign: 'center' },
  colName: { width: '22%' },
  colMats: { width: '36%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '12%', textAlign: 'center' },
  colTotal: { width: '14%', textAlign: 'right' },
  
  colSummaryName: { width: '70%', textAlign: 'left' },
  colSummaryTotal: { width: '24%', textAlign: 'right' },

  // Mat Line
  matLine: {
    fontSize: 8,
    color: TEXT_LIGHT,
    lineHeight: 1.3,
    marginBottom: 2,
  },
  matPrefix: {
    fontWeight: 'bold',
    color: TEXT_MAIN,
  },

  // Totals
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#e6f0ef',
  },
  totalLabelCell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    textAlign: 'right',
    fontWeight: 'bold',
    color: PRIMARY,
    fontSize: 10,
  },
  totalValueCell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    textAlign: 'right',
    fontWeight: 'bold',
    color: PRIMARY,
    fontSize: 10,
  },
  inWordsBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  inWordsText: {
    fontSize: 9,
    fontStyle: 'italic',
  },
  inWordsBold: {
    fontWeight: 'bold',
    color: PRIMARY,
    fontStyle: 'normal',
  },

  // Footer
  footerFixed: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: TEXT_LIGHT,
  },

  // Fixed header wrappers for detail pages
  detailFixedHeader: {
    position: 'absolute',
    top: 40,
    left: 40,
    right: 40,
  },

  // Terms & Signatures
  termBox: {
    marginBottom: 15,
  },
  termTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  termText: {
    fontSize: 8.5,
    color: TEXT_LIGHT,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  alertBox: {
    padding: 10,
    backgroundColor: '#fff0f0',
    borderWidth: 1,
    borderColor: '#ffcccc',
    color: '#d32f2f',
    fontWeight: 'bold',
    fontSize: 9,
    marginTop: 10,
  },
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 50,
  },
  sigBlock: {
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: TEXT_MAIN,
    paddingTop: 6,
    alignItems: 'center',
  },
  sigName: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  sigTitle: {
    fontSize: 8,
    color: TEXT_LIGHT,
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

const GlobalHeader = ({ date, subject }: { date: string; subject: string }) => (
  <View style={styles.globalHeader}>
    <Image src="/Logo/HeaderLogo.png" style={styles.logo} />
    <View style={styles.headerRight}>
      <Text style={styles.title}>QUOTATION</Text>
      <Text style={styles.metaText}>
        Date: <Text style={styles.metaValue}>{formatDateString(date)}</Text>
      </Text>
      <Text style={styles.metaText}>
        Ref: <Text style={styles.metaValue}>{subject.substring(0, 40)}</Text>
      </Text>
    </View>
  </View>
);

const FooterFixed = () => (
  <View style={styles.footerFixed} fixed>
    <View>
      <Text style={styles.footerText}>+88 01329 694660 | +88 01329 694661 | aestheticinteriorstudio@gmail.com</Text>
      <Text style={styles.footerText}>2nd Floor, 183 East Senpara Parbata, Mirpur 10, Dhaka</Text>
    </View>
    <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold' }]}>www.aestheticinteriorbd.com</Text>
  </View>
);

function MaterialTextPdf({ text }: { text: string | null | undefined }) {
  if (!text) return <Text style={styles.matLine}>—</Text>

  const lines = text.split('\n')

  return (
    <View>
      {lines.map((line, index) => {
        const match = line.match(/^(\d{2}\.[^:]+:|[^:*]+:|\*[^:]+:)/)

        if (!match) {
          return (
            <Text key={`${line}-${index}`} style={styles.matLine}>
              {line}
            </Text>
          )
        }

        const prefix = match[1]
        const rest = line.substring(prefix.length)

        return (
          <Text key={`${line}-${index}`} style={styles.matLine}>
            <Text style={styles.matPrefix}>{prefix}</Text>
            {rest}
          </Text>
        )
      })}
    </View>
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

  return (
    <Document>
      {/* SUMMARY PAGE */}
      <Page size="A4" style={styles.page}>
        <GlobalHeader date={content.quotationDate ?? ''} subject={content.subject ?? ''} />
        
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Prepared For</Text>
            <Text style={styles.infoContent}>{clientName}</Text>
            <Text style={styles.infoSub}>{clientAddress || '—'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Project Subject</Text>
            <Text style={[styles.infoContent, { color: PRIMARY }]}>
              {content.summarySubject ?? content.subject ?? '—'}
            </Text>
          </View>
        </View>

        {cleanIntro ? (
          <View style={styles.introBox}>
            <Text style={styles.introGreeting}>Dear Sir,</Text>
            <Text style={styles.introText}>{cleanIntro}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Project Summary</Text>
        
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, styles.colSl]}>SL</Text>
            <Text style={[styles.thCell, styles.colSummaryName]}>Description</Text>
            <Text style={[styles.thCell, styles.colSummaryTotal, styles.thCellLast]}>Amount</Text>
          </View>

          {floorSummaries.map((entry, index) => (
            <View key={entry.floor.id} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]} wrap={false}>
              <Text style={[styles.tdCell, styles.colSl]}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={[styles.tdCell, styles.colSummaryName, { fontWeight: 'bold' }]}>{entry.floor.name}</Text>
              <Text style={[styles.tdCell, styles.colSummaryTotal, styles.tdCellLast, { fontWeight: 'bold' }]}>{formatDetailAmount(entry.total)}</Text>
            </View>
          ))}

          <View style={styles.totalRow} wrap={false}>
            <Text style={[styles.totalLabelCell, { width: '76%' }]}>Grand Total</Text>
            <Text style={[styles.totalValueCell, { width: '24%' }]}>{formatDetailAmount(totals.grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.inWordsBox} wrap={false}>
          <Text style={styles.inWordsText}>In Words: <Text style={styles.inWordsBold}>{amountInWordsTaka(totals.grandTotal)}</Text></Text>
        </View>

        <FooterFixed />
      </Page>

      {/* DETAIL PAGES */}
      {floorSummaries.map((entry) => (
        <Page key={entry.floor.id} size="A4" style={styles.detailPage}>
          {/* Fixed Header for this specific floor */}
          <View style={styles.detailFixedHeader} fixed>
            <GlobalHeader date={content.quotationDate ?? ''} subject={content.subject ?? ''} />
            <Text style={styles.sectionTitle}>{entry.floor.name}</Text>
            
            {/* Table Header repeated on every page */}
            <View style={styles.tableHeader}>
              <Text style={[styles.thCell, styles.colSl]}>SL</Text>
              <Text style={[styles.thCell, styles.colName]}>Name</Text>
              <Text style={[styles.thCell, styles.colMats]}>Materials</Text>
              <Text style={[styles.thCell, styles.colQty]}>Qty/Sft</Text>
              <Text style={[styles.thCell, styles.colPrice]}>Unit Price</Text>
              <Text style={[styles.thCell, styles.colTotal, styles.thCellLast]}>Total</Text>
            </View>
          </View>

          <View style={[styles.table, { borderTopWidth: 0 }]}>
            {entry.lines.map((line, lineIndex) => (
              <View key={line.id} style={[styles.tableRow, lineIndex % 2 === 1 ? styles.tableRowAlt : {}]} wrap={false}>
                <Text style={[styles.tdCell, styles.colSl]}>
                  {String(line.serialNo ?? lineIndex + 1).padStart(2, '0')}
                </Text>
                <Text style={[styles.tdCell, styles.colName, { fontWeight: 'bold' }]}>{line.description}</Text>
                <View style={[styles.tdCell, styles.colMats]}>
                  <MaterialTextPdf text={line.materials} />
                </View>
                <Text style={[styles.tdCell, styles.colQty]}>{formatDetailQtyCell(line)}</Text>
                <Text style={[styles.tdCell, styles.colPrice]}>{formatDetailUnitPriceCell(line)}</Text>
                <Text style={[styles.tdCell, styles.colTotal, styles.tdCellLast, { fontWeight: 'bold', color: PRIMARY }]}>
                  {formatDetailTotalCell(line)}
                  {line.description.toLowerCase().includes('electric wiring') ? '\n(Approx)' : ''}
                </Text>
              </View>
            ))}
            
            <View style={styles.totalRow} wrap={false}>
              <Text style={[styles.totalLabelCell, { width: '86%' }]}>Total for {entry.floor.name}</Text>
              <Text style={[styles.totalValueCell, { width: '14%' }]}>{formatDetailAmount(entry.total)}</Text>
            </View>
          </View>

          <View style={styles.inWordsBox} wrap={false}>
            <Text style={styles.inWordsText}>In Words: <Text style={styles.inWordsBold}>{amountInWordsTaka(entry.total)}</Text></Text>
          </View>

          <FooterFixed />
        </Page>
      ))}

      {/* TERMS PAGE */}
      <Page size="A4" style={styles.page}>
        <GlobalHeader date={content.quotationDate ?? ''} subject={content.subject ?? ''} />

        <Text style={styles.sectionTitle}>Terms &amp; Signatures</Text>

        <View style={{ marginTop: 10 }}>
          {content.notes ? (
            <View style={styles.termBox}>
              <Text style={styles.termTitle}>Notes</Text>
              <Text style={styles.termText}>{content.notes}</Text>
            </View>
          ) : null}
          
          {content.terms ? (
            <View style={styles.termBox}>
              <Text style={styles.termTitle}>Terms &amp; Conditions</Text>
              <Text style={styles.termText}>{content.terms}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: '48%' }}>
              {content.paymentTerms ? (
                <View style={styles.termBox}>
                  <Text style={styles.termTitle}>Mode of Payment</Text>
                  <Text style={styles.termText}>{content.paymentTerms}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ width: '48%' }}>
              {content.durationNotes ? (
                <View style={styles.termBox}>
                  <Text style={styles.termTitle}>Duration of Work</Text>
                  <Text style={styles.termText}>{content.durationNotes}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {content.drawingDesign ? (
            <Text style={styles.alertBox}>
              {content.drawingDesign}
            </Text>
          ) : null}
        </View>

        <View style={styles.signaturesRow}>
          <View style={styles.sigBlock}>
            <Text style={styles.sigName}>Customer Approval</Text>
            <Text style={styles.sigTitle}>Sign &amp; Date</Text>
          </View>
          
          <View style={styles.sigBlock}>
            <Text style={styles.sigName}>{content.signatoryName || 'Authorized Signature'}</Text>
            <Text style={styles.sigTitle}>{content.signatoryTitle || 'Aesthetic Interior'}</Text>
          </View>
        </View>

        <FooterFixed />
      </Page>
    </Document>
  )
}
