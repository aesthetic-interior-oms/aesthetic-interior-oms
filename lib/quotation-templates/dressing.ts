import type { QuotationTemplateDefinition } from '@/lib/quotation-types'
import { fixedRates, rangeRates } from '@/lib/quotation-templates/helpers'

const DEFAULT_TERMS =
  'Quotation valid for 15 days. Rates are per sqft unless noted. Wiring and lighting are excluded unless specified. Payment: 50% advance, 40% on material delivery, 10% on completion.'

const MIRROR_COMPOSITION =
  'Mirror composition: 12 mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood with 5 mm Belgium crystal mirror glass attached with highly dense silicon gum.'

const SMART_HARDWARE =
  '* Smart hardware accessories like: 3-part soft close SS drawer channel, hydraulic soft close hinges & other necessary hardware.'

const BACK_WALL = `Back wall:
01.Framing: Supplying & Making Good Quality Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
02.Core Material: Supplying & Making of 12mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
03.Top Material: Supplying & Making of 12 mm CNC Cut Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood With Good Quality Docu Paint Or Charcoal Panel With golden finish metallic bit.
(Without supplying wiring & lighting)`

function dressingMaterials(input: {
  make: 'Hand Make' | 'Factory Make' | 'Factory Made'
  top: string
  shelfFixing: string
  withBackWall?: boolean
}) {
  return `Top Material: (${input.make})
${input.top}
Cabinet Material: (${input.make})
Supplying & Making of 18mm High Pressure laminated Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
*Shelfs are attached by ${input.shelfFixing}.
*Board will be laminated by automated pasting machine to factory.
* Edge will be covered by matched UV edging by Automated Machine In Factory.
${MIRROR_COMPOSITION}
${SMART_HARDWARE}
(Without supplying wiring & lighting)${input.withBackWall ? `\n${BACK_WALL}` : ''}`
}

export const DRESSING_TEMPLATE: QuotationTemplateDefinition = {
  key: 'dressing',
  name: 'Dressing',
  sourceDocument: 'Quotation Formate - Dressing .pdf',
  defaultTerms: DEFAULT_TERMS,
  sections: [
    { id: 'dressing-basic', name: 'Dressing Basic', sortOrder: 1 },
    { id: 'dressing-with-back-wall', name: 'Dressing With Back Wall', sortOrder: 2 },
  ],
  items: [
    {
      id: 'dressing-unit-hand-make-basic',
      sectionId: 'dressing-basic',
      serialNo: 1,
      description: 'Dressing Unit (Hand Make) Basic',
      materials: dressingMaterials({
        make: 'Hand Make',
        top: 'Factory Pasting Of Imported Premium Grade High Pressure Laminates.',
        shelfFixing: 'Metallic L Clam',
      }),
      unit: 'sqft',
      ...rangeRates(1450, 1550),
    },
    {
      id: 'dressing-unit-hand-make',
      sectionId: 'dressing-with-back-wall',
      serialNo: 2,
      description: 'Dressing Unit (Hand Make)',
      materials: dressingMaterials({
        make: 'Hand Make',
        top: 'Factory Pasting Of Imported Premium Grade High Pressure Laminates.',
        shelfFixing: 'Metallic L Clam',
        withBackWall: true,
      }),
      unit: 'sqft',
      ...fixedRates(1550),
    },
    {
      id: 'dressing-unit-factory-make-basic',
      sectionId: 'dressing-basic',
      serialNo: 3,
      description: 'Dressing Unit (Factory Make) Basic',
      materials: dressingMaterials({
        make: 'Factory Made',
        top: 'Factory Pasting Of Imported Premium Grade High Pressure Laminates.',
        shelfFixing: 'Metallic Housing Screw',
      }),
      unit: 'sqft',
      ...rangeRates(1600, 1650),
    },
    {
      id: 'dressing-unit-factory-make',
      sectionId: 'dressing-with-back-wall',
      serialNo: 4,
      description: 'Dressing Unit (Factory Make)',
      materials: dressingMaterials({
        make: 'Factory Make',
        top: 'Factory Pasting Of Imported Premium Grade High Pressure Laminates.',
        shelfFixing: 'Metallic Housing Screw',
        withBackWall: true,
      }),
      unit: 'sqft',
      ...rangeRates(1750, 1850),
    },
    {
      id: 'premium-acrylic-dressing-unit-factory-made',
      sectionId: 'dressing-with-back-wall',
      serialNo: 5,
      description: 'Premium Acrylic Dressing Unit (Factory Made)',
      materials: dressingMaterials({
        make: 'Factory Make',
        top: 'Factory Pasting of Imported Premium Acrylic Laminate.',
        shelfFixing: 'Metallic Housing Screw',
        withBackWall: true,
      }),
      unit: 'sqft',
      ...rangeRates(1850, 2050),
    },
  ],
}
