import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { canRequestConveyance, getConveyanceActor, isConveyanceAccounts, parseConveyanceRange } from '@/lib/conveyance'
import { parseConveyanceBills, takaAmountInWords } from '@/lib/conveyance-bills'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export async function GET(request: NextRequest) {
  const actor = await getConveyanceActor()
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const params = request.nextUrl.searchParams
  const manage = params.get('view') === 'accounts'
  if (manage && !isConveyanceAccounts(actor)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  const date = parseConveyanceRange(params.get('startDate'), params.get('endDate'))
  if (!date) return NextResponse.json({ success: false, error: 'Invalid date range' }, { status: 400 })
  const billWhere: Prisma.ConveyanceBillWhereInput = { date }
  const where: Prisma.ConveyanceRequestWhereInput = { bills: { some: billWhere } }
  if (!manage) where.requesterId = actor.id
  const status = params.get('status')
  if (manage && status && status !== 'ALL') where.status = status
  const requesterId = manage ? params.get('receivedBy') : null
  if (requesterId) where.requesterId = requesterId
  const voucher = manage ? params.get('voucher')?.trim() : ''
  if (voucher) where.voucherNo = { contains: voucher, mode: 'insensitive' }

  const requests = await prisma.conveyanceRequest.findMany({
    where,
    include: {
      requester: { select: { id: true, fullName: true, email: true, userDepartments: { select: { department: { select: { name: true } } } } } },
      reviewedBy: { select: { fullName: true } },
      bills: { where: billWhere, orderBy: { date: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
  const users = manage
    ? await prisma.user.findMany({ where: { isActive: true, conveyanceRequests: { some: {} } }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } })
    : []

  const billRows = requests.flatMap((row) => row.bills.map((bill) => ({
    ...bill,
    requestId: row.id,
    clientName: row.clientName,
    clientLocation: row.clientLocation,
    submittedAt: row.createdAt,
    requester: row.requester,
    status: row.status,
    voucherNo: row.voucherNo,
    accountsNote: row.accountsNote,
    reviewedBy: row.reviewedBy,
  })))
  const userTotalsMap = new Map<string, { userId: string; name: string; count: number; requestCount: Set<string>; amount: number; approvedAmount: number; paidAmount: number }>()
  const dateGroupsMap = new Map<string, { date: string; count: number; requestIds: Set<string>; amount: number; approvedAmount: number; paidAmount: number; bills: typeof billRows }>()
  for (const bill of billRows) {
    const total = userTotalsMap.get(bill.requester.id) ?? { userId: bill.requester.id, name: bill.requester.fullName, count: 0, requestCount: new Set<string>(), amount: 0, approvedAmount: 0, paidAmount: 0 }
    total.count += 1
    total.requestCount.add(bill.requestId)
    total.amount += bill.amount
    if (bill.status === 'APPROVED' || bill.status === 'PAID') total.approvedAmount += bill.amount
    if (bill.status === 'PAID') total.paidAmount += bill.amount
    userTotalsMap.set(bill.requester.id, total)

    const day = bill.date.toISOString().slice(0, 10)
    const group = dateGroupsMap.get(day) ?? { date: day, count: 0, requestIds: new Set<string>(), amount: 0, approvedAmount: 0, paidAmount: 0, bills: [] }
    group.count += 1
    group.requestIds.add(bill.requestId)
    group.amount += bill.amount
    if (bill.status === 'APPROVED' || bill.status === 'PAID') group.approvedAmount += bill.amount
    if (bill.status === 'PAID') group.paidAmount += bill.amount
    group.bills.push(bill)
    dateGroupsMap.set(day, group)
  }
  const userTotals = [...userTotalsMap.values()].map(({ requestCount, ...row }) => ({ ...row, requestCount: requestCount.size, amount: roundMoney(row.amount), approvedAmount: roundMoney(row.approvedAmount), paidAmount: roundMoney(row.paidAmount) })).sort((a, b) => b.paidAmount - a.paidAmount || a.name.localeCompare(b.name))
  const dateGroups = [...dateGroupsMap.values()].map(({ requestIds, ...row }) => ({ ...row, requestCount: requestIds.size, amount: roundMoney(row.amount), approvedAmount: roundMoney(row.approvedAmount), paidAmount: roundMoney(row.paidAmount) }))
  const monthGroups = new Map<string, typeof dateGroups>()
  for (const group of dateGroups) {
    const month = group.date.slice(0, 7)
    monthGroups.set(month, [...(monthGroups.get(month) ?? []), group])
  }
  const totals = {
    count: requests.length,
    billCount: billRows.length,
    amount: roundMoney(billRows.reduce((sum, bill) => sum + bill.amount, 0)),
    approvedAmount: roundMoney(billRows.reduce((sum, bill) => sum + (bill.status === 'APPROVED' || bill.status === 'PAID' ? bill.amount : 0), 0)),
    paidAmount: roundMoney(billRows.reduce((sum, bill) => sum + (bill.status === 'PAID' ? bill.amount : 0), 0)),
  }
  const responseRequests = requests.map((row) => ({ ...row, amountInWords: takaAmountInWords(row.amount) }))
  return NextResponse.json({ success: true, requests: responseRequests, users, totals, userTotals, dateGroups, monthGroups: [...monthGroups.entries()].map(([month, dates]) => ({ month, dates })) })
}

export async function POST(request: NextRequest) {
  const actor = await getConveyanceActor()
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!canRequestConveyance(actor)) return NextResponse.json({ success: false, error: 'Accounts users cannot submit employee conveyance requests.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const clientName = typeof body?.clientName === 'string' ? body.clientName.trim() : ''
  const clientLocation = typeof body?.clientLocation === 'string' ? body.clientLocation.trim() : ''
  const parsed = parseConveyanceBills(body?.bills)
  if (!clientName || clientName.length > 250 || !clientLocation || clientLocation.length > 500 || !parsed) {
    return NextResponse.json({ success: false, error: 'Enter the client name and location, then complete every bill row with valid details and amount.' }, { status: 400 })
  }
  const created = await prisma.conveyanceRequest.create({
    data: {
      requesterId: actor.id,
      amount: parsed.total,
      clientName,
      clientLocation,
      bills: { create: parsed.bills.map((bill) => ({ date: new Date(`${bill.date}T00:00:00.000Z`), from: bill.from, to: bill.to, mode: bill.mode, purpose: bill.purpose, amount: bill.amount })) },
    },
    include: { bills: { orderBy: { date: 'asc' } } },
  })
  return NextResponse.json({ success: true, request: { ...created, amountInWords: takaAmountInWords(parsed.total) } }, { status: 201 })
}
