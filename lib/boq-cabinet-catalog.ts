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
    'MR Board',
    'Marine Plywood',
    'Garjon Plywood',
    'Commercial Ply',
    'MDF Core',
    'White Board',
    'Elegant Board',
    'Starlight Board',
  ],
}
