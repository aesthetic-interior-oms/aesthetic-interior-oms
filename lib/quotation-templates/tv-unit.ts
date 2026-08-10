import type { QuotationTemplateDefinition } from '@/lib/quotation-types'
import { rangeRates } from '@/lib/quotation-templates/helpers'

const DEFAULT_TERMS =
  'Quotation valid for 15 days. Rates are per sqft unless noted. Wiring and lighting are excluded unless specified. Payment: 50% advance, 40% on material delivery, 10% on completion.'

export const TV_UNIT_TEMPLATE: QuotationTemplateDefinition = {
  key: 'tv-unit',
  name: 'TV Unit',
  sourceDocument: 'Quotation Formate - TV Unit.pdf',
  defaultTerms: DEFAULT_TERMS,
  sections: [{ id: 'tv-paneling', name: 'TV Paneling', sortOrder: 1 }],
  items: [
    {
      id: 'tv-hplbasic-without-down-cabinet',
      sectionId: 'tv-paneling',
      serialNo: 1,
      description: 'TV Paneling (HPLBasic) Without Down Cabinet',
      materials: `Top Material: Hand Made)
Factory Pasting Of Imported Premium Grade High
Pressure Laminates.
Cabinet Material: (Hand Made)
Supplying & Making of 18mm High Pressure
laminated Architect Grade MR (Moisture Resistant)
Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic Housing Screw.
*Board will be laminated by automated pasting
machine to factory.
* Edge will be covered by matched UV edging by
Automated Machine In Factory.
Properties: Anti-Cracking, Water Resistant, Anti-
Alkalinity and Acidity and Self Clean.
(Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...rangeRates(1200, 1250),
    },
    {
      id: 'tv-hand-made',
      sectionId: 'tv-paneling',
      serialNo: 2,
      description: 'TV Paneling (Hand Made)',
      materials: `Top Material: (Hand Made)
Factory Pasting Of Imported Premium Grade High
Pressure Laminates.
Cabinet Material: (Hand Made)
Supplying & Making of 18mm High Pressure
laminated Architect Grade MR (Moisture Resistant)
Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic L Clam.
*Board will be laminated by automated pasting
machine to factory.
* Edge will be covered by matched UV edging by
Automated Machine In Factory.
Properties: Anti-Cracking, Water Resistant, Anti-
Alkalinity and Acidity and Self Clean.
(Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...rangeRates(1400, 1450),
    },
    {
      id: 'tv-hand-made-with-back-materials',
      sectionId: 'tv-paneling',
      serialNo: 3,
      description: 'TV Paneling (Hand Made) with Back Materials',
      materials: `Top Material: (Hand Made)
Factory Pasting Of Imported Premium Grade High
Pressure Laminates.
Cabinet Material: (Hand Made)
Supplying & Making of 18mm High Pressure
laminated Architect Grade MR (Moisture Resistant)
Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic L Clam.
*Board will be laminated by automated pasting
machine to factory.
* Edge will be covered by matched UV edging by
Automated Machine In Factory. 	Side Material:
01.Fareming: Good Quality Architect Grade MR
(Moisture Resistant) Highly Compressed Engineered
Wood.
02.Core Material: Supplying & Making of 12mm
Architect Grade MR (Moisture Resistant) Highly
Compressed Engineered Wood.
03.Top Material: Supplying & Making of 12 mm CNC
Cut Architect Grade MR (Moisture Resistant) Highly
Compressed Engineered Wood With Good Quality
Docu Paint Or Charcol Panel With finish metallic T bit.
Properties: Anti-Cracking, Water Resistant, Anti-
Alkalinity and Acidity and Self Clean.
Properties: Anti-Cracking, Water Resistant, Anti-
Alkalinity and Acidity and Self Clean.
(Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...rangeRates(1450, 1550),
    },
    {
      id: 'tv-factory-made',
      sectionId: 'tv-paneling',
      serialNo: 3,
      description: 'TV Paneling (Factory Made)',
      materials: `Top Material: (Factory Made)
Factory Pasting Of Imported Premium Grade High
Pressure Laminates.
Cabinet Material: (Factory Made)
Supplying & Making of 18mm High Pressure
laminated Architect Grade MR (Moisture Resistant)
Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic L Clam.
*Board will be laminated by automated pasting
machine to factory.
* Edge will be covered by matched UV edging by
Automated Machine In Factory. 	Side Material:
01.Fareming: Good Quality Architect Grade MR
(Moisture Resistant) Highly Compressed Engineered
Wood.
02.Core Material: Supplying & Making of 12mm
Architect Grade MR (Moisture Resistant) Highly
Compressed Engineered Wood.
03.Top Material: Supplying & Making of 12 mm CNC
Cut Architect Grade MR (Moisture Resistant) Highly
Compressed Engineered Wood With Good Quality
Docu Paint Or Charcol Panel With finish metallic T bit.
Properties: Anti-Cracking, Water Resistant, Anti-
Alkalinity and Acidity and Self Clean.
(Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...rangeRates(1650, 1750),
    },
    {
      id: 'tv-premium-acrylic-factory-made',
      sectionId: 'tv-paneling',
      serialNo: 4,
      description: 'Premium Acrylic TV Paneling (Factory Made)',
      materials: `Top Material: (Factory Made)
Factory Pasting Of Imported Premium Acrylic
Laminate with golden finish metallic bit Or with
finish metallic T bit.
Cabinet Material: (Factory Made)
Supplying & Making of 18mm High Pressure
laminated Architect Grade MR (Moisture Resistant)
Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic L Clam.
*Board will be laminated by automated pasting
machine to factory.
* Edge will be covered by matched UV edging by
Automated Machine In Factory. 	Side Material:
01.Fareming: Good Quality Architect Grade MR
(Moisture Resistant) Highly Compressed Engineered
Wood.
02.Core Material: Supplying & Making of 12mm
Architect Grade MR (Moisture Resistant) Highly
Compressed Engineered Wood.
03.Top Material: Supplying & Making of 12 mm CNC
Cut Architect Grade MR (Moisture Resistant) Highly
Compressed Engineered Wood With Good Quality
Docu Paint Or Charcol Panel With finish metallic T bit.
Properties: Anti-Cracking, Water Resistant, Anti-
Alkalinity and Acidity and Self Clean.
04.Back Materials :
01.Core material: Supplying & Making 6mm or 3 mm
Good Quality PVC Ply wood.
(Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...rangeRates(1750, 1850),
    },
  ],
}
