'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function SpecialistPartialBudgetQueuePage() {
  return (
    <CadPhaseQueueBoard
      title="Partial Budget Queue"
      subtitle="Track quotation and budget-stage partial leads for budget discussion readiness."
      leadBasePath="/visit-team/partial-visits"
      queueType="budget"
      mode="partial"
      showAssigneeReassign={false}
    />
  )
}
