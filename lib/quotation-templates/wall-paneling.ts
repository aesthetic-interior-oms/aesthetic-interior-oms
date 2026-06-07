import type { QuotationTemplateDefinition } from '@/lib/quotation-types'
import { fixedRates, onRequestRates, rangeRates } from '@/lib/quotation-templates/helpers'

const DEFAULT_TERMS =
  'Quotation valid for 15 days. Rates are per sqft unless noted. Wiring and lighting are excluded unless specified. Payment: 50% advance, 40% on material delivery, 10% on completion.'

const WALL_COMMON_PROPERTIES =
  'Properties: Anti-Cracking, Water Resistant, Anti-Alkalinity and Acidity and Easy To Clean. (Without supplying wiring & lighting)'

const ARCHITECT_WOOD_FRAMING =
  '01.Framing: Good Quality Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood Framing.'

export const WALL_PANELING_TEMPLATE: QuotationTemplateDefinition = {
  key: 'wall-paneling',
  name: 'Wall Paneling',
  sourceDocument: 'Quotation Formate - Wall Paneling  (1).pdf',
  defaultTerms: DEFAULT_TERMS,
  sections: [
    { id: 'molding', name: 'Wall Molding', sortOrder: 1 },
    { id: 'paneling', name: 'Wall Paneling', sortOrder: 2 },
    { id: 'paint-texture', name: 'Paint & Texture', sortOrder: 3 },
    { id: 'glass-mirror', name: 'Glass & Mirror', sortOrder: 4 },
    { id: 'feature-finish', name: 'Feature Finish', sortOrder: 5 },
  ],
  items: [
    {
      id: 'wall-molding-basic',
      sectionId: 'molding',
      serialNo: 1,
      description: 'Wall Molding (Basic)',
      materials: `01.Core material: Supplying & Making Good Quality PVC Bit.
02.Molding Paint: Good Quality Docu Paint.
03.Wall Paint: Berger or luxury paint.
(Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...fixedRates(750),
    },
    {
      id: 'wall-molding',
      sectionId: 'molding',
      serialNo: 2,
      description: 'Wall Molding',
      materials: `01.Core material: Supplying & Making Good Quality PVC Bit.
02.Back wall material: Supplying & Making 3 mm Good Quality PVC.
03.Molding Paint: Good Quality luxury paint.
04.Wall Paint: Berger or luxury paint.
(Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...fixedRates(850),
    },
    {
      id: 'wall-paneling-louver',
      sectionId: 'paneling',
      serialNo: 3,
      description: 'Wall Paneling (Louver)',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core Material: Supplying & Making of 12mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
03.Top Material: Supplying & Making of 12 mm CNC Cut Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood With Good Quality Docu Paint Or Charcoal Panel.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...rangeRates(1300, 1350),
    },
    {
      id: 'three-d-wall-paneling',
      sectionId: 'paneling',
      serialNo: 4,
      description: '3D Wall Paneling',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core material: Supplying & Making 18 mm Good Quality Medium Density Fiber Wood.
03.Top Material: Making 18 mm Good Quality Laser 3D Cut Medium Density Fiber Wood With As Per Design.
04.Paint: Imported Good Quality Docu Paint.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...rangeRates(1350, 1450),
    },
    {
      id: 'wall-paneling-hpl',
      sectionId: 'paneling',
      serialNo: 5,
      description: 'Wall Paneling (HPL)',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core Material: Supplying & Making of 12mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
03.Top Material: Factory Pasting Of Imported Premium Grade High Pressure Laminates. Board will be laminated by automated pasting machine to factory. Edge will be covered by matched UV edging by Automated Machine In Factory.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...rangeRates(1200, 1250),
    },
    {
      id: 'premium-wall-paneling',
      sectionId: 'paneling',
      serialNo: 6,
      description: 'Premium Wall Paneling',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core Material: Supplying & Making of 12mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
03.Top Material: Factory Pasting Of Imported Premium Grade High Pressure Laminates with golden finish metallic bit. Board will be laminated by automated pasting machine to factory. Edge will be covered by matched UV edging by Automated Machine In Factory.
04.Back Materials: Supplying & Making 6mm or 3 mm Good Quality PVC Ply wood.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...rangeRates(1450, 1550),
    },
    {
      id: 'premium-acrylic-wall-paneling',
      sectionId: 'paneling',
      serialNo: 7,
      description: 'Premium Acrylic Wall Paneling',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core Material: Supplying & Making of 12mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
03.Top Material: Factory Pasting Of Imported Premium Acrylic Laminate with golden finish metallic bit or finish metallic T bit. Board will be laminated by automated pasting machine to factory. Edge will be covered by matched UV edging by Automated Machine In Factory.
04.Back Materials: Supplying & Making 6mm or 3 mm Good Quality PVC Ply wood.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...rangeRates(1400, 1650),
    },
    {
      id: 'fair-face-wall',
      sectionId: 'paint-texture',
      serialNo: 8,
      description: 'Fair Face Wall',
      materials: `01.Wall Paint: 3 Layer of Imported Fair Face Paint Is Applied.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...rangeRates(260, 280),
    },
    {
      id: 'wall-mask',
      sectionId: 'paint-texture',
      serialNo: 9,
      description: 'Wall Mask',
      materials: `01.Wall Mask: Premium quality wall mask as per design.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...rangeRates(260, 280),
    },
    {
      id: 'vertical-gardening',
      sectionId: 'feature-finish',
      serialNo: 10,
      description: 'Vertical Gardening',
      materials: 'Vertical Gardening as per client approved design.',
      unit: 'sqft',
      ...rangeRates(1400, 1550),
    },
    {
      id: 'pu-stone',
      sectionId: 'feature-finish',
      serialNo: 11,
      description: 'PU Stone',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Top Material: Premium Quality PU Stone.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...rangeRates(1750, 1850),
    },
    {
      id: 'texture-paint',
      sectionId: 'paint-texture',
      serialNo: 12,
      description: 'Texture Paint',
      materials: `01.Texture Paint: 3 Layer of Imported Texture Paint Is Applied.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...rangeRates(320, 450),
    },
    {
      id: 'fluted-panel',
      sectionId: 'paneling',
      serialNo: 13,
      description: 'Fluted Panel',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Top Material: Imported Premium Quality 12 mm Fluted Panel or Imported Premium Grade Quality 12 mm Fluted High Pressure Laminates Panel.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...fixedRates(1350),
    },
    {
      id: 'reflective-raffle-sheet',
      sectionId: 'feature-finish',
      serialNo: 14,
      description: 'Reflective Raffle Sheet',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core Material: Supplying & Making of 12mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
03.Top Material: Factory Pasting of Imported Premium Quality Reflective Raffle Sheet.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...fixedRates(1250),
    },
    {
      id: 'fabric-panel',
      sectionId: 'paneling',
      serialNo: 15,
      description: 'Fabric Panel',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core Material: Supplying & Making of 12mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
03.Top Materials: Good Quality Foam in country and covered by Imported Leather or Fabrics (Made In Indonesia) with golden finish metallic bit.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...rangeRates(1650, 1850),
    },
    {
      id: 'mdf-docu-paint-wall-paneling',
      sectionId: 'paneling',
      description: 'MDF with Docu Paint Wall Paneling',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core material: Supplying & Making 12mm Good Quality Medium Density Fiber Wood.
03.Top Material: Making 12 mm Good Quality Medium Density Fiber Wood With Good Quality Docu Paint.
Properties: Anti-Cracking, Water Resistant, Anti-Alkalinity and Acidity and Self Clean. (Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...rangeRates(1050, 1200),
    },
    {
      id: 'cnc-wall-paneling',
      sectionId: 'paneling',
      description: 'CNC Wall Paneling',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core material: Supplying & Making 18 mm Good Quality Medium Density Fiber Wood.
03.Top Material: Making 18 mm CNC Cut Good Quality Medium Density Fiber Wood With As Per Design.
04.Paint: Good Quality Docu Paint.
Properties: Anti-Cracking, Water Resistant, Anti-Alkalinity and Acidity and Self Clean. (Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...rangeRates(1450, 1850),
    },
    {
      id: 'hdf-docu-paint-wall-paneling',
      sectionId: 'paneling',
      description: 'HDF with Docu Paint Wall Paneling',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core material: Supplying & Making 12mm Good Quality HDF (High Density Fiber Board).
03.Top Material: Making 12 mm Good Quality HDF Board With Good Quality Docu Paint.
Properties: Anti-Cracking, Water Resistant, Anti-Alkalinity and Acidity and Self Clean. (Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...onRequestRates(),
    },
    {
      id: 'cnc-hdf-docu-paint-wall-paneling',
      sectionId: 'paneling',
      description: 'CNC Cut HDF with Docu Paint Wall Paneling',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core material: Supplying & Making 12mm Good Quality HDF (High Density Fiber Board).
03.Top Material: Supplying & Making 12 mm CNC Cut Good Quality HDF Board With As Per Design.
04.Paint: Good Quality Docu Paint.
Properties: Anti-Cracking, Water Resistant, Anti-Alkalinity and Acidity and Self Clean. (Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...onRequestRates(),
    },
    {
      id: 'mirror-wall-panel',
      sectionId: 'glass-mirror',
      description: 'Mirror',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core material: Supplying & Making 18 mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
03.Top Material: 5 mm Belgium crystal mirror glass attached with highly dense silicon gum.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...onRequestRates(),
    },
    {
      id: 'beveled-mirror-wall-panel',
      sectionId: 'glass-mirror',
      description: 'Beveled Mirror',
      materials: `${ARCHITECT_WOOD_FRAMING}
02.Core material: Supplying & Making 18 mm Architect Grade MR (Moisture Resistant) Highly Compressed Engineered Wood.
03.Top Material: 5 mm Diamond Cut Beveled mirror attached with highly dense silicon gum.
${WALL_COMMON_PROPERTIES}`,
      unit: 'sqft',
      ...onRequestRates(),
    },
    {
      id: 'glass-partition-tempered',
      sectionId: 'glass-mirror',
      description: 'Glass Partition',
      materials: `Made with 10 mm thick tempered safety glass, featuring narrow bevel detailing and supported by a durable metal frame, ensuring strength, safety, and elegant finishing.
(Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...onRequestRates(),
    },
    {
      id: 'stone-texture',
      sectionId: 'feature-finish',
      description: 'Stone Texture',
      materials: `01.Surface preparation including cleaning, putty application and sanding.
02.Application of approved primer coat prior to texture finish.
03.Providing and applying decorative stone texture finish using textured paint / plaster.
04.Texture pattern execution as per approved design/sample.
05.Final finishing to achieve uniform stone-like surface appearance.
06.Complete in all respects as per site condition.`,
      unit: 'sqft',
      ...onRequestRates(),
    },
    {
      id: 'roof-top-glass-shade',
      sectionId: 'glass-mirror',
      description: 'Roof Top Glass Shade',
      materials: `Frame Material: Imported 2.5 mm Aluminum Framing.
Glass: Imported 12.76 mm Laminated Tempered Glass.`,
      unit: 'sqft',
      ...onRequestRates(),
    },
    {
      id: 'raised-floor',
      sectionId: 'feature-finish',
      description: 'Raised Floor',
      materials: `01.Structure: Raised floor system constructed with durable metallic/steel framing.
02.Top Surface: Premium engineered wooden panels with smooth polished finish.
03.Support System: Adjustable metal supports to ensure proper leveling and stability.
04.Fixing Method: Concealed screw fixing for a seamless and clean appearance.
05.Finish: Protective coating applied for scratch resistance and long-lasting durability.
(Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...onRequestRates(),
    },
    {
      id: 'artificial-grass',
      sectionId: 'feature-finish',
      description: 'Artificial Grass',
      materials: 'Artificial Grass is a premium synthetic turf system specially designed for rooftop applications to create a natural green environment without soil, watering, or heavy structural load.',
      unit: 'sqft',
      ...onRequestRates(),
    },
    {
      id: 'frosted-paper',
      sectionId: 'glass-mirror',
      description: 'Frosted Paper',
      materials: 'Supply & installation of China made frosted paper on glass, providing smooth matte finish, privacy control, and complete fitting as per approved design.',
      unit: 'sqft',
      ...onRequestRates(),
    },
  ],
}
