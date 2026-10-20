import { createElement as h } from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getConveyanceActor, isConveyanceAccounts, parseConveyanceRange } from '@/lib/conveyance'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'
const styles = StyleSheet.create({ page: { padding: 28, fontSize: 9, fontFamily: 'Helvetica' }, title: { fontSize: 18, marginBottom: 6 }, sub: { color: '#555', marginBottom: 16 }, row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 6 }, header: { backgroundColor: '#f0f2f5', fontWeight: 'bold' }, cell: { paddingHorizontal: 4 }, date: { width: '11%' }, user: { width: '16%' }, purpose: { width: '24%' }, amount: { width: '12%' }, paid: { width: '10%' }, status: { width: '12%' }, voucher: { width: '15%' }, total: { marginTop: 14, fontSize: 11 } })

export async function GET(request: NextRequest) {
  const actor = await getConveyanceActor()
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isConveyanceAccounts(actor)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  const params = request.nextUrl.searchParams
  const date = parseConveyanceRange(params.get('startDate'), params.get('endDate'))
  if (!date) return NextResponse.json({ success: false, error: 'Invalid date range' }, { status: 400 })
  const where = { travelDate: date, ...(params.get('receivedBy') ? { requesterId: params.get('receivedBy')! } : {}), ...(params.get('voucher')?.trim() ? { voucherNo: { contains: params.get('voucher')!.trim(), mode: 'insensitive' as const } } : {}), ...(params.get('status') && params.get('status') !== 'ALL' ? { status: params.get('status')! } : {}) }
  const rows = await prisma.conveyanceRequest.findMany({ where, include: { requester: { select: { fullName: true } } }, orderBy: [{ travelDate: 'asc' }, { createdAt: 'asc' }] })
  const total = rows.reduce((sum, row) => sum + (row.approvedAmount ?? 0), 0)
  const paidTotal = rows.reduce((sum, row) => sum + (row.status === 'PAID' ? row.approvedAmount ?? 0 : 0), 0)
  const rowEls = rows.map((row) => h(View, { style: styles.row, key: row.id },
    h(Text, { style: [styles.cell, styles.date] }, row.travelDate.toISOString().slice(0, 10)),
    h(Text, { style: [styles.cell, styles.user] }, row.requester.fullName),
    h(Text, { style: [styles.cell, styles.purpose] }, row.purpose),
    h(Text, { style: [styles.cell, styles.amount] }, `৳${(row.approvedAmount ?? 0).toFixed(2)}`),
    h(Text, { style: [styles.cell, styles.paid] }, row.status === 'PAID' ? `৳${(row.approvedAmount ?? 0).toFixed(2)}` : '—'),
    h(Text, { style: [styles.cell, styles.status] }, row.status),
    h(Text, { style: [styles.cell, styles.voucher] }, row.voucherNo ?? '—'),
  ))
  const pdf = h(Document, null, h(Page, { size: 'A4', style: styles.page },
    h(Text, { style: styles.title }, 'Conveyance Bill Report'),
    h(Text, { style: styles.sub }, `Travel dates: ${params.get('startDate') || 'Last 7 days'} to ${params.get('endDate') || 'Today'}  •  ${rows.length} requests`),
    h(View, { style: [styles.row, styles.header] }, h(Text, { style: [styles.cell, styles.date] }, 'Date'), h(Text, { style: [styles.cell, styles.user] }, 'Received by'), h(Text, { style: [styles.cell, styles.purpose] }, 'Purpose'), h(Text, { style: [styles.cell, styles.amount] }, 'Approved'), h(Text, { style: [styles.cell, styles.paid] }, 'Paid'), h(Text, { style: [styles.cell, styles.status] }, 'Status'), h(Text, { style: [styles.cell, styles.voucher] }, 'Voucher')),
    ...rowEls,
    h(Text, { style: styles.total }, `Approved total: ৳${total.toFixed(2)}    Paid total: ৳${paidTotal.toFixed(2)}`),
  ))
  const buffer = await renderToBuffer(pdf)
  return new NextResponse(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="conveyance-report.pdf"', 'Cache-Control': 'no-store' } })
}
