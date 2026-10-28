export const DECORATIVE_PANEL_GROUPS = [
  {
    group: '1. Readymade Panels (Code Only)',
    items: [
      'WPC',
      'Charcoal',
      'PU Stone',
      'Lumistone',
      'Acoustic Slat Panel',
    ],
  },
  {
    group: '2. Customize Panels (Thickness & Finish)',
    items: [
      'T Bit',
      'Molding Bit',
      'Fabric Panel',
      'Acrylic Mirror',
      'Mosaic Pannel',
      '3D Murals',
      'Bavel Mirror Panel',
    ],
  },
]

export function isReadymadePanel(mat?: string): boolean {
  if (!mat) return false
  const m = mat.toLowerCase()
  return (
    m.includes('wpc') ||
    m.includes('charcoal') ||
    m.includes('pu stone') ||
    m.includes('lumistone') ||
    m.includes('acoustic')
  )
}

export function isCustomizePanel(mat?: string): boolean {
  if (!mat) return false
  const m = mat.toLowerCase()
  return (
    m.includes('t bit') ||
    m.includes('molding') ||
    m.includes('moulding') ||
    m.includes('fabric') ||
    m.includes('acrylic') ||
    m.includes('mosaic') ||
    m.includes('mural') ||
    m.includes('bavel') ||
    m.includes('bevel')
  )
}
