import { ConveyanceVerificationModule } from '@/components/conveyance/conveyance-verification-module'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export default function ProjectCoordinatorConveyancePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <ConveyanceVerificationModule
        roleTitle="Project Coordinator"
        roleSubtitle="Review, verify, and approve or reject team conveyance expense requests."
        departmentBadgeText="Project Coordinator"
      />
    </div>
  )
}
