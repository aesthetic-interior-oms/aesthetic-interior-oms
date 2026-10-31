import { getProcurementRequisitionDetail } from '@/lib/procurement-service'
import { RequisitionDetailView } from './_components/requisition-detail-view'
import { notFound } from 'next/navigation'

export const revalidate = 0

interface RequisitionDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProcurementRequisitionDetailPage({
  params,
}: RequisitionDetailPageProps) {
  const { id } = await params
  const requisition = await getProcurementRequisitionDetail(id)

  if (!requisition) {
    notFound()
  }

  return <RequisitionDetailView initialData={requisition} />
}
