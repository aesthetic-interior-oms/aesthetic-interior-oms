import { POApprovalQueue } from '@/components/procurement/po-approval-queue'

export default function ProcurementPOApprovalsPage() {
  return (
    <POApprovalQueue
      title="Purchase Order Approvals (Procurement Leader)"
      subtitle="Verify and approve Purchase Orders before forwarding them to the Accounts Department."
    />
  )
}
