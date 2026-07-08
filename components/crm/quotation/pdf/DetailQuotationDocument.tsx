'use client'

/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image does not support the DOM alt prop. */

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
    color: '#2c2c2c',
    lineHeight: 1.5,
    backgroundColor: '#fafaf8',
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
    opacity: 0.02,
  },
  headerContainer: {
    position: 'absolute',
    top: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    paddingLeft: 0,
    paddingRight: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: '#c9a961',
  },
  headerLogoImage: {
    width: 150,
    height: 'auto',
  },
  headerRight: {
    borderWidth: 1.5,
    borderColor: '#c9a961',
    padding: 4,
    backgroundColor: '#fafaf8',
    borderRadius: 2,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    borderTopWidth: 1.5,
    borderTopColor: '#c9a961',
    borderTopStyle: 'solid',
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 30,
    backgroundColor: '#fafaf8',
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
  footerText: {
    fontSize: 6.5,
    color: '#666',
    flex: 1,
  },
  footerWebsite: {
    fontSize: 6.5,
    color: '#c9a961',
    fontWeight: 'bold',
  },
  contentWrapper: {
    paddingLeft: 30,
    paddingRight: 30,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  detailHeader: {
    flexDirection: 'column',
    marginBottom: 12,
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 2,
  },
  detailHeaderMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailHeaderLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#c9a961',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailHeaderValueText: {
    fontSize: 8.5,
    marginTop: 2,
    color: '#2c2c2c',
    fontWeight: '600',
  },
  detailHeaderIntroText: {
    fontSize: 8,
    marginTop: 3,
    textAlign: 'justify',
    color: '#555',
    lineHeight: 1.5,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    backgroundColor: '#1a1a1a',
    color: '#c9a961',
    padding: 6,
    textAlign: 'center',
    marginBottom: 0,
    marginTop: 12,
    letterSpacing: 1,
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: '#d4d0c8',
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2c',
    borderBottomWidth: 2,
    borderBottomColor: '#c9a961',
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8e3d8',
  },
  tableDataRowEven: {
    backgroundColor: '#fdfcfa',
  },
  tableDataRowOdd: {
    backgroundColor: '#ffffff',
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 7,
    color: '#c9a961',
    fontWeight: 'bold',
    borderRightWidth: 0.5,
    borderRightColor: '#d4d0c8',
    justifyContent: 'center',
    alignItems: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHeaderCellLast: {
    padding: 6,
    fontSize: 7,
    color: '#c9a961',
    fontWeight: 'bold',
    borderRightWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCell: {
    padding: 6,
    fontSize: 7.5,
    color: '#2c2c2c',
    borderRightWidth: 0.5,
    borderRightColor: '#e8e3d8',
  },
  tableCellLast: {
    padding: 6,
    fontSize: 7.5,
    color: '#2c2c2c',
    borderRightWidth: 0,
  },
  slCell: {
    width: '5%',
    textAlign: 'center',
  },
  nameCell: {
    width: '18%',
  },
  materialsCell: {
    width: '42%',
  },
  qtyCell: {
    width: '10%',
    textAlign: 'center',
  },
  unitPriceCell: {
    width: '12%',
    textAlign: 'center',
  },
  amountCell: {
    width: '13%',
    textAlign: 'center',
  },
  grandTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2c',
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#c9a961',
  },
  grandTotalCell: {
    padding: 6,
    fontSize: 7.5,
    color: '#c9a961',
    fontWeight: 'bold',
    borderRightWidth: 0.5,
    borderRightColor: '#d4d0c8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  grandTotalCellLast: {
    padding: 6,
    fontSize: 7.5,
    color: '#c9a961',
    fontWeight: 'bold',
    borderRightWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inWordsSection: {
    fontSize: 8,
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#c9a961',
  },
  boldUnderline: {
    fontWeight: 'bold',
    color: '#c9a961',
  },
  detailFooterContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: 0,
    paddingTop: 8,
  },
  detailFooterContent: {
    borderTopWidth: 1,
    borderTopColor: '#d4d0c8',
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
  detailFooterSection: {
    marginBottom: 6,
  },
  detailFooterHeading: {
    fontSize: 7.5,
    fontWeight: 'bold',
    textDecoration: 'none',
    textTransform: 'uppercase',
    marginBottom: 2,
    marginTop: 4,
    color: '#c9a961',
    letterSpacing: 0.5,
  },
  detailFooterText: {
    fontSize: 7.5,
    textAlign: 'justify',
    lineHeight: 1.4,
    color: '#555',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 24,
    paddingBottom: 0,
  },
  signatureBlockLeft: {
    width: '35%',
    borderTopWidth: 1,
    borderTopColor: '#2c2c2c',
    borderTopStyle: 'solid',
    paddingTop: 4,
  },
  signatureBlockRight: {
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: '#2c2c2c',
    borderTopStyle: 'solid',
    paddingTop: 4,
  },
  signatureText: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#2c2c2c',
  },
  signatureSubtext: {
    fontSize: 7,
    color: '#999',
    marginTop: 1.5,
  },
})

const HeaderLogoPdf = () => (
  <View style={styles.headerContainer}>
    <Image src="/Logo/HeaderLogo.png" style={styles.headerLogoImage} />
    <View style={styles.headerRight}>
      <Svg width={'30'} height={'30'} viewBox="0 0 29 29" style={{ fill: '#c9a961' }}>
        <Path d="M0 0h9v9H0zm1 1v7h7V1zm8 0h1v1H9zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h2v1h-2zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h4v4h-4zm3 1v2h-2V2zm-2 2h1v1h-1zm-3-2h1v1h-1zm1 1h1v1h-1zm-2 0h1v1h-1zm-1 1h1v1h-1zm11-1h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm-2 1h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm-3 1h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm-3 1h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM0 10h9v9H0zm1 1v7h7v-7zm8 0h1v1H9zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h2v1h-2zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h4v4h-4zm3 1v2h-2v-2zm-2 2h1v1h-1zm-3-2h1v1h-1zm1 1h1v1h-1zm-2 0h1v1h-1zm-1 1h1v1h-1zm11-1h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm-2 1h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm-3 1h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm-3 1h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM0 20h9v9H0zm1 1v7h7v-7zm8 0h1v1H9zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h2v1h-2zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h4v4h-4zm3 1v2h-2v-2zm-2 2h1v1h-1zm-3-2h1v1h-1zm1 1h1v1h-1zm-2 0h1v1h-1zm-1 1h1v1h-1zm11-1h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm-2 1h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm-3 1h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm-3 1h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1z" />
      </Svg>
    </View>
  </View>
)

const FooterContactsPdf = () => (
  <View style={styles.footerContainer}>
    <View style={styles.footerContent}>
      <View style={styles.footerSection}>
        <Svg width={'12'} height={'12'} viewBox="0 0 24 24" style={{ fill: '#c9a961' }}>
          <Path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1v3.5c0 .55-.45 1-1 1H4c0 5.07 4.02 9.2 9 9.5z" />
        </Svg>
        <Text style={styles.footerText}>+88 01329 694660, +88 01329 694661, +88 01329 694662</Text>
      </View>
      <View style={styles.footerSection}>
        <Svg width={'12'} height={'12'} viewBox="0 0 24 24" style={{ fill: '#c9a961' }}>
          <Path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </Svg>
        <Text style={styles.footerText}>aestheticinteriorstudio@gmail.com</Text>
      </View>
      <View style={styles.footerSection}>
        <Svg width={'12'} height={'12'} viewBox="0 0 24 24" style={{ fill: '#c9a961' }}>
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
    if (!dateString) return 'N/A'
    try {
      // Handle different date formats
      const timestamp = Date.parse(dateString)
      if (isNaN(timestamp)) {
        return dateString
      }
      const d = new Date(timestamp)
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
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
    <View style={styles.detailFooterContent}>
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
    </View>
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
            <View style={styles.tableWrapper}>
              {/* HEADER ROW */}
              <View style={styles.tableHeaderRow}>
                <View style={[styles.tableHeaderCell, styles.slCell]}>
                  <Text>SL</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: '70%' }]}>
                  <Text>NAME</Text>
                </View>
                <View style={[styles.tableHeaderCellLast, styles.amountCell]}>
                  <Text>TOTAL</Text>
                </View>
              </View>

              {/* DATA ROWS */}
              {floorSummaries.map((entry, index) => (
                <View
                  key={entry.floor.id}
                  style={[
                    styles.tableDataRow,
                    index % 2 === 0 ? styles.tableDataRowOdd : styles.tableDataRowEven,
                  ]}
                >
                  <View style={[styles.tableCell, styles.slCell]}>
                    <Text>{String(index + 1).padStart(2, '0')}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: '70%' }]}>
                    <Text>{entry.floor.name}</Text>
                  </View>
                  <View style={[styles.tableCellLast, styles.amountCell]}>
                    <Text>{formatDetailAmount(entry.total)}</Text>
                  </View>
                </View>
              ))}

              {/* GRAND TOTAL ROW */}
              <View style={styles.grandTotalRow}>
                <View style={[styles.grandTotalCell, { width: '75%' }]}>
                  <Text>GRAND TOTAL</Text>
                </View>
                <View style={[styles.grandTotalCellLast, styles.amountCell]}>
                  <Text>{formatDetailAmount(totals.grandTotal)}</Text>
                </View>
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
            <View style={styles.tableWrapper}>
              {/* HEADER ROW */}
              <View style={styles.tableHeaderRow}>
                <View style={[styles.tableHeaderCell, styles.slCell]}>
                  <Text>SL</Text>
                </View>
                <View style={[styles.tableHeaderCell, styles.nameCell]}>
                  <Text>NAME</Text>
                </View>
                <View style={[styles.tableHeaderCell, styles.materialsCell]}>
                  <Text>MATERIALS</Text>
                </View>
                <View style={[styles.tableHeaderCell, styles.qtyCell]}>
                  <Text>QTY SFT</Text>
                </View>
                <View style={[styles.tableHeaderCell, styles.unitPriceCell]}>
                  <Text>UNIT PRICE</Text>
                </View>
                <View style={[styles.tableHeaderCellLast, styles.amountCell]}>
                  <Text>TOTAL</Text>
                </View>
              </View>

              {/* DATA ROWS */}
              {entry.lines.map((line, lineIndex) => {
                const isPkg = isPackageLine(line)
                return (
                  <View
                    key={line.id}
                    style={[
                      styles.tableDataRow,
                      lineIndex % 2 === 0 ? styles.tableDataRowOdd : styles.tableDataRowEven,
                    ]}
                  >
                    <View style={[styles.tableCell, styles.slCell]}>
                      <Text>{String(line.serialNo ?? lineIndex + 1).padStart(2, '0')}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.nameCell]}>
                      <Text style={{ fontWeight: 'bold' }}>{line.description}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.materialsCell]}>
                      <Text>{line.materials || '—'}</Text>
                    </View>
                    {isPkg ? (
                      <View style={[styles.tableCell, { width: '22%', textAlign: 'center' }]}>
                        <Text>Package As Per Design</Text>
                      </View>
                    ) : (
                      <>
                        <View style={[styles.tableCell, styles.qtyCell]}>
                          <Text>{line.quantity != null ? String(line.quantity) : '—'}</Text>
                        </View>
                        <View style={[styles.tableCell, styles.unitPriceCell]}>
                          <Text>{line.rate != null ? formatDetailAmount(line.rate) : '—'}</Text>
                        </View>
                      </>
                    )}
                    <View style={[styles.tableCellLast, styles.amountCell]}>
                      <Text style={{ fontWeight: 'bold' }}>
                        {formatDetailAmount(line.amount)}
                        {line.description.toLowerCase().includes('electric wiring') ? ' (Approx)' : ''}
                      </Text>
                    </View>
                  </View>
                )
              })}

              {/* GRAND TOTAL ROW */}
              <View style={styles.grandTotalRow}>
                <View style={[styles.grandTotalCell, { width: '87%' }]}>
                  <Text>TOTAL</Text>
                </View>
                <View style={[styles.grandTotalCellLast, styles.amountCell]}>
                  <Text>{formatDetailAmount(entry.total)}</Text>
                </View>
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
