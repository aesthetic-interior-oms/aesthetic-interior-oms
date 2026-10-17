import { NextResponse } from 'next/server'
import { getBoqCabinetCatalog } from '@/lib/boq-service'

export async function GET() {
  try {
    const catalog = await getBoqCabinetCatalog()
    return NextResponse.json(catalog)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
