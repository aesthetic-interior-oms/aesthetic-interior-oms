'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function JrArchProjectsPage() {
  return (
    <CadPhaseQueueBoard
      title="Projects"
      subtitle="View all CAD phase leads and their current stage."
      leadBasePath="/crm/jr-architecture/leads"
    />
  )
}
