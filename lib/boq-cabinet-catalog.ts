export type CabinetCatalogConfig = {
  usageOptions: string[]
  solidShades: string[]
  hplBrands: string[]
  docuOptions?: string[]
  coreThicknesses: string[]
  shutterBodyThicknesses: string[]
  backPlyThicknesses: string[]
  baseMaterials: string[]
}

export const DEFAULT_CABINET_CATALOG: CabinetCatalogConfig = {
  usageOptions: ['Shutter', 'Body', 'Back Ply', 'Waterproof Backing'],
  solidShades: ['Champagne Gold', 'Starlight White', 'Rose Gold', 'Elegent', 'Starlight'],
  hplBrands: [
    'Luxury 8193',
    'Aromex 9904',
    'Super 101',
    'Super 111',
    'Beladoa 2003',
    'Airolam 903',
    'Elegant A-7123',
    'Elegant A-7112',
    'Advance 14081',
  ],
  docuOptions: ['Glossy', 'Soft matt', 'White Duco', 'Satin Matt'],
  coreThicknesses: ['18mm', '16mm', '9mm', '6mm', '3mm'],
  shutterBodyThicknesses: ['16mm', '18mm'],
  backPlyThicknesses: ['6mm', '9mm'],
  baseMaterials: [
    'MR MDF Architect Grade Board',
    'MR MDF (Moisture-Resistant Medium-Density Fiberboard)',
    'Garjon Plywood (Garjon Ply)',
    'Marine Plywood (BWP / Merin Ply)',
    'Commercial Plywood (Standard Ply)',
    'Film-Faced Plywood (Shuttering Ply)',
    'MDF (Medium Density Fiberboard)',
    'Particle Board (Plain Raw)',
    'High Moisture-Resistant (HMR) Board',
    'Melamine Faced Board / MFC (Melamine Board)',
    'Veneered Board',
    'High Gloss UV Board / Acrylic Board',
    'Blockboard',
    'WPC (Wood Plastic Composite) Board',
    'PVC Board',
    'PVC Sheet',
  ],
}

/**
 * Returns allowed board thickness options based on cabinet component usage:
 * - Waterproof Backing / PVC: 3mm
 * - Shutter / Body: 16mm, 18mm
 * - Back Ply: 6mm, 9mm
 */
export function getCabinetThicknessOptions(usage?: string): string[] {
  const norm = (usage || '').trim().toLowerCase()
  if (norm.includes('waterproof') || norm.includes('pvc')) {
    return ['3mm']
  }
  if (norm.includes('back')) {
    return ['6mm', '9mm']
  }
  if (
    norm.includes('shutter') ||
    norm.includes('body') ||
    norm.includes('top') ||
    norm.includes('bottom') ||
    norm.includes('carcass') ||
    norm.includes('shelves')
  ) {
    return ['16mm', '18mm']
  }
  return ['16mm', '18mm', '9mm', '6mm', '3mm']
}
