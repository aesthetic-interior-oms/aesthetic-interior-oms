import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { id } = await context.params

    const [requisition, suppliers] = await Promise.all([
      prisma.materialRequisition.findUnique({
        where: { id },
        include: {
          lead: {
            select: { id: true, name: true, phone: true, location: true, stage: true },
          },
          createdBy: {
            select: { fullName: true, email: true },
          },
          items: {
            orderBy: [{ workCategory: 'asc' }, { id: 'asc' }],
          },
        },
      }),
      prisma.supplier.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          supplierCode: true,
          name: true,
          companyName: true,
          phone: true,
          email: true,
          supplyCategory: true,
        },
        orderBy: { name: 'asc' },
      }),
    ])

    if (!requisition) {
      return NextResponse.json(
        { ok: false, error: 'Requisition not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      data: {
        requisition,
        suppliers,
      },
    })
  } catch (error) {
    console.error('[GET /api/mobile/procurement/requisitions/[id]] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to load requisition details' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const { status } = body || {}

    if (!['SUBMITTED', 'IN_PROCUREMENT', 'FULFILLED'].includes(status)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid requisition status' },
        { status: 400 },
      )
    }

    const updated = await prisma.materialRequisition.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (error) {
    console.error('[PATCH /api/mobile/procurement/requisitions/[id]] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update requisition status' },
      { status: 500 },
    )
  }
}
