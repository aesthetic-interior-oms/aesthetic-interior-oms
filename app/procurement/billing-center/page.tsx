import Link from 'next/link'
import {
  Receipt,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Package,
  ArrowRight,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import prisma from '@/lib/prisma'

export const revalidate = 0

interface BillingCenterPageProps {
  searchParams: Promise<{ search?: string; status?: string }>
}

export default async function ProcurementBillingCenterPage({ searchParams }: BillingCenterPageProps) {
  const { search, status: statusFilter } = await searchParams

  const [
    submittedCount,
    inProcurementCount,
    fulfilledCount,
    requisitions,
  ] = await Promise.all([
    prisma.materialRequisition.count({ where: { status: 'SUBMITTED' } }),
    prisma.materialRequisition.count({ where: { status: 'IN_PROCUREMENT' } }),
    prisma.materialRequisition.count({ where: { status: 'FULFILLED' } }),
    prisma.materialRequisition.findMany({
      where: {
        ...(statusFilter && statusFilter !== 'ALL'
          ? { status: statusFilter as any }
          : { status: { in: ['SUBMITTED', 'IN_PROCUREMENT', 'FULFILLED'] } }),
        ...(search
          ? {
              OR: [
                { requisitionNo: { contains: search, mode: 'insensitive' } },
                { lead: { name: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: { id: true, name: true, phone: true, location: true },
        },
        createdBy: {
          select: { fullName: true },
        },
        _count: {
          select: { items: true },
        },
      },
    }),
  ])

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
            <span className="text-foreground font-medium">Billing Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600 shrink-0" />
            Billing Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage material requisitions, verify total quantities, and process billing workflows
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

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/procurement/billing-center?status=SUBMITTED"
          className={`rounded-xl border bg-card p-5 shadow-sm space-y-2 transition-all hover:border-amber-400 ${
            statusFilter === 'SUBMITTED' ? 'ring-2 ring-amber-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Awaiting Billing / Review
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
            {submittedCount}
          </div>
          <p className="text-xs text-muted-foreground">Requisitions ready to bill</p>
        </Link>

        <Link
          href="/procurement/billing-center?status=IN_PROCUREMENT"
          className={`rounded-xl border bg-card p-5 shadow-sm space-y-2 transition-all hover:border-indigo-400 ${
            statusFilter === 'IN_PROCUREMENT' ? 'ring-2 ring-indigo-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In Billing / Procurement
            </span>
            <Receipt className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {inProcurementCount}
          </div>
          <p className="text-xs text-muted-foreground">Billing or sourcing in progress</p>
        </Link>

        <Link
          href="/procurement/billing-center?status=FULFILLED"
          className={`rounded-xl border bg-card p-5 shadow-sm space-y-2 transition-all hover:border-emerald-400 ${
            statusFilter === 'FULFILLED' ? 'ring-2 ring-emerald-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Billed & Completed
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {fulfilledCount}
          </div>
          <p className="text-xs text-muted-foreground">Fully processed requisitions</p>
        </Link>
      </div>

      {/* Requisition List Card */}
      <div className="w-full rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Material Requisitions for Billing
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Select a requisition to view total quantities, items breakdown, and start billing
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <form method="GET" action="/procurement/billing-center" className="relative">
              {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={search || ''}
                placeholder="Search REQ # or project..."
                className="pl-9 h-8 text-xs w-full sm:w-60"
              />
            </form>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <Button asChild variant={!statusFilter || statusFilter === 'ALL' ? 'default' : 'outline'} size="sm" className="h-8 text-xs">
                <Link href={`/procurement/billing-center?status=ALL${search ? `&search=${encodeURIComponent(search)}` : ''}`}>
                  All
                </Link>
              </Button>
              <Button asChild variant={statusFilter === 'SUBMITTED' ? 'default' : 'outline'} size="sm" className="h-8 text-xs">
                <Link href={`/procurement/billing-center?status=SUBMITTED${search ? `&search=${encodeURIComponent(search)}` : ''}`}>
                  Awaiting ({submittedCount})
                </Link>
              </Button>
              <Button asChild variant={statusFilter === 'IN_PROCUREMENT' ? 'default' : 'outline'} size="sm" className="h-8 text-xs">
                <Link href={`/procurement/billing-center?status=IN_PROCUREMENT${search ? `&search=${encodeURIComponent(search)}` : ''}`}>
                  In Progress ({inProcurementCount})
                </Link>
              </Button>
              <Button asChild variant={statusFilter === 'FULFILLED' ? 'default' : 'outline'} size="sm" className="h-8 text-xs">
                <Link href={`/procurement/billing-center?status=FULFILLED${search ? `&search=${encodeURIComponent(search)}` : ''}`}>
                  Completed ({fulfilledCount})
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {requisitions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">No requisitions found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No requisitions match the selected filter. When BOQ prepares requisitions, they will appear here for billing.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase font-medium text-muted-foreground border-b">
                <tr>
                  <th className="px-5 py-3.5">Requisition #</th>
                  <th className="px-5 py-3.5">Project / Client</th>
                  <th className="px-5 py-3.5">Total Items</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Prepared By</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requisitions.map((req) => {
                  let statusBadgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  let statusLabel = req.status as string

                  if (req.status === 'FULFILLED') {
                    statusBadgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    statusLabel = 'Completed'
                  } else if (req.status === 'IN_PROCUREMENT') {
                    statusBadgeClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    statusLabel = 'In Billing'
                  } else if (req.status === 'SUBMITTED') {
                    statusBadgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    statusLabel = 'Awaiting Billing'
                  }

                  return (
                    <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-medium text-xs text-foreground">
                        {req.requisitionNo}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-foreground">{req.lead.name}</div>
                        {req.lead.location && (
                          <div className="text-xs text-muted-foreground">{req.lead.location}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <span className="font-semibold text-foreground">{req._count.items}</span> materials
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {req.createdBy.fullName || 'BOQ Team'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button asChild size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm">
                          <Link href={`/procurement/billing-center/${req.id}`}>
                            Start Billing
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
