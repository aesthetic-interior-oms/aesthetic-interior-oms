import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { BoqMaterialType } from '@/generated/prisma/enums'

const STARTER_BOARDS = [
  { name: 'Garjon Plywood (Garjon Ply)', category: 'Plywood Varieties', thickness: '18mm, 12mm, 6mm', sheetSize: "8' x 4'", description: 'Hardwood core strata' },
  { name: 'Marine Plywood (BWP / Merin Ply)', category: 'Plywood Varieties', thickness: '18mm, 12mm, 6mm', sheetSize: "8' x 4'", description: 'Boiling water proof plywood' },
  { name: 'Commercial Plywood (Standard Ply)', category: 'Plywood Varieties', thickness: '18mm, 12mm, 6mm', sheetSize: "8' x 4'", description: 'Interior standard plywood' },
  { name: 'Film-Faced Plywood (Shuttering Ply)', category: 'Plywood Varieties', thickness: '18mm, 12mm', sheetSize: "8' x 4'", description: 'High density smooth film plywood' },
  { name: 'MR MDF Architect Grade Board', category: 'Engineered & Fiber Boards', thickness: '18mm, 16mm, 12mm', sheetSize: "8' x 4'", description: 'Architectural grade moisture resistant fiberboard' },
  { name: 'MR MDF (Moisture-Resistant Medium-Density Fiberboard)', category: 'Engineered & Fiber Boards', thickness: '18mm, 16mm, 12mm, 9mm, 6mm', sheetSize: "8' x 4'", description: 'Moisture resistant green core MDF' },
  { name: 'MDF (Medium Density Fiberboard)', category: 'Engineered & Fiber Boards', thickness: '18mm, 16mm, 12mm', sheetSize: "8' x 4'", description: 'Standard fiberboard' },
  { name: 'Particle Board (Plain Raw)', category: 'Engineered & Fiber Boards', thickness: '18mm, 16mm', sheetSize: "8' x 4'", description: 'Plain raw chipboard' },
  { name: 'High Moisture-Resistant (HMR) Board', category: 'Engineered & Fiber Boards', thickness: '18mm, 16mm', sheetSize: "8' x 4'", description: 'High density HMR substrate' },
  { name: 'Melamine Faced Board / MFC (Melamine Board)', category: 'Pre-Finished & Surface-Coated Boards', thickness: '18mm, 16mm', sheetSize: "8' x 4'", description: 'Pre-laminated melamine board' },
  { name: 'Veneered Board', category: 'Pre-Finished & Surface-Coated Boards', thickness: '18mm, 12mm, 4mm', sheetSize: "8' x 4'", description: 'Natural wood veneer pressed' },
  { name: 'High Gloss UV Board / Acrylic Board', category: 'Pre-Finished & Surface-Coated Boards', thickness: '18mm, 16mm', sheetSize: "8' x 4'", description: 'Mirror high gloss UV / Acrylic' },
  { name: 'Blockboard', category: 'Specialty & Waterproof Boards', thickness: '18mm, 25mm', sheetSize: "8' x 4'", description: 'Solid wood baton core' },
  { name: 'WPC (Wood Plastic Composite) Board', category: 'Specialty & Waterproof Boards', thickness: '18mm, 12mm', sheetSize: "8' x 4'", description: '100% waterproof wood plastic composite' },
  { name: 'PVC Board', category: 'Specialty & Waterproof Boards', thickness: '18mm, 12mm, 6mm', sheetSize: "8' x 4'", description: 'Rigid PVC foam board' },
  { name: 'PVC Sheet', category: 'Specialty & Waterproof Boards', thickness: '3mm', sheetSize: "8' x 4'", description: 'Waterproof thin backing sheet' },
]

const STARTER_PRELAMINATED = [
  { name: 'Champagne Gold', category: 'Solid Metallic', code: 'CG-01', description: 'Soft metallic champagne shade' },
  { name: 'Elegent', category: 'Super Matt', code: 'EL-02', description: 'Neutral warm elegant finish' },
  { name: 'Starlight', category: 'Textured', code: 'SL-03', description: 'Subtle sparkle textured finish' },
  { name: 'Starlight White', category: 'Solid Shade', code: 'SW-04', description: 'Premium clean white finish' },
  { name: 'Rose Gold', category: 'Solid Metallic', code: 'RG-05', description: 'Warm rose metallic shade' },
]

const STARTER_HPL = [
  { name: 'Luxury 8193', category: 'Luxury', code: '8193', thickness: '1mm', description: 'Premium luxury laminate' },
  { name: 'Aromex 9904', category: 'Aromex', code: '9904', thickness: '1mm', description: 'Textured HPL finish' },
  { name: 'Super 101', category: 'Super', code: '101', thickness: '1mm', description: 'Classic super finish' },
  { name: 'Super 111', category: 'Super', code: '111', thickness: '1mm', description: 'Textured super matte' },
  { name: 'Beladoa 2003', category: 'Beladoa', code: '2003 SMT', thickness: '1mm', description: 'Super Matt (SMT) finish' },
  { name: 'Airolam 903', category: 'Airolam', code: '903 SMR', thickness: '1mm', description: 'Suede Matt Finished (SMR)' },
  { name: 'Elegant A-7123', category: 'Elegant', code: 'A-7123', thickness: '1mm', description: 'Decorative woodgrain laminate' },
  { name: 'Elegant A-7112', category: 'Elegant', code: 'A-7112', thickness: '1mm', description: 'Decorative modern pattern' },
  { name: 'Advance 14081', category: 'Advance', code: '14081', thickness: '1mm', description: 'Advance architectural HPL' },
]

const STARTER_DOCU = [
  { name: 'Glossy', category: 'Docu Finish', code: 'GLOSS', description: 'High reflective mirror gloss docu finish' },
  { name: 'Soft matt', category: 'Docu Finish', code: 'MATT', description: 'Smooth satin matte architectural docu finish' },
  { name: 'White Duco', category: 'Docu Paint', code: 'DUCO-W', description: 'Signature white pigmented duco paint finish' },
  { name: 'Satin Matt', category: 'Docu Finish', code: 'SATIN', description: 'Semi-gloss silky velvet docu finish' },
]

async function ensureStarterItems() {
  const count = await prisma.boqBoardFinishItem.count({ where: { isActive: true } })
  if (count > 0) return

  const boardRows = STARTER_BOARDS.map((item, i) => ({
    type: BoqMaterialType.BOARD,
    name: item.name,
    category: item.category,
    code: '',
    thickness: item.thickness,
    sheetSize: item.sheetSize,
    description: item.description,
    serialNo: i + 1,
    isActive: true,
  }))

  const prelaminatedRows = STARTER_PRELAMINATED.map((item, i) => ({
    type: BoqMaterialType.PRELAMINATED,
    name: item.name,
    category: item.category,
    code: item.code,
    thickness: '',
    sheetSize: '',
    description: item.description,
    serialNo: i + 1,
    isActive: true,
  }))

  const hplRows = STARTER_HPL.map((item, i) => ({
    type: BoqMaterialType.HPL,
    name: item.name,
    category: item.category,
    code: item.code,
    thickness: item.thickness,
    sheetSize: '',
    description: item.description,
    serialNo: i + 1,
    isActive: true,
  }))

  const docuRows = STARTER_DOCU.map((item, i) => ({
    type: BoqMaterialType.DOCU,
    name: item.name,
    category: item.category,
    code: item.code,
    thickness: '',
    sheetSize: '',
    description: item.description,
    serialNo: i + 1,
    isActive: true,
  }))

  await prisma.boqBoardFinishItem.createMany({
    data: [...boardRows, ...prelaminatedRows, ...hplRows, ...docuRows],
    skipDuplicates: true,
  })
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await ensureStarterItems()

    const searchParams = request.nextUrl.searchParams
    const typeParam = searchParams.get('type')?.toUpperCase()

    const where: any = { isActive: true }
    if (typeParam && ['BOARD', 'PRELAMINATED', 'HPL', 'DOCU'].includes(typeParam)) {
      where.type = typeParam as BoqMaterialType
    }

    const items = await prisma.boqBoardFinishItem.findMany({
      where,
      orderBy: [{ type: 'asc' }, { serialNo: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('[boq-board-finishes][GET]', error)
    return NextResponse.json({ success: false, error: 'Unable to load board & finish items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const rawType = typeof body.type === 'string' ? body.type.toUpperCase().trim() : ''

    if (!name) return NextResponse.json({ success: false, error: 'Item name is required' }, { status: 400 })
    if (!['BOARD', 'PRELAMINATED', 'HPL', 'DOCU'].includes(rawType)) {
      return NextResponse.json({ success: false, error: 'Valid material type (BOARD, PRELAMINATED, HPL, DOCU) is required' }, { status: 400 })
    }

    const materialType = rawType as BoqMaterialType
    const serialNo = (await prisma.boqBoardFinishItem.count({ where: { type: materialType, isActive: true } })) + 1
    const imageUrl = typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null

    const item = await prisma.boqBoardFinishItem.create({
      data: {
        type: materialType,
        name: name.slice(0, 250),
        category: typeof body.category === 'string' ? body.category.slice(0, 100) : '',
        code: typeof body.code === 'string' ? body.code.slice(0, 100) : '',
        thickness: typeof body.thickness === 'string' ? body.thickness.slice(0, 100) : '',
        sheetSize: typeof body.sheetSize === 'string' ? body.sheetSize.slice(0, 100) : '',
        description: typeof body.description === 'string' ? body.description.slice(0, 500) : '',
        imageUrl,
        serialNo,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('[boq-board-finishes][POST]', error)
    return NextResponse.json({ success: false, error: 'Unable to save board or finish item' }, { status: 500 })
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
    if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim().slice(0, 250)
    if (typeof body.category === 'string') updateData.category = body.category.slice(0, 100)
    if (typeof body.code === 'string') updateData.code = body.code.slice(0, 100)
    if (typeof body.thickness === 'string') updateData.thickness = body.thickness.slice(0, 100)
    if (typeof body.sheetSize === 'string') updateData.sheetSize = body.sheetSize.slice(0, 100)
    if (typeof body.description === 'string') updateData.description = body.description.slice(0, 500)
    if (typeof body.serialNo === 'number') updateData.serialNo = body.serialNo
    if (typeof body.type === 'string' && ['BOARD', 'PRELAMINATED', 'HPL', 'DOCU'].includes(body.type.toUpperCase())) {
      updateData.type = body.type.toUpperCase() as BoqMaterialType
    }
    if ('imageUrl' in body) {
      updateData.imageUrl = typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null
    }

    const item = await prisma.boqBoardFinishItem.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('[boq-board-finishes][PUT]', error)
    return NextResponse.json({ success: false, error: 'Unable to update item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    // Soft delete so historical requisitions stay intact
    await prisma.boqBoardFinishItem.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[boq-board-finishes][DELETE]', error)
    return NextResponse.json({ success: false, error: 'Unable to delete item' }, { status: 500 })
  }
}
