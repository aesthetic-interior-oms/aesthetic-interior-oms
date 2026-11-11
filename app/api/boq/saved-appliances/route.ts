import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

const STARTER_APPLIANCES = [
  {
    name: 'Gas / Induction Hob',
    category: 'Cooking',
    brand: 'Hafele',
    modelCode: '538.66.759',
    brandModelCode: 'Hafele 538.66.759',
    dimW: '860',
    dimD: '520',
    dimH: '135',
    cabinetNicheCutOutSize: 'W840 × D480 mm (Counter Cut)',
    defaultUnitPrice: '৳70,000',
    defaultUnit: 'Nos',
  },
  {
    name: 'Kitchen Hood Chimney',
    category: 'Ventilation',
    brand: 'Swish',
    modelCode: 'KH 0300114-72',
    brandModelCode: 'Swish KH 0300114-72',
    dimW: '900',
    dimD: '500',
    dimH: '600',
    cabinetNicheCutOutSize: '150mm Dia Wall Duct Hole',
    defaultUnitPrice: '৳1,15,000',
    defaultUnit: 'Nos',
  },
  {
    name: 'Under-Counter Sink + RO Faucet',
    category: 'Sink & Wet Area',
    brand: 'Hafele / Swish',
    modelCode: 'Single Bowl Granite',
    brandModelCode: 'Hafele / Swish Single Bowl Granite',
    dimW: '750',
    dimD: '460',
    dimH: '220',
    cabinetNicheCutOutSize: 'W730 × D440 mm (Under-mount Cut)',
    defaultUnitPrice: '৳39,250',
    defaultUnit: 'Nos',
  },
  {
    name: 'Built-In Refrigerator',
    category: 'Refrigeration',
    brand: 'Bosch',
    modelCode: 'Premium Series',
    brandModelCode: 'Bosch Premium Series',
    dimW: '558',
    dimD: '545',
    dimH: '1772',
    cabinetNicheCutOutSize: 'W600 × H1780 × D580 mm (Cabinet Niche)',
    defaultUnitPrice: '৳4,70,000',
    defaultUnit: 'Nos',
  },
  {
    name: 'Built-In Electric Grill Oven',
    category: 'Oven & Baking',
    brand: 'Hafele',
    modelCode: 'BSO72P',
    brandModelCode: 'Hafele BSO72P',
    dimW: '595',
    dimD: '570',
    dimH: '595',
    cabinetNicheCutOutSize: 'W560 × H585 × D550 mm (Cabinet Niche)',
    defaultUnitPrice: '৳1,12,800',
    defaultUnit: 'Nos',
  },
  {
    name: 'Built-In Microwave Oven',
    category: 'Oven & Baking',
    brand: 'Hafele',
    modelCode: '595 Series',
    brandModelCode: 'Hafele 595 Series',
    dimW: '595',
    dimD: '467',
    dimH: '388',
    cabinetNicheCutOutSize: 'W560 × H380 × D500 mm (Cabinet Niche)',
    defaultUnitPrice: '৳74,600',
    defaultUnit: 'Nos',
  },
  {
    name: 'Under-Counter RO Water Purifier',
    category: 'Water Purifier',
    brand: 'Kent',
    modelCode: 'Excellence / Grand',
    brandModelCode: 'Kent Excellence / Grand',
    dimW: '400',
    dimD: '260',
    dimH: '410',
    cabinetNicheCutOutSize: 'Under-Sink Cabinet Base',
    defaultUnitPrice: '৳40,000',
    defaultUnit: 'Nos',
  },
  {
    name: 'Built-in Dishwasher',
    category: 'Dishwashing',
    brand: 'Bosch',
    modelCode: 'Serie 6 Built-in',
    brandModelCode: 'Bosch Serie 6 Built-in',
    dimW: '598',
    dimD: '550',
    dimH: '815',
    cabinetNicheCutOutSize: 'W600 × H820 × D570 mm (Cabinet Niche)',
    defaultUnitPrice: '৳1,25,000',
    defaultUnit: 'Nos',
  },
  {
    name: 'Food Waste Disposer',
    category: 'Sink & Wet Area',
    brand: 'InSinkErator',
    modelCode: 'Model 66',
    brandModelCode: 'InSinkErator Model 66',
    dimW: '173',
    dimD: '173',
    dimH: '318',
    cabinetNicheCutOutSize: 'Sink Drain Collar 3.5"',
    defaultUnitPrice: '৳28,500',
    defaultUnit: 'Nos',
  },
]

async function ensureStarterAppliances() {
  const count = await prisma.boqSavedApplianceItem.count({ where: { isActive: true } })
  if (count > 0) return
  await prisma.boqSavedApplianceItem.createMany({
    data: STARTER_APPLIANCES.map((item, i) => ({ ...item, serialNo: i + 1, isActive: true })),
    skipDuplicates: true,
  })
}

export async function GET() {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await ensureStarterAppliances()
    const items = await prisma.boqSavedApplianceItem.findMany({
      where: { isActive: true },
      orderBy: [{ serialNo: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('[boq-saved-appliances][GET]', error)
    return NextResponse.json({ success: false, error: 'Unable to load saved appliances' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ success: false, error: 'Appliance name is required' }, { status: 400 })

    const serialNo = (await prisma.boqSavedApplianceItem.count({ where: { isActive: true } })) + 1
    const imageUrl = typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null
    const brand = typeof body.brand === 'string' ? body.brand.slice(0, 100) : ''
    const modelCode = typeof body.modelCode === 'string' ? body.modelCode.slice(0, 100) : ''
    const brandModelCode = [brand, modelCode].filter(Boolean).join(' ') || (typeof body.brandModelCode === 'string' ? body.brandModelCode.slice(0, 120) : '')

    const item = await prisma.boqSavedApplianceItem.create({
      data: {
        name: name.slice(0, 240),
        category: typeof body.category === 'string' ? body.category.slice(0, 100) : '',
        brand,
        modelCode,
        brandModelCode,
        dimW: typeof body.dimW === 'string' ? body.dimW.slice(0, 40) : '',
        dimD: typeof body.dimD === 'string' ? body.dimD.slice(0, 40) : '',
        dimH: typeof body.dimH === 'string' ? body.dimH.slice(0, 40) : '',
        cabinetNicheCutOutSize: typeof body.cabinetNicheCutOutSize === 'string' ? body.cabinetNicheCutOutSize.slice(0, 200) : '',
        defaultUnitPrice: typeof body.defaultUnitPrice === 'string' ? body.defaultUnitPrice.slice(0, 60) : '',
        defaultUnit: typeof body.defaultUnit === 'string' && body.defaultUnit.trim() ? body.defaultUnit.slice(0, 40) : 'Nos',
        imageUrl,
        serialNo,
        isActive: true,
      },
    })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('[boq-saved-appliances][POST]', error)
    return NextResponse.json({ success: false, error: 'Unable to save appliance' }, { status: 500 })
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
    if (typeof body.modelCode === 'string') updateData.modelCode = body.modelCode.slice(0, 100)
    if (body.brand || body.modelCode) {
      updateData.brandModelCode = [body.brand, body.modelCode].filter(Boolean).join(' ')
    } else if (typeof body.brandModelCode === 'string') {
      updateData.brandModelCode = body.brandModelCode.slice(0, 120)
    }
    if (typeof body.dimW === 'string') updateData.dimW = body.dimW.slice(0, 40)
    if (typeof body.dimD === 'string') updateData.dimD = body.dimD.slice(0, 40)
    if (typeof body.dimH === 'string') updateData.dimH = body.dimH.slice(0, 40)
    if (typeof body.cabinetNicheCutOutSize === 'string') updateData.cabinetNicheCutOutSize = body.cabinetNicheCutOutSize.slice(0, 200)
    if (typeof body.defaultUnitPrice === 'string') updateData.defaultUnitPrice = body.defaultUnitPrice.slice(0, 60)
    if (typeof body.defaultUnit === 'string' && body.defaultUnit.trim()) updateData.defaultUnit = body.defaultUnit.trim().slice(0, 40)
    if ('imageUrl' in body) {
      updateData.imageUrl = typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null
    }

    const item = await prisma.boqSavedApplianceItem.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('[boq-saved-appliances][PUT]', error)
    return NextResponse.json({ success: false, error: 'Unable to update appliance' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const id = request.nextUrl.searchParams.get('id')?.trim()
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    await prisma.boqSavedApplianceItem.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[boq-saved-appliances][DELETE]', error)
    return NextResponse.json({ success: false, error: 'Unable to delete appliance' }, { status: 500 })
  }
}
