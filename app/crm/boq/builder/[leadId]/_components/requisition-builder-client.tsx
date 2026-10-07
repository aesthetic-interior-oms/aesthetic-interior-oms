'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  Boxes,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Package,
  Layers,
  CheckCircle2,
  FileText,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { saveMaterialRequisition, RequisitionItemInput } from '@/lib/boq-service'
import type {
  QuotationDraftContent,
  QuotationSection,
  QuotationArea,
  QuotationLineItem,
} from '@/lib/quotation-types'

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */

export type RequisitionWorkCategory =
  | 'CEILING'
  | 'WALL_PANELING'
  | 'CABINETS_CLOSETS'
  | 'FURNITURE'
  | 'ACCESSORIES'
  | 'ELECTRICAL_WORK'
  | 'PAINT'
  | 'APPLIANCES'

const WORK_CATEGORIES: { key: RequisitionWorkCategory; label: string }[] = [
  { key: 'CABINETS_CLOSETS', label: 'Cabinets / Closets' },
  { key: 'WALL_PANELING', label: 'Wall Paneling' },
  { key: 'CEILING', label: 'Ceiling' },
  { key: 'FURNITURE', label: 'Furniture' },
  { key: 'ACCESSORIES', label: 'Accessories' },
  { key: 'ELECTRICAL_WORK', label: 'Electrical Work' },
  { key: 'PAINT', label: 'Paint & Polish' },
  { key: 'APPLIANCES', label: 'Appliances' },
]

const UOM_OPTIONS = ['Sheets', 'Pcs', 'Meters', 'RFT', 'Kg', 'Rolls', 'Pack', 'Boxes', 'Sets', 'Liters']

/** Special key used for materials not linked to any quotation line item */
const EXTRA_KEY = '__extra__'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

interface Props {
  lead: {
    id: string
    name: string
    phone: string | null
    email: string | null
    location: string | null
    stage: string
  }
  detailQuotation: {
    id: string
    grandTotal: number
    status: string
    content: any
  } | null
  existingRequisition: {
    id: string
    requisitionNo: string
    status: string
    notes: string | null
    items: any[]
  } | null
  userId: string
}

/** Items grouped: Record<quotationLineItemId | '__extra__', RequisitionItemInput[]> */
type ItemsMap = Record<string, RequisitionItemInput[]>

/* ─────────────────────────────────────────────
   Helper – build a blank requisition item
───────────────────────────────────────────── */
function blankItem(quotationLineItemId?: string): RequisitionItemInput {
  return {
    quotationLineItemId,
    workCategory: 'CABINETS_CLOSETS',
    materialName: '',
    specifications: '',
    netQuantity: 1,
    wastagePercent: 0,
    finalQuantity: 1,
    unit: 'Pcs',
    productionPhase: '',
    remarks: '',
  }
}

/* ─────────────────────────────────────────────
   Helper – flatten ItemsMap → flat array for save
───────────────────────────────────────────── */
function flattenItems(map: ItemsMap): RequisitionItemInput[] {
  return Object.values(map).flat()
}

/* ─────────────────────────────────────────────
   Helper – seed ItemsMap from existing items
───────────────────────────────────────────── */
function seedFromExisting(rawItems: any[]): ItemsMap {
  const map: ItemsMap = {}
  for (const it of rawItems) {
    const key = it.quotationLineItemId || EXTRA_KEY
    if (!map[key]) map[key] = []
    map[key].push({
      id: it.id,
      quotationLineItemId: it.quotationLineItemId || undefined,
      workCategory: it.workCategory || 'CABINETS_CLOSETS',
      materialName: it.materialName || '',
      specifications: it.specifications || '',
      variantAttributes: it.variantAttributes || {},
      netQuantity: Number(it.netQuantity) || 1,
      wastagePercent: Number(it.wastagePercent) || 0,
      finalQuantity: Number(it.finalQuantity) || Number(it.netQuantity) || 1,
      unit: it.unit || 'Pcs',
      productionPhase: it.productionPhase || '',
      remarks: it.remarks || '',
    })
  }
  return map
}

/* ─────────────────────────────────────────────
   Sub-component: Material row table for one quotation line item
───────────────────────────────────────────── */
function MaterialRowsTable({
  rows,
  onChange,
  onAddRow,
  onRemoveRow,
}: {
  rows: RequisitionItemInput[]
  onChange: (rowIndex: number, field: keyof RequisitionItemInput, value: any) => void
  onAddRow: () => void
  onRemoveRow: (rowIndex: number) => void
}) {
  return (
    <div className="border border-dashed border-border rounded-lg overflow-hidden">
      {rows.length === 0 ? (
        <div className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground/60" />
          No materials added yet for this item.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-muted-foreground uppercase bg-muted/40 border-b">
              <tr>
                <th className="px-3 py-2 font-semibold w-36">Category</th>
                <th className="px-3 py-2 font-semibold min-w-[160px]">Material Name</th>
                <th className="px-3 py-2 font-semibold min-w-[200px]">Specification</th>
                <th className="px-3 py-2 font-semibold text-center w-20">Net Qty</th>
                <th className="px-3 py-2 font-semibold text-center w-20">Wastage %</th>
                <th className="px-3 py-2 font-semibold text-center w-20">Final Qty</th>
                <th className="px-3 py-2 font-semibold w-24">UOM</th>
                <th className="px-3 py-2 font-semibold w-28">Phase</th>
                <th className="px-3 py-2 font-semibold w-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((item, ri) => (
                <tr key={ri} className="hover:bg-muted/10 transition-colors">
                  {/* Category */}
                  <td className="px-3 py-2">
                    <select
                      value={item.workCategory}
                      onChange={(e) => onChange(ri, 'workCategory', e.target.value)}
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary"
                    >
                      {WORK_CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Material Name */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.materialName}
                      onChange={(e) => onChange(ri, 'materialName', e.target.value)}
                      placeholder="e.g. 18mm Plywood"
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary"
                    />
                  </td>

                  {/* Specification */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.specifications || ''}
                      onChange={(e) => onChange(ri, 'specifications', e.target.value)}
                      placeholder="Grade / finish / brand"
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary"
                    />
                  </td>

                  {/* Net Qty */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={item.netQuantity}
                      onChange={(e) => onChange(ri, 'netQuantity', e.target.value)}
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs text-center font-medium focus:ring-1 focus:ring-primary"
                    />
                  </td>

                  {/* Wastage */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={item.wastagePercent}
                      onChange={(e) => onChange(ri, 'wastagePercent', e.target.value)}
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs text-center text-amber-600 focus:ring-1 focus:ring-primary"
                    />
                  </td>

                  {/* Final Qty */}
                  <td className="px-3 py-2 text-center font-bold text-foreground">{item.finalQuantity}</td>

                  {/* UOM */}
                  <td className="px-3 py-2">
                    <select
                      value={item.unit}
                      onChange={(e) => onChange(ri, 'unit', e.target.value)}
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary"
                    >
                      {UOM_OPTIONS.map((uom) => (
                        <option key={uom} value={uom}>
                          {uom}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Phase */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.productionPhase || ''}
                      onChange={(e) => onChange(ri, 'productionPhase', e.target.value)}
                      placeholder="e.g. Carcase"
                      className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary"
                    />
                  </td>

                  {/* Delete */}
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => onRemoveRow(ri)}
                      className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-3 py-2 border-t border-dashed border-border bg-muted/5">
        <button
          onClick={onAddRow}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Material Row
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sub-component: Single quotation line item card
───────────────────────────────────────────── */
function QuotationLineItemCard({
  item,
  area,
  rows,
  onChangeRow,
  onAddRow,
  onRemoveRow,
}: {
  item: QuotationLineItem
  area?: QuotationArea
  rows: RequisitionItemInput[]
  onChangeRow: (rowIndex: number, field: keyof RequisitionItemInput, value: any) => void
  onAddRow: () => void
  onRemoveRow: (rowIndex: number) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {area && (
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                  {area.name}
                </span>
              )}
              <p className="text-sm font-semibold text-foreground truncate">{item.description}</p>
            </div>
            {item.materials && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.materials}</p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {item.quantity} {item.unit}
          </p>
          <p className="text-xs font-bold text-foreground">
            ৳{item.amount.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-muted-foreground">
            {rows.length} material row{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
      </button>

      {/* Material rows */}
      {expanded && (
        <div className="p-3">
          <MaterialRowsTable
            rows={rows}
            onChange={onChangeRow}
            onAddRow={onAddRow}
            onRemoveRow={onRemoveRow}
          />
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export function RequisitionBuilderClient({
  lead,
  detailQuotation,
  existingRequisition,
  userId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [notes, setNotes] = useState<string>(existingRequisition?.notes || '')

  // ── Parse quotation content ──
  const quotation = useMemo<QuotationDraftContent | null>(() => {
    if (!detailQuotation?.content) return null
    try {
      const c = detailQuotation.content
      // May already be object (Prisma JSON) or a stringified JSON
      return typeof c === 'string' ? (JSON.parse(c) as QuotationDraftContent) : (c as QuotationDraftContent)
    } catch {
      return null
    }
  }, [detailQuotation])

  const sections: QuotationSection[] = quotation?.sections ?? []
  const areas: QuotationArea[] = quotation?.areas ?? []
  const lineItems: QuotationLineItem[] = (quotation?.lineItems ?? []).filter((li) => li.included)

  const areaMap = useMemo(() => {
    const m = new Map<string, QuotationArea>()
    for (const a of areas) m.set(a.id, a)
    return m
  }, [areas])

  // ── Items state: keyed by quotationLineItemId | '__extra__' ──
  const [itemsMap, setItemsMap] = useState<ItemsMap>(() => {
    if (existingRequisition?.items && existingRequisition.items.length > 0) {
      return seedFromExisting(existingRequisition.items)
    }
    return {}
  })

  // ── Helpers to mutate itemsMap ──
  const getRows = (key: string): RequisitionItemInput[] => itemsMap[key] ?? []

  const updateRow = (key: string, rowIndex: number, field: keyof RequisitionItemInput, rawValue: any) => {
    setItemsMap((prev) => {
      const rows = [...(prev[key] ?? [])]
      const current = { ...rows[rowIndex], [field]: rawValue }

      if (field === 'netQuantity' || field === 'wastagePercent') {
        const net = Number(field === 'netQuantity' ? rawValue : current.netQuantity) || 0
        const waste = Number(field === 'wastagePercent' ? rawValue : current.wastagePercent) || 0
        current.finalQuantity = Math.round(net * (1 + waste / 100) * 100) / 100
      }

      rows[rowIndex] = current
      return { ...prev, [key]: rows }
    })
  }

  const addRow = (key: string, quotationLineItemId?: string) => {
    setItemsMap((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), blankItem(quotationLineItemId)],
    }))
  }

  const removeRow = (key: string, rowIndex: number) => {
    setItemsMap((prev) => {
      const rows = (prev[key] ?? []).filter((_, i) => i !== rowIndex)
      const next = { ...prev }
      if (rows.length === 0) {
        delete next[key]
      } else {
        next[key] = rows
      }
      return next
    })
  }

  // ── Summary counts ──
  const totalMaterialRows = useMemo(() => flattenItems(itemsMap).length, [itemsMap])
  const coveredLineItems = useMemo(
    () => lineItems.filter((li) => (itemsMap[li.id]?.length ?? 0) > 0).length,
    [lineItems, itemsMap]
  )

  // ── Save / Submit ──
  const handleSave = (status: 'DRAFT' | 'SUBMITTED' = 'DRAFT') => {
    setSaveSuccess(null)
    startTransition(async () => {
      const res = await saveMaterialRequisition({
        leadId: lead.id,
        quotationDraftId: detailQuotation?.id,
        status,
        notes,
        createdById: userId,
        items: flattenItems(itemsMap),
      })
      if (res.success) {
        setSaveSuccess(
          status === 'SUBMITTED'
            ? 'Requisition submitted to Procurement team successfully!'
            : 'Requisition draft saved successfully!'
        )
        router.refresh()
      }
    })
  }

  /* ── RENDER ── */
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-24">

      {/* ── Top Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <Link
            href="/crm/boq/assigned-task"
            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Assigned Tasks
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Boxes className="w-6 h-6 text-primary" />
            Material Requisition Builder
          </h1>
          <p className="text-xs text-muted-foreground">
            Project: <span className="font-semibold text-foreground">{lead.name}</span> | Phone:{' '}
            {lead.phone || 'N/A'} | Location: {lead.location || 'N/A'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave('DRAFT')}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2 text-amber-500" />
            Save Draft
          </button>
          <button
            onClick={() => handleSave('SUBMITTED')}
            disabled={isPending || totalMaterialRows === 0}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit Requisition
          </button>
        </div>
      </div>

      {/* ── Success Banner ── */}
      {saveSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {saveSuccess}
        </div>
      )}

      {/* ── Quotation Context / Stats Card ── */}
      {detailQuotation ? (
        <div className="rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 p-4 border-blue-200 dark:border-blue-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-foreground">Approved Detail Quotation</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                {detailQuotation.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Grand Total:{' '}
                <strong className="text-foreground">৳{detailQuotation.grandTotal.toLocaleString('en-IN')}</strong>
              </span>
              <span>
                Quotation Items Covered:{' '}
                <strong className="text-foreground">
                  {coveredLineItems}/{lineItems.length}
                </strong>
              </span>
              <span>
                Total Material Rows:{' '}
                <strong className="text-foreground">{totalMaterialRows}</strong>
              </span>
            </div>
          </div>
          {lineItems.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Expand each quotation line item below and add the raw materials required for that work scope.
              Items that do not map to any quotation line go in the{' '}
              <strong>Extra / Miscellaneous</strong> section at the bottom.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-amber-50/40 dark:bg-amber-950/20 p-4 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          No approved detail quotation found for this lead. You can still create a manual requisition using
          the Extra / Miscellaneous section below.
        </div>
      )}

      {/* ── Quotation-Driven Sections ── */}
      {quotation && lineItems.length > 0 ? (
        <div className="space-y-8">
          {sections.map((section) => {
            const sectionItems = lineItems.filter((li) => li.sectionId === section.id)
            if (sectionItems.length === 0) return null

            return (
              <div key={section.id} className="space-y-3">
                {/* Section Header */}
                <div className="flex items-center gap-2 border-b pb-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    {section.name}
                  </h2>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {sectionItems.length} line item{sectionItems.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Line Items within this section */}
                <div className="space-y-3">
                  {sectionItems.map((li) => {
                    const area = li.areaId ? areaMap.get(li.areaId) : undefined
                    return (
                      <QuotationLineItemCard
                        key={li.id}
                        item={li}
                        area={area}
                        rows={getRows(li.id)}
                        onChangeRow={(ri, field, val) => updateRow(li.id, ri, field, val)}
                        onAddRow={() => addRow(li.id, li.id)}
                        onRemoveRow={(ri) => removeRow(li.id, ri)}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : detailQuotation && !quotation ? (
        <div className="rounded-lg border bg-destructive/5 p-4 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Could not parse quotation content. Please contact admin to re-finalize the quotation.
        </div>
      ) : null}

      {/* ── Extra / Miscellaneous Section ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Extra / Miscellaneous Materials
          </h2>
          <span className="text-xs text-muted-foreground ml-2">
            Materials not linked to any specific quotation line item
          </span>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
          <div className="px-4 py-3 bg-amber-50/40 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900">
            <p className="text-xs text-muted-foreground">
              Use this section for materials that span multiple quotation items or cannot be attributed
              to a single line item (e.g. consumables, PPE, miscellaneous hardware).
            </p>
          </div>
          <div className="p-3">
            <MaterialRowsTable
              rows={getRows(EXTRA_KEY)}
              onChange={(ri, field, val) => updateRow(EXTRA_KEY, ri, field, val)}
              onAddRow={() => addRow(EXTRA_KEY, undefined)}
              onRemoveRow={(ri) => removeRow(EXTRA_KEY, ri)}
            />
          </div>
        </div>
      </div>

      {/* ── Requisition Notes ── */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Requisition Remarks / Special Factory Notes
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Waterproof BWP grade required for kitchen sink area. Material delivery target Oct 20."
          className="w-full bg-background border border-input rounded-md p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* ── Bottom Save / Submit Bar ── */}
      {totalMaterialRows > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between shadow-lg">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">{totalMaterialRows}</strong> material row
            {totalMaterialRows !== 1 ? 's' : ''} across{' '}
            <strong className="text-foreground">{coveredLineItems}</strong> quotation item
            {coveredLineItems !== 1 ? 's' : ''}
            {getRows(EXTRA_KEY).length > 0 && (
              <> + <strong className="text-foreground">{getRows(EXTRA_KEY).length}</strong> extra</>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave('DRAFT')}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2 text-amber-500" />
              Save Draft
            </button>
            <button
              onClick={() => handleSave('SUBMITTED')}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit to Procurement
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
