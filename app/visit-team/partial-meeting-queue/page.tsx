'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function SpecialistPartialMeetingQueuePage() {
  return (
    <CadPhaseQueueBoard
      title="Partial Meeting Queue"
      subtitle="CAD approved partial leads for first-meeting scheduling and follow-up."
      leadBasePath="/visit-team/partial-visits"
      queueType="meeting"
      mode="partial"
    />
  )
}
