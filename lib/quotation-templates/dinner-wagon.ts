import type { QuotationTemplateDefinition } from '@/lib/quotation-types'
import { rangeRates } from '@/lib/quotation-templates/helpers'

const DEFAULT_TERMS =
  'Quotation valid for 15 days. Rates are per sqft unless noted. Wiring and lighting are excluded unless specified. Payment: 50% advance, 40% on material delivery, 10% on completion.'

const HPL_HAND_MADE_MATERIALS = `Top Material: (Hand Made)
Factory Pasting Of Imported Premium Grade High Pressure Laminates.
Cabinet Material: (Hand Made)
Supplying & Making of 18mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic L Clam.
*Board will be laminated by automated pasting machine to factory.
* Edge will be covered by matched UV edging by Automated Machine In Factory.
* Smart hardware accessories like: 3-part soft close SS drawer channel, hydraulic soft close hinges & other necessary hardware.
(Without supplying wiring & lighting)`

const HPL_FACTORY_MADE_MATERIALS = `Top Material: (Factory Made)
Factory Pasting Of Imported Premium Grade High Pressure Laminates.
Cabinet Material: (Factory Made)
Supplying & Making of 18mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic Housing Screw.
*Board will be laminated by automated pasting machine to factory.
* Edge will be covered by matched UV edging by Automated Machine In Factory.
* Smart hardware accessories like: 3-part soft close SS drawer channel, hydraulic soft close hinges & other necessary hardware.
(Without supplying wiring & lighting)`

const PROFILE_GLASS_DOOR_HAND_MADE = `Door Material: (Hand Made)
01.Imported Black profile glass Frame.
02.Imported 5mm Lacquered Glass or White Glass.
03.Hidden Profile Light.
04.Automated sensor system.
05.Hydraulic soft close hinges.
${HPL_HAND_MADE_MATERIALS}`

const PROFILE_GLASS_DOOR_FACTORY_MADE = `Door Material: (Factory Made)
01.Imported Black profile glass Frame.
02.Imported 5mm Lacquered Glass or White Glass.
03.Hidden Profile Light.
04.Automated sensor system.
05.Hydraulic soft close hinges.
${HPL_FACTORY_MADE_MATERIALS}`

const ACRYLIC_FACTORY_MADE = `Door Material: (Factory Made)
01.Imported Black profile glass Frame.
02.Imported 5mm Lacquered Glass or White Glass.
03.Hidden Profile Light.
04.Automated sensor system.
05.Hydraulic soft close hinges.
Top Material: (Factory Made)
Factory Pasting of Imported Premium Acrylic laminate.
Cabinet Material: (Factory Made)
Supplying & Making of 18 mm High Pressure laminated Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
*Shelfs are attached by Metallic Housing Screw.
*Board will be laminated by automated pasting machine to factory.
* Edge will be covered by matched UV edging by Automated Machine In Factory.
* Smart hardware accessories like: 3-part soft close SS drawer channel, hydraulic soft close hinges & other necessary hardware.
(Without supplying wiring & lighting)`

export const DINNER_WAGON_TEMPLATE: QuotationTemplateDefinition = {
  key: 'dinner-wagon',
  name: 'Dinner Wagon',
  sourceDocument: 'Quotation Formate - Dinner Wagon.pdf',
  defaultTerms: DEFAULT_TERMS,
  sections: [
    { id: 'hpl-cabinet', name: 'HPL Cabinet', sortOrder: 1 },
    { id: 'profile-glass', name: 'Profile Glass Door', sortOrder: 2 },
    { id: 'acrylic', name: 'Acrylic', sortOrder: 3 },
  ],
  items: [
    {
      id: 'dinner-wagon-hpl-cabinet-hand-made',
      sectionId: 'hpl-cabinet',
      serialNo: 1,
      description: 'Dinner Wagon HPL Cabinet (Hand Made)',
      materials: HPL_HAND_MADE_MATERIALS,
      unit: 'sqft',
      ...rangeRates(2450, 2550),
    },
    {
      id: 'dinner-wagon-hpl-cabinet-factory-made',
      sectionId: 'hpl-cabinet',
      serialNo: 2,
      description: 'Dinner Wagon HPL Cabinet (Factory Made)',
      materials: HPL_FACTORY_MADE_MATERIALS,
      unit: 'sqft',
      ...rangeRates(2650, 2750),
    },
    {
      id: 'dinner-wagon-profile-glass-door-hand-made',
      sectionId: 'profile-glass',
      serialNo: 3,
      description: 'Dinner Wagon: Imported Profile Glass Door Cabinet (Hand Made)',
      materials: PROFILE_GLASS_DOOR_HAND_MADE,
      unit: 'sqft',
      ...rangeRates(2650, 2750),
    },
    {
      id: 'dinner-wagon-auto-sensor-profile-glass-fridge-factory',
      sectionId: 'profile-glass',
      serialNo: 4,
      description: 'Dinner Wagon: Imported Auto Sensor Profile Glass Door Cabinet with Fridge Cabinet (Factory Made)',
      materials: PROFILE_GLASS_DOOR_FACTORY_MADE,
      unit: 'sqft',
      ...rangeRates(2850, 3050),
    },
    {
      id: 'dinner-wagon-auto-sensor-profile-glass-factory',
      sectionId: 'profile-glass',
      serialNo: 5,
      description: 'Dinner Wagon: Imported Auto Sensor Profile Glass Door Cabinet (Factory Made)',
      materials: PROFILE_GLASS_DOOR_FACTORY_MADE,
      unit: 'sqft',
      ...rangeRates(3200, 3500),
    },
    {
      id: 'dinner-wagon-acrylic',
      sectionId: 'acrylic',
      serialNo: 6,
      description: 'Dinner Wagon (Acrylic)',
      materials: ACRYLIC_FACTORY_MADE,
      unit: 'sqft',
      ...rangeRates(2850, 3000),
    },
    {
      id: 'imported-auto-sensor-profile-glass-dinner-wagon-acrylic',
      sectionId: 'acrylic',
      serialNo: 7,
      description: 'Imported Auto Sensor Profile Glass Door Dinner Wagon (Acrylic)',
      materials: ACRYLIC_FACTORY_MADE,
      unit: 'sqft',
      ...rangeRates(3450, 4500),
    },
  ],
}
