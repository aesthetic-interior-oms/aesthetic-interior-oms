export type ElectricalQuotationItem = {
  id: string
  serialNo?: number
  name: string
  description: string
  quantity?: number | null
  unit?: string | null
  rate?: number | null
}

export type ElectricalQuotationContent = {
  clientName?: string
  clientAddress?: string
  quotationDate: string
  subject: string
  notes: string
  excludedItems: string
  items: ElectricalQuotationItem[]
  useApproximateTotal?: boolean
  approximateGrandTotal?: number | null
}

export const ELECTRICAL_QUOTATION_UNITS = [
  'NOS',
  'COIL',
  'NOS/COIL',
  'NOS/RET',
  'Lump sum',
  'Lot',
  'Rft',
  'Pcs',
  'Set',
  'Meter',
] as const

// Standard starter items from the electrical quotation library.
// These are available from "Add from saved items" so users can add them with 1 click.
export const ELECTRICAL_QUOTATION_TEMPLATE: ElectricalQuotationItem[] = [
  { id: 'electrical-01', serialNo: 1, name: 'Conduit', description: 'Brand: RFL / Gazi / Bengal.\nType: Flexible PVC.\nInstallation: Complete fitting, fixing & connection.\nScope: Including all necessary accessories & finishing.', quantity: null, unit: 'NOS/COIL', rate: null },
  { id: 'electrical-02', serialNo: 2, name: 'MK Box', description: 'Brand: Akij / Click.\nType: PVC / MS / SS (1/2/3/4) Gang, vertical or horizontal.\nInstallation: Complete fitting, fixing & connection.\nScope: Including all necessary accessories & finishing.', quantity: null, unit: 'NOS', rate: null },
  { id: 'electrical-03', serialNo: 3, name: 'Cable', description: 'Brand: BRB / Super Star / RR.\nType: Flame Retardant Low Smoke (FRLS) copper cable.\nInstallation: Concealed / surface wiring through PVC conduit.\nScope: Complete supply, installation, and connection with all necessary accessories (without AC & home appliances).\nCable size: 1.5 rm, 2.5 rm, 4 rm (as per standard requirement).', quantity: null, unit: 'COIL', rate: null },
  { id: 'electrical-04', serialNo: 4, name: 'Earthing Wire', description: 'Brand: BRB.\nType: Earth Continuity Conductor (ECC) copper cable.\nInstallation: Concealed / surface through PVC conduit.\nScope: Complete supply, installation & earthing connection with all accessories.\nCable size: 1 re, 2.5 re, 4 re.', quantity: null, unit: 'COIL', rate: null },
  { id: 'electrical-05', serialNo: 5, name: 'Circuit Breaker', description: 'Brand: Havells, ABB, Siemens, Super Star.\nType: 10/16/20/63 Amp SP/MCCB/RCCB.\nInstallation: Complete fitting, fixing & connection.\nScope: Including all necessary accessories & finishing.', quantity: null, unit: 'NOS', rate: null },
  { id: 'electrical-06', serialNo: 6, name: 'Switch / Socket', description: 'Brand: Peha / UTEN / NIMO / ARTDNA.\nType: Tempered glass (1/2/3/4) Gang SP & 1 Gang DP Switch, 13 amp 5 pin & 15 amp 3 pin socket, fan dimmer.\nInstallation: Complete fitting, fixing & connection.\nScope: Including all necessary accessories & finishing.', quantity: null, unit: 'NOS', rate: null },
  { id: 'electrical-07', serialNo: 7, name: 'Light', description: '7 W spot light (ceiling / surface / cylinder).\n12/24 W LED panel.\nMagnetic light (ceiling / surface).\nFocus LED light.\nT5 / strip light.\nImported silicone flexible integrated light.\nProfile light.\nImported aluminum integrated profile light.', quantity: null, unit: 'NOS/RET', rate: null },
  { id: 'electrical-08', serialNo: 8, name: 'Hardware (Electrical Related)', description: 'All electrical related hardware (conduits, boxes & accessories) are included for complete installation.', quantity: null, unit: 'Lump sum', rate: null },
  { id: 'electrical-09', serialNo: 9, name: 'Installation Charge', description: 'Labor charge for complete fitting, fixing & installation of all electrical components. Includes groove cutting, hole cutting, PVC conduit piping, cable laying, clamping & proper alignment. Surface / concealed installation as per approved drawing & design. Making good of all damages after installation (plaster repair, finishing touch). Testing, checking & commissioning of all electrical points. Work to be executed in a neat and workmanlike manner ensuring safety and durability.', quantity: null, unit: 'Lump sum', rate: null },
]

export function buildDefaultElectricalQuotationContent(initial?: {
  clientName?: string
  clientAddress?: string | null
}): ElectricalQuotationContent {
  return {
    clientName: initial?.clientName || '',
    clientAddress: initial?.clientAddress || '',
    quotationDate: new Date().toISOString().slice(0, 10),
    subject: 'Quotation for Electrical work.',
    notes: 'Payment terms: 50% advance along with work order, 40% running payment during progress, 10% after completion & handover.',
    excludedItems: 'All AC Units, Ceiling Fans, Chandeliers, Fireplace and Decorative Light.',
    items: [], // Completely empty by default
    useApproximateTotal: false,
    approximateGrandTotal: null,
  }
}

export function calculateElectricalGrandTotal(content: ElectricalQuotationContent): {
  calculatedSum: number
  grandTotal: number
  isApproximate: boolean
} {
  const calculatedSum = (content.items || []).reduce((sum, item) => {
    const qty = typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : Number(item.quantity) || 0
    const rate = typeof item.rate === 'number' && Number.isFinite(item.rate) ? item.rate : Number(item.rate) || 0
    return sum + (qty * rate)
  }, 0)

  const approxNum = typeof content.approximateGrandTotal === 'number' && Number.isFinite(content.approximateGrandTotal) && content.approximateGrandTotal > 0
    ? content.approximateGrandTotal
    : typeof content.approximateGrandTotal === 'string' && Number(content.approximateGrandTotal) > 0
      ? Number(content.approximateGrandTotal)
      : null

  const isApproximate = Boolean(content.useApproximateTotal || (approxNum !== null && calculatedSum === 0))
  const grandTotal = isApproximate && approxNum !== null ? approxNum : calculatedSum

  return { calculatedSum, grandTotal, isApproximate }
}
