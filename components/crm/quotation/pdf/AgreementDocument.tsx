'use client'

import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { AgreementContent } from '@/lib/agreement-template'
import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'
import {
  buildDetailFloorSummaries,
  formatDetailAmount,
  formatDetailQtyCell,
  formatDetailUnitPriceCell,
  formatDetailTotalCell,
} from '@/lib/detail-quotation-format'
import { amountInWordsTaka } from '@/lib/number-to-words'

const PRIMARY = '#1f363d'
const GOLD = '#a57c00'
const BORDER = '#d7d7d7'
const BG_LIGHT = '#f3f8f7'
const BG_ALT = '#fffdfa'
const TEXT_DARK = '#17212b'
const TEXT_MUTED = '#555555'
const PAGE_SIDE_PADDING = 32

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://www.aestheticinteriorbd.com'
}

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
    paddingTop: 84,
    paddingBottom: 72,
    paddingLeft: PAGE_SIDE_PADDING,
    paddingRight: PAGE_SIDE_PADDING,
    fontFamily: 'Noto Sans Bengali',
    fontSize: 8.5,
    color: TEXT_DARK,
    backgroundColor: '#ffffff',
    lineHeight: 1.45,
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
    opacity: 0.04,
  },
  header: {
    position: 'absolute',
    top: 16,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    height: 60,
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    opacity: 0.08,
  },
  headerRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerRule: {
    height: 2,
    backgroundColor: PRIMARY,
  },
  headerTitle: {
    color: PRIMARY,
    fontSize: 9.5,
    fontFamily: 'Noto Sans Bengali',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginHorizontal: 12,
    textTransform: 'uppercase',
  },
  datePanel: {
    minWidth: 150,
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
    fontSize: 9,
    color: PRIMARY,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  metaSubText: {
    fontSize: 7,
    color: TEXT_MUTED,
  },
  footerFixed: {
    position: 'absolute',
    bottom: 14,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    paddingTop: 6,
    backgroundColor: '#ffffff',
  },
  footerRule: {
    borderTopWidth: 1,
    borderTopColor: GOLD,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 6.5,
    color: '#666666',
    lineHeight: 1.3,
  },
  footerMeta: {
    fontSize: 6,
    color: '#888888',
  },
  // Document Typography
  docTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: PRIMARY,
    textAlign: 'center',
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: PRIMARY,
    backgroundColor: BG_LIGHT,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  paragraph: {
    marginBottom: 7,
    lineHeight: 1.5,
    fontSize: 8.5,
    color: '#222222',
  },
  bold: {
    fontWeight: 'bold',
    color: PRIMARY,
  },
  metaBox: {
    backgroundColor: BG_LIGHT,
    padding: 8,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: BORDER,
    marginBottom: 10,
  },
  // Tables
  table: {
    width: '100%',
    borderTopWidth: 0.75,
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: BORDER,
    marginBottom: 8,
  },
  tHead: {
    flexDirection: 'row',
    backgroundColor: PRIMARY,
    paddingVertical: 4.5,
    paddingHorizontal: 4,
  },
  thCol: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tRowAlt: {
    backgroundColor: BG_ALT,
  },
  tRowHighlight: {
    backgroundColor: BG_LIGHT,
  },
  tdCol: {
    fontSize: 8,
    color: TEXT_DARK,
  },
  totalsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: PRIMARY,
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: BG_LIGHT,
  },
  inWordsBlock: {
    marginTop: 4,
    marginBottom: 10,
    padding: 6,
    backgroundColor: BG_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    borderRadius: 2,
  },
  inWordsText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  // Clauses
  clauseCard: {
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#ffffff',
    borderLeftWidth: 2,
    borderLeftColor: '#c5d1cb',
  },
  clauseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  clauseNum: {
    width: 26,
    fontSize: 8,
    fontWeight: 'bold',
    color: GOLD,
  },
  clauseText: {
    flex: 1,
    fontSize: 8,
    lineHeight: 1.45,
    color: '#2d3748',
  },
  // Signatures
  sigSection: {
    marginTop: 18,
    marginBottom: 10,
  },
  sigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  sigBlock: {
    width: '44%',
    borderTopWidth: 0.8,
    borderTopColor: PRIMARY,
    paddingTop: 5,
  },
  sigName: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 2,
  },
  sigRole: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    lineHeight: 1.3,
  },
  witnessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 12,
  },
  witnessCol: {
    width: '30%',
    borderTopWidth: 0.7,
    borderTopColor: '#888888',
    paddingTop: 4,
  },
  gmCard: {
    marginTop: 12,
    padding: 8,
    borderWidth: 0.8,
    borderColor: GOLD,
    backgroundColor: '#fffdf7',
    borderRadius: 3,
  },
})

function formatDateString(dateString: string | undefined | null) {
  if (!dateString) return 'N/A'
  try {
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString.trim())) {
      const [d, m, y] = dateString.trim().split('-').map(Number)
      const dateObj = new Date(y, m - 1, d)
      if (!isNaN(dateObj.getTime())) {
        return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(dateObj)
      }
    }
    const timestamp = Date.parse(dateString)
    if (isNaN(timestamp)) return dateString
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(timestamp))
  } catch {
    return dateString
  }
}

const WatermarkBackground = () => (
  <View style={styles.watermark} fixed>
    <Image src={`${getBaseUrl()}/android-chrome-512x512.png`} style={{ width: 420, height: 420 }} />
  </View>
)

const GlobalHeader = ({
  code,
  date,
  title = 'Agreement Paper',
}: {
  code: string
  date: string
  title?: string
}) => (
  <View style={styles.header} fixed>
    <Image src={`${getBaseUrl()}/backgrounddata.svg`} style={styles.headerPattern} />
    <View style={{ paddingTop: 2 }}>
      <View style={styles.headerRuleRow}>
        <View style={[styles.headerRule, { flexGrow: 1.6 }]} />
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={[styles.headerRule, { flexGrow: 0.9 }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Image src={`${getBaseUrl()}/Logo/HeaderLogo.png`} style={{ width: 146 }} />
        </View>
        <View style={styles.datePanel}>
          <Text style={styles.metaLabel}>Agreement Date</Text>
          <Text style={styles.metaValue}>{formatDateString(date)}</Text>
          <Text style={styles.metaSubText}>Work Order ID: {code}</Text>
        </View>
      </View>
    </View>
  </View>
)

const GlobalFooter = ({
  workOrderId,
  reference,
}: {
  workOrderId: string
  reference: string
}) => (
  <View style={styles.footerFixed} fixed>
    <View style={styles.footerRule}>
      <View style={{ width: '36%' }}>
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold', marginBottom: 2, fontSize: 8 }]}>
          Aesthetic Interior Studio
        </Text>
        <Text style={styles.footerText}>183, East Senpara, Begum Rokeya Sarani</Text>
        <Text style={styles.footerText}>3rd Floor, Mirpur 10, Dhaka-1216</Text>
      </View>
      <View style={{ width: '32%', alignItems: 'center' }}>
        <Text style={styles.footerText}>01329-694660, 01329-694661</Text>
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold' }]}>www.aestheticinteriorbd.com</Text>
      </View>
      <View style={{ width: '32%', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        <Text style={styles.footerText}>© 2026 All rights reserved.</Text>
        <Text
          style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold', marginTop: 2 }]}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
      <Text style={styles.footerMeta}>WO ID: {workOrderId || 'N/A'}</Text>
      <Text style={styles.footerMeta}>Reference: {reference || 'RD/Aesthetic'}</Text>
    </View>
  </View>
)

export function AgreementDocumentPdf({
  agreement,
  quotation,
  totals,
  clientName,
  agreementValue,
}: {
  agreement: AgreementContent
  quotation: QuotationDraftContent | null
  totals: QuotationTotals | null
  clientName: string
  agreementValue: number | null
}) {
  const rows = quotation ? buildDetailFloorSummaries(quotation) : []
  const finalValue = Number(agreement.agreementValue) || agreementValue || totals?.grandTotal || 0
  const subtotalValue = totals?.subtotal ?? finalValue
  const discountAmount = totals?.discountAmount ?? 0

  const paymentPercentTotal = agreement.paymentSchedule.reduce(
    (sum, item) => sum + (Number.parseFloat(item.percentage.replace('%', '')) || 0),
    0,
  )
  const paymentAmountTotal = agreement.paymentSchedule.reduce(
    (sum, item) => sum + (Number.parseFloat(item.amount.replace(/,/g, '')) || 0),
    0,
  )

  return (
    <Document title={`Agreement - ${clientName}`} author="Aesthetic Interior">
      {/* ─── PAGE 1: WORK ORDER FOR INTERIOR WORKS ─────────────────── */}
      <Page size="A4" style={styles.page}>
        <WatermarkBackground />
        <GlobalHeader code={agreement.workOrderId} date={agreement.agreementDate} title="Work Order" />

        <View style={{ marginBottom: 12, paddingBottom: 6, borderBottomWidth: 0.75, borderBottomColor: BORDER }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontSize: 8, color: TEXT_MUTED }}>
              Work Order ID: <Text style={{ color: PRIMARY, fontWeight: 'bold' }}>{agreement.workOrderId}</Text>
            </Text>
            <Text style={{ fontSize: 8, color: TEXT_MUTED }}>
              Date: <Text style={{ color: PRIMARY, fontWeight: 'bold' }}>{formatDateString(agreement.agreementDate)}</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 8, color: TEXT_MUTED }}>
              Sub Contract ID: <Text style={{ color: PRIMARY, fontWeight: 'bold' }}>{agreement.subContractId}</Text>
            </Text>
            <Text style={{ fontSize: 8, color: TEXT_MUTED }}>
              Reference: <Text style={{ color: PRIMARY, fontWeight: 'bold' }}>{agreement.reference}</Text>
            </Text>
          </View>
        </View>

        <Text style={styles.docTitle}>WORK ORDER FOR INTERIOR WORKS</Text>

        <View style={styles.metaBox}>
          <Text style={[styles.bold, { fontSize: 8.5, marginBottom: 2, textTransform: 'uppercase' }]}>
            DEAR, AESTHETIC INTERIOR
          </Text>
          <Text style={{ fontSize: 8, color: '#444444' }}>
            3rd Floor, 183 East Senpara Parbata, Begum Rokeya Sarani, Mirpur 10, Dhaka-1207, Bangladesh
          </Text>
          <Text style={{ fontSize: 8, color: '#444444' }}>
            Phone No: 01329-694660, 01329-694661
          </Text>
        </View>

        {agreement.letterBody.split('\n').filter(Boolean).map((line, index) => (
          <Text key={index} style={styles.paragraph}>
            {line}
          </Text>
        ))}

        <View style={{ marginTop: 24 }}>
          <Text style={[styles.paragraph, { marginBottom: 30 }]}>Thanking you—</Text>
          <View style={styles.sigRow}>
            <View style={styles.sigBlock}>
              <Text style={styles.sigName}>{agreement.ownerName || clientName}</Text>
              <Text style={styles.sigRole}>Owner (Project)</Text>
            </View>
            <View style={styles.sigBlock}>
              <Text style={styles.sigName}>{agreement.srCrmName || 'Assistant General Manager (AGM)'}</Text>
              <Text style={styles.sigRole}>Assistant General Manager (AGM)</Text>
              <Text style={styles.sigRole}>Aesthetic Interior</Text>
            </View>
          </View>
        </View>

        <GlobalFooter workOrderId={agreement.workOrderId} reference={agreement.reference} />
      </Page>

      {/* ─── PAGE 2: AGREEMENT AND RECITALS ───────────────────────── */}
      <Page size="A4" style={styles.page}>
        <WatermarkBackground />
        <GlobalHeader code={agreement.workOrderId} date={agreement.agreementDate} title="Agreement Paper" />

        <Text style={styles.docTitle}>AGREEMENT</Text>
        <Text style={[styles.paragraph, { textAlign: 'center', marginBottom: 12, fontWeight: 'bold' }]}>
          THIS AGREEMENT is made at Dhaka dated at {formatDateString(agreement.agreementDate)}.
        </Text>

        <View style={styles.metaBox}>
          <Text style={[styles.bold, { fontSize: 9, color: GOLD, marginBottom: 3, textTransform: 'uppercase' }]}>
            BETWEEN
          </Text>
          <Text style={[styles.paragraph, { marginBottom: 6 }]}>
            <Text style={styles.bold}>{agreement.ownerName || clientName}</Text>, Owner of the Apartment at{' '}
            <Text style={{ fontWeight: 'bold' }}>{agreement.ownerAddress || agreement.projectAddress || 'Dhaka, Bangladesh'}</Text>.
            (Hereinafter referred to as the <Text style={styles.bold}>“Owner”</Text>)
          </Text>

          <Text style={[styles.bold, { fontSize: 9, color: GOLD, marginBottom: 3, textTransform: 'uppercase' }]}>
            AND
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>AESTHETIC INTERIOR</Text>, having registered address at 3rd Floor, 183 East Senpara,
            Begum Rokeya Sarani, Mirpur-10, Trade License No: <Text style={{ fontWeight: 'bold' }}>TRAD/DNCC/037755/2025</Text>,
            Represented by <Text style={styles.bold}>{agreement.companyRepresentative || 'Md. Nazrul Islam'}</Text>,
            Designation: <Text style={{ fontWeight: 'bold' }}>{agreement.companyRepresentativeTitle || 'General Manager'}</Text>,
            (hereinafter referred to as the <Text style={styles.bold}>“Consultant”</Text> which expression shall, unless it be
            repugnant to the context or meaning thereof, be deemed to mean and include its successors and assigns) of the other part.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Recitals</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>WHEREAS</Text> the Owner is desirous of getting the Interior Design, Work and Execution for
          their proposed flat at {agreement.projectAddress || agreement.ownerAddress || 'Dhaka, Bangladesh'}.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>AND WHEREAS</Text> the Consultant is a Design and Build Contractor having vast experience in
          interior turnkey works and has agreed to do the interior works in the above-mentioned site.
        </Text>

        <Text style={styles.sectionTitle}>NOW IT IS AGREED BY AND BETWEEN BOTH PARTIES AS FOLLOWS:</Text>
        <View style={{ marginBottom: 8 }}>
          <View style={styles.clauseRow}>
            <Text style={styles.clauseNum}>1.</Text>
            <Text style={styles.clauseText}>
              The Aesthetic Interior shall undertake and complete the design, supply, manufacturing, installation, execution,
              furnishing, and completion of the interior works of the Project in accordance with the terms and conditions of this
              Agreement, the approved Schedule of Rates, approved drawings and designs, material specifications, and any written
              instructions issued by the Owner or the Owner's duly authorized representative.
            </Text>
          </View>
          <View style={[styles.clauseRow, { marginTop: 4 }]}>
            <Text style={styles.clauseNum}>2.</Text>
            <Text style={styles.clauseText}>
              All works shall be carried out in accordance with the approved design, specifications, agreed quality standards, and
              applicable project requirements, under the supervision and coordination of the Owner's authorized representative, and
              to the reasonable satisfaction of the Owner, subject to the terms and conditions of this Agreement.
            </Text>
          </View>
          <View style={[styles.clauseRow, { marginTop: 4 }]}>
            <Text style={styles.clauseNum}>3.</Text>
            <Text style={styles.clauseText}>
              The detailed scope of work, description of works, specifications, Schedule of Rates, approved drawings, materials,
              finishes, and other contractual requirements shall constitute an integral part of this Agreement.
            </Text>
          </View>
        </View>

        <View style={[styles.metaBox, { marginTop: 10 }]}>
          <Text style={[styles.bold, { fontSize: 8.5, marginBottom: 4, textTransform: 'uppercase', color: PRIMARY }]}>
            Project & Contract Summary
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>Project Name: <Text style={{ color: PRIMARY, fontWeight: 'bold' }}>{agreement.projectName || agreement.ownerName}</Text></Text>
            <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>Work Order: <Text style={{ color: PRIMARY, fontWeight: 'bold' }}>{agreement.workOrderId}</Text></Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>Project Address: <Text style={{ color: PRIMARY }}>{agreement.projectAddress || agreement.ownerAddress || 'Dhaka'}</Text></Text>
            <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>Subcontract ID: <Text style={{ color: PRIMARY }}>{agreement.subContractId}</Text></Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>Senior CRM: <Text style={{ color: PRIMARY }}>{agreement.srCrmName || 'Assigned Coordinator'}</Text></Text>
            <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>Agreement Value: <Text style={{ color: GOLD, fontWeight: 'bold' }}>৳ {formatDetailAmount(finalValue)}</Text></Text>
          </View>
        </View>

        <GlobalFooter workOrderId={agreement.workOrderId} reference={agreement.reference} />
      </Page>

      {/* ─── PAGE 3: QUOTATION SUMMARY & PAYMENT SCHEDULE ─────────── */}
      <Page size="A4" style={styles.page}>
        <WatermarkBackground />
        <GlobalHeader code={agreement.workOrderId} date={agreement.agreementDate} title="Quotation & Payment" />

        <Text style={styles.sectionTitle}>Quotation Summary</Text>
        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.thCol, { width: '8%', textAlign: 'center' }]}>SL</Text>
            <Text style={[styles.thCol, { width: '64%' }]}>ITEM NAME</Text>
            <Text style={[styles.thCol, { width: '28%', textAlign: 'right' }]}>TOTAL (৳)</Text>
          </View>

          {rows.length > 0 ? (
            rows.map((section, index) => (
              <View key={section.floor.id} style={[styles.tRow, index % 2 ? styles.tRowAlt : {}]}>
                <Text style={[styles.tdCol, { width: '8%', textAlign: 'center' }]}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={[styles.tdCol, { width: '64%' }]}>{section.floor.name}</Text>
                <Text style={[styles.tdCol, { width: '28%', textAlign: 'right' }]}>{formatDetailAmount(section.total)}</Text>
              </View>
            ))
          ) : (
            <>
              <View style={styles.tRow}>
                <Text style={[styles.tdCol, { width: '8%', textAlign: 'center' }]}>01</Text>
                <Text style={[styles.tdCol, { width: '64%' }]}>Interior Work</Text>
                <Text style={[styles.tdCol, { width: '28%', textAlign: 'right' }]}>{formatDetailAmount(subtotalValue)}</Text>
              </View>
              <View style={[styles.tRow, styles.tRowAlt]}>
                <Text style={[styles.tdCol, { width: '8%', textAlign: 'center' }]}>02</Text>
                <Text style={[styles.tdCol, { width: '64%', fontSize: 7.5, color: TEXT_MUTED }]}>
                  Electrical work (Approx) (The electricity bill will be calculated after the material approval meeting, as there are variations in many brands).
                </Text>
                <Text style={[styles.tdCol, { width: '28%', textAlign: 'right', color: TEXT_MUTED }]}>------</Text>
              </View>
              <View style={styles.tRow}>
                <Text style={[styles.tdCol, { width: '8%', textAlign: 'center' }]}>03</Text>
                <Text style={[styles.tdCol, { width: '64%', fontSize: 7.5, color: TEXT_MUTED }]}>
                  Paint work (We will submit the painting bill after installing all the cabinets for the project. However, the painting rates are specified in this agreement.)
                </Text>
                <Text style={[styles.tdCol, { width: '28%', textAlign: 'right', color: TEXT_MUTED }]}>------</Text>
              </View>
            </>
          )}

          <View style={styles.tRowHighlight}>
            <View style={styles.tRow}>
              <Text style={[styles.tdCol, { width: '8%' }]} />
              <Text style={[styles.tdCol, { width: '64%', fontWeight: 'bold', color: PRIMARY }]}>Total</Text>
              <Text style={[styles.tdCol, { width: '28%', textAlign: 'right', fontWeight: 'bold' }]}>
                {formatDetailAmount(subtotalValue)}
              </Text>
            </View>
          </View>

          {discountAmount > 0 ? (
            <View style={styles.tRow}>
              <Text style={[styles.tdCol, { width: '8%' }]} />
              <Text style={[styles.tdCol, { width: '64%', fontWeight: 'bold', color: GOLD }]}>Honor / Discount</Text>
              <Text style={[styles.tdCol, { width: '28%', textAlign: 'right', fontWeight: 'bold', color: GOLD }]}>
                - {formatDetailAmount(discountAmount)}
              </Text>
            </View>
          ) : null}

          <View style={styles.totalsRow}>
            <Text style={[styles.thCol, { width: '8%' }]} />
            <Text style={[styles.thCol, { width: '64%', color: PRIMARY, fontSize: 8.5 }]}>Grand Total</Text>
            <Text style={[styles.thCol, { width: '28%', textAlign: 'right', color: PRIMARY, fontSize: 9 }]}>
              ৳ {formatDetailAmount(finalValue)}
            </Text>
          </View>
        </View>

        <View style={styles.inWordsBlock}>
          <Text style={styles.inWordsText}>In Word: {amountInWordsTaka(finalValue)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Payment Schedule</Text>
        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.thCol, { width: '8%', textAlign: 'center' }]}>SL</Text>
            <Text style={[styles.thCol, { width: '56%' }]}>Payment Stage</Text>
            <Text style={[styles.thCol, { width: '16%', textAlign: 'center' }]}>Percentage</Text>
            <Text style={[styles.thCol, { width: '20%', textAlign: 'right' }]}>Taka (৳)</Text>
          </View>

          {agreement.paymentSchedule.map((item, index) => (
            <View key={index} style={[styles.tRow, index % 2 ? styles.tRowAlt : {}]}>
              <Text style={[styles.tdCol, { width: '8%', textAlign: 'center' }]}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={[styles.tdCol, { width: '56%' }]}>{item.stage}</Text>
              <Text style={[styles.tdCol, { width: '16%', textAlign: 'center' }]}>{item.percentage}</Text>
              <Text style={[styles.tdCol, { width: '20%', textAlign: 'right' }]}>{item.amount}</Text>
            </View>
          ))}

          <View style={styles.totalsRow}>
            <Text style={[styles.thCol, { width: '8%' }]} />
            <Text style={[styles.thCol, { width: '56%', color: PRIMARY }]}>Total</Text>
            <Text style={[styles.thCol, { width: '16%', textAlign: 'center', color: PRIMARY }]}>
              {paymentPercentTotal.toFixed(2).replace(/\.00$/, '')}%
            </Text>
            <Text style={[styles.thCol, { width: '20%', textAlign: 'right', color: PRIMARY }]}>
              ৳ {formatDetailAmount(paymentAmountTotal || finalValue)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Annexures</Text>
        {agreement.annexures.map((item, index) => (
          <View key={index} style={{ marginBottom: 4 }}>
            <Text style={[styles.paragraph, { fontSize: 8, color: '#333333' }]}>
              <Text style={styles.bold}>Annexure A{index + 1}: </Text>
              {item.replace(/^Annexure\s*A\d+:\s*/i, '')}
            </Text>
          </View>
        ))}

        <GlobalFooter workOrderId={agreement.workOrderId} reference={agreement.reference} />
      </Page>

      {/* ─── PAGES 4+: AGREEMENT CLAUSES ──────────────────────────── */}
      {agreement.clauseGroups.map((group, groupIndex) => (
        <Page key={group.title || groupIndex} size="A4" style={styles.page}>
          <WatermarkBackground />
          <GlobalHeader code={agreement.workOrderId} date={agreement.agreementDate} title="Agreement Clauses" />

          <Text style={styles.docTitle}>AGREEMENT CLAUSES</Text>
          <Text style={styles.sectionTitle}>
            {groupIndex + 1}. {group.title}
          </Text>

          {group.clauses.map((clause, index) => {
            const colonIndex = clause.indexOf(':')
            const hasHeader = colonIndex > 0 && colonIndex < 40
            const header = hasHeader ? clause.slice(0, colonIndex + 1) : null
            const body = hasHeader ? clause.slice(colonIndex + 1).trim() : clause

            return (
              <View key={index} style={styles.clauseCard} wrap={false}>
                <View style={styles.clauseRow}>
                  <Text style={styles.clauseNum}>
                    {groupIndex + 1}.{index + 1}
                  </Text>
                  <Text style={styles.clauseText}>
                    {header ? <Text style={styles.bold}>{header} </Text> : null}
                    {body}
                  </Text>
                </View>
              </View>
            )
          })}

          <GlobalFooter workOrderId={agreement.workOrderId} reference={agreement.reference} />
        </Page>
      ))}

      {/* ─── OPTIONAL: DETAIL QUOTATION BREAKDOWN (if items exist) ─── */}
      {quotation && rows.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <WatermarkBackground />
          <GlobalHeader code={agreement.workOrderId} date={agreement.agreementDate} title="Quotation Detail" />

          <Text style={styles.docTitle}>SCHEDULE OF RATES & DETAIL BREAKDOWN</Text>
          <Text style={[styles.paragraph, { fontSize: 8, color: TEXT_MUTED, textAlign: 'center', marginBottom: 10 }]}>
            {quotation.subject || 'Interior Works'} · Reference: {agreement.workOrderId}
          </Text>

          {rows.map((section) => (
            <View key={section.floor.id} style={{ marginBottom: 10 }} wrap>
              <Text style={[styles.sectionTitle, { marginTop: 6, marginBottom: 4 }]}>{section.floor.name}</Text>
              <View style={styles.table}>
                <View style={styles.tHead}>
                  <Text style={[styles.thCol, { width: '6%', textAlign: 'center' }]}>SL</Text>
                  <Text style={[styles.thCol, { width: '48%' }]}>Description / Specification</Text>
                  <Text style={[styles.thCol, { width: '12%', textAlign: 'center' }]}>Qty</Text>
                  <Text style={[styles.thCol, { width: '16%', textAlign: 'right' }]}>Rate (৳)</Text>
                  <Text style={[styles.thCol, { width: '18%', textAlign: 'right' }]}>Total (৳)</Text>
                </View>

                {section.lines.map((line, idx) => (
                  <View key={line.id} style={[styles.tRow, idx % 2 ? styles.tRowAlt : {}]} wrap={false}>
                    <Text style={[styles.tdCol, { width: '6%', textAlign: 'center' }]}>{String(idx + 1).padStart(2, '0')}</Text>
                    <View style={{ width: '48%', paddingRight: 4 }}>
                      <Text style={[styles.tdCol, { fontWeight: 'bold' }]}>{line.description}</Text>
                      {line.materials ? (
                        <Text style={{ fontSize: 7, color: TEXT_MUTED, marginTop: 1 }}>{line.materials}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.tdCol, { width: '12%', textAlign: 'center' }]}>{formatDetailQtyCell(line)}</Text>
                    <Text style={[styles.tdCol, { width: '16%', textAlign: 'right' }]}>{formatDetailUnitPriceCell(line)}</Text>
                    <Text style={[styles.tdCol, { width: '18%', textAlign: 'right', fontWeight: 'bold' }]}>
                      {formatDetailTotalCell(line)}
                    </Text>
                  </View>
                ))}

                <View style={styles.totalsRow}>
                  <Text style={[styles.thCol, { width: '6%' }]} />
                  <Text style={[styles.thCol, { width: '60%', color: PRIMARY }]}>{section.floor.name} Subtotal</Text>
                  <Text style={[styles.thCol, { width: '34%', textAlign: 'right', color: PRIMARY }]}>
                    ৳ {formatDetailAmount(section.total)}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <View style={[styles.totalsRow, { paddingVertical: 6, marginBottom: 8 }]}>
            <Text style={[styles.thCol, { width: '50%', color: PRIMARY, fontSize: 9 }]}>Schedule Total Agreement Value</Text>
            <Text style={[styles.thCol, { width: '50%', textAlign: 'right', color: PRIMARY, fontSize: 10 }]}>
              ৳ {formatDetailAmount(finalValue)}
            </Text>
          </View>

          <GlobalFooter workOrderId={agreement.workOrderId} reference={agreement.reference} />
        </Page>
      ) : null}

      {/* ─── FINAL PAGE: SIGNATURES, WITNESSES & ACKNOWLEDGEMENT ──── */}
      <Page size="A4" style={styles.page}>
        <WatermarkBackground />
        <GlobalHeader code={agreement.workOrderId} date={agreement.agreementDate} title="Signatures" />

        <Text style={styles.docTitle}>SIGNATURES & ACKNOWLEDGEMENT</Text>

        <Text style={[styles.paragraph, { marginTop: 6, lineHeight: 1.5 }]}>
          <Text style={styles.bold}>IN WITNESS WHEREOF</Text>, the Parties hereto, having read, understood, and agreed to all
          the terms and conditions contained in this Agreement, have caused this Agreement to be duly executed by their
          respective duly authorized representatives on the date first written above.
        </Text>
        <Text style={[styles.paragraph, { lineHeight: 1.5 }]}>
          The Parties confirm that they have entered into this Agreement voluntarily, with free consent, and with full authority
          to undertake and perform the obligations stated herein. This Agreement shall become effective upon execution by the
          authorized representatives of both Parties and shall be binding upon the Parties and their respective successors and
          permitted assigns, subject to the applicable laws of Bangladesh.
        </Text>

        <Text style={styles.sectionTitle}>Witnesses</Text>
        <View style={styles.witnessGrid}>
          {agreement.witnessNames.map((name, index) => (
            <View key={index} style={styles.witnessCol}>
              <Text style={{ fontSize: 7, color: TEXT_MUTED, marginBottom: 12 }}>Witness {index + 1}</Text>
              <Text style={styles.sigName}>{name || `1. __________________`}</Text>
              <Text style={styles.sigRole}>Signature & Date</Text>
            </View>
          ))}
        </View>

        <View style={styles.sigSection}>
          <View style={styles.sigRow}>
            <View style={styles.sigBlock}>
              <Text style={styles.sigName}>{agreement.ownerName || clientName}</Text>
              <Text style={styles.sigRole}>Owner (Project)</Text>
              <Text style={styles.sigRole}>Client Signature: ____________________</Text>
              <Text style={styles.sigRole}>Date: {agreement.agreementDate}</Text>
            </View>
            <View style={styles.sigBlock}>
              <Text style={styles.sigName}>{agreement.ceoName || 'Md Johirul Islam'}</Text>
              <Text style={styles.sigRole}>Chief Executive Officer (CEO)</Text>
              <Text style={styles.sigRole}>Aesthetic Interior</Text>
              <Text style={styles.sigRole}>Authorized Signature: ____________________</Text>
            </View>
          </View>
        </View>

        {/* General Manager Official Acknowledgment Block verbatim from docx */}
        <View style={styles.gmCard}>
          <Text style={[styles.bold, { fontSize: 8.5, color: PRIMARY, marginBottom: 4, textTransform: 'uppercase' }]}>
            Consultant Declaration & Acknowledgment
          </Text>
          <Text style={[styles.paragraph, { fontSize: 7.5, color: '#333333', marginBottom: 8, lineHeight: 1.4 }]}>
            I, <Text style={styles.bold}>{agreement.companyRepresentative || 'Md. Nazrul Islam'}</Text>,{' '}
            {agreement.companyRepresentativeTitle || 'General Manager'} of Aesthetic Interior, hereby confirm that I am fully
            aware of and have reviewed the terms and conditions of this Work Order/Agreement, including the approved scope of
            work, Schedule of Rates, specifications, payment terms, project timeline, and other contractual requirements. I
            acknowledge that the contents of this Work Order/Agreement have been duly communicated to and understood by the
            concerned management and project team of Aesthetic Interior, and that the Company shall execute the Project in
            accordance with the agreed contractual terms and conditions.
          </Text>
          <View style={{ marginTop: 8, paddingTop: 4, borderTopWidth: 0.6, borderTopColor: BORDER, width: '45%' }}>
            <Text style={{ fontSize: 7, color: TEXT_MUTED }}>Acknowledged by:</Text>
            <Text style={[styles.sigName, { marginTop: 2 }]}>{agreement.companyRepresentative || 'Md. Nazrul Islam'}</Text>
            <Text style={styles.sigRole}>{agreement.companyRepresentativeTitle || 'General Manager (GM)'}</Text>
            <Text style={styles.sigRole}>Aesthetic Interior</Text>
          </View>
        </View>

        <GlobalFooter workOrderId={agreement.workOrderId} reference={agreement.reference} />
      </Page>
    </Document>
  )
}
