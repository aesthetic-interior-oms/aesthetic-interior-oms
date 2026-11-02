import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { ArrowLeft, Truck, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeliveryWorkspace } from './delivery-workspace'

export const revalidate = 0

interface DeliveryPageProps {
  params: Promise<{ id: string }>
}

export default async function RequisitionDeliveryPage({ params }: DeliveryPageProps) {
  const { id } = await params

  const requisition = await prisma.materialRequisition.findUnique({
    where: { id },
    include: {
      lead: {
        select: { id: true, name: true, phone: true, location: true, stage: true },
      },
      createdBy: {
        select: { fullName: true, email: true },
      },
      items: {
        orderBy: { workCategory: 'asc' },
      },
    },
  })

  if (!requisition) {
    notFound()
  }

  // Count items with any delivery batches logged
  const deliveredItemsCount = requisition.items.filter((item) => {
    const attrs = (item.variantAttributes as Record<string, unknown>) || {}
    const delivery = attrs.deliveryRecord as { totalDelivered?: number } | undefined
    return (delivery?.totalDelivered ?? 0) > 0
  }).length

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 font-medium">
            <Link href="/procurement/dashboard" className="hover:text-foreground transition-colors">
              Procurement
            </Link>
            <span>/</span>
            <Link href="/procurement/billing-center" className="hover:text-foreground transition-colors">
              Billing Center
            </Link>
            <span>/</span>
            <Link
              href={`/procurement/billing-center/${id}`}
              className="hover:text-foreground transition-colors"
            >
              {requisition.requisitionNo}
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Delivery &amp; Logistics</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Truck className="w-7 h-7 shrink-0" />
              <span>Delivery &amp; Logistics</span>
            </h1>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-muted text-foreground border border-border font-semibold">
              {requisition.requisitionNo}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Log site arrivals, record delivery batches with challan numbers, and monitor payment status for{' '}
            <strong className="text-foreground">{requisition.lead.name}</strong>
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="h-9 shrink-0">
          <Link href={`/procurement/billing-center/${id}`}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Purchase Billing
          </Link>
        </Button>
      </div>

      {/* Page Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Link
          href={`/procurement/billing-center/${id}`}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Purchases &amp; Billing</span>
        </Link>

        <Link
          href={`/procurement/billing-center/${id}/delivery`}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-foreground text-background shadow-xs transition-colors"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Delivery &amp; Logistics</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-background/20 font-mono">
            {deliveredItemsCount}/{requisition.items.length}
          </span>
        </Link>
      </div>

      {/* Main Delivery Workspace */}
      <DeliveryWorkspace requisition={requisition} />
    </div>
  )
}
