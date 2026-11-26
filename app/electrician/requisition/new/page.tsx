import { ElectricalRequisitionView } from '@/components/electrical/electrical-requisition-view'

export default function NewRequisitionPage() {
  return (
    <ElectricalRequisitionView
      portalLabel="Electrician"
      dashboardHref="/electrician/dashboard"
      projectsEndpoint="/api/electrician/projects"
    />
  )
}
