import { AgreementEditor } from '@/components/crm/shared/agreement-editor'

export default async function PcAgreementEditorPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params
  return <AgreementEditor leadId={leadId} basePath="/crm/pc/agreement-leads" />
}
