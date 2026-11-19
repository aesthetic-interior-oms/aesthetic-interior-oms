import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { getLeadRequisitionData } from '@/lib/boq-service'
import { RequisitionBuilderClient } from './_components/requisition-builder-client'

export const revalidate = 0

interface PageProps {
  params: Promise<{
    leadId: string
  }>
  searchParams?: Promise<{
    requisitionId?: string
    newBatch?: string
  }>
}

export default async function RequisitionBuilderPage({ params, searchParams }: PageProps) {
  const { userId } = await auth()
  if (!userId) {
    redirect('/')
  }

  const { leadId } = await params
  if (!leadId) {
    notFound()
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const requisitionId = resolvedSearchParams?.requisitionId
  const isNewBatch = resolvedSearchParams?.newBatch === 'true'

  const data = await getLeadRequisitionData(leadId, requisitionId, isNewBatch)
  if (!data) {
    notFound()
  }

  return (
    <RequisitionBuilderClient
      lead={data.lead}
      detailQuotation={data.detailQuotation}
      existingRequisition={data.requisition}
      allRequisitions={data.allRequisitions}
      initialVendorAgreements={data.vendorAgreements}
      canManageCeilingWorkOrder={data.canManageCeilingWorkOrder}
      isBoqLeader={data.isBoqLeader}
      isPc={data.isPc}
    />
  )
}
