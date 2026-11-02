import Link from 'next/link'
import {
  FolderKanban,
  ArrowLeft,
  Building2,
  Package,
  CheckCircle2,
  Phone,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import prisma from '@/lib/prisma'

export const revalidate = 0

export default async function ProcurementProjectsPage() {
  // Fetch projects that have material requisitions
  const leadsWithRequisitions = await prisma.lead.findMany({
    where: {
      materialRequisitions: {
        some: {},
      },
    },
    take: 30,
    orderBy: { updated_at: 'desc' },
    include: {
      materialRequisitions: {
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { items: true },
          },
        },
      },
      assignee: {
        select: { fullName: true },
      },
    },
  })

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
            <span className="text-foreground font-medium">Projects</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-purple-600 shrink-0" />
            Active Procurement Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Client sites with active material requisitions and procurement workflows
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

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Projects with Requisitions
            </span>
            <Building2 className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-foreground">
            {leadsWithRequisitions.length}
          </div>
          <p className="text-xs text-muted-foreground">Sites requiring materials</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Active Requisitions
            </span>
            <Package className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {leadsWithRequisitions.reduce((acc, lead) => acc + lead.materialRequisitions.length, 0)}
          </div>
          <p className="text-xs text-muted-foreground">Logged material lists</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fulfillment Status
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {
              leadsWithRequisitions.filter((lead) =>
                lead.materialRequisitions.some((r) => r.status === 'FULFILLED')
              ).length
            }{' '}
            <span className="text-xs font-normal text-muted-foreground">completed</span>
          </div>
          <p className="text-xs text-muted-foreground">Projects with fulfilled orders</p>
        </div>
      </div>

      {/* Projects Table */}
      <div className="w-full rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Projects with assigned material requisitions
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Review site requisitions and material status per ongoing interior project
          </p>
        </div>

        {leadsWithRequisitions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderKanban className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">No active procurement projects</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Once material requisitions are created for client leads by BOQ, they will be listed here.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase font-medium text-muted-foreground border-b">
                <tr>
                  <th className="px-5 py-3.5">Client / Project</th>
                  <th className="px-5 py-3.5">Contact & Location</th>
                  <th className="px-5 py-3.5">Stage</th>
                  <th className="px-5 py-3.5">Requisitions</th>
                  <th className="px-5 py-3.5">Latest Status</th>
                  <th className="px-5 py-3.5">Assigned To</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leadsWithRequisitions.map((lead) => {
                  const latestReq = lead.materialRequisitions[0]
                  return (
                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground">{lead.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">ID: {lead.id.slice(-6)}</div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5 text-xs">
                          {lead.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                          {lead.location && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{lead.location}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          {lead.stage.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="text-xs">
                          <span className="font-semibold text-foreground">
                            {lead.materialRequisitions.length}
                          </span>{' '}
                          <span className="text-muted-foreground">
                            {lead.materialRequisitions.length === 1 ? 'requisition' : 'requisitions'}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {latestReq ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              latestReq.status === 'FULFILLED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : latestReq.status === 'IN_PROCUREMENT'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {latestReq.status}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No Requisitions</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {lead.assignee?.fullName || 'Unassigned'}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
                          <Link href={`/procurement/billing-center?search=${encodeURIComponent(lead.name)}`}>
                            View Billing
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
