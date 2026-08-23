import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const templateKey = request.nextUrl.searchParams.get('templateKey')
    const overrides = await prisma.quotationTemplateOverride.findMany({
      where: templateKey ? { templateKey } : undefined,
    })

    return NextResponse.json({ success: true, overrides })
  } catch (error) {
    console.error('[GET /api/quotation-settings]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch overrides' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles(['ADMIN', 'QUOTATION_TEAM', 'QUOTATION'])
    if (!authResult.ok) return authResult.response

    const body = await request.json()
    const { templateKey, itemId, sectionId, description, materials, unit, priceMode, basicRate, standardRate, premiumRate, rateMin, rateMax, isNewItem, isDeleted } = body

    if (!templateKey || !itemId) {
      return NextResponse.json({ success: false, error: 'templateKey and itemId are required' }, { status: 400 })
    }

    const override = await prisma.quotationTemplateOverride.upsert({
      where: {
        templateKey_itemId: { templateKey, itemId },
      },
      create: {
        templateKey,
        itemId,
        sectionId,
        description,
        materials,
        unit,
        priceMode,
        basicRate,
        standardRate,
        premiumRate,
        rateMin,
        rateMax,
        isNewItem: isNewItem ?? false,
        isDeleted: isDeleted ?? false,
      },
      update: {
        sectionId,
        description,
        materials,
        unit,
        priceMode,
        basicRate,
        standardRate,
        premiumRate,
        rateMin,
        rateMax,
        isNewItem: isNewItem ?? false,
        isDeleted: isDeleted ?? false,
      },
    })

    return NextResponse.json({ success: true, override })
  } catch (error) {
    console.error('[PUT /api/quotation-settings]', error)
    return NextResponse.json({ success: false, error: 'Failed to save override' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles(['ADMIN', 'QUOTATION_TEAM', 'QUOTATION'])
    if (!authResult.ok) return authResult.response

    const templateKey = request.nextUrl.searchParams.get('templateKey')
    const itemId = request.nextUrl.searchParams.get('itemId')

    if (!templateKey || !itemId) {
      return NextResponse.json({ success: false, error: 'templateKey and itemId are required' }, { status: 400 })
    }

    await prisma.quotationTemplateOverride.delete({
      where: {
        templateKey_itemId: { templateKey, itemId },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/quotation-settings]', error)
    return NextResponse.json({ success: false, error: 'Failed to delete override' }, { status: 500 })
  }
}
