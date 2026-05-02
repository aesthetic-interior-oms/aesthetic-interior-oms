'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function AdminMeetingQueuePage() {
  return (
    <CadPhaseQueueBoard
      title="Meeting Queue (Admin)"
      subtitle="Monitor CAD approved and consulting-phase meeting pipeline leads."
      leadBasePath="/crm/admin/leads"
      queueType="meeting"
    />
  )
}
