export type ShortQuotationBundleLine = {
  name: string
  isLumpSum: boolean
  unitPriceLabel?: string
}

export type ShortQuotationBundle = {
  id: string
  name: string
  description: string
  lines: ShortQuotationBundleLine[]
}

export const SHORT_QUOTATION_BUNDLES: ShortQuotationBundle[] = [
  {
    id: 'living-room',
    name: 'Living Room',
    description: 'False ceiling, TV unit, feature wall, curtain & blind',
    lines: [
      { name: 'False Ceiling (Gypsum Board)', isLumpSum: false },
      { name: 'TV Unit with Wall Paneling', isLumpSum: false },
      { name: 'Feature / Accent Wall', isLumpSum: false },
      { name: 'Curtain Rail & Blind', isLumpSum: true, unitPriceLabel: 'as per project design' },
      { name: 'Sofa & Furniture (Supply)', isLumpSum: true, unitPriceLabel: 'as per selection' },
    ],
  },
  {
    id: 'master-bedroom',
    name: 'Master Bedroom',
    description: 'False ceiling, wardrobe, dressing unit, headboard wall',
    lines: [
      { name: 'False Ceiling (Gypsum Board)', isLumpSum: false },
      { name: 'Built-in Wardrobe', isLumpSum: false },
      { name: 'Dressing Table with Mirror', isLumpSum: false },
      { name: 'Headboard / Bed Back Wall Paneling', isLumpSum: false },
      { name: 'Curtain Rail & Blind', isLumpSum: true, unitPriceLabel: 'as per project design' },
    ],
  },
  {
    id: 'bedroom',
    name: 'Bedroom (Standard)',
    description: 'False ceiling, wardrobe, curtain',
    lines: [
      { name: 'False Ceiling (Gypsum Board)', isLumpSum: false },
      { name: 'Built-in Wardrobe', isLumpSum: false },
      { name: 'Curtain Rail & Blind', isLumpSum: true, unitPriceLabel: 'as per project design' },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    description: 'Modular kitchen cabinet, backsplash, countertop',
    lines: [
      { name: 'Modular Kitchen Cabinet (Lower)', isLumpSum: false },
      { name: 'Modular Kitchen Cabinet (Upper)', isLumpSum: false },
      { name: 'Countertop (Granite / Quartz)', isLumpSum: true, unitPriceLabel: 'as per selection' },
      { name: 'Kitchen Backsplash Tiles', isLumpSum: true, unitPriceLabel: 'as per selection' },
    ],
  },
  {
    id: 'bathroom',
    name: 'Bathroom / Toilet',
    description: 'Tiles, vanity, fixture, accessories',
    lines: [
      { name: 'Bathroom Tiles (Floor & Wall)', isLumpSum: false },
      { name: 'Vanity Cabinet with Basin', isLumpSum: true, unitPriceLabel: 'as per selection' },
      { name: 'Sanitary Fixture & Fittings', isLumpSum: true, unitPriceLabel: 'as per selection' },
      { name: 'Bathroom Accessories', isLumpSum: true, unitPriceLabel: 'as per selection' },
    ],
  },
  {
    id: 'dining',
    name: 'Dining Area',
    description: 'False ceiling, feature wall, furniture',
    lines: [
      { name: 'False Ceiling (Gypsum Board)', isLumpSum: false },
      { name: 'Dining Feature Wall / Panel', isLumpSum: false },
      { name: 'Dining Table & Chairs (Supply)', isLumpSum: true, unitPriceLabel: 'as per selection' },
    ],
  },
  {
    id: 'foyer',
    name: 'Foyer / Entrance',
    description: 'False ceiling, wall paneling, storage',
    lines: [
      { name: 'False Ceiling (Gypsum Board)', isLumpSum: false },
      { name: 'Wall Paneling / Feature Wall', isLumpSum: false },
      { name: 'Shoe Cabinet / Storage Unit', isLumpSum: false },
    ],
  },
]
