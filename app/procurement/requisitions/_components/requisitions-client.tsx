'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Package,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Eye,
  Calendar,
  Layers,
  ArrowUpDown,
  Printer,
  FileCheck2,
  AlertCircle,
  Building2,
  Phone,
  ExternalLink,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { updateRequisitionStatus } from '@/lib/procurement-service'
import type { ProcurementRequisitionItem } from '@/lib/procurement-service'

interface RequisitionsClientProps {
  initialRequisitions: ProcurementRequisitionItem[]
  defaultStatus?: string
}

export function RequisitionsClient({
  initialRequisitions,
  defaultStatus = 'FULFILLED',
}: RequisitionsClientProps) {
  const [requisitions, setRequisitions] = useState<ProcurementRequisitionItem[]>(initialRequisitions)
  const [activeTab, setActiveTab] = useState<string>(defaultStatus)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReq, setSelectedReq] = useState<ProcurementRequisitionItem | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  // Filter based on active tab & search query
  const filteredRequisitions = requisitions.filter((req) => {
    // Status tab filter
    const matchesStatus =
      activeTab === 'ALL'
        ? true
        : req.status === activeTab

    if (!matchesStatus) return false

    // Search query filter
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const matchesNo = req.requisitionNo.toLowerCase().includes(q)
    const matchesLead = req.lead.name.toLowerCase().includes(q)
    const matchesPhone = req.lead.phone?.toLowerCase().includes(q) ?? false
    const matchesNotes = req.notes?.toLowerCase().includes(q) ?? false
    const matchesItems = req.items.some(
      (item) =>
        item.materialName.toLowerCase().includes(q) ||
        (item.specifications && item.specifications.toLowerCase().includes(q)) ||
        item.workCategory.toLowerCase().includes(q)
    )

    return matchesNo || matchesLead || matchesPhone || matchesNotes || matchesItems
  })

  // Count metrics for tabs
  const completedCount = requisitions.filter((r) => r.status === 'FULFILLED').length
  const inProcurementCount = requisitions.filter((r) => r.status === 'IN_PROCUREMENT').length
  const submittedCount = requisitions.filter((r) => r.status === 'SUBMITTED').length

  const handleStatusChange = (requisitionId: string, nextStatus: 'IN_PROCUREMENT' | 'FULFILLED') => {
    setActionError(null)
    startTransition(async () => {
      const res = await updateRequisitionStatus(requisitionId, nextStatus)
      if (res.success) {
        setRequisitions((prev) =>
          prev.map((r) => (r.id === requisitionId ? { ...r, status: nextStatus, updatedAt: new Date() } : r))
        )
        if (selectedReq && selectedReq.id === requisitionId) {
          setSelectedReq((prev) => (prev ? { ...prev, status: nextStatus, updatedAt: new Date() } : null))
        }
      } else {
        setActionError(res.error || 'Failed to update status.')
      }
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Top Controls: Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl border">
          <button
            type="button"
            onClick={() => setActiveTab('FULFILLED')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'FULFILLED'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Completed Requisitions
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'FULFILLED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {completedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('IN_PROCUREMENT')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'IN_PROCUREMENT'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-indigo-500" />
            In Procurement
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'IN_PROCUREMENT'
                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {inProcurementCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SUBMITTED')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'SUBMITTED'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Submitted
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'SUBMITTED'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {submittedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'ALL'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Requisitions
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground">
              {requisitions.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by REQ #, project or material..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {actionError && (
        <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {actionError}
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {filteredRequisitions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">
              {activeTab === 'FULFILLED'
                ? 'No completed requisitions found'
                : 'No requisitions found'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? 'No requisitions matched your search criteria.'
                : activeTab === 'FULFILLED'
                ? 'Requisitions marked as fulfilled by the procurement department will be listed here.'
                : 'There are currently no requisitions in this category.'}
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
                  <th className="px-5 py-3">Categories</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Completed / Updated</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequisitions.map((req) => {
                  const uniqueCategories = Array.from(
                    new Set(req.items.map((i) => i.workCategory.replace(/_/g, ' ')))
                  )

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedReq(req)}
                    >
                      <td className="px-5 py-3 font-mono font-medium text-xs text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{req.requisitionNo}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <div className="font-medium text-foreground">{req.lead.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {req.lead.phone && <span>{req.lead.phone}</span>}
                          {req.lead.location && <span>• {req.lead.location}</span>}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <span className="font-semibold text-foreground">
                          {req.items.length}
                        </span>{' '}
                        <span className="text-xs text-muted-foreground">
                          {req.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {uniqueCategories.slice(0, 2).map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border capitalize"
                            >
                              {cat.toLowerCase()}
                            </span>
                          ))}
                          {uniqueCategories.length > 2 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground bg-muted">
                              +{uniqueCategories.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        {req.status === 'FULFILLED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : req.status === 'IN_PROCUREMENT' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                            <Truck className="w-3 h-3" />
                            In Procurement
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <Clock className="w-3 h-3" />
                            Submitted
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {new Date(req.updatedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button asChild size="sm" variant="default" className="h-8 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Link href={`/procurement/requisitions/${req.id}`}>
                              <ExternalLink className="w-3.5 h-3.5" />
                              Manage
                            </Link>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => setSelectedReq(req)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Quick View
                          </Button>

                          {req.status !== 'FULFILLED' && (
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              disabled={isPending}
                              onClick={() => handleStatusChange(req.id, 'FULFILLED')}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark Fulfilled
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Requisition Detail Dialog */}
      <Dialog open={Boolean(selectedReq)} onOpenChange={(open) => !open && setSelectedReq(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedReq && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-lg font-bold font-mono">
                        {selectedReq.requisitionNo}
                      </DialogTitle>
                      {selectedReq.status === 'FULFILLED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed Requisition
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          <Truck className="w-3.5 h-3.5" />
                          {selectedReq.status}
                        </span>
                      )}
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(selectedReq.createdAt).toLocaleString()} • Last updated:{' '}
                      {new Date(selectedReq.updatedAt).toLocaleString()}
                    </DialogDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                      <Link href={`/procurement/requisitions/${selectedReq.id}`}>
                        <ExternalLink className="w-3.5 h-3.5" />
                        Procurement Workspace
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-xs gap-1.5">
                      <Printer className="w-3.5 h-3.5" />
                      Print Slip
                    </Button>
                    {selectedReq.status !== 'FULFILLED' ? (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        disabled={isPending}
                        onClick={() => handleStatusChange(selectedReq.id, 'FULFILLED')}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete Requisition
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
                        disabled={isPending}
                        onClick={() => handleStatusChange(selectedReq.id, 'IN_PROCUREMENT')}
                      >
                        Re-open to In Procurement
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Project & Creator Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Project / Client Information
                  </span>
                  <div className="font-semibold text-foreground text-sm mt-1">{selectedReq.lead.name}</div>
                  <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                    {selectedReq.lead.phone && <div>Phone: {selectedReq.lead.phone}</div>}
                    {selectedReq.lead.location && <div>Location: {selectedReq.lead.location}</div>}
                    <div>Stage: {selectedReq.lead.stage}</div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Preparation & Notes
                  </span>
                  <div className="text-xs text-foreground mt-1">
                    Prepared by: <span className="font-semibold">{selectedReq.createdBy.fullName || 'System'}</span>
                  </div>
                  {selectedReq.notes && (
                    <div className="text-xs text-muted-foreground mt-1.5 bg-background p-2 rounded border">
                      <span className="font-medium text-foreground">Notes: </span>
                      {selectedReq.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Material Requisition Items ({selectedReq.items.length})
                  </h4>
                </div>

                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 text-muted-foreground uppercase font-semibold border-b">
                      <tr>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">Material & Spec</th>
                        <th className="px-4 py-2.5 text-center">Net Qty</th>
                        <th className="px-4 py-2.5 text-center">Wastage</th>
                        <th className="px-4 py-2.5 text-center font-bold">Final Qty</th>
                        <th className="px-4 py-2.5">Phase / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedReq.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium text-foreground capitalize">
                            {item.workCategory.replace(/_/g, ' ').toLowerCase()}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-foreground">{item.materialName}</div>
                            {item.specifications && (
                              <div className="text-[11px] text-muted-foreground">
                                {item.specifications}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">
                            {item.netQuantity} {item.unit}
                          </td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">
                            {item.wastagePercent}%
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-foreground">
                            {item.finalQuantity} {item.unit}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {item.productionPhase && (
                              <span className="font-medium text-foreground block">
                                {item.productionPhase}
                              </span>
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
