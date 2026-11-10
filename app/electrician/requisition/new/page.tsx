'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Zap,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ClipboardList,
  Building2,
  MapPin,
  Phone,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  CEILING_ELECTRICAL_CATALOG,
  CeilingElectricalCatalogItem,
} from '@/app/crm/boq/builder/[leadId]/_components/constants/boq-lighting-electrical-catalogs'
import {
  GRID_CELL_INPUT,
  GRID_CELL_NUM,
  GRID_CELL_SELECT,
  GRID_TH,
  GRID_TD,
} from '@/app/crm/boq/builder/[leadId]/_components/constants/boq-grid-styles'

type Project = {
  id: string
  name: string
  location: string | null
  phone: string | null
  stage: string
}

interface ElectricalItemRow {
  id: string
  materialName: string
  specifications: string
  ratingDimension: string
  voltageWattage: string
  quantity: string
  unit: string
  remarks: string
  customName?: boolean
}

const COMMON_UNITS = ['pcs', 'coil/rft', 'roll', 'nos', 'set', 'meter', 'box', 'pair']

function createBlankRow(): ElectricalItemRow {
  return {
    id: crypto.randomUUID(),
    materialName: '',
    specifications: '',
    ratingDimension: '—',
    voltageWattage: '—',
    quantity: '1',
    unit: 'pcs',
    remarks: '',
  }
}

function ElectricalRequisitionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledLeadId = searchParams.get('leadId') || ''

  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [selectedLeadId, setSelectedLeadId] = useState(prefilledLeadId)
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<ElectricalItemRow[]>([createBlankRow()])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [createdRequisitionNo, setCreatedRequisitionNo] = useState('')

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/electrician/projects')
      const json = await res.json()
      if (json.success) {
        setProjects(json.data.projects || [])
      }
    } catch {
      toast.error('Failed to load project sites')
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const selectedProject = projects.find((p) => p.id === selectedLeadId)

  const handleAddRow = () => {
    setRows((prev) => [...prev, createBlankRow()])
  }

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      setRows([createBlankRow()])
      return
    }
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSelectCatalogItem = (index: number, itemName: string) => {
    const catalogItem = CEILING_ELECTRICAL_CATALOG.find((c) => c.name === itemName)
    if (!catalogItem) {
      setRows((prev) =>
        prev.map((row, i) =>
          i === index
            ? { ...row, materialName: itemName, customName: true }
            : row
        )
      )
      return
    }

    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        return {
          ...row,
          materialName: catalogItem.name,
          specifications: catalogItem.defaultSpecs || '',
          ratingDimension: catalogItem.hasRating ? (catalogItem.defaultRating || 'Standard') : '—',
          voltageWattage: catalogItem.hasVoltage ? (catalogItem.defaultVoltage || '') : '—',
          quantity: catalogItem.defaultQty !== undefined ? String(catalogItem.defaultQty) : (row.quantity || '1'),
          unit: catalogItem.unit || 'pcs',
          remarks: catalogItem.defaultRemarks || '',
          customName: false,
        }
      })
    )
  }

  const handleUpdateField = (index: number, field: keyof ElectricalItemRow, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadId) {
      toast.error('Please select an assigned project site')
      return
    }

    const validRows = rows.filter((r) => r.materialName.trim())
    if (validRows.length === 0) {
      toast.error('Add at least one electrical material item')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/electrician/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          notes: notes.trim() || null,
          items: validRows.map((r) => ({
            materialName: r.materialName.trim(),
            specifications: r.specifications.trim() || null,
            quantity: parseFloat(r.quantity) || 1,
            unit: r.unit || 'pcs',
            remarks: r.remarks.trim() || null,
            variantAttributes: {
              ratingDimension: r.ratingDimension !== '—' ? r.ratingDimension : null,
              voltageWattage: r.voltageWattage !== '—' ? r.voltageWattage : null,
              workCategory: 'ELECTRICAL_WORK',
              sectionKey: 'ELECTRICAL_DEVICES',
            },
          })),
        }),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to submit requisition')

      setCreatedRequisitionNo(json.data.requisition.requisitionNo)
      setSubmitted(true)
      toast.success(`Requisition ${json.data.requisition.requisitionNo} submitted to Procurement!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Electrical Requisition Submitted!</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Requisition <span className="font-mono font-semibold text-foreground">{createdRequisitionNo}</span> has been dispatched to the Procurement Department for purchasing and site delivery.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/electrician/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Electrician Dashboard
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setSubmitted(false)
              setRows([createBlankRow()])
              setNotes('')
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Another Requisition
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/electrician/dashboard" className="hover:text-foreground">
              Electrician
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Requisition Builder</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Zap className="w-7 h-7 text-yellow-500 shrink-0" />
            Electrical Work Requisition
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Specify drivers, switches, sockets & electrical materials for assigned project sites.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline" size="sm">
            <Link href="/electrician/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Link>
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedLeadId || rows.every((r) => !r.materialName.trim())}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shadow-sm text-xs gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ClipboardList className="w-4 h-4" />
                Submit to Procurement
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Project Selection Card ── */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            Assigned Project Site
          </CardTitle>
          <CardDescription className="text-xs">
            Select the site where these electrical materials are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Project *</Label>
              <Select
                value={selectedLeadId}
                onValueChange={setSelectedLeadId}
                disabled={loadingProjects}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue
                    placeholder={loadingProjects ? 'Loading project sites...' : 'Choose an assigned project site'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} {p.location ? `— ${p.location}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProject && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1 text-xs flex flex-col justify-center">
                <div className="font-semibold text-foreground">{selectedProject.name}</div>
                {selectedProject.location && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{selectedProject.location}</span>
                  </div>
                )}
                {selectedProject.phone && (
                  <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{selectedProject.phone}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Site Remarks / Instructions for Procurement</Label>
            <Textarea
              placeholder="e.g. Urgent delivery needed for bedroom 2 & living room wiring before false ceiling closure."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs resize-none"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── BOQ Builder Style Requisition Section ── */}
      <div className="rounded-2xl border-2 border-yellow-200/80 dark:border-yellow-900/60 border-l-4 border-l-yellow-500 bg-card shadow-xs transition-all">
        {/* Centered Section Header (matches BOQ SectionBlock) */}
        <div className="px-4 py-3.5 bg-yellow-50/70 dark:bg-yellow-950/20 border-b border-yellow-200/80 dark:border-yellow-900/60">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-background/90 border border-border/70 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Requisition Section
              </span>
            </div>

            <div className="flex-1 text-center flex flex-col items-center justify-center min-w-0">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <h3 className="text-base font-black tracking-tight text-yellow-950 dark:text-yellow-200">
                  Electrical Work
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700">
                  ⚡ Drivers, Switches & Sockets Specification
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-muted-foreground bg-background/90 px-2.5 py-1 rounded-full border border-border/70 shadow-2xs">
                {rows.length} {rows.length === 1 ? 'row' : 'rows'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Table Grid (matches CEILING_ELECTRICAL_SPEC viewMode) ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1050px] border-collapse divide-y divide-border/60">
            <thead className="bg-amber-500/10 border-b border-amber-500/20 text-amber-950 dark:text-amber-200">
              <tr className="divide-x divide-border/40">
                <th className={`${GRID_TH} w-14 text-center`}>SL NO</th>
                <th className={`${GRID_TH} min-w-[220px]`}>Item Name</th>
                <th className={`${GRID_TH} min-w-[170px]`}>Specification / Type</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Rating / Dimension</th>
                <th className={`${GRID_TH} min-w-[150px]`}>Voltage / Wattage</th>
                <th className={`${GRID_TH} w-24 text-center`}>Quantity</th>
                <th className={`${GRID_TH} w-28 text-center`}>Unit</th>
                <th className={`${GRID_TH} min-w-[180px]`}>Remarks</th>
                <th className="px-2 py-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {rows.map((item, ri) => {
                const catalogItem = CEILING_ELECTRICAL_CATALOG.find(
                  (c) => c.name.toLowerCase() === (item.materialName || '').toLowerCase()
                )
                const hasRating = catalogItem
                  ? catalogItem.hasRating
                  : item.ratingDimension !== '—' && Boolean(item.ratingDimension)
                const hasVoltage = catalogItem
                  ? catalogItem.hasVoltage
                  : item.voltageWattage !== '—' && Boolean(item.voltageWattage)

                return (
                  <tr
                    key={item.id}
                    className="divide-x divide-border/40 hover:bg-muted/30 transition-colors"
                  >
                    {/* SL NO */}
                    <td className={`${GRID_TD} text-center font-mono text-xs text-muted-foreground select-none`}>
                      {String(ri + 1).padStart(2, '0')}
                    </td>

                    {/* Item Name (Dropdown from CEILING_ELECTRICAL_CATALOG or custom) */}
                    <td className={GRID_TD}>
                      <select
                        value={item.materialName || ''}
                        onChange={(e) => handleSelectCatalogItem(ri, e.target.value)}
                        className={`${GRID_CELL_SELECT} font-semibold`}
                      >
                        <option value="" disabled>
                          -- Select Electrical Item --
                        </option>
                        {CEILING_ELECTRICAL_CATALOG.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name} {c.subCategory ? `(${c.subCategory})` : ''}
                          </option>
                        ))}
                        {item.materialName &&
                          !CEILING_ELECTRICAL_CATALOG.some(
                            (c) => c.name.toLowerCase() === item.materialName.toLowerCase()
                          ) && (
                            <option value={item.materialName}>{item.materialName}</option>
                          )}
                      </select>
                    </td>

                    {/* Specification / Type */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={item.specifications || ''}
                        onChange={(e) => handleUpdateField(ri, 'specifications', e.target.value)}
                        placeholder="e.g. 12V DC Output"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* Rating / Dimension */}
                    <td className={GRID_TD}>
                      {hasRating ? (
                        <input
                          type="text"
                          value={item.ratingDimension !== '—' ? item.ratingDimension : ''}
                          onChange={(e) => handleUpdateField(ri, 'ratingDimension', e.target.value)}
                          placeholder="e.g. Standard"
                          className={GRID_CELL_INPUT}
                        />
                      ) : (
                        <div className="w-full px-2.5 py-1.5 text-xs text-center text-muted-foreground/40 bg-muted/20 select-none font-mono">
                          —
                        </div>
                      )}
                    </td>

                    {/* Voltage / Wattage */}
                    <td className={GRID_TD}>
                      {hasVoltage ? (
                        catalogItem?.voltageOptions && catalogItem.voltageOptions.length > 0 ? (
                          <select
                            value={item.voltageWattage || catalogItem?.defaultVoltage || ''}
                            onChange={(e) => handleUpdateField(ri, 'voltageWattage', e.target.value)}
                            className={GRID_CELL_SELECT}
                          >
                            {catalogItem.voltageOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={item.voltageWattage !== '—' ? item.voltageWattage : ''}
                            onChange={(e) => handleUpdateField(ri, 'voltageWattage', e.target.value)}
                            placeholder="e.g. 60 Watt"
                            className={GRID_CELL_INPUT}
                          />
                        )
                      ) : (
                        <div className="w-full px-2.5 py-1.5 text-xs text-center text-muted-foreground/40 bg-muted/20 select-none font-mono">
                          —
                        </div>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className={GRID_TD}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => handleUpdateField(ri, 'quantity', e.target.value)}
                        placeholder="1"
                        className={GRID_CELL_NUM}
                      />
                    </td>

                    {/* Unit */}
                    <td className={GRID_TD}>
                      <select
                        value={item.unit || 'pcs'}
                        onChange={(e) => handleUpdateField(ri, 'unit', e.target.value)}
                        className={GRID_CELL_SELECT}
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Remarks */}
                    <td className={GRID_TD}>
                      <input
                        type="text"
                        value={item.remarks || ''}
                        onChange={(e) => handleUpdateField(ri, 'remarks', e.target.value)}
                        placeholder="e.g. Driver Unit, Living Room"
                        className={GRID_CELL_INPUT}
                      />
                    </td>

                    {/* Remove Action */}
                    <td className="px-2 py-1.5 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(ri)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Bottom Toolbar: Add Material Row ── */}
        <div className="p-3 border-t bg-muted/10 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="text-xs font-semibold gap-1.5 h-8 border-dashed hover:border-solid hover:bg-yellow-50 dark:hover:bg-yellow-950/40"
          >
            <Plus className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
            Add Material Row
          </Button>

          <span className="text-xs text-muted-foreground">
            Total Items: <span className="font-semibold text-foreground">{rows.length}</span>
          </span>
        </div>
      </div>

      {/* ── Bottom Submit Toolbar ── */}
      <div className="flex items-center justify-between pt-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/electrician/dashboard">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Cancel
          </Link>
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={submitting || !selectedLeadId || rows.every((r) => !r.materialName.trim())}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-xs gap-1.5 h-9 px-4"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting Requisition...
            </>
          ) : (
            <>
              <ClipboardList className="w-4 h-4" />
              Submit Requisition to Procurement
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default function NewRequisitionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center p-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading requisition builder...
        </div>
      }
    >
      <ElectricalRequisitionForm />
    </Suspense>
  )
}
