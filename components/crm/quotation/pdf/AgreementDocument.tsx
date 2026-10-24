'use client'

import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { AgreementContent } from '@/lib/agreement-template'
import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'
import { buildDetailFloorSummaries, formatDetailAmount, formatDetailQtyCell, formatDetailUnitPriceCell, formatDetailTotalCell } from '@/lib/detail-quotation-format'
import { amountInWordsTaka } from '@/lib/number-to-words'

const ink = '#1f363d'
const gold = '#a57c00'
const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.aestheticinteriortech.com'
Font.register({ family: 'Noto Sans Bengali', fonts: [
  { src: `${baseUrl}/fonts/NotoSansBengali-Regular.ttf` },
  { src: `${baseUrl}/fonts/NotoSansBengali-Bold.ttf`, fontWeight: 'bold' },
] })
const styles = StyleSheet.create({
  page: { paddingTop: 46, paddingBottom: 44, paddingHorizontal: 42, fontFamily: 'Noto Sans Bengali', fontSize: 9, color: '#17212b', lineHeight: 1.45 },
  header: { marginBottom: 22, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: gold, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  brand: { fontSize: 17, fontWeight: 'bold', color: ink, letterSpacing: 1.1 },
  company: { marginTop: 2, fontSize: 7, color: '#53636a', letterSpacing: 1.3 },
  meta: { fontSize: 8, color: '#53636a', textAlign: 'right' },
  title: { color: ink, fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginBottom: 14, letterSpacing: 0.7 },
  section: { color: ink, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 14, marginBottom: 7, borderBottomWidth: 0.7, borderBottomColor: '#d7d7d7', paddingBottom: 4 },
  paragraph: { marginBottom: 8, lineHeight: 1.55 },
  reference: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, fontSize: 8 },
  tableHead: { flexDirection: 'row', backgroundColor: ink, color: 'white', paddingVertical: 6, paddingHorizontal: 5, fontSize: 8, fontWeight: 'bold' },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#d7d7d7', paddingVertical: 5, paddingHorizontal: 5, fontSize: 8 },
  totalsRow: { flexDirection: 'row', borderTopWidth: 0.9, borderTopColor: ink, paddingVertical: 6, paddingHorizontal: 5, fontSize: 8, fontWeight: 'bold', color: ink },
  alt: { backgroundColor: '#f5f8f7' },
  colSl: { width: '7%' }, colName: { width: '62%' }, colAmount: { width: '31%', textAlign: 'right' },
  colDesc: { width: '49%' }, colQty: { width: '12%', textAlign: 'center' }, colRate: { width: '17%', textAlign: 'right' }, colTotal: { width: '22%', textAlign: 'right' },
  total: { textAlign: 'right', color: ink, fontSize: 10, fontWeight: 'bold', marginTop: 8 },
  muted: { fontSize: 8, color: '#53636a' },
  groupTitle: { fontSize: 11, fontWeight: 'bold', color: ink, marginTop: 8, marginBottom: 8 },
  clause: { marginBottom: 8, flexDirection: 'row' },
  clauseNumber: { width: 22, color: gold, fontWeight: 'bold' }, clauseText: { flex: 1, lineHeight: 1.55 },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 48 },
  signBlock: { width: '42%', borderTopWidth: 0.8, borderTopColor: '#53636a', paddingTop: 7 },
  signLabel: { fontSize: 8, color: '#53636a' }, signName: { fontSize: 9, fontWeight: 'bold', marginBottom: 2 },
  witnessRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  witness: { width: '30%', borderTopWidth: 0.8, borderTopColor: '#53636a', paddingTop: 7 },
  footer: { position: 'absolute', bottom: 20, left: 42, right: 42, borderTopWidth: 0.5, borderTopColor: '#d7d7d7', paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between', color: '#68767b', fontSize: 7 },
})

function Header({ code, date }: { code: string; date: string }) {
  return <View style={styles.header} fixed><View><Text style={styles.brand}>AESTHETIC INTERIOR</Text><Text style={styles.company}>DESIGN · BUILD · DELIVER</Text></View><View><Text style={styles.meta}>{code}</Text><Text style={styles.meta}>{date}</Text></View></View>
}

function Footer() {
  return <View style={styles.footer} fixed><Text>Agreement Paper · Aesthetic Interior</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
}

export function AgreementDocumentPdf({ agreement, quotation, totals, clientName, agreementValue }: {
  agreement: AgreementContent
  quotation: QuotationDraftContent | null
  totals: QuotationTotals | null
  clientName: string
  agreementValue: number | null
}) {
  const rows = quotation ? buildDetailFloorSummaries(quotation) : []
  const finalValue = Number(agreement.agreementValue) || agreementValue || totals?.grandTotal || 0
  const paymentPercentTotal = agreement.paymentSchedule.reduce((sum, item) => sum + (Number.parseFloat(item.percentage.replace('%', '')) || 0), 0)
  const paymentAmountTotal = agreement.paymentSchedule.reduce((sum, item) => sum + (Number.parseFloat(item.amount.replace(/,/g, '')) || 0), 0)
  return <Document title={`Agreement - ${clientName}`} author="Aesthetic Interior">
    <Page size="A4" style={styles.page}>
      <Header code={agreement.workOrderId} date={agreement.agreementDate} />
      <Text style={styles.title}>WORK ORDER FOR INTERIOR WORKS</Text>
      <View style={styles.reference}><Text>Reference: {agreement.reference}</Text><Text>Date: {agreement.agreementDate}</Text></View>
      <Text style={styles.paragraph}>To: Aesthetic Interior, 3rd Floor, 183 East Senpara Parbata, Begum Rokeya Sarani, Mirpur 10, Dhaka-1207, Bangladesh</Text>
      <Text style={styles.paragraph}>Phone: 01329-694660, 01329-694661</Text>
      <Text style={styles.paragraph}>Dear Aesthetic Interior,</Text>
      {agreement.letterBody.split('\n').filter(Boolean).map((line, index) => <Text key={index} style={styles.paragraph}>{line}</Text>)}
      <Footer />
    </Page>

    <Page size="A4" style={styles.page}>
      <Header code={agreement.workOrderId} date={agreement.agreementDate} />
      <Text style={styles.title}>AGREEMENT AND PROJECT DETAILS</Text>
      <Text style={styles.section}>Parties</Text>
      <Text style={styles.paragraph}>This Agreement is made at Dhaka on {agreement.agreementDate} between {agreement.ownerName}, Owner of the property at {agreement.ownerAddress || agreement.projectAddress}, referred to as the “Owner”, and Aesthetic Interior, represented by {agreement.companyRepresentative}, {agreement.companyRepresentativeTitle}, referred to as the “Company”.</Text>
      <Text style={styles.paragraph}>Project: {agreement.projectName || agreement.projectAddress}. Work Order: {agreement.workOrderId}. Subcontract ID: {agreement.subContractId}.</Text>
      <Text style={styles.section}>Agreement documents</Text>
      <Text style={styles.paragraph}>The approved detail quotation, project drawings and specifications, this work order, payment schedule, annexures and clauses form the agreement documents for the project. They should be read together with this Agreement.</Text>
      <Text style={styles.paragraph}>Client: {agreement.ownerName}{'\n'}Project address: {agreement.projectAddress || agreement.ownerAddress}{'\n'}Senior CRM coordinator: {agreement.srCrmName || '____________________'}{'\n'}Company: Aesthetic Interior</Text>
      <Footer />
    </Page>

    <Page size="A4" style={styles.page}>
      <Header code={agreement.workOrderId} date={agreement.agreementDate} />
      <Text style={styles.title}>QUOTATION SUMMARY</Text>
      <Text style={styles.section}>Quotation Summary</Text>
      <View style={styles.tableHead}><Text style={styles.colSl}>SL</Text><Text style={styles.colName}>Item</Text><Text style={styles.colAmount}>Amount (৳)</Text></View>
      {rows.length ? rows.map((section, index) => <View key={section.floor.id} style={[styles.row, index % 2 ? styles.alt : {}]}><Text style={styles.colSl}>{String(index + 1).padStart(2, '0')}</Text><Text style={styles.colName}>{section.floor.name}</Text><Text style={styles.colAmount}>{formatDetailAmount(section.total)}</Text></View>) : <View style={styles.row}><Text style={styles.colSl}>01</Text><Text style={styles.colName}>Interior work</Text><Text style={styles.colAmount}>{formatDetailAmount(totals?.subtotal ?? finalValue)}</Text></View>}
      {totals?.discountAmount ? <View style={styles.row}><Text style={styles.colSl}></Text><Text style={styles.colName}>Discount / honor</Text><Text style={styles.colAmount}>- {formatDetailAmount(totals.discountAmount)}</Text></View> : null}
      {totals && finalValue !== totals.grandTotal ? <View style={styles.row}><Text style={styles.colSl}></Text><Text style={styles.colName}>Agreement value adjustment</Text><Text style={styles.colAmount}>{finalValue > totals.grandTotal ? '+ ' : '- '}{formatDetailAmount(Math.abs(finalValue - totals.grandTotal))}</Text></View> : null}
      <View style={[styles.row, styles.alt]}><Text style={styles.colSl}></Text><Text style={styles.colName}>Agreement total</Text><Text style={styles.colAmount}>{formatDetailAmount(finalValue)}</Text></View>
      <Text style={styles.total}>Total in words: {amountInWordsTaka(finalValue)}</Text>
      <Footer />
    </Page>

    <Page size="A4" style={styles.page}>
      <Header code={agreement.workOrderId} date={agreement.agreementDate} />
      <Text style={styles.title}>PAYMENT SCHEDULE</Text>
      <Text style={styles.section}>Payment Schedule</Text>
      <View style={styles.tableHead}><Text style={styles.colSl}>SL</Text><Text style={styles.colName}>Payment stage</Text><Text style={{ width: '13%', textAlign: 'right' }}>%</Text><Text style={{ width: '18%', textAlign: 'right' }}>Taka</Text></View>
      {agreement.paymentSchedule.map((item, index) => <View key={index} style={[styles.row, index % 2 ? styles.alt : {}]}><Text style={styles.colSl}>{String(index + 1).padStart(2, '0')}</Text><Text style={styles.colName}>{item.stage}</Text><Text style={{ width: '13%', textAlign: 'right' }}>{item.percentage}</Text><Text style={{ width: '18%', textAlign: 'right' }}>{item.amount}</Text></View>)}
      <View style={styles.totalsRow}><Text style={styles.colSl}></Text><Text style={styles.colName}>Total</Text><Text style={{ width: '13%', textAlign: 'right' }}>{paymentPercentTotal.toFixed(2).replace(/\.00$/, '')}%</Text><Text style={{ width: '18%', textAlign: 'right' }}>{formatDetailAmount(paymentAmountTotal)}</Text></View>
      <Footer />
    </Page>

    <Page size="A4" style={styles.page}>
      <Header code={agreement.workOrderId} date={agreement.agreementDate} />
      <Text style={styles.title}>ANNEXURES</Text>
      {agreement.annexures.map((item, index) => <Text key={index} style={styles.paragraph}>A{index + 1}. {item}</Text>)}
      <Footer />
    </Page>

    <Page size="A4" style={styles.page}>
      <Header code={agreement.workOrderId} date={agreement.agreementDate} />
      <Text style={styles.title}>DETAIL QUOTATION</Text>
      {quotation ? <>
        <Text style={styles.muted}>{quotation.subject || 'Interior works'} · {quotation.versionTitle || ''}</Text>
        {rows.map((section) => <View key={section.floor.id} wrap>
          <Text style={styles.section}>{section.floor.name}</Text>
          <View style={styles.tableHead}><Text style={styles.colSl}>SL</Text><Text style={styles.colDesc}>Description / materials</Text><Text style={styles.colQty}>Qty</Text><Text style={styles.colRate}>Rate</Text><Text style={styles.colTotal}>Total</Text></View>
          {section.lines.map((line, index) => <View key={line.id} style={[styles.row, index % 2 ? styles.alt : {}]} wrap={false}>
            <Text style={styles.colSl}>{String(index + 1).padStart(2, '0')}</Text><Text style={styles.colDesc}>{line.description}{line.materials ? `\n${line.materials}` : ''}</Text><Text style={styles.colQty}>{formatDetailQtyCell(line)}</Text><Text style={styles.colRate}>{formatDetailUnitPriceCell(line)}</Text><Text style={styles.colTotal}>{formatDetailTotalCell(line)}</Text>
          </View>)}
          <Text style={styles.total}>Section total: ৳ {formatDetailAmount(section.total)}</Text>
        </View>)}
        <Text style={styles.total}>Grand Total: ৳ {formatDetailAmount(finalValue)}</Text>
      </> : <Text style={styles.paragraph}>No detail quotation is currently saved for this client. Add or finalize the detail quotation in the quotation workspace, then reopen this agreement.</Text>}
      <Footer />
    </Page>

    {agreement.clauseGroups.map((group, groupIndex) => <Page key={group.title} size="A4" style={styles.page}>
      <Header code={agreement.workOrderId} date={agreement.agreementDate} />
      <Text style={styles.title}>AGREEMENT CLAUSES</Text>
      <Text style={styles.groupTitle}>{groupIndex + 1}. {group.title}</Text>
      {group.clauses.map((clause, index) => <View key={index} style={styles.clause} wrap={false}><Text style={styles.clauseNumber}>{groupIndex + 1}.{index + 1}</Text><Text style={styles.clauseText}>{clause}</Text></View>)}
      <Footer />
    </Page>)}

    <Page size="A4" style={styles.page}>
      <Header code={agreement.workOrderId} date={agreement.agreementDate} />
      <Text style={styles.title}>SIGNATURE AND WITNESS</Text>
      <Text style={styles.paragraph}>IN WITNESS WHEREOF, the parties confirm that they have read and understood this Agreement and have signed it in the presence of the witnesses below on the date first written above.</Text>
      <View style={styles.signatureRow}>
        <View style={styles.signBlock}><Text style={styles.signName}>{agreement.ownerName}</Text><Text style={styles.signLabel}>Owner / Client signature</Text><Text style={styles.signLabel}>Date: ____________________</Text></View>
        <View style={styles.signBlock}><Text style={styles.signName}>{agreement.ceoName}</Text><Text style={styles.signLabel}>Chief Executive Officer</Text><Text style={styles.signLabel}>Aesthetic Interior</Text></View>
      </View>
      <View style={styles.signatureRow}>
        <View style={styles.signBlock}><Text style={styles.signName}>{agreement.srCrmName || 'Senior CRM'}</Text><Text style={styles.signLabel}>Senior CRM / Agreement Coordinator</Text><Text style={styles.signLabel}>For Aesthetic Interior</Text></View>
        <View style={styles.signBlock}><Text style={styles.signName}>{agreement.companyRepresentative}</Text><Text style={styles.signLabel}>{agreement.companyRepresentativeTitle}</Text><Text style={styles.signLabel}>Acknowledged by Aesthetic Interior</Text></View>
      </View>
      <Text style={styles.section}>Witnesses</Text>
      <View style={styles.witnessRow}>{agreement.witnessNames.map((name, index) => <View key={index} style={styles.witness}><Text style={styles.signName}>{name || `Witness ${index + 1}`}</Text><Text style={styles.signLabel}>Name and signature</Text><Text style={styles.signLabel}>Date: ____________________</Text></View>)}</View>
      <Text style={[styles.paragraph, { marginTop: 35 }]}>Company: Aesthetic Interior · Client: {clientName} · Agreement value: ৳ {formatDetailAmount(finalValue)}</Text>
      <Footer />
    </Page>
  </Document>
}
