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

type Project = { id: string; name: string; location: string | null }

type MaterialRow = {
  id: string
  materialName: string
  specifications: string
  quantity: string
  unit: string
  remarks: string
}

const UNITS = ['Pcs', 'Mtr', 'Rft', 'Kg', 'Set', 'Roll', 'Box', 'Pair', 'Nos', 'Bag', 'Liters']

function newRow(): MaterialRow {
  return { id: crypto.randomUUID(), materialName: '', specifications: '', quantity: '1', unit: 'Pcs', remarks: '' }
}

function RequisitionFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledLeadId = searchParams.get('leadId') || ''

  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [selectedLeadId, setSelectedLeadId] = useState(prefilledLeadId)
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<MaterialRow[]>([newRow()])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/electrician/projects')
      const json = await res.json()
      if (json.success) setProjects(json.data.projects || [])
    } catch {
      toast.error('Failed to load projects')
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const addRow = () => setRows((r) => [...r, newRow()])

  const removeRow = (id: string) => {
    if (rows.length <= 1) return
    setRows((r) => r.filter((row) => row.id !== id))
  }

  const updateRow = (id: string, field: keyof MaterialRow, value: string) => {
    setRows((r) => r.map((row) => row.id === id ? { ...row, [field]: value } : row))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadId) return toast.error('Please select a project site')
    const validRows = rows.filter((r) => r.materialName.trim())
    if (validRows.length === 0) return toast.error('Add at least one material item')

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
            unit: r.unit,
            remarks: r.remarks.trim() || null,
          })),
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to submit')
      setSubmitted(true)
      toast.success(`Requisition ${json.data.requisition.requisitionNo} submitted to Procurement!`)
      setTimeout(() => router.push('/electrician/dashboard'), 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle2 className="w-14 h-14 text-emerald-500" />
        <h2 className="text-xl font-bold text-foreground">Requisition Submitted!</h2>
        <p className="text-sm text-muted-foreground">Your electrical requisition has been sent to Procurement.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/electrician/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Link href="/electrician/dashboard" className="hover:text-foreground">Electrician</Link>
          <span>/</span>
          <span className="text-foreground font-medium">New Requisition</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500 shrink-0" />
          Electrical Material Requisition
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Request electrical materials for a project site. This will be sent directly to Procurement.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Select */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Project Site</CardTitle>
            <CardDescription className="text-xs">Select the site this requisition is for</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Project *</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId} disabled={loadingProjects}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder={loadingProjects ? 'Loading projects...' : 'Select a project site'} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}{p.location ? ` — ${p.location}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes / Additional Instructions</Label>
              <Textarea
                placeholder="Any special instructions for procurement..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs resize-none"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Material Rows */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Material Items</CardTitle>
                <CardDescription className="text-xs">List all electrical materials required</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-xs gap-1.5 h-8">
                <Plus className="w-3.5 h-3.5" />
                Add Row
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">Item {index + 1}</span>
                  {rows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(row.id)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Material Name *</Label>
                    <Input
                      value={row.materialName}
                      onChange={(e) => updateRow(row.id, 'materialName', e.target.value)}
                      placeholder="e.g. 2.5mm² Copper Wire"
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Specifications</Label>
                    <Input
                      value={row.specifications}
                      onChange={(e) => updateRow(row.id, 'specifications', e.target.value)}
                      placeholder="e.g. ISI marked, 100m roll"
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Quantity *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Unit</Label>
                    <Select value={row.unit} onValueChange={(v) => updateRow(row.id, 'unit', v)}>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px]">Remarks</Label>
                    <Input
                      value={row.remarks}
                      onChange={(e) => updateRow(row.id, 'remarks', e.target.value)}
                      placeholder="Any notes about this material..."
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full text-xs gap-1.5 h-9 border-dashed">
              <Plus className="w-3.5 h-3.5" />
              Add Another Material
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/electrician/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Cancel
            </Link>
          </Button>
          <Button
            type="submit"
            disabled={submitting || !selectedLeadId || rows.every((r) => !r.materialName.trim())}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold gap-1.5"
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
      </form>
    </div>
  )
}

export default function NewRequisitionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-16"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <RequisitionFormInner />
    </Suspense>
  )
}
