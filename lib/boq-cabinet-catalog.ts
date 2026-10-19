export type CabinetCatalogConfig = {
  usageOptions: string[]
  solidShades: string[]
  hplBrands: string[]
  coreThicknesses: string[]
  baseMaterials: string[]
}

export const DEFAULT_CABINET_CATALOG: CabinetCatalogConfig = {
  usageOptions: ['Shutter', 'Top Cabinet', 'Backply'],
  solidShades: ['Champagne Gold', 'Starlight White', 'Rose Gold', 'White Duco'],
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
  coreThicknesses: ['6mm', '9mm', '12mm', '16mm', '18mm', '25mm'],
  baseMaterials: [
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
  ],
}
