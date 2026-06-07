import type { QuotationTemplateDefinition } from '@/lib/quotation-types'
import { fixedRates, rangeRates } from '@/lib/quotation-templates/helpers'

const DEFAULT_TERMS =
  'Quotation valid for 15 days. Rates are per sqft unless noted. Wiring and lighting are excluded unless specified. Payment: 50% advance, 40% on material delivery, 10% on completion.'

const SMART_HARDWARE =
  '* Smart hardware accessories like: 3-part soft close SS drawer channel, hydraulic soft close hinges & other necessary hardware.'

function kitchenMaterials(make: 'Hand Made' | 'Factory Made', shelfFixing: string, profileDoor = false) {
  const door = profileDoor
    ? `Profile Glass Door Material: (Factory Made)
01.Imported Black profile glass Frame.
02.Imported 5mm Lacquered Glass Or White Glass.
03.Hidden Profile Light.
04.Automated sensor system.
05.Hydraulic soft close hinges.
`
    : ''

  return `${door}Top Material: (${make})
Factory Pasting Of Imported Premium Grade High Pressure Laminates Or Acrylic Laminates.
Lower Cabinet Material: (${make})
Supplying & Making of 18mm Architect Grade MR (Moisture Resistant) Marine Ply.
Upper Cabinet Material: (${make})
Supplying & Making of 18mm High Pressure laminated Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
*Shelfs are attached by ${shelfFixing}.
*Board will be laminated by automated pasting machine to factory.
* Edge will be covered by matched UV edging by Automated Machine In Factory.
${SMART_HARDWARE}
(Without supplying wiring & lighting)`
}

export const KITCHEN_CABINET_TEMPLATE: QuotationTemplateDefinition = {
  key: 'kitchen-cabinet',
  name: 'Kitchen Cabinet',
  sourceDocument: 'Quotation Formate - Kitchen Cabinet.pdf',
  defaultTerms: DEFAULT_TERMS,
  sections: [
    { id: 'hpl-cabinet', name: 'HPL Cabinet', sortOrder: 1 },
    { id: 'acrylic-cabinet', name: 'Acrylic Cabinet', sortOrder: 2 },
    { id: 'profile-glass', name: 'Profile Glass Door', sortOrder: 3 },
  ],
  items: [
    {
      id: 'kitchen-hpl-cabinet-hand-made',
      sectionId: 'hpl-cabinet',
      serialNo: 1,
      description: 'Kitchen High Pressure Laminate (HPL) Cabinet (Hand Made)',
      materials: kitchenMaterials('Hand Made', 'Metallic L Clam'),
      unit: 'sqft',
      ...fixedRates(2250),
    },
    {
      id: 'kitchen-hpl-cabinet-factory-made',
      sectionId: 'hpl-cabinet',
      serialNo: 2,
      description: 'Kitchen High Pressure Laminate (HPL) Cabinet (Factory Made)',
      materials: kitchenMaterials('Factory Made', 'Metallic Housing Screw'),
      unit: 'sqft',
      ...rangeRates(2550, 2850),
    },
    {
      id: 'kitchen-premium-acrylic-laminate-cabinet',
      sectionId: 'acrylic-cabinet',
      serialNo: 3,
      description: 'Kitchen Premium Acrylic Laminate Cabinet (Factory Made)',
      materials: kitchenMaterials('Factory Made', 'Metallic Housing Screw'),
      unit: 'sqft',
      ...rangeRates(2750, 3000),
    },
    {
      id: 'kitchen-imported-auto-sensor-profile-glass-door',
      sectionId: 'profile-glass',
      serialNo: 4,
      description: 'Kitchen Imported Auto Sensor Profile Glass Door',
      materials: kitchenMaterials('Factory Made', 'Metallic Housing Screw', true),
      unit: 'sqft',
      ...rangeRates(3000, 3600),
    },
  ],
}
