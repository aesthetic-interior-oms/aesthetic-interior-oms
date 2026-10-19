export type FurnitureQuotationItem = {
  id: string
  serialNo?: number
  section: 'Furniture' | 'Electrical Item'
  name: string
  description: string
  quantity: number
  unit: string
  rate: number
  unitLabel?: string
}

// Starter data transcribed from the supplied furniture quotation. Each lead gets
// its own editable copy when the Furniture tab is opened for the first time.
export const FURNITURE_QUOTATION_TEMPLATE: FurnitureQuotationItem[] = [
  { id: 'furn-01', section: 'Furniture', name: 'Dining Room Dining Table', description: 'Dining Table: Supplying & Installation of Premium Quality Dining Table with Elegant Contemporary Design, High-Quality Materials, Premium Finish & Durable Construction, All Complete.\nDining Seater: Supplying & Installation of Premium Quality Dining Seater with Elegant Design, Premium Upholstery, Comfortable Cushioning & Refined Finish, All Complete.', quantity: 1, unit: '8 seater / package', rate: 250000, unitLabel: 'Package' },
  { id: 'furn-02', section: 'Furniture', name: 'Family Living Room Sofa', description: 'Supplying & Installation of Premium Quality Sofa with Elegant Contemporary Design, Premium Upholstery, High-Density Cushioning & Refined Finish, All Complete.', quantity: 3, unit: 'seater', rate: 55000 },
  { id: 'furn-03', section: 'Furniture', name: 'Family Living Room Sofa Center Table', description: 'Supplying & Installation of Premium Quality Sofa Center Table with Elegant Contemporary Design, Quality Materials, Premium Finish & Durable Construction, All Complete.', quantity: 1, unit: 'Nos', rate: 75000 },
  { id: 'furn-04', section: 'Furniture', name: 'Living Room Sofa', description: 'Supplying & Installation of Premium Quality Sofa with Elegant Contemporary Design, Premium Upholstery, High-Density Cushioning & Refined Finish, All Complete.', quantity: 13, unit: 'seater', rate: 55000 },
  { id: 'furn-05', section: 'Furniture', name: 'Living Room Sofa Center Table', description: 'Supplying & Installation of Premium Quality Sofa Center Table with Elegant Contemporary Design, Quality Materials, Premium Finish & Durable Construction, All Complete.', quantity: 2, unit: 'Nos', rate: 85000 },
  { id: 'furn-06', section: 'Furniture', name: 'Master Bed Room King Size Bed', description: 'Supplying & Installation of Premium Quality King Size Bed (5\'-6" × 7\') with Elegant Contemporary Design, High-Quality Materials, Premium Finish & Comfortable Upholstery, All Complete.', quantity: 1, unit: 'Nos', rate: 135000 },
  { id: 'furn-07', section: 'Furniture', name: 'Master Bed Room Bed Side Table', description: 'Supplying & Installation of Premium Quality Bedside Table with Elegant Design, Quality Materials, Premium Finish & Functional Storage, All Complete.', quantity: 2, unit: 'Nos', rate: 20500 },
  { id: 'furn-08', section: 'Furniture', name: 'Master Bed Room Dressing Unit Seater', description: 'Supplying & Installation of Premium Quality Upholstered Dressing Seater with Elegant Design, High-Density Cushioning, Premium Fabric Finish & Comfortable Seating, All Complete.', quantity: 1, unit: 'Nos', rate: 35500 },
  { id: 'furn-09', section: 'Furniture', name: 'Female Child Bed Room King Size Bed', description: 'Supplying & Installation of Premium Quality King Size Bed (5\'-6" × 7\') with Elegant Contemporary Design, High-Quality Materials, Premium Finish & Comfortable Upholstery, All Complete.', quantity: 1, unit: 'Nos', rate: 135000 },
  { id: 'furn-10', section: 'Furniture', name: 'Female Child Bed Room Bed Side Table', description: 'Supplying & Installation of Premium Quality Bedside Table with Elegant Design, Quality Materials, Premium Finish & Functional Storage, All Complete.', quantity: 2, unit: 'Nos', rate: 20500 },
  { id: 'furn-11', section: 'Furniture', name: 'Female Child Bed Room Dressing Unit Seater', description: 'Supplying & Installation of Premium Quality Upholstered Dressing Seater with Elegant Design, High-Density Cushioning, Premium Fabric Finish & Comfortable Seating, All Complete.', quantity: 1, unit: 'Nos', rate: 35500 },
  { id: 'furn-12', section: 'Furniture', name: 'Female Child Bed Room Study Table Chair', description: 'Supplying & Installation of Premium Quality Chair with Elegant Design, Premium Upholstery, Comfortable Cushioning & Superior Finish, All Complete.', quantity: 1, unit: 'Nos', rate: 30500 },
  { id: 'furn-13', section: 'Furniture', name: 'Male Child Bed Room King Size Bed', description: 'Supplying & Installation of Premium Quality King Size Bed (5\'-6" × 7\') with Elegant Contemporary Design, High-Quality Materials, Premium Finish & Comfortable Upholstery, All Complete.', quantity: 1, unit: 'Nos', rate: 95000 },
  { id: 'furn-14', section: 'Furniture', name: 'Male Child Bed Room Bed Side Table', description: 'Supplying & Installation of Premium Quality Bedside Table with Elegant Design, Quality Materials, Premium Finish & Functional Storage, All Complete.', quantity: 2, unit: 'Nos', rate: 16500 },
  { id: 'furn-15', section: 'Furniture', name: 'Male Child Bed Room Dressing Unit Seater', description: 'Supplying & Installation of Premium Quality Upholstered Dressing Seater with Elegant Design, High-Density Cushioning, Premium Fabric Finish & Comfortable Seating, All Complete.', quantity: 1, unit: 'Nos', rate: 35500 },
  { id: 'furn-16', section: 'Furniture', name: 'Male Child Bed Room Study Table Chair', description: 'Supplying & Installation of Premium Quality Chair with Elegant Design, Premium Upholstery, Comfortable Cushioning & Superior Finish, All Complete.', quantity: 1, unit: 'Nos', rate: 30500 },
  { id: 'elec-17', section: 'Electrical Item', name: 'Family Living Room Fireplace', description: 'A compact, safe, and stylish electric fireplace designed specially for flats and apartments. Delivers a warm, cozy ambiance with realistic flame effects while ensuring zero smoke, zero gas, and zero ventilation requirement—perfect for indoor living spaces.', quantity: 1, unit: 'Nos', rate: 185000 },
  { id: 'elec-18', section: 'Electrical Item', name: 'Family Living Room TV', description: 'Supply & Installation of 65" Smart LED/Google TV, including wall mounting bracket & necessary accessories, complete. (Samsung 65" QLED | Tizen™ Smart TV)', quantity: 1, unit: 'Nos', rate: 175900 },
  { id: 'elec-19', section: 'Electrical Item', name: 'Master Bed Room TV', description: 'Supply & Installation of 55" Smart LED/Google TV, including wall mounting bracket & necessary accessories, complete. (Samsung 55" QLED | Tizen™ Smart TV)', quantity: 1, unit: 'Nos', rate: 134900 },
  { id: 'elec-20', section: 'Electrical Item', name: 'Male Child Bed Room TV', description: 'Supply & Installation of 43" Smart LED/Google TV, including wall mounting bracket & necessary accessories, complete. (Samsung 43Q7F 43 Inch 4K UHD QLED HDR Smart TV)', quantity: 1, unit: 'Nos', rate: 82900 },
  { id: 'elec-21', section: 'Electrical Item', name: 'Double Door Fridge', description: 'Supplying & Installation of Premium Double Door Refrigerator, Elegant Finish & Advanced Cooling System, All Complete. (Samsung Side By Side Refrigerator | RS72R5011B4/D2 | 700 L)', quantity: 1, unit: 'Nos', rate: 205000, unitLabel: 'Package' },
  { id: 'elec-22', section: 'Electrical Item', name: 'Deep Fridge', description: 'Supplying & Installation of Premium Deep Freezer, Elegant Finish & Advanced Cooling System, All Complete. (SAMSUNG 287L Chest freezer RI70F29V1G/AGH - Dark Gray)', quantity: 1, unit: 'Nos', rate: 62000, unitLabel: 'Package' },
  { id: 'elec-23', section: 'Electrical Item', name: 'Washing Machine', description: 'Supplying & Installation of Premium Washing Machine, Elegant Finish & Advanced Washing System, All Complete. (SHARP 8.5KG FRONT LOAD WASHING MACHINE ES-FW85SG)', quantity: 1, unit: 'Nos', rate: 86000, unitLabel: 'Package' },
  { id: 'elec-24', section: 'Electrical Item', name: 'Burner', description: 'Supplying & Installation of Premium Built-in Gas Burner, Elegant Finish & Advanced Heating System, All Complete. (Nimbera – BR 0300112-82 SWISH Kitchen Burner)', quantity: 1, unit: 'Nos', rate: 44500, unitLabel: 'Package' },
  { id: 'elec-25', section: 'Electrical Item', name: 'Sink', description: 'Supplying & Installation of Premium Kitchen Sink, Elegant Finish & Durable Construction, All Complete. (Surio – M1836DB SWISH Multifunctional Sink)', quantity: 1, unit: 'Nos', rate: 68000, unitLabel: 'Package' },
  { id: 'elec-26', section: 'Electrical Item', name: 'Kitchen Hood', description: 'Supplying & Installation of Premium Kitchen Hood, Elegant Finish & Advanced Ventilation System, All Complete. (Kiro – KH 0200112-82 SWISH Kitchen Hood)', quantity: 1, unit: 'Nos', rate: 64800, unitLabel: 'Package' },
  { id: 'elec-27', section: 'Electrical Item', name: 'Kitchen Counter Stool', description: 'Supplying & Installation of Premium Kitchen Counter Stool, Elegant Design & Comfortable Seating, All Complete. (HATIL Bar Stool Raspberry-105)', quantity: 3, unit: 'Nos', rate: 17000 },
  { id: 'elec-28', section: 'Electrical Item', name: 'Curtain', description: 'Supplying & Installation of Premium Quality Curtains with Elegant Fabric, Refined Finish, Smooth Draping & Complete Curtain Accessories, All Complete.', quantity: 72, unit: 'Yard', rate: 3550 },
  { id: 'elec-29', section: 'Electrical Item', name: 'Ceiling Fan', description: 'Supplying & Installation of Premium Quality Ceiling Fan with Elegant Design, Powerful Air Circulation & Energy-Efficient Performance, All Complete.', quantity: 8, unit: 'Nos', rate: 20000 },
  { id: 'elec-30', section: 'Electrical Item', name: 'Air Conditioner', description: 'Supplying & Installation of Premium Quality Air Conditioner with Elegant Design, Advanced Cooling Technology & Energy-Efficient Performance, All Complete. (General 1.5 Ton ASGG18CPTA Inverter AC)', quantity: 7, unit: 'Nos', rate: 114000 },
  { id: 'elec-31', section: 'Electrical Item', name: 'Chandelier', description: 'Supplying & Installation of Premium Quality Chandelier with Elegant Decorative Design, Premium Finish & Sophisticated Illumination, All Complete.', quantity: 2, unit: 'Nos', rate: 130000, unitLabel: 'Package' },
]

export type FurnitureQuotationContent = {
  quotationDate: string
  subject: string
  notes: string
  showElectricalSection?: boolean
  items: FurnitureQuotationItem[]
}

export const FURNITURE_QUOTATION_UNITS = ['Nos', 'Set', 'Sft', 'Sqft', 'Rft', 'Rmt', 'Yard', 'Seater', 'Coil', 'Package', 'Lump sum', 'Other'] as const

export function buildDefaultFurnitureQuotationContent(): FurnitureQuotationContent {
  return {
    quotationDate: new Date().toISOString().slice(0, 10),
    subject: 'Quotation for interior Furniture work.',
    notes: '',
    showElectricalSection: false,
    items: [],
  }
}
