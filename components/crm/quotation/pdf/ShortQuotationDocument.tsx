'use client'

import { Document, Page, StyleSheet, Text, View, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Noto Sans Bengali',
  fonts: [
    { src: '/fonts/NotoSansBengali-Regular.ttf' },
    { src: '/fonts/NotoSansBengali-Bold.ttf', fontWeight: 'bold' }
  ]
});
import { buildShortQuotationSummary } from '@/lib/short-quotation-calculations'
import type { ShortQuotationContent } from '@/lib/short-quotation-types'

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 9,
    fontFamily: 'Noto Sans Bengali',
    color: '#111',
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1pt solid #333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaBlock: {
    width: '48%',
  },
  label: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 8,
    marginTop: 2,
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#888',
    borderStyle: 'solid',
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'solid',
    minHeight: 20,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f2f2f2',
  },
  cell: {
    padding: 4,
    fontSize: 8,
  },
  smallCell: {
    width: '12%',
  },
  mediumCell: {
    width: '24%',
  },
  largeCell: {
    width: '32%',
  },
  amountCell: {
    width: '18%',
    textAlign: 'right',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  boldText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  footerNotes: {
    marginTop: 10,
  },
})

function formatAmount(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

function formatCurrency(value: number) {
  return `৳ ${formatAmount(value)}`
}

export function ShortQuotationDocument({ content }: { content: ShortQuotationContent }) {
  const summary = buildShortQuotationSummary(content)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Short Quotation</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBlock}>
              <Text style={styles.label}>Client Name</Text>
              <Text style={styles.text}>{content.clientName}</Text>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.text}>{content.clientAddress}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.label}>Quotation Date</Text>
              <Text style={styles.text}>{content.quotationDate}</Text>
              <Text style={styles.label}>Package Tier</Text>
              <Text style={styles.text}>{content.packageTier}</Text>
            </View>
          </View>
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={styles.label}>Subject</Text>
          <Text style={styles.text}>{content.subject}</Text>
          <Text style={styles.label}>Dear Sir,</Text>
          <Text style={styles.text}>{content.introLetter}</Text>
        </View>

        {summary.floors.map((floor) => (
          <View key={floor.floor.id} style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>{floor.floor.name || 'Floor'}</Text>
            {floor.rooms.map((room) => (
              <View key={room.room.id} style={{ marginBottom: 6 }}>
                <Text style={[styles.label, { marginBottom: 2 }]}>{room.room.name || 'Room'}</Text>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.cell, styles.smallCell]}>SL</Text>
                    <Text style={[styles.cell, styles.largeCell]}>Name</Text>
                    <Text style={[styles.cell, styles.mediumCell, { textAlign: 'center' }]}>Qty SFT</Text>
                    <Text style={[styles.cell, styles.mediumCell, { textAlign: 'center' }]}>Unit Price</Text>
                    <Text style={[styles.cell, styles.amountCell]}>Total</Text>
                  </View>
                  {room.lines.map((line, lineIndex) => (
                    <View key={line.id} style={styles.tableRow}>
                      <Text style={[styles.cell, styles.smallCell]}>{lineIndex + 1}</Text>
                      <Text style={[styles.cell, styles.largeCell]}>{line.name}</Text>
                      <Text style={[styles.cell, styles.mediumCell, { textAlign: 'center' }]}>
                        {line.quantitySqft != null ? formatAmount(line.quantitySqft) : '-'}
                      </Text>
                      <Text style={[styles.cell, styles.mediumCell, { textAlign: 'center' }]}>
                        {line.unitPrice != null ? formatAmount(line.unitPrice) : '-'}
                      </Text>
                      <Text style={[styles.cell, styles.amountCell]}>{formatCurrency(line.total)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.subtotalRow}>
          <Text style={styles.boldText}>Grand Total</Text>
          <Text style={styles.boldText}>{formatCurrency(summary.grandTotal)}</Text>
        </View>

        {content.footerNotes.length > 0 && (
          <View style={styles.footerNotes}>
            <Text style={styles.label}>Notes</Text>
            {content.footerNotes.map((note, index) => (
              <Text key={index} style={styles.text}>
                {index + 1}. {note}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
