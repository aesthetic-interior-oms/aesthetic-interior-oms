import { getProcurementRequisitions } from '@/lib/procurement-service'
import { RequisitionsClient } from './_components/requisitions-client'
import { CheckCircle2, ArrowLeft, PackagePlus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const revalidate = 0

interface RequisitionsPageProps {
  searchParams?: Promise<{
    search?: string
    status?: string
  }>
}

export default async function ProcurementRequisitionsPage({
  searchParams,
}: RequisitionsPageProps) {
  const resolvedParams = searchParams ? await searchParams : {}
  const statusParam = resolvedParams?.status || 'FULFILLED' // First page is list of completed requisitions
  const searchParam = resolvedParams?.search

  // Fetch all requisitions so the client component can switch tabs smoothly
  const allRequisitions = await getProcurementRequisitions({
    status: 'ALL',
    search: searchParam,
  })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/procurement/dashboard" className="hover:text-foreground">
              Procurement
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Requisitions</span>
          </div>

          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Completed Requisitions
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed First
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of fulfilled material requisitions and active procurement fulfillment
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/procurement/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Client List View */}
      <RequisitionsClient
        initialRequisitions={allRequisitions}
        defaultStatus={statusParam}
      />
    </div>
  )
}
