import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { canAccessQuotationDraft } from '@/lib/quotation-auth'
import { FURNITURE_QUOTATION_TEMPLATE } from '@/lib/furniture-quotation-template'

const SECTIONS = ['Furniture', 'Electrical Item'] as const

async function authorize() {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return { response: auth.response }
  if (!canAccessQuotationDraft(auth.actor.userDepartments ?? [])) {
    return { response: NextResponse.json({ success: false, error: 'You do not have access to quotation saved items' }, { status: 403 }) }
  }
  return { auth }
}

async function ensureStarterItems() {
  const existingCount = await prisma.furnitureQuotationSavedItem.count()
  if (existingCount > 0) return
  await prisma.furnitureQuotationSavedItem.createMany({
    data: FURNITURE_QUOTATION_TEMPLATE.map((item, index) => ({
      id: item.id,
      section: item.section,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      serialNo: index + 1,
    })),
    skipDuplicates: true,
  })
}

export async function GET() {
  try {
    const access = await authorize()
    if ('response' in access) return access.response
    await ensureStarterItems()
    const items = await prisma.furnitureQuotationSavedItem.findMany({ where: { isActive: true }, orderBy: [{ section: 'asc' }, { serialNo: 'asc' }, { name: 'asc' }] })
    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('[furniture-saved-items][GET]', error)
    return NextResponse.json({ success: false, error: 'Unable to load saved items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await authorize()
    if ('response' in access) return access.response
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const section = typeof body.section === 'string' && SECTIONS.includes(body.section as typeof SECTIONS[number]) ? body.section : 'Furniture'
    const quantity = Number(body.quantity ?? 1)
    const rate = Number(body.rate ?? 0)
    if (!name || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(rate) || rate < 0) {
      return NextResponse.json({ success: false, error: 'Enter an item name, valid quantity, and valid unit price' }, { status: 400 })
    }
    const serialNo = await prisma.furnitureQuotationSavedItem.count({ where: { section, isActive: true } }) + 1
    const item = await prisma.furnitureQuotationSavedItem.create({ data: {
      section,
      name: name.slice(0, 240),
      description: typeof body.description === 'string' ? body.description.slice(0, 5000) : '',
      quantity,
      unit: typeof body.unit === 'string' ? body.unit.slice(0, 80) : 'Nos',
      rate,
      serialNo,
    } })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('[furniture-saved-items][POST]', error)
    return NextResponse.json({ success: false, error: 'Unable to save item to the shared saved items list' }, { status: 500 })
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
    console.error('[furniture-saved-items][DELETE]', error)
    return NextResponse.json({ success: false, error: 'Unable to remove saved item' }, { status: 500 })
  }
}
