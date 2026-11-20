import { AgreementLeadsBoard } from '@/components/crm/shared/agreement-leads-board'

export default function PcAgreementLeadsPage() {
  return (
    <AgreementLeadsBoard
      title="Agreement Leads"
      subtitle="Confirmed agreements ready for production coordination."
      editorBasePath="/crm/pc/agreement-leads"
    />
  )
}
