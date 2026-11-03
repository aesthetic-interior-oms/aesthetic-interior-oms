import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { ActivityType, TransactionType } from '@/generated/prisma/client'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const searchParams = request.nextUrl.searchParams
    const leadId = toOptionalString(searchParams.get('leadId'))
    const sdcId = toOptionalString(searchParams.get('sdcId'))
    const search = toOptionalString(searchParams.get('search'))

    const where: any = {
      category: 'TOKEN_MONEY',
      ...(leadId ? { leadId } : {}),
      ...(sdcId && sdcId !== 'ALL' ? { collectedById: sdcId } : {}),
      ...(search
        ? {
            OR: [
              { lead: { name: { contains: search, mode: 'insensitive' } } },
              { lead: { phone: { contains: search, mode: 'insensitive' } } },
              { collectedBy: { fullName: { contains: search, mode: 'insensitive' } } },
              { particular: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [transactions, financeAccounts, sdcDepartmentUsers] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              location: true,
              stage: true,
              subStatus: true,
            },
          },
          collectedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          recordedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          financeAccount: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.financeAccount.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.userDepartment.findMany({
        where: { department: { name: 'SPECIALIST_DESIGN_CONSULTANTS' } },
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
    ])

    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0)
    const totalCount = transactions.length

    // Breakdown per Special Design Consultant
    const sdcMap = new Map<string, { sdcId: string; sdcName: string; count: number; totalAmount: number }>()
    for (const tx of transactions) {
      const sdcIdKey = tx.collectedById ?? 'unassigned'
      const sdcNameKey = tx.collectedBy?.fullName ?? 'Unassigned'
      const existing = sdcMap.get(sdcIdKey) ?? { sdcId: sdcIdKey, sdcName: sdcNameKey, count: 0, totalAmount: 0 }
      existing.count += 1
      existing.totalAmount += tx.amount
      sdcMap.set(sdcIdKey, existing)
    }

    const sdcBreakdown = Array.from(sdcMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)

    return NextResponse.json({
      success: true,
      data: transactions,
      stats: {
        totalAmount,
        totalCount,
        sdcBreakdown,
      },
      financeAccounts,
      sdcUsers: sdcDepartmentUsers.map((d) => d.user),
    })
  } catch (error) {
    console.error('[GET /api/crm/token-money] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch token money transactions' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const body = (await request.json().catch(() => ({}))) as {
      leadId?: unknown
      amount?: unknown
      collectedById?: unknown
      financeAccountId?: unknown
      date?: unknown
      particular?: unknown
      imageUrl?: unknown
    }

    const leadId = toOptionalString(body.leadId)
    const amount = Number(body.amount)
    const collectedById = toOptionalString(body.collectedById)
    const financeAccountId = toOptionalString(body.financeAccountId)
    const dateStr = toOptionalString(body.date)
    const particular = toOptionalString(body.particular)
    const imageUrl = toOptionalString(body.imageUrl)

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead is required' }, { status: 400 })
    }
    if (!amount || amount <= 0 || Number.isNaN(amount)) {
      return NextResponse.json({ success: false, error: 'Valid token amount is required' }, { status: 400 })
    }
    if (!financeAccountId) {
      return NextResponse.json({ success: false, error: 'Finance account is required' }, { status: 400 })
    }
    if (!collectedById) {
      return NextResponse.json(
        { success: false, error: 'Special Design Consultant (collector) is required' },
        { status: 400 },
      )
    }

    const [lead, collector, account] = await Promise.all([
      prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, name: true, stage: true, subStatus: true },
      }),
      prisma.user.findUnique({
        where: { id: collectedById },
        select: { id: true, fullName: true, email: true },
      }),
      prisma.financeAccount.findUnique({
        where: { id: financeAccountId },
        select: { id: true, name: true },
      }),
    ])

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }
    if (!collector) {
      return NextResponse.json(
        { success: false, error: 'Special Design Consultant user not found' },
        { status: 404 },
      )
    }
    if (!account) {
      return NextResponse.json({ success: false, error: 'Finance account not found' }, { status: 404 })
    }

    const parsedDate = dateStr ? new Date(dateStr) : new Date()
    const desc = particular ?? `Token money from ${lead.name} (verbal confirmation) collected by ${collector.fullName}`

    const transaction = await prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          type: TransactionType.INFLOW,
          category: 'TOKEN_MONEY',
          particular: desc,
          amount,
          leadId: lead.id,
          collectedById: collector.id,
          recordedById: authResult.actorUserId,
          financeAccountId: account.id,
          date: parsedDate,
          imageUrl: imageUrl || null,
        },
      })

      await tx.activityLog.create({
        data: {
          leadId: lead.id,
          userId: authResult.actorUserId,
          type: ActivityType.NOTE,
          description: `Token money of ৳${amount.toLocaleString()} received into ${account.name} by ${collector.fullName} (verbal confirmation).`,
        },
      })

      return createdTx
    })

    return NextResponse.json({
      success: true,
      data: transaction,
      message: `Token money of ৳${amount.toLocaleString()} successfully recorded for ${lead.name}.`,
    })
  } catch (error) {
    console.error('[POST /api/crm/token-money] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record token money' },
      { status: 500 },
    )
  }
}
