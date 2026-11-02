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
          ? { status: statusFilter as 'SUBMITTED' | 'IN_PROCUREMENT' | 'FULFILLED' }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 font-medium">
            <Link href="/procurement/dashboard" className="hover:text-foreground transition-colors">
              Procurement
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Billing Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-foreground shrink-0" />
            Billing Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Record supplier bills, compile material records, and dispatch to Accounts for payment adjustment
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/procurement/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Bar: Clean High-Contrast Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Link
          href="/procurement/billing-center?status=SUBMITTED"
          className={`rounded-lg border bg-card p-4 sm:p-5 shadow-xs space-y-2 transition-colors ${
            statusFilter === 'SUBMITTED'
              ? 'border-foreground ring-1 ring-foreground'
              : 'border-border hover:border-foreground/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Awaiting Billing
            </span>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono">
            {submittedCount}
          </div>
          <p className="text-xs text-muted-foreground">Requisitions ready for billing entry</p>
        </Link>

        <Link
          href="/procurement/billing-center?status=IN_PROCUREMENT"
          className={`rounded-lg border bg-card p-4 sm:p-5 shadow-xs space-y-2 transition-colors ${
            statusFilter === 'IN_PROCUREMENT'
              ? 'border-foreground ring-1 ring-foreground'
              : 'border-border hover:border-foreground/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              In Billing / Sourcing
            </span>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono">
            {inProcurementCount}
          </div>
          <p className="text-xs text-muted-foreground">Bills being compiled with memos</p>
        </Link>

        <Link
          href="/procurement/billing-center?status=FULFILLED"
          className={`rounded-lg border bg-card p-4 sm:p-5 shadow-xs space-y-2 transition-colors ${
            statusFilter === 'FULFILLED'
              ? 'border-foreground ring-1 ring-foreground'
              : 'border-border hover:border-foreground/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Completed & Dispatched
            </span>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono">
            {fulfilledCount}
          </div>
          <p className="text-xs text-muted-foreground">Forwarded to Accounts for adjustment</p>
        </Link>
      </div>

      {/* Requisition List Card */}
      <div className="w-full rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Material Requisitions for Billing
            </h2>
            <p className="text-xs text-muted-foreground">
              Select a requisition to record bought materials, rates, and cash memo details
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <form method="GET" action="/procurement/billing-center" className="relative">
              {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={search || ''}
                placeholder="Search REQ # or client..."
                className="pl-8 h-8 text-xs w-full sm:w-56 bg-background border-border"
              />
            </form>

            <div className="flex items-center gap-1 overflow-x-auto">
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
          <div className="p-12 text-center space-y-2">
            <Package className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <h3 className="text-xs font-semibold text-foreground">No requisitions found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No material requisitions match the selected filter.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/50 text-foreground font-semibold border-b border-border text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Requisition #</th>
                  <th className="py-2.5 px-4">Client / Project</th>
                  <th className="py-2.5 px-4">Materials</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Origin / BOQ</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requisitions.map((req) => {
                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border border-border bg-muted/40 text-muted-foreground">
                      {req.status}
                    </span>
                  )

                  if (req.status === 'FULFILLED') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        Completed
                      </span>
                    )
                  } else if (req.status === 'IN_PROCUREMENT') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        In Billing
                      </span>
                    )
                  } else if (req.status === 'SUBMITTED') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        Awaiting Billing
                      </span>
                    )
                  }

                  return (
                    <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-xs text-foreground">
                        {req.requisitionNo}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground text-xs">{req.lead.name}</div>
                        {req.lead.location && (
                          <div className="text-[11px] text-muted-foreground">{req.lead.location}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="font-semibold text-foreground">{req._count.items}</span> items
                      </td>
                      <td className="py-3 px-4">
                        {statusBadge}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {req.createdBy.fullName || 'BOQ Team'}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button asChild size="sm" className="h-7 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 gap-1 font-medium">
                          <Link href={`/procurement/billing-center/${req.id}`}>
                            Open Bill Maker
                            <ArrowRight className="w-3 h-3" />
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
