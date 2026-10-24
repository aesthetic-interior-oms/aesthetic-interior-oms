'use client'

import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { RequisitionItemInput } from '@/lib/boq-service'

const isBrowser = typeof window !== 'undefined'

const fontRegular = isBrowser
  ? '/fonts/NotoSansBengali-Regular.ttf'
  : typeof process !== 'undefined' && process.cwd
    ? `${process.cwd()}/public/fonts/NotoSansBengali-Regular.ttf`
    : '/fonts/NotoSansBengali-Regular.ttf'

const fontBold = isBrowser
  ? '/fonts/NotoSansBengali-Bold.ttf'
  : typeof process !== 'undefined' && process.cwd
    ? `${process.cwd()}/public/fonts/NotoSansBengali-Bold.ttf`
    : '/fonts/NotoSansBengali-Bold.ttf'

const logoSrc = isBrowser
  ? '/Logo/HeaderLogo.png'
  : typeof process !== 'undefined' && process.cwd
    ? `${process.cwd()}/public/Logo/HeaderLogo.png`
    : '/Logo/HeaderLogo.png'

const watermarkSrc = isBrowser
  ? '/android-chrome-512x512.png'
  : typeof process !== 'undefined' && process.cwd
    ? `${process.cwd()}/public/android-chrome-512x512.png`
    : '/android-chrome-512x512.png'

Font.register({
  family: 'Noto Sans Bengali',
  fonts: [
    { src: fontRegular },
    { src: fontRegular, fontStyle: 'italic' },
    { src: fontBold, fontWeight: 'bold' },
    { src: fontBold, fontWeight: 'bold', fontStyle: 'italic' },
  ],
})

Font.registerHyphenationCallback((word) => [word])

const PRIMARY = '#1f363d'
const GOLD = '#a57c00'
const PAGE_SIDE_PADDING = 12
const BORDER = '#d7d7d7'
const BG_LIGHT = '#f3f8f7'
const BG_ALT = '#fffdfa'

const styles = StyleSheet.create({
  page: {
    paddingTop: 84,
    paddingBottom: 72,
    paddingLeft: PAGE_SIDE_PADDING,
    paddingRight: PAGE_SIDE_PADDING,
    fontFamily: 'Noto Sans Bengali',
    fontSize: 8.5,
    color: '#1a202c',
    backgroundColor: '#ffffff',
    lineHeight: 1.35,
  },
  watermark: {
    position: 'absolute',
    top: 220,
    left: 98,
    width: 400,
    height: 400,
    zIndex: -1,
    opacity: 0.05,
  },
  header: {
    position: 'absolute',
    top: 18,
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
    fontFamily: 'Times-Roman',
    fontStyle: 'italic',
    letterSpacing: 1.8,
    marginHorizontal: 10,
    textTransform: 'uppercase',
  },
  datePanel: {
    minWidth: 140,
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
  clientBox: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  clientPreTitle: {
    fontSize: 6.5,
    color: GOLD,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PRIMARY,
    lineHeight: 1.25,
    marginBottom: 2,
  },
  clientAddress: {
    fontSize: 8.5,
    color: '#4a5568',
    lineHeight: 1.3,
  },
  summaryTitleBox: {
    backgroundColor: BG_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitleText: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summarySubtitleText: {
    fontSize: 7,
    color: '#64748b',
  },
  table: {
    width: '100%',
    borderTopWidth: 0.75,
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: BORDER,
    marginBottom: 10,
  },
  tHead: {
    flexDirection: 'row',
    backgroundColor: PRIMARY,
    borderBottomWidth: 0.75,
    borderBottomColor: BORDER,
  },
  thCol: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingVertical: 3.5,
    paddingHorizontal: 3,
    borderRightWidth: 0.5,
    borderRightColor: '#3a545c',
  },
  tRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    alignItems: 'stretch',
    minHeight: 18,
  },
  tRowAlt: {
    backgroundColor: BG_ALT,
  },
  tdCol: {
    fontSize: 8,
    color: '#1a202c',
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderRightWidth: 0.5,
    borderRightColor: BORDER,
    justifyContent: 'center',
  },
  productCardHeader: {
    backgroundColor: '#1f363d',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productAreaBadge: {
    fontSize: 7,
    color: '#f6ad55',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  productDimensions: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#2d4a53',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  productQuotationSpec: {
    backgroundColor: '#edf2f7',
    paddingVertical: 2.5,
    paddingHorizontal: 8,
    fontSize: 7,
    color: '#4a5568',
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.5,
    borderColor: BORDER,
  },
  subSectionBanner: {
    backgroundColor: '#eef4f3',
    borderLeftWidth: 2.5,
    borderLeftColor: GOLD,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    marginTop: 4,
    marginBottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subSectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: PRIMARY,
    textTransform: 'uppercase',
  },
  totalsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: PRIMARY,
    backgroundColor: BG_LIGHT,
    paddingVertical: 3.5,
    paddingHorizontal: 4,
  },
  footerFixed: {
    position: 'absolute',
    bottom: 14,
    left: PAGE_SIDE_PADDING,
    right: PAGE_SIDE_PADDING,
    backgroundColor: '#ffffff',
    height: 38,
  },
  footerText: {
    fontSize: 6.5,
    color: '#64748b',
    lineHeight: 1.25,
  },
  footerMeta: {
    fontSize: 6,
    color: '#94a3b8',
  },
})

// ── Watermark ──
const WatermarkBackground = () => (
  <View style={styles.watermark} fixed>
    <Image src={watermarkSrc} style={{ width: 400, height: 400 }} />
  </View>
)

// ── Header ──
const GlobalHeader = ({
  requisitionNo,
  categoryTitle,
  date,
}: {
  requisitionNo: string
  categoryTitle: string
  date: string
}) => (
  <View style={styles.header} fixed>
    <View style={{ paddingTop: 2 }}>
      <View style={styles.headerRuleRow}>
        <View style={[styles.headerRule, { flexGrow: 1.4 }]} />
        <Text style={styles.headerTitle}>{categoryTitle}</Text>
        <View style={[styles.headerRule, { flexGrow: 0.9 }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Image src={logoSrc} style={{ width: 142 }} />
        </View>
        <View style={styles.datePanel}>
          <Text style={styles.metaLabel}>Requisition Code</Text>
          <Text style={styles.metaValue}>{requisitionNo}</Text>
          <Text style={[styles.metaLabel, { marginTop: 1 }]}>Date</Text>
          <Text style={[styles.metaValue, { fontSize: 7.5 }]}>{date}</Text>
        </View>
      </View>
    </View>
  </View>
)

// ── Footer ──
const GlobalFooter = ({
  requisitionNo,
  generatedAt,
}: {
  requisitionNo: string
  generatedAt: string
}) => (
  <View style={styles.footerFixed} fixed>
    <View style={{ borderTopWidth: 1, borderTopColor: GOLD, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ width: '38%' }}>
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold', fontSize: 7.5, marginBottom: 1 }]}>
          Aesthetic Interior Studio
        </Text>
        <Text style={styles.footerText}>183, East Senpara, Begum Rokeya Soroni</Text>
        <Text style={styles.footerText}>3rd floor, Mirpur 10, Dhaka-1216</Text>
      </View>
      <View style={{ width: '30%', alignItems: 'center' }}>
        <Text style={styles.footerText}>+88 0132969 4663 · +88 0132969 4660</Text>
        <Text style={[styles.footerText, { color: PRIMARY, fontWeight: 'bold' }]}>www.aestheticinteriorbd.com</Text>
      </View>
      <View style={{ width: '32%', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        <Text style={styles.footerText}>© 2026 All rights reserved.</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} style={styles.footerMeta} />
      </View>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
      <Text style={[styles.footerMeta, { textAlign: 'left' }]}>Requisition Ref: {requisitionNo}</Text>
      <Text style={[styles.footerMeta, { textAlign: 'right' }]}>Generated: {generatedAt}</Text>
    </View>
  </View>
)

// ── Types ──
export type RequisitionAggregatedMaterial = {
  key: string
  name: string
  specifications: string
  category: string
  subTypeLabel: string
  netQuantity: number
  wastagePercent: number
  finalQuantity: number
  unit: string
  usedInProducts: string[]
}

export type RequisitionProductSection = {
  sectionId: string
  category: string
  subTypeLabel: string
  items: RequisitionItemInput[]
}

export type RequisitionProductGroup = {
  quotationLineItemId: string | null
  productTitle: string
  areaName?: string
  productSpecs?: string
  dimensionsOrSqft?: string
  sections: RequisitionProductSection[]
}

export type RequisitionPdfData = {
  clientName: string
  clientAddress: string | null
  clientPhone: string | null
  projectName?: string
  requisitionNo: string
  categoryTitle: string
  date: string
  generatedAt: string
  aggregatedMaterials: RequisitionAggregatedMaterial[]
  productGroups: RequisitionProductGroup[]
  notes?: string
}

export function RequisitionDocumentPdf({ data }: { data: RequisitionPdfData }) {
  const {
    clientName,
    clientAddress,
    clientPhone,
    projectName,
    requisitionNo,
    categoryTitle,
    date,
    generatedAt,
    aggregatedMaterials,
    productGroups,
    notes,
  } = data

  const totalAggregatedItems = aggregatedMaterials.length
  const totalProjectQty = aggregatedMaterials.reduce((sum, item) => sum + (Number(item.finalQuantity) || 0), 0)

  return (
    <Document title={`Requisition - ${clientName} - ${categoryTitle}`} author="Aesthetic Interior">
      {/* ─── PAGE 1: CLIENT DETAILS & FULL-PROJECT AGGREGATED SUMMARY ─── */}
      <Page size="A4" style={styles.page}>
        <WatermarkBackground />
        <GlobalHeader requisitionNo={requisitionNo} categoryTitle={categoryTitle} date={date} />

        {/* Client Info Block */}
        <View style={styles.clientBox}>
          <Text style={styles.clientPreTitle}>Requisition Prepared For</Text>
          <Text style={styles.clientName}>{clientName}</Text>
          <Text style={styles.clientAddress}>
            {clientAddress || 'Site Address: Dhaka, Bangladesh'}
            {clientPhone ? ` · Phone: ${clientPhone}` : ''}
            {projectName ? ` · Project: ${projectName}` : ''}
          </Text>
        </View>

        {/* Aggregated Project Summary Banner */}
        <View style={styles.summaryTitleBox}>
          <Text style={styles.summaryTitleText}>Full Project Material Aggregation Summary</Text>
          <Text style={styles.summarySubtitleText}>
            {totalAggregatedItems} Unique Material{totalAggregatedItems === 1 ? '' : 's'} across full project
          </Text>
        </View>

        {/* Aggregated Summary Table */}
        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.thCol, { width: '5%', textAlign: 'center' }]}>SL</Text>
            <Text style={[styles.thCol, { width: '38%' }]}>Material Name &amp; Specification</Text>
            <Text style={[styles.thCol, { width: '18%' }]}>Type / Section</Text>
            <Text style={[styles.thCol, { width: '10%', textAlign: 'center' }]}>Net Qty</Text>
            <Text style={[styles.thCol, { width: '8%', textAlign: 'center' }]}>Waste</Text>
            <Text style={[styles.thCol, { width: '12%', textAlign: 'center', color: '#fbd38d' }]}>Project Qty</Text>
            <Text style={[styles.thCol, { width: '9%', textAlign: 'center', borderRightWidth: 0 }]}>Unit</Text>
          </View>

          {aggregatedMaterials.length === 0 ? (
            <View style={[styles.tRow, { padding: 8, justifyContent: 'center' }]}>
              <Text style={{ fontSize: 8, color: '#718096' }}>No requisition materials specified in this category.</Text>
            </View>
          ) : (
            aggregatedMaterials.map((mat, idx) => (
              <View key={mat.key || idx} style={[styles.tRow, idx % 2 === 1 ? styles.tRowAlt : {}]} wrap={false}>
                <Text style={[styles.tdCol, { width: '5%', textAlign: 'center' }]}>
                  {String(idx + 1).padStart(2, '0')}
                </Text>
                <View style={[styles.tdCol, { width: '38%' }]}>
                  <Text style={{ fontWeight: 'bold', color: PRIMARY, fontSize: 8.5 }}>{mat.name}</Text>
                  {mat.specifications ? (
                    <Text style={{ fontSize: 7, color: '#4a5568', marginTop: 1 }}>{mat.specifications}</Text>
                  ) : null}
                  {mat.usedInProducts.length > 0 ? (
                    <Text style={{ fontSize: 6.5, color: '#718096', marginTop: 1 }}>
                      Used in: {mat.usedInProducts.slice(0, 3).join(', ')}
                      {mat.usedInProducts.length > 3 ? ` +${mat.usedInProducts.length - 3} more` : ''}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.tdCol, { width: '18%' }]}>
                  <Text style={{ fontSize: 7.5, color: '#2d3748' }}>{mat.subTypeLabel || mat.category}</Text>
                </View>
                <Text style={[styles.tdCol, { width: '10%', textAlign: 'center' }]}>
                  {Number(mat.netQuantity).toFixed(1).replace(/\.0$/, '')}
                </Text>
                <Text style={[styles.tdCol, { width: '8%', textAlign: 'center', color: '#718096' }]}>
                  {mat.wastagePercent ? `${mat.wastagePercent}%` : '0%'}
                </Text>
                <Text style={[styles.tdCol, { width: '12%', textAlign: 'center', fontWeight: 'bold', color: PRIMARY }]}>
                  {Number(mat.finalQuantity).toFixed(1).replace(/\.0$/, '')}
                </Text>
                <Text style={[styles.tdCol, { width: '9%', textAlign: 'center', borderRightWidth: 0, textTransform: 'capitalize' }]}>
                  {mat.unit || 'pcs'}
                </Text>
              </View>
            ))
          )}

          {aggregatedMaterials.length > 0 && (
            <View style={styles.totalsRow}>
              <Text style={{ width: '61%', fontSize: 8, fontWeight: 'bold', color: PRIMARY, textAlign: 'right', paddingRight: 8 }}>
                Total Required Quantity (All Units Combined):
              </Text>
              <Text style={{ width: '30%', fontSize: 8.5, fontWeight: 'bold', color: GOLD, textAlign: 'center' }}>
                {Math.round(totalProjectQty * 10) / 10} Units
              </Text>
              <Text style={{ width: '9%' }} />
            </View>
          )}
        </View>

        <GlobalFooter requisitionNo={requisitionNo} generatedAt={generatedAt} />
      </Page>

      {/* ─── DETAIL PAGES: ORGANIZED BY QUOTATION PRODUCT ─── */}
      {productGroups.map((pg, pIdx) => {
        const hasItems = pg.sections.some((s) => s.items.length > 0)
        if (!hasItems) return null

        return (
          <Page key={pg.quotationLineItemId ?? `extra-${pIdx}`} size="A4" style={styles.page}>
            <WatermarkBackground />
            <GlobalHeader requisitionNo={requisitionNo} categoryTitle={categoryTitle} date={date} />

            {/* Quotation Product Header Banner */}
            <View style={styles.productCardHeader}>
              <View style={{ flex: 1 }}>
                {pg.areaName ? <Text style={styles.productAreaBadge}>{pg.areaName}</Text> : null}
                <Text style={styles.productTitle}>{pg.productTitle}</Text>
              </View>
              {pg.dimensionsOrSqft ? (
                <View>
                  <Text style={styles.productDimensions}>{pg.dimensionsOrSqft}</Text>
                </View>
              ) : null}
            </View>

            {pg.productSpecs ? (
              <View style={styles.productQuotationSpec}>
                <Text>Quotation Material Specs: {pg.productSpecs}</Text>
              </View>
            ) : null}

            {/* Sections under this Product */}
            {pg.sections.map((sec) => {
              if (sec.items.length === 0) return null

              return (
                <View key={sec.sectionId} style={{ marginTop: 6 }} wrap={false}>
                  {/* Sub-section Title */}
                  <View style={styles.subSectionBanner}>
                    <Text style={styles.subSectionTitle}>{sec.subTypeLabel}</Text>
                    <Text style={{ fontSize: 7, color: '#718096' }}>
                      {sec.items.length} item{sec.items.length === 1 ? '' : 's'}
                    </Text>
                  </View>

                  {/* Section Material Table */}
                  <View style={styles.table}>
                    <View style={styles.tHead}>
                      <Text style={[styles.thCol, { width: '5%', textAlign: 'center' }]}>SL</Text>
                      <Text style={[styles.thCol, { width: '35%' }]}>Material Name</Text>
                      <Text style={[styles.thCol, { width: '26%' }]}>Specification / Details</Text>
                      <Text style={[styles.thCol, { width: '9%', textAlign: 'center' }]}>Net</Text>
                      <Text style={[styles.thCol, { width: '7%', textAlign: 'center' }]}>Waste</Text>
                      <Text style={[styles.thCol, { width: '10%', textAlign: 'center', color: '#fbd38d' }]}>Final</Text>
                      <Text style={[styles.thCol, { width: '8%', textAlign: 'center', borderRightWidth: 0 }]}>Unit</Text>
                    </View>

                    {sec.items.map((it, itIdx) => {
                      const attrs = it.variantAttributes || {}
                      const dimText = (attrs.dimW || attrs.dimD || attrs.dimH)
                        ? `W${attrs.dimW || '—'} × D${attrs.dimD || '—'} × H${attrs.dimH || '—'} mm`
                        : (attrs.outerDimensions as string)

                      // Build helpful spec string based on section type
                      const extraSpecs = [
                        attrs.brandModelCode ? `Brand: ${attrs.brandModelCode}` : null,
                        attrs.itemCode ? `Code: ${attrs.itemCode}` : null,
                        dimText ? `Dim: ${dimText}` : null,
                        attrs.cabinetNicheCutOutSize && attrs.cabinetNicheCutOutSize !== '—' ? `Niche: ${attrs.cabinetNicheCutOutSize}` : null,
                        attrs.coreThickness,
                        attrs.laminateTopSurface,
                        attrs.surfaceCodeFinish,
                        attrs.sheetSize,
                        attrs.sizeDimension,
                        attrs.voltageWattage,
                        attrs.ratingDimension,
                        attrs.colorTempSpecs,
                        attrs.accentFinish,
                        attrs.codeVariant,
                        it.productionPhase,
                        it.remarks,
                      ]
                        .filter(Boolean)
                        .filter((v) => v !== '—' && v !== '-')
                        .join(' | ')

                      const displaySpec = it.specifications || extraSpecs || 'Standard Specification'

                      return (
                        <View key={itIdx} style={[styles.tRow, itIdx % 2 === 1 ? styles.tRowAlt : {}]}>
                          <Text style={[styles.tdCol, { width: '5%', textAlign: 'center' }]}>
                            {String(itIdx + 1).padStart(2, '0')}
                          </Text>
                          <View style={[styles.tdCol, { width: '35%' }]}>
                            <Text style={{ fontWeight: 'bold', color: PRIMARY, fontSize: 8 }}>
                              {it.materialName || 'Unnamed Material'}
                            </Text>
                            {attrs.functionalUsage ? (
                              <Text style={{ fontSize: 6.5, color: '#718096', marginTop: 1 }}>
                                Usage: {String(attrs.functionalUsage)}
                              </Text>
                            ) : null}
                          </View>
                          <View style={[styles.tdCol, { width: '26%' }]}>
                            <Text style={{ fontSize: 7, color: '#4a5568' }}>{displaySpec}</Text>
                          </View>
                          <Text style={[styles.tdCol, { width: '9%', textAlign: 'center' }]}>
                            {Number(it.netQuantity) || 0}
                          </Text>
                          <Text style={[styles.tdCol, { width: '7%', textAlign: 'center', color: '#718096' }]}>
                            {it.wastagePercent ? `${it.wastagePercent}%` : '0%'}
                          </Text>
                          <Text style={[styles.tdCol, { width: '10%', textAlign: 'center', fontWeight: 'bold', color: PRIMARY }]}>
                            {Number(it.finalQuantity) || 0}
                          </Text>
                          <Text style={[styles.tdCol, { width: '8%', textAlign: 'center', borderRightWidth: 0, textTransform: 'capitalize' }]}>
                            {it.unit || 'pcs'}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                </View>
              )
            })}

            <GlobalFooter requisitionNo={requisitionNo} generatedAt={generatedAt} />
          </Page>
        )
      })}

      {/* Optional Factory Remarks Page if notes exist */}
      {notes && notes.trim() ? (
        <Page size="A4" style={styles.page}>
          <WatermarkBackground />
          <GlobalHeader requisitionNo={requisitionNo} categoryTitle={categoryTitle} date={date} />

          <View style={styles.summaryTitleBox}>
            <Text style={styles.summaryTitleText}>Requisition Remarks &amp; Factory Production Notes</Text>
          </View>
          <View style={{ backgroundColor: '#f8fafc', borderWidth: 0.75, borderColor: BORDER, padding: 10, borderRadius: 2 }}>
            <Text style={{ fontSize: 8.5, color: '#2d3748', lineHeight: 1.5 }}>{notes}</Text>
          </View>

          <GlobalFooter requisitionNo={requisitionNo} generatedAt={generatedAt} />
        </Page>
      ) : null}
    </Document>
  )
}
