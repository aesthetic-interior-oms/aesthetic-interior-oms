'use client'

import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'
import { buildDetailFloorSummaries, formatDetailAmount, isPackageLine } from '@/lib/detail-quotation-format'

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 9,
    fontFamily: 'Helvetica',
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
    backgroundColor: '#76933c',
    color: '#000',
    padding: 3,
    textAlign: 'center',
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
    backgroundColor: '#0070c0',
    color: '#000',
  },
  cell: {
    padding: 4,
    fontSize: 8,
    color: '#000',
  },
  smallCell: {
    width: '4%',
  },
  nameCell: {
    width: '28%',
  },
  materialsCell: {
    width: '38%',
  },
  amountCell: {
    width: '7%',
    textAlign: 'right',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderColor: '#333',
  },
  boldText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  footerNotes: {
    marginTop: 12,
  },
  totals: {
    marginTop: 10,
  },
})

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
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Detail Quotation</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBlock}>
              <Text style={styles.label}>Client Name</Text>
              <Text style={styles.text}>{clientName}</Text>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.text}>{clientAddress || 'Not provided'}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.label}>Quotation Date</Text>
              <Text style={styles.text}>
                {content.quotationDate ? new Date(content.quotationDate).toLocaleDateString() : ''}
              </Text>
            </View>
          </View>
        </View>

        {floorSummaries.map((entry, index) => (
          <View key={entry.floor.id} style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>{entry.floor.name || 'Section'}</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                 <Text style={[styles.cell, styles.smallCell]}>SL</Text>
                <Text style={[styles.cell, styles.nameCell]}>NAME</Text>
                <Text style={[styles.cell, styles.materialsCell]}>MATERIALS</Text>
                <Text style={[styles.cell, { width: '10%', textAlign: 'center' }]}>QTY SFT</Text>
                <Text style={[styles.cell, { width: '10%', textAlign: 'center' }]}>UNIT PRICE</Text>
                <Text style={[styles.cell, styles.amountCell]}>TOTAL</Text>
              </View>
              {entry.lines.map((line, lineIndex) => {
                const isPkg = isPackageLine(line)
                return (
                  <View key={line.id} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.smallCell]}>
                      {String(line.serialNo ?? lineIndex + 1).padStart(2, '0')}
                    </Text>
                    <Text style={[styles.cell, styles.nameCell]}>{line.description}</Text>
                    <Text style={[styles.cell, styles.materialsCell]}>
                      {line.materials || '—'}
                    </Text>
                    <Text style={[styles.cell, { width: '10%', textAlign: 'center' }]}>
                      {isPkg ? 'Package' : formatDetailAmount(line.quantity)}
                    </Text>
                    <Text style={[styles.cell, { width: '10%', textAlign: 'center' }]}>
                      {isPkg ? formatDetailAmount(line.rate) : formatDetailAmount(line.rate)}
                    </Text>
                    <Text style={[styles.cell, styles.amountCell]}>
                      {formatDetailAmount(line.amount)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.subtotalRow}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.boldText}>{formatDetailAmount(totals.subtotal)}</Text>
          </View>
          <View style={{ ...styles.subtotalRow, borderTopWidth: 0, marginTop: 4 }}>
            <Text style={styles.label}>Discount</Text>
            <Text style={styles.boldText}>- {formatDetailAmount(totals.discountAmount)}</Text>
          </View>
          <View style={{ ...styles.subtotalRow, borderTopWidth: 0, marginTop: 4 }}>
            <Text style={styles.label}>Tax</Text>
            <Text style={styles.boldText}>{formatDetailAmount(totals.taxAmount)}</Text>
          </View>
          <View style={styles.subtotalRow}>
            <Text style={styles.boldText}>Grand Total</Text>
            <Text style={[styles.boldText, { fontSize: 11 }]}>
              {formatDetailAmount(totals.grandTotal)}
            </Text>
          </View>
        </View>

        {content.notes && (
          <View style={styles.footerNotes}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.text}>{content.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
