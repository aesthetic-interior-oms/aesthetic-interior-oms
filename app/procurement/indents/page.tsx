'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { MaterialStatusBadge } from '@/components/procurement/material-status-badge'

type IndentItemRow = {
  id: string
  requisitionItemId: string
  quantity: string | number
  unitPrice: string | number
  total: string | number
  vendorName: string | null
  requisitionItem: {
    id: string
    materialName: string
    specifications: string | null
    workCategory: string
    finalQuantity: number
    unit: string
    status?: string
    purchasedQuantity?: number | null
  }
}

type IndentRecord = {
  id: string
  indentNo: string
  requisitionId: string
  leadId: string
  status: string
  vendorName: string | null
  transportCost: string | number
  otherCosts: string | number
  subtotal: string | number
  total: string | number
  notes: string | null
  createdAt: string
  lead: {
    id: string
    name: string
    phone: string | null
    location: string | null
  }
  requisition: {
    id: string
    requisitionNo: string
    status: string
  }
  createdBy: {
    id: string
    fullName: string
  }
  purchaseOrder: {
    id: string
    poNo: string
    status: string
    totalAmount: number
  } | null
  items: IndentItemRow[]
}

export default function ProcurementProjectIndentsPage() {
  const [indents, setIndents] = useState<IndentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({})
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)

  const [editingIndent, setEditingIndent] = useState<IndentRecord | null>(null)
  const [editForm, setEditForm] = useState<{
    vendorName: string
    transportCost: string
    otherCosts: string
    notes: string
    items: Array<{
      id: string
      materialName: string
      unit: string
      quantity: string
      unitPrice: string
      vendorName: string
    }>
  } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [completingIndent, setCompletingIndent] = useState<IndentRecord | null>(null)
  const [verifyItems, setVerifyItems] = useState<
    Array<{
      indentItemId: string
      materialName: string
      unit: string
      requestedQty: number
      actualQuantity: string
      unitPrice: number
      purchased: boolean
    }>
  >([])
  const [verifyNotes, setVerifyNotes] = useState('')
  const [submittingVerify, setSubmittingVerify] = useState(false)

  const fetchIndents = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const res = await fetch('/api/procurement/indents', { cache: 'no-store' })
      const json = (await res.json()) as {
        success?: boolean
        data?: IndentRecord[]
        error?: string
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load indents')
      }

      setIndents(Array.isArray(json.data) ? json.data : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load indents')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchIndents()
  }, [fetchIndents])

  const filteredIndents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return indents
    return indents.filter((ind) => {
      if (ind.indentNo.toLowerCase().includes(q)) return true
      if (ind.lead?.name?.toLowerCase().includes(q)) return true
      if (ind.lead?.location?.toLowerCase().includes(q)) return true
      if (ind.vendorName?.toLowerCase().includes(q)) return true
      return ind.items.some(
        (item) =>
          item.requisitionItem.materialName.toLowerCase().includes(q) ||
          (item.vendorName || '').toLowerCase().includes(q),
      )
    })
  }, [indents, searchQuery])

  // Group indents by Project (leadId)
  const projectGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        lead: IndentRecord['lead']
        indents: IndentRecord[]
        totalAmount: number
        totalItems: number
      }
    >()

    for (const ind of filteredIndents) {
      let group = map.get(ind.leadId)
      if (!group) {
        group = {
          lead: ind.lead,
          indents: [],
          totalAmount: 0,
          totalItems: 0,
        }
        map.set(ind.leadId, group)
      }
      group.indents.push(ind)
      group.totalAmount += Number(ind.total || 0)
      group.totalItems += ind.items.length
    }

    return Array.from(map.values())
  }, [filteredIndents])

  const summary = useMemo(() => {
    const totalAmount = filteredIndents.reduce((s, ind) => s + Number(ind.total || 0), 0)
    const totalItems = filteredIndents.reduce((s, ind) => s + ind.items.length, 0)
    return {
      projects: projectGroups.length,
      indents: filteredIndents.length,
      items: totalItems,
      totalAmount,
    }
  }, [filteredIndents, projectGroups])

  const openEditModal = (indent: IndentRecord) => {
    setEditingIndent(indent)
    setEditForm({
      vendorName: indent.vendorName ?? '',
      transportCost: String(Number(indent.transportCost ?? 0)),
      otherCosts: String(Number(indent.otherCosts ?? 0)),
      notes: indent.notes ?? '',
      items: indent.items.map((row) => ({
        id: row.id,
        materialName: row.requisitionItem.materialName,
        unit: row.requisitionItem.unit,
        quantity: String(Number(row.quantity)),
        unitPrice: String(Number(row.unitPrice)),
        vendorName: row.vendorName ?? indent.vendorName ?? '',
      })),
    })
  }

  const handleSaveEdit = async () => {
    if (!editingIndent || !editForm) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/procurement/indents/${editingIndent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EDIT',
          vendorName: editForm.vendorName.trim() || null,
          transportCost: Number(editForm.transportCost || 0),
          otherCosts: Number(editForm.otherCosts || 0),
          notes: editForm.notes.trim() || null,
          items: editForm.items.map((item) => ({
            id: item.id,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            vendorName: item.vendorName.trim() || null,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update indent')
      }
      toast.success(`Indent ${editingIndent.indentNo} updated`)
      setEditingIndent(null)
      setEditForm(null)
      await fetchIndents(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update indent')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleRemoveItem = async (indentId: string, itemId: string, materialName: string) => {
    setRemovingItemId(itemId)
    try {
      const res = await fetch(`/api/procurement/indents/${indentId}/items/${itemId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to remove product from indent')
      }
      toast.success(`Removed "${materialName}" from indent and unlocked it in requisition list`)
      await fetchIndents(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove product')
    } finally {
      setRemovingItemId(null)
    }
  }

  const openVerifyModal = (indent: IndentRecord) => {
    setCompletingIndent(indent)
    setVerifyNotes('')
    setVerifyItems(
      indent.items.map((row) => ({
        indentItemId: row.id,
        materialName: row.requisitionItem.materialName,
        unit: row.requisitionItem.unit,
        requestedQty: Number(row.quantity),
        actualQuantity: String(Number(row.quantity)),
        unitPrice: Number(row.unitPrice),
        purchased: true,
      })),
    )
  }

  const handleCompletePurchase = async () => {
    if (!completingIndent) return
    setSubmittingVerify(true)
    try {
      const payload = {
        action: completingIndent.purchaseOrder ? 'FULFILLED' : 'COMPLETE_PURCHASE',
        notes: verifyNotes.trim() || undefined,
        verifiedItems: verifyItems.map((item) => ({
          indentItemId: item.indentItemId,
          purchased: item.purchased,
          actualQuantity: item.purchased ? Number(item.actualQuantity) : undefined,
        })),
      }
      const url = completingIndent.purchaseOrder
        ? `/api/procurement/purchase-orders/${completingIndent.purchaseOrder.id}`
        : `/api/procurement/indents/${completingIndent.id}`

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to complete purchase')
      }
      toast.success('Purchase Order completed & material statuses updated!')
      setCompletingIndent(null)
      setVerifyItems([])
      await fetchIndents(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete purchase')
    } finally {
      setSubmittingVerify(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Project-Wise Indents &amp; Materials
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            View all projects and their indent materials, supplier names, unit prices, total prices, and edit or remove products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/procurement/requisitions">
            <Button variant="outline" size="sm" className="text-xs h-9">
              Requisitions &amp; Billing
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5"
            onClick={() => void fetchIndents(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Projects with Indents</p>
            <p className="text-2xl font-bold mt-1">{summary.projects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Indents</p>
            <p className="text-2xl font-bold mt-1">{summary.indents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Included Materials</p>
            <p className="text-2xl font-bold mt-1">{summary.items}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Grand Total Indent Amount</p>
            <p className="text-2xl font-bold font-mono text-primary mt-1">
              ৳{summary.totalAmount.toLocaleString('en-BD')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by project, indent no, supplier, or material..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>

      {/* Project-wise Indents List */}
      {loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading project indents...
        </div>
      ) : projectGroups.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-2">
            <Package className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-sm font-semibold">No indents found</h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery
                ? 'Try clearing your search filter.'
                : 'Select materials from a project requisition in the Billing Center to create an indent.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {projectGroups.map((group) => {
            const isCollapsed = Boolean(collapsedProjects[group.lead.id])
            return (
              <Card key={group.lead.id} className="overflow-hidden border-border">
                {/* Project Header */}
                <div className="p-4 bg-muted/30 border-b flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedProjects((prev) => ({
                        ...prev,
                        [group.lead.id]: !prev[group.lead.id],
                      }))
                    }
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-foreground truncate">
                          {group.lead.name}
                        </h2>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {group.indents.length} {group.indents.length === 1 ? 'Indent' : 'Indents'} • {group.totalItems} Materials
                        </Badge>
                      </div>
                      {group.lead.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {group.lead.location}
                        </p>
                      )}
                    </div>
                    <div className="text-muted-foreground ml-2">
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Project Total Indents
                      </p>
                      <p className="text-lg font-bold font-mono text-foreground">
                        ৳{group.totalAmount.toLocaleString('en-BD')}
                      </p>
                    </div>
                    {group.indents[0]?.requisition?.id && (
                      <Link href={`/procurement/billing-center/${group.indents[0].requisition.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                          Billing Center
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Indents under this project */}
                {!isCollapsed && (
                  <CardContent className="p-4 space-y-4 bg-card">
                    {group.indents.map((indent) => (
                      <div key={indent.id} className="rounded-lg border border-border overflow-hidden">
                        <div className="p-3 bg-muted/20 border-b flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-xs text-foreground flex items-center gap-1">
                                <Receipt className="w-3.5 h-3.5 text-primary" />
                                {indent.indentNo}
                              </span>
                              <Link
                                href={`/procurement/billing-center/${indent.requisition.id}`}
                                className="text-[11px] font-mono text-blue-600 hover:underline"
                              >
                                {indent.requisition.requisitionNo}
                              </Link>
                              {indent.purchaseOrder && (
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {indent.purchaseOrder.poNo} ({indent.purchaseOrder.status.replace(/_/g, ' ')})
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              By <strong>{indent.createdBy.fullName}</strong> on{' '}
                              {new Date(indent.createdAt).toLocaleDateString('en-GB')} • Primary Supplier:{' '}
                              <strong className="text-foreground">{indent.vendorName || 'Multiple / Direct'}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] text-muted-foreground block">Total Indent Amount</span>
                              <span className="font-mono text-sm font-bold text-foreground">
                                ৳{Number(indent.total).toLocaleString('en-BD')}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => openEditModal(indent)}
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </Button>
                            {indent.purchaseOrder?.status !== 'FULFILLED' && indent.items.length > 0 && (
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => openVerifyModal(indent)}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Verify &amp; Complete Purchase
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b text-[11px]">
                              <tr>
                                <th className="py-2 px-3">Materials</th>
                                <th className="py-2 px-3">Supplier Name</th>
                                <th className="py-2 px-3 text-right">Qty</th>
                                <th className="py-2 px-3 text-right">Unit Price</th>
                                <th className="py-2 px-3 text-right">Total Price</th>
                                <th className="py-2 px-3 text-center w-14">Remove</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {indent.items.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-4 text-center text-muted-foreground italic">
                                    No products in this indent.
                                  </td>
                                </tr>
                              ) : (
                                indent.items.map((row) => (
                                  <tr key={row.id} className="hover:bg-muted/20">
                                    <td className="py-2 px-3">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="font-semibold text-foreground">
                                          {row.requisitionItem.materialName}
                                        </span>
                                        <MaterialStatusBadge
                                          status={row.requisitionItem.status || 'BILLED'}
                                          purchasedQuantity={row.requisitionItem.purchasedQuantity}
                                          unit={row.requisitionItem.unit}
                                        />
                                      </div>
                                      {row.requisitionItem.specifications && (
                                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                                          {row.requisitionItem.specifications}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-foreground">
                                      {row.vendorName || indent.vendorName || '—'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono">
                                      {Number(row.quantity)} {row.requisitionItem.unit}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono">
                                      ৳{Number(row.unitPrice).toLocaleString('en-BD')}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                                      ৳{Number(row.total).toLocaleString('en-BD')}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={removingItemId === row.id}
                                        title="Remove product from indent"
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() =>
                                          void handleRemoveItem(
                                            indent.id,
                                            row.id,
                                            row.requisitionItem.materialName,
                                          )
                                        }
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Indent Modal */}
      <Dialog
        open={Boolean(editingIndent && editForm)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingIndent(null)
            setEditForm(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Edit Indent {editingIndent?.indentNo}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update supplier names, quantities, unit prices, or transport/other costs.
            </DialogDescription>
          </DialogHeader>

          {editForm && (
            <div className="space-y-4 overflow-y-auto pr-1 py-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Primary Supplier</Label>
                  <Input
                    value={editForm.vendorName}
                    onChange={(e) => setEditForm({ ...editForm, vendorName: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Transport Cost (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={editForm.transportCost}
                    onChange={(e) => setEditForm({ ...editForm, transportCost: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Other Costs (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={editForm.otherCosts}
                    onChange={(e) => setEditForm({ ...editForm, otherCosts: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/50 border-b text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Material</th>
                      <th className="py-2 px-2">Supplier Name</th>
                      <th className="py-2 px-2 w-24">Qty</th>
                      <th className="py-2 px-2 w-28 text-right">Unit Price (৳)</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {editForm.items.map((item, iIdx) => {
                      const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
                      return (
                        <tr key={item.id}>
                          <td className="py-2 px-3 font-medium">
                            {item.materialName}
                            <span className="text-[10px] text-muted-foreground ml-1">({item.unit})</span>
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              value={item.vendorName}
                              onChange={(e) => {
                                const next = [...editForm.items]
                                next[iIdx] = { ...item, vendorName: e.target.value }
                                setEditForm({ ...editForm, items: next })
                              }}
                              className="h-7 text-xs"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              min="0.001"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => {
                                const next = [...editForm.items]
                                next[iIdx] = { ...item, quantity: e.target.value }
                                setEditForm({ ...editForm, items: next })
                              }}
                              className="h-7 text-xs font-mono"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const next = [...editForm.items]
                                next[iIdx] = { ...item, unitPrice: e.target.value }
                                setEditForm({ ...editForm, items: next })
                              }}
                              className="h-7 text-xs font-mono text-right"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold">
                            ৳{lineTotal.toLocaleString('en-BD')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end font-mono text-sm font-bold pt-1">
                New Total Indent Amount: ৳
                {(
                  editForm.items.reduce(
                    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
                    0,
                  ) +
                  (Number(editForm.transportCost) || 0) +
                  (Number(editForm.otherCosts) || 0)
                ).toLocaleString('en-BD')}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingIndent(null)
                setEditForm(null)
              }}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void handleSaveEdit()} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify & Complete Purchase Modal */}
      <Dialog
        open={Boolean(completingIndent)}
        onOpenChange={(open) => {
          if (!open) {
            setCompletingIndent(null)
            setVerifyItems([])
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Verify &amp; Complete Purchase — {completingIndent?.purchaseOrder?.poNo || completingIndent?.indentNo}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verify purchased materials. Unchecked items are removed from the Indent/PO and returned to the Requisition List. Quantities can be adjusted lower or higher.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto pr-1 py-2 text-xs">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/50 border-b text-[11px]">
                  <tr>
                    <th className="py-2 px-3 w-20 text-center">Purchased?</th>
                    <th className="py-2 px-3">Material</th>
                    <th className="py-2 px-2 text-right">Billed Qty</th>
                    <th className="py-2 px-2 w-28">Actual Qty</th>
                    <th className="py-2 px-2 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Final Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {verifyItems.map((item, idx) => {
                    const qtyNum = Number(item.actualQuantity) || 0
                    const lineTotal = item.purchased ? qtyNum * item.unitPrice : 0
                    return (
                      <tr
                        key={item.indentItemId}
                        className={item.purchased ? '' : 'opacity-50 bg-muted/30'}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.purchased}
                            onChange={(e) => {
                              const next = [...verifyItems]
                              next[idx] = { ...item, purchased: e.target.checked }
                              setVerifyItems(next)
                            }}
                            className="h-4 w-4 rounded border-border cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-foreground">{item.materialName}</div>
                          {!item.purchased && (
                            <div className="text-[10px] text-amber-600 font-medium">
                              Will be removed &amp; returned to Requisition List
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                          {item.requestedQty} {item.unit}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0.001"
                              step="any"
                              disabled={!item.purchased}
                              value={item.actualQuantity}
                              onChange={(e) => {
                                const next = [...verifyItems]
                                next[idx] = { ...item, actualQuantity: e.target.value }
                                setVerifyItems(next)
                              }}
                              className="h-7 text-xs font-mono w-20"
                            />
                            <span className="text-[10px] text-muted-foreground">{item.unit}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          ৳{item.unitPrice.toLocaleString('en-BD')}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {item.purchased ? `৳${lineTotal.toLocaleString('en-BD')}` : 'Returned'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Purchase Completion Note (Optional)</Label>
              <Textarea
                placeholder="Optional notes on actual purchase..."
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end font-mono text-sm font-bold pt-1">
              Final Purchase Total: ৳
              {(
                verifyItems.reduce(
                  (s, i) => s + (i.purchased ? (Number(i.actualQuantity) || 0) * i.unitPrice : 0),
                  0,
                ) +
                Number(completingIndent?.transportCost || 0) +
                Number(completingIndent?.otherCosts || 0)
              ).toLocaleString('en-BD')}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCompletingIndent(null)
                setVerifyItems([])
              }}
              disabled={submittingVerify}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => void handleCompletePurchase()}
              disabled={submittingVerify}
            >
              {submittingVerify ? 'Completing...' : 'Complete Purchase Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
