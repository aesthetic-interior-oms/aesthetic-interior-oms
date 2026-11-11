import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

const STARTER_ITEMS = [
  { name: 'Elevator Basket',         category: 'Kitchen', brand: 'Hafele / Swish', itemCode: 'KIW-23',               defaultUnit: 'Pcs' },
  { name: 'Cutlery Tray',            category: 'Kitchen', brand: 'Hafele / Swish', itemCode: 'KIW-23',               defaultUnit: 'Pcs' },
  { name: 'Plate Organizer',         category: 'Kitchen', brand: 'Hafele / Swish', itemCode: 'KIW-12.1',             defaultUnit: 'Pcs' },
  { name: 'Pantry Unit',             category: 'Kitchen', brand: 'Hafele / Swish', itemCode: 'KIW-33',               defaultUnit: 'Pcs' },
  { name: 'Pull Out Hanger',         category: 'Closet',  brand: 'Gola / Hafele',  itemCode: 'GLFA943B / GLFA943S',  defaultUnit: 'Pcs' },
  { name: 'Trousers / Saree Hanger', category: 'Closet',  brand: 'Gola / Hafele',  itemCode: 'GLFJ113M / GLFJ113G',  defaultUnit: 'Pcs' },
  { name: 'Jewelry Tray Organizer',  category: 'Closet',  brand: 'Ritz / Hafele',  itemCode: 'R9001G-800',            defaultUnit: 'Pcs' },
]

async function ensureStarterItems() {
  const count = await prisma.boqSavedAccessoryItem.count({ where: { isActive: true } })
  if (count > 0) return
  await prisma.boqSavedAccessoryItem.createMany({
    data: STARTER_ITEMS.map((item, i) => ({ ...item, serialNo: i + 1, isActive: true })),
    skipDuplicates: true,
  })
}

export async function GET() {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await ensureStarterItems()
    const items = await prisma.boqSavedAccessoryItem.findMany({
      where: { isActive: true },
      orderBy: [{ serialNo: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('[boq-saved-accessories][GET]', error)
    return NextResponse.json({ success: false, error: 'Unable to load saved items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ success: false, error: 'Item name is required' }, { status: 400 })

    const serialNo = (await prisma.boqSavedAccessoryItem.count({ where: { isActive: true } })) + 1
    const imageUrl = typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null

    const item = await prisma.boqSavedAccessoryItem.create({
      data: {
        name: name.slice(0, 240),
        category: typeof body.category === 'string' ? body.category.slice(0, 100) : '',
        brand: typeof body.brand === 'string' ? body.brand.slice(0, 100) : '',
        itemCode: typeof body.itemCode === 'string' ? body.itemCode.slice(0, 100) : '',
        defaultUnit: typeof body.defaultUnit === 'string' && body.defaultUnit.trim() ? body.defaultUnit.slice(0, 40) : 'Pcs',
        imageUrl,
        serialNo,
        isActive: true,
      },
    })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('[boq-saved-accessories][POST]', error)
    return NextResponse.json({ success: false, error: 'Unable to save item' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    const updateData: Record<string, any> = {}
    if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim().slice(0, 240)
    if (typeof body.category === 'string') updateData.category = body.category.slice(0, 100)
    if (typeof body.brand === 'string') updateData.brand = body.brand.slice(0, 100)
    if (typeof body.itemCode === 'string') updateData.itemCode = body.itemCode.slice(0, 100)
    if (typeof body.defaultUnit === 'string' && body.defaultUnit.trim()) updateData.defaultUnit = body.defaultUnit.trim().slice(0, 40)
    if ('imageUrl' in body) {
      updateData.imageUrl = typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null
    }

    const item = await prisma.boqSavedAccessoryItem.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('[boq-saved-accessories][PUT]', error)
    return NextResponse.json({ success: false, error: 'Unable to update item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const id = request.nextUrl.searchParams.get('id')?.trim()
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    await prisma.boqSavedAccessoryItem.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[boq-saved-accessories][DELETE]', error)
    return NextResponse.json({ success: false, error: 'Unable to delete item' }, { status: 500 })
  }
}
