import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { canRequestConveyance, getConveyanceActor, isConveyanceAccounts, parseConveyanceRange } from '@/lib/conveyance'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export async function GET(request: NextRequest) {
  const actor = await getConveyanceActor()
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const params = request.nextUrl.searchParams
  const manage = params.get('view') === 'accounts'
  if (manage && !isConveyanceAccounts(actor)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  const date = parseConveyanceRange(params.get('startDate'), params.get('endDate'))
  if (!date) return NextResponse.json({ success: false, error: 'Invalid date range' }, { status: 400 })
  const where: Prisma.ConveyanceRequestWhereInput = { travelDate: date }
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
    },
    orderBy: [{ travelDate: 'desc' }, { createdAt: 'desc' }],
  })
  const [users, totals, paidTotals] = await Promise.all([
    manage ? prisma.user.findMany({ where: { isActive: true, conveyanceRequests: { some: {} } }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } }) : Promise.resolve([]),
    prisma.conveyanceRequest.aggregate({ where, _sum: { amount: true, approvedAmount: true }, _count: { _all: true } }),
    prisma.conveyanceRequest.aggregate({ where: { AND: [where, { status: 'PAID' }] }, _sum: { approvedAmount: true } }),
  ])
  const userTotals: Array<{ userId: string; name: string; count: number; amount: number; approvedAmount: number; paidAmount: number }> = []
  if (manage) {
    const [grouped, paidGrouped] = await Promise.all([
      prisma.conveyanceRequest.groupBy({ by: ['requesterId'], where, _sum: { amount: true, approvedAmount: true }, _count: { _all: true } }),
      prisma.conveyanceRequest.groupBy({ by: ['requesterId'], where: { AND: [where, { status: 'PAID' }] }, _sum: { approvedAmount: true } }),
    ])
    const names = new Map((requests as typeof requests).map((row) => [row.requesterId, row.requester.fullName]))
    const paidByUser = new Map(paidGrouped.map((row) => [row.requesterId, row._sum.approvedAmount ?? 0]))
    for (const row of grouped) userTotals.push({ userId: row.requesterId, name: names.get(row.requesterId) ?? 'User', count: row._count._all, amount: row._sum.amount ?? 0, approvedAmount: row._sum.approvedAmount ?? 0, paidAmount: paidByUser.get(row.requesterId) ?? 0 })
    userTotals.sort((a, b) => b.paidAmount - a.paidAmount || a.name.localeCompare(b.name))
  }
  const dateGroups = new Map<string, { date: string; count: number; amount: number; approvedAmount: number; paidAmount: number; requests: typeof requests }>()
  for (const row of requests) {
    const key = row.travelDate.toISOString().slice(0, 10)
    const group = dateGroups.get(key) ?? { date: key, count: 0, amount: 0, approvedAmount: 0, paidAmount: 0, requests: [] }
    group.count += 1; group.amount += row.amount; group.approvedAmount += row.approvedAmount ?? 0
    if (row.status === 'PAID') group.paidAmount += row.approvedAmount ?? 0
    group.requests.push(row)
    dateGroups.set(key, group)
  }
  const monthGroups = new Map<string, Array<(typeof dateGroups extends Map<string, infer V> ? V : never)>>()
  for (const group of dateGroups.values()) {
    const month = group.date.slice(0, 7)
    monthGroups.set(month, [...(monthGroups.get(month) ?? []), group])
  }
  return NextResponse.json({ success: true, requests, users, totals: { count: totals._count._all, amount: totals._sum.amount ?? 0, approvedAmount: totals._sum.approvedAmount ?? 0, paidAmount: paidTotals._sum.approvedAmount ?? 0 }, userTotals, dateGroups: [...dateGroups.values()], monthGroups: [...monthGroups.entries()].map(([month, dates]) => ({ month, dates })) })
}

export async function POST(request: NextRequest) {
  const actor = await getConveyanceActor()
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!canRequestConveyance(actor)) return NextResponse.json({ success: false, error: 'Accounts users cannot submit employee conveyance requests.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const amount = Number(body?.amount)
  const purpose = typeof body?.purpose === 'string' ? body.purpose.trim() : ''
  const travelDate = typeof body?.travelDate === 'string' ? new Date(`${body.travelDate}T00:00:00.000Z`) : null
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000 || !purpose || purpose.length > 500 || !travelDate || !Number.isFinite(travelDate.getTime())) {
    return NextResponse.json({ success: false, error: 'Enter a valid amount, purpose, and travel date.' }, { status: 400 })
  }
  const created = await prisma.conveyanceRequest.create({ data: { requesterId: actor.id, amount, purpose, travelDate } })
  return NextResponse.json({ success: true, request: created }, { status: 201 })
}
