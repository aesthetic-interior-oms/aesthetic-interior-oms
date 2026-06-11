// A small static list of common short-quotation client names.
// Update this array or replace the module with an API call to load a real list.
export const SHORT_QUOTATION_NAMES: string[] = [
  'Interior Design Package A',
  'Interior Design Package B',
  'Modular Kitchen - Basic',
  'Modular Kitchen - Premium',
  'Living Room Renovation',
  'Bedroom Wardrobe',
  'Bathroom Upgrade',
  'Office Fitout Standard',
  'Office Fitout Executive',
  'Custom Joinery - Main Door',
]

export function searchShortQuotationNames(query: string, limit = 10) {
  if (!query) return SHORT_QUOTATION_NAMES.slice(0, limit)
  const q = query.trim().toLowerCase()
  return SHORT_QUOTATION_NAMES.filter((s) => s.toLowerCase().includes(q)).slice(0, limit)
}
