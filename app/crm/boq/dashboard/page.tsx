import Link from 'next/link'
import { getBoqDashboardStats } from '@/lib/boq-service'
import {
  FileCheck,
  Clock,
  Truck,
  CheckCircle2,
  FileText,
  ArrowRight,
  ClipboardList,
} from 'lucide-react'

export const revalidate = 0

export default async function BoqDashboardPage() {
  const stats = await getBoqDashboardStats()

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            BOQ Department Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Material Requisition Charts & Quantity Takeoff Management
          </p>
        </div>
        <Link
          href="/crm/boq/assigned-task"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          View Assigned Tasks & Requisitions
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Requisitions
            </span>
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.totalRequisitions}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.approvedQuotationsCount} Approved Detail Quotations
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Draft Takeoffs
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {stats.draftCount}
          </div>
          <p className="text-xs text-muted-foreground">In progress by BOQ</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Submitted to Procurement
            </span>
            <FileCheck className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">
            {stats.submittedCount + stats.inProcurementCount}
          </div>
          <p className="text-xs text-muted-foreground">Sent for purchasing</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fulfilled Requisitions
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {stats.fulfilledCount}
          </div>
          <p className="text-xs text-muted-foreground">Materials delivered</p>
        </div>
      </div>

      {/* Recent Requisitions Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Recent Material Requisitions
            </h2>
            <p className="text-xs text-muted-foreground">
              Latest BOQ charts created for projects
            </p>
          </div>
          <Link
            href="/crm/boq/assigned-task"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center"
          >
            All Assigned Tasks <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Requisition No</th>
                <th className="px-6 py-3 font-medium">Client / Project</th>
                <th className="px-6 py-3 font-medium">Location</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Line Items</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.recentRequisitions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    No requisitions created yet. Visit Assigned Tasks to start
                    building your first Requisition Chart!
                  </td>
                </tr>
              ) : (
                stats.recentRequisitions.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-medium text-foreground">
                      {req.requisitionNo}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {req.lead?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {req.lead?.location || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          req.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-800'
                            : req.status === 'SUBMITTED'
                            ? 'bg-blue-100 text-blue-800'
                            : req.status === 'IN_PROCUREMENT'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {req._count.items} materials
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/crm/boq/builder/${req.leadId}`}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/10 transition-colors"
                      >
                        Open Builder <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
