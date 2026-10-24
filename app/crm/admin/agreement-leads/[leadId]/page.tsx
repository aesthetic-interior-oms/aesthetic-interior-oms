import { AgreementEditor } from '@/components/crm/shared/agreement-editor'

export default async function AdminAgreementEditorPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params
  return <AgreementEditor leadId={leadId} />
}
