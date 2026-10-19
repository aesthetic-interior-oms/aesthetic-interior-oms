'use client'

import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { amountInWordsTaka } from '@/lib/number-to-words'
import type { FurnitureQuotationContent, FurnitureQuotationItem } from '@/lib/furniture-quotation-template'

const colors = { ink: '#20343a', accent: '#a57c00', border: '#d8dfe0', muted: '#5b6568', pale: '#f3f7f6' }
const styles = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 42, paddingHorizontal: 34, fontFamily: 'Helvetica', fontSize: 9, color: '#171717' },
  brand: { fontSize: 10, color: colors.ink, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.6 },
  title: { marginTop: 18, marginBottom: 12, textAlign: 'center', fontSize: 16, color: colors.ink, fontWeight: 'bold', letterSpacing: 1 },
  client: { marginBottom: 14, lineHeight: 1.5 },
  subject: { marginBottom: 12, fontSize: 9 },
  sectionTitle: { marginTop: 10, marginBottom: 4, padding: 7, backgroundColor: colors.pale, color: colors.ink, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  tableHead: { flexDirection: 'row', paddingVertical: 6, backgroundColor: colors.ink, color: '#fff' },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingVertical: 6, alignItems: 'flex-start' },
  rowAlt: { backgroundColor: '#fafafa' },
  serial: { width: '7%', paddingHorizontal: 4, textAlign: 'center' },
  description: { width: '47%', paddingHorizontal: 5 },
  quantity: { width: '12%', paddingHorizontal: 4, textAlign: 'right' },
  unit: { width: '11%', paddingHorizontal: 4, textAlign: 'center' },
  rate: { width: '11%', paddingHorizontal: 4, textAlign: 'right' },
  total: { width: '12%', paddingHorizontal: 4, textAlign: 'right' },
  headText: { fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase' },
  itemName: { fontSize: 8, fontWeight: 'bold', marginBottom: 2 },
  itemDescription: { fontSize: 7, color: colors.muted, lineHeight: 1.3, whiteSpace: 'pre-wrap' },
  sectionTotal: { paddingTop: 6, textAlign: 'right', fontSize: 9, fontWeight: 'bold', color: colors.ink },
  grandRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: colors.ink, marginTop: 14, paddingTop: 8 },
  grandLabel: { width: '70%', paddingRight: 12, textAlign: 'right', fontWeight: 'bold', fontSize: 11, color: colors.ink },
  grandAmount: { width: '30%', textAlign: 'right', fontWeight: 'bold', fontSize: 11, color: colors.ink },
  words: { marginTop: 6, fontSize: 9, fontWeight: 'bold' },
  notesTitle: { marginTop: 16, marginBottom: 4, fontSize: 9, fontWeight: 'bold', color: colors.ink },
  notes: { fontSize: 8, lineHeight: 1.4, color: colors.muted, whiteSpace: 'pre-wrap' },
  footer: { position: 'absolute', bottom: 18, left: 34, right: 34, borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: colors.muted },
})

function money(value: number) { return Math.round(value).toLocaleString('en-IN') }

export function FurnitureQuotationDocument({ content, leadName, leadLocation }: { content: FurnitureQuotationContent; leadName: string; leadLocation: string | null }) {
  const sections: Array<{ name: FurnitureQuotationItem['section']; items: FurnitureQuotationItem[] }> = [
    { name: 'Furniture', items: content.items.filter((item) => item.section === 'Furniture') },
    ...(content.showElectricalSection ? [{ name: 'Electrical Item' as const, items: content.items.filter((item) => item.section === 'Electrical Item') }] : []),
  ]
  const grandTotal = content.items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  return <Document>
    <Page size="A4" style={styles.page} wrap>
      <Text style={styles.brand}>Aesthetic Interior Studio</Text>
      <Text style={styles.title}>QUOTATION</Text>
      <View style={styles.client}>
        <Text><Text style={{ fontWeight: 'bold' }}>Quotation for: </Text>{leadName}</Text>
        {leadLocation ? <Text><Text style={{ fontWeight: 'bold' }}>Address: </Text>{leadLocation}</Text> : null}
        <Text><Text style={{ fontWeight: 'bold' }}>Date: </Text>{content.quotationDate}</Text>
      </View>
      {content.subject ? <Text style={styles.subject}><Text style={{ fontWeight: 'bold' }}>Subject: </Text>{content.subject}</Text> : null}
      {sections.map(({ name, items }) => {
        if (!items.length && name === 'Electrical Item') return null
        const sectionTotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
        return <View key={name} wrap>
          <Text style={styles.sectionTitle}>{name}</Text>
          <View style={styles.tableHead} fixed>
            <Text style={[styles.serial, styles.headText]}>SL</Text><Text style={[styles.description, styles.headText]}>Name & description</Text><Text style={[styles.quantity, styles.headText]}>Qty</Text><Text style={[styles.unit, styles.headText]}>Unit</Text><Text style={[styles.rate, styles.headText]}>Rate</Text><Text style={[styles.total, styles.headText]}>Total</Text>
          </View>
          {items.map((item, index) => <View key={item.id} style={[styles.row, index % 2 ? styles.rowAlt : {}]} wrap={false}>
            <Text style={styles.serial}>{String(item.serialNo ?? index + 1).padStart(2, '0')}</Text>
            <View style={styles.description}><Text style={styles.itemName}>{item.name}</Text>{item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}</View>
            <Text style={styles.quantity}>{item.quantity.toLocaleString()}</Text><Text style={styles.unit}>{item.unit}</Text><Text style={styles.rate}>{money(item.rate)}</Text><Text style={styles.total}>{money(item.quantity * item.rate)}</Text>
          </View>)}
          <Text style={styles.sectionTotal}>{name} Total: BDT {money(sectionTotal)}</Text>
        </View>
      })}
      <View style={styles.grandRow}><Text style={styles.grandLabel}>GRAND TOTAL</Text><Text style={styles.grandAmount}>BDT {money(grandTotal)}</Text></View>
      <Text style={styles.words}>In Words: {amountInWordsTaka(grandTotal)}</Text>
      {content.notes ? <View><Text style={styles.notesTitle}>Notes</Text><Text style={styles.notes}>{content.notes}</Text></View> : null}
      <View style={styles.footer} fixed><Text>Aesthetic Interior Studio</Text><Text>www.aestheticinteriorbd.com</Text></View>
    </Page>
  </Document>
}
