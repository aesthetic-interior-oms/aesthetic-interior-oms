'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function AdminMeetingQueuePage() {
  return (
    <CadPhaseQueueBoard
      title="Meeting Queue"
      subtitle="CAD approved leads for first-meeting scheduling and meeting-data follow-up across all SR CRM assignments."
      leadBasePath="/crm/admin/leads"
      cadApprovedOnly
    />
  )
}
