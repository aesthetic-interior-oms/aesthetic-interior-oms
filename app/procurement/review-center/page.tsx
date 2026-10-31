import Link from 'next/link'
import {
  CheckSquare,
  ArrowLeft,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  Package,
  ExternalLink,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import prisma from '@/lib/prisma'

export const revalidate = 0

export default async function ProcurementReviewCenterPage() {
  const [
    pendingReviewCount,
    inProcurementCount,
    rejectedCount,
    submittedRequisitions,
  ] = await Promise.all([
    prisma.materialRequisition.count({ where: { status: 'SUBMITTED' } }),
    prisma.materialRequisition.count({ where: { status: 'IN_PROCUREMENT' } }),
    prisma.materialRequisition.count({ where: { status: 'REJECTED' } }),
    prisma.materialRequisition.findMany({
      where: { status: 'SUBMITTED' },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: { id: true, name: true, location: true },
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/procurement/dashboard" className="hover:text-foreground">
              Procurement
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Review Center</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Procurement Review Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Evaluate material requirements, verify vendor specifications & approve procurement items
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

      {/* Review Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Requisition Review
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {pendingReviewCount}
          </div>
          <p className="text-xs text-muted-foreground">Awaiting procurement kickoff</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active In Purchasing
            </span>
            <CheckSquare className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {inProcurementCount}
          </div>
          <p className="text-xs text-muted-foreground">Currently being sourced & delivered</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rejected / Sent Back
            </span>
            <XCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {rejectedCount}
          </div>
          <p className="text-xs text-muted-foreground">Returned to BOQ for specs correction</p>
        </div>
      </div>

      {/* Pending Items List */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="text-base font-semibold text-foreground">
            Requisitions Awaiting Procurement Verification
          </h2>
          <p className="text-xs text-muted-foreground">
            Review specifications before sourcing materials from suppliers
          </p>
        </div>

        {submittedRequisitions.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground">
              No pending requisitions require review right now.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase font-medium text-muted-foreground border-b">
                <tr>
                  <th className="px-5 py-3">Requisition #</th>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Prepared By</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {submittedRequisitions.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono font-medium text-xs text-foreground">
                      {req.requisitionNo}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground">{req.lead.name}</div>
                      {req.lead.location && (
                        <div className="text-xs text-muted-foreground">{req.lead.location}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {req._count.items} items
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {req.createdBy.fullName || 'BOQ Team'}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button asChild size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                        <Link href={`/procurement/requisitions/${req.id}`}>
                          <ExternalLink className="w-3.5 h-3.5" />
                          Review & Source
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
