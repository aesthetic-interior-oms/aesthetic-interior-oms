'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function AdminPartialBudgetQueuePage() {
  return (
    <CadPhaseQueueBoard
      title="Partial Budget Queue (Admin)"
      subtitle="Track quotation and budget-stage partial leads for budget discussion across the organization."
      leadBasePath="/visit-team/partial-visits"
      queueType="budget"
      mode="partial"
      showAssigneeReassign={false}
    />
  )
}
