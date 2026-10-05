'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Calculator,
  CheckCircle2,
  FileText,
  Boxes,
  HelpCircle,
} from 'lucide-react'
import { saveMaterialRequisition, RequisitionItemInput } from '@/lib/boq-service'
import { RequisitionWorkCategory } from '@/generated/prisma/client'

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

const UOM_OPTIONS = [
  'Sheets',
  'Pcs',
  'Meters',
  'RFT',
  'Kg',
  'Rolls',
  'Pack',
  'Boxes',
  'Sets',
  'Liters',
]

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

export function RequisitionBuilderClient({
  lead,
  detailQuotation,
  existingRequisition,
  userId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [activeCategory, setActiveCategory] = useState<string>('ALL')
  const [notes, setNotes] = useState<string>(existingRequisition?.notes || '')
  const [items, setItems] = useState<RequisitionItemInput[]>(
    existingRequisition?.items && existingRequisition.items.length > 0
      ? existingRequisition.items.map((it) => ({
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
          productionPhase: it.productionPhase || 'Carcase',
          remarks: it.remarks || '',
        }))
      : []
  )

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  // Auto calculate final quantity when net or wastage changes
  const updateItem = (index: number, field: keyof RequisitionItemInput, value: any) => {
    setItems((prev) => {
      const copy = [...prev]
      const current = { ...copy[index], [field]: value }

      if (field === 'netQuantity' || field === 'wastagePercent') {
        const net = Number(field === 'netQuantity' ? value : current.netQuantity) || 0
        const waste = Number(field === 'wastagePercent' ? value : current.wastagePercent) || 0
        current.finalQuantity = Math.round((net * (1 + waste / 100)) * 100) / 100
      }

      copy[index] = current
      return copy
    })
  }

  const addItem = (category: RequisitionWorkCategory = 'CABINETS_CLOSETS') => {
    setItems((prev) => [
      ...prev,
      {
        workCategory: category,
        materialName: '',
        specifications: '',
        netQuantity: 1,
        wastagePercent: 0,
        finalQuantity: 1,
        unit: 'Pcs',
        productionPhase: 'Carcase',
        remarks: '',
      },
    ])
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Preset Template Quick Fillers
  const applyPresetTemplate = (templateType: 'CLOSETS' | 'PANELING' | 'CEILING') => {
    let presetItems: RequisitionItemInput[] = []

    if (templateType === 'CLOSETS') {
      presetItems = [
        {
          workCategory: 'CABINETS_CLOSETS',
          materialName: '18mm Plywood / Board',
          specifications: '18mm Gorjon BWP Plywood (Carcase Frame)',
          netQuantity: 10,
          wastagePercent: 10,
          finalQuantity: 11,
          unit: 'Sheets',
          productionPhase: 'Carcase',
        },
        {
          workCategory: 'CABINETS_CLOSETS',
          materialName: '16mm Plywood / Board',
          specifications: '16mm Commercial Plywood (Internal Shelving)',
          netQuantity: 6,
          wastagePercent: 10,
          finalQuantity: 6.6,
          unit: 'Sheets',
          productionPhase: 'Carcase',
        },
        {
          workCategory: 'CABINETS_CLOSETS',
          materialName: '9mm Plywood Backing',
          specifications: '9mm Backing Sheet',
          netQuantity: 4,
          wastagePercent: 5,
          finalQuantity: 4.2,
          unit: 'Sheets',
          productionPhase: 'Carcase',
        },
        {
          workCategory: 'CABINETS_CLOSETS',
          materialName: '6mm Drawer Base Sheet',
          specifications: '6mm Ply for drawer bottoms',
          netQuantity: 3,
          wastagePercent: 0,
          finalQuantity: 3,
          unit: 'Sheets',
          productionPhase: 'Carcase',
        },
        {
          workCategory: 'CABINETS_CLOSETS',
          materialName: 'PVC Edgeband Roll',
          specifications: '22mm x 2mm Color-Matched Edgeband',
          netQuantity: 4,
          wastagePercent: 0,
          finalQuantity: 4,
          unit: 'Rolls',
          productionPhase: 'Edging',
        },
        {
          workCategory: 'ACCESSORIES',
          materialName: 'Cabinet Straight Hinge',
          specifications: 'Full Overlay (Crank 0) Soft Close Hinge',
          netQuantity: 24,
          wastagePercent: 0,
          finalQuantity: 24,
          unit: 'Pcs',
          productionPhase: 'Fitting',
        },
        {
          workCategory: 'ACCESSORIES',
          materialName: 'Cabinet Half Round Hinge',
          specifications: 'Half Overlay (Crank 8) Soft Close Hinge',
          netQuantity: 16,
          wastagePercent: 0,
          finalQuantity: 16,
          unit: 'Pcs',
          productionPhase: 'Fitting',
        },
        {
          workCategory: 'ACCESSORIES',
          materialName: 'Under Mount Concealed Drawer Runner',
          specifications: '16" Concealed Soft Close Runner',
          netQuantity: 4,
          wastagePercent: 0,
          finalQuantity: 4,
          unit: 'Sets',
          productionPhase: 'Fitting',
        },
      ]
    } else if (templateType === 'PANELING') {
      presetItems = [
        {
          workCategory: 'WALL_PANELING',
          materialName: '12mm Garjon Plywood',
          specifications: '12mm Garjon Ply + Beladoa 2003 SMT Laminate',
          netQuantity: 5,
          wastagePercent: 10,
          finalQuantity: 5.5,
          unit: 'Sheets',
          productionPhase: 'Paneling',
        },
        {
          workCategory: 'WALL_PANELING',
          materialName: '3mm PVC Backing Sheet',
          specifications: '3mm Waterproof PVC sheet',
          netQuantity: 10,
          wastagePercent: 5,
          finalQuantity: 10.5,
          unit: 'Sheets',
          productionPhase: 'Paneling',
        },
        {
          workCategory: 'WALL_PANELING',
          materialName: 'Charcoal Fluted Panel',
          specifications: 'Advance 14081 Fluted Panel',
          netQuantity: 20,
          wastagePercent: 0,
          finalQuantity: 20,
          unit: 'Pcs',
          productionPhase: 'Paneling',
        },
        {
          workCategory: 'ACCESSORIES',
          materialName: 'Rose Gold T-Bit Profile',
          specifications: 'Metal Decorative Accent Inlay T-Bit',
          netQuantity: 30,
          wastagePercent: 5,
          finalQuantity: 31.5,
          unit: 'RFT',
          productionPhase: 'Fitting',
        },
        {
          workCategory: 'WALL_PANELING',
          materialName: 'Solution Gum',
          specifications: 'Bulk Adhesive Gum',
          netQuantity: 15,
          wastagePercent: 0,
          finalQuantity: 15,
          unit: 'Kg',
          productionPhase: 'Paneling',
        },
        {
          workCategory: 'ACCESSORIES',
          materialName: 'Wood Screws (Assorted 1.5"-2.5")',
          specifications: '2" & 1.5" Star Screws',
          netQuantity: 500,
          wastagePercent: 0,
          finalQuantity: 500,
          unit: 'Pcs',
          productionPhase: 'Fitting',
        },
      ]
    } else if (templateType === 'CEILING') {
      presetItems = [
        {
          workCategory: 'CEILING',
          materialName: 'Gypsum Board',
          specifications: '12mm Heavy Moisture Resistant Gypsum Board',
          netQuantity: 15,
          wastagePercent: 10,
          finalQuantity: 16.5,
          unit: 'Sheets',
          productionPhase: 'Structure',
        },
        {
          workCategory: 'CEILING',
          materialName: 'Metal Channel & Perimeter Section',
          specifications: 'Main T-Grid & Cross Channels',
          netQuantity: 40,
          wastagePercent: 5,
          finalQuantity: 42,
          unit: 'Pcs',
          productionPhase: 'Structure',
        },
        {
          workCategory: 'ELECTRICAL_WORK',
          materialName: 'COB LED Profile Track',
          specifications: 'Concealed Aluminum LED Profile Track',
          netQuantity: 50,
          wastagePercent: 5,
          finalQuantity: 52.5,
          unit: 'RFT',
          productionPhase: 'Electrical',
        },
      ]
    }

    setItems((prev) => [...prev, ...presetItems])
  }

  const handleSave = async (status: 'DRAFT' | 'SUBMITTED' = 'DRAFT') => {
    setSaveSuccess(null)
    startTransition(async () => {
      const res = await saveMaterialRequisition({
        leadId: lead.id,
        quotationDraftId: detailQuotation?.id,
        status,
        notes,
        createdById: userId,
        items,
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

  const filteredItems = items.filter(
    (it) => activeCategory === 'ALL' || it.workCategory === activeCategory
  )

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Top Bar */}
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
            Project: <span className="font-semibold text-foreground">{lead.name}</span> | Phone: {lead.phone || 'N/A'} | Location: {lead.location || 'N/A'}
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
            disabled={isPending || items.length === 0}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit Requisition
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {saveSuccess}
        </div>
      )}

      {/* Approved Quotation Context Card */}
      {detailQuotation ? (
        <div className="rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 p-4 border-blue-200 dark:border-blue-900 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-foreground">
                Connected Approved Detail Quotation
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                {detailQuotation.status}
              </span>
            </div>
            <span className="text-sm font-bold text-foreground">
              Total: ৳{detailQuotation.grandTotal.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Use the quotation sections below to guide your raw material quantity takeoff. All items added here will be aggregated into the Master Procurement List.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-amber-50/40 dark:bg-amber-950/20 p-4 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          No approved detail quotation found for this lead yet. You can still manually create and save a Requisition Chart.
        </div>
      )}

      {/* Quick Preset Templates Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Quick Preset Takeoff Templates
          </span>
          <span className="text-xs text-muted-foreground">
            Click to pre-fill standard material lists
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => applyPresetTemplate('CLOSETS')}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
          >
            + Add Closet / Cabinetry Template
          </button>
          <button
            onClick={() => applyPresetTemplate('PANELING')}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            + Add Wall Paneling Template
          </button>
          <button
            onClick={() => applyPresetTemplate('CEILING')}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
          >
            + Add Ceiling Work Template
          </button>
        </div>
      </div>

      {/* Work Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
            activeCategory === 'ALL'
              ? 'bg-primary text-primary-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Items ({items.length})
        </button>
        {WORK_CATEGORIES.map((cat) => {
          const count = items.filter((it) => it.workCategory === cat.key).length
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
                activeCategory === cat.key
                  ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Material Requisition Items Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Material Breakdown Line Items
          </span>
          <button
            onClick={() =>
              addItem(
                activeCategory !== 'ALL'
                  ? (activeCategory as RequisitionWorkCategory)
                  : 'CABINETS_CLOSETS'
              )
            }
            className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Custom Line Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold min-w-[180px]">Material Name</th>
                <th className="px-4 py-3 font-semibold min-w-[220px]">Specification / Pasting Details</th>
                <th className="px-3 py-3 font-semibold text-center w-20">Net Qty</th>
                <th className="px-3 py-3 font-semibold text-center w-20">Wastage %</th>
                <th className="px-3 py-3 font-semibold text-center w-20">Final Qty</th>
                <th className="px-3 py-3 font-semibold w-28">Unit (UOM)</th>
                <th className="px-3 py-3 font-semibold w-28">Phase</th>
                <th className="px-4 py-3 font-semibold text-right w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    No materials added under this category yet. Click a preset template above or + Add Custom Line Item to start.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const realIndex = items.indexOf(item)
                  return (
                    <tr key={index} className="hover:bg-muted/20 transition-colors">
                      {/* Category */}
                      <td className="px-4 py-3">
                        <select
                          value={item.workCategory}
                          onChange={(e) =>
                            updateItem(realIndex, 'workCategory', e.target.value)
                          }
                          className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
                        >
                          {WORK_CATEGORIES.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Material Name */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.materialName}
                          onChange={(e) =>
                            updateItem(realIndex, 'materialName', e.target.value)
                          }
                          placeholder="e.g. 18mm Plywood / Screw"
                          className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* Specifications */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.specifications || ''}
                          onChange={(e) =>
                            updateItem(realIndex, 'specifications', e.target.value)
                          }
                          placeholder="e.g. 16mm Merino Ply + Super 101 Matt"
                          className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* Net Qty */}
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          step="any"
                          value={item.netQuantity}
                          onChange={(e) =>
                            updateItem(realIndex, 'netQuantity', e.target.value)
                          }
                          className="w-full bg-background border border-input rounded px-2 py-1 text-xs text-center font-medium focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* Wastage % */}
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          step="any"
                          value={item.wastagePercent}
                          onChange={(e) =>
                            updateItem(realIndex, 'wastagePercent', e.target.value)
                          }
                          className="w-full bg-background border border-input rounded px-2 py-1 text-xs text-center text-amber-600 focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* Final Qty */}
                      <td className="px-3 py-3 text-center font-bold text-foreground">
                        {item.finalQuantity}
                      </td>

                      {/* Unit */}
                      <td className="px-3 py-3">
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(realIndex, 'unit', e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
                        >
                          {UOM_OPTIONS.map((uom) => (
                            <option key={uom} value={uom}>
                              {uom}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Production Phase */}
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.productionPhase || ''}
                          onChange={(e) =>
                            updateItem(realIndex, 'productionPhase', e.target.value)
                          }
                          placeholder="e.g. Carcase"
                          className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* Delete */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeItem(realIndex)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          title="Remove Line Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* General Requisition Notes */}
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
    </div>
  )
}
