import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import {
  ArrowLeft,
  Receipt,
  CheckCircle2,
  Truck,
  ShoppingCart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { revalidatePath } from 'next/cache'
import { WallPanelingBillMaker } from './_components/wall-paneling-bill-maker'

export const revalidate = 0

interface BillingRequisitionDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function BillingRequisitionDetailPage({ params }: BillingRequisitionDetailPageProps) {
  const { id } = await params

  const [requisition, rawSuppliers] = await Promise.all([
    prisma.materialRequisition.findUnique({
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
    }),
    prisma.supplier.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        companyName: true,
        phone: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  // Map supplier fields into supplier options for bill maker
  const suppliers = rawSuppliers.map((s) => ({
    id: s.id,
    vendorName: s.name,
    vendorCompanyName: s.companyName,
    primaryPhone: s.phone,
    primaryEmail: s.email,
  }))

  if (!requisition) {
    notFound()
  }

  async function handleUpdateStatus(formData: FormData) {
    'use server'
    const newStatus = formData.get('status') as 'IN_PROCUREMENT' | 'FULFILLED' | 'SUBMITTED'
    if (!newStatus) return

    await prisma.materialRequisition.update({
      where: { id },
      data: { status: newStatus },
    })

    revalidatePath(`/procurement/billing-center/${id}`)
    revalidatePath(`/procurement/billing-center/${id}/delivery`)
    revalidatePath('/procurement/billing-center')
    revalidatePath('/procurement/dashboard')
  }

  const uniqueCategories = Array.from(new Set(requisition.items.map((i) => i.workCategory)))
  const totalUnits = requisition.items.reduce((sum, item) => sum + (item.finalQuantity || 0), 0)

  // Count items with existing billing records
  const billedItemsCount = requisition.items.filter((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attrs = (item.variantAttributes as Record<string, any>) || {}
    return Boolean(attrs.billingRecord?.isBought || attrs.purchaseRecord?.isBought)
  }).length

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb & Status Header */}
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
            <span className="text-foreground font-semibold">{requisition.requisitionNo}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
              {requisition.requisitionNo}
            </h1>
            {requisition.status === 'FULFILLED' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                Completed & Billed
              </span>
            ) : requisition.status === 'IN_PROCUREMENT' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                In Billing & Sourcing
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                Awaiting Billing
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Requisition prepared by <span className="font-semibold text-foreground">{requisition.createdBy.fullName || 'BOQ Team'}</span> on {new Date(requisition.createdAt).toLocaleDateString('en-GB')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/procurement/billing-center">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to List
            </Link>
          </Button>

          {requisition.status === 'SUBMITTED' && (
            <form action={handleUpdateStatus}>
              <input type="hidden" name="status" value="IN_PROCUREMENT" />
              <Button type="submit" size="sm" className="h-9 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 gap-1.5">
                <Receipt className="w-4 h-4" />
                Start Billing
              </Button>
            </form>
          )}

          {requisition.status === 'IN_PROCUREMENT' && (
            <form action={handleUpdateStatus}>
              <input type="hidden" name="status" value="FULFILLED" />
              <Button type="submit" size="sm" className="h-9 bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Mark Billing Fulfilled
              </Button>
            </form>
          )}

          {requisition.status === 'FULFILLED' && (
            <form action={handleUpdateStatus}>
              <input type="hidden" name="status" value="IN_PROCUREMENT" />
              <Button type="submit" variant="outline" size="sm" className="h-9 text-muted-foreground hover:text-foreground">
                Re-open Billing
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Primary Page View Navigation Tabs: Purchases vs Delivery */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Link
          href={`/procurement/billing-center/${id}`}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-foreground text-background shadow-xs transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Purchases & Billing</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-background/20 font-mono">
            {billedItemsCount}/{requisition.items.length}
          </span>
        </Link>

        <Link
          href={`/procurement/billing-center/${id}/delivery`}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border transition-colors"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Delivery & Logistics</span>
        </Link>
      </div>

      {/* KPI Cards: Clean Minimal Monochrome Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Project / Client
          </span>
          <div className="font-bold text-foreground text-base truncate">{requisition.lead.name}</div>
          <p className="text-xs text-muted-foreground truncate">{requisition.lead.location || 'Location not set'}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Material Items
          </span>
          <div className="font-bold text-foreground text-xl sm:text-2xl">
            {requisition.items.length} items
          </div>
          <p className="text-xs text-muted-foreground">
            {billedItemsCount > 0 ? `${billedItemsCount} purchases logged` : 'None logged yet'}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Required Qty
          </span>
          <div className="font-bold text-foreground text-xl sm:text-2xl">
            {totalUnits.toLocaleString()} units
          </div>
          <p className="text-xs text-muted-foreground">Across all line items</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Work Scope Categories
          </span>
          <div className="font-bold text-foreground text-xl sm:text-2xl">
            {uniqueCategories.length} categories
          </div>
          <p className="text-xs text-muted-foreground">Wall Paneling &amp; Cabinets active</p>
        </div>
      </div>

      {/* Main Interactive Bill Maker Workspace with Supplier Dropdown */}
      <WallPanelingBillMaker requisition={requisition} vendors={suppliers} />
    </div>
  )
}
