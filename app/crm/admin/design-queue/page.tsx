'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function AdminDesignQueuePage() {
  return (
    <CadPhaseQueueBoard
      title="Design Queue (Admin)"
      subtitle="Track visualization-phase leads assigned to 3D Visualizers."
      leadBasePath="/crm/admin/leads"
      queueType="design"
      queueEndpoint="/api/cad-work/visualizer-queue"
      assigneeDepartment="VISUALIZER_3D"
      assigneeLabel="3D Visualizer"
    />
  )
}
