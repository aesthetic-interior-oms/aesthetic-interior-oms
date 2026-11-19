'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  Loader2,
  Plus,
  Save,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Edit2,
  FolderPlus,
  Check,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import { CustomizedQuotationDocument } from '@/components/crm/quotation/pdf/CustomizedQuotationDocument'
import {
  buildDefaultCustomizedQuotationContent,
  calculateCustomizedQuotationTotals,
  type CustomizedQuotationContent,
  type CustomizedQuotationLineItem,
  type CustomizedQuotationUnit,
  DEFAULT_CUSTOMIZED_TITLE,
} from '@/lib/customized-quotation-types'

type QuotationDraftItem = {
  id: string
  draftKey: string
  title: string
  grandTotal: number
  projectSqft: number | null
  content: CustomizedQuotationContent
  updatedAt: string
}

type Props = {
  leadId: string
  leadName: string
  leadLocation: string | null
  leadSubStatus: string | null
  onDraftSaved?: () => void
}

const money = (value: number) => `৳${Math.round(value).toLocaleString('en-BD')}`

export function CustomizedQuotationBuilder({
  leadId,
  leadName,
  leadLocation,
  onDraftSaved,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [canEdit, setCanEdit] = useState(true)

  const [quotations, setQuotations] = useState<QuotationDraftItem[]>([])
  const [activeDraftKey, setActiveDraftKey] = useState<string>('customized:default')
  const [activeContent, setActiveContent] = useState<CustomizedQuotationContent | null>(null)
  const [defaultSqftInput, setDefaultSqftInput] = useState<string>('')

  // New quotation modal
  const [newQuotationModalOpen, setNewQuotationModalOpen] = useState(false)
  const [newQuotationTitle, setNewQuotationTitle] = useState('')
  const [creatingQuotation, setCreatingQuotation] = useState(false)

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitleText, setEditingTitleText] = useState('')

  // Snapshot for dirty checking
  const lastSavedSnapshotRef = useRef<string>('')

  // Load all customized quotations for this lead
  const loadQuotations = useCallback(async (preferredDraftKey?: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/lead/${leadId}/customized-quotation`, { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok || !payload?.success || !Array.isArray(payload.data?.quotations)) {
        throw new Error(payload?.error ?? 'Failed to load customized quotations')
      }

      const list: QuotationDraftItem[] = payload.data.quotations
      setQuotations(list)
      setCanEdit(Boolean(payload.data.canEdit))

      if (list.length > 0) {
        const target = preferredDraftKey
          ? list.find((q) => q.draftKey === preferredDraftKey) || list[0]
          : list[0]

        setActiveDraftKey(target.draftKey)
        const content = target.content || buildDefaultCustomizedQuotationContent({ clientName: leadName, clientAddress: leadLocation ?? '' })
        setActiveContent(content)
        setDefaultSqftInput(content.projectSqft ? String(content.projectSqft) : '')
        lastSavedSnapshotRef.current = JSON.stringify(content)
      } else {
        const def = buildDefaultCustomizedQuotationContent({ clientName: leadName, clientAddress: leadLocation ?? '' })
        setActiveContent(def)
        lastSavedSnapshotRef.current = JSON.stringify(def)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error loading quotations')
    } finally {
      setLoading(false)
    }
  }, [leadId, leadName, leadLocation])

  useEffect(() => {
    void loadQuotations()
  }, [loadQuotations])

  // Calculated totals for current active content
  const totals = useMemo(() => {
    if (!activeContent) return { subtotal: 0, grandTotal: 0, totalSqft: 0, totalNos: 0, itemCount: 0 }
    return calculateCustomizedQuotationTotals(activeContent)
  }, [activeContent])

  // Switch between customized quotations
  const handleSwitchQuotation = (draftKey: string) => {
    if (draftKey === activeDraftKey) return
    const target = quotations.find((q) => q.draftKey === draftKey)
    if (!target) return

    setActiveDraftKey(draftKey)
    setActiveContent(target.content)
    setDefaultSqftInput(target.content.projectSqft ? String(target.content.projectSqft) : '')
    lastSavedSnapshotRef.current = JSON.stringify(target.content)
  }

  // Save current active quotation
  const handleSaveDraft = useCallback(async () => {
    if (!activeContent || !canEdit || saving) return
    setSaving(true)
    try {
      const parsedSqft = Number(defaultSqftInput.replace(/,/g, ''))
      const sqftVal = Number.isFinite(parsedSqft) && parsedSqft > 0 ? parsedSqft : null

      const contentToSave: CustomizedQuotationContent = {
        ...activeContent,
        projectSqft: sqftVal,
        clientName: activeContent.clientName || leadName,
        clientAddress: activeContent.clientAddress || leadLocation || '',
      }

      const res = await fetch(`/api/lead/${leadId}/customized-quotation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftKey: activeDraftKey,
          content: contentToSave,
          projectSqft: sqftVal,
          grandTotal: totals.grandTotal,
        }),
      })

      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to save quotation draft')
      }

      lastSavedSnapshotRef.current = JSON.stringify(contentToSave)
      setQuotations((prev) =>
        prev.map((q) =>
          q.draftKey === activeDraftKey
            ? {
                ...q,
                title: contentToSave.title,
                grandTotal: totals.grandTotal,
                projectSqft: sqftVal,
                content: contentToSave,
                updatedAt: new Date().toISOString(),
              }
            : q,
        ),
      )

      toast.success(`Saved "${contentToSave.title || 'Customized Quotation'}"`)
      onDraftSaved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save quotation')
    } finally {
      setSaving(false)
    }
  }, [activeContent, canEdit, saving, defaultSqftInput, leadId, leadName, leadLocation, activeDraftKey, totals.grandTotal, onDraftSaved])

  // Keyboard shortcut Ctrl/Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSaveDraft()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSaveDraft])

  // Create new customized quotation
  const handleCreateNewQuotation = async () => {
    if (!newQuotationTitle.trim() || creatingQuotation) return
    setCreatingQuotation(true)
    try {
      const res = await fetch(`/api/lead/${leadId}/customized-quotation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newQuotationTitle.trim() }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success || !payload.data?.quotation) {
        throw new Error(payload?.error ?? 'Failed to create quotation')
      }

      const created: QuotationDraftItem = payload.data.quotation
      setQuotations((prev) => [...prev, created])
      setActiveDraftKey(created.draftKey)
      setActiveContent(created.content)
      setDefaultSqftInput('')
      lastSavedSnapshotRef.current = JSON.stringify(created.content)
      setNewQuotationModalOpen(false)
      setNewQuotationTitle('')
      toast.success(`Created "${created.title}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create quotation')
    } finally {
      setCreatingQuotation(false)
    }
  }

  // Delete current quotation
  const handleDeleteCurrentQuotation = async () => {
    if (!canEdit || quotations.length <= 1) {
      toast.error('Cannot delete the only quotation.')
      return
    }
    const currentTitle = activeContent?.title || 'this quotation'
    if (!window.confirm(`Are you sure you want to delete "${currentTitle}"? This cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/lead/${leadId}/customized-quotation?draftKey=${encodeURIComponent(activeDraftKey)}`, {
        method: 'DELETE',
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to delete quotation')
      }

      const remaining = quotations.filter((q) => q.draftKey !== activeDraftKey)
      setQuotations(remaining)
      if (remaining.length > 0) {
        setActiveDraftKey(remaining[0].draftKey)
        setActiveContent(remaining[0].content)
        setDefaultSqftInput(remaining[0].content.projectSqft ? String(remaining[0].content.projectSqft) : '')
        lastSavedSnapshotRef.current = JSON.stringify(remaining[0].content)
      }
      toast.success(`Deleted "${currentTitle}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete quotation')
    }
  }

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!activeContent) return
    setDownloading(true)
    try {
      const title = activeContent.title?.trim() || 'Customized-Quotation'
      const sanitizedName = (leadName || 'Lead').replace(/[^a-zA-Z0-9_-]/g, '_')
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `${sanitizedName}_${sanitizedTitle}.pdf`

      await downloadPdfFromDocument(
        <CustomizedQuotationDocument content={activeContent} totals={totals} />,
        fileName,
      )
      toast.success('PDF downloaded successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setDownloading(false)
    }
  }

  // Title save
  const handleSaveTitle = () => {
    if (!editingTitleText.trim() || !activeContent) {
      setIsEditingTitle(false)
      return
    }
    const nextTitle = editingTitleText.trim()
    setActiveContent((prev) => (prev ? { ...prev, title: nextTitle, subject: `${nextTitle} for interior work` } : prev))
    setIsEditingTitle(false)
  }

  // Apply default project sqft to lines that use "sqft" unit
  const handleApplyDefaultSqft = () => {
    const val = Number(defaultSqftInput.replace(/,/g, ''))
    if (!Number.isFinite(val) || val <= 0) {
      toast.error('Enter a valid sqft number first.')
      return
    }
    if (!activeContent) return

    let updatedCount = 0
    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        projectSqft: val,
        lineItems: prev.lineItems.map((line) => {
          if (line.unit === 'sqft') {
            updatedCount += 1
            const newAmount = Math.round(line.rate * val)
            return { ...line, quantity: val, amount: newAmount }
          }
          return line
        }),
      }
    })
    toast.success(`Applied ${val.toLocaleString()} sqft to ${updatedCount} sqft line item(s).`)
  }

  // Section manipulation
  const handleAddSection = () => {
    if (!activeContent) return
    const newSecId = `sec-${Date.now()}`
    const newAreaId = `area-${Date.now()}`
    const sortOrder = (activeContent.sections.length || 0) + 1

    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sections: [...prev.sections, { id: newSecId, name: `Section ${sortOrder}`, sortOrder }],
        areas: [...prev.areas, { id: newAreaId, floorId: newSecId, name: 'General Area', sortOrder: 1 }],
      }
    })
  }

  const handleUpdateSectionName = (sectionId: string, name: string) => {
    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, name } : s)),
      }
    })
  }

  const handleDeleteSection = (sectionId: string) => {
    if (!activeContent) return
    if (activeContent.sections.length <= 1) {
      toast.error('Cannot remove the only section.')
      return
    }
    if (!window.confirm('Delete this section and all its areas and items?')) return

    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
        areas: prev.areas.filter((a) => a.floorId !== sectionId),
        lineItems: prev.lineItems.filter((l) => l.sectionId !== sectionId),
      }
    })
  }

  // Area manipulation
  const handleAddArea = (sectionId: string) => {
    if (!activeContent) return
    const newAreaId = `area-${Date.now()}`
    const sectionAreas = activeContent.areas.filter((a) => a.floorId === sectionId)

    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        areas: [
          ...prev.areas,
          { id: newAreaId, floorId: sectionId, name: `Area ${sectionAreas.length + 1}`, sortOrder: sectionAreas.length + 1 },
        ],
      }
    })
  }

  const handleUpdateAreaName = (areaId: string, name: string) => {
    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        areas: prev.areas.map((a) => (a.id === areaId ? { ...a, name } : a)),
      }
    })
  }

  const handleDeleteArea = (areaId: string) => {
    if (!activeContent) return
    if (!window.confirm('Delete this area and its items?')) return

    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        areas: prev.areas.filter((a) => a.id !== areaId),
        lineItems: prev.lineItems.filter((l) => l.areaId !== areaId),
      }
    })
  }

  // Line item manipulation
  const handleAddLineItem = (sectionId: string, areaId?: string) => {
    if (!activeContent) return
    const parsedSqft = Number(defaultSqftInput.replace(/,/g, ''))
    const defaultQty = Number.isFinite(parsedSqft) && parsedSqft > 0 ? parsedSqft : 1

    const newLine: CustomizedQuotationLineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sectionId,
      areaId,
      serialNo: activeContent.lineItems.length + 1,
      description: '',
      materials: '',
      unit: 'sqft',
      rate: 0,
      quantity: defaultQty,
      amount: 0,
      included: true,
    }

    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        lineItems: [...prev.lineItems, newLine],
      }
    })
  }

  const handleUpdateLine = (lineId: string, patch: Partial<CustomizedQuotationLineItem>) => {
    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        lineItems: prev.lineItems.map((line) => {
          if (line.id !== lineId) return line
          const next = { ...line, ...patch }
          // Recalculate amount if rate or quantity or unit changed
          if ('rate' in patch || 'quantity' in patch || 'unit' in patch) {
            if (next.unit === 'ls') {
              // Keep amount as entered or rate
              if ('rate' in patch && !('amount' in patch)) next.amount = next.rate
            } else {
              next.amount = Math.round(Number(next.rate) * Number(next.quantity))
            }
          }
          return next
        }),
      }
    })
  }

  const handleDuplicateLine = (line: CustomizedQuotationLineItem) => {
    if (!activeContent) return
    const duplicated: CustomizedQuotationLineItem = {
      ...line,
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: `${line.description} (Copy)`,
      serialNo: activeContent.lineItems.length + 1,
    }

    setActiveContent((prev) => {
      if (!prev) return prev
      const index = prev.lineItems.findIndex((l) => l.id === line.id)
      const nextLines = [...prev.lineItems]
      nextLines.splice(index + 1, 0, duplicated)
      return { ...prev, lineItems: nextLines }
    })
    toast.success('Item duplicated')
  }

  const handleDeleteLine = (lineId: string) => {
    setActiveContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        lineItems: prev.lineItems.filter((l) => l.id !== lineId),
      }
    })
  }

  const handleMoveLine = (lineId: string, direction: 'up' | 'down') => {
    if (!activeContent) return
    const index = activeContent.lineItems.findIndex((l) => l.id === lineId)
    if (index < 0) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === activeContent.lineItems.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const nextLines = [...activeContent.lineItems]
    const temp = nextLines[index]
    nextLines[index] = nextLines[targetIndex]
    nextLines[targetIndex] = temp

    setActiveContent((prev) => (prev ? { ...prev, lineItems: nextLines } : prev))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading customized quotation...</span>
        </CardContent>
      </Card>
    )
  }

  if (!activeContent) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Unable to load quotation data.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top Banner & Multi-Quotation Selector */}
      <Card className="border-emerald-200/60 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-slate-900 dark:to-teal-950/10">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Editable Title */}
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-600 p-2 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={editingTitleText}
                      onChange={(e) => setEditingTitleText(e.target.value)}
                      placeholder="e.g. Civil Quotation, Renovation"
                      className="h-8 max-w-[280px] font-bold text-base"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle()
                        if (e.key === 'Escape') setIsEditingTitle(false)
                      }}
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSaveTitle}>
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setEditingTitleText(activeContent.title || DEFAULT_CUSTOMIZED_TITLE); setIsEditingTitle(true); }}>
                    <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {activeContent.title || DEFAULT_CUSTOMIZED_TITLE}
                    </CardTitle>
                    {canEdit && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit Name</span>
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customized quotation draft for {leadName} • Detail-style breakdown with SQFT & NOS units
                </p>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <Button
                  onClick={() => void handleSaveDraft()}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Draft
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => void handleDownloadPdf()}
                disabled={downloading}
                className="border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800"
              >
                {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4 text-emerald-600" />}
                Download PDF
              </Button>
              {canEdit && quotations.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => void handleDeleteCurrentQuotation()}
                  title="Delete this customized quotation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Quotations Switcher Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t mt-3">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Quotations:</span>
            {quotations.map((q) => {
              const isActive = q.draftKey === activeDraftKey
              return (
                <button
                  key={q.draftKey}
                  type="button"
                  onClick={() => handleSwitchQuotation(q.draftKey)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700'
                      : 'bg-white hover:bg-muted text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{q.title || 'Customized Quotation'}</span>
                  <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {money(q.grandTotal)}
                  </span>
                </button>
              )
            })}

            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full text-xs text-primary hover:bg-primary/10 gap-1 px-2.5"
                onClick={() => {
                  setNewQuotationTitle(`Customized Quotation ${quotations.length + 1}`)
                  setNewQuotationModalOpen(true)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Quotation</span>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Overview Metric Bar & Default SQFT Tool */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Grand Total</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {money(totals.grandTotal)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{totals.itemCount} item(s) included</p>
        </div>

        <div className="rounded-xl border bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total SQFT</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
            {totals.totalSqft.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-muted-foreground">sqft</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Across all sqft items</p>
        </div>

        <div className="rounded-xl border bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total NOS Units</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
            {totals.totalNos.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-muted-foreground">nos</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Across all piece/number items</p>
        </div>

        <div className="rounded-xl border bg-card p-3.5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Default SQFT</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Input
                type="text"
                inputMode="decimal"
                value={defaultSqftInput}
                disabled={!canEdit}
                onChange={(e) => setDefaultSqftInput(e.target.value)}
                placeholder="Enter sqft"
                className="h-8 text-xs font-medium"
              />
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] px-2 whitespace-nowrap"
                  onClick={handleApplyDefaultSqft}
                  title="Apply this quantity to all lines using sqft unit"
                >
                  Apply
                </Button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Updates SQFT lines without changing NOS items</p>
        </div>
      </div>

      {/* Main Quotation Table (Detail Table Layout) */}
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold text-sm">Quotation Breakdown & Items</span>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleAddSection}>
                <FolderPlus className="h-3.5 w-3.5" />
                Add Section
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0 space-y-6 pt-4">
          {activeContent.sections.map((section, secIdx) => {
            const sectionAreas = activeContent.areas.filter((a) => a.floorId === section.id).sort((a, b) => a.sortOrder - b.sortOrder)
            const sectionLines = activeContent.lineItems.filter((l) => l.sectionId === section.id)
            const sectionTotal = sectionLines.reduce((sum, l) => sum + (l.included !== false ? l.amount : 0), 0)

            return (
              <div key={section.id} className="mx-4 rounded-lg border bg-card overflow-hidden shadow-xs">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100/80 dark:bg-slate-800/60 px-4 py-2.5 border-b">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Section {secIdx + 1}:
                    </span>
                    {canEdit ? (
                      <Input
                        type="text"
                        value={section.name}
                        onChange={(e) => handleUpdateSectionName(section.id, e.target.value)}
                        placeholder="Section Name (e.g. Civil Works, Ground Floor)"
                        className="h-7 text-sm font-bold max-w-[280px] bg-background"
                      />
                    ) : (
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{section.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950 px-2 py-0.5 rounded">
                      Section Total: {money(sectionTotal)}
                    </span>
                    {canEdit && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 px-2"
                          onClick={() => handleAddArea(section.id)}
                          title="Add Area to this Section"
                        >
                          <Plus className="h-3 w-3" />
                          Area
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2"
                          onClick={() => handleDeleteSection(section.id)}
                          title="Delete Section"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Section Contents (by Areas or Unassigned) */}
                <div className="p-3 space-y-4">
                  {sectionAreas.length > 0 ? (
                    sectionAreas.map((area) => {
                      const areaLines = sectionLines.filter((l) => l.areaId === area.id)
                      const areaTotal = areaLines.reduce((sum, l) => sum + (l.included !== false ? l.amount : 0), 0)

                      return (
                        <div key={area.id} className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                          {/* Area Subheader */}
                          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 border-b text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-medium">Area:</span>
                              {canEdit ? (
                                <Input
                                  type="text"
                                  value={area.name}
                                  onChange={(e) => handleUpdateAreaName(area.id, e.target.value)}
                                  placeholder="Area name (e.g. Living Room)"
                                  className="h-6 text-xs font-semibold max-w-[200px] bg-background"
                                />
                              ) : (
                                <span className="font-semibold">{area.name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-medium">
                                Subtotal: <strong>{money(areaTotal)}</strong>
                              </span>
                              {canEdit && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[11px] gap-1 px-2"
                                    onClick={() => handleAddLineItem(section.id, area.id)}
                                  >
                                    <Plus className="h-3 w-3" /> Item
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-destructive"
                                    onClick={() => handleDeleteArea(area.id)}
                                    title="Delete Area"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Items Table inside Area */}
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-xs">
                              <thead className="bg-muted/40 text-left font-semibold text-muted-foreground">
                                <tr>
                                  <th className="w-10 px-2.5 py-2 text-center">SL</th>
                                  <th className="min-w-[180px] px-3 py-2">Item Name</th>
                                  <th className="min-w-[240px] px-3 py-2">Materials & Specifications</th>
                                  <th className="w-[120px] px-3 py-2">Unit Price (৳)</th>
                                  <th className="w-[160px] px-3 py-2">Qty & Unit (sqft / nos)</th>
                                  <th className="w-[120px] px-3 py-2 text-right">Total (৳)</th>
                                  {canEdit && <th className="w-20 px-2 py-2 text-center">Actions</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {areaLines.length === 0 ? (
                                  <tr>
                                    <td colSpan={canEdit ? 7 : 6} className="py-6 text-center text-muted-foreground">
                                      No items in this area yet.{' '}
                                      {canEdit && (
                                        <button
                                          type="button"
                                          onClick={() => handleAddLineItem(section.id, area.id)}
                                          className="text-primary underline font-medium hover:text-primary/80 ml-1"
                                        >
                                          + Add first item
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ) : (
                                  areaLines.map((line, lineIdx) => (
                                    <tr key={line.id} className="hover:bg-muted/20 transition-colors">
                                      <td className="px-2.5 py-2 text-center font-bold text-muted-foreground">
                                        {String(lineIdx + 1).padStart(2, '0')}
                                      </td>
                                      <td className="px-3 py-2">
                                        {canEdit ? (
                                          <Input
                                            type="text"
                                            value={line.description}
                                            onChange={(e) => handleUpdateLine(line.id, { description: e.target.value })}
                                            placeholder="Item name"
                                            className="h-7 text-xs font-medium"
                                          />
                                        ) : (
                                          <span className="font-medium">{line.description}</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        {canEdit ? (
                                          <Textarea
                                            value={line.materials ?? ''}
                                            onChange={(e) => handleUpdateLine(line.id, { materials: e.target.value })}
                                            placeholder="Material specifications & details"
                                            className="min-h-[30px] h-7 text-xs py-1"
                                            rows={1}
                                          />
                                        ) : (
                                          <span className="text-muted-foreground">{line.materials || '—'}</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        {canEdit ? (
                                          <Input
                                            type="text"
                                            inputMode="decimal"
                                            value={line.rate > 0 ? String(line.rate) : ''}
                                            onChange={(e) =>
                                              handleUpdateLine(line.id, { rate: Number(e.target.value.replace(/,/g, '')) || 0 })
                                            }
                                            placeholder="0"
                                            className="h-7 text-xs text-right"
                                          />
                                        ) : (
                                          <span className="text-right block">{line.rate > 0 ? line.rate.toLocaleString() : '—'}</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        {canEdit ? (
                                          <div className="flex items-center gap-1.5">
                                            <Input
                                              type="text"
                                              inputMode="decimal"
                                              value={line.quantity > 0 ? String(line.quantity) : ''}
                                              onChange={(e) =>
                                                handleUpdateLine(line.id, {
                                                  quantity: Number(e.target.value.replace(/,/g, '')) || 0,
                                                })
                                              }
                                              placeholder="Qty"
                                              className="h-7 text-xs flex-1 min-w-[55px]"
                                            />
                                            <Select
                                              value={line.unit || 'sqft'}
                                              onValueChange={(val) => handleUpdateLine(line.id, { unit: val as CustomizedQuotationUnit })}
                                            >
                                              <SelectTrigger className="h-7 text-[11px] px-1.5 w-[70px] font-semibold bg-background">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="sqft" className="font-semibold text-emerald-700">sqft</SelectItem>
                                                <SelectItem value="nos" className="font-semibold text-blue-700">nos</SelectItem>
                                                <SelectItem value="ls">ls</SelectItem>
                                                <SelectItem value="rft">rft</SelectItem>
                                                <SelectItem value="rmt">rmt</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        ) : (
                                          <span className="font-medium">
                                            {line.quantity} {line.unit}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                                        {canEdit && line.unit === 'ls' ? (
                                          <Input
                                            type="text"
                                            inputMode="decimal"
                                            value={line.amount > 0 ? String(line.amount) : ''}
                                            onChange={(e) =>
                                              handleUpdateLine(line.id, {
                                                amount: Number(e.target.value.replace(/,/g, '')) || 0,
                                              })
                                            }
                                            placeholder="Total"
                                            className="h-7 text-xs text-right font-bold"
                                          />
                                        ) : (
                                          money(line.amount)
                                        )}
                                      </td>
                                      {canEdit && (
                                        <td className="px-2 py-2 text-center">
                                          <div className="flex items-center justify-center gap-0.5">
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                              onClick={() => handleDuplicateLine(line)}
                                              title="Duplicate item"
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                              onClick={() => handleMoveLine(line.id, 'up')}
                                              title="Move up"
                                            >
                                              <ArrowUp className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                              onClick={() => handleMoveLine(line.id, 'down')}
                                              title="Move down"
                                            >
                                              <ArrowDown className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                              onClick={() => handleDeleteLine(line.id)}
                                              title="Delete item"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    /* Fallback when section has no distinct areas */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">General Items</span>
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs gap-1"
                            onClick={() => handleAddLineItem(section.id)}
                          >
                            <Plus className="h-3 w-3" /> Add Item
                          </Button>
                        )}
                      </div>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full min-w-[760px] text-xs">
                          <thead className="bg-muted/40 text-left font-semibold text-muted-foreground">
                            <tr>
                              <th className="w-10 px-2.5 py-2 text-center">SL</th>
                              <th className="min-w-[180px] px-3 py-2">Item Name</th>
                              <th className="min-w-[240px] px-3 py-2">Materials & Specifications</th>
                              <th className="w-[120px] px-3 py-2">Unit Price (৳)</th>
                              <th className="w-[160px] px-3 py-2">Qty & Unit (sqft / nos)</th>
                              <th className="w-[120px] px-3 py-2 text-right">Total (৳)</th>
                              {canEdit && <th className="w-20 px-2 py-2 text-center">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {sectionLines.map((line, lineIdx) => (
                              <tr key={line.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-2.5 py-2 text-center font-bold text-muted-foreground">
                                  {String(lineIdx + 1).padStart(2, '0')}
                                </td>
                                <td className="px-3 py-2">
                                  {canEdit ? (
                                    <Input
                                      type="text"
                                      value={line.description}
                                      onChange={(e) => handleUpdateLine(line.id, { description: e.target.value })}
                                      placeholder="Item name"
                                      className="h-7 text-xs font-medium"
                                    />
                                  ) : (
                                    <span className="font-medium">{line.description}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {canEdit ? (
                                    <Textarea
                                      value={line.materials ?? ''}
                                      onChange={(e) => handleUpdateLine(line.id, { materials: e.target.value })}
                                      placeholder="Material specifications"
                                      className="min-h-[30px] h-7 text-xs py-1"
                                      rows={1}
                                    />
                                  ) : (
                                    <span className="text-muted-foreground">{line.materials || '—'}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {canEdit ? (
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={line.rate > 0 ? String(line.rate) : ''}
                                      onChange={(e) =>
                                        handleUpdateLine(line.id, { rate: Number(e.target.value.replace(/,/g, '')) || 0 })
                                      }
                                      placeholder="0"
                                      className="h-7 text-xs text-right"
                                    />
                                  ) : (
                                    <span className="text-right block">{line.rate > 0 ? line.rate.toLocaleString() : '—'}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {canEdit ? (
                                    <div className="flex items-center gap-1.5">
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={line.quantity > 0 ? String(line.quantity) : ''}
                                        onChange={(e) =>
                                          handleUpdateLine(line.id, {
                                            quantity: Number(e.target.value.replace(/,/g, '')) || 0,
                                          })
                                        }
                                        placeholder="Qty"
                                        className="h-7 text-xs flex-1 min-w-[55px]"
                                      />
                                      <Select
                                        value={line.unit || 'sqft'}
                                        onValueChange={(val) => handleUpdateLine(line.id, { unit: val as CustomizedQuotationUnit })}
                                      >
                                        <SelectTrigger className="h-7 text-[11px] px-1.5 w-[70px] font-semibold bg-background">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="sqft" className="font-semibold text-emerald-700">sqft</SelectItem>
                                          <SelectItem value="nos" className="font-semibold text-blue-700">nos</SelectItem>
                                          <SelectItem value="ls">ls</SelectItem>
                                          <SelectItem value="rft">rft</SelectItem>
                                          <SelectItem value="rmt">rmt</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ) : (
                                    <span className="font-medium">
                                      {line.quantity} {line.unit}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                                  {money(line.amount)}
                                </td>
                                {canEdit && (
                                  <td className="px-2 py-2 text-center">
                                    <div className="flex items-center justify-center gap-0.5">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={() => handleDuplicateLine(line)}
                                        title="Duplicate item"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteLine(line.id)}
                                        title="Delete item"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add Section Button at Bottom */}
          {canEdit && (
            <div className="px-4 pb-4">
              <Button
                variant="outline"
                className="w-full border-dashed py-5 text-sm gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleAddSection}
              >
                <Plus className="h-4 w-4" />
                Add New Section (e.g. Civil, Demolition, Ceiling, etc.)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes & Terms Collapsible */}
      <details className="rounded-lg border bg-card text-xs">
        <summary className="cursor-pointer px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
          Quotation Terms & Conditions / Notes
        </summary>
        <div className="border-t p-4 space-y-3">
          <div>
            <label className="font-medium text-muted-foreground block mb-1">Terms & Conditions:</label>
            {canEdit ? (
              <Textarea
                value={activeContent.terms}
                onChange={(e) => setActiveContent((prev) => (prev ? { ...prev, terms: e.target.value } : prev))}
                rows={4}
                className="text-xs"
              />
            ) : (
              <p className="whitespace-pre-wrap text-muted-foreground">{activeContent.terms}</p>
            )}
          </div>
          <div>
            <label className="font-medium text-muted-foreground block mb-1">Payment Schedule:</label>
            {canEdit ? (
              <Textarea
                value={activeContent.paymentTerms}
                onChange={(e) => setActiveContent((prev) => (prev ? { ...prev, paymentTerms: e.target.value } : prev))}
                rows={3}
                className="text-xs"
              />
            ) : (
              <p className="whitespace-pre-wrap text-muted-foreground">{activeContent.paymentTerms}</p>
            )}
          </div>
        </div>
      </details>

      {/* Create New Quotation Dialog */}
      <Dialog open={newQuotationModalOpen} onOpenChange={setNewQuotationModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Customized Quotation</DialogTitle>
            <DialogDescription>
              Define what kind of quotation this is (e.g. Civil Quotation, Glass Work, Kitchen Scope).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Quotation Name / Type</label>
              <Input
                type="text"
                value={newQuotationTitle}
                onChange={(e) => setNewQuotationTitle(e.target.value)}
                placeholder="e.g. Civil Quotation, Renovation Scope"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreateNewQuotation()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewQuotationModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateNewQuotation()} disabled={creatingQuotation || !newQuotationTitle.trim()}>
              {creatingQuotation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
