import type { QuotationTemplateDefinition } from '@/lib/quotation-types'
import { rangeRates } from '@/lib/quotation-templates/helpers'

const DEFAULT_TERMS =
  'Quotation valid for 15 days. Rates are per sqft unless noted. Wiring and lighting are excluded unless specified. Payment: 50% advance, 40% on material delivery, 10% on completion.'

const SMART_HARDWARE =
  '* Smart hardware accessories like: 3-part soft close SS drawer channel, hydraulic soft close hinges & other necessary hardware.'

function studyMaterials(make: 'Hand Made' | 'Factory Made', top: string, shelfFixing: string) {
  return `Top Material: (${make})
${top}
Cabinet Material: (${make})
Supplying & Making of 18mm High Pressure laminated Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
*Shelfs are attached by ${shelfFixing}.
*Board will be laminated by automated pasting machine to factory.
* Edge will be covered by matched UV edging by Automated Machine In Factory.
${SMART_HARDWARE}
(Without supplying wiring & lighting)`
}

export const STUDY_TABLE_TEMPLATE: QuotationTemplateDefinition = {
  key: 'study-table',
  name: 'Study Table',
  sourceDocument: 'Quotation Formate - Study Table.pdf',
  defaultTerms: DEFAULT_TERMS,
  sections: [{ id: 'study-table', name: 'Study Table', sortOrder: 1 }],
  items: [
    {
      id: 'study-table-hand-made-basic',
      sectionId: 'study-table',
      serialNo: 1,
      description: 'Study Table (Hand Made) Basic',
      materials: studyMaterials(
        'Hand Made',
        'Factory Pasting Of Imported Premium Grade High Pressure Laminates.',
        'Metallic L Clam',
      ),
      unit: 'sqft',
      ...rangeRates(1450, 1550),
    },
    {
      id: 'study-table-hand-made',
      sectionId: 'study-table',
      serialNo: 2,
      description: 'Study Table (Hand Made)',
      materials: studyMaterials(
        'Hand Made',
        'Factory Pasting Of Imported Premium Grade High Pressure Laminates.',
        'Metallic L Clam',
      ),
      unit: 'sqft',
      ...rangeRates(1550, 1650),
    },
    {
      id: 'study-table-factory-made',
      sectionId: 'study-table',
      serialNo: 3,
      description: 'Study Table (Factory Made)',
      materials: studyMaterials(
        'Factory Made',
        'Factory Pasting Of Imported Premium Grade High Pressure Laminates.',
        'Metallic Housing Screw',
      ),
      unit: 'sqft',
      ...rangeRates(1850, 2050),
    },
    {
      id: 'premium-acrylic-study-table-factory-made',
      sectionId: 'study-table',
      serialNo: 4,
      description: 'Premium Acrylic Study Table (Factory Made)',
      materials: studyMaterials(
        'Factory Made',
        'Factory Pasting of Imported Premium Acrylic Laminate.',
        'Metallic Housing Screw',
      ),
      unit: 'sqft',
      ...rangeRates(2050, 2250),
    },
  ],
}
