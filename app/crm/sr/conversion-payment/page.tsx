'use client'

import { ConversionPaymentBoard } from '@/components/crm/shared/conversion-payment-board'

export default function SeniorCrmConversionAndPaymentPage() {
  return (
    <ConversionPaymentBoard
      title="Agreement Signed & Payment"
      subtitle="Track all clients currently in agreement signed stage and monitor payment statuses."
      leadBasePath="/crm/sr/leads"
    />
  )
}
