'use client'

import { ConversionPaymentBoard } from '@/components/crm/shared/conversion-payment-board'

export default function SeniorCrmConversionAndPaymentPage() {
  return (
    <ConversionPaymentBoard
      title="Conversion & Payment"
      subtitle="Track all clients currently in conversion stage and monitor payment statuses."
      leadBasePath="/crm/sr/leads"
    />
  )
}
