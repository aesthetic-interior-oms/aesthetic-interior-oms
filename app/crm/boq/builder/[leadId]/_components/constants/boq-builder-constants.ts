import type {
  RequisitionWorkCategory,
  BoqSavedAccessoryItem,
  BoqSavedApplianceItem,
  WallPanelingSubType,
  CabinetSubType,
  AccessoriesSubType,
  ApplianceSubType,
  CeilingSubType,
  ViewModeType,
} from '../types/boq-builder-types'

export const DEFAULT_ACCESSORY_CATEGORIES = ['Kitchen', 'Closet', 'Cabinet', 'Hardware']

export const DEFAULT_SAVED_ACCESSORIES: BoqSavedAccessoryItem[] = [
  { id: 'acc-1', name: 'Elevator Basket',         category: 'Kitchen', itemCode: 'KIW-23',              defaultUnit: 'Pcs' },
  { id: 'acc-2', name: 'Cutlery Tray',            category: 'Kitchen', itemCode: 'KIW-23',              defaultUnit: 'Pcs' },
  { id: 'acc-3', name: 'Plate Organizer',         category: 'Kitchen', itemCode: 'KIW-12.1',            defaultUnit: 'Pcs' },
  { id: 'acc-4', name: 'Pantry Unit',             category: 'Kitchen', itemCode: 'KIW-33',              defaultUnit: 'Pcs' },
  { id: 'acc-5', name: 'Pull Out Hanger',         category: 'Closet',  itemCode: 'GLFA943B / GLFA943S', defaultUnit: 'Pcs' },
  { id: 'acc-6', name: 'Trousers / Saree Hanger', category: 'Closet',  itemCode: 'GLFJ113M / GLFJ113G', defaultUnit: 'Pcs' },
  { id: 'acc-7', name: 'Jewelry Tray Organizer',  category: 'Closet',  itemCode: 'R9001G-800',          defaultUnit: 'Pcs' },
]

export const DEFAULT_APPLIANCE_CATEGORIES = [
  'Cooking',
  'Ventilation',
  'Sink & Wet Area',
  'Refrigeration',
  'Oven & Baking',
  'Water Purifier',
  'Dishwashing',
]

export const DEFAULT_SAVED_APPLIANCES: BoqSavedApplianceItem[] = [
  {
    id: 'app-1',
    name: 'Gas / Induction Hob',
    category: 'Cooking',
    brandModelCode: 'HAFELE 538.66.759',
    dimW: '860',
    dimD: '520',
    dimH: '135',
    cabinetNicheCutOutSize: 'W840 × D480 mm (Counter Cut)',
    defaultUnitPrice: '৳70,000',
    defaultUnit: 'Nos',
  },
  {
    id: 'app-2',
    name: 'Kitchen Hood Chimney',
    category: 'Ventilation',
    brandModelCode: 'SWISH Klasso KH 0300114-72',
    dimW: '900',
    dimD: '500',
    dimH: '600',
    cabinetNicheCutOutSize: '150mm Dia Wall Duct Hole',
    defaultUnitPrice: '৳1,15,000',
    defaultUnit: 'Nos',
  },
  {
    id: 'app-3',
    name: 'Under-Counter Sink + RO Faucet',
    category: 'Sink & Wet Area',
    brandModelCode: 'Hafele / Swish Single Bowl Granite',
    dimW: '750',
    dimD: '460',
    dimH: '220',
    cabinetNicheCutOutSize: 'W730 × D440 mm (Under-mount Cut)',
    defaultUnitPrice: '৳39,250',
    defaultUnit: 'Nos',
  },
  {
    id: 'app-4',
    name: 'Built-In Refrigerator',
    category: 'Refrigeration',
    brandModelCode: 'BOSCH Premium Series',
    dimW: '558',
    dimD: '545',
    dimH: '1772',
    cabinetNicheCutOutSize: 'W600 × H1780 × D580 mm (Cabinet Niche)',
    defaultUnitPrice: '৳4,70,000',
    defaultUnit: 'Nos',
  },
  {
    id: 'app-5',
    name: 'Built-In Electric Grill Oven',
    category: 'Oven & Baking',
    brandModelCode: 'HAFELE BSO72P',
    dimW: '595',
    dimD: '570',
    dimH: '595',
    cabinetNicheCutOutSize: 'W560 × H585 × D550 mm (Cabinet Niche)',
    defaultUnitPrice: '৳1,12,800',
    defaultUnit: 'Nos',
  },
  {
    id: 'app-6',
    name: 'Built-In Microwave Oven',
    category: 'Oven & Baking',
    brandModelCode: 'HAFELE 595 Series',
    dimW: '595',
    dimD: '467',
    dimH: '388',
    cabinetNicheCutOutSize: 'W560 × H380 × D500 mm (Cabinet Niche)',
    defaultUnitPrice: '৳74,600',
    defaultUnit: 'Nos',
  },
  {
    id: 'app-7',
    name: 'Under-Counter RO Water Purifier',
    category: 'Water Purifier',
    brandModelCode: 'KENT Excellence / Grand',
    dimW: '400',
    dimD: '260',
    dimH: '410',
    cabinetNicheCutOutSize: 'Under-Sink Cabinet Base',
    defaultUnitPrice: '৳40,000',
    defaultUnit: 'Nos',
  },
  {
    id: 'app-8',
    name: 'Built-in Dishwasher',
    category: 'Dishwashing',
    brandModelCode: 'BOSCH Serie 6 Built-in',
    dimW: '598',
    dimD: '550',
    dimH: '815',
    cabinetNicheCutOutSize: 'W600 × H820 × D570 mm (Cabinet Niche)',
    defaultUnitPrice: '৳1,25,000',
    defaultUnit: 'Nos',
  },
  {
    id: 'app-9',
    name: 'Food Waste Disposer',
    category: 'Sink & Wet Area',
    brandModelCode: 'InSinkErator Model 66',
    dimW: '173',
    dimD: '173',
    dimH: '318',
    cabinetNicheCutOutSize: 'Sink Drain Collar 3.5"',
    defaultUnitPrice: '৳35,000',
    defaultUnit: 'Nos',
  },
  {
    id: 'app-10',
    name: 'Built-in Wine Chiller',
    category: 'Refrigeration',
    brandModelCode: 'Hafele Wine Series',
    dimW: '595',
    dimD: '575',
    dimH: '820',
    cabinetNicheCutOutSize: 'W600 × H825 × D580 mm (Cabinet Niche)',
    defaultUnitPrice: '৳1,80,000',
    defaultUnit: 'Nos',
  },
]

export const WORK_CATEGORIES: { key: RequisitionWorkCategory; label: string }[] = [
  { key: 'WALL_PANELING', label: 'Wall Paneling' },
  { key: 'CABINETS_CLOSETS', label: 'Cabinets / Closets' },
  { key: 'CEILING', label: 'Ceiling' },
  { key: 'FURNITURE', label: 'Furniture' },
  { key: 'ACCESSORIES', label: 'Accessories' },
  { key: 'ELECTRICAL_WORK', label: 'Electrical Work' },
  { key: 'PAINT', label: 'Paint & Polish' },
  { key: 'APPLIANCES', label: 'Appliances' },
]

export const UOM_OPTIONS = [
  'Pcs',
  'Nos',
  'Sheets',
  'Meters',
  'RFT',
  'Kg',
  'Rolls',
  'Pack',
  'Boxes',
  'Sets',
  'Liters',
  'Tube',
  'Roll',
  'Not specified',
]

export const EXTRA_KEY = '__extra__'

export const BOARD_BASE_MATERIAL_GROUPS: { group: string; items: string[] }[] = [
  {
    group: '1. Plywood Varieties (Hardwood & Core Strata)',
    items: [
      'Garjon Plywood (Garjon Ply)',
      'Marine Plywood (BWP / Merin Ply)',
      'Commercial Plywood (Standard Ply)',
      'Film-Faced Plywood (Shuttering Ply)',
    ],
  },
  {
    group: '2. Engineered & Fiber Boards',
    items: [
      'MR MDF (Moisture-Resistant Medium-Density Fiberboard)',
      'MDF (Medium Density Fiberboard)',
      'Particle Board (Plain Raw)',
      'High Moisture-Resistant (HMR) Board',
    ],
  },
  {
    group: '3. Pre-Finished & Surface-Coated Boards',
    items: [
      'Melamine Faced Board / MFC (Melamine Board)',
      'Veneered Board',
      'High Gloss UV Board / Acrylic Board',
    ],
  },
  {
    group: '4. Specialty & Waterproof Boards',
    items: ['Blockboard', 'WPC (Wood Plastic Composite) Board'],
  },
]

export const BOARD_BASE_MATERIALS: string[] = BOARD_BASE_MATERIAL_GROUPS.flatMap((g) => g.items)

export const BOARD_LAMINATE_CATALOG = {
  solidShades: [
    'Beladoa Laminate',
    'Airolam Laminate',
    'Acrylic Finish',
    'None (Raw)',
    'Duco Paint',
    'PU Paint',
    'Melamine Finish',
    'Veneer Finish',
  ],
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
}

export const WALL_PANELING_SUBTYPES: { key: WallPanelingSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'CORE_BOARDS',      label: '🪵 Boards',                                    viewMode: 'BOARD_SPEC'    },
  { key: 'LOUVERS_PROFILES', label: '✨ Decorative Panels',                         viewMode: 'LOUVER_SPEC'   },
  { key: 'SCREWS_FASTENERS', label: '🔩 Hardware ( Screw )',                        viewMode: 'SCREW_SPEC'    },
  { key: 'NAILS_PINS',       label: '📌 Nails, Pins & Masonry Anchors',             viewMode: 'NAIL_SPEC'     },
  { key: 'ADHESIVES',        label: '🧪 Adhesives & Chemical Solvents',             viewMode: 'ADHESIVE_SPEC' },
]

export const WALL_PANEL_ONLY_SUBTYPES: { key: WallPanelingSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'CORE_BOARDS',      label: '🪵 Boards',            viewMode: 'BOARD_SPEC'  },
  { key: 'LOUVERS_PROFILES', label: '✨ Decorative Panels', viewMode: 'LOUVER_SPEC' },
]

export const HARDWARE_ONLY_SUBTYPES: { key: WallPanelingSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'SCREWS_FASTENERS', label: '🔩 Hardware ( Screw )',            viewMode: 'SCREW_SPEC'    },
  { key: 'NAILS_PINS',       label: '📌 Nails, Pins & Masonry Anchors', viewMode: 'NAIL_SPEC'     },
  { key: 'ADHESIVES',        label: '🧪 Adhesives & Chemical Solvents', viewMode: 'ADHESIVE_SPEC' },
]

export const HARDWARE_COLORS = {
  bg: 'bg-orange-50/70 dark:bg-orange-950/20',
  text: 'text-orange-950 dark:text-orange-200',
  border: 'border-orange-200/80 dark:border-orange-900/60',
  pill: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200 border-orange-300 dark:border-orange-700',
  leftBorder: 'border-l-4 border-l-orange-500',
}

export const CABINET_SUBTYPES: { key: CabinetSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'BOARD_SPEC', label: '🪵 Cabinet / Closet Board Specification', viewMode: 'CABINET_CORE_SPEC' },
]

export const ACCESSORIES_SUBTYPES: { key: AccessoriesSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'HARDWARE_ACCESSORIES',  label: '🍳 Kitchen & Closet Hardware Accessories', viewMode: 'HARDWARE_ACCESSORY_SPEC' },
  { key: 'SERVICES_DELIVERABLES', label: '🚚 Additional Deliverables & Services',    viewMode: 'SERVICES_DELIVERABLE_SPEC' },
]

export const APPLIANCE_SUBTYPES: { key: ApplianceSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'CORE_APPLIANCES', label: 'Core Appliances', viewMode: 'CORE_APPLIANCE_SPEC' },
]

export const CEILING_SUBTYPES: { key: CeilingSubType; label: string; viewMode: ViewModeType }[] = [
  { key: 'CEILING_LIGHTING',   label: '💡 Ceiling Lights & Profile Specification',    viewMode: 'CEILING_LIGHTING_SPEC' },
  { key: 'ELECTRICAL_DEVICES', label: '⚡ Drivers, Switches & Sockets Specification', viewMode: 'CEILING_ELECTRICAL_SPEC' },
]

export const CATEGORY_COLORS: Record<
  RequisitionWorkCategory,
  { bg: string; text: string; border: string; pill: string; leftBorder: string }
> = {
  WALL_PANELING:    { bg: 'bg-blue-50/70 dark:bg-blue-950/20', text: 'text-blue-950 dark:text-blue-200', border: 'border-blue-200/80 dark:border-blue-900/60', pill: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-300 dark:border-blue-700', leftBorder: 'border-l-4 border-l-blue-500' },
  CEILING:          { bg: 'bg-purple-50/70 dark:bg-purple-950/20', text: 'text-purple-950 dark:text-purple-200', border: 'border-purple-200/80 dark:border-purple-900/60', pill: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border-purple-300 dark:border-purple-700', leftBorder: 'border-l-4 border-l-purple-500' },
  CABINETS_CLOSETS: { bg: 'bg-amber-50/70 dark:bg-amber-950/20', text: 'text-amber-950 dark:text-amber-200', border: 'border-amber-200/80 dark:border-amber-900/60', pill: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 dark:border-amber-700', leftBorder: 'border-l-4 border-l-amber-500' },
  FURNITURE:        { bg: 'bg-emerald-50/70 dark:bg-emerald-950/20', text: 'text-emerald-950 dark:text-emerald-200', border: 'border-emerald-200/80 dark:border-emerald-900/60', pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700', leftBorder: 'border-l-4 border-l-emerald-500' },
  ACCESSORIES:      { bg: 'bg-pink-50/70 dark:bg-pink-950/20', text: 'text-pink-950 dark:text-pink-200', border: 'border-pink-200/80 dark:border-pink-900/60', pill: 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-200 border-pink-300 dark:border-pink-700', leftBorder: 'border-l-4 border-l-pink-500' },
  ELECTRICAL_WORK:  { bg: 'bg-yellow-50/70 dark:bg-yellow-950/20', text: 'text-yellow-950 dark:text-yellow-200', border: 'border-yellow-200/80 dark:border-yellow-900/60', pill: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700', leftBorder: 'border-l-4 border-l-yellow-500' },
  PAINT:            { bg: 'bg-indigo-50/70 dark:bg-indigo-950/20', text: 'text-indigo-950 dark:text-indigo-200', border: 'border-indigo-200/80 dark:border-indigo-900/60', pill: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700', leftBorder: 'border-l-4 border-l-indigo-500' },
  APPLIANCES:       { bg: 'bg-teal-50/70 dark:bg-teal-950/20', text: 'text-teal-950 dark:text-teal-200', border: 'border-teal-200/80 dark:border-teal-900/60', pill: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 border-teal-300 dark:border-teal-700', leftBorder: 'border-l-4 border-l-teal-500' },
}
