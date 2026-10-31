import Link from 'next/link'
import { getProcurementDashboardStats } from '@/lib/procurement-service'
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  FileText,
  ArrowRight,
  ClipboardList,
  FolderKanban,
  Wallet,
  CheckSquare,
  Building2,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export const revalidate = 0

export default async function ProcurementDashboardPage() {
  const stats = await getProcurementDashboardStats()

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Procurement Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Procurement Department Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Material purchasing, vendor supply chain & requisition fulfillment
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline" size="sm">
            <Link href="/procurement/projects">
              <FolderKanban className="w-4 h-4 mr-2" />
              Project List
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/procurement/requisitions">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Completed Requisitions
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Requisitions */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Requisitions
            </span>
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.totalRequisitions}
          </div>
          <p className="text-xs text-muted-foreground">Across all stages</p>
        </div>

        {/* Submitted / Awaiting Procurement */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Submitted (Awaiting)
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.submittedCount}
          </div>
          <p className="text-xs text-muted-foreground">Ready for procurement</p>
        </div>

        {/* In Procurement */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In Procurement
            </span>
            <Truck className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {stats.inProcurementCount}
          </div>
          <p className="text-xs text-muted-foreground">Purchasing in progress</p>
        </div>

        {/* Completed Requisitions */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 border-emerald-500/20 bg-emerald-500/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Completed
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.fulfilledCount}
          </div>
          <p className="text-xs text-muted-foreground">Fulfilled & verified</p>
        </div>

        {/* Active Projects */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Projects
            </span>
            <Building2 className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.activeProjectsCount}
          </div>
          <p className="text-xs text-muted-foreground">With active requisitions</p>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Procurement Operations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <Link
            href="/procurement/requisitions"
            className="group rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">Requisitions</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Completed requisitions list & order fulfillment
              </div>
            </div>
          </Link>

          <Link
            href="/procurement/finance"
            className="group rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <Wallet className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">Procurement Finance</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Vendor bills, purchase costs & budgets
              </div>
            </div>
          </Link>

          <Link
            href="/procurement/review-center"
            className="group rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <CheckSquare className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">Review Center</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Material approvals & vendor quotes review
              </div>
            </div>
          </Link>

          <Link
            href="/procurement/projects"
            className="group rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                <FolderKanban className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">Project List</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Ongoing site projects & materials requested
              </div>
            </div>
          </Link>

          <Link
            href="/procurement/settings"
            className="group rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">Settings</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Department preferences & catalog configurations
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Requisitions Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Recent Material Requisitions
            </h2>
            <p className="text-xs text-muted-foreground">
              Latest requisitions received and processed by procurement
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/procurement/requisitions">
              View All Requisitions
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {stats.recentRequisitions.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Package className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-medium text-foreground">No requisitions found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              When the BOQ department submits material requisitions for client projects, they will show up here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase font-medium text-muted-foreground border-b">
                <tr>
                  <th className="px-5 py-3">Requisition #</th>
                  <th className="px-5 py-3">Project / Client</th>
                  <th className="px-5 py-3">Total Items</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Prepared By</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentRequisitions.map((req) => {
                  let statusBadgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  let statusLabel = req.status as string

                  if (req.status === 'FULFILLED') {
                    statusBadgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    statusLabel = 'Completed'
                  } else if (req.status === 'IN_PROCUREMENT') {
                    statusBadgeClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    statusLabel = 'In Procurement'
                  } else if (req.status === 'SUBMITTED') {
                    statusBadgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    statusLabel = 'Submitted'
                  }

                  return (
                    <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-mono font-medium text-xs text-foreground">
                        {req.requisitionNo}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-foreground">{req.lead.name}</div>
                        {req.lead.location && (
                          <div className="text-xs text-muted-foreground">{req.lead.location}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 font-medium">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-xs">
                          <Package className="w-3 h-3 text-muted-foreground" />
                          {req.itemCount} {req.itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {req.createdBy.fullName || 'System'}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {new Date(req.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                          <Link href={`/procurement/requisitions?search=${encodeURIComponent(req.requisitionNo)}`}>
                            View
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
