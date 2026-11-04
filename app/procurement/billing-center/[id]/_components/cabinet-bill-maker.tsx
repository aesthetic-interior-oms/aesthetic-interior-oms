'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react'
import {
  Boxes,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  Paperclip,
  Phone,
  Printer,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ItemPurchaseRecord } from '../actions'
import { MaterialScopeDisplay } from './material-scope-display'
import type { RequisitionItemData } from './wall-paneling-bill-maker'

export type CabinetUsageCategory = 'ALL' | 'SHUTTER' | 'BODY' | 'BACK_PLY' | 'OTHER'

export function classifyCabinetItem(item: RequisitionItemData): 'SHUTTER' | 'BODY' | 'BACK_PLY' | 'OTHER' {
  const attrs = (item.variantAttributes || {}) as Record<string, any>
  const usage = (attrs.functionalUsage || attrs.usage || item.productionPhase || '').toLowerCase()
  if (usage.includes('shutter')) return 'SHUTTER'
  if (usage.includes('body') || usage.includes('carcass')) return 'BODY'
  if (usage.includes('back') || usage.includes('backply')) return 'BACK_PLY'
  return 'OTHER'
}

export interface CabinetBillMakerProps {
  items: RequisitionItemData[]
  purchases: Record<string, ItemPurchaseRecord>
  isSaving: boolean
  onOpenPurchaseModal: (item: RequisitionItemData) => void
  onRemovePurchase: (itemId: string) => void
  onOpenDocumentModal: (item: RequisitionItemData) => void
  onOpenOrderModal: () => void
  onOpenPrintSlip: () => void
}

export function CabinetBillMaker({
  items,
  purchases,
  isSaving,
  onOpenPurchaseModal,
  onRemovePurchase,
  onOpenDocumentModal,
  onOpenOrderModal,
  onOpenPrintSlip,
}: CabinetBillMakerProps) {
  const [usageFilter, setUsageFilter] = useState<CabinetUsageCategory>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Usage counts
  const usageCounts = useMemo(() => {
    const counts: Record<'SHUTTER' | 'BODY' | 'BACK_PLY' | 'OTHER', { total: number; bought: number }> = {
      SHUTTER: { total: 0, bought: 0 },
      BODY: { total: 0, bought: 0 },
      BACK_PLY: { total: 0, bought: 0 },
      OTHER: { total: 0, bought: 0 },
    }
    items.forEach((item) => {
      const usage = classifyCabinetItem(item)
      counts[usage].total += 1
      if (purchases[item.id]?.isBought) counts[usage].bought += 1
    })
    return counts
  }, [items, purchases])

  // Filtered displayed items
  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      const usage = classifyCabinetItem(item)
      if (usageFilter !== 'ALL' && usage !== usageFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = item.materialName.toLowerCase().includes(q)
        const matchSpec = (item.specifications || '').toLowerCase().includes(q)
        const matchUsage = (item.productionPhase || '').toLowerCase().includes(q)
        const attrs = (item.variantAttributes || {}) as Record<string, any>
        const matchAttrUsage = (attrs.functionalUsage || attrs.usage || '').toLowerCase().includes(q)
        return matchName || matchSpec || matchUsage || matchAttrUsage
      }
      return true
    })
  }, [items, usageFilter, searchQuery])

  // Summary
  const orderSummary = useMemo(() => {
    let totalBilledItems = 0
    let totalMaterialSpend = 0
    let totalPaidToSuppliers = 0
    let totalDueAmount = 0
    const settlementTotals = {
      pettyCash: 0,
      purchaseTeam: 0,
      companyAccount: 0,
      vendorCredit: 0,
      other: 0,
    }

    items.forEach((item) => {
      const p = purchases[item.id]
      if (p && p.isBought) {
        totalBilledItems += 1
        const total = Number(p.totalAmount) || 0
        const paid = Number(p.paidAmount) || 0
        const due = Number(p.dueAmount) || 0
        totalMaterialSpend += total
        totalPaidToSuppliers += paid
        totalDueAmount += due
        const method = p.settlementMethod || 'PETTY_CASH'
        if (method === 'PETTY_CASH') settlementTotals.pettyCash += total
        else if (method === 'PURCHASE_TEAM') settlementTotals.purchaseTeam += total
        else if (method === 'COMPANY_ACCOUNT') settlementTotals.companyAccount += total
        else if (method === 'VENDOR_CREDIT') settlementTotals.vendorCredit += total
        else settlementTotals.other += total
      }
    })

    return {
      totalItems: items.length,
      totalBilledItems,
      unbilledItems: items.length - totalBilledItems,
      totalMaterialSpend,
      totalPaidToSuppliers,
      totalDueAmount,
      settlementTotals,
    }
  }, [items, purchases])

  return (
    <div className="space-y-4">
      {/* Filter Bar & Search */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                Cabinets &amp; Closets — Board Purchases
              </h2>
              <span className="text-xs px-2 py-0.5 rounded border border-border font-mono font-medium text-foreground bg-muted/30">
                {orderSummary.totalBilledItems} of {orderSummary.totalItems} Logged
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record board purchases for cabinets, closets, and wardrobes — with vendor, pricing, and payment details
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by material, spec, or usage..."
              className="pl-8 h-8 text-xs bg-background border-border"
            />
          </div>
        </div>

        {/* Usage Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
          {([
            { key: 'ALL', label: 'All Items', count: `(${items.length})` },
            { key: 'SHUTTER', label: '🚪 Shutter', count: `(${usageCounts.SHUTTER.bought}/${usageCounts.SHUTTER.total})` },
            { key: 'BODY', label: '📦 Body / Carcass', count: `(${usageCounts.BODY.bought}/${usageCounts.BODY.total})` },
            { key: 'BACK_PLY', label: '🪵 Back Ply', count: `(${usageCounts.BACK_PLY.bought}/${usageCounts.BACK_PLY.total})` },
            { key: 'OTHER', label: 'Other', count: `(${usageCounts.OTHER.bought}/${usageCounts.OTHER.total})` },
          ] as { key: CabinetUsageCategory; label: string; count: string }[]).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setUsageFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                usageFilter === key
                  ? 'bg-foreground text-background font-semibold'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>{label}</span>
              <span className="text-[11px] font-mono opacity-80">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cabinet Items Table */}
      <div className="w-full rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        {displayedItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Boxes className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <h3 className="text-xs font-semibold text-foreground">No cabinet items found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery ? 'No items match your search.' : 'No cabinet / closet items in this requisition.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/50 text-foreground font-semibold border-b border-border text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">Status</th>
                  <th className="py-2.5 px-3 w-10 text-center">SL</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Board Spec &amp; Usage</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Supplier &amp; Contacts</th>
                  <th className="py-2.5 px-3 text-center">Req. Qty</th>
                  <th className="py-2.5 px-3 text-center">Purchased Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Spend</th>
                  <th className="py-2.5 px-3 text-right">Paid (৳)</th>
                  <th className="py-2.5 px-3 text-center">Payment Status</th>
                  <th className="py-2.5 px-3 text-center">Docs</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedItems.map((item, idx) => {
                  const p = purchases[item.id]
                  const isBought = Boolean(p?.isBought)
                  const usageClass = classifyCabinetItem(item)
                  const docCount = p?.documents?.length || 0
                  const attrs = (item.variantAttributes || {}) as Record<string, any>
                  const usageLabel = attrs.functionalUsage || attrs.usage || item.productionPhase || usageClass

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-muted/20 ${isBought ? 'bg-muted/10' : ''}`}
                    >
                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {isBought ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-border text-muted-foreground/40 text-[10px]">
                            —
                          </span>
                        )}
                      </td>

                      {/* SL */}
                      <td className="py-2.5 px-3 text-center font-mono text-muted-foreground text-xs">
                        {idx + 1}
                      </td>

                      {/* Board Spec & Usage */}
                      <td className="py-2.5 px-3">
                        <MaterialScopeDisplay item={item} subType={usageLabel} />
                      </td>

                      {/* Supplier & Contact */}
                      <td className="py-2.5 px-3 text-xs">
                        {isBought && p.vendorName ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-foreground">{p.vendorName}</div>
                            {p.vendorPhone && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{p.vendorPhone}</span>
                              </div>
                            )}
                            {p.invoiceNo && (
                              <div className="text-[10px] text-muted-foreground font-mono">
                                Memo: {p.invoiceNo}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Required Qty */}
                      <td className="py-2.5 px-3 text-center font-semibold text-foreground">
                        {item.finalQuantity} <span className="text-xs text-muted-foreground font-normal">{item.unit}</span>
                      </td>

                      {/* Purchased Qty */}
                      <td className="py-2.5 px-3 text-center">
                        {isBought ? (
                          <span className="font-semibold text-foreground">{p.billQuantity} {item.unit}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Unit Rate */}
                      <td className="py-2.5 px-3 text-right">
                        {isBought && p.unitPrice > 0 ? (
                          <span className="font-medium text-foreground">৳{p.unitPrice.toLocaleString('en-BD')}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Total Spend */}
                      <td className="py-2.5 px-3 text-right">
                        {isBought ? (
                          <div>
                            <div className="font-bold text-foreground text-xs sm:text-sm font-mono">
                              ৳{p.totalAmount.toLocaleString('en-BD')}
                            </div>
                            {(p.transportCost > 0 || p.otherCost > 0) && (
                              <div className="text-[10px] text-muted-foreground">
                                +{p.transportCost + p.otherCost} fees
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Paid */}
                      <td className="py-2.5 px-3 text-right">
                        {isBought ? (
                          <div className="font-medium font-mono text-foreground">৳{p.paidAmount.toLocaleString('en-BD')}</div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-2.5 px-3 text-center">
                        {isBought ? (
                          p.paymentStatus === 'PAID' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">PAID</span>
                          ) : p.paymentStatus === 'PARTIALLY_PAID' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">PARTIAL</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">UNPAID</span>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Docs */}
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => onOpenDocumentModal(item)}
                          title="Attach / View Invoices"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="font-mono text-[11px]">{docCount}</span>
                        </Button>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right">
                        {isBought ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2 gap-1 font-medium"
                              onClick={() => onOpenPurchaseModal(item)}
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-7 h-7 text-muted-foreground hover:text-foreground"
                              onClick={() => onRemovePurchase(item.id)}
                              title="Clear record"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 gap-1 bg-background hover:bg-muted font-medium text-foreground"
                            onClick={() => onOpenPurchaseModal(item)}
                          >
                            <Plus className="w-3 h-3" />
                            Record Purchase
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cabinet Summary & Dispatch Card */}
      <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Cabinet Purchase Spend Summary
              </span>
              <span className="text-xs text-muted-foreground">• Ready for Accounts</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <span>Total Material Spend:</span>
              <span className="font-mono">৳{orderSummary.totalMaterialSpend.toLocaleString('en-BD')}</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-3">
              <span>Paid: <strong className="text-foreground">৳{orderSummary.totalPaidToSuppliers.toLocaleString('en-BD')}</strong></span>
              <span>Due: <strong className="text-foreground">৳{orderSummary.totalDueAmount.toLocaleString('en-BD')}</strong></span>
              <span>({orderSummary.totalBilledItems} of {orderSummary.totalItems} logged)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-2.5 rounded-lg border border-border text-xs">
            <div className="px-2 py-1 bg-card rounded border border-border">
              <span className="text-muted-foreground">Petty Cash: </span>
              <strong className="text-foreground">৳{orderSummary.settlementTotals.pettyCash.toLocaleString('en-BD')}</strong>
            </div>
            <div className="px-2 py-1 bg-card rounded border border-border">
              <span className="text-muted-foreground">Purchase Team: </span>
              <strong className="text-foreground">৳{orderSummary.settlementTotals.purchaseTeam.toLocaleString('en-BD')}</strong>
            </div>
            {(orderSummary.settlementTotals.companyAccount > 0 || orderSummary.settlementTotals.vendorCredit > 0) && (
              <div className="px-2 py-1 bg-card rounded border border-border">
                <span className="text-muted-foreground">Bank/Credit: </span>
                <strong className="text-foreground">
                  ৳{(orderSummary.settlementTotals.companyAccount + orderSummary.settlementTotals.vendorCredit).toLocaleString('en-BD')}
                </strong>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs font-medium"
              disabled={orderSummary.totalBilledItems === 0}
              onClick={onOpenPrintSlip}
            >
              <Printer className="w-3.5 h-3.5" />
              Print Voucher
            </Button>
            <Button
              size="sm"
              disabled={orderSummary.totalBilledItems === 0 || isSaving}
              className="h-9 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 gap-1.5 font-medium text-xs px-4"
              onClick={onOpenOrderModal}
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch to Accounts
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
