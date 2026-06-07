import type { QuotationTemplateDefinition } from '@/lib/quotation-types'
import { fixedRates, rangeRates } from '@/lib/quotation-templates/helpers'

const DEFAULT_TERMS =
  'Quotation valid for 15 days. Rates are per sqft unless noted. Marble, granite, wiring and lighting are excluded unless specified. Payment: 50% advance, 40% on material delivery, 10% on completion.'

const MIRROR_COMPOSITION =
  'Mirror composition: 12 mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood with 5 mm Belgium crystal mirror glass attached with highly dense silicon gum.'

const SMART_HARDWARE =
  '* Smart hardware accessories like: 3-part soft close SS drawer channel, hydraulic soft close hinges & other necessary hardware.'

function basinCabinetMaterials(make: 'Hand Made' | 'Factory Made', top: string, shelfFixing: string) {
  return `Top Material: (${make})
${top}
Cabinet Material: (${make})
Supplying & Making of 18mm Architect Grade MR (Moisture Resistant) Marine Ply.
*Shelfs are attached by ${shelfFixing}.
*Board will be laminated by automated pasting machine to factory.
* Edge will be covered by matched UV edging by Automated Machine In Factory.
${MIRROR_COMPOSITION}
${SMART_HARDWARE}
(Without Supplying Marble, Granite Or Wiring & Lighting)`
}

export const BASIN_CABINET_SHOWER_TEMPLATE: QuotationTemplateDefinition = {
  key: 'basin-cabinet-shower',
  name: 'Basin Cabinet With Shower In Closer',
  sourceDocument: 'Quotation Formate - Basin Cabinet With Shower In Closer .pdf',
  defaultTerms: DEFAULT_TERMS,
  sections: [
    { id: 'basin-cabinet', name: 'Basin Cabinet', sortOrder: 1 },
    { id: 'shower-in-closer', name: 'Shower In-closer', sortOrder: 2 },
  ],
  items: [
    {
      id: 'basin-cabinet-hand-made',
      sectionId: 'basin-cabinet',
      serialNo: 1,
      description: 'Basin Cabinet (Hand Made)',
      materials: basinCabinetMaterials(
        'Hand Made',
        'Factory Pasting Of Imported Premium Grade High Pressure Laminates.',
        'Metallic L Clam',
      ),
      unit: 'sqft',
      ...rangeRates(1750, 1850),
    },
    {
      id: 'basin-cabinet-factory-made',
      sectionId: 'basin-cabinet',
      serialNo: 2,
      description: 'Basin Cabinet (Factory Made)',
      materials: basinCabinetMaterials(
        'Factory Made',
        'Factory Pasting Of Imported Premium Grade High Pressure Laminates.',
        'Metallic Housing Screw',
      ),
      unit: 'sqft',
      ...rangeRates(2100, 2150),
    },
    {
      id: 'premium-acrylic-basin-cabinet-factory-made',
      sectionId: 'basin-cabinet',
      serialNo: 3,
      description: 'Premium Acrylic Basin Cabinet (Factory Made)',
      materials: basinCabinetMaterials(
        'Factory Made',
        'Factory Pasting Of Imported Premium Acrylic Laminate.',
        'Metallic Housing Screw',
      ),
      unit: 'sqft',
      ...rangeRates(2250, 2450),
    },
    {
      id: 'shower-in-closer',
      sectionId: 'shower-in-closer',
      serialNo: 4,
      description: 'Shower In-closer',
      materials:
        'Supplying & Making 2 mm Imported SS U Chanel and 10 mm Tempered Glass with air tight technology & other hardware accessories, all complete as per design.',
      unit: 'sqft',
      ...fixedRates(1500),
    },
  ],
}
