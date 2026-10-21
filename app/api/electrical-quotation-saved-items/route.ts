import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { canAccessQuotationDraft } from '@/lib/quotation-auth'
import { ELECTRICAL_QUOTATION_TEMPLATE } from '@/lib/electrical-quotation-template'

const SECTION = 'Electrical'

async function authorize() {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return { response: auth.response }
  if (!canAccessQuotationDraft(auth.actor.userDepartments ?? [])) {
    return { response: NextResponse.json({ success: false, error: 'You do not have access to quotation saved items' }, { status: 403 }) }
  }
  return { auth }
}

async function ensureStarterItems() {
  const existingCount = await prisma.furnitureQuotationSavedItem.count({
    where: { section: SECTION, isActive: true },
  })
  if (existingCount > 0) return

  await prisma.furnitureQuotationSavedItem.createMany({
    data: ELECTRICAL_QUOTATION_TEMPLATE.map((item, index) => ({
      id: `elec-saved-${index + 1}`,
      section: SECTION,
      name: item.name,
      description: item.description,
      quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 0,
      unit: item.unit || 'NOS',
      rate: typeof item.rate === 'number' && item.rate > 0 ? item.rate : 0,
      serialNo: index + 1,
      isActive: true,
    })),
    skipDuplicates: true,
  })
}

export async function GET() {
  try {
    const access = await authorize()
    if ('response' in access) return access.response
    await ensureStarterItems()
    const items = await prisma.furnitureQuotationSavedItem.findMany({
      where: { section: SECTION, isActive: true },
      orderBy: [{ serialNo: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('[electrical-saved-items][GET]', error)
    return NextResponse.json({ success: false, error: 'Unable to load saved items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await authorize()
    if ('response' in access) return access.response
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ success: false, error: 'Enter an item name' }, { status: 400 })
    }

    const rawQty = body.quantity
    const rawRate = body.rate
    const quantity = rawQty !== null && rawQty !== undefined && rawQty !== '' ? Number(rawQty) : 0
    const rate = rawRate !== null && rawRate !== undefined && rawRate !== '' ? Number(rawRate) : 0

    const serialNo = await prisma.furnitureQuotationSavedItem.count({ where: { section: SECTION, isActive: true } }) + 1
    const item = await prisma.furnitureQuotationSavedItem.create({
      data: {
        section: SECTION,
        name: name.slice(0, 240),
        description: typeof body.description === 'string' ? body.description.slice(0, 5000) : '',
        quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 0,
        unit: typeof body.unit === 'string' && body.unit.trim() ? body.unit.slice(0, 80) : 'NOS',
        rate: Number.isFinite(rate) && rate >= 0 ? rate : 0,
        serialNo,
        isActive: true,
      },
    })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('[electrical-saved-items][POST]', error)
    return NextResponse.json({ success: false, error: 'Unable to save item to the library' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await authorize()
    if ('response' in access) return access.response
    const id = request.nextUrl.searchParams.get('id')?.trim()
    if (!id) return NextResponse.json({ success: false, error: 'Saved item id is required' }, { status: 400 })
    await prisma.furnitureQuotationSavedItem.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[electrical-saved-items][DELETE]', error)
    return NextResponse.json({ success: false, error: 'Unable to remove saved item' }, { status: 500 })
  }
}
