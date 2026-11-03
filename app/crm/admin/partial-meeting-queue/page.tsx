'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function AdminPartialMeetingQueuePage() {
  return (
    <CadPhaseQueueBoard
      title="Partial Meeting Queue (Admin)"
      subtitle="All CAD approved partial leads for meeting scheduling and follow-up across the organization."
      leadBasePath="/visit-team/partial-visits"
      queueType="meeting"
      mode="partial"
    />
  )
}
