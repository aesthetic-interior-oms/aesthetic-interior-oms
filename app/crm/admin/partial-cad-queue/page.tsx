'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function AdminPartialCadQueuePage() {
  return (
    <CadPhaseQueueBoard
      title="Partial CAD Queue (Admin)"
      subtitle="Admin view of all partial CAD phase leads and active CAD assignments across projects."
      leadBasePath="/visit-team/partial-visits"
      queueType="cad"
      mode="partial"
      showSrCrmFilter
    />
  )
}
