import type { QuotationTemplateDefinition } from '@/lib/quotation-types'
import { onRequestRates, rangeRates } from '@/lib/quotation-templates/helpers'

const DEFAULT_TERMS =
  'Quotation valid for 15 days. Rates are per sqft unless noted. Wiring and lighting are excluded unless specified. Payment: 50% advance, 40% on material delivery, 10% on completion.'

const SMART_HARDWARE =
  '* Smart hardware accessories like: 3-part soft close SS drawer channel, hydraulic soft close hinges & other necessary hardware.'

function closetCabinetMaterials(input: {
  make: 'Hand Made' | 'Factory Made'
  top: string
  shelfFixing: string
  profileDoor?: boolean
}) {
  const door = input.profileDoor
    ? `Door Material: (Factory Made)
01.Imported Black profile glass Frame.
02.Imported 5mm Lacquered Glass Or White Glass.
03.Hidden Profile Light.
04.Automated sensor system.
05.Hydraulic soft close hinges.
`
    : ''

  return `${door}Top Material: (${input.make})
${input.top}
Cabinet Material: (${input.make})
Supplying & Making of 18mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
*Shelfs are attached by ${input.shelfFixing}.
*Board will be laminated by automated pasting machine to factory.
* Edge will be covered by matched UV edging by Automated Machine In Factory.
${SMART_HARDWARE}
(Without supplying wiring & lighting)`
}

export const CLOSET_TEMPLATE: QuotationTemplateDefinition = {
  key: 'closet',
  name: 'Closet',
  sourceDocument: 'Quotation Formate - Closet.pdf',
  defaultTerms: DEFAULT_TERMS,
  sections: [
    { id: 'closet-cabinet', name: 'Closet Cabinet', sortOrder: 1 },
    { id: 'profile-glass', name: 'Profile Glass Door', sortOrder: 2 },
    { id: 'closet-frame', name: 'Closet Frame', sortOrder: 3 },
  ],
  items: [
    {
      id: 'closet-hpl-cabinet-hand-made',
      sectionId: 'closet-cabinet',
      serialNo: 1,
      description: 'HPL Cabinet (Hand Made)',
      materials: closetCabinetMaterials({
        make: 'Hand Made',
        top: 'Factory Pasting Of Imported Premium Grade Fluted High Pressure Laminates.',
        shelfFixing: 'Metallic L Clam',
      }),
      unit: 'sqft',
      ...rangeRates(2250, 2450),
    },
    {
      id: 'closet-hpl-cabinet-factory-made',
      sectionId: 'closet-cabinet',
      serialNo: 2,
      description: 'HPL Cabinet (Factory Made)',
      materials: closetCabinetMaterials({
        make: 'Factory Made',
        top: 'Factory Pasting Of Imported Premium Grade Fluted High Pressure Laminates.',
        shelfFixing: 'Metallic Housing Screw',
      }),
      unit: 'sqft',
      ...rangeRates(2500, 2850),
    },
    {
      id: 'closet-plain-docu-cabinet',
      sectionId: 'closet-cabinet',
      serialNo: 3,
      description: 'Plain Docu Cabinet',
      materials: closetCabinetMaterials({
        make: 'Hand Made',
        top: 'Supplying & Making of 18 mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood With Good Quality Docu Paint.',
        shelfFixing: 'Metallic L Clam',
      }),
      unit: 'sqft',
      ...rangeRates(2250, 2450),
    },
    {
      id: 'closet-cnc-cut-docu-cabinet',
      sectionId: 'closet-cabinet',
      serialNo: 4,
      description: 'CNC Cut Docu Cabinet',
      materials: closetCabinetMaterials({
        make: 'Hand Made',
        top: 'Supplying & Making of 18 mm CNC Cut Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood With Good Quality Docu Paint.',
        shelfFixing: 'Metallic L Clam',
      }),
      unit: 'sqft',
      ...rangeRates(2450, 2550),
    },
    {
      id: 'closet-premium-acrylic-cabinet-factory-made',
      sectionId: 'closet-cabinet',
      serialNo: 5,
      description: 'Premium Acrylic Cabinet (Factory Made)',
      materials: closetCabinetMaterials({
        make: 'Factory Made',
        top: 'Factory Pasting of Imported Premium Acrylic Laminate.',
        shelfFixing: 'Metallic Housing Screw',
      }),
      unit: 'sqft',
      ...rangeRates(2650, 2850),
    },
    {
      id: 'closet-imported-profile-glass-door-cabinet',
      sectionId: 'profile-glass',
      serialNo: 6,
      description: 'Imported Profile Glass Door Cabinet (Factory Made)',
      materials: closetCabinetMaterials({
        make: 'Factory Made',
        top: 'Factory Pasting Of Imported Premium Grade Fluted High Pressure Laminates.',
        shelfFixing: 'Metallic Housing Screw',
        profileDoor: true,
      }),
      unit: 'sqft',
      ...rangeRates(3000, 3200),
    },
    {
      id: 'closet-imported-auto-sensor-profile-glass-door-cabinet',
      sectionId: 'profile-glass',
      serialNo: 7,
      description: 'Imported Auto Sensor Profile Glass Door Cabinet (Factory Made)',
      materials: closetCabinetMaterials({
        make: 'Factory Made',
        top: 'Factory Pasting Of Imported Premium Grade Fluted High Pressure Laminates.',
        shelfFixing: 'Metallic Housing Screw',
        profileDoor: true,
      }),
      unit: 'sqft',
      ...rangeRates(3450, 3650),
    },
    {
      id: 'closet-imported-auto-sensor-premium-profile-glass-door-cabinet',
      sectionId: 'profile-glass',
      serialNo: 8,
      description: 'Imported Auto Sensor Premium Profile Glass Door Cabinet (Factory Made)',
      materials: closetCabinetMaterials({
        make: 'Factory Made',
        top: 'Factory Pasting Of Imported Premium Grade Fluted High Pressure Laminates.',
        shelfFixing: 'Metallic Housing Screw',
        profileDoor: true,
      }),
      unit: 'sqft',
      ...rangeRates(4200, 4500),
    },
    {
      id: 'champagne-gold-glass-closet-frame',
      sectionId: 'closet-frame',
      description: 'Champagne Gold Colour Glass Closet Frame',
      materials: `Supply and installation of premium quality aluminum sliding closet system.
Frame finish in Champagne Gold color (powder coated / anodized finish).
5mm-6mm tempered glass panel (clear / tinted bronze / frosted as per approved sample).
Heavy-duty top & bottom sliding track system.
Soft-closing roller mechanism where applicable.
Slim profile frame design for modern aesthetic appearance.
Complete alignment, leveling and finishing as per site condition.
Material Specification:
Aluminum section thickness: 1.2mm-1.6mm minimum.
Glass: Tempered safety glass for durability and safety compliance.
Finish: Scratch-resistant and corrosion-resistant coating.
Hardware: Premium quality handle, stopper and locking system.`,
      unit: 'sqft',
      ...onRequestRates(),
    },
  ],
}
