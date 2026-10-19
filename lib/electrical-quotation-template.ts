export type ElectricalQuotationItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit: string
  rate: number
}

export type ElectricalQuotationContent = {
  quotationDate: string
  subject: string
  notes: string
  excludedItems: string
  items: ElectricalQuotationItem[]
}

// Item names and scopes are from the supplied electrical quotation. It gives
// one approximate overall price but no item-wise prices or quantities.
export const ELECTRICAL_QUOTATION_TEMPLATE: ElectricalQuotationItem[] = [
  { id: 'electrical-01', name: 'Conduit', description: 'Brand: RFL / Gazi / Bengal.\nType: Flexible PVC.\nInstallation: Complete fitting, fixing & connection.\nScope: Including all necessary accessories & finishing.', quantity: 0, unit: 'NOS/COIL', rate: 0 },
  { id: 'electrical-02', name: 'MK Box', description: 'Brand: Akij / Click.\nType: PVC / MS / SS (1/2/3/4) Gang, vertical or horizontal.\nInstallation: Complete fitting, fixing & connection.\nScope: Including all necessary accessories & finishing.', quantity: 0, unit: 'NOS', rate: 0 },
  { id: 'electrical-03', name: 'Cable', description: 'Brand: BRB / Super Star / RR.\nType: Flame Retardant Low Smoke (FRLS) copper cable.\nInstallation: Concealed / surface wiring through PVC conduit.\nScope: Complete supply, installation, and connection with all necessary accessories (without AC & home appliances).\nCable size: 1.5 rm, 2.5 rm, 4 rm (as per standard requirement).', quantity: 0, unit: 'COIL', rate: 0 },
  { id: 'electrical-04', name: 'Earthing Wire', description: 'Brand: BRB.\nType: Earth Continuity Conductor (ECC) copper cable.\nInstallation: Concealed / surface through PVC conduit.\nScope: Complete supply, installation & earthing connection with all accessories.\nCable size: 1 re, 2.5 re, 4 re.', quantity: 0, unit: 'COIL', rate: 0 },
  { id: 'electrical-05', name: 'Circuit Breaker', description: 'Brand: Havells, ABB, Siemens, Super Star.\nType: 10/16/20/63 Amp SP/MCCB/RCCB.\nInstallation: Complete fitting, fixing & connection.\nScope: Including all necessary accessories & finishing.', quantity: 0, unit: 'NOS', rate: 0 },
  { id: 'electrical-06', name: 'Switch / Socket', description: 'Brand: Peha / UTEN / NIMO / ARTDNA.\nType: Tempered glass (1/2/3/4) Gang SP & 1 Gang DP Switch, 13 amp 5 pin & 15 amp 3 pin socket, fan dimmer.\nInstallation: Complete fitting, fixing & connection.\nScope: Including all necessary accessories & finishing.', quantity: 0, unit: 'NOS', rate: 0 },
  { id: 'electrical-07', name: 'Light', description: '7 W spot light (ceiling / surface / cylinder).\n12/24 W LED panel.\nMagnetic light (ceiling / surface).\nFocus LED light.\nT5 / strip light.\nImported silicone flexible integrated light.\nProfile light.\nImported aluminum integrated profile light.', quantity: 0, unit: 'NOS/RET', rate: 0 },
  { id: 'electrical-08', name: 'Hardware (Electrical Related)', description: 'All electrical related hardware (conduits, boxes & accessories) are included for complete installation.', quantity: 0, unit: 'Lump sum', rate: 0 },
  { id: 'electrical-09', name: 'Installation Charge', description: 'Labor charge for complete fitting, fixing & installation of all electrical components. Includes groove cutting, hole cutting, PVC conduit piping, cable laying, clamping & proper alignment. Surface / concealed installation as per approved drawing & design. Making good of all damages after installation (plaster repair, finishing touch). Testing, checking & commissioning of all electrical points. Work to be executed in a neat and workmanlike manner ensuring safety and durability.', quantity: 0, unit: 'Lump sum', rate: 0 },
]

export function buildDefaultElectricalQuotationContent(): ElectricalQuotationContent {
  return {
    quotationDate: new Date().toISOString().slice(0, 10),
    subject: 'Quotation for Electrical work.',
    notes: 'Reference quotation estimate: ৳1,020,000 (approx.). The supplied quotation does not state item-wise quantities or prices; enter them to calculate the draft total.',
    excludedItems: 'All AC Units, Ceiling Fans, Chandeliers, Fireplace and Decorative Light.',
    items: ELECTRICAL_QUOTATION_TEMPLATE.map((item) => ({ ...item })),
  }
}
