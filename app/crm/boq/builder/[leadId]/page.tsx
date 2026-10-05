import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { getLeadRequisitionData } from '@/lib/boq-service'
import { RequisitionBuilderClient } from './_components/requisition-builder-client'

export const revalidate = 0

interface PageProps {
  params: Promise<{
    leadId: string
  }>
}

export default async function RequisitionBuilderPage({ params }: PageProps) {
  const { userId } = await auth()
  if (!userId) {
    redirect('/')
  }

  const { leadId } = await params
  if (!leadId) {
    notFound()
  }

  const data = await getLeadRequisitionData(leadId)
  if (!data) {
    notFound()
  }

  return (
    <RequisitionBuilderClient
      lead={data.lead}
      detailQuotation={data.detailQuotation}
      existingRequisition={data.requisition}
      userId={userId}
    />
  )
}
