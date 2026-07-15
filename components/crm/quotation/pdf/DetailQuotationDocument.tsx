'use client'

import { Document, Page, StyleSheet, Text, View, Image, Svg, Path } from '@react-pdf/renderer'
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
    paddingTop: 40,
    paddingBottom: 70,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#000000',
    backgroundColor: '#ffffff',
    lineHeight: 1.4,
  },
  detailPage: {
    paddingTop: 160,
    paddingBottom: 70,
    paddingLeft: 40,
    paddingRight: 40,
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
    paddingBottom: 15,
    marginBottom: 20,
  },
  logo: {
    width: 150,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PRIMARY,
    letterSpacing: 1,
  },
  metaBox: {
    backgroundColor: '#f5f9f8',
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    marginTop: 8,
    minWidth: 180,
  },
  metaRowFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaBoxLabel: {
    fontSize: 8,
    color: '#555555',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginLeft: 4,
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
  detailFixedHeader: {
    position: 'absolute',
    top: 40,
    left: 40,
    right: 40,
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderTopWidth: 0,
  },
  tHead: {
    flexDirection: 'row',
    backgroundColor: PRIMARY,
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  thCol: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#ffffff',
    textAlign: 'center',
  },
  thColLast: {
    borderRightWidth: 0,
  },
  tRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  tRowAlt: {
    backgroundColor: '#fafafa',
  },
  tdCol: {
    fontSize: 9,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#cccccc',
  },
  tdColLast: {
    borderRightWidth: 0,
  },
  
  // Columns Detail
  wSl: { width: '8%', textAlign: 'center' },
  wName: { width: '24%' },
  wMats: { width: '36%' },
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
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#666666',
    marginLeft: 4,
  },
  
  // Materials
  matText: {
    fontSize: 8,
    color: '#444444',
    marginBottom: 2,
  },
  
  // Terms
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

const HeaderIcon = ({ path }: { path: string }) => (
  <Svg width="10" height="10" viewBox="0 0 24 24" style={{ fill: PRIMARY }}>
    <Path d={path} />
  </Svg>
);

const GlobalHeader = ({ date, subject, clientName, clientAddress }: any) => {
  const qtnId = "QTN-" + (date ? new Date(date).getTime().toString().slice(-6) : Math.floor(Math.random() * 1000000).toString());
  const formattedDate = formatDateString(date) + " " + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <HeaderIcon path="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
              <Text style={styles.metaBoxLabel}>Date &amp; Time</Text>
            </View>
            <Text style={styles.metaBoxValue}>{formattedDate}</Text>
          </View>
          <View style={[styles.metaRowFlex, { marginBottom: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <HeaderIcon path="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              <Text style={styles.metaBoxLabel}>Quote ID</Text>
            </View>
            <Text style={styles.metaBoxValue}>{qtnId}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const FooterFixed = () => (
  <View style={styles.footerFixed} fixed>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <HeaderIcon path="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1v3.5c0 .55-.45 1-1 1H4c0 5.07 4.02 9.2 9 9.5z" />
        <Text style={styles.footerText}>+88 01329 694660, +88 01329 694661</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <HeaderIcon path="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        <Text style={styles.footerText}>aestheticinteriorstudio@gmail.com</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <HeaderIcon path="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        <Text style={styles.footerText}>2nd Floor, 183 East Senpara Parbata, Mirpur 10, Dhaka</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <HeaderIcon path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold' }]}>www.aestheticinteriorbd.com</Text>
      </View>
    </View>
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
          <Text style={[styles.thCol, styles.wSumTotal, styles.thColLast]}>Amount</Text>
        </View>

        <View style={styles.tableWrapper}>
          {floorSummaries.map((entry, index) => (
            <View key={entry.floor.id} style={[styles.tRow, index % 2 === 1 ? styles.tRowAlt : {}]}>
              <Text style={[styles.tdCol, styles.wSl]}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={[styles.tdCol, styles.wSumName, styles.bold]}>{entry.floor.name}</Text>
              <Text style={[styles.tdCol, styles.wSumTotal, styles.tdColLast, styles.bold]}>{formatDetailAmount(entry.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Grand Total</Text>
          <Text style={styles.grandTotalValue}>{formatDetailAmount(totals.grandTotal)}</Text>
        </View>
        <Text style={styles.inWords}>In Words: <Text style={styles.bold}>{amountInWordsTaka(totals.grandTotal)}</Text></Text>

        <FooterFixed />
      </Page>

      {/* DETAIL PAGES */}
      {floorSummaries.map((entry) => (
        <Page key={entry.floor.id} size="A4" style={styles.detailPage}>
          <View style={styles.detailFixedHeader} fixed>
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
              <Text style={[styles.thCol, styles.wTotal, styles.thColLast]}>Total</Text>
            </View>
          </View>

          <View style={styles.tableWrapper}>
            {entry.lines.map((line, lineIndex) => (
              <View key={line.id} style={[styles.tRow, lineIndex % 2 === 1 ? styles.tRowAlt : {}]}>
                <Text style={[styles.tdCol, styles.wSl]}>
                  {String(line.serialNo ?? lineIndex + 1).padStart(2, '0')}
                </Text>
                <Text style={[styles.tdCol, styles.wName, styles.bold]}>{line.description}</Text>
                <View style={[styles.tdCol, styles.wMats]}>
                  <MaterialTextPdf text={line.materials} />
                </View>
                <Text style={[styles.tdCol, styles.wQty]}>{formatDetailQtyCell(line)}</Text>
                <Text style={[styles.tdCol, styles.wPrice]}>{formatDetailUnitPriceCell(line)}</Text>
                <Text style={[styles.tdCol, styles.wTotal, styles.tdColLast, styles.bold, { color: PRIMARY }]}>
                  {formatDetailTotalCell(line)}
                  {line.description.toLowerCase().includes('electric wiring') ? '\n(Approx)' : ''}
                </Text>
              </View>
            ))}
          </View>
          
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

        <View style={{ marginTop: 10 }}>
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

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 60 }}>
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
