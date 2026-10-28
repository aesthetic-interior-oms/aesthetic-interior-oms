import type { RequisitionItemInput } from '@/lib/boq-service'
import type { RequisitionWorkCategory } from '../types/boq-builder-types'

/** Lighting and electrical schedule helper function.
 * Unknown quantities are represented as 0 so they remain visibly unfilled and
 * can be completed by the BOQ user instead of being guessed.
 */
export function scheduleItem(
  workCategory: RequisitionWorkCategory,
  materialName: string,
  specifications: string,
  quantity: number,
  unit = 'pcs',
  extraAttrs: Record<string, unknown> = {},
): RequisitionItemInput {
  const scheduleKey = workCategory === 'CEILING' ? 'ceiling-light-xl-v2' : 'ceiling-electrical-xl-v2'
  return {
    workCategory,
    materialName,
    specifications,
    netQuantity: quantity,
    wastagePercent: 0,
    finalQuantity: quantity,
    unit,
    productionPhase: workCategory === 'CEILING' ? 'Ceiling Lighting' : 'Electrical Work',
    remarks:
      (extraAttrs.remarks as string) ||
      (quantity === 0 ? 'Quantity not specified in source list; confirm before requisition.' : ''),
    variantAttributes: {
      sourceScheduleKey: scheduleKey,
      sourceQuantityStatus: quantity === 0 ? 'NEEDS_CONFIRMATION' : 'CONFIRMED',
      colorTempSpecs: specifications,
      ...extraAttrs,
    },
  }
}

export interface CeilingLightingCatalogItem {
  name: string
  subCategory: string
  defaultSpecs: string
  sizeOptions?: string[]
  voltageOptions?: string[]
  defaultSize?: string
  defaultVoltage?: string
  defaultQty?: number
  unit: string
  defaultRemarks: string
}

export const CEILING_LIGHTING_CATALOG: CeilingLightingCatalogItem[] = [
  {
    name: 'T-5 Light',
    subCategory: 'Linear Profile (T-5)',
    defaultSpecs: '4000 K',
    sizeOptions: ['1 Feet', '2 Feet', '3 Feet', '4 Feet'],
    defaultSize: '4 Feet',
    unit: 'pcs',
    defaultRemarks: 'Profile Light',
  },
  {
    name: 'Spot Light',
    subCategory: 'Spotlights & Panels',
    defaultSpecs: '4000 K',
    defaultQty: 95,
    unit: 'pcs',
    defaultRemarks: 'Recessed Spot',
  },
  {
    name: 'Surface Panel Light',
    subCategory: 'Spotlights & Panels',
    defaultSpecs: '4000 K',
    voltageOptions: ['15 Watt'],
    defaultVoltage: '15 Watt',
    unit: 'pcs',
    defaultRemarks: 'Surface Mounted',
  },
  {
    name: 'Surface Spot Light',
    subCategory: 'Spotlights & Panels',
    defaultSpecs: '4000 K',
    voltageOptions: ['10 Watt'],
    defaultVoltage: '10 Watt',
    unit: 'pcs',
    defaultRemarks: 'Surface Mounted',
  },
  {
    name: 'Cylinder Light',
    subCategory: 'Spotlights & Panels',
    defaultSpecs: 'Standard',
    defaultQty: 15,
    unit: 'pcs',
    defaultRemarks: 'Downlight',
  },
  {
    name: 'Magnetic Flat Light',
    subCategory: 'Magnetic Track',
    defaultSpecs: 'Track Insert',
    sizeOptions: ['6 Feet', '12 Inch', '24 Inch'],
    defaultSize: '12 Inch',
    unit: 'pcs',
    defaultRemarks: 'Track Insert',
  },
  {
    name: 'Magnetic Channel / Track',
    subCategory: 'Magnetic Track',
    defaultSpecs: 'Recessed Track',
    sizeOptions: ['6 Feet', '10 Feet'],
    defaultSize: '6 Feet',
    unit: 'pcs',
    defaultRemarks: 'Track Channel',
  },
  {
    name: 'Magnetic Focus Light',
    subCategory: 'Magnetic Track',
    defaultSpecs: 'Adjustable Spot',
    defaultQty: 7,
    unit: 'pcs',
    defaultRemarks: 'Focus Light',
  },
  {
    name: 'Silicon Light',
    subCategory: 'Strip Lighting',
    defaultSpecs: '8 mm Strip',
    voltageOptions: ['220V AC', '12V DC'],
    defaultVoltage: '220V AC',
    unit: 'rft',
    defaultRemarks: 'Flexible Strip',
  },
  {
    name: 'Silicon Cover',
    subCategory: 'Strip Lighting',
    defaultSpecs: 'Diffuser Cover',
    unit: 'set',
    defaultRemarks: 'Channel Cover',
  },
]

export const CEILING_LIGHTING_SCHEDULE: RequisitionItemInput[] = [
  scheduleItem('CEILING', 'T-5 Light', '4000 K', 15, 'pcs', { sizeDimension: '1 Feet', voltageWattage: '—', remarks: 'Profile Light' }),
  scheduleItem('CEILING', 'T-5 Light', '4000 K', 10, 'pcs', { sizeDimension: '2 Feet', voltageWattage: '—', remarks: 'Profile Light' }),
  scheduleItem('CEILING', 'T-5 Light', '4000 K', 5, 'pcs', { sizeDimension: '3 Feet', voltageWattage: '—', remarks: 'Profile Light' }),
  scheduleItem('CEILING', 'T-5 Light', '4000 K', 80, 'pcs', { sizeDimension: '4 Feet', voltageWattage: '—', remarks: 'Main Profile Light' }),
  scheduleItem('CEILING', 'Spot Light', '4000 K', 95, 'pcs', { sizeDimension: '—', voltageWattage: '—', remarks: 'Recessed Spot' }),
  scheduleItem('CEILING', 'Surface Panel Light', '4000 K', 0, 'pcs', { sizeDimension: '—', voltageWattage: '15 Watt', remarks: 'Surface Mounted' }),
  scheduleItem('CEILING', 'Surface Spot Light', '4000 K', 0, 'pcs', { sizeDimension: '—', voltageWattage: '10 Watt', remarks: 'Surface Mounted' }),
  scheduleItem('CEILING', 'Cylinder Light', 'Standard', 15, 'pcs', { sizeDimension: '—', voltageWattage: '—', remarks: 'Downlight' }),
  scheduleItem('CEILING', 'Magnetic Flat Light', 'Track Insert', 0, 'pcs', { sizeDimension: '6 Feet', voltageWattage: '—', remarks: 'Track Insert' }),
  scheduleItem('CEILING', 'Magnetic Flat Light', 'Track Insert', 14, 'pcs', { sizeDimension: '12 Inch', voltageWattage: '—', remarks: 'Track Insert' }),
  scheduleItem('CEILING', 'Magnetic Flat Light', 'Track Insert', 0, 'pcs', { sizeDimension: '24 Inch', voltageWattage: '—', remarks: 'Track Insert' }),
  scheduleItem('CEILING', 'Magnetic Channel / Track', 'Recessed Track', 5, 'pcs', { sizeDimension: '6 Feet', voltageWattage: '—', remarks: 'Track Channel' }),
  scheduleItem('CEILING', 'Magnetic Channel / Track', 'Recessed Track', 2, 'pcs', { sizeDimension: '10 Feet', voltageWattage: '—', remarks: 'Track Channel' }),
  scheduleItem('CEILING', 'Magnetic Focus Light', 'Adjustable Spot', 7, 'pcs', { sizeDimension: '—', voltageWattage: '—', remarks: 'Focus Light' }),
  scheduleItem('CEILING', 'Silicon Light', '8 mm Strip', 60, 'rft', { sizeDimension: '—', voltageWattage: '220V AC', remarks: 'Flexible Strip' }),
  scheduleItem('CEILING', 'Silicon Light', '8 mm Strip', 0, 'rft', { sizeDimension: '—', voltageWattage: '12V DC', remarks: 'Low Volt Strip' }),
  scheduleItem('CEILING', 'Silicon Cover', 'Diffuser Cover', 0, 'set', { sizeDimension: '—', voltageWattage: '—', remarks: 'Channel Cover' }),
]

export interface CeilingElectricalCatalogItem {
  name: string
  subCategory: string
  defaultSpecs: string
  defaultRating?: string
  hasRating: boolean
  voltageOptions?: string[]
  defaultVoltage?: string
  hasVoltage: boolean
  defaultQty?: number
  unit: string
  defaultRemarks: string
}

export const CEILING_ELECTRICAL_CATALOG: CeilingElectricalCatalogItem[] = [
  {
    name: 'Power Supply Driver',
    subCategory: 'Drivers & Power',
    defaultSpecs: '12V DC Output',
    defaultRating: '—',
    hasRating: false,
    voltageOptions: ['60 Watt', '100 Watt', '200 Watt'],
    defaultVoltage: '60 Watt',
    hasVoltage: true,
    unit: 'pcs',
    defaultRemarks: 'Driver Unit',
  },
  {
    name: 'Power Supply (General)',
    subCategory: 'Drivers & Power',
    defaultSpecs: 'Standard Driver',
    defaultRating: '—',
    hasRating: false,
    hasVoltage: false,
    defaultQty: 5,
    unit: 'pcs',
    defaultRemarks: 'Main Power Driver',
  },
  {
    name: 'Electrical Cable',
    subCategory: 'Cable & Accessories',
    defaultSpecs: '14/76 Cable',
    defaultRating: '—',
    hasRating: false,
    hasVoltage: false,
    unit: 'coil/rft',
    defaultRemarks: 'Wiring Cable',
  },
  {
    name: 'Electrical Insulation Tape',
    subCategory: 'Cable & Accessories',
    defaultSpecs: 'PVC Tape',
    defaultRating: '—',
    hasRating: false,
    hasVoltage: false,
    unit: 'roll',
    defaultRemarks: 'Accessory',
  },
  {
    name: 'DP Switch',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Double Pole',
    defaultRating: 'Heavy Duty',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Main Switch',
  },
  {
    name: '1 Gang Switch',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Single Switch',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Lighting Control',
  },
  {
    name: '2 Gang Switch',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Double Switch',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Lighting Control',
  },
  {
    name: '3 Gang Switch',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Triple Switch',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Lighting Control',
  },
  {
    name: '4 Gang Switch',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Quad Switch',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Lighting Control',
  },
  {
    name: 'Fan Dimmer',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Speed Regulator',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Fan Control',
  },
  {
    name: 'Calling Bell Switch',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Doorbell Fitting',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Bell Control',
  },
  {
    name: 'Calling Bell Push',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'External Push',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Push Button',
  },
  {
    name: 'False Cover',
    subCategory: 'Switches & Controls',
    defaultSpecs: 'Blank Plate',
    defaultRating: 'Standard',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Dummy Cover',
  },
  {
    name: '15 Amp Socket',
    subCategory: 'Sockets & Outlets',
    defaultSpecs: 'Power Socket',
    defaultRating: '15A Rating',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Power Outlet',
  },
  {
    name: '13 Amp Socket',
    subCategory: 'Sockets & Outlets',
    defaultSpecs: 'Multi Socket',
    defaultRating: '13A Rating',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Power Outlet',
  },
  {
    name: 'Dish Socket',
    subCategory: 'Sockets & Outlets',
    defaultSpecs: 'TV Outlet',
    defaultRating: 'Coaxial',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Media Outlet',
  },
  {
    name: 'Internet Socket',
    subCategory: 'Sockets & Outlets',
    defaultSpecs: 'RJ45 LAN Outlet',
    defaultRating: 'Data',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Data Point',
  },
  {
    name: 'Intercom Socket',
    subCategory: 'Sockets & Outlets',
    defaultSpecs: 'Comm Outlet',
    defaultRating: 'Voice',
    hasRating: true,
    hasVoltage: false,
    unit: 'pcs',
    defaultRemarks: 'Comms Point',
  },
]

export const CEILING_ELECTRICAL_SCHEDULE: RequisitionItemInput[] = [
  scheduleItem('CEILING', 'Power Supply Driver', '12V DC Output', 0, 'pcs', { ratingDimension: '—', voltageWattage: '60 Watt', remarks: 'Driver Unit' }),
  scheduleItem('CEILING', 'Power Supply Driver', '12V DC Output', 0, 'pcs', { ratingDimension: '—', voltageWattage: '100 Watt', remarks: 'Driver Unit' }),
  scheduleItem('CEILING', 'Power Supply Driver', '12V DC Output', 0, 'pcs', { ratingDimension: '—', voltageWattage: '200 Watt', remarks: 'Driver Unit' }),
  scheduleItem('CEILING', 'Power Supply (General)', 'Standard Driver', 5, 'pcs', { ratingDimension: '—', voltageWattage: '—', remarks: 'Main Power Driver' }),
  scheduleItem('CEILING', 'Electrical Cable', '14/76 Cable', 0, 'coil/rft', { ratingDimension: '—', voltageWattage: '—', remarks: 'Wiring Cable' }),
  scheduleItem('CEILING', 'Electrical Insulation Tape', 'PVC Tape', 0, 'roll', { ratingDimension: '—', voltageWattage: '—', remarks: 'Accessory' }),
  scheduleItem('CEILING', 'DP Switch', 'Double Pole', 0, 'pcs', { ratingDimension: 'Heavy Duty', voltageWattage: '—', remarks: 'Main Switch' }),
  scheduleItem('CEILING', '1 Gang Switch', 'Single Switch', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Lighting Control' }),
  scheduleItem('CEILING', '2 Gang Switch', 'Double Switch', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Lighting Control' }),
  scheduleItem('CEILING', '3 Gang Switch', 'Triple Switch', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Lighting Control' }),
  scheduleItem('CEILING', '4 Gang Switch', 'Quad Switch', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Lighting Control' }),
  scheduleItem('CEILING', 'Fan Dimmer', 'Speed Regulator', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Fan Control' }),
  scheduleItem('CEILING', 'Calling Bell Switch', 'Doorbell Fitting', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Bell Control' }),
  scheduleItem('CEILING', 'Calling Bell Push', 'External Push', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Push Button' }),
  scheduleItem('CEILING', 'False Cover', 'Blank Plate', 0, 'pcs', { ratingDimension: 'Standard', voltageWattage: '—', remarks: 'Dummy Cover' }),
  scheduleItem('CEILING', '15 Amp Socket', 'Power Socket', 0, 'pcs', { ratingDimension: '15A Rating', voltageWattage: '—', remarks: 'Power Outlet' }),
  scheduleItem('CEILING', '13 Amp Socket', 'Multi Socket', 0, 'pcs', { ratingDimension: '13A Rating', voltageWattage: '—', remarks: 'Power Outlet' }),
  scheduleItem('CEILING', 'Dish Socket', 'TV Outlet', 0, 'pcs', { ratingDimension: 'Coaxial', voltageWattage: '—', remarks: 'Media Outlet' }),
  scheduleItem('CEILING', 'Internet Socket', 'RJ45 LAN Outlet', 0, 'pcs', { ratingDimension: 'Data', voltageWattage: '—', remarks: 'Data Point' }),
  scheduleItem('CEILING', 'Intercom Socket', 'Comm Outlet', 0, 'pcs', { ratingDimension: 'Voice', voltageWattage: '—', remarks: 'Comms Point' }),
]

export const ELECTRICAL_WORK_SCHEDULE = CEILING_ELECTRICAL_SCHEDULE
