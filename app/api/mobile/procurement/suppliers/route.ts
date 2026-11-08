import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')?.trim()
    const search = searchParams.get('search')?.trim()

    const suppliers = await prisma.supplier.findMany({
      where: {
        status: 'ACTIVE',
        ...(category && category !== 'ALL'
          ? { supplyCategory: { contains: category, mode: 'insensitive' } }
          : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { companyName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { supplyCategory: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      ok: true,
      data: suppliers,
    })
  } catch (error) {
    console.error('[GET /api/mobile/procurement/suppliers] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to load suppliers' },
      { status: 500 },
    )
  }
}
