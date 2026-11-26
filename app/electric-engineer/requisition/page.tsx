import { ElectricalRequisitionView } from '@/components/electrical/electrical-requisition-view'

export default function ElectricEngineerRequisitionPage() {
  return (
    <ElectricalRequisitionView
      portalLabel="Electric Engineer"
      dashboardHref="/electric-engineer/dashboard"
      projectsEndpoint="/api/electric-engineer/projects"
    />
  )
}
