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

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#000000',
    backgroundColor: '#ffffff',
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    paddingBottom: 20,
    marginBottom: 20,
  },
  logo: {
    width: 150,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PRIMARY,
    letterSpacing: 2,
  },
  metaBox: {
    backgroundColor: '#f0f5f4',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    marginTop: 8,
    minWidth: 180,
  },
  metaRowFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaBoxLabel: {
    fontSize: 8,
    color: '#555555',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  metaBoxValue: {
    fontSize: 9,
    color: '#000000',
    fontWeight: 'bold',
    textAlign: 'right',
    maxWidth: 130,
  },
  metaText: {
    fontSize: 9,
    color: '#555555',
    marginBottom: 3,
  },
  bold: {
    fontWeight: 'bold',
    color: '#000000',
  },
  
  // Table
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PRIMARY,
    backgroundColor: '#f0f5f4',
    padding: 6,
    marginTop: 15,
    textTransform: 'uppercase',
  },
  tHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY,
    paddingBottom: 5,
    paddingTop: 10,
  },
  thCol: {
    fontSize: 8,
    fontWeight: 'bold',
    color: PRIMARY,
    textTransform: 'uppercase',
  },
  tRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 0.5,
    borderBottomColor: '#eeeeee',
    paddingVertical: 8,
  },
  tdCol: {
    fontSize: 9,
  },
  
  // Columns Detail
  wSl: { width: '8%', textAlign: 'center' },
  wName: { width: '24%', paddingRight: 5 },
  wMats: { width: '36%', paddingRight: 5 },
  wQty: { width: '10%', textAlign: 'center' },
  wPrice: { width: '10%', textAlign: 'right' },
  wTotal: { width: '12%', textAlign: 'right' },
  
  // Columns Summary
  wSumName: { width: '70%', paddingLeft: 10 },
  wSumTotal: { width: '22%', textAlign: 'right' },
  
  // Totals
  grandTotalRow: {
    flexDirection: 'row',
    paddingTop: 8,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: PRIMARY,
  },
  grandTotalLabel: {
    width: '88%',
    textAlign: 'right',
    paddingRight: 10,
    fontWeight: 'bold',
    fontSize: 10,
    color: PRIMARY,
  },
  grandTotalValue: {
    width: '12%',
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: 10,
    color: PRIMARY,
  },
  inWords: {
    fontSize: 8,
    fontStyle: 'italic',
    color: '#666666',
    marginTop: 4,
    textAlign: 'right',
  },
  
  // Footer
  footerFixed: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#dddddd',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#888888',
  },
  
  // Materials
  matText: {
    fontSize: 8,
    color: '#444444',
    marginBottom: 2,
  },
  
  // Terms
  termsContainer: {
    marginTop: 10,
  },
  termTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 3,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  termContent: {
    fontSize: 8,
    color: '#555555',
    lineHeight: 1.5,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 60,
  },
  sigLine: {
    width: 150,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 5,
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

const GlobalHeader = ({ date, subject, clientName, clientAddress }: any) => (
  <View style={styles.header}>
    <View style={{ width: '50%' }}>
      <Image src="/Logo/HeaderLogo.png" style={styles.logo} />
      <View style={{ marginTop: 20 }}>
        <Text style={styles.metaText}>Prepared For:</Text>
        <Text style={[styles.metaText, styles.bold, { fontSize: 11, color: PRIMARY }]}>{clientName}</Text>
        <Text style={styles.metaText}>{clientAddress}</Text>
      </View>
    </View>
    <View style={styles.headerRight}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styles.docTitle, { marginRight: 10 }]}>QUOTATION</Text>
        <Image src="/files/QR_code.svg" style={{ width: 35, height: 35 }} />
      </View>
      <View style={styles.metaBox}>
        <View style={styles.metaRowFlex}>
          <Text style={styles.metaBoxLabel}>Date</Text>
          <Text style={styles.metaBoxValue}>{formatDateString(date)}</Text>
        </View>
        <View style={[styles.metaRowFlex, { marginBottom: 0 }]}>
          <Text style={styles.metaBoxLabel}>Ref</Text>
          <Text style={styles.metaBoxValue}>{subject.substring(0, 40)}</Text>
        </View>
      </View>
    </View>
  </View>
);

const FooterFixed = () => (
  <View style={styles.footerFixed} fixed>
    <Text style={styles.footerText}>+88 01329 694660 | +88 01329 694661 | aestheticinteriorstudio@gmail.com</Text>
    <Text style={styles.footerText}>www.aestheticinteriorbd.com</Text>
  </View>
);

function MaterialTextPdf({ text }: { text: string | null | undefined }) {
  if (!text) return <Text style={styles.matText}>—</Text>
  const lines = text.split('\n')
  return (
    <View>
      {lines.map((line, index) => {
        const match = line.match(/^(\d{2}\.[^:]+:|[^:*]+:|\*[^:]+:)/)
        if (!match) {
          return <Text key={`${line}-${index}`} style={styles.matText}>{line}</Text>
        }
        const prefix = match[1]
        const rest = line.substring(prefix.length)
        return (
          <Text key={`${line}-${index}`} style={styles.matText}>
            <Text style={styles.bold}>{prefix}</Text>{rest}
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
        <GlobalHeader 
          date={content.quotationDate ?? ''} 
          subject={content.subject ?? ''} 
          clientName={clientName} 
          clientAddress={clientAddress || ''} 
        />
        
        {cleanIntro ? (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.metaText, styles.bold]}>Dear Sir,</Text>
            <Text style={[styles.metaText, { textAlign: 'justify', lineHeight: 1.5 }]}>{cleanIntro}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Project Summary</Text>
        
        <View style={styles.tHead}>
          <Text style={[styles.thCol, styles.wSl]}>SL</Text>
          <Text style={[styles.thCol, styles.wSumName]}>Description</Text>
          <Text style={[styles.thCol, styles.wSumTotal]}>Amount</Text>
        </View>

        {floorSummaries.map((entry, index) => (
          <View key={entry.floor.id} style={styles.tRow}>
            <Text style={[styles.tdCol, styles.wSl]}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={[styles.tdCol, styles.wSumName, styles.bold]}>{entry.floor.name}</Text>
            <Text style={[styles.tdCol, styles.wSumTotal, styles.bold]}>{formatDetailAmount(entry.total)}</Text>
          </View>
        ))}

        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Grand Total</Text>
          <Text style={styles.grandTotalValue}>{formatDetailAmount(totals.grandTotal)}</Text>
        </View>
        <Text style={styles.inWords}>In Words: <Text style={styles.bold}>{amountInWordsTaka(totals.grandTotal)}</Text></Text>

        <FooterFixed />
      </Page>

      {/* DETAIL PAGES */}
      {floorSummaries.map((entry) => (
        <Page key={entry.floor.id} size="A4" style={styles.page}>
          <GlobalHeader 
            date={content.quotationDate ?? ''} 
            subject={content.subject ?? ''} 
            clientName={clientName} 
            clientAddress={clientAddress || ''} 
          />

          <Text style={styles.sectionTitle}>{entry.floor.name}</Text>
          
          <View style={styles.tHead}>
            <Text style={[styles.thCol, styles.wSl]}>SL</Text>
            <Text style={[styles.thCol, styles.wName]}>Name</Text>
            <Text style={[styles.thCol, styles.wMats]}>Materials</Text>
            <Text style={[styles.thCol, styles.wQty]}>Qty/Sft</Text>
            <Text style={[styles.thCol, styles.wPrice]}>Unit Price</Text>
            <Text style={[styles.thCol, styles.wTotal]}>Total</Text>
          </View>

          {entry.lines.map((line, lineIndex) => (
            // Notice: wrap={false} is INTENTIONALLY REMOVED so long rows break naturally across pages without data loss
            <View key={line.id} style={styles.tRow}>
              <Text style={[styles.tdCol, styles.wSl]}>
                {String(line.serialNo ?? lineIndex + 1).padStart(2, '0')}
              </Text>
              <Text style={[styles.tdCol, styles.wName, styles.bold]}>{line.description}</Text>
              <View style={[styles.wMats]}>
                <MaterialTextPdf text={line.materials} />
              </View>
              <Text style={[styles.tdCol, styles.wQty]}>{formatDetailQtyCell(line)}</Text>
              <Text style={[styles.tdCol, styles.wPrice]}>{formatDetailUnitPriceCell(line)}</Text>
              <Text style={[styles.tdCol, styles.wTotal, styles.bold, { color: PRIMARY }]}>
                {formatDetailTotalCell(line)}
                {line.description.toLowerCase().includes('electric wiring') ? '\n(Approx)' : ''}
              </Text>
            </View>
          ))}
          
          <View style={[styles.grandTotalRow, { marginTop: 15 }]} wrap={false}>
            <Text style={styles.grandTotalLabel}>Total for {entry.floor.name}</Text>
            <Text style={styles.grandTotalValue}>{formatDetailAmount(entry.total)}</Text>
          </View>
          <Text style={styles.inWords} wrap={false}>In Words: <Text style={styles.bold}>{amountInWordsTaka(entry.total)}</Text></Text>

          <FooterFixed />
        </Page>
      ))}

      {/* TERMS PAGE */}
      <Page size="A4" style={styles.page}>
        <GlobalHeader 
          date={content.quotationDate ?? ''} 
          subject={content.subject ?? ''} 
          clientName={clientName} 
          clientAddress={clientAddress || ''} 
        />

        <Text style={styles.sectionTitle}>Terms &amp; Signatures</Text>

        <View style={styles.termsContainer}>
          {content.notes ? (
            <View>
              <Text style={styles.termTitle}>Notes</Text>
              <Text style={styles.termContent}>{content.notes}</Text>
            </View>
          ) : null}
          
          {content.terms ? (
            <View>
              <Text style={styles.termTitle}>Terms &amp; Conditions</Text>
              <Text style={styles.termContent}>{content.terms}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: '48%' }}>
              {content.paymentTerms ? (
                <View>
                  <Text style={styles.termTitle}>Mode of Payment</Text>
                  <Text style={styles.termContent}>{content.paymentTerms}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ width: '48%' }}>
              {content.durationNotes ? (
                <View>
                  <Text style={styles.termTitle}>Duration of Work</Text>
                  <Text style={styles.termContent}>{content.durationNotes}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {content.drawingDesign ? (
            <Text style={[styles.termContent, { color: '#d32f2f', fontWeight: 'bold', marginTop: 10 }]}>
              {content.drawingDesign}
            </Text>
          ) : null}
        </View>

        <View style={styles.signatureRow}>
          <View>
            <View style={styles.sigLine} />
            <Text style={[styles.metaText, styles.bold, { marginTop: 4 }]}>Customer Approval</Text>
            <Text style={styles.metaText}>Sign &amp; Date</Text>
          </View>
          
          <View>
            <View style={styles.sigLine} />
            <Text style={[styles.metaText, styles.bold, { marginTop: 4 }]}>{content.signatoryName || 'Authorized Signature'}</Text>
            <Text style={styles.metaText}>{content.signatoryTitle || 'Aesthetic Interior'}</Text>
          </View>
        </View>

        <FooterFixed />
      </Page>
    </Document>
  )
}
