import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')?.trim()

    const requisitions = await prisma.materialRequisition.findMany({
      where: {
        ...(status && status !== 'ALL'
          ? { status: status as 'SUBMITTED' | 'IN_PROCUREMENT' | 'FULFILLED' }
          : { status: { in: ['SUBMITTED', 'IN_PROCUREMENT', 'FULFILLED'] } }),
        ...(search
          ? {
              OR: [
                { requisitionNo: { contains: search, mode: 'insensitive' } },
                { lead: { name: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: { id: true, name: true, phone: true, location: true },
        },
        createdBy: {
          select: { fullName: true },
        },
        _count: {
          select: { items: true },
        },
        items: {
          select: {
            variantAttributes: true,
            workCategory: true,
          },
        },
      },
    })

    const data = requisitions.map((req) => {
      const billedCount = req.items.filter((item) => {
        const attrs = (item.variantAttributes as Record<string, unknown>) || {}
        return Boolean(attrs.billingRecord || attrs.purchaseRecord)
      }).length

      const categories = Array.from(new Set(req.items.map((i) => i.workCategory)))

      return {
        id: req.id,
        requisitionNo: req.requisitionNo,
        status: req.status,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        notes: req.notes,
        lead: req.lead,
        createdBy: req.createdBy.fullName || 'BOQ Team',
        totalItems: req._count.items,
        billedItems: billedCount,
        categories,
      }
    })

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('[GET /api/mobile/procurement/requisitions] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to load requisitions' },
      { status: 500 },
    )
  }
}
