'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FolderKanban,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Phone,
  FileText,
  Boxes,
  CheckSquare,
  Square,
  RefreshCw,
  Loader2,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  Search,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'

type QuotationLineItem = {
  id: string
  description?: string
  quantity?: number
  unit?: string
  rate?: number
  amount?: number
  materials?: string
  sectionId?: string
  areaId?: string
  included?: boolean
  completed?: boolean
}

type QuotationDraft = {
  id: string
  draftKey: string
  quotationType?: string
  grandTotal: number
  status: string
  updatedAt: string
  content: unknown
}

type MaterialRequisitionItem = {
  id: string
  materialName: string
  workCategory: string
  finalQuantity: number
  unit: string
  specifications: string | null
  remarks: string | null
}

type MaterialRequisition = {
  id: string
  requisitionNo: string
  status: string
  notes: string | null
  createdAt: string
  createdBy: { fullName: string }
  items: MaterialRequisitionItem[]
}

type PurchaseOrder = {
  id: string
  poNo: string
  status: string
  totalAmount: number
  supplierName: string | null
  notes: string | null
  accountsNote: string | null
  createdAt: string
  approvedAt: string | null
  createdBy: { fullName: string }
  approvedBy: { fullName: string } | null
  indent?: {
    indentNo: string
    items: Array<{
      id: string
      quantity: number
      unitPrice: number
      total: number
      requisitionItem: { materialName: string; unit: string }
    }>
  }
}

type SiteDeliveryLog = {
  id: string
  challanNo: string | null
  vendorName: string | null
  itemsSummary: string
  quantity: number | null
  unit: string | null
  deliveryDate: string
  condition: 'GOOD' | 'PARTIAL' | 'DAMAGED' | 'REJECTED'
  slipUrl: string | null
  notes: string | null
  receivedBy: { fullName: string }
}

type LeadProject = {
  id: string
  name: string
  location: string | null
  phone: string | null
  stage: string
  subStatus: string | null
  agreementValue: number | null
  created_at: string
  assignments: Array<{ user: { fullName: string } }>
  quotationDrafts: QuotationDraft[]
  materialRequisitions: MaterialRequisition[]
  purchaseOrders: PurchaseOrder[]
  siteDeliveryLogs: SiteDeliveryLog[]
}

export default function SiteEngineerProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const leadId = params?.id
  const router = useRouter()

  const [lead, setLead] = useState<LeadProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'QUOTATION' | 'REQUISITION' | 'DELIVERY'>('QUOTATION')
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL')

  const fetchProjectData = useCallback(async () => {
    if (!leadId) return
    try {
      setRefreshing(true)
      const res = await fetch(`/api/pc/projects/${leadId}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load project details')
      }
      setLead(json.data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error loading project')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchProjectData()
  }, [fetchProjectData])

  // Select active quotation draft (latest active or first)
  const activeDraft = useMemo(() => {
    if (!lead?.quotationDrafts || lead.quotationDrafts.length === 0) return null
    return lead.quotationDrafts[0]
  }, [lead])

  // Extract included quotation line items
  const quotationLineItems = useMemo(() => {
    if (!activeDraft?.content || typeof activeDraft.content !== 'object') return []
    const content = activeDraft.content as Record<string, unknown>
    const items = Array.isArray(content.lineItems) ? (content.lineItems as QuotationLineItem[]) : []
    return items.filter((i) => i.included !== false)
  }, [activeDraft])

  // Progress stats calculation
  const progressStats = useMemo(() => {
    const total = quotationLineItems.length
    const completed = quotationLineItems.filter((i) => i.completed === true).length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, percent }
  }, [quotationLineItems])

  // Toggle Item Completion Checkmark
  const handleToggleItemStatus = async (lineId: string, currentCompleted: boolean) => {
    if (!activeDraft || !leadId) return
    setUpdatingItemId(lineId)
    const nextCompleted = !currentCompleted

    try {
      const response = await fetch(`/api/pc/projects/${leadId}/item-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: activeDraft.id,
          lineId,
          completed: nextCompleted,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to update item status')
      }

      // Optimistically update local state
      setLead((prev) => {
        if (!prev) return prev
        const updatedDrafts = prev.quotationDrafts.map((d) => {
          if (d.id !== activeDraft.id) return d
          const contentObj = (d.content as Record<string, unknown>) ?? {}
          const lineItems = Array.isArray(contentObj.lineItems)
            ? (contentObj.lineItems as QuotationLineItem[])
            : []
          const nextItems = lineItems.map((item) =>
            item.id === lineId ? { ...item, completed: nextCompleted } : item,
          )
          return { ...d, content: { ...contentObj, lineItems: nextItems } }
        })
        return { ...prev, quotationDrafts: updatedDrafts }
      })

      toast.success(nextCompleted ? 'Work item marked as completed ✓' : 'Marked as pending')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update work item status')
    } finally {
      setUpdatingItemId(null)
    }
  }

  // Filtered quotation items
  const filteredLineItems = useMemo(() => {
    return quotationLineItems.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.materials && item.materials.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'COMPLETED' && item.completed === true) ||
        (filterStatus === 'PENDING' && !item.completed)

      return matchesSearch && matchesStatus
    })
  }, [quotationLineItems, searchQuery, filterStatus])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm">Loading project scope and quotation...</p>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold">Project Not Found</h2>
        <p className="text-xs text-muted-foreground">This project could not be found or you do not have permission.</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/site-engineer/projects">Back to Projects</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/site-engineer/projects" className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Projects
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{lead.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FolderKanban className="w-7 h-7 text-blue-600 shrink-0" />
              {lead.name}
            </h1>
            <Badge variant="outline" className="text-xs capitalize font-semibold bg-muted/40">
              {lead.stage.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1">
            {lead.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {lead.location}
              </span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5" /> {lead.phone}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProjectData}
            disabled={refreshing}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button asChild size="sm" className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white h-9">
            <Link href={`/site-engineer/delivery?leadId=${lead.id}`}>
              <Truck className="w-4 h-4" />
              Log Site Delivery
            </Link>
          </Button>
        </div>
      </div>

      {/* ── PROJECT PROGRESS METER (Real-Time Based on Quotation Checklist) ── */}
      <Card className="border-border bg-gradient-to-br from-card to-muted/20 shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Project Site Execution Progress Meter
              </div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {progressStats.completed} of {progressStats.total} work items completed
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {progressStats.percent}%
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-3.5 overflow-hidden p-0.5 border">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out shadow-xs"
              style={{ width: `${progressStats.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>Check items below as work finishes on site to drive the meter forward</span>
            <span className="font-medium text-foreground">
              {progressStats.total - progressStats.completed} items remaining
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          className={`h-10 text-xs sm:text-sm font-medium border-b-2 rounded-none px-4 transition-colors ${
            activeTab === 'QUOTATION'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('QUOTATION')}
        >
          <CheckCircle2 className="w-4 h-4 mr-1.5" />
          Quotation Work Checklist ({quotationLineItems.length})
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`h-10 text-xs sm:text-sm font-medium border-b-2 rounded-none px-4 transition-colors ${
            activeTab === 'REQUISITION'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('REQUISITION')}
        >
          <Boxes className="w-4 h-4 mr-1.5" />
          Material Requisitions ({lead.materialRequisitions?.length || 0})
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`h-10 text-xs sm:text-sm font-medium border-b-2 rounded-none px-4 transition-colors ${
            activeTab === 'DELIVERY'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('DELIVERY')}
        >
          <Truck className="w-4 h-4 mr-1.5" />
          Orders &amp; Deliveries ({lead.siteDeliveryLogs?.length || 0})
        </Button>
      </div>

      {/* ── TAB 1: QUOTATION WORK CHECKLIST ── */}
      {activeTab === 'QUOTATION' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search work scope or materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Button
                variant={filterStatus === 'ALL' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-8"
                onClick={() => setFilterStatus('ALL')}
              >
                All ({quotationLineItems.length})
              </Button>
              <Button
                variant={filterStatus === 'PENDING' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-8 text-amber-700 dark:text-amber-300"
                onClick={() => setFilterStatus('PENDING')}
              >
                Pending ({quotationLineItems.filter((i) => !i.completed).length})
              </Button>
              <Button
                variant={filterStatus === 'COMPLETED' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-8 text-emerald-700 dark:text-emerald-300"
                onClick={() => setFilterStatus('COMPLETED')}
              >
                Completed ({quotationLineItems.filter((i) => i.completed).length})
              </Button>
            </div>
          </div>

          {/* Checklist Items */}
          {filteredLineItems.length === 0 ? (
            <div className="p-12 text-center border rounded-xl bg-card space-y-2">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold">No work items found</h3>
              <p className="text-xs text-muted-foreground">Adjust your search or filter settings.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLineItems.map((item, idx) => {
                const isCompleted = item.completed === true
                const isUpdating = updatingItemId === item.id

                return (
                  <Card
                    key={item.id || idx}
                    className={`transition-all duration-200 border ${
                      isCompleted
                        ? 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-950 dark:bg-emerald-950/10'
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-muted-foreground font-semibold">
                            #{idx + 1}
                          </span>
                          <span
                            className={`text-sm font-semibold leading-tight ${
                              isCompleted ? 'text-foreground line-through opacity-85' : 'text-foreground'
                            }`}
                          >
                            {item.description || 'Custom Product / Work Scope'}
                          </span>
                          {isCompleted ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] h-5 gap-1 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-5 text-amber-700 dark:text-amber-400 border-amber-300">
                              <Clock className="w-3 h-3 mr-1" /> In Progress
                            </Badge>
                          )}
                        </div>

                        {item.materials && (
                          <p className="text-xs text-muted-foreground line-clamp-2 pl-5">
                            {item.materials}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pl-5 pt-0.5">
                          <span>
                            Quantity:{' '}
                            <strong className="text-foreground">
                              {item.quantity ?? 1} {item.unit || 'sqft'}
                            </strong>
                          </span>
                          {item.rate && (
                            <>
                              <span>•</span>
                              <span>
                                Rate: <strong className="text-foreground">৳{item.rate.toLocaleString()}</strong>
                              </span>
                            </>
                          )}
                          {item.amount && (
                            <>
                              <span>•</span>
                              <span>
                                Total: <strong className="text-foreground">৳{item.amount.toLocaleString()}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Checkmark Action Button */}
                      <div className="flex items-center gap-2 shrink-0 sm:self-center">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isUpdating}
                          variant={isCompleted ? 'default' : 'outline'}
                          className={`text-xs h-9 px-4 font-semibold gap-1.5 transition-colors ${
                            isCompleted
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'hover:bg-muted/60 text-foreground'
                          }`}
                          onClick={() => handleToggleItemStatus(item.id, isCompleted)}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isCompleted ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                          <span>{isCompleted ? 'Completed ✓' : 'Mark Complete'}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MATERIAL REQUISITIONS (BOQ) ── */}
      {activeTab === 'REQUISITION' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h3 className="text-base font-bold text-foreground">BOQ Material Requisitions</h3>
              <p className="text-xs text-muted-foreground">
                Official material specifications submitted by the BOQ engineering team for procurement and site execution.
              </p>
            </div>
          </div>

          {(!lead.materialRequisitions || lead.materialRequisitions.length === 0) ? (
            <div className="p-12 text-center border rounded-xl bg-card space-y-2">
              <Boxes className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold">No requisitions yet</h3>
              <p className="text-xs text-muted-foreground">The BOQ team has not submitted requisitions for this project yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lead.materialRequisitions.map((req) => (
                <Card key={req.id} className="border-border bg-card">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-mono font-bold">{req.requisitionNo}</CardTitle>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              req.status === 'FULFILLED'
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : req.status === 'IN_PROCUREMENT'
                                ? 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                : 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                          Created by {req.createdBy.fullName} on {new Date(req.createdAt).toLocaleDateString('en-GB')}
                        </CardDescription>
                      </div>

                      {req.notes && (
                        <div className="text-xs text-muted-foreground max-w-md italic truncate">
                          Note: {req.notes}
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/40 text-muted-foreground font-semibold border-b text-[11px]">
                        <tr>
                          <th className="py-2.5 px-4">#</th>
                          <th className="py-2.5 px-4">Material Name</th>
                          <th className="py-2.5 px-4">Category</th>
                          <th className="py-2.5 px-4">Specifications</th>
                          <th className="py-2.5 px-4 text-right">Final Qty</th>
                          <th className="py-2.5 px-4">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {req.items.map((item, itemIdx) => (
                          <tr key={item.id} className="hover:bg-muted/20">
                            <td className="py-2.5 px-4 font-mono text-muted-foreground text-[11px]">
                              {itemIdx + 1}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-foreground">
                              {item.materialName}
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {item.workCategory.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground max-w-xs truncate">
                              {item.specifications || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                              {item.finalQuantity}
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: PURCHASE ORDERS & SITE DELIVERIES ── */}
      {activeTab === 'DELIVERY' && (
        <div className="space-y-6">
          {/* Section A: Purchase Orders Approved by Accounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Purchased Orders (Approved by Accounts)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Orders procured and verified by Accounts that are scheduled for delivery to this site.
                </p>
              </div>
            </div>

            {(!lead.purchaseOrders || lead.purchaseOrders.length === 0) ? (
              <div className="p-8 text-center border rounded-xl bg-card space-y-1">
                <p className="text-xs text-muted-foreground">No purchase orders generated for this site yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {lead.purchaseOrders.map((po) => (
                  <Card key={po.id} className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-mono font-bold">{po.poNo}</CardTitle>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            po.status === 'APPROVED' || po.status === 'FULFILLED'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-amber-300 bg-amber-50 text-amber-800'
                          }`}
                        >
                          {po.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-muted-foreground">
                        Supplier: <strong>{po.supplierName || 'Direct Vendor'}</strong> • Created by {po.createdBy.fullName}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs pt-0">
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="text-muted-foreground">Total PO Value:</span>
                        <strong className="text-foreground font-mono font-bold">৳{po.totalAmount.toLocaleString()} BDT</strong>
                      </div>
                      {po.approvedBy && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          ✓ Approved by Accounts ({po.approvedBy.fullName})
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Section B: Gate Deliveries Received at Site */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  Site Gate Delivery Receipts
                </h3>
                <p className="text-xs text-muted-foreground">
                  Challans and condition checks logged at the gate by the Site Engineer.
                </p>
              </div>

              <Button asChild size="sm" className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                <Link href={`/site-engineer/delivery?leadId=${lead.id}`}>
                  <PlusCircle className="w-3.5 h-3.5" />
                  Log Gate Delivery
                </Link>
              </Button>
            </div>

            {(!lead.siteDeliveryLogs || lead.siteDeliveryLogs.length === 0) ? (
              <div className="p-8 text-center border rounded-xl bg-card space-y-1">
                <p className="text-xs text-muted-foreground">No material deliveries logged at the gate yet.</p>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden bg-card">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Challan #</th>
                      <th className="py-2.5 px-4">Materials Summary</th>
                      <th className="py-2.5 px-4">Quantity</th>
                      <th className="py-2.5 px-4">Condition</th>
                      <th className="py-2.5 px-4">Received By</th>
                      <th className="py-2.5 px-4">Delivery Date</th>
                      <th className="py-2.5 px-4 text-right">Challan Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lead.siteDeliveryLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4 font-mono font-semibold">{log.challanNo || '—'}</td>
                        <td className="py-2.5 px-4 font-medium text-foreground">{log.itemsSummary}</td>
                        <td className="py-2.5 px-4">
                          {log.quantity ? `${log.quantity} ${log.unit || 'Pcs'}` : '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              log.condition === 'GOOD'
                                ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
                                : log.condition === 'PARTIAL'
                                ? 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30'
                                : 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/30'
                            }`}
                          >
                            {log.condition}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">{log.receivedBy.fullName}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {new Date(log.deliveryDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {log.slipUrl ? (
                            <a
                              href={log.slipUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1"
                            >
                              View Slip <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
