import type { QuotationTemplateDefinition } from '@/lib/quotation-types'
import { fixedRates, onRequestRates, rangeRates } from '@/lib/quotation-templates/helpers'

const DEFAULT_TERMS =
  'Quotation valid for 15 days. Rates are per sqft unless noted. Wiring and lighting are excluded unless specified. Payment: 50% advance, 40% on material delivery, 10% on completion.'

export const CEILING_CURTAIN_TEMPLATE: QuotationTemplateDefinition = {
  key: 'ceiling-curtain',
  name: 'Ceiling & Curtain',
  sourceDocument: 'Quotation Formate - Ceiling & Curtain.pdf',
  defaultTerms: DEFAULT_TERMS,
  sections: [
    { id: 'ceiling', name: 'Ceiling', sortOrder: 1 },
    { id: 'curtain', name: 'Curtain', sortOrder: 2 },
    { id: 'blinds', name: 'Blinds', sortOrder: 3 },
  ],
  items: [
    {
      id: 'ceiling-normal',
      sectionId: 'ceiling',
      serialNo: 1,
      description: 'Ceiling (Normal)',
      materials: `01.Framing: Good Quality Metal Framing.
02.Core material: Supplying & Making of 12 mm POP
(Plaster of Paris ) Or Plain Partex.
03. Joint treatment: Board joint filled by Araldite Epoxy
Hardener (HV 953 U).
04. Paint: Berger or Asian Plastic paint.
(Without supplying wiring &lighting)`,
      unit: 'sqft',
      ...rangeRates(450, 500),
    },
    {
      id: 'ceiling-luxury',
      sectionId: 'ceiling',
      description: 'Ceiling (Luxury)',
      materials: `01.Framing: Good Quality Metal Framing.
02.Core material: Supplying & Making of 12 mm Fire Rated
or Plaster of Paris.
03. Joint treatment: Board joint filled by Araldite Epoxy
Hardener (HV 953 U).
04. Paint: Berger or Asian Plastic paint.
(Without supplying wiring &lighting)`,
      unit: 'sqft',
      ...rangeRates(750, 850),
    },
    {
      id: 'ceiling-family-reflective',
      sectionId: 'ceiling',
      description: 'Family Living Room Reflective Ceiling',
      materials: `01.Framing: Good Quality Metal Framing.
02.Core material: Supplying & Making of Water
Ripple Mirror SS Finish With As Per Design.
03. Joint treatment: Board joint filled by Araldite
Epoxy Hardener (HV 953 U).
04. Paint: Berger or Asian Plastic paint.
(Without supplying wiring &lighting)`,
      unit: 'sqft',
      ...onRequestRates(),
    },
    {
      id: 'ceiling-mirror-reflective',
      sectionId: 'ceiling',
      serialNo: 2,
      description: 'Mirror /Reflective Ceiling',
      materials: `01.Framing: Good Quality Metal Framing.
02.Core material: Supplying & Making of 12 mm Plain
Partex or Plaster of Paris or Imported reflective material or
Imported reflective Refoyel Sheet..
03. Joint treatment: Board joint filled by Araldite Epoxy
Hardener (HV 953 U).
04. Paint: Berger or Asian Plastic paint.
(Without supplying wiring &lighting)`,
      unit: 'sqft',
      ...rangeRates(1250, 1500),
    },
    {
      id: 'ceiling-louver',
      sectionId: 'ceiling',
      serialNo: 3,
      description: 'Louver Ceiling',
      materials: `01.Framing: Good Quality Metal Framing.
02.Core material: Supplying & Making of 12 mm Plain
Partex or Plaster of Paris or 12 mm CNC cut PVC ply with
Good Quality Docu Paint.
03. Joint treatment: Board joint filled by Araldite Epoxy
Hardener (HV 953 U).
04. Paint: Berger or Asian Plastic paint.
(Without supplying wiring &lighting)`,
      unit: 'sqft',
      ...rangeRates(1050, 1200),
    },
    {
      id: 'ceiling-beveled-mirror',
      sectionId: 'ceiling',
      description: 'Beveled Mirror Ceiling',
      materials: `Supply & installation of Beveled Mirror Ceiling made with 5
mm thick premium quality mirror glass, finished with 10–20
mm beveled edges on all sides. Mirror panels will be
accurately cut, polished and bevelled, then fixed on a strong
MS / plywood base structure using approved adhesive and
concealed fittings. All joints will be properly aligned to
ensure a seamless, elegant and reflective ceiling finish.
Complete work will be executed with proper safety
measures and neat finishing as per approved design.
short : Supply & installation of 5 mm thick beveled mirror
glass ceiling with 10–20 mm beveled edges, including
proper base structure, adhesive fixing and neat finishing as
per design.`,
      unit: 'sqft',
      ...onRequestRates(),
    },
    {
      id: 'curtain-holder',
      sectionId: 'curtain',
      serialNo: 4,
      description: 'Curtain Holder',
      materials: `01.Core Material: Supplying & Making of 12 mm Good
Quality Gorjon Ply Wood.
02.Curtain Rail: 0.5 mm Thickness 18 mm Dia SS Pipe With
Digital SS Calm For Curtain Rail.
03.Paint: Burger Or Asian Luxury Silk paint.
(Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...rangeRates(900, 1000),
    },
    {
      id: 'curtain-holder-no-rail',
      sectionId: 'curtain',
      serialNo: 5,
      description: 'Curtain Holder (Without Curtain Rail)',
      materials: `01.Core Material: Supplying & Making of 12 mm Good
Quality Gorjon Ply Wood.
02.Paint: Burger Or Asian Luxury Silk paint.
(Without supplying wiring & lighting)`,
      unit: 'sqft',
      ...fixedRates(750),
    },
    {
      id: 'ceiling-luxury-plain-partex',
      sectionId: 'ceiling',
      serialNo: 1,
      description: 'Ceiling (Luxury)',
      materials: `01.Framing: Good Quality Metal Framing.
02.Core material: Supplying & Making of 12 mm Plain
Partex or Plaster of Paris.
03. Joint treatment: Board joint filled by Araldite Epoxy
Hardener (HV 953 U).
04. Paint: Berger or Asian Plastic paint.
(Without supplying wiring &lighting)`,
      unit: 'sqft',
      ...fixedRates(750),
    },
    {
      id: 'blinds-horizontal',
      sectionId: 'blinds',
      description: 'Horizontal Blind',
      materials: `Supply & installation of horizontal blinds made of
aluminum/PVC slats, complete with headrail, control
mechanism, and all necessary fittings, properly fixed on
window/glass as per required size, complete in all respect.`,
      unit: 'sqft',
      ...rangeRates(300, 450),
    },
    {
      id: 'blinds-kitchen-aluminium',
      sectionId: 'blinds',
      description: 'Kitchen Aluminium Horizontal Blind',
      materials: `Moisture Resistant Aluminium Horizontal Blind
suitable for kitchen area with complete fittings &
accessories.`,
      unit: 'sqft',
      ...rangeRates(220, 350),
    },
  ],
}
