'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function JrArchProjectsPage() {
  return (
    <CadPhaseQueueBoard
      title="Projects"
      subtitle="Complete history of all projects that have passed through the Jr Architect team — across all stages."
      leadBasePath="/crm/jr-architecture/leads"
      queueType="history"
      showAssigneeReassign={false}
    />
  )
}
