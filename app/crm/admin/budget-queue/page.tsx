'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function AdminBudgetQueuePage() {
  return (
    <CadPhaseQueueBoard
      title="Budget Queue (Admin)"
      subtitle="Track all quotation and budget-phase leads across the organization."
      leadBasePath="/crm/admin/leads"
      queueType="budget"
    />
  )
}
