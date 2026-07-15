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

const ACCENT_COLOR = '#0f5b53';
const TEXT_DARK = '#1a1a1a';
const TEXT_MUTED = '#555555';
const TEXT_LIGHT = '#888888';
const BORDER_COLOR = '#e5e5e5';
const BG_ALT = '#fafafa';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 80,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: TEXT_DARK,
    lineHeight: 1.4,
    backgroundColor: '#ffffff',
  },
  // Top brand strip
  topStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: ACCENT_COLOR,
  },
  // Header section
  headerFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 40,
  },
  logoContainer: {
    width: '50%',
  },
  logo: {
    width: 140,
    height: 'auto',
    marginBottom: 10,
  },
  documentTitle: {
    fontSize: 24,
    color: ACCENT_COLOR,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'right',
    marginBottom: 10,
  },
  metaGrid: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  metaLabel: {
    fontSize: 8,
    color: TEXT_LIGHT,
    textTransform: 'uppercase',
    width: 60,
    textAlign: 'right',
    marginRight: 10,
  },
  metaValue: {
    fontSize: 9,
    color: TEXT_DARK,
    fontWeight: 'bold',
    width: 140,
    textAlign: 'right',
  },
  
  // Client Info
  clientSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 15,
  },
  clientBlock: {
    width: '45%',
  },
  clientLabel: {
    fontSize: 8,
    color: TEXT_LIGHT,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 1,
  },
  clientName: {
    fontSize: 12,
    color: ACCENT_COLOR,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientAddress: {
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.4,
  },

  // Greeting
  greetingBox: {
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.5,
    textAlign: 'justify',
  },

  // Tables
  tableContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: ACCENT_COLOR,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT_COLOR,
    paddingBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: TEXT_DARK,
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    color: TEXT_LIGHT,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER_COLOR,
  },
  tableRowAlt: {
    backgroundColor: BG_ALT,
  },
  cellText: {
    fontSize: 9,
    color: TEXT_DARK,
  },
  cellTextBold: {
    fontSize: 9,
    color: TEXT_DARK,
    fontWeight: 'bold',
  },
  
  // Columns
  wSl: { width: '6%', textAlign: 'center' },
  wName: { width: '30%' },
  wMats: { width: '32%' },
  wQty: { width: '10%', textAlign: 'center' },
  wPrice: { width: '10%', textAlign: 'center' },
  wTotal: { width: '12%', textAlign: 'right' },
  wSummaryName: { width: '60%' },
  wSummaryTotal: { width: '34%', textAlign: 'right' },
  
  // Totals
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  totalBox: {
    width: '55%',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT_COLOR,
    borderTopWidth: 2,
    borderTopColor: ACCENT_COLOR,
    marginTop: 4,
    backgroundColor: '#f4f9f8',
  },
  grandTotalLabel: {
    fontSize: 11,
    color: ACCENT_COLOR,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingLeft: 10,
  },
  grandTotalValue: {
    fontSize: 11,
    color: ACCENT_COLOR,
    fontWeight: 'bold',
    paddingRight: 10,
  },
  
  // In Words
  inWordsText: {
    fontSize: 8,
    color: TEXT_MUTED,
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'right',
  },

  // Footer
  footerFixed: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    color: TEXT_LIGHT,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerWebsite: {
    fontSize: 8,
    color: ACCENT_COLOR,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Terms
  termsSection: {
    marginTop: 20,
  },
  termTitle: {
    fontSize: 10,
    color: ACCENT_COLOR,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  termText: {
    fontSize: 8,
    color: TEXT_MUTED,
    lineHeight: 1.5,
    marginBottom: 15,
  },
  drawingAlert: {
    padding: 10,
    backgroundColor: '#fff0f0',
    color: '#d32f2f',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 10,
  },
  
  // Signatures
  signatureArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 60,
  },
  sigBlock: {
    width: '35%',
  },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: TEXT_DARK,
    marginBottom: 6,
  },
  sigName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TEXT_DARK,
  },
  sigRole: {
    fontSize: 8,
    color: TEXT_MUTED,
  },

  // Material text formatting
  matLine: {
    fontSize: 8,
    color: TEXT_MUTED,
    lineHeight: 1.3,
  },
  matPrefix: {
    fontWeight: 'bold',
    color: TEXT_DARK,
  }
});

const HeaderPdf = ({ date, subject }: { date: string; subject: string }) => {
  const formatDate = (dateString: string) => {
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

  return (
    <View style={styles.headerFlex}>
      <View style={styles.logoContainer}>
        <Image src="/Logo/HeaderLogo.png" style={styles.logo} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ alignItems: 'flex-end', marginRight: 15 }}>
          <Text style={styles.documentTitle}>Quotation</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{formatDate(date)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Ref</Text>
              <Text style={styles.metaValue}>{subject.substring(0, 30)}</Text>
            </View>
          </View>
        </View>
        <Image src="/files/QR_code.svg" style={{ width: 45, height: 45, marginTop: 4 }} />
      </View>
    </View>
  )
}

const FooterPdf = () => (
  <View style={styles.footerFixed} fixed>
    <Text style={styles.footerText}>
      +88 01329 694660 | +88 01329 694661 | aestheticinteriorstudio@gmail.com
    </Text>
    <Text style={styles.footerText}>
      2nd Floor, 183 East Senpara Parbata, Mirpur 10, Dhaka
    </Text>
    <Text style={styles.footerWebsite}>www.aestheticinteriorbd.com</Text>
  </View>
)

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
        <View style={styles.topStrip} fixed />
        <FooterPdf />
        
        <HeaderPdf date={content.quotationDate ?? ''} subject={content.subject ?? ''} />

        <View style={styles.clientSection}>
          <View style={styles.clientBlock}>
            <Text style={styles.clientLabel}>Prepared For</Text>
            <Text style={styles.clientName}>{clientName}</Text>
            <Text style={styles.clientAddress}>{clientAddress || '—'}</Text>
          </View>
          <View style={styles.clientBlock}>
            <Text style={styles.clientLabel}>Project Subject</Text>
            <Text style={[styles.clientAddress, { color: TEXT_DARK, fontWeight: 'bold' }]}>
              {content.summarySubject ?? content.subject ?? '—'}
            </Text>
          </View>
        </View>

        {cleanIntro ? (
          <View style={styles.greetingBox}>
            <Text style={[styles.clientName, { fontSize: 10, marginBottom: 6 }]}>Dear Sir,</Text>
            <Text style={styles.greetingText}>{cleanIntro}</Text>
          </View>
        ) : null}

        <View style={styles.tableContainer}>
          <Text style={styles.sectionTitle}>Project Summary</Text>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.wSl]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.wSummaryName]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.wSummaryTotal]}>Amount</Text>
          </View>

          {floorSummaries.map((entry, index) => (
            <View key={entry.floor.id} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]} wrap={false}>
              <Text style={[styles.cellText, styles.wSl]}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={[styles.cellTextBold, styles.wSummaryName]}>{entry.floor.name}</Text>
              <Text style={[styles.cellTextBold, styles.wSummaryTotal]}>{formatDetailAmount(entry.total)}</Text>
            </View>
          ))}

          <View style={styles.totalContainer}>
            <View style={styles.totalBox}>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>{formatDetailAmount(totals.grandTotal)}</Text>
              </View>
              <Text style={styles.inWordsText}>{amountInWordsTaka(totals.grandTotal)}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* DETAIL PAGES */}
      {floorSummaries.map((entry) => (
        <Page key={entry.floor.id} size="A4" style={styles.page}>
          <View style={styles.topStrip} fixed />
          <FooterPdf />
          
          <HeaderPdf date={content.quotationDate ?? ''} subject={content.subject ?? ''} />

          <View style={styles.tableContainer}>
            <Text style={styles.sectionTitle}>{entry.floor.name}</Text>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.wSl]}>SL</Text>
              <Text style={[styles.tableHeaderCell, styles.wName]}>Name</Text>
              <Text style={[styles.tableHeaderCell, styles.wMats]}>Materials</Text>
              <Text style={[styles.tableHeaderCell, styles.wQty]}>Qty/Sft</Text>
              <Text style={[styles.tableHeaderCell, styles.wPrice]}>Unit Price</Text>
              <Text style={[styles.tableHeaderCell, styles.wTotal]}>Total</Text>
            </View>

            {entry.lines.map((line, lineIndex) => (
              <View key={line.id} style={[styles.tableRow, lineIndex % 2 === 1 ? styles.tableRowAlt : {}]} wrap={false}>
                <Text style={[styles.cellText, styles.wSl]}>
                  {String(line.serialNo ?? lineIndex + 1).padStart(2, '0')}
                </Text>
                <Text style={[styles.cellTextBold, styles.wName]}>{line.description}</Text>
                <View style={[styles.wMats]}>
                  <MaterialTextPdf text={line.materials} />
                </View>
                <Text style={[styles.cellText, styles.wQty]}>{formatDetailQtyCell(line)}</Text>
                <Text style={[styles.cellText, styles.wPrice]}>{formatDetailUnitPriceCell(line)}</Text>
                <Text style={[styles.cellTextBold, styles.wTotal, { color: ACCENT_COLOR }]}>
                  {formatDetailTotalCell(line)}
                  {line.description.toLowerCase().includes('electric wiring') ? '\n(Approx)' : ''}
                </Text>
              </View>
            ))}

            <View style={styles.totalContainer}>
              <View style={styles.totalBox}>
                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>Total</Text>
                  <Text style={styles.grandTotalValue}>{formatDetailAmount(entry.total)}</Text>
                </View>
                <Text style={styles.inWordsText}>{amountInWordsTaka(entry.total)}</Text>
              </View>
            </View>
          </View>
        </Page>
      ))}

      {/* TERMS PAGE */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topStrip} fixed />
        <FooterPdf />
        
        <HeaderPdf date={content.quotationDate ?? ''} subject={content.subject ?? ''} />

        <Text style={styles.sectionTitle}>Terms &amp; Signatures</Text>

        <View style={styles.termsSection}>
          {content.notes ? (
            <View style={{ marginBottom: 15 }}>
              <Text style={styles.termTitle}>Notes</Text>
              <Text style={styles.termText}>{content.notes}</Text>
            </View>
          ) : null}
          
          {content.terms ? (
            <View style={{ marginBottom: 15 }}>
              <Text style={styles.termTitle}>Terms &amp; Conditions</Text>
              <Text style={styles.termText}>{content.terms}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: '45%' }}>
              {content.paymentTerms ? (
                <View style={{ marginBottom: 15 }}>
                  <Text style={styles.termTitle}>Mode of Payment</Text>
                  <Text style={styles.termText}>{content.paymentTerms}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ width: '45%' }}>
              {content.durationNotes ? (
                <View style={{ marginBottom: 15 }}>
                  <Text style={styles.termTitle}>Duration of Work</Text>
                  <Text style={styles.termText}>{content.durationNotes}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {content.drawingDesign ? (
            <Text style={styles.drawingAlert}>
              {content.drawingDesign}
            </Text>
          ) : null}
        </View>

        <View style={styles.signatureArea}>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigName}>Customer Approval</Text>
            <Text style={styles.sigRole}>Sign &amp; Date</Text>
          </View>
          
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigName}>{content.signatoryName || 'Authorized Signature'}</Text>
            <Text style={styles.sigRole}>{content.signatoryTitle || 'Aesthetic Interior'}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
