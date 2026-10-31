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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Procurement Project List
          </h1>
          <p className="text-sm text-muted-foreground">
            All client and site projects requiring material purchasing and site deliveries
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

      {/* Projects Grid / Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Active Projects</h2>
            <p className="text-xs text-muted-foreground">
              Projects with assigned material requisitions
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
            {leadsWithRequisitions.length} Projects
          </span>
        </div>

        {leadsWithRequisitions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderKanban className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">No projects found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Once material requisitions are created for client leads by BOQ, they will be listed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase font-medium text-muted-foreground border-b">
                <tr>
                  <th className="px-5 py-3">Project / Client</th>
                  <th className="px-5 py-3">Contact & Location</th>
                  <th className="px-5 py-3">Requisitions</th>
                  <th className="px-5 py-3">Latest Status</th>
                  <th className="px-5 py-3">Lead Owner</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leadsWithRequisitions.map((lead) => {
                  const latestReq = lead.materialRequisitions[0]
                  const hasCompleted = lead.materialRequisitions.some((r) => r.status === 'FULFILLED')

                  return (
                    <tr key={lead.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-foreground">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">Stage: {lead.stage}</div>
                      </td>

                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {lead.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.location && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {lead.location}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <span className="font-medium text-foreground">
                          {lead.materialRequisitions.length}
                        </span>{' '}
                        <span className="text-xs text-muted-foreground">
                          {lead.materialRequisitions.length === 1 ? 'requisition' : 'requisitions'}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        {latestReq ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              latestReq.status === 'FULFILLED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : latestReq.status === 'IN_PROCUREMENT'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {latestReq.status === 'FULFILLED' && <CheckCircle2 className="w-3 h-3" />}
                            {latestReq.status}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No Requisitions</span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {lead.assignee?.fullName || 'Unassigned'}
                      </td>

                      <td className="px-5 py-3 text-right">
                        <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
                          <Link href={`/procurement/requisitions?search=${encodeURIComponent(lead.name)}`}>
                            View Requisitions
                            <ArrowRight className="w-3 h-3 ml-1" />
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
