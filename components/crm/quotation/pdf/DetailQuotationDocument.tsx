'use client'

import { Document, Page, StyleSheet, Text, View, Image, Svg, Path } from '@react-pdf/renderer'
import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'
import { buildDetailFloorSummaries, formatDetailAmount, isPackageLine } from '@/lib/detail-quotation-format'
import { amountInWordsTaka } from '@/lib/number-to-words'

const styles = StyleSheet.create({
  page: {
    paddingTop: 100,
    paddingBottom: 85,
    paddingLeft: 30,
    paddingRight: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#111',
    lineHeight: 1.4,
  },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  watermarkImage: {
    width: '70%',
    opacity: 0.04,
  },
  headerContainer: {
    position: 'absolute',
    top: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f5b53',
    borderBottomStyle: 'solid',
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoImage: {
    width: 35,
    height: 35,
  },
  headerTitleContainer: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#bf9000',
    textTransform: 'uppercase',
  },
  headerBadge: {
    backgroundColor: '#0f5b53',
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 2,
    borderRadius: 1.5,
    alignSelf: 'flex-start',
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 6,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerRight: {
    borderWidth: 0.5,
    borderColor: '#ccc',
    padding: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1.5,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    borderTopStyle: 'solid',
    paddingTop: 4,
  },
  footerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  footerLeft: {
    flexDirection: 'column',
    gap: 1.5,
  },
  footerContactText: {
    fontSize: 6.5,
    color: '#444',
  },
  footerRight: {},
  footerBottomBar: {
    backgroundColor: '#0f5b53',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 1.5,
  },
  footerBottomText: {
    color: '#ffffff',
    fontSize: 6,
    fontWeight: 'bold',
  },
  detailHeader: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  detailHeaderMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailHeaderLabel: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  detailHeaderValueText: {
    fontSize: 8,
    marginTop: 1.5,
  },
  detailHeaderIntroText: {
    fontSize: 8,
    marginTop: 2,
    textAlign: 'justify',
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    backgroundColor: '#76933c',
    color: '#ffffff',
    padding: 3,
    textAlign: 'center',
    marginBottom: 4,
  },
  table: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#000000',
    borderStyle: 'solid',
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#000000',
    borderStyle: 'solid',
    minHeight: 18,
    alignItems: 'flex-start',
  },
  tableRowEven: {
    backgroundColor: '#e8f1ff',
  },
  tableRowOdd: {
    backgroundColor: '#ffffff',
  },
  tableHeader: {
    backgroundColor: '#0070c0',
    color: '#ffffff',
    fontWeight: 'bold',
  },
  cell: {
    padding: 3,
    fontSize: 7.5,
    color: '#000000',
  },
  smallCell: {
    width: '5%',
    textAlign: 'center',
  },
  nameCell: {
    width: '18%',
  },
  materialsCell: {
    width: '47%',
  },
  qtyCell: {
    width: '10%',
    textAlign: 'center',
  },
  unitPriceCell: {
    width: '10%',
    textAlign: 'center',
  },
  amountCell: {
    width: '10%',
    textAlign: 'center',
  },
  grandTotalRow: {
    backgroundColor: '#0070c0',
    flexDirection: 'row',
    fontWeight: 'bold',
  },
  grandTotalText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  inWordsSection: {
    fontSize: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  boldUnderline: {
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  detailFooterContainer: {
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    borderTopStyle: 'solid',
    paddingTop: 6,
  },
  detailFooterSection: {
    marginBottom: 4,
  },
  detailFooterHeading: {
    fontSize: 8,
    fontWeight: 'bold',
    textDecoration: 'underline',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  detailFooterText: {
    fontSize: 7.5,
  },
  detailFooterDrawingText: {
    fontSize: 7.5,
    color: '#ff0000',
    fontWeight: 'bold',
    marginTop: 2,
    marginBottom: 4,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 25,
  },
  signatureBlockLeft: {
    width: '35%',
    borderTopWidth: 0.5,
    borderTopColor: '#000000',
    borderTopStyle: 'solid',
    paddingTop: 3,
  },
  signatureBlockRight: {
    width: '40%',
    borderTopWidth: 0.5,
    borderTopColor: '#000000',
    borderTopStyle: 'solid',
    paddingTop: 3,
  },
  signatureText: {
    fontSize: 7.5,
    fontWeight: 'bold',
  },
  signatureSubtext: {
    fontSize: 7,
    color: '#444444',
    marginTop: 1,
  },
})

const HeaderLogoPdf = () => (
  <View style={styles.headerContainer}>
    <View style={styles.headerLeft}>
      <Image src="/android-chrome-192x192.png" style={styles.headerLogoImage} />
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Aesthetic Interior</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>Interior Studio</Text>
        </View>
      </View>
    </View>
    <View style={styles.headerRight}>
      <Svg width={'30'} height={'30'} viewBox="0 0 29 29" style={{ fill: '#000' }}>
        <Path d="M0 0h9v9H0zm1 1v7h7V1zm8 0h1v1H9zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h2v1h-2zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h4v4h-4zm3 1v2h-2V2zm-2 2h1v1h-1zm-3-2h1v1h-1zm1 1h1v1h-1zm-2 0h1v1h-1zm-1 1h1v1h-1zm5 1h1v1h-1zm1-4h1v4h-1zm-8-1h1v1h-1zm3 0h1v1h-1zm1 1h1v1h-1zm-2 0h1v1h-1zm5 4h2v2h-2zm1 2h1v1h-1zm1 0h1v1h-1zm2-1h1v4h-1zm0 4h2v1h-2zm0 1h2v1h-2zm-8-1h1v1h-1zm-2 0h1v1h-1z" />
      </Svg>
    </View>
  </View>
)

const FooterContactsPdf = () => (
  <View style={styles.footerContainer}>
    <View style={styles.footerTopRow}>
      <View style={styles.footerLeft}>
        <Text style={styles.footerContactText}>
          P: +88 01329 694660, +88 01329 694661, +88 01329 694662
        </Text>
        <Text style={styles.footerContactText}>E: aestheticinteriorstudio@gmail.com</Text>
        <Text style={styles.footerContactText}>
          A: 2nd Floor, 183 East Senpara Parbata, Begum Rokeya Sarani, Mirpur 10, Dhaka
        </Text>
      </View>
      <View style={styles.footerRight}>
        <Svg width={'60'} height={'30'} viewBox="0 0 140 70" style={{ fill: '#888888', opacity: 0.15 }}>
          <Path d="M0 70h140V45h-15V32h-10V18h-15V5h-20v15H80V27H70V40H55V55H35V40H20v30z" />
        </Svg>
      </View>
    </View>
    <View style={styles.footerBottomBar}>
      <Text style={styles.footerBottomText}>www.aestheticinteriorbd.com</Text>
      <Text style={styles.footerBottomText}>aesthetic.interior.studio</Text>
      <Text style={styles.footerBottomText}>facebook.com/aestheticinteriorofficial</Text>
    </View>
  </View>
)

const DetailHeaderPdf = ({
  clientName,
  clientAddress,
  date,
  subject,
  introLetter,
  isSummary = false,
}: {
  clientName: string
  clientAddress: string | null
  date: string
  subject: string
  introLetter: string
  isSummary?: boolean
}) => (
  <View style={styles.detailHeader}>
    <View style={styles.detailHeaderMetaRow}>
      <View>
        <Text style={styles.detailHeaderLabel}>{isSummary ? 'Quotation Summary for:' : 'Quotation for:'}</Text>
        <Text style={styles.detailHeaderValueText}>{clientName}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.detailHeaderLabel}>Date:</Text>
        <Text style={styles.detailHeaderValueText}>
          {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
        </Text>
      </View>
    </View>
    <View style={{ marginTop: 4 }}>
      <Text style={styles.detailHeaderLabel}>Address:</Text>
      <Text style={styles.detailHeaderValueText}>{clientAddress || '—'}</Text>
    </View>
    <View style={{ marginTop: 4 }}>
      <Text style={styles.detailHeaderLabel}>Subject:</Text>
      <Text style={styles.detailHeaderValueText}>{subject}</Text>
    </View>
    <Text style={[styles.detailHeaderLabel, { marginTop: 8 }]}>Dear Sir,</Text>
    <Text style={styles.detailHeaderIntroText}>
      {introLetter.replace('Dear Sir,\n', '').replace('Dear Sir,', '')}
    </Text>
  </View>
)

const DetailFooterPdf = ({
  notes,
  terms,
  paymentTerms,
  durationNotes,
  drawingDesign,
  signatoryName,
  signatoryTitle,
}: {
  notes: string
  terms: string
  paymentTerms: string
  durationNotes: string
  drawingDesign: string
  signatoryName: string
  signatoryTitle: string
}) => (
  <View style={styles.detailFooterContainer}>
    {notes ? (
      <View style={styles.detailFooterSection}>
        <Text style={styles.detailFooterHeading}>Notes:</Text>
        <Text style={styles.detailFooterText}>{notes}</Text>
      </View>
    ) : null}
    {terms ? (
      <View style={styles.detailFooterSection}>
        <Text style={styles.detailFooterHeading}>Terms &amp; Condition:</Text>
        <Text style={styles.detailFooterText}>{terms}</Text>
      </View>
    ) : null}
    {paymentTerms ? (
      <View style={styles.detailFooterSection}>
        <Text style={styles.detailFooterHeading}>Mode of Payment:</Text>
        <Text style={styles.detailFooterText}>
          {paymentTerms.replace('Mode of Payment\n', '').replace('Mode of Payment', '')}
        </Text>
      </View>
    ) : null}
    {durationNotes ? (
      <View style={styles.detailFooterSection}>
        <Text style={styles.detailFooterHeading}>Duration Of Work:</Text>
        <Text style={styles.detailFooterText}>
          {durationNotes.replace('Duration Of Work:\n', '').replace('Duration Of Work:', '')}
        </Text>
      </View>
    ) : null}
    {drawingDesign ? (
      <Text style={styles.detailFooterDrawingText}>{drawingDesign}</Text>
    ) : null}
    <View style={styles.signatureRow}>
      <View style={styles.signatureBlockLeft}>
        <Text style={styles.signatureText}>Customer Name &amp; Sign</Text>
      </View>
      <View style={styles.signatureBlockRight}>
        <Text style={styles.signatureText}>{signatoryName}</Text>
        <Text style={styles.signatureSubtext}>{signatoryTitle}</Text>
      </View>
    </View>
  </View>
)

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

  return (
    <Document>
      {/* PAGE 1: GRAND TOTAL SUMMARY */}
      <Page size="A4" style={styles.page}>
        <View style={styles.watermarkContainer} fixed>
          <Image src="/aesthetic-icon.png" style={styles.watermarkImage} />
        </View>
        <View style={styles.headerContainer} fixed>
          <HeaderLogoPdf />
        </View>
        <View style={styles.footerContainer} fixed>
          <FooterContactsPdf />
        </View>

        <DetailHeaderPdf
          clientName={clientName}
          clientAddress={clientAddress}
          date={content.quotationDate ?? ''}
          subject={content.summarySubject ?? content.subject ?? ''}
          introLetter={content.introLetter ?? ''}
          isSummary={true}
        />

        <View style={{ marginTop: 8 }}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.cell, styles.smallCell, { color: '#fff', fontWeight: 'bold' }]}>SL</Text>
              <Text style={[styles.cell, { width: '65%', color: '#fff', fontWeight: 'bold' }]}>NAME</Text>
              <Text style={[styles.cell, { width: '30%', textAlign: 'center', color: '#fff', fontWeight: 'bold' }]}>TOTAL</Text>
            </View>
            {floorSummaries.map((entry, index) => (
              <View
                key={entry.floor.id}
                style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven,
                ]}
              >
                <Text style={[styles.cell, styles.smallCell]}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={[styles.cell, { width: '65%' }]}>{entry.floor.name}</Text>
                <Text style={[styles.cell, { width: '30%', textAlign: 'center' }]}>
                  {formatDetailAmount(entry.total)}
                </Text>
              </View>
            ))}
            <View style={[styles.tableRow, styles.grandTotalRow]}>
              <Text style={[styles.cell, { width: '70%', textAlign: 'center', color: '#fff', fontWeight: 'bold' }]}>
                GRAND TOTAL
              </Text>
              <Text style={[styles.cell, { width: '30%', textAlign: 'center', color: '#fff', fontWeight: 'bold' }]}>
                {formatDetailAmount(totals.grandTotal)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.inWordsSection}>
          <Text style={styles.boldUnderline}>In Words:</Text>{' '}
          <Text style={{ fontWeight: 'bold' }}>{amountInWordsTaka(totals.grandTotal)}</Text>
        </Text>
      </Page>

      {/* PAGES 2..N: FLOOR DETAILS */}
      {floorSummaries.map((entry) => (
        <Page key={entry.floor.id} size="A4" style={styles.page}>
          <View style={styles.watermarkContainer} fixed>
            <Image src="/aesthetic-icon.png" style={styles.watermarkImage} />
          </View>
          <View style={styles.footerContainer} fixed>
            <FooterContactsPdf />
          </View>

          <DetailHeaderPdf
            clientName={clientName}
            clientAddress={clientAddress}
            date={content.quotationDate ?? ''}
            subject={content.subject ?? ''}
            introLetter={content.introLetter ?? ''}
          />

          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionTitle}>{entry.floor.name}</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.cell, styles.smallCell, { color: '#fff', fontWeight: 'bold' }]}>SL</Text>
                <Text style={[styles.cell, styles.nameCell, { color: '#fff', fontWeight: 'bold' }]}>NAME</Text>
                <Text style={[styles.cell, styles.materialsCell, { color: '#fff', fontWeight: 'bold' }]}>MATERIALS</Text>
                <Text style={[styles.cell, styles.qtyCell, { color: '#fff', fontWeight: 'bold' }]}>QTY SFT</Text>
                <Text style={[styles.cell, styles.unitPriceCell, { color: '#fff', fontWeight: 'bold' }]}>UNIT PRICE</Text>
                <Text style={[styles.cell, styles.amountCell, { color: '#fff', fontWeight: 'bold' }]}>TOTAL</Text>
              </View>
              {entry.lines.map((line, lineIndex) => {
                const isPkg = isPackageLine(line)
                return (
                  <View
                    key={line.id}
                    style={[
                      styles.tableRow,
                      lineIndex % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven,
                    ]}
                  >
                    <Text style={[styles.cell, styles.smallCell]}>
                      {String(line.serialNo ?? lineIndex + 1).padStart(2, '0')}
                    </Text>
                    <Text style={[styles.cell, styles.nameCell, { fontWeight: 'bold' }]}>
                      {line.description}
                    </Text>
                    <Text style={[styles.cell, styles.materialsCell]}>
                      {line.materials || '—'}
                    </Text>
                    {isPkg ? (
                      <Text style={[styles.cell, { width: '20%', textAlign: 'center' }]}>
                        Package As Per Design
                      </Text>
                    ) : (
                      <>
                        <Text style={[styles.cell, styles.qtyCell]}>
                          {line.quantity != null ? String(line.quantity) : '—'}
                        </Text>
                        <Text style={[styles.cell, styles.unitPriceCell]}>
                          {line.rate != null ? formatDetailAmount(line.rate) : '—'}
                        </Text>
                      </>
                    )}
                    <Text style={[styles.cell, styles.amountCell, { fontWeight: 'bold' }]}>
                      {formatDetailAmount(line.amount)}
                      {line.description.toLowerCase().includes('electric wiring') ? ' (Approx)' : ''}
                    </Text>
                  </View>
                )
              })}
              <View style={[styles.tableRow, styles.grandTotalRow]}>
                <Text style={[styles.cell, { width: '90%', textAlign: 'center', color: '#fff', fontWeight: 'bold' }]}>
                  TOTAL
                </Text>
                <Text style={[styles.cell, styles.amountCell, { color: '#fff', fontWeight: 'bold' }]}>
                  {formatDetailAmount(entry.total)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.inWordsSection}>
            <Text style={styles.boldUnderline}>In Words:</Text>{' '}
            <Text style={{ fontWeight: 'bold' }}>{amountInWordsTaka(entry.total)}</Text>
          </Text>

          <DetailFooterPdf
            notes={content.notes}
            terms={content.terms}
            paymentTerms={content.paymentTerms ?? ''}
            durationNotes={content.durationNotes ?? ''}
            drawingDesign={content.drawingDesign ?? ''}
            signatoryName={content.signatoryName ?? ''}
            signatoryTitle={content.signatoryTitle ?? ''}
          />
        </Page>
      ))}
    </Document>
  )
}
