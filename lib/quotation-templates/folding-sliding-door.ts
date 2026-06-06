import type { QuotationTemplateDefinition } from '@/lib/quotation-types'
import { fixedRates } from '@/lib/quotation-templates/helpers'

const DEFAULT_TERMS =
  'Quotation valid for 15 days. Rates are per sqft unless noted. Work as per approved design and architect instruction. Payment: 50% advance, 40% on material delivery, 10% on completion.'

const EDF_DOOR_MATERIALS = `Supply, Fabrication, erection and
installation of 45° Corner Joint Single
Glazed Bi- Folding Door Work Solution. All
complete including labor charge. Work
Should be done as per design and
Architect instruction: Material
Specification Aluminum Profile: ➢
Aluminum Surface / Color Treatment:
Powder Coating. ➢ Aluminum Profile
Outer and Shutter Section Size: ➢ Outer
Top: 71.50X74X2mm ➢ Outer Bottom:
64X32X2mm ➢ Outer Side: 71X52.50.5X1.
5mm ➢ Shutter: 50X76.80X1.5mm ➢
Shutter Bit: 30.30X21.05X1mm ➢
Aluminum Brand: EDF (Altech) Glass: ❖
SGU: 5mm Clear Glass. ❖ Tempered: Non-
Tempered. ❖ Brand: Nasir/PHP. Hardware
& Accessories: ➢ Lock. ➢ EPDM Roller. ➢
Lock Nose ➢ Locking Plate ➢ Shutter
Bumper ➢ Steel Corner for Glass Shutter
and others standard Accessories. Other
Materials: ➢ Screw (Making, Fittings): All
Screws will be SS, Screw (Installation):
Royal Bolt ➢ Brand: Best Quality.`

const EDF_SLIDING_DOOR_MATERIALS = `Supply, Fabrication, erection and
installation of Single Glazed Bi- Sliding
Door work Solution. All complete including
labor charge. Work Should be done as per
design and Architect instruction: Material
Specification Aluminum Profile: ➢
Aluminum Surface / Color Treatment:
Powder Coating. ➢ Aluminum Profile
Outer and Shutter Section Size: ➢ Outer
Top: 71.50X74X2mm ➢ Outer Bottom:
64X32X2mm ➢ Outer Side: 71X52.50.5X1.
5mm ➢ Shutter: 50X76.80X1.5mm ➢
Shutter Bit: 30.30X21.05X1mm ➢
Aluminum Brand: EDF (Altech) Glass: ❖
SGU: 5mm Clear Glass. ❖ Tempered: Non-
Tempered. ❖ Brand: Nasir/PHP. Hardware
& Accessories: ➢ Lock. ➢ EPDM Roller. ➢
Lock Nose ➢ Locking Plate ➢ Shutter
Bumper ➢ Steel Corner for Glass Shutter
and others standard Accessories. Other
Materials: ➢ Screw (Making, Fittings): All
Screws will be SS, Screw (Installation):
Royal Bolt ➢ Brand: Best Quality.`

export const FOLDING_SLIDING_DOOR_TEMPLATE: QuotationTemplateDefinition = {
  key: 'folding-sliding-door',
  name: 'Folding & Sliding Door',
  sourceDocument: 'Quotation Formate - Folding With Sliding Door.pdf',
  defaultTerms: DEFAULT_TERMS,
  sections: [
    { id: 'folding-door', name: 'Folding Door', sortOrder: 1 },
    { id: 'sliding-door', name: 'Sliding Door', sortOrder: 2 },
  ],
  items: [
    {
      id: 'edf-euro-folding-door',
      sectionId: 'folding-door',
      serialNo: 1,
      description: 'Imported EDF Euro Model Folding Door.',
      materials: EDF_DOOR_MATERIALS,
      unit: 'sqft',
      ...fixedRates(2500),
    },
    {
      id: 'edf-euro-sliding-door',
      sectionId: 'sliding-door',
      serialNo: 2,
      description: 'Imported EDF Euro Model Sliding Door.',
      materials: EDF_SLIDING_DOOR_MATERIALS,
      unit: 'sqft',
      ...fixedRates(2500),
    },
    {
      id: 'narrow-bezel-sliding-door',
      sectionId: 'sliding-door',
      description: 'narrow bezel sliding door',
      materials: `Imported narrow bezel sliding door
fabricated with premium-grade
aluminum profile featuring a slim,
modern frame design. Fitted with high-
quality tempered glass and advanced
sliding roller mechanism for smooth
and silent operation. The door is
finished with durable anodized or
powder-coated surface, ensuring long-
lasting performance and elegant
appearance. Ideal for residential and
commercial interiors such as living
areas, and partitions. Complete
installation includes track alignment,
hardware fixing, and finishing.`,
      unit: 'sqft',
      ...fixedRates(3500),
    },
    {
      id: 'narrow-bezel-sliding-door-luxury',
      sectionId: 'sliding-door',
      description: 'Imported Narrow Bezel Sliding Door – Luxury',
      materials: `Description
Imported luxury narrow bezel sliding
door crafted with ultra-slim premium
aluminum profile, designed to deliver a
sleek, minimalist, and contemporary
aesthetic. Integrated with high-quality
tempered/laminated glass and
advanced soft-glide sliding mechanism
for smooth, silent, and effortless
operation. Finished with superior
anodized or powder-coated treatment
for enhanced durability, scratch
resistance, and long-lasting elegance.
Ideal for upscale residential and
commercial interiors including living
spaces, master bedrooms, executive
offices, and luxury partitions. Complete
installation with precision alignment,
premium hardware fittings, and
flawless finishing ensures a refined and
sophisticated appearance.`,
      unit: 'sqft',
      ...fixedRates(4200),
    },
  ],
}
