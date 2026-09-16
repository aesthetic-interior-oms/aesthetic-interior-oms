import { VendorType } from "@/generated/prisma/client"

/**
 * Maps VendorType to the appropriate ExpenseCategory for auto-created Transactions
 */
export const VENDOR_TYPE_TO_EXPENSE_CATEGORY: Record<VendorType, string> = {
  SUPPLIER:         "BOARD_MATERIAL",
  CONTRACTOR:       "CIVIL_WORK",
  PAINTER:          "PAINT_PAYMENT",
  CARPENTER:        "CARPENTER_PAYMENT",
  SERVICE_PROVIDER: "OTHERS",
  FREELANCER:       "OTHERS",
  OTHER:            "OTHERS",
}

/**
 * Generates a human-readable vendor ID label
 */
export function formatVendorType(type: VendorType): string {
  const labels: Record<VendorType, string> = {
    SUPPLIER:         "Supplier",
    CONTRACTOR:       "Contractor",
    PAINTER:          "Painter",
    CARPENTER:        "Carpenter",
    SERVICE_PROVIDER: "Service Provider",
    FREELANCER:       "Freelancer",
    OTHER:            "Other",
  }
  return labels[type] ?? type
}
