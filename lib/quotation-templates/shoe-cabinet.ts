import type { QuotationTemplateDefinition } from '@/lib/quotation-types'
import { rangeRates } from '@/lib/quotation-templates/helpers'

const DEFAULT_TERMS =
  'Quotation valid for 15 days. Rates are per sqft unless noted. Wiring and lighting are excluded unless specified. Payment: 50% advance, 40% on material delivery, 10% on completion.'

const FACTORY_PASTED_EDGE =
  '*Board will be laminated by automated pasting machine to factory. * Edge will be covered by matched UV edging by Automated Machine In Factory.'

const SMART_HARDWARE =
  '* Smart hardware accessories like: Hydraulic soft close hinges & other necessary hardware. (Without supplying wiring & lighting)'

export const SHOE_CABINET_TEMPLATE: QuotationTemplateDefinition = {
  key: 'shoe-cabinet',
  name: 'Shoe Cabinet',
  sourceDocument: 'Quotation Formate - Shoe Cabinet .pdf',
  defaultTerms: DEFAULT_TERMS,
  sections: [
    { id: 'shoe-rack', name: 'Shoe Rack', sortOrder: 1 },
    { id: 'shoe-rack-seater', name: 'Shoe Rack with Seater', sortOrder: 2 },
  ],
  items: [
    {
      id: 'shoe-rack-basic',
      sectionId: 'shoe-rack',
      serialNo: 1,
      description: 'Shoe Rack (Basic)',
      materials: `Top Material: Factory Pasting of Imported Premium Grade High Pressure Laminates.
Cabinet Material: Supplying & Making of 18 mm High Pressure laminated Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic Housing Screw.
${FACTORY_PASTED_EDGE}
${SMART_HARDWARE}`,
      unit: 'sqft',
      ...rangeRates(1700, 1750),
    },
    {
      id: 'shoe-rack-with-sitter-hand-made',
      sectionId: 'shoe-rack-seater',
      serialNo: 2,
      description: 'Shoe Rack With Sitter (Hand Made)',
      materials: `Top Material: (Hand Made) Factory Pasting of Imported Premium Grade High Pressure Laminates.
Cabinet Material: (Hand Made) Supplying & Making of 18 mm High Pressure laminated Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic Housing Screw.
${FACTORY_PASTED_EDGE}
Seater:
01.Inner Material: 18 mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
02.Top Materials: Good Quality Foam In Country & covered by Imported Leather or Fabrics (Made In Indonesia).
*Related All Accessories fixing, carrying and lifting charge.
${SMART_HARDWARE}`,
      unit: 'sqft',
      ...rangeRates(1750, 1850),
    },
    {
      id: 'shoe-rack-with-seater-factory-made',
      sectionId: 'shoe-rack-seater',
      serialNo: 3,
      description: 'Shoe Rack With Seater (Factory Made)',
      materials: `Top Material: (Factory Made) Factory Pasting of Imported Premium Grade High Pressure Laminates.
Cabinet Material: (Factory Made) Supplying & Making of 18 mm High Pressure laminated Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic Housing Screw.
${FACTORY_PASTED_EDGE}
Seater:
01.Core Material: 18 mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
02.Top Materials: Good Quality Foam In Country & covered by Imported Leather or Fabrics (Made In Indonesia).
*Related All Accessories fixing, carrying and lifting charge.
${SMART_HARDWARE}`,
      unit: 'sqft',
      ...rangeRates(2100, 2250),
    },
    {
      id: 'premium-acrylic-shoe-box-factory-made',
      sectionId: 'shoe-rack-seater',
      serialNo: 4,
      description: 'Premium Acrylic Shoe Box (Factory Made)',
      materials: `Top Material: (Factory Made) Factory Pasting of Imported Premium Acrylic Laminate.
Cabinet Material: (Factory Made) Supplying & Making of 18 mm High Pressure laminated Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic Housing Screw.
${FACTORY_PASTED_EDGE}
Seater:
01.Core Material: 18 mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
02.Top Materials: Good Quality Foam In Country & covered by Imported Leather or Fabrics (Made In Indonesia).
*Related All Accessories fixing, carrying and lifting charge.
${SMART_HARDWARE}`,
      unit: 'sqft',
      ...rangeRates(2350, 2450),
    },
    {
      id: 'shoe-rack-with-sitter-docu-paint',
      sectionId: 'shoe-rack-seater',
      serialNo: 5,
      description: 'Shoe Rack With Sitter (Docu Paint)',
      materials: `Top Material: Supplying & Making of 18 mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood With Good Quality Docu Paint.
Cabinet Material: Supplying & Making of 18 mm High Pressure laminated Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic Housing Screw.
${FACTORY_PASTED_EDGE}
Seater:
01.Inner Material: 18 mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
02.Top Materials: Good Quality Foam In Country & covered by Imported Leather or Fabrics (Made In Indonesia).
*Related All Accessories fixing, carrying and lifting charge.
${SMART_HARDWARE}`,
      unit: 'sqft',
      ...rangeRates(2100, 2250),
    },
  ],
}
