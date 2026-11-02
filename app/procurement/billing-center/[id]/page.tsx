import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import {
  ArrowLeft,
  Package,
  Receipt,
  CheckCircle2,
  Clock,
  Printer,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { revalidatePath } from 'next/cache'

export const revalidate = 0

interface BillingRequisitionDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function BillingRequisitionDetailPage({ params }: BillingRequisitionDetailPageProps) {
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
      amendments: {
        orderBy: { requestedAt: 'desc' },
      },
    },
  })

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
    revalidatePath('/procurement/billing-center')
    revalidatePath('/procurement/dashboard')
  }

  const uniqueCategories = Array.from(new Set(requisition.items.map((i) => i.workCategory)))
  const totalUnits = requisition.items.reduce((sum, item) => sum + (item.finalQuantity || 0), 0)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/procurement/dashboard" className="hover:text-foreground">
              Procurement
            </Link>
            <span>/</span>
            <Link href="/procurement/billing-center" className="hover:text-foreground">
              Billing Center
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{requisition.requisitionNo}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
              {requisition.requisitionNo}
            </h1>
            {requisition.status === 'FULFILLED' ? (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Completed
              </Badge>
            ) : requisition.status === 'IN_PROCUREMENT' ? (
              <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                In Billing
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Awaiting Billing
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Created on {new Date(requisition.createdAt).toLocaleDateString()} by{' '}
            {requisition.createdBy.fullName || 'BOQ Team'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/procurement/billing-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to List
            </Link>
          </Button>

          {requisition.status === 'SUBMITTED' && (
            <form action={handleUpdateStatus}>
              <input type="hidden" name="status" value="IN_PROCUREMENT" />
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm">
                <Receipt className="w-4 h-4" />
                Start Billing
              </Button>
            </form>
          )}

          {requisition.status === 'IN_PROCUREMENT' && (
            <form action={handleUpdateStatus}>
              <input type="hidden" name="status" value="FULFILLED" />
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                Mark Billing Fulfilled
              </Button>
            </form>
          )}

          {requisition.status === 'FULFILLED' && (
            <form action={handleUpdateStatus}>
              <input type="hidden" name="status" value="IN_PROCUREMENT" />
              <Button type="submit" variant="outline" size="sm" className="text-amber-600 border-amber-300">
                Re-open Billing
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Project / Client
          </span>
          <div className="font-semibold text-foreground text-base truncate">{requisition.lead.name}</div>
          <p className="text-xs text-muted-foreground">{requisition.lead.location || 'Location not set'}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Material Items
          </span>
          <div className="font-bold text-foreground text-xl sm:text-2xl">
            {requisition.items.length} items
          </div>
          <p className="text-xs text-muted-foreground">In this requisition</p>
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Required Qty
          </span>
          <div className="font-bold text-indigo-600 dark:text-indigo-400 text-xl sm:text-2xl">
            {totalUnits.toLocaleString()} units
          </div>
          <p className="text-xs text-muted-foreground">Across all line items</p>
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Work Categories
          </span>
          <div className="font-bold text-foreground text-xl sm:text-2xl">
            {uniqueCategories.length} categories
          </div>
          <p className="text-xs text-muted-foreground">Covered in this scope</p>
        </div>
      </div>

      {/* Client & Preparation Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-muted/30 p-4 sm:p-5 rounded-xl border">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Client Details
          </span>
          <div className="font-semibold text-foreground text-sm mt-1">{requisition.lead.name}</div>
          <div className="text-xs text-muted-foreground space-y-0.5 mt-1.5">
            {requisition.lead.phone && <div>Phone: {requisition.lead.phone}</div>}
            {requisition.lead.location && <div>Location: {requisition.lead.location}</div>}
            <div>Project Stage: {requisition.lead.stage}</div>
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Requisition Notes & Origin
          </span>
          <div className="text-xs text-foreground mt-1">
            Prepared by: <span className="font-semibold">{requisition.createdBy.fullName || 'BOQ Team'}</span>
          </div>
          {requisition.notes && (
            <div className="text-xs text-muted-foreground mt-2 bg-background p-3 rounded-lg border">
              <span className="font-medium text-foreground">Notes: </span>
              {requisition.notes}
            </div>
          )}
        </div>
      </div>

      {/* Items Breakdown Table */}
      <div className="w-full rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            Total Requisition Items ({requisition.items.length})
          </h3>
          <span className="text-xs text-muted-foreground">Full material specifications for billing</span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-semibold border-b">
              <tr>
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Material & Specifications</th>
                <th className="px-5 py-3 text-center">Net Qty</th>
                <th className="px-5 py-3 text-center">Wastage %</th>
                <th className="px-5 py-3 text-center font-bold">Final Quantity</th>
                <th className="px-5 py-3">Phase / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requisition.items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 font-mono text-muted-foreground text-xs">{idx + 1}</td>
                  <td className="px-5 py-3 font-medium text-foreground capitalize">
                    {item.workCategory.replace(/_/g, ' ').toLowerCase()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-foreground">{item.materialName}</div>
                    {item.specifications && (
                      <div className="text-xs text-muted-foreground mt-0.5">{item.specifications}</div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center text-muted-foreground">
                    {item.netQuantity} {item.unit}
                  </td>
                  <td className="px-5 py-3 text-center text-muted-foreground">
                    {item.wastagePercent}%
                  </td>
                  <td className="px-5 py-3 text-center font-bold text-foreground">
                    {item.finalQuantity} {item.unit}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">
                    {item.productionPhase && (
                      <span className="font-medium text-foreground block">{item.productionPhase}</span>
                    )}
                    {item.remarks && <span>{item.remarks}</span>}
                    {!item.productionPhase && !item.remarks && <span>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
