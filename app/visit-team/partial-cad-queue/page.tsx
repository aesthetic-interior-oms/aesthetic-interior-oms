'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function SpecialistPartialCadQueuePage() {
  return (
    <CadPhaseQueueBoard
      title="Partial CAD Queue"
      subtitle="Track CAD phase progress and monitor which CAD is working on which project."
      leadBasePath="/visit-team/partial-visits"
      queueType="cad"
      mode="partial"
      showSrCrmFilter
    />
  )
}
