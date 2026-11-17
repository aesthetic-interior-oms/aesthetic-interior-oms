import { createElement as h } from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { canVerifyConveyance, getConveyanceActor, parseConveyanceRange } from '@/lib/conveyance'
import { CONVEYANCE_MODES, takaAmountInWords } from '@/lib/conveyance-bills'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'
const styles = StyleSheet.create({ page: { padding: 20, fontSize: 7, fontFamily: 'Helvetica' }, title: { fontSize: 18, marginBottom: 6 }, sub: { color: '#555', marginBottom: 16 }, row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 5 }, header: { backgroundColor: '#f0f2f5', fontWeight: 'bold' }, cell: { paddingHorizontal: 2 }, date: { width: '8%' }, submitted: { width: '7%' }, user: { width: '9%' }, client: { width: '10%' }, location: { width: '9%' }, route: { width: '13%' }, mode: { width: '9%' }, purpose: { width: '15%' }, amount: { width: '8%' }, status: { width: '6%' }, voucher: { width: '6%' }, total: { marginTop: 12, fontSize: 10 } })
const modeLabels = new Map<string, string>(CONVEYANCE_MODES.map((row) => [row.value, row.label]))
const money = (amount: number) => `BDT ${amount.toFixed(2)}`

export async function GET(request: NextRequest) {
  const actor = await getConveyanceActor()
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!canVerifyConveyance(actor)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  const params = request.nextUrl.searchParams
  const date = parseConveyanceRange(params.get('startDate'), params.get('endDate'))
  if (!date) return NextResponse.json({ success: false, error: 'Invalid date range' }, { status: 400 })
  const billWhere: Prisma.ConveyanceBillWhereInput = { date }
  const where: Prisma.ConveyanceRequestWhereInput = { bills: { some: billWhere } }
  if (params.get('receivedBy')) where.requesterId = params.get('receivedBy')!
  const voucher = params.get('voucher')?.trim()
  if (voucher) where.voucherNo = { contains: voucher, mode: 'insensitive' }
  const status = params.get('status')
  if (status && status !== 'ALL') where.status = status
  const requests = await prisma.conveyanceRequest.findMany({
    where,
    include: {
      requester: { select: { fullName: true } },
      bills: { where: billWhere, orderBy: { date: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
  const bills = requests.flatMap((r) => r.bills.map((b) => ({ ...b, requester: r.requester.fullName, clientName: r.clientName, clientLocation: r.clientLocation, submittedAt: r.createdAt.toISOString().slice(0, 10), status: r.status, voucherNo: r.voucherNo })))
  const total = bills.reduce((acc, row) => acc + row.amount, 0)
  const reportDoc = h(
    Document,
    null,
    h(
      Page,
      { size: 'A4', orientation: 'landscape', style: styles.page },
      h(Text, { style: styles.title }, 'Conveyance Bill Report'),
      h(Text, { style: styles.sub }, `Generated on ${new Date().toISOString().slice(0, 10)} · Total ${bills.length} bills · BDT ${total.toFixed(2)} (${takaAmountInWords(total)})`),
      h(
        View,
        { style: [styles.row, styles.header] },
        h(Text, { style: [styles.cell, styles.date] }, 'Date'),
        h(Text, { style: [styles.cell, styles.submitted] }, 'Submitted'),
        h(Text, { style: [styles.cell, styles.user] }, 'User'),
        h(Text, { style: [styles.cell, styles.client] }, 'Client'),
        h(Text, { style: [styles.cell, styles.location] }, 'Location'),
        h(Text, { style: [styles.cell, styles.route] }, 'Route'),
        h(Text, { style: [styles.cell, styles.mode] }, 'Mode'),
        h(Text, { style: [styles.cell, styles.purpose] }, 'Purpose'),
        h(Text, { style: [styles.cell, styles.status] }, 'Status'),
        h(Text, { style: [styles.cell, styles.voucher] }, 'Voucher'),
        h(Text, { style: [styles.cell, styles.amount] }, 'Amount'),
      ),
      bills.map((row) =>
        h(
          View,
          { key: row.id, style: styles.row },
          h(Text, { style: [styles.cell, styles.date] }, row.date.toISOString().slice(0, 10)),
          h(Text, { style: [styles.cell, styles.submitted] }, row.submittedAt),
          h(Text, { style: [styles.cell, styles.user] }, row.requester),
          h(Text, { style: [styles.cell, styles.client] }, row.clientName),
          h(Text, { style: [styles.cell, styles.location] }, row.clientLocation),
          h(Text, { style: [styles.cell, styles.route] }, `${row.from} -> ${row.to}`),
          h(Text, { style: [styles.cell, styles.mode] }, modeLabels.get(row.mode) ?? row.mode),
          h(Text, { style: [styles.cell, styles.purpose] }, row.purpose),
          h(Text, { style: [styles.cell, styles.status] }, row.status),
          h(Text, { style: [styles.cell, styles.voucher] }, row.voucherNo ?? '-'),
          h(Text, { style: [styles.cell, styles.amount] }, money(row.amount)),
        ),
      ),
      h(Text, { style: styles.total }, `Total Amount: ${money(total)} (${takaAmountInWords(total)})`),
    ),
  )
  const buffer = await renderToBuffer(reportDoc)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="conveyance-report.pdf"',
      'Cache-Control': 'no-store',
    },
  })
}
