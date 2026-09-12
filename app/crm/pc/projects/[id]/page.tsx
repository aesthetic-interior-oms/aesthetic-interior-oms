'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2,
  FileText,
  MapPin,
  User,
  SquareStack,
  Download,
  Eye,
  CheckCircle2,
  CheckSquare,
  Square,
  Edit2,
  Trash2,
  Plus,
  Lock,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { buildDetailPreviewUrl } from '@/lib/detail-quotation-preview-sync'

type QuotationDraft = {
  id: string
  draftKey: string
  quotationType?: string
  grandTotal: number
  status: string
  updatedAt: string
  content: unknown
}

type LeadDetail = {
  id: string
  name: string
  location: string | null
  phone: string | null
  agreementType: string | null
  agreementValue: number | null
  stage: string
  subStatus: string | null
  budget: number | null
  created_at: string
  assignments: Array<{ user: { fullName: string } }>
  quotationDrafts: QuotationDraft[]
}

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

function isBaselineDraft(draftKey: string, index: number): boolean {
  if (index === 0) return true
  if (draftKey === 'detail' || draftKey === 'detail:slot:1' || draftKey === 'pc:slot:1' || draftKey.startsWith('short:')) {
    return true
  }
  return false
}

function draftVersionLabel(draftKey: string, quotationType?: string, index: number = 0): string {
  if (index === 0) {
    return 'Version 1 (Original Agreement)'
  }
  if (draftKey.startsWith('pc:slot:')) {
    const slot = draftKey.replace('pc:slot:', '')
    return `Version ${slot}`
  }
  if (draftKey.includes(':slot:')) {
    const slot = draftKey.split(':slot:')[1]
    return `Version ${slot}`
  }
  return `Version ${index + 1}`
}

export default function PCProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const leadId = params?.id
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  // Editor Modal States
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [savingVersion, setSavingVersion] = useState(false)
  const [editableItems, setEditableItems] = useState<
    Array<{
      id: string
      description: string
      unit: string
      rate: number
      quantity: number
      included: boolean
      materials?: string
    }>
  >([])
  const [expandedSpecs, setExpandedSpecs] = useState<Record<string, boolean>>({})
  const [allSpecsExpanded, setAllSpecsExpanded] = useState(false)

  // Delete Version State
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null)

  const fetchProjectDetail = useCallback(async () => {
    if (!leadId) return
    try {
      const response = await fetch(`/api/pc/projects/${leadId}`, { cache: 'no-store' })
      const data = (await response.json()) as { success: boolean; data?: LeadDetail; error?: string }
      if (data.success && data.data) {
        setLead(data.data)
        if (!selectedDraftId && data.data.quotationDrafts.length > 0) {
          setSelectedDraftId(data.data.quotationDrafts[0].id)
        }
      } else {
        toast.error(data.error ?? 'Failed to load project')
      }
    } catch {
      toast.error('Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [leadId, selectedDraftId])

  useEffect(() => {
    void fetchProjectDetail()
  }, [fetchProjectDetail])

  const sortedDrafts = useMemo(() => {
    if (!lead?.quotationDrafts) return []
    // Sort drafts: baseline first, then version slots in ascending order
    return [...lead.quotationDrafts].sort((a, b) => {
      const isABaseline = isBaselineDraft(a.draftKey, 0)
      const isBBaseline = isBaselineDraft(b.draftKey, 0)
      if (isABaseline && !isBBaseline) return -1
      if (!isABaseline && isBBaseline) return 1
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    })
  }, [lead?.quotationDrafts])

  const selectedDraft = useMemo(() => {
    if (!sortedDrafts.length) return null
    return sortedDrafts.find((d) => d.id === selectedDraftId) ?? sortedDrafts[0]
  }, [sortedDrafts, selectedDraftId])

  const selectedDraftIndex = useMemo(() => {
    if (!selectedDraft) return 0
    return sortedDrafts.findIndex((d) => d.id === selectedDraft.id)
  }, [sortedDrafts, selectedDraft])

  const isSelectedBaseline = useMemo(() => {
    if (!selectedDraft) return true
    return isBaselineDraft(selectedDraft.draftKey, selectedDraftIndex)
  }, [selectedDraft, selectedDraftIndex])

  const selectedDraftSlotIndex = useMemo(() => {
    if (!selectedDraft) return 1
    if (selectedDraft.draftKey.startsWith('pc:slot:')) {
      const s = parseInt(selectedDraft.draftKey.replace('pc:slot:', ''), 10)
      return Number.isFinite(s) ? s : 1
    }
    if (selectedDraft.draftKey.startsWith('detail:slot:')) {
      const s = parseInt(selectedDraft.draftKey.replace('detail:slot:', ''), 10)
      return Number.isFinite(s) ? s : 1
    }
    return 1
  }, [selectedDraft])

  // Calculate Progress Stats
  const progressStats = useMemo(() => {
    if (!selectedDraft?.content || typeof selectedDraft.content !== 'object') {
      return { total: 0, completed: 0, percent: 0 }
    }
    const c = selectedDraft.content as Record<string, unknown>
    const lineItems = Array.isArray(c.lineItems) ? (c.lineItems as QuotationLineItem[]) : []
    const includedLines = lineItems.filter((l) => l.included !== false)
    const total = includedLines.length
    const completed = includedLines.filter((l) => l.completed === true).length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, percent }
  }, [selectedDraft])

  // Toggle item completed status
  const handleToggleItemStatus = async (lineId: string, currentCompleted: boolean) => {
    if (!selectedDraft || !leadId) return
    setUpdatingItemId(lineId)
    const nextCompleted = !currentCompleted

    try {
      const response = await fetch(`/api/pc/projects/${leadId}/item-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: selectedDraft.id,
          lineId,
          completed: nextCompleted,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to update status')
      }

      // Optimistically update local state
      setLead((prev) => {
        if (!prev) return prev
        const updatedDrafts = prev.quotationDrafts.map((d) => {
          if (d.id !== selectedDraft.id) return d
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

      toast.success(nextCompleted ? 'Marked as completed' : 'Marked as pending')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setUpdatingItemId(null)
    }
  }

  // Open PC Product Scope Editor Modal
  const handleOpenEditorModal = () => {
    if (!selectedDraft?.content || typeof selectedDraft.content !== 'object') return
    const c = selectedDraft.content as Record<string, unknown>
    const rawLines = Array.isArray(c.lineItems) ? (c.lineItems as QuotationLineItem[]) : []

    const items = rawLines.map((line) => ({
      id: line.id,
      description: line.description || 'Custom Product',
      unit: line.unit || 'sqft',
      rate: line.rate ?? 0,
      quantity: line.quantity ?? 1,
      included: line.included !== false,
      materials: line.materials,
    }))

    setEditableItems(items)
    setEditModalOpen(true)
  }

  // Save new version revision
  const handleSaveNewVersion = async () => {
    if (!leadId) return
    setSavingVersion(true)
    try {
      const lineItemPatches = editableItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        included: item.included,
      }))

      const response = await fetch(`/api/pc/projects/${leadId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDraftId: selectedDraft?.id,
          lineItemPatches,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to save version')
      }

      toast.success(data.message ?? 'Created new quotation version')
      setEditModalOpen(false)
      if (data.data?.id) {
        setSelectedDraftId(data.data.id)
      }
      await fetchProjectDetail()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save version')
    } finally {
      setSavingVersion(false)
    }
  }

  // Delete secondary version
  const handleDeleteVersion = async (draftIdToDelete: string) => {
    if (!leadId) return
    setDeletingDraftId(draftIdToDelete)
    try {
      const response = await fetch(
        `/api/pc/projects/${leadId}/versions?draftId=${draftIdToDelete}`,
        { method: 'DELETE' },
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to delete version')
      }

      toast.success('Quotation version deleted')
      setSelectedDraftId(null)
      await fetchProjectDetail()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete version')
    } finally {
      setDeletingDraftId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <CrmPageHeader title="Project Detail" subtitle="" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex flex-col min-h-screen">
        <CrmPageHeader title="Project Detail" subtitle="" />
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Project not found.
        </div>
      </div>
    )
  }

  // Render Quotation To-Do Checklist Content
  const renderChecklistQuotationContent = (content: unknown) => {
    if (!content || typeof content !== 'object') {
      return <p className="text-muted-foreground text-sm py-4">No product items found.</p>
    }

    const c = content as Record<string, unknown>
    const subject = typeof c.summarySubject === 'string' ? c.summarySubject : (typeof c.subject === 'string' ? c.subject : null)
    const discountAmount = typeof c.discountAmount === 'number' ? c.discountAmount : 0
    const discountPercent = typeof c.discountPercent === 'number' ? c.discountPercent : 0
    const grandTotal = typeof c.grandTotal === 'number' ? c.grandTotal : 0

    if (Array.isArray(c.lineItems) && c.lineItems.length > 0) {
      const rawLines = c.lineItems as QuotationLineItem[]
      const includedLines = rawLines.filter((l) => l.included !== false)

      const sectionsMap = new Map<string, string>()
      if (Array.isArray(c.sections)) {
        ;(c.sections as Array<{ id: string; name?: string }>).forEach((s) => {
          if (s.id && s.name) sectionsMap.set(s.id, s.name)
        })
      }

      const areasMap = new Map<string, string>()
      if (Array.isArray(c.areas)) {
        ;(c.areas as Array<{ id: string; name?: string }>).forEach((a) => {
          if (a.id && a.name) areasMap.set(a.id, a.name)
        })
      }

      const grouped = new Map<string, typeof includedLines>()
      includedLines.forEach((line) => {
        let groupName = 'Products & Execution Tasks'
        if (line.areaId && areasMap.has(line.areaId)) {
          groupName = areasMap.get(line.areaId)!
        } else if (line.sectionId && sectionsMap.has(line.sectionId)) {
          groupName = sectionsMap.get(line.sectionId)!
        }
        if (!grouped.has(groupName)) {
          grouped.set(groupName, [])
        }
        grouped.get(groupName)!.push(line)
      })

      return (
        <div className="space-y-6">
          {subject ? (
            <div className="p-3 rounded-md bg-muted/30 border text-xs font-medium text-foreground">
              Subject: {subject}
            </div>
          ) : null}

          {Array.from(grouped.entries()).map(([groupTitle, lines], gi) => (
            <div key={gi} className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground border-b pb-1.5 flex items-center justify-between">
                <span>{groupTitle}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {lines.filter((l) => l.completed).length}/{lines.length} done
                </span>
              </h4>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground border-b">
                      <th className="py-2.5 px-3 w-10 text-center">Done</th>
                      <th className="py-2.5 pr-4 font-semibold">Product & Work Specification</th>
                      <th className="py-2.5 pr-3 font-semibold text-right w-24">Qty / Sqft</th>
                      <th className="py-2.5 pr-3 font-semibold text-right w-24">Rate (৳)</th>
                      <th className="py-2.5 pr-3 font-semibold text-right w-28">Total (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {lines.map((line) => {
                      const isDone = Boolean(line.completed)
                      const isUpdating = updatingItemId === line.id

                      return (
                        <tr
                          key={line.id}
                          className={`align-top transition-colors ${
                            isDone ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : 'hover:bg-muted/20'
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleToggleItemStatus(line.id, isDone)}
                              className="inline-flex items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                              title={isDone ? 'Mark as Pending' : 'Mark as Done'}
                            >
                              {isUpdating ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              ) : isDone ? (
                                <CheckSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Square className="h-5 w-5 text-muted-foreground hover:text-primary" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 pr-4">
                            <div className={`font-semibold ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {line.description || 'Custom Product Item'}
                            </div>
                            {line.materials ? (
                              <div className="mt-1.5 text-xs text-muted-foreground whitespace-pre-line bg-muted/30 p-2 rounded border border-border/40">
                                {line.materials}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums font-medium">
                            {line.quantity != null ? `${line.quantity} ${line.unit ?? ''}` : '—'}
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums">
                            {line.rate != null ? `৳${line.rate.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums font-semibold">
                            {line.amount != null ? `৳${line.amount.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Totals Summary */}
          <div className="flex flex-col items-end border-t pt-4 space-y-1 text-sm">
            {discountAmount > 0 ? (
              <div className="flex justify-between w-64 text-xs text-muted-foreground">
                <span>Discount ({discountPercent > 0 ? `${discountPercent}%` : 'Fixed'}):</span>
                <span>- ৳{discountAmount.toLocaleString()}</span>
              </div>
            ) : null}
            <div className="flex justify-between w-64 font-bold text-base pt-1 text-foreground">
              <span>Grand Total:</span>
              <span>৳{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {subject ? (
          <div className="p-3 rounded-md bg-muted/30 border text-xs font-medium text-foreground">
            Subject: {subject}
          </div>
        ) : null}
        <p className="text-muted-foreground text-sm py-2">
          Quotation saved. Grand Total: <span className="font-semibold text-foreground">৳{grandTotal.toLocaleString()}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CrmPageHeader
        title={lead.name}
        subtitle="Project execution tracking & quotation management."
      />
      <div className="flex flex-col gap-6 p-4 md:gap-8 md:p-8 w-full flex-1">

        {/* Lead & Project Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{lead.location ?? 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Sr. CRM</p>
                  <p className="font-medium">
                    {lead.assignments[0]?.user?.fullName ?? 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <SquareStack className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Stage</p>
                  <Badge variant="outline" className="font-normal mt-0.5">
                    {lead.stage.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agreement Value</p>
                <p className="font-medium tabular-nums">
                  {lead.agreementValue != null
                    ? `৳${lead.agreementValue.toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Execution Progress Bar */}
        {selectedDraft ? (
          <Card className="border bg-gradient-to-r from-emerald-50/50 via-background to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-base font-bold text-foreground">Execution Progress</h3>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-semibold">
                      {progressStats.percent}% Completed
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Track products and tasks completed for this project execution phase.
                  </p>
                </div>
                <div className="text-right text-xs font-semibold text-muted-foreground">
                  <span className="text-foreground text-sm font-bold">{progressStats.completed}</span> of <span className="text-foreground text-sm font-bold">{progressStats.total}</span> products completed
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden border">
                <div
                  className="bg-emerald-600 dark:bg-emerald-500 h-full transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressStats.percent}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Quotation Breakdown & Version Management */}
        <Card>
          <CardHeader className="pb-3 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Quotation & Scope Breakdown</CardTitle>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Edit Quotation Scope Button */}
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
                  onClick={handleOpenEditorModal}
                  disabled={!selectedDraft}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Product Scope</span>
                </Button>

                {selectedDraft ? (
                  <div className="flex items-center gap-2">
                    <Link
                      href={buildDetailPreviewUrl({ context: 'lead', contextId: lead.id, slotIndex: selectedDraftSlotIndex })}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Open PDF Preview
                    </Link>

                    <Link
                      href={buildDetailPreviewUrl({ context: 'lead', contextId: lead.id, slotIndex: selectedDraftSlotIndex, download: true })}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Version Tabs Bar */}
            {sortedDrafts.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
                    Versions:
                  </span>
                  {sortedDrafts.map((draft, idx) => {
                    const isSelected = selectedDraftId === draft.id || (!selectedDraftId && idx === 0)
                    const isBaseline = isBaselineDraft(draft.draftKey, idx)
                    const label = draftVersionLabel(draft.draftKey, draft.quotationType, idx)
                    const isDeletingThis = deletingDraftId === draft.id

                    return (
                      <div key={draft.id} className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedDraftId(draft.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'border-border bg-background hover:bg-muted text-foreground'
                          }`}
                        >
                          {isBaseline ? (
                            <span title="Version 1 (Original Agreement) is locked as baseline" className="inline-flex">
                              <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                            </span>
                          ) : null}
                          <span>{label}</span>
                          <span className="opacity-80">({`৳${draft.grandTotal.toLocaleString()}`})</span>
                        </button>

                        {/* Secondary Version Delete Button */}
                        {!isBaseline && (
                          <button
                            type="button"
                            disabled={isDeletingThis}
                            onClick={() => void handleDeleteVersion(draft.id)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                            title="Delete this revision version"
                          >
                            {isDeletingThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </CardHeader>

          <CardContent>
            {sortedDrafts.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">
                No quotation available for this project.
              </p>
            ) : selectedDraft ? (
              <div>
                <div className="flex flex-wrap justify-between items-center mb-4 text-sm bg-muted/20 p-3 rounded-md border gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Active View: <strong className="text-foreground">{draftVersionLabel(selectedDraft.draftKey, selectedDraft.quotationType, selectedDraftIndex)}</strong>
                    </span>
                    {isSelectedBaseline ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200 text-[10px] gap-1">
                        <Lock className="h-2.5 w-2.5" /> Baseline Locked
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-200 text-[10px]">
                        PC Revision
                      </Badge>
                    )}
                    <span>•</span>
                    <span>
                      Updated: {new Date(selectedDraft.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className="font-bold tabular-nums text-base text-foreground">
                    Total: ৳{selectedDraft.grandTotal.toLocaleString()}
                  </span>
                </div>

                {renderChecklistQuotationContent(selectedDraft.content)}
              </div>
            ) : null}
          </CardContent>
        </Card>

      </div>

      {/* PC Quotation Product Scope Editor Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] max-h-[92vh] !grid-cols-1 flex flex-col overflow-hidden !gap-0 p-0">
          <DialogHeader className="border-b pb-3 shrink-0 px-6 pt-5">
            <DialogTitle className="text-lg font-bold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-primary" />
                <span>Edit Product Scope & Create New Version</span>
              </div>
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Adjust product sqft/qty or cancel products. Saving will create a new version revision (e.g. Version 2, Version 3) while keeping Version 1 baseline protected.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 px-6 space-y-3">
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground border-b">
                    <th className="py-2.5 px-3 font-semibold">
                      <div className="flex items-center justify-between gap-2">
                        <span>Product Description & Materials</span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextState = !allSpecsExpanded
                            setAllSpecsExpanded(nextState)
                            const updated: Record<string, boolean> = {}
                            editableItems.forEach((it) => {
                              if (it.id) updated[it.id] = nextState
                            })
                            setExpandedSpecs(updated)
                          }}
                          className="text-[11px] font-medium text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded transition-colors"
                        >
                          {allSpecsExpanded ? 'Collapse All Specs' : 'Expand All Specs'}
                        </button>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right w-36 font-semibold">Rate (৳)</th>
                    <th className="py-2.5 px-3 text-right w-52 font-semibold">Sqft / Qty</th>
                    <th className="py-2.5 px-3 text-right w-40 font-semibold">Subtotal (৳)</th>
                    <th className="py-2.5 px-3 text-center w-40 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {editableItems.map((item, idx) => {
                    const lineAmount = item.included
                      ? item.unit === 'ls'
                        ? item.rate
                        : item.rate * item.quantity
                      : 0
                    const isExpanded = Boolean(expandedSpecs[item.id])

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          !item.included ? 'bg-destructive/5 opacity-60' : 'hover:bg-muted/10'
                        }`}
                      >
                        <td className="py-2 px-3 align-middle">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-foreground text-xs">{item.description}</div>
                            {item.materials ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedSpecs((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                                }
                                className="text-[10px] font-semibold text-primary hover:underline shrink-0"
                              >
                                {isExpanded ? 'Hide specs ▲' : 'Show specs ▼'}
                              </button>
                            ) : null}
                          </div>
                          {item.materials ? (
                            isExpanded ? (
                              <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-line bg-muted/30 p-2 rounded border border-border/40">
                                {item.materials}
                              </div>
                            ) : (
                              <div className="text-[11px] text-muted-foreground/75 truncate max-w-[650px] leading-tight">
                                {item.materials.replace(/\n+/g, ' ')}
                              </div>
                            )
                          ) : null}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-medium text-xs align-middle">
                          ৳{item.rate.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right align-middle">
                          {item.unit === 'ls' ? (
                            <span className="text-xs text-muted-foreground font-medium">Lump Sum</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                value={item.quantity}
                                disabled={!item.included}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value)
                                  const nextQty = Number.isFinite(val) && val >= 0 ? val : 0
                                  setEditableItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, quantity: nextQty } : it)),
                                  )
                                }}
                                className="h-8 w-32 text-right tabular-nums text-xs font-medium px-2"
                              />
                              <span className="text-xs font-medium text-muted-foreground">{item.unit}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-xs align-middle">
                          ৳{lineAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center align-middle">
                          <Button
                            type="button"
                            size="sm"
                            variant={item.included ? 'outline' : 'destructive'}
                            className="h-7 text-xs px-2.5 font-semibold"
                            onClick={() => {
                              setEditableItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, included: !it.included } : it)),
                              )
                            }}
                          >
                            {item.included ? 'Cancel Product' : 'Restore Product'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between border-t pt-3 pb-5 px-6 gap-2 shrink-0">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div>
                Total Scope Value:{' '}
                <strong className="text-sm font-bold text-foreground">
                  ৳
                  {editableItems
                    .filter((i) => i.included)
                    .reduce((sum, i) => sum + (i.unit === 'ls' ? i.rate : i.rate * i.quantity), 0)
                    .toLocaleString()}
                </strong>
              </div>
              <span className="text-muted-foreground/40">•</span>
              <div>
                Total Included Sqft:{' '}
                <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {editableItems
                    .filter((i) => i.included && (i.unit === 'sqft' || i.unit === 'sft' || !i.unit))
                    .reduce((sum, i) => sum + (i.quantity || 0), 0)
                    .toLocaleString()}{' '}
                  sqft
                </strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                disabled={savingVersion}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-primary text-primary-foreground font-semibold"
                disabled={savingVersion}
                onClick={() => void handleSaveNewVersion()}
              >
                {savingVersion ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Version...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Save New Version
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
