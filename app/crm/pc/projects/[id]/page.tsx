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
  Minus,
  Lock,
  RotateCcw,
  Sparkles,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  HardHat,
  ShieldCheck,
  Boxes,
  Truck,
  Package,
  Building2,
  Layers,
  Ruler,
  Clock,
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
  materialRequisitions?: Array<{
    id: string
    requisitionNo: string
    status: string
    notes: string | null
    createdAt: string
    createdBy: { fullName: string }
    items: Array<{
      id: string
      materialName: string
      workCategory: string
      finalQuantity: number
      unit: string
    }>
  }>
  purchaseOrders?: Array<{
    id: string
    poNo: string
    status: string
    totalAmount: number
    supplierName: string | null
  }>
  siteDeliveryLogs?: Array<{
    id: string
    challanNo: string | null
    vendorName: string | null
    itemsSummary: string
    quantity: number | null
    unit: string | null
    condition: string
    deliveryDate: string
  }>
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
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INCLUDED' | 'EXCLUDED'>('ALL')

  // Delete Version State
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null)
  const [ceilingWorkOrders, setCeilingWorkOrders] = useState<any[]>([])

  // Quotation Worklist Collapsible States (Floor → Area → Product)
  const [collapsedFloors, setCollapsedFloors] = useState<Record<string, boolean>>({})
  const [collapsedAreas, setCollapsedAreas] = useState<Record<string, boolean>>({})

  const fetchCeilingWorkOrders = useCallback(async () => {
    if (!leadId) return
    try {
      const res = await fetch(`/api/vendors/agreements?leadId=${leadId}`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setCeilingWorkOrders(json.data.filter((ag: any) => ag.workCategory === 'CEILING'))
      }
    } catch {
      // ignore
    }
  }, [leadId])

  const fetchProjectDetail = useCallback(async () => {
    if (!leadId) return
    try {
      const response = await fetch(`/api/pc/projects/${leadId}`, { cache: 'no-store' })
      const data = (await response.json()) as { success: boolean; data?: LeadDetail; error?: string }
      if (data.success && data.data) {
        setLead(data.data)
        if (data.data.quotationDrafts.length > 0) {
          setSelectedDraftId((prev) => prev ?? data.data!.quotationDrafts[0].id)
        }
      } else {
        toast.error(data.error ?? 'Failed to load project')
      }
    } catch {
      toast.error('Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void fetchProjectDetail()
    void fetchCeilingWorkOrders()
  }, [fetchProjectDetail, fetchCeilingWorkOrders])

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

    setSearchQuery('')
    setStatusFilter('ALL')
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

  // Render Quotation To-Do Checklist Content — Hierarchical Floor → Area → Product
  const renderChecklistQuotationContent = (content: unknown) => {
    if (!content || typeof content !== 'object') {
      return <p className="text-muted-foreground text-sm py-4">No product items found.</p>
    }

    const c = content as Record<string, unknown>
    const subject = typeof c.summarySubject === 'string' ? c.summarySubject : (typeof c.subject === 'string' ? c.subject : null)
    const discountAmount = typeof c.discountAmount === 'number' ? c.discountAmount : 0
    const discountPercent = typeof c.discountPercent === 'number' ? c.discountPercent : 0
    const grandTotal = typeof c.grandTotal === 'number' ? c.grandTotal : 0

    if (!Array.isArray(c.lineItems) || c.lineItems.length === 0) {
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

    const rawLines = c.lineItems as QuotationLineItem[]
    const includedLines = rawLines.filter((l) => l.included !== false)

    // Build section (floor) and area maps
    const sectionsMap = new Map<string, { id: string; name: string; sortOrder: number }>()
    if (Array.isArray(c.sections)) {
      ;(c.sections as Array<{ id: string; name?: string; sortOrder?: number }>).forEach((s, idx) => {
        if (s.id && s.name) sectionsMap.set(s.id, { id: s.id, name: s.name, sortOrder: s.sortOrder ?? idx })
      })
    }

    const areasMap = new Map<string, { id: string; name: string; floorId?: string; sortOrder: number }>()
    if (Array.isArray(c.areas)) {
      ;(c.areas as Array<{ id: string; name?: string; floorId?: string; sortOrder?: number }>).forEach((a, idx) => {
        if (a.id && a.name) areasMap.set(a.id, { id: a.id, name: a.name, floorId: a.floorId, sortOrder: a.sortOrder ?? idx })
      })
    }

    // Build Floor → Area → Product hierarchy
    type AreaEntry = { areaId: string; areaName: string; sortOrder: number; lines: QuotationLineItem[] }
    type FloorEntry = { floorId: string; floorName: string; sortOrder: number; areaMap: Map<string, AreaEntry> }

    const floorMap = new Map<string, FloorEntry>()

    sectionsMap.forEach((sec) => {
      floorMap.set(sec.id, { floorId: sec.id, floorName: sec.name, sortOrder: sec.sortOrder, areaMap: new Map() })
    })

    areasMap.forEach((area) => {
      const fId = area.floorId && floorMap.has(area.floorId) ? area.floorId : (area.floorId || 'general-floor')
      let fEntry = floorMap.get(fId)
      if (!fEntry) {
        fEntry = { floorId: fId, floorName: sectionsMap.get(fId)?.name || 'General Floor / Scope', sortOrder: 9999, areaMap: new Map() }
        floorMap.set(fId, fEntry)
      }
      if (!fEntry.areaMap.has(area.id)) {
        fEntry.areaMap.set(area.id, { areaId: area.id, areaName: area.name, sortOrder: area.sortOrder, lines: [] })
      }
    })

    for (const line of includedLines) {
      let fId = line.sectionId
      if (!fId && line.areaId && areasMap.has(line.areaId)) {
        fId = areasMap.get(line.areaId)!.floorId
      }
      if (!fId || (!sectionsMap.has(fId) && fId !== 'general-floor')) {
        fId = 'general-floor'
      }
      const fName = sectionsMap.get(fId!)?.name || (fId === 'general-floor' ? 'General Floor / Scope' : fId!)
      let fEntry = floorMap.get(fId!)
      if (!fEntry) {
        fEntry = { floorId: fId!, floorName: fName, sortOrder: 9999, areaMap: new Map() }
        floorMap.set(fId!, fEntry)
      }
      let aId = line.areaId
      let aName = aId && areasMap.has(aId) ? areasMap.get(aId)!.name : null
      let aSortOrder = aId && areasMap.has(aId) ? areasMap.get(aId)!.sortOrder : 9999
      if (!aId) {
        if (line.sectionId) { aId = `general-area-${line.sectionId}`; aName = 'General Scope'; aSortOrder = 9999 }
        else { aId = 'general-area'; aName = 'General Area'; aSortOrder = 9999 }
      }
      let aEntry = fEntry.areaMap.get(aId)
      if (!aEntry) {
        aEntry = { areaId: aId, areaName: aName || 'General Area', sortOrder: aSortOrder, lines: [] }
        fEntry.areaMap.set(aId, aEntry)
      }
      aEntry.lines.push(line)
    }

    const floors = Array.from(floorMap.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((f) => ({
        ...f,
        areas: Array.from(f.areaMap.values()).sort((a, b) => a.sortOrder - b.sortOrder).filter((a) => a.lines.length > 0),
      }))
      .filter((f) => f.areas.length > 0)

    const totalIncluded = includedLines.length
    const totalCompleted = includedLines.filter((l) => l.completed === true).length

    return (
      <div className="space-y-4">
        {subject ? (
          <div className="p-3 rounded-md bg-muted/30 border text-xs font-medium text-foreground">
            Subject: {subject}
          </div>
        ) : null}

        {/* Expand / Collapse toolbar */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {totalCompleted} / {totalIncluded} items completed across {floors.length} floor{floors.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2.5 gap-1"
              onClick={() => { setCollapsedFloors({}); setCollapsedAreas({}) }}
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Expand All</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2.5 gap-1"
              onClick={() => {
                const cf: Record<string, boolean> = {}
                const ca: Record<string, boolean> = {}
                floors.forEach((f) => { cf[f.floorId] = true; f.areas.forEach((a) => { ca[a.areaId] = true }) })
                setCollapsedFloors(cf)
                setCollapsedAreas(ca)
              }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Collapse All</span>
            </Button>
          </div>
        </div>

        {/* Hierarchical Floor → Area → Product list */}
        <div className="space-y-4">
          {floors.map((floor) => {
            const isFloorCollapsed = Boolean(collapsedFloors[floor.floorId])
            const floorTotal = floor.areas.reduce((s, a) => s + a.lines.length, 0)
            const floorCompleted = floor.areas.reduce((s, a) => s + a.lines.filter((l) => l.completed).length, 0)
            const floorPercent = floorTotal > 0 ? Math.round((floorCompleted / floorTotal) * 100) : 0

            return (
              <div key={floor.floorId} className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-xs">
                {/* Floor Header */}
                <button
                  type="button"
                  onClick={() => setCollapsedFloors((prev) => ({ ...prev, [floor.floorId]: !prev[floor.floorId] }))}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-muted/40 hover:bg-muted/60 transition-colors text-left border-b border-border/60"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-foreground truncate">{floor.floorName}</h4>
                        {floorCompleted === floorTotal && floorTotal > 0 ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] h-5 gap-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> All Done
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">
                            {floorCompleted}/{floorTotal} done
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {floor.areas.length} {floor.areas.length === 1 ? 'Area' : 'Areas'} · {floorTotal} {floorTotal === 1 ? 'Product' : 'Products'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2 overflow-hidden border">
                        <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${floorPercent}%` }} />
                      </div>
                      <span className="text-xs font-mono font-semibold text-muted-foreground">{floorPercent}%</span>
                    </div>
                    <div className="p-1 text-muted-foreground">
                      {isFloorCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </button>

                {/* Areas */}
                {!isFloorCollapsed && (
                  <div className="p-3 sm:p-4 space-y-3 bg-muted/10">
                    {floor.areas.map((area) => {
                      const isAreaCollapsed = Boolean(collapsedAreas[area.areaId])
                      const areaCompleted = area.lines.filter((l) => l.completed).length
                      const areaPercent = area.lines.length > 0 ? Math.round((areaCompleted / area.lines.length) * 100) : 0

                      return (
                        <div key={area.areaId} className="border border-border/70 rounded-lg overflow-hidden bg-background shadow-xs">
                          {/* Area Header */}
                          <button
                            type="button"
                            onClick={() => setCollapsedAreas((prev) => ({ ...prev, [area.areaId]: !prev[area.areaId] }))}
                            className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left border-b border-border/50"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 shrink-0">
                                <Layers className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                                <span className="text-xs sm:text-sm font-semibold text-foreground">
                                  Area: <strong className="text-indigo-900 dark:text-indigo-200">{area.areaName}</strong>
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  ({areaCompleted}/{area.lines.length} done)
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {areaCompleted === area.lines.length && area.lines.length > 0 ? (
                                <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-[10px] h-5 gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Done
                                </Badge>
                              ) : (
                                <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">{areaPercent}%</span>
                              )}
                              <div className="text-muted-foreground p-0.5">
                                {isAreaCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </button>

                          {/* Quotation Products inside Area */}
                          {!isAreaCollapsed && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground border-b">
                                    <th className="py-2.5 px-3 w-10 text-center">Done</th>
                                    <th className="py-2.5 pr-4 font-semibold">Product &amp; Work Specification</th>
                                    <th className="py-2.5 pr-3 font-semibold text-right w-24">Qty / Sqft</th>
                                    <th className="py-2.5 pr-3 font-semibold text-right w-24">Rate (৳)</th>
                                    <th className="py-2.5 pr-3 font-semibold text-right w-28">Total (৳)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                  {area.lines.map((line) => {
                                    const isDone = Boolean(line.completed)
                                    const isUpdating = updatingItemId === line.id
                                    return (
                                      <tr
                                        key={line.id}
                                        className={`align-top transition-colors ${isDone ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : 'hover:bg-muted/20'}`}
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
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

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

        {/* Ceiling Vendor Work Orders Management */}
        <Card className="border border-purple-500/30 bg-purple-500/[0.02]">
          <CardHeader className="pb-3 border-b border-purple-500/20 bg-purple-500/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    Ceiling Scope Vendor Work Orders
                    <Badge variant="outline" className="border-purple-300 text-purple-700 dark:text-purple-300 text-xs font-mono">
                      {ceilingWorkOrders.length} {ceilingWorkOrders.length === 1 ? 'Work Order' : 'Work Orders'}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Project Coordinator & BOQ Team Leader management. Work orders and financial terms automatically sync with Accounts.
                  </p>
                </div>
              </div>
              <Link
                href={`/crm/boq/builder/${lead.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" /> Manage in BOQ Builder
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {ceilingWorkOrders.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
                <p>No direct vendor work orders issued for ceiling items on this project yet.</p>
                <p className="text-[11px]">
                  Use the <Link href={`/crm/boq/builder/${lead.id}`} className="text-purple-600 underline font-semibold">BOQ Builder</Link> to switch ceiling items from standard material requisition to direct vendor work orders.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ceilingWorkOrders.map((wo) => (
                  <div
                    key={wo.id}
                    className="p-3.5 rounded-xl border border-purple-500/20 bg-card space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300 block">
                          {wo.workOrderNo || 'WO-CEIL'}
                        </span>
                        <h4 className="font-bold text-sm text-foreground">{wo.vendor?.vendorName}</h4>
                        {wo.vendor?.primaryPhone && (
                          <span className="text-[11px] text-muted-foreground">{wo.vendor.primaryPhone}</span>
                        )}
                      </div>
                      <Badge className="text-[10px] uppercase font-bold">
                        {wo.workStatus?.replace(/_/g, ' ') || 'NOT STARTED'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs p-2 rounded-lg bg-muted/40 border border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Agreed Value</span>
                        <span className="font-bold text-foreground">৳{wo.agreementValue.toLocaleString('en-BD')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Paid / Balance</span>
                        <span className="font-semibold text-emerald-600">৳{wo.totalPaid.toLocaleString('en-BD')}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="font-semibold text-amber-600">৳{wo.balance.toLocaleString('en-BD')}</span>
                      </div>
                    </div>

                    {wo.workScope && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {wo.workScope}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <ShieldCheck className="w-3 h-3" /> Synced with Accounts
                      </span>
                      {wo.createdBy && <span>By: {wo.createdBy.fullName}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* BOQ Material Requisitions & Site Gate Deliveries Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Requisitions Card */}
          <Card className="border border-blue-500/30 bg-blue-500/[0.02]">
            <CardHeader className="pb-2.5 border-b border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    BOQ Material Requisitions ({lead.materialRequisitions?.length || 0})
                  </CardTitle>
                </div>
                <Link
                  href={`/crm/boq/builder/${lead.id}`}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Open BOQ Builder →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-3 text-xs space-y-2">
              {(!lead.materialRequisitions || lead.materialRequisitions.length === 0) ? (
                <p className="text-muted-foreground py-2 text-center">No requisitions submitted yet.</p>
              ) : (
                lead.materialRequisitions.slice(0, 3).map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-2 rounded-lg bg-card border">
                    <div>
                      <span className="font-mono font-bold">{req.requisitionNo}</span>
                      <div className="text-[10px] text-muted-foreground">{req.items?.length || 0} items • By {req.createdBy?.fullName}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {req.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Site Gate Deliveries Card */}
          <Card className="border border-amber-500/30 bg-amber-500/[0.02]">
            <CardHeader className="pb-2.5 border-b border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    Site Gate Deliveries ({lead.siteDeliveryLogs?.length || 0})
                  </CardTitle>
                </div>
                <Link
                  href={`/site-engineer/delivery?leadId=${lead.id}`}
                  className="text-xs text-amber-600 hover:underline font-semibold"
                >
                  View All Deliveries →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-3 text-xs space-y-2">
              {(!lead.siteDeliveryLogs || lead.siteDeliveryLogs.length === 0) ? (
                <p className="text-muted-foreground py-2 text-center">No deliveries logged at gate yet.</p>
              ) : (
                lead.siteDeliveryLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-card border">
                    <div className="truncate max-w-[200px]">
                      <span className="font-semibold block truncate">{log.itemsSummary}</span>
                      <div className="text-[10px] text-muted-foreground font-mono">Challan: {log.challanNo || 'N/A'}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {log.condition}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

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
                      href={`/crm/boq/builder/${lead.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3 py-1.5 text-xs font-semibold hover:bg-purple-500/20 transition-colors shadow-2xs"
                    >
                      <HardHat className="h-3.5 w-3.5 text-purple-600" />
                      Ceiling Work Orders & BOQ
                    </Link>

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
        <DialogContent className="max-w-[96vw] xl:max-w-7xl w-[96vw] h-[92vh] max-h-[92vh] !grid-cols-1 flex flex-col overflow-hidden !gap-0 p-0 rounded-xl">
          {/* Modal Header */}
          <DialogHeader className="border-b shrink-0 px-6 pt-5 pb-4 space-y-3 bg-muted/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Edit2 className="h-5 w-5 text-primary" />
                  <span>Edit Product Scope & Create New Version</span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adjust product sqft/qty or cancel items. Saving will create a new protected revision while preserving baseline.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  const nextState = !allSpecsExpanded
                  setAllSpecsExpanded(nextState)
                  const updated: Record<string, boolean> = {}
                  editableItems.forEach((it) => {
                    if (it.id) updated[it.id] = nextState
                  })
                  setExpandedSpecs(updated)
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                {allSpecsExpanded ? 'Collapse All Specs' : 'Expand All Specs'}
              </Button>
            </div>

            {/* Search & Status Filters Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 border-border/60">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search product description or material specs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs bg-background"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border/40">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    statusFilter === 'ALL'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({editableItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('INCLUDED')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    statusFilter === 'INCLUDED'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Included ({editableItems.filter((i) => i.included).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('EXCLUDED')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    statusFilter === 'EXCLUDED'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Cancelled ({editableItems.filter((i) => !i.included).length})
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Body List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {(() => {
              const filteredItems = editableItems.filter((item) => {
                const q = searchQuery.trim().toLowerCase()
                const matchesQuery =
                  !q ||
                  item.description.toLowerCase().includes(q) ||
                  (item.materials && item.materials.toLowerCase().includes(q))
                if (!matchesQuery) return false

                if (statusFilter === 'INCLUDED') return item.included
                if (statusFilter === 'EXCLUDED') return !item.included
                return true
              })

              if (filteredItems.length === 0) {
                return (
                  <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                    <p className="font-semibold text-sm text-foreground">No matching products found</p>
                    <p>Try clearing your search query or filter tab.</p>
                  </div>
                )
              }

              return filteredItems.map((item) => {
                // Find actual index in original editableItems
                const realIndex = editableItems.findIndex((it) => it.id === item.id)
                const idx = realIndex !== -1 ? realIndex : 0

                const lineAmount = item.included
                  ? item.unit === 'ls'
                    ? item.rate
                    : item.rate * item.quantity
                  : 0
                const isExpanded = Boolean(expandedSpecs[item.id])

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      item.included
                        ? 'bg-card border-border shadow-xs hover:border-primary/40'
                        : 'bg-muted/30 border-dashed border-rose-300/80 dark:border-rose-900/60 opacity-80'
                    }`}
                  >
                    {/* Top Row: Item Index, Description, Inclusion Status, and Rate */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-[280px]">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-bold px-2 py-0.5 mt-0.5 shrink-0 bg-muted"
                        >
                          #{String(idx + 1).padStart(2, '0')}
                        </Badge>
                        <div>
                          <div className="font-bold text-sm text-foreground leading-snug">
                            {item.description}
                          </div>
                          {item.materials ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSpecs((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                              }
                              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 mt-1"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" /> Hide Specs
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" /> Show Material Specs
                                </>
                              )}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Inclusion Status Badge */}
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold px-2.5 py-0.5 ${
                            item.included
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}
                        >
                          {item.included ? '✓ Included' : '✕ Cancelled'}
                        </Badge>

                        {/* Rate info */}
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-semibold text-muted-foreground">Rate</div>
                          <div className="text-xs font-bold text-foreground">
                            ৳{item.rate.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">/ {item.unit}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Specs Box */}
                    {item.materials && isExpanded ? (
                      <div className="my-2.5 text-xs leading-relaxed text-muted-foreground whitespace-pre-line bg-muted/40 p-3 rounded-lg border border-border/60">
                        {item.materials}
                      </div>
                    ) : null}

                    {/* Interactive Controls & Subtotal Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 border-border/50">
                      {/* Quantity Controller */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Quantity / Sqft:</span>
                        {item.unit === 'ls' ? (
                          <Badge variant="secondary" className="text-xs font-semibold px-3 py-1">
                            Lump Sum (Fixed)
                          </Badge>
                        ) : (
                          <div className="flex items-center">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-9 w-9 rounded-r-none border-r-0 shrink-0"
                              disabled={!item.included || item.quantity <= 0}
                              onClick={() => {
                                setEditableItems((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, quantity: Math.max(0, it.quantity - 1) } : it,
                                  ),
                                )
                              }}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
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
                              className="h-9 w-24 text-center font-bold text-sm tabular-nums rounded-none border-x-0 bg-background focus-visible:ring-1"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-9 w-9 rounded-l-none border-l-0 shrink-0"
                              disabled={!item.included}
                              onClick={() => {
                                setEditableItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, quantity: it.quantity + 1 } : it)),
                                )
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="ml-2 text-xs font-bold uppercase text-muted-foreground">
                              {item.unit}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Line Subtotal & Item Action */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-semibold text-muted-foreground">Subtotal</div>
                          <div className={`text-base font-extrabold tabular-nums ${item.included ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                            ৳{lineAmount.toLocaleString()} BDT
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant={item.included ? 'outline' : 'default'}
                          className={`h-9 text-xs px-3 font-semibold gap-1.5 transition-colors ${
                            item.included
                              ? 'border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                          }`}
                          onClick={() => {
                            setEditableItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, included: !it.included } : it)),
                            )
                          }}
                        >
                          {item.included ? (
                            <>
                              <X className="h-3.5 w-3.5" /> Cancel Item
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" /> Restore Item
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>

          {/* Modal Footer Bar */}
          <div className="flex flex-wrap items-center justify-between border-t pt-3.5 pb-5 px-6 gap-3 shrink-0 bg-muted/20">
            <div className="flex items-center gap-4 text-xs">
              <div>
                Total Scope Value:{' '}
                <strong className="text-base font-bold text-foreground ml-1">
                  ৳
                  {editableItems
                    .filter((i) => i.included)
                    .reduce((sum, i) => sum + (i.unit === 'ls' ? i.rate : i.rate * i.quantity), 0)
                    .toLocaleString()}{' '}
                  BDT
                </strong>
              </div>
              <span className="text-muted-foreground/40">•</span>
              <div>
                Total Included Sqft:{' '}
                <strong className="text-base font-bold text-emerald-600 dark:text-emerald-400 ml-1">
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
                className="bg-primary text-primary-foreground font-semibold px-4"
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
