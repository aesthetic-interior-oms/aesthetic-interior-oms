'use client'

import { CadPhaseQueueBoard } from '@/components/crm/shared/cad-phase-queue-board'

export default function SrDesignQueuePage() {
  return (
    <CadPhaseQueueBoard
      title="Design Queue"
      subtitle="Track visualization-phase leads assigned to 3D Visualizers."
      leadBasePath="/crm/sr/leads"
      queueType="design"
      queueEndpoint="/api/cad-work/visualizer-queue"
      assigneeDepartment="VISUALIZER_3D"
      assigneeLabel="3D Visualizer"
    />
  )
}
