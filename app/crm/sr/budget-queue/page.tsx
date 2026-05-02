'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function SrBudgetQueuePage() {
  return (
    <CadPhaseQueueBoard
      title="Budget Queue"
      subtitle="Track quotation and budget-stage leads for budget discussion readiness."
      leadBasePath="/crm/sr/leads"
      queueType="budget"
    />
  )
}
