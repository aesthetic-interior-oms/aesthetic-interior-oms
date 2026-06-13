'use client'

import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { DetailQuotationContent, QuotationTotals } from '@/lib/quotation-types'

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
    width: '10%',
  },
  mediumCell: {
    width: '25%',
  },
  largeCell: {
    width: '35%',
  },
  amountCell: {
    width: '15%',
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
})

function formatAmount(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

function formatCurrency(value: number) {
  return `৳ ${formatAmount(value)}`
}

interface DetailQuotationDocumentProps {
  clientName: string
  clientAddress: string | null
  content: DetailQuotationContent
  totals: QuotationTotals
}

export function DetailQuotationDocument({
  clientName,
  clientAddress,
  content,
  totals,
}: DetailQuotationDocumentProps) {
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
              <Text style={styles.text}>{new Date().toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

        {content.floors.map((floor) => (
          <View key={floor.id} style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>{floor.name || 'Floor'}</Text>
            {floor.rooms.map((room) => (
              <View key={room.id} style={{ marginBottom: 6 }}>
                <Text style={[styles.label, { marginBottom: 2 }]}>{room.name || 'Room'}</Text>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.cell, styles.smallCell]}>SL</Text>
                    <Text style={[styles.cell, styles.largeCell]}>Item</Text>
                    <Text style={[styles.cell, styles.mediumCell, { textAlign: 'center' }]}>Qty</Text>
                    <Text style={[styles.cell, styles.mediumCell, { textAlign: 'center' }]}>Unit Price</Text>
                    <Text style={[styles.cell, styles.amountCell]}>Total</Text>
                  </View>
                  {room.items.map((item, idx) => (
                    <View key={item.id} style={styles.tableRow}>
                      <Text style={[styles.cell, styles.smallCell]}>{idx + 1}</Text>
                      <Text style={[styles.cell, styles.largeCell]}>{item.name}</Text>
                      <Text style={[styles.cell, styles.mediumCell, { textAlign: 'center' }]}>
                        {item.quantity}
                      </Text>
                      <Text style={[styles.cell, styles.mediumCell, { textAlign: 'center' }]}>
                        {formatCurrency(item.unitPrice)}
                      </Text>
                      <Text style={[styles.cell, styles.amountCell]}>
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.subtotalRow}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.boldText}>{formatCurrency(totals.subtotal)}</Text>
        </View>
        <View style={[styles.subtotalRow, { borderTopWidth: 0, marginTop: 4 }]}>
          <Text style={styles.label}>Discount</Text>
          <Text style={styles.boldText}>- {formatCurrency(totals.discountAmount)}</Text>
        </View>
        <View style={[styles.subtotalRow, { borderTopWidth: 0, marginTop: 4 }]}>
          <Text style={styles.label}>Tax</Text>
          <Text style={styles.boldText}>{formatCurrency(totals.taxAmount)}</Text>
        </View>
        <View style={[styles.subtotalRow, { marginTop: 4 }]}>
          <Text style={styles.boldText}>Grand Total</Text>
          <Text style={[styles.boldText, { fontSize: 11 }]}>
            {formatCurrency(totals.grandTotal)}
          </Text>
        </View>

        {content.notes && content.notes.length > 0 && (
          <View style={styles.footerNotes}>
            <Text style={styles.label}>Notes</Text>
            {content.notes.map((note, idx) => (
              <Text key={idx} style={styles.text}>
                {idx + 1}. {note}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
