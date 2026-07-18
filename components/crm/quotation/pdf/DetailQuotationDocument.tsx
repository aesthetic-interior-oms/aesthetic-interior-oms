'use client'

import { Document, Page, StyleSheet, Text, View, Image, Svg, Path, Font } from '@react-pdf/renderer'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://www.aestheticinteriorbd.com'
}

Font.register({
  family: 'Noto Sans Bengali',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSansBengali-Regular.ttf` },
    { src: `${getBaseUrl()}/fonts/NotoSansBengali-Bold.ttf`, fontWeight: 'bold' }
  ]
});
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
    paddingTop: 110,
    paddingBottom: 90,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: 'Noto Sans Bengali',
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
    position: 'absolute',
    top: 40,
    left: 40,
    right: 40,
    marginBottom: 20,
  },
  logo: {
    width: 150,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PRIMARY,
    letterSpacing: 1,
  },
  metaBox: {
    backgroundColor: '#f5f9f8',
    padding: 6,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    marginTop: 8,
    minWidth: 160,
  },
  metaRowFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaBoxLabel: {
    fontSize: 7,
    color: '#555555',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  metaBoxValue: {
    fontSize: 7.5,
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
    backgroundColor: '#e6f0ef',
    padding: 8,
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
    // No wrapper needed
  },
  tHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY,
    paddingBottom: 6,
    paddingTop: 10,
  },
  thCol: {
    fontSize: 8,
    fontWeight: 'bold',
    color: PRIMARY,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  thColLast: {
    
  },
  tRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  tRowAlt: {
    backgroundColor: '#f5f5ea',
  },
  tdCol: {
    fontSize: 9,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tdColLast: {
    
  },
  
  // Columns Detail
  wSl: { width: '8%', textAlign: 'center' },
  wName: { width: '24%' },
  wMats: { width: '36%' },
  wQty: { width: '10%', textAlign: 'center' },
  wPrice: { width: '10%', textAlign: 'right' },
  wTotal: { width: '12%', textAlign: 'right' },
  
  // Wrapped Rows (Detail Table)
  tRowDetail: {
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    width: '100%',
    minHeight: 25,
  },
  tdColAbs: {
    position: 'absolute',
    top: 0,
    fontSize: 9,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  wMatsFlow: {
    marginLeft: '32%',
    width: '36%',
    fontSize: 9,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  posSl: { left: '0%', width: '8%', textAlign: 'center' },
  posName: { left: '8%', width: '24%' },
  posQty: { left: '68%', width: '10%', textAlign: 'center' },
  posPrice: { left: '78%', width: '10%', textAlign: 'right' },
  posTotal: { left: '88%', width: '12%', textAlign: 'right' },

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

const WatermarkBackground = () => (
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: -1, opacity: 0.05 }} fixed>
    <Image src={`${getBaseUrl()}/android-chrome-512x512.png`} style={{ width: 400, height: 400 }} />
  </View>
);


const GlobalHeader = ({ date, subject, clientName, clientAddress }: any) => {
  let qtnIdSuffix = Math.floor(Math.random() * 1000000).toString();
  if (date) {
    let timestamp = Date.parse(date);
    if (isNaN(timestamp) && date.includes('-')) {
      const parts = date.split('-');
      if (parts.length === 3) {
        timestamp = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
      }
    }
    if (!isNaN(timestamp)) {
      qtnIdSuffix = timestamp.toString().slice(-6);
    }
  }
  const qtnId = "QTN-" + qtnIdSuffix;
  
  const formattedDate = formatDateString(date) + " " + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.header} fixed>
      {/* Top section: Logo and Meta */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 10 }}>
        {/* Left: Logo */}
        <View style={{ flex: 1 }}>
          <Image src={`${getBaseUrl()}/Logo/HeaderLogo.png`} style={{ width: 140 }} />
        </View>
        {/* Right: Meta Details */}
        <View style={{ width: '50%', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, color: '#555555', marginBottom: 3 }}><Text style={styles.bold}>Quote ID:</Text> {qtnId}</Text>
          <Text style={{ fontSize: 9, color: '#555555' }}><Text style={styles.bold}>Date:</Text> {formattedDate}</Text>
        </View>
      </View>
    </View>
  );
};

const ClientInfoBlock = ({ clientName, clientAddress }: { clientName: string, clientAddress: string | null }) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={{ fontSize: 7, color: '#a57c00', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Prepared For</Text>
    <Text style={[styles.bold, { fontSize: 13, color: PRIMARY, marginBottom: 2 }]}>{clientName}</Text>
    <Text style={{ fontSize: 10, color: '#555555' }}>{clientAddress}</Text>
  </View>
);

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
      <View style={{ width: '35%', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        <Text style={styles.footerText}>© 2026 All rights reserved.</Text>
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
        <WatermarkBackground />
        <GlobalHeader 
          date={content.quotationDate ?? ''} 
          subject={content.subject ?? ''} 
          clientName={clientName} 
          clientAddress={clientAddress || ''} 
        />
        
        <ClientInfoBlock clientName={clientName} clientAddress={clientAddress} />

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
        <Page key={entry.floor.id} size="A4" style={styles.page}>
          <WatermarkBackground />
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

          <View style={styles.tableWrapper}>
            {entry.lines.map((line, lineIndex) => (
              <View key={line.id} style={[styles.tRowDetail, lineIndex % 2 === 1 ? styles.tRowAlt : {}]}>
                <Text style={[styles.tdColAbs, styles.posSl]}>
                  {String(lineIndex + 1).padStart(2, '0')}
                </Text>
                <Text style={[styles.tdColAbs, styles.posName, styles.bold]}>{line.description}</Text>
                
                <View style={styles.wMatsFlow}>
                  <MaterialTextPdf text={line.materials} />
                </View>

                <Text style={[styles.tdColAbs, styles.posQty]}>{formatDetailQtyCell(line)}</Text>
                <Text style={[styles.tdColAbs, styles.posPrice]}>{formatDetailUnitPriceCell(line)}</Text>
                <Text style={[styles.tdColAbs, styles.posTotal, styles.bold, { color: PRIMARY }]}>
                  {formatDetailTotalCell(line)}
                  {line.description?.toLowerCase().includes('electric wiring') ? '\n(Approx)' : ''}
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
        <WatermarkBackground />
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
