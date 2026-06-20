'use client'

import { Document, Page, StyleSheet, Text, View, Image, Svg, Path } from '@react-pdf/renderer'
import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'
import { buildDetailFloorSummaries, formatDetailAmount, isPackageLine } from '@/lib/detail-quotation-format'
import { amountInWordsTaka } from '@/lib/number-to-words'

const styles = StyleSheet.create({
  page: {
    paddingTop: 100,
    paddingBottom: 100,
    paddingLeft: 0,
    paddingRight: 0,
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
    borderBottomColor: '#0070c0',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
    paddingLeft: 0,
    paddingRight: 0,
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
    backgroundColor: '#0070c0',
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
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#0070c0',
    borderTopStyle: 'solid',
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 30,
    backgroundColor: '#ffffff',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  footerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  footerIcon: {
    width: 12,
    height: 12,
  },
  footerText: {
    fontSize: 6.5,
    color: '#444',
    flex: 1,
  },
  footerWebsite: {
    fontSize: 6.5,
    color: '#444',
    fontWeight: 'bold',
  },
  contentWrapper: {
    paddingLeft: 30,
    paddingRight: 30,
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
    backgroundColor: '#0070c0',
    color: '#ffffff',
    padding: 5,
    textAlign: 'center',
    marginBottom: 4,
    marginTop: 10,
  },
  table: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#0070c0',
    borderStyle: 'solid',
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#0070c0',
    borderBottomStyle: 'solid',
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
    borderRightWidth: 0.5,
    borderRightColor: '#0070c0',
    borderRightStyle: 'solid',
  },
  cellLast: {
    padding: 3,
    fontSize: 7.5,
    color: '#000000',
    borderRightWidth: 0,
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
  inWordsSection: {
    fontSize: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  boldUnderline: {
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  detailFooterContainer: {
    marginTop: 12,
    marginBottom: 40,
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
    marginBottom: 2,
    marginTop: 4,
  },
  detailFooterText: {
    fontSize: 7.5,
    textAlign: 'justify',
    lineHeight: 1.3,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 30,
    paddingBottom: 10,
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
      <Svg width={'30'} height={'30'} viewBox="0 0 29 29" style={{ fill: '#0070c0' }}>
        <Path d="M0 0h9v9H0zm1 1v7h7V1zm8 0h1v1H9zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h2v1h-2zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h4v4h-4zm3 1v2h-2V2zm-2 2h1v1h-1zm-3-2h1v1h-1zm1 1h1v1h-1zm-2 0h1v1h-1zm-1 1h1v1h-1zm5 1h1v1h-1zm1-4h1v4h-1zm-8-1h1v1h-1zm3 0h1v1h-1zm1 1h1v1h-1zm-2 0h1v1h-1zm5 4h2v2h-2zm1 2h1v1h-1zm1 0h1v1h-1zm2-1h1v4h-1zm0 4h2v1h-2zm0 1h2v1h-2zm-8-1h1v1h-1zm-2 0h1v1h-1z" />
      </Svg>
    </View>
  </View>
)

const FooterContactsPdf = () => (
  <View style={styles.footerContainer}>
    <View style={styles.footerContent}>
      <View style={styles.footerSection}>
        <Svg width={'12'} height={'12'} viewBox="0 0 24 24" style={{ fill: '#0070c0' }}>
          <Path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
        </Svg>
        <Text style={styles.footerText}>+88 01329 694660, +88 01329 694661, +88 01329 694662</Text>
      </View>
      <View style={styles.footerSection}>
        <Svg width={'12'} height={'12'} viewBox="0 0 24 24" style={{ fill: '#0070c0' }}>
          <Path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </Svg>
        <Text style={styles.footerText}>aestheticinteriorstudio@gmail.com</Text>
      </View>
      <View style={styles.footerSection}>
        <Svg width={'12'} height={'12'} viewBox="0 0 24 24" style={{ fill: '#0070c0' }}>
          <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
        </Svg>
        <Text style={styles.footerText}>2nd Floor, 183 East Senpara Parbata, Mirpur 10, Dhaka</Text>
      </View>
      <Text style={styles.footerWebsite}>www.aestheticinteriorbd.com</Text>
    </View>
  </View>
)

const DetailHeaderPdf = ({
  clientName,
  clientAddress,
  date,
  subject,
  introLetter,
}: {
  clientName: string
  clientAddress: string | null
  date: string
  subject: string
  introLetter: string
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      const d = new Date(dateString)
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dateString
    }
  }

  return (
    <View style={styles.detailHeader}>
      <View style={styles.detailHeaderMetaRow}>
        <View>
          <Text style={styles.detailHeaderLabel}>Quotation for:</Text>
          <Text style={styles.detailHeaderValueText}>{clientName}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.detailHeaderLabel}>Date:</Text>
          <Text style={styles.detailHeaderValueText}>{formatDate(date)}</Text>
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
}

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
        <Text style={styles.detailFooterText}>{paymentTerms}</Text>
      </View>
    ) : null}
    {durationNotes ? (
      <View style={styles.detailFooterSection}>
        <Text style={styles.detailFooterHeading}>Duration Of Work:</Text>
        <Text style={styles.detailFooterText}>{durationNotes}</Text>
      </View>
    ) : null}
    {drawingDesign ? (
      <Text style={[styles.detailFooterText, { color: '#ff0000', fontWeight: 'bold', marginTop: 8, marginBottom: 8 }]}>
        {drawingDesign}
      </Text>
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
      {/* FIRST PAGE - SUMMARY & CONTENT */}
      <Page size="A4" style={styles.page}>
        {/* HEADER - FIXED AT TOP */}
        <View style={styles.watermarkContainer} fixed>
          <Image src="/aesthetic-icon.png" style={styles.watermarkImage} />
        </View>
        <View style={styles.headerContainer} fixed>
          <HeaderLogoPdf />
        </View>
        <View style={styles.footerContainer} fixed>
          <FooterContactsPdf />
        </View>

        {/* DOCUMENT CONTENT */}
        <View style={styles.contentWrapper}>
          <DetailHeaderPdf
            clientName={clientName}
            clientAddress={clientAddress}
            date={content.quotationDate ?? ''}
            subject={content.summarySubject ?? content.subject ?? ''}
            introLetter={content.introLetter ?? ''}
          />

          {/* SUMMARY TABLE */}
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.sectionTitle, { marginTop: 0 }]}>Quotation Summary</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.cell, styles.smallCell, { color: '#fff', fontWeight: 'bold', borderRightWidth: 0.5 }]}>SL</Text>
                <Text style={[styles.cell, { width: '65%', color: '#fff', fontWeight: 'bold', borderRightWidth: 0.5 }]}>NAME</Text>
                <Text style={[styles.cellLast, { width: '30%', textAlign: 'center', color: '#fff', fontWeight: 'bold' }]}>TOTAL</Text>
              </View>
              {floorSummaries.map((entry, index) => (
                <View
                  key={entry.floor.id}
                  style={[
                    styles.tableRow,
                    index % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven,
                  ]}
                >
                  <Text style={[styles.cell, styles.smallCell, { borderRightWidth: 0.5 }]}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={[styles.cell, { width: '65%', borderRightWidth: 0.5 }]}>{entry.floor.name}</Text>
                  <Text style={[styles.cellLast, { width: '30%', textAlign: 'center' }]}>
                    {formatDetailAmount(entry.total)}
                  </Text>
                </View>
              ))}
              <View style={[styles.tableRow, styles.grandTotalRow]}>
                <Text style={[styles.cell, { width: '70%', textAlign: 'center', color: '#fff', fontWeight: 'bold', borderRightWidth: 0.5 }]}>
                  GRAND TOTAL
                </Text>
                <Text style={[styles.cellLast, { width: '30%', textAlign: 'center', color: '#fff', fontWeight: 'bold' }]}>
                  {formatDetailAmount(totals.grandTotal)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.inWordsSection}>
            <Text style={styles.boldUnderline}>In Words:</Text>{' '}
            <Text style={{ fontWeight: 'bold' }}>{amountInWordsTaka(totals.grandTotal)}</Text>
          </Text>
        </View>
      </Page>

      {/* FLOOR DETAIL PAGES - EACH ON SEPARATE PAGE */}
      {floorSummaries.map((entry) => (
        <Page key={entry.floor.id} size="A4" style={styles.page}>
          {/* HEADER - FIXED AT TOP */}
          <View style={styles.watermarkContainer} fixed>
            <Image src="/aesthetic-icon.png" style={styles.watermarkImage} />
          </View>
          <View style={styles.headerContainer} fixed>
            <HeaderLogoPdf />
          </View>
          <View style={styles.footerContainer} fixed>
            <FooterContactsPdf />
          </View>

          {/* FLOOR CONTENT */}
          <View style={styles.contentWrapper}>
            <Text style={styles.sectionTitle}>{entry.floor.name}</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.cell, styles.smallCell, { color: '#fff', fontWeight: 'bold', borderRightWidth: 0.5 }]}>SL</Text>
                <Text style={[styles.cell, styles.nameCell, { color: '#fff', fontWeight: 'bold', borderRightWidth: 0.5 }]}>NAME</Text>
                <Text style={[styles.cell, styles.materialsCell, { color: '#fff', fontWeight: 'bold', borderRightWidth: 0.5 }]}>MATERIALS</Text>
                <Text style={[styles.cell, styles.qtyCell, { color: '#fff', fontWeight: 'bold', borderRightWidth: 0.5 }]}>QTY SFT</Text>
                <Text style={[styles.cell, styles.unitPriceCell, { color: '#fff', fontWeight: 'bold', borderRightWidth: 0.5 }]}>UNIT PRICE</Text>
                <Text style={[styles.cellLast, styles.amountCell, { color: '#fff', fontWeight: 'bold' }]}>TOTAL</Text>
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
                    <Text style={[styles.cell, styles.smallCell, { borderRightWidth: 0.5 }]}>
                      {String(line.serialNo ?? lineIndex + 1).padStart(2, '0')}
                    </Text>
                    <Text style={[styles.cell, styles.nameCell, { fontWeight: 'bold', borderRightWidth: 0.5 }]}>
                      {line.description}
                    </Text>
                    <Text style={[styles.cell, styles.materialsCell, { borderRightWidth: 0.5 }]}>
                      {line.materials || '—'}
                    </Text>
                    {isPkg ? (
                      <Text style={[styles.cell, { width: '20%', textAlign: 'center', borderRightWidth: 0.5 }]}>
                        Package As Per Design
                      </Text>
                    ) : (
                      <>
                        <Text style={[styles.cell, styles.qtyCell, { borderRightWidth: 0.5 }]}>
                          {line.quantity != null ? String(line.quantity) : '—'}
                        </Text>
                        <Text style={[styles.cell, styles.unitPriceCell, { borderRightWidth: 0.5 }]}>
                          {line.rate != null ? formatDetailAmount(line.rate) : '—'}
                        </Text>
                      </>
                    )}
                    <Text style={[styles.cellLast, styles.amountCell, { fontWeight: 'bold' }]}>
                      {formatDetailAmount(line.amount)}
                      {line.description.toLowerCase().includes('electric wiring') ? ' (Approx)' : ''}
                    </Text>
                  </View>
                )
              })}
              <View style={[styles.tableRow, styles.grandTotalRow]}>
                <Text style={[styles.cell, { width: '90%', textAlign: 'center', color: '#fff', fontWeight: 'bold', borderRightWidth: 0.5 }]}>
                  TOTAL
                </Text>
                <Text style={[styles.cellLast, styles.amountCell, { color: '#fff', fontWeight: 'bold' }]}>
                  {formatDetailAmount(entry.total)}
                </Text>
              </View>
            </View>

            <Text style={styles.inWordsSection}>
              <Text style={styles.boldUnderline}>In Words:</Text>{' '}
              <Text style={{ fontWeight: 'bold' }}>{amountInWordsTaka(entry.total)}</Text>
            </Text>
          </View>
        </Page>
      ))}

      {/* LAST PAGE - NOTES, TERMS, AND SIGNATURE */}
      <Page size="A4" style={styles.page}>
        {/* HEADER - FIXED AT TOP */}
        <View style={styles.watermarkContainer} fixed>
          <Image src="/aesthetic-icon.png" style={styles.watermarkImage} />
        </View>
        <View style={styles.headerContainer} fixed>
          <HeaderLogoPdf />
        </View>
        <View style={styles.footerContainer} fixed>
          <FooterContactsPdf />
        </View>

        {/* FOOTER CONTENT */}
        <View style={styles.contentWrapper}>
          <DetailFooterPdf
            notes={content.notes}
            terms={content.terms}
            paymentTerms={content.paymentTerms ?? ''}
            durationNotes={content.durationNotes ?? ''}
            drawingDesign={content.drawingDesign ?? ''}
            signatoryName={content.signatoryName ?? ''}
            signatoryTitle={content.signatoryTitle ?? ''}
          />
        </View>
      </Page>
    </Document>
  )
}
