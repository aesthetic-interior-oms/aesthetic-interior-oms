import { ConveyanceVerificationModule } from '@/components/conveyance/conveyance-verification-module'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export default function AccountsConveyancePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <ConveyanceVerificationModule
        roleTitle="Accounts Conveyance"
        roleSubtitle="Audit submitted conveyance leaves, verify travel expense claims, and disburse payments to mark records as paid."
        departmentBadgeText="Accounts Disbursement"
        initialStatus="ALL"
      />
    </div>
  )
}
