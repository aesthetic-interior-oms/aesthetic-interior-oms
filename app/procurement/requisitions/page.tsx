'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  RefreshCw,
  Receipt,
  UserRound,
  Search,
  ArrowRight,
  Package,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'

type IndentBillingRecord = {
  id: string
  quantity: string
  unitPrice: string
  total: string
  vendorName: string | null
  billedAt: string
  billedBy: { fullName: string }
  indent: {
    id: string
    indentNo: string
    createdAt: string
    createdBy: { fullName: string }
  }
}

type RequisitionItem = {
  id: string
  workCategory: string
  materialName: string
  specifications: string | null
  netQuantity: number
  wastagePercent: number
  finalQuantity: number
  unit: string
  productionPhase: string | null
  remarks: string | null
  status?: string
  purchasedQuantity?: number | null
  indentItems: IndentBillingRecord[]
}

type IssuedIndent = {
  id: string
  indentNo: string
  vendorName: string | null
  transportCost: string
  otherCosts: string
  subtotal: string
  total: string
  notes: string | null
  createdAt: string
  createdBy: { fullName: string }
  items: Array<{
    id: string
    quantity: string
    unitPrice: string
    total: string
    vendorName?: string | null
    requisitionItemId: string
  }>
}

type Requisition = {
  id: string
  requisitionNo: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  lead: {
    id: string
    name: string
    phone: string | null
    location: string | null
  }
  createdBy: { fullName: string }
  procurementAssignee: { id: string; fullName: string; email?: string } | null
  items: RequisitionItem[]
  indents: IssuedIndent[]
}

type TeamMember = {
  id: string
  fullName: string
  email?: string
}

function getBilledQty(item: RequisitionItem): number {
  return item.indentItems.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
}

function getRemainingQty(item: RequisitionItem): number {
  const billed = getBilledQty(item)
  return Math.max(0, Number((item.finalQuantity - billed).toFixed(3)))
}

export default function ProcurementRequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLeader, setIsLeader] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'IN_PROCUREMENT' | 'FULFILLED'>('ALL')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/procurement/requisitions', { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Failed to load requisitions')
      }
      setRequisitions(json.data ?? [])
      setTeamMembers(json.members ?? [])
      setIsLeader(Boolean(json.leader))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error loading requisitions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Handle Leader Delegating / Assigning Requisition
  const handleAssignMember = async (requisitionId: string, assigneeId: string) => {
    setActionBusy(requisitionId)
    try {
      const response = await fetch('/api/procurement/requisitions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisitionId,
          assigneeId: assigneeId || null,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Assignment update failed')
      }
      toast.success(assigneeId ? 'Procurement task delegated successfully' : 'Assignment cleared')
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assignment failed')
    } finally {
      setActionBusy(null)
    }
  }

  // Filter requisitions
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((req) => {
      const matchStatus =
        statusFilter === 'ALL' || req.status === statusFilter
      const matchSearch =
        !searchTerm ||
        req.requisitionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.lead.location && req.lead.location.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchStatus && matchSearch
    })
  }, [requisitions, statusFilter, searchTerm])

  // Overall Stats
  const stats = useMemo(() => {
    let totalItems = 0
    let totalBilledItems = 0
    let totalIndentsIssued = 0

    requisitions.forEach((r) => {
      totalItems += r.items.length
      totalBilledItems += r.items.filter((i) => getBilledQty(i) >= i.finalQuantity - 0.0001).length
      totalIndentsIssued += r.indents.length
    })

    return {
      totalReqs: requisitions.length,
      totalItems,
      unbilledItems: totalItems - totalBilledItems,
      totalIndentsIssued,
    }
  }, [requisitions])

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 font-medium">
            <Link href="/procurement/dashboard" className="hover:text-foreground transition-colors">
              Procurement
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Requisitions &amp; Indents</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Receipt className="w-7 h-7 text-primary shrink-0" />
              Requisitions &amp; Indents
            </h1>
            {isLeader ? (
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800 gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Leader Oversight &amp; Delegation
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <UserCheck className="w-3.5 h-3.5" />
                Team Member View
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Delegate incoming material requisitions and open each requisition&apos;s dedicated material list &amp; billing page.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="h-9"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/procurement/billing-center">
              Billing Center
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              Total Requisitions
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">{stats.totalReqs}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            In system workflow
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              Total Material Items
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">{stats.totalItems}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Across all requisitions
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              Pending / Unbilled Items
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-amber-600">
              {stats.unbilledItems}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Eligible for upcoming indents
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              Indents Issued
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-600">
              {stats.totalIndentsIssued}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sequential bills generated
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border rounded-lg p-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requisition #, client, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'SUBMITTED', 'IN_PROCUREMENT', 'FULFILLED'] as const).map((filterKey) => {
            const labels = {
              ALL: 'All Statuses',
              SUBMITTED: 'Awaiting Billing',
              IN_PROCUREMENT: 'In Procurement',
              FULFILLED: 'Fulfilled / Billed',
            }
            return (
              <Button
                key={filterKey}
                variant={statusFilter === filterKey ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(filterKey)}
                className="h-8 text-xs shrink-0"
              >
                {labels[filterKey]}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Requisitions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-xl border p-12 text-center text-muted-foreground bg-card">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm">Loading material requisitions &amp; indents...</p>
          </div>
        ) : filteredRequisitions.length === 0 ? (
          <div className="rounded-xl border p-12 text-center text-muted-foreground bg-card">
            <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">No requisitions found</p>
            <p className="text-xs mt-1">
              {isLeader
                ? 'No incoming requisitions match your search criteria.'
                : 'No requisitions are assigned to you currently.'}
            </p>
          </div>
        ) : (
          filteredRequisitions.map((req) => {
            const unbilledCount = req.items.filter((i) => getRemainingQty(i) > 0).length
            const billedCount = req.items.filter((i) => getBilledQty(i) > 0).length
            const indentsCount = req.indents.length

            return (
              <div
                key={req.id}
                className="rounded-xl border bg-card shadow-xs overflow-hidden transition-all hover:border-foreground/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/procurement/billing-center/${req.id}`}
                          className="font-mono font-bold text-sm sm:text-base text-foreground hover:underline"
                        >
                          {req.requisitionNo}
                        </Link>
                        <span className="text-muted-foreground">·</span>
                        <span className="font-semibold text-sm text-foreground">
                          {req.lead.name}
                        </span>

                        <Badge
                          variant="secondary"
                          className={
                            req.status === 'FULFILLED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                              : req.status === 'IN_PROCUREMENT'
                              ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                          }
                        >
                          {req.status === 'FULFILLED'
                            ? 'Fulfilled'
                            : req.status === 'IN_PROCUREMENT'
                            ? 'In Procurement'
                            : 'Submitted'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span>{req.lead.location || 'Location not specified'}</span>
                        <span>•</span>
                        <span>
                          <strong className="text-foreground">{req.items.length}</strong> materials
                          ({unbilledCount} unbilled, {billedCount} billed, {indentsCount} indents)
                        </span>
                        <span>•</span>
                        <span>
                          Created by{' '}
                          <span className="font-medium text-foreground">
                            {req.createdBy.fullName}
                          </span>{' '}
                          on {new Date(req.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delegation / Assignment Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    {isLeader ? (
                      <div className="flex items-center gap-2 bg-background border rounded-lg px-2.5 py-1.5 shadow-2xs">
                        <UserRound className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                          Delegated to:
                        </span>
                        <select
                          className="h-7 text-xs bg-transparent border-0 font-medium text-foreground focus:ring-0 focus:outline-none cursor-pointer"
                          value={req.procurementAssignee?.id ?? ''}
                          onChange={(e) => void handleAssignMember(req.id, e.target.value)}
                          disabled={actionBusy === req.id}
                        >
                          <option value="">Unassigned (Leader Queue)</option>
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.fullName}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="text-xs bg-muted/50 border rounded-md px-2.5 py-1 text-muted-foreground flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Assigned to:{' '}
                          <span className="font-semibold text-foreground">
                            {req.procurementAssignee?.fullName ?? 'You'}
                          </span>
                        </span>
                      </div>
                    )}

                    <Button
                      asChild
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                    >
                      <Link href={`/procurement/billing-center/${req.id}`}>
                        Open Material List
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
