/**
 * BOQ Requisition — Smart Category Guidance
 *
 * Maps each quotation product (by template key and/or description keywords)
 * to allowed UI work categories.
 *
 * Hardware (Screws, Nails, Adhesives) is separated from Wall Paneling (Boards, Panels)
 * so every product has clear, clutter-free access to hardware without confusing
 * Wall Paneling options showing up in Cabinets/Ceilings.
 */

export type UiSectionCategory =
  | 'CABINETS_CLOSETS'
  | 'WALL_PANELING'
  | 'HARDWARE'
  | 'ACCESSORIES'
  | 'CEILING'
  | 'ELECTRICAL_WORK'
  | 'APPLIANCES'

export const UI_SECTION_CATEGORIES: { key: UiSectionCategory; label: string; badge: string }[] = [
  { key: 'CABINETS_CLOSETS', label: '🗄️ Cabinets / Closets', badge: 'Cabinets' },
  { key: 'WALL_PANELING', label: '🪵 Wall Paneling (Boards & Panels)', badge: 'Wall Paneling' },
  { key: 'HARDWARE', label: '🔩 Hardware (Screws, Nails, Adhesives)', badge: 'Hardware' },
  { key: 'ACCESSORIES', label: '🍳 Accessories & Deliverables', badge: 'Accessories' },
  { key: 'CEILING', label: '💡 Ceiling', badge: 'Ceiling' },
  { key: 'ELECTRICAL_WORK', label: '⚡ Electrical Work', badge: 'Electrical' },
  { key: 'APPLIANCES', label: '🧊 Appliances', badge: 'Appliances' },
]

export type ProductCategoryRule = {
  allowedUiCategories: UiSectionCategory[]
  defaultUiCategory: UiSectionCategory
  productLabel: string
  tier: 1 | 2 | 3
}

// ─── Tier 1 — Template Key Map ─────────────────────────────────────────────

const TEMPLATE_KEY_MAP: Record<string, Omit<ProductCategoryRule, 'tier'>> = {
  'kitchen-cabinet': {
    allowedUiCategories: ['CABINETS_CLOSETS', 'ACCESSORIES', 'HARDWARE'],
    defaultUiCategory: 'CABINETS_CLOSETS',
    productLabel: 'Kitchen Cabinet',
  },
  'closet': {
    allowedUiCategories: ['CABINETS_CLOSETS', 'ACCESSORIES', 'HARDWARE'],
    defaultUiCategory: 'CABINETS_CLOSETS',
    productLabel: 'Closet',
  },
  'dressing': {
    allowedUiCategories: ['CABINETS_CLOSETS', 'ACCESSORIES', 'HARDWARE'],
    defaultUiCategory: 'CABINETS_CLOSETS',
    productLabel: 'Dressing Unit',
  },
  'shoe-cabinet': {
    allowedUiCategories: ['CABINETS_CLOSETS', 'ACCESSORIES', 'HARDWARE'],
    defaultUiCategory: 'CABINETS_CLOSETS',
    productLabel: 'Shoe Cabinet',
  },
  'dinner-wagon': {
    allowedUiCategories: ['CABINETS_CLOSETS', 'ACCESSORIES', 'HARDWARE'],
    defaultUiCategory: 'CABINETS_CLOSETS',
    productLabel: 'Dinner Wagon',
  },
  'study-table': {
    allowedUiCategories: ['CABINETS_CLOSETS', 'ACCESSORIES', 'HARDWARE'],
    defaultUiCategory: 'CABINETS_CLOSETS',
    productLabel: 'Study Table',
  },
  'basin-cabinet-shower': {
    allowedUiCategories: ['CABINETS_CLOSETS', 'ACCESSORIES', 'HARDWARE'],
    defaultUiCategory: 'CABINETS_CLOSETS',
    productLabel: 'Basin Cabinet / Shower',
  },
  'tv-unit': {
    allowedUiCategories: ['WALL_PANELING', 'CABINETS_CLOSETS', 'ACCESSORIES', 'HARDWARE'],
    defaultUiCategory: 'WALL_PANELING',
    productLabel: 'TV Unit',
  },
  'wall-paneling': {
    allowedUiCategories: ['WALL_PANELING', 'ACCESSORIES', 'HARDWARE'],
    defaultUiCategory: 'WALL_PANELING',
    productLabel: 'Wall Paneling',
  },
  'folding-sliding-door': {
    allowedUiCategories: ['WALL_PANELING', 'ACCESSORIES', 'HARDWARE'],
    defaultUiCategory: 'WALL_PANELING',
    productLabel: 'Folding / Sliding Door',
  },
  'ceiling-curtain': {
    allowedUiCategories: ['CEILING', 'ELECTRICAL_WORK', 'ACCESSORIES', 'APPLIANCES', 'HARDWARE'],
    defaultUiCategory: 'CEILING',
    productLabel: 'Ceiling / Curtain',
  },
}

// ─── Tier 2 — Keyword Rules ─────────────────────────────────────────────────

type KeywordRule = {
  keywords: string[]
  rule: Omit<ProductCategoryRule, 'tier' | 'productLabel'>
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    keywords: [
      'kitchen cabinet', 'kitchen upper', 'kitchen lower', 'kitchen unit',
      'kitchen board', 'upper cabinet', 'lower cabinet',
    ],
    rule: {
      allowedUiCategories: ['CABINETS_CLOSETS', 'ACCESSORIES', 'HARDWARE'],
      defaultUiCategory: 'CABINETS_CLOSETS',
    },
  },
  {
    keywords: [
      'closet', 'wardrobe', 'almirah', 'dressing unit', 'dressing table',
      'shoe cabinet', 'shoe rack', 'study table', 'dinner wagon',
      'bookshelf', 'book shelf', 'cabinet', 'drawer unit',
    ],
    rule: {
      allowedUiCategories: ['CABINETS_CLOSETS', 'ACCESSORIES', 'HARDWARE'],
      defaultUiCategory: 'CABINETS_CLOSETS',
    },
  },
  {
    keywords: ['tv unit', 'tv cabinet', 'entertainment unit', 'media wall', 'media unit'],
    rule: {
      allowedUiCategories: ['WALL_PANELING', 'CABINETS_CLOSETS', 'ACCESSORIES', 'HARDWARE'],
      defaultUiCategory: 'WALL_PANELING',
    },
  },
  {
    keywords: [
      'wall panel', 'wall paneling', 'wall cladding', 'louver', 'wainscot',
      'partition', 'folding door', 'sliding door', 'feature wall',
    ],
    rule: {
      allowedUiCategories: ['WALL_PANELING', 'ACCESSORIES', 'HARDWARE'],
      defaultUiCategory: 'WALL_PANELING',
    },
  },
  {
    keywords: [
      'ceiling', 'false ceiling', 'gypsum', 'grid ceiling', 'cove ceiling',
      'curtain', 'curtain box', 'pelmet',
    ],
    rule: {
      allowedUiCategories: ['CEILING', 'ELECTRICAL_WORK', 'ACCESSORIES', 'APPLIANCES', 'HARDWARE'],
      defaultUiCategory: 'CEILING',
    },
  },
  {
    keywords: [
      'appliance', 'refrigerator', 'fridge', 'oven', 'microwave',
      'washing machine', 'air conditioner', 'ac ', ' ac', 'dishwasher',
    ],
    rule: {
      allowedUiCategories: ['APPLIANCES', 'ACCESSORIES', 'HARDWARE'],
      defaultUiCategory: 'APPLIANCES',
    },
  },
]

// ─── Fallback — Tier 3 (Unknown / Extra) ─────────────────────────────────────

const ALL_CATEGORIES: UiSectionCategory[] = [
  'CABINETS_CLOSETS',
  'WALL_PANELING',
  'HARDWARE',
  'ACCESSORIES',
  'CEILING',
  'ELECTRICAL_WORK',
  'APPLIANCES',
]

const UNKNOWN_RULE: ProductCategoryRule = {
  allowedUiCategories: ALL_CATEGORIES,
  defaultUiCategory: 'CABINETS_CLOSETS',
  productLabel: '',
  tier: 3,
}

// ─── Main detection function ────────────────────────────────────────────────

/**
 * Infers the allowed UI categories for a quotation line item.
 */
export function inferProductCategoryRule(
  description?: string | null,
  materials?: string | null,
  catalogTemplateKey?: string | null,
): ProductCategoryRule {
  // Tier 1 — template key match (most reliable)
  if (catalogTemplateKey) {
    const mapped = TEMPLATE_KEY_MAP[catalogTemplateKey]
    if (mapped) {
      return { ...mapped, tier: 1 }
    }
  }

  // Tier 2 — keyword scan
  const haystack = `${description ?? ''} ${materials ?? ''}`.toLowerCase().trim()
  if (haystack.length > 3) {
    for (const { keywords, rule } of KEYWORD_RULES) {
      if (keywords.some((kw) => haystack.includes(kw))) {
        const label = (description ?? '').trim().slice(0, 40) || 'This Product'
        return { ...rule, productLabel: label, tier: 2 }
      }
    }
  }

  // Tier 3 — unknown, show everything
  return UNKNOWN_RULE
}
