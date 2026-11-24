'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FolderKanban,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Phone,
  FileText,
  Boxes,
  CheckSquare,
  Square,
  RefreshCw,
  Loader2,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  Search,
  Filter,
  Building2,
  Layers,
  Package,
  ChevronDown,
  ChevronRight,
  Tag,
  Ruler,
  AlertTriangle,
  Upload,
  Check,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

// ── TYPES ──

type QuotationSection = {
  id: string
  name: string
  sortOrder?: number
}

type QuotationArea = {
  id: string
  floorId: string
  name: string
  sortOrder?: number
}

type QuotationLineItem = {
  id: string
  description?: string
  quantity?: number
  unit?: string
  materials?: string
  sectionId?: string
  areaId?: string
  included?: boolean
  completed?: boolean
}

type QuotationDraft = {
  id: string
  draftKey: string
  quotationType?: string
  projectSqft?: number | null
  grandTotal: number
  status: string
  updatedAt: string
  content: unknown
}

type MaterialRequisitionItem = {
  id: string
  quotationLineItemId?: string | null
  materialName: string
  workCategory: string
  finalQuantity: number
  unit: string
  specifications: string | null
  remarks: string | null
  variantAttributes?: Record<string, unknown> | null
}

type MaterialRequisition = {
  id: string
  requisitionNo: string
  status: string
  notes: string | null
  createdAt: string
  createdBy: { fullName: string }
  items: MaterialRequisitionItem[]
}

type PurchaseOrderItem = {
  id: string
  quantity: number
  unitPrice?: number
  total?: number
  requisitionItem: {
    id?: string
    materialName: string
    unit: string
    specifications?: string | null
    workCategory?: string | null
    quotationLineItemId?: string | null
  }
}

type PurchaseOrder = {
  id: string
  poNo: string
  status: string
  totalAmount?: number
  supplierName: string | null
  notes: string | null
  accountsNote: string | null
  createdAt: string
  approvedAt: string | null
  createdBy: { fullName: string }
  approvedBy: { fullName: string } | null
  indent?: {
    indentNo: string
    items: PurchaseOrderItem[]
  }
}

type SiteDeliveryLog = {
  id: string
  challanNo: string | null
  vendorName: string | null
  itemsSummary: string
  quantity: number | null
  unit: string | null
  deliveryDate: string
  condition: 'GOOD' | 'PARTIAL' | 'DAMAGED' | 'REJECTED'
  slipUrl: string | null
  notes: string | null
  receivedBy: { fullName: string }
}

type LeadProject = {
  id: string
  name: string
  location: string | null
  phone: string | null
  stage: string
  subStatus: string | null
  agreementType: string | null
  agreementSqft?: number | null
  created_at: string
  assignments: Array<{ user: { fullName: string } }>
  quotationDrafts: QuotationDraft[]
  materialRequisitions: MaterialRequisition[]
  purchaseOrders: PurchaseOrder[]
  siteDeliveryLogs: SiteDeliveryLog[]
}

export default function SiteEngineerProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const leadId = params?.id
  const router = useRouter()

  const [lead, setLead] = useState<LeadProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'QUOTATION' | 'REQUISITION' | 'DELIVERY'>('QUOTATION')
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  // Checklist filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL')
  const [filterFloor, setFilterFloor] = useState<string>('ALL')
  const [filterArea, setFilterArea] = useState<string>('ALL')

  // Requisitions filters
  const [reqViewMode, setReqViewMode] = useState<'HIERARCHY' | 'LIST'>('HIERARCHY')
  const [reqSearch, setReqSearch] = useState('')

  // Quick Gate Delivery Modal State
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [challanNo, setChallanNo] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [itemsSummary, setItemsSummary] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('Pcs')
  const [condition, setCondition] = useState<'GOOD' | 'PARTIAL' | 'DAMAGED' | 'REJECTED'>('GOOD')
  const [slipUrl, setSlipUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [uploadingSlip, setUploadingSlip] = useState(false)
  const [submittingDelivery, setSubmittingDelivery] = useState(false)

  // Fetch Project Data
  const fetchProjectData = useCallback(async () => {
    if (!leadId) return
    try {
      setRefreshing(true)
      const res = await fetch(`/api/pc/projects/${leadId}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load project details')
      }
      setLead(json.data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error loading project')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchProjectData()
  }, [fetchProjectData])

  // Select active quotation draft:
  // Prefer 'detail:*' draft (has lineItems/sections/areas) over 'short:*' package drafts.
  // Within the same type, pick the most recently updated one.
  const activeDraft = useMemo(() => {
    if (!lead?.quotationDrafts || lead.quotationDrafts.length === 0) return null
    // Prefer any draft whose draftKey starts with 'detail'
    const detailDraft = lead.quotationDrafts.find((d) => d.draftKey?.startsWith('detail'))
    return detailDraft ?? lead.quotationDrafts[0]
  }, [lead])

  // Extract content object
  const draftContent = useMemo(() => {
    if (!activeDraft?.content || typeof activeDraft.content !== 'object') return null
    return activeDraft.content as {
      sections?: QuotationSection[]
      areas?: QuotationArea[]
      lineItems?: QuotationLineItem[]
      floors?: Array<{ id: string; name: string }>
    }
  }, [activeDraft])

  // Sections (Floors)
  const sections = useMemo(() => {
    if (Array.isArray(draftContent?.sections)) return draftContent.sections
    if (Array.isArray(draftContent?.floors)) {
      return draftContent.floors.map((f, idx) => ({ id: f.id, name: f.name, sortOrder: idx }))
    }
    return []
  }, [draftContent])

  // Areas
  const areas = useMemo(() => {
    return Array.isArray(draftContent?.areas) ? draftContent.areas : []
  }, [draftContent])

  // Mapping lookup maps
  const sectionMap = useMemo(() => {
    const map = new Map<string, string>()
    sections.forEach((s) => map.set(s.id, s.name))
    return map
  }, [sections])

  const areaMap = useMemo(() => {
    const map = new Map<string, { name: string; floorId: string }>()
    areas.forEach((a) => map.set(a.id, { name: a.name, floorId: a.floorId }))
    return map
  }, [areas])

  // Helper functions for floor and area resolution
  const getFloorName = useCallback(
    (item: QuotationLineItem) => {
      if (item.sectionId && sectionMap.has(item.sectionId)) {
        return sectionMap.get(item.sectionId)!
      }
      if (item.areaId && areaMap.has(item.areaId)) {
        const a = areaMap.get(item.areaId)!
        if (a.floorId && sectionMap.has(a.floorId)) {
          return sectionMap.get(a.floorId)!
        }
      }
      return 'General Floor / Scope'
    },
    [sectionMap, areaMap],
  )

  const getAreaName = useCallback(
    (item: QuotationLineItem) => {
      if (item.areaId && areaMap.has(item.areaId)) {
        return areaMap.get(item.areaId)!.name
      }
      return 'General Area'
    },
    [areaMap],
  )

  // Extract included quotation line items
  const quotationLineItems = useMemo(() => {
    if (!draftContent) return []
    const items = Array.isArray(draftContent.lineItems) ? draftContent.lineItems : []
    return items.filter((i) => i.included !== false)
  }, [draftContent])

  // Total Project Sqft
  const totalProjectSqft = useMemo(() => {
    if (lead?.agreementSqft && lead.agreementSqft > 0) return lead.agreementSqft
    if (activeDraft?.projectSqft && activeDraft.projectSqft > 0) return activeDraft.projectSqft
    const calculated = quotationLineItems
      .filter((i) => i.unit?.toLowerCase() === 'sqft')
      .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
    return calculated > 0 ? calculated : null
  }, [lead, activeDraft, quotationLineItems])

  // Progress stats calculation
  const progressStats = useMemo(() => {
    const total = quotationLineItems.length
    const completed = quotationLineItems.filter((i) => i.completed === true).length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, percent }
  }, [quotationLineItems])

  // Toggle Item Completion Checkmark
  const handleToggleItemStatus = async (lineId: string, currentCompleted: boolean) => {
    if (!activeDraft || !leadId) return
    setUpdatingItemId(lineId)
    const nextCompleted = !currentCompleted

    try {
      const response = await fetch(`/api/site-engineer/projects/${leadId}/item-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: activeDraft.id,
          lineId,
          completed: nextCompleted,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to update item status')
      }

      // Optimistically update local state
      setLead((prev) => {
        if (!prev) return prev
        const updatedDrafts = prev.quotationDrafts.map((d) => {
          if (d.id !== activeDraft.id) return d
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

      toast.success(nextCompleted ? 'Work item marked as completed ✓' : 'Marked as pending')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update work item status')
    } finally {
      setUpdatingItemId(null)
    }
  }

  // Filtered quotation items for Checklist
  const filteredLineItems = useMemo(() => {
    return quotationLineItems.filter((item) => {
      const floorName = getFloorName(item)
      const areaName = getAreaName(item)

      const matchesSearch =
        !searchQuery ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.materials && item.materials.toLowerCase().includes(searchQuery.toLowerCase())) ||
        floorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        areaName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'COMPLETED' && item.completed === true) ||
        (filterStatus === 'PENDING' && !item.completed)

      const matchesFloor = filterFloor === 'ALL' || item.sectionId === filterFloor
      const matchesArea = filterArea === 'ALL' || item.areaId === filterArea

      return matchesSearch && matchesStatus && matchesFloor && matchesArea
    })
  }, [quotationLineItems, searchQuery, filterStatus, filterFloor, filterArea, getFloorName, getAreaName])

  // ── MATERIAL REQUISITIONS HIERARCHICAL BOQ MAPPING ──
  const allRequisitionItems = useMemo(() => {
    if (!lead?.materialRequisitions) return []
    const list: Array<
      MaterialRequisitionItem & {
        requisitionNo: string
        requisitionStatus: string
        requisitionCreatedAt: string
        requisitionCreator: string
      }
    > = []
    for (const req of lead.materialRequisitions) {
      for (const it of req.items) {
        list.push({
          ...it,
          requisitionNo: req.requisitionNo,
          requisitionStatus: req.status,
          requisitionCreatedAt: req.createdAt,
          requisitionCreator: req.createdBy?.fullName || 'BOQ Team',
        })
      }
    }
    return list
  }, [lead])

  // Group requisition items by quotationLineItemId
  const reqItemsByLineItemId = useMemo(() => {
    const map = new Map<string, Array<(typeof allRequisitionItems)[0]>>()
    const unlinked: Array<(typeof allRequisitionItems)[0]> = []

    for (const it of allRequisitionItems) {
      if (it.quotationLineItemId) {
        const existing = map.get(it.quotationLineItemId) || []
        existing.push(it)
        map.set(it.quotationLineItemId, existing)
      } else {
        unlinked.push(it)
      }
    }
    return { map, unlinked }
  }, [allRequisitionItems])

  // Hierarchical BOQ structure: Floor -> Area -> Quotation Product -> Requisition Materials
  const hierarchicalQuotationBOQ = useMemo(() => {
    const floorMap = new Map<
      string,
      {
        floorId: string
        floorName: string
        areaMap: Map<
          string,
          {
            areaId: string
            areaName: string
            products: Array<{
              product: QuotationLineItem
              materials: Array<(typeof allRequisitionItems)[0]>
            }>
          }
        >
      }
    >()

    // Seed floors
    sections.forEach((s) => {
      floorMap.set(s.id, {
        floorId: s.id,
        floorName: s.name,
        areaMap: new Map(),
      })
    })

    // Seed areas
    areas.forEach((a) => {
      const fId = a.floorId || 'general-floor'
      let floorEntry = floorMap.get(fId)
      if (!floorEntry) {
        floorEntry = { floorId: fId, floorName: sectionMap.get(fId) || 'General Floor', areaMap: new Map() }
        floorMap.set(fId, floorEntry)
      }
      if (!floorEntry.areaMap.has(a.id)) {
        floorEntry.areaMap.set(a.id, {
          areaId: a.id,
          areaName: a.name,
          products: [],
        })
      }
    })

    // Distribute quotation products
    for (const item of quotationLineItems) {
      const fId = item.sectionId || 'general-floor'
      const fName = getFloorName(item)
      let floorEntry = floorMap.get(fId)
      if (!floorEntry) {
        floorEntry = { floorId: fId, floorName: fName, areaMap: new Map() }
        floorMap.set(fId, floorEntry)
      }

      const aId = item.areaId || 'general-area'
      const aName = getAreaName(item)
      let areaEntry = floorEntry.areaMap.get(aId)
      if (!areaEntry) {
        areaEntry = { areaId: aId, areaName: aName, products: [] }
        floorEntry.areaMap.set(aId, areaEntry)
      }

      const materials = reqItemsByLineItemId.map.get(item.id) || []
      areaEntry.products.push({
        product: item,
        materials,
      })
    }

    // Convert map to clean array
    const result: Array<{
      floorId: string
      floorName: string
      areas: Array<{
        areaId: string
        areaName: string
        products: Array<{
          product: QuotationLineItem
          materials: Array<(typeof allRequisitionItems)[0]>
        }>
      }>
    }> = []

    for (const [, floor] of floorMap) {
      const areaList: Array<{
        areaId: string
        areaName: string
        products: Array<{
          product: QuotationLineItem
          materials: Array<(typeof allRequisitionItems)[0]>
        }>
      }> = []

      for (const [, area] of floor.areaMap) {
        // Filter by reqSearch if active
        let products = area.products
        if (reqSearch.trim()) {
          const q = reqSearch.toLowerCase()
          products = products.filter(
            (p) =>
              (p.product.description && p.product.description.toLowerCase().includes(q)) ||
              (p.product.materials && p.product.materials.toLowerCase().includes(q)) ||
              p.materials.some(
                (m) =>
                  m.materialName.toLowerCase().includes(q) ||
                  (m.specifications && m.specifications.toLowerCase().includes(q)) ||
                  m.workCategory.toLowerCase().includes(q) ||
                  m.requisitionNo.toLowerCase().includes(q),
              ),
          )
        }

        if (products.length > 0) {
          areaList.push({
            ...area,
            products,
          })
        }
      }

      if (areaList.length > 0) {
        result.push({
          floorId: floor.floorId,
          floorName: floor.floorName,
          areas: areaList,
        })
      }
    }

    return {
      floors: result,
      unlinkedMaterials: reqItemsByLineItemId.unlinked,
    }
  }, [sections, areas, quotationLineItems, reqItemsByLineItemId, sectionMap, getFloorName, getAreaName, reqSearch])

  // ── PURCHASE ORDERS & MATERIAL SITUATION ──
  // Compute material delivery situation for each PO item
  const getMaterialSituation = useCallback(
    (materialName: string, po: PurchaseOrder) => {
      // 1. If PO is marked FULFILLED, all materials are considered delivered
      if (po.status === 'FULFILLED') {
        return {
          situation: 'DELIVERED' as const,
          label: 'Delivered',
          badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
          detail: 'Fulfilled & received on site',
        }
      }

      // 2. Check if any site delivery log matches this material name or PO number
      const qMat = materialName.toLowerCase().trim()
      const qPo = po.poNo.toLowerCase().trim()
      const matchingDelivery = lead?.siteDeliveryLogs?.find(
        (log) =>
          (log.itemsSummary && log.itemsSummary.toLowerCase().includes(qMat)) ||
          (log.challanNo && log.challanNo.toLowerCase().includes(qPo)) ||
          (log.notes && log.notes.toLowerCase().includes(qPo)),
      )

      if (matchingDelivery) {
        return {
          situation: 'DELIVERED' as const,
          label: 'Delivered',
          badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
          detail: `Challan #${matchingDelivery.challanNo || '—'} on ${new Date(
            matchingDelivery.deliveryDate,
          ).toLocaleDateString('en-GB')}`,
        }
      }

      // 3. If PO is approved by Accounts but not yet delivered
      if (po.status === 'APPROVED') {
        return {
          situation: 'NOT_DELIVERED' as const,
          label: 'Not Delivered',
          badgeClass: 'border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
          detail: 'Purchased • Awaiting site arrival',
        }
      }

      // 4. If PO is still pending accounts approval
      return {
        situation: 'PURCHASED' as const,
        label: 'Purchased (Pending Accounts)',
        badgeClass: 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
        detail: 'In PO • Pending accounts approval',
      }
    },
    [lead?.siteDeliveryLogs],
  )

  // Quick Open Delivery Modal for PO
  const handleOpenDeliveryForPO = (po: PurchaseOrder) => {
    setSelectedPO(po)
    setVendorName(po.supplierName || '')
    if (po.indent?.items && po.indent.items.length > 0) {
      const summary = po.indent.items
        .map(
          (it) =>
            `${it.requisitionItem?.materialName || 'Material'} (${it.quantity} ${
              it.requisitionItem?.unit || 'Pcs'
            })`,
        )
        .join(', ')
      setItemsSummary(summary)
      const totalQty = po.indent.items.reduce((s, it) => s + Number(it.quantity || 0), 0)
      setQuantity(totalQty > 0 ? String(totalQty) : '')
      setUnit(po.indent.items[0]?.requisitionItem?.unit || 'Pcs')
    } else {
      setItemsSummary(`Materials under Purchase Order ${po.poNo}`)
    }
    setDeliveryModalOpen(true)
  }

  // Handle Challan Slip Upload
  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingSlip(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('context', 'site-delivery-challan')

      const res = await fetch('/api/gcs/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.fileUrl) {
        setSlipUrl(json.fileUrl)
        toast.success('Challan slip photo uploaded successfully!')
      } else {
        toast.error('Upload succeeded but no file URL returned')
      }
    } catch {
      toast.error('Failed to upload challan slip')
    } finally {
      setUploadingSlip(false)
    }
  }

  // Handle Submitting Site Gate Delivery
  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadId) return

    if (!itemsSummary.trim()) {
      toast.error('Material items summary is required')
      return
    }

    setSubmittingDelivery(true)
    try {
      const res = await fetch('/api/site-engineer/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          challanNo: challanNo.trim() || null,
          vendorName: vendorName.trim() || null,
          itemsSummary: itemsSummary.trim(),
          quantity: quantity ? Number(quantity) : null,
          unit: unit.trim() || 'Pcs',
          deliveryDate: new Date().toISOString(),
          condition,
          slipUrl: slipUrl.trim() || null,
          notes: notes.trim() || null,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record site delivery')
      }

      toast.success('Gate delivery logged successfully!')
      setDeliveryModalOpen(false)
      setSelectedPO(null)
      setChallanNo('')
      setVendorName('')
      setItemsSummary('')
      setQuantity('')
      setNotes('')
      setSlipUrl('')

      // Refresh data to show new delivery log and updated material situation
      fetchProjectData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error recording delivery')
    } finally {
      setSubmittingDelivery(false)
    }
  }

  // PO delivery stats summary
  const poDeliveryStats = useMemo(() => {
    const pos = lead?.purchaseOrders || []
    let totalItems = 0
    let deliveredItems = 0
    let notDeliveredItems = 0

    for (const po of pos) {
      if (po.indent?.items) {
        for (const item of po.indent.items) {
          totalItems++
          const sit = getMaterialSituation(item.requisitionItem?.materialName || '', po)
          if (sit.situation === 'DELIVERED') {
            deliveredItems++
          } else {
            notDeliveredItems++
          }
        }
      }
    }

    return {
      totalPOs: pos.length,
      totalItems,
      deliveredItems,
      notDeliveredItems,
    }
  }, [lead?.purchaseOrders, getMaterialSituation])

  // ── RENDER LOADING OR NOT FOUND ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm">Loading project scope and quotation...</p>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold">Project Not Found</h2>
        <p className="text-xs text-muted-foreground">This project could not be found or you do not have permission.</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/site-engineer/projects">Back to Projects</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/site-engineer/projects" className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Projects
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{lead.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FolderKanban className="w-7 h-7 text-blue-600 shrink-0" />
              {lead.name}
            </h1>
            <Badge variant="outline" className="text-xs capitalize font-semibold bg-muted/40">
              {lead.stage.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1">
            {lead.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {lead.location}
              </span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5" /> {lead.phone}
              </span>
            )}
            {totalProjectSqft && (
              <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">
                <Ruler className="w-3.5 h-3.5" /> Project Area: {totalProjectSqft.toLocaleString()} sqft
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProjectData}
            disabled={refreshing}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setSelectedPO(null)
              setChallanNo('')
              setVendorName('')
              setItemsSummary('')
              setQuantity('')
              setNotes('')
              setSlipUrl('')
              setDeliveryModalOpen(true)
            }}
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white h-9"
          >
            <Truck className="w-4 h-4" />
            Log Site Delivery
          </Button>
        </div>
      </div>

      {/* ── PROJECT PROGRESS METER (Based on Quotation Checklist) ── */}
      <Card className="border-border bg-gradient-to-br from-card to-muted/20 shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Project Site Execution Progress Meter
              </div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {progressStats.completed} of {progressStats.total} quotation work items completed
                {totalProjectSqft ? ` • ${totalProjectSqft.toLocaleString()} Total Sqft` : ''}
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {progressStats.percent}%
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-3.5 overflow-hidden p-0.5 border">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out shadow-xs"
              style={{ width: `${progressStats.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>Check items below as work finishes on site to drive the execution meter forward</span>
            <span className="font-medium text-foreground">
              {progressStats.total - progressStats.completed} items remaining
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto">
        <Button
          variant="ghost"
          size="sm"
          className={`h-10 text-xs sm:text-sm font-medium border-b-2 rounded-none px-4 transition-colors shrink-0 ${
            activeTab === 'QUOTATION'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('QUOTATION')}
        >
          <CheckCircle2 className="w-4 h-4 mr-1.5" />
          Quotation Work Checklist ({quotationLineItems.length})
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`h-10 text-xs sm:text-sm font-medium border-b-2 rounded-none px-4 transition-colors shrink-0 ${
            activeTab === 'REQUISITION'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('REQUISITION')}
        >
          <Boxes className="w-4 h-4 mr-1.5" />
          Material Requisitions ({allRequisitionItems.length})
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`h-10 text-xs sm:text-sm font-medium border-b-2 rounded-none px-4 transition-colors shrink-0 ${
            activeTab === 'DELIVERY'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('DELIVERY')}
        >
          <Truck className="w-4 h-4 mr-1.5" />
          Orders &amp; Deliveries ({lead.purchaseOrders?.length || 0} POs)
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: QUOTATION WORK CHECKLIST (Floor, Area, Sqft, NO AMOUNT)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'QUOTATION' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search scope, materials, floor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Floor Filter */}
              {sections.length > 0 && (
                <Select value={filterFloor} onValueChange={setFilterFloor}>
                  <SelectTrigger className="text-xs h-8 w-36">
                    <SelectValue placeholder="All Floors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Floors</SelectItem>
                    {sections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id} className="text-xs">
                        {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Area Filter */}
              {areas.length > 0 && (
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="text-xs h-8 w-36">
                    <SelectValue placeholder="All Areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Areas</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id} className="text-xs">
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border">
                <Button
                  variant={filterStatus === 'ALL' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-xs h-7 px-2.5"
                  onClick={() => setFilterStatus('ALL')}
                >
                  All ({quotationLineItems.length})
                </Button>
                <Button
                  variant={filterStatus === 'PENDING' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-xs h-7 px-2.5 text-amber-700 dark:text-amber-300"
                  onClick={() => setFilterStatus('PENDING')}
                >
                  Pending ({quotationLineItems.filter((i) => !i.completed).length})
                </Button>
                <Button
                  variant={filterStatus === 'COMPLETED' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-xs h-7 px-2.5 text-emerald-700 dark:text-emerald-300"
                  onClick={() => setFilterStatus('COMPLETED')}
                >
                  Completed ({quotationLineItems.filter((i) => i.completed).length})
                </Button>
              </div>
            </div>
          </div>

          {/* Checklist Items */}
          {filteredLineItems.length === 0 ? (
            <div className="p-12 text-center border rounded-xl bg-card space-y-2">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold">No work items found</h3>
              <p className="text-xs text-muted-foreground">Adjust your search or filter settings.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLineItems.map((item, idx) => {
                const isCompleted = item.completed === true
                const isUpdating = updatingItemId === item.id
                const floorName = getFloorName(item)
                const areaName = getAreaName(item)
                const isSqft = item.unit?.toLowerCase() === 'sqft'

                return (
                  <Card
                    key={item.id || idx}
                    className={`transition-all duration-200 border ${
                      isCompleted
                        ? 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-950 dark:bg-emerald-950/10'
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        {/* Floor, Area & Sqft Tags */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-muted-foreground font-semibold">
                            #{idx + 1}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 gap-1 font-medium"
                          >
                            <Building2 className="w-3 h-3 text-blue-600" />
                            Floor: {floorName}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 gap-1 font-medium"
                          >
                            <Layers className="w-3 h-3 text-indigo-600" />
                            Area: {areaName}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 gap-1 ${
                              isSqft
                                ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            <Ruler className="w-3 h-3 text-amber-600" />
                            {item.quantity ?? 1} {item.unit || 'sqft'}
                          </Badge>
                        </div>

                        {/* Title & Status */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <span
                            className={`text-sm font-semibold leading-tight ${
                              isCompleted ? 'text-foreground line-through opacity-85' : 'text-foreground'
                            }`}
                          >
                            {item.description || 'Custom Product / Work Scope'}
                          </span>
                          {isCompleted ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] h-5 gap-1 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-5 text-amber-700 dark:text-amber-400 border-amber-300">
                              <Clock className="w-3 h-3 mr-1" /> In Progress
                            </Badge>
                          )}
                        </div>

                        {/* Specifications & Materials Text */}
                        {item.materials && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.materials}
                          </p>
                        )}
                      </div>

                      {/* Checkmark Action Button */}
                      <div className="flex items-center gap-2 shrink-0 sm:self-center">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isUpdating}
                          variant={isCompleted ? 'default' : 'outline'}
                          className={`text-xs h-9 px-4 font-semibold gap-1.5 transition-colors ${
                            isCompleted
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'hover:bg-muted/60 text-foreground'
                          }`}
                          onClick={() => handleToggleItemStatus(item.id, isCompleted)}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isCompleted ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                          <span>{isCompleted ? 'Completed ✓' : 'Mark Complete'}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: MATERIAL REQUISITIONS (Organized Under Quotation Hierarchy)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'REQUISITION' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" />
                BOQ Material Requisitions Under Quotation
              </h3>
              <p className="text-xs text-muted-foreground">
                Showing materials requisitioned by the BOQ team mapped directly to each Floor, Area, and Quotation Product.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Switcher */}
              <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
                <Button
                  variant={reqViewMode === 'HIERARCHY' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-xs h-7 px-2.5 gap-1"
                  onClick={() => setReqViewMode('HIERARCHY')}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Quotation Hierarchy
                </Button>
                <Button
                  variant={reqViewMode === 'LIST' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-xs h-7 px-2.5 gap-1"
                  onClick={() => setReqViewMode('LIST')}
                >
                  <FileText className="w-3.5 h-3.5" />
                  By Requisition #
                </Button>
              </div>
            </div>
          </div>

          {/* Search Filter for Requisitions */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search material, spec, product, or REQ #..."
              value={reqSearch}
              onChange={(e) => setReqSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* MODE A: HIERARCHY (Floor -> Area -> Quotation Product -> Materials) */}
          {reqViewMode === 'HIERARCHY' && (
            <div className="space-y-6">
              {hierarchicalQuotationBOQ.floors.length === 0 ? (
                <div className="p-12 text-center border rounded-xl bg-card space-y-2">
                  <Boxes className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <h3 className="text-sm font-semibold">No quotation materials found</h3>
                  <p className="text-xs text-muted-foreground">
                    The BOQ team has not yet linked material requisitions or no matching products found.
                  </p>
                </div>
              ) : (
                hierarchicalQuotationBOQ.floors.map((floor) => (
                  <div key={floor.floorId} className="space-y-4">
                    {/* Floor Header Bar */}
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-lg shadow-xs">
                      <Building2 className="w-4 h-4 text-blue-200" />
                      <h4 className="text-sm font-bold tracking-wide uppercase">{floor.floorName}</h4>
                      <Badge className="bg-white/20 text-white text-[10px] ml-auto border-none">
                        {floor.areas.reduce((s, a) => s + a.products.length, 0)} Products
                      </Badge>
                    </div>

                    {/* Areas in this floor */}
                    <div className="space-y-4 pl-2 sm:pl-4">
                      {floor.areas.map((area) => (
                        <div key={area.areaId} className="space-y-3">
                          {/* Area Subheader */}
                          <div className="flex items-center gap-2 text-xs font-semibold text-foreground border-b pb-1">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Area / Room: <strong className="text-indigo-950 dark:text-indigo-200">{area.areaName}</strong></span>
                            <span className="text-muted-foreground font-normal">({area.products.length} products)</span>
                          </div>

                          {/* Quotation Products in this area */}
                          <div className="space-y-3 pl-1 sm:pl-3">
                            {area.products.map(({ product, materials }, pIdx) => (
                              <Card key={product.id || pIdx} className="border-border bg-card shadow-xs">
                                <CardHeader className="p-3 bg-muted/20 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-4 h-4 text-blue-600 shrink-0" />
                                      <span className="text-xs sm:text-sm font-bold text-foreground">
                                        {product.description || 'Quotation Product / Work Scope'}
                                      </span>
                                    </div>
                                    {product.materials && (
                                      <p className="text-[11px] text-muted-foreground pl-6 line-clamp-1">
                                        {product.materials}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-300">
                                      <Ruler className="w-3 h-3 mr-1" />
                                      {product.quantity ?? 1} {product.unit || 'sqft'}
                                    </Badge>
                                    <Badge
                                      variant={materials.length > 0 ? 'secondary' : 'outline'}
                                      className={`text-[10px] ${
                                        materials.length > 0
                                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200'
                                          : 'text-muted-foreground'
                                      }`}
                                    >
                                      {materials.length} Materials Requisitioned
                                    </Badge>
                                  </div>
                                </CardHeader>

                                <CardContent className="p-0">
                                  {materials.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-muted-foreground italic">
                                      No materials requisitioned yet by the BOQ team for this product.
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-muted/30 text-muted-foreground font-semibold border-b text-[11px]">
                                          <tr>
                                            <th className="py-2 px-3.5">#</th>
                                            <th className="py-2 px-3.5">Material Name</th>
                                            <th className="py-2 px-3.5">Category</th>
                                            <th className="py-2 px-3.5">Specifications &amp; Variants</th>
                                            <th className="py-2 px-3.5 text-right">Requisition Qty</th>
                                            <th className="py-2 px-3.5">Unit</th>
                                            <th className="py-2 px-3.5 text-right">Requisition No</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                          {materials.map((m, mIdx) => (
                                            <tr key={m.id || mIdx} className="hover:bg-muted/20">
                                              <td className="py-2.5 px-3.5 font-mono text-muted-foreground text-[11px]">
                                                {mIdx + 1}
                                              </td>
                                              <td className="py-2.5 px-3.5 font-semibold text-foreground">
                                                {m.materialName}
                                              </td>
                                              <td className="py-2.5 px-3.5">
                                                <Badge variant="outline" className="text-[10px] font-normal">
                                                  {m.workCategory.replace(/_/g, ' ')}
                                                </Badge>
                                              </td>
                                              <td className="py-2.5 px-3.5 text-muted-foreground max-w-xs truncate">
                                                {m.specifications || (m.remarks ? `Note: ${m.remarks}` : '—')}
                                              </td>
                                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-foreground">
                                                {m.finalQuantity}
                                              </td>
                                              <td className="py-2.5 px-3.5 text-muted-foreground font-medium">
                                                {m.unit}
                                              </td>
                                              <td className="py-2.5 px-3.5 text-right">
                                                <Badge
                                                  variant="secondary"
                                                  className="text-[10px] font-mono bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                                >
                                                  {m.requisitionNo}
                                                </Badge>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}

              {/* Unlinked / Project-wide Material Requisitions */}
              {hierarchicalQuotationBOQ.unlinkedMaterials.length > 0 && (
                <Card className="border-border bg-card mt-6">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-amber-600" />
                      <CardTitle className="text-sm font-bold">
                        General / Project-Wide Material Requisitions ({hierarchicalQuotationBOQ.unlinkedMaterials.length})
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground">
                      Site materials and overheads entered without assignment to an individual quotation product.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/30 text-muted-foreground font-semibold border-b text-[11px]">
                        <tr>
                          <th className="py-2 px-3.5">#</th>
                          <th className="py-2 px-3.5">Material Name</th>
                          <th className="py-2 px-3.5">Category</th>
                          <th className="py-2 px-3.5">Specifications</th>
                          <th className="py-2 px-3.5 text-right">Quantity</th>
                          <th className="py-2 px-3.5">Unit</th>
                          <th className="py-2 px-3.5 text-right">Requisition No</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {hierarchicalQuotationBOQ.unlinkedMaterials.map((m, mIdx) => (
                          <tr key={m.id || mIdx} className="hover:bg-muted/20">
                            <td className="py-2.5 px-3.5 font-mono text-muted-foreground text-[11px]">
                              {mIdx + 1}
                            </td>
                            <td className="py-2.5 px-3.5 font-semibold text-foreground">
                              {m.materialName}
                            </td>
                            <td className="py-2.5 px-3.5">
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {m.workCategory.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3.5 text-muted-foreground">
                              {m.specifications || m.remarks || '—'}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono font-bold text-foreground">
                              {m.finalQuantity}
                            </td>
                            <td className="py-2.5 px-3.5 text-muted-foreground">
                              {m.unit}
                            </td>
                            <td className="py-2.5 px-3.5 text-right">
                              <Badge variant="secondary" className="text-[10px] font-mono">
                                {m.requisitionNo}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* MODE B: BY REQUISITION SLIP NUMBER */}
          {reqViewMode === 'LIST' && (
            <div className="space-y-4">
              {(!lead.materialRequisitions || lead.materialRequisitions.length === 0) ? (
                <div className="p-12 text-center border rounded-xl bg-card space-y-2">
                  <Boxes className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <h3 className="text-sm font-semibold">No requisitions yet</h3>
                  <p className="text-xs text-muted-foreground">The BOQ team has not submitted requisitions for this project yet.</p>
                </div>
              ) : (
                lead.materialRequisitions.map((req) => (
                  <Card key={req.id} className="border-border bg-card">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-mono font-bold">{req.requisitionNo}</CardTitle>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                req.status === 'FULFILLED'
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : req.status === 'IN_PROCUREMENT'
                                  ? 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                  : 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}
                            >
                              {req.status}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            Created by {req.createdBy.fullName} on {new Date(req.createdAt).toLocaleDateString('en-GB')}
                          </CardDescription>
                        </div>

                        {req.notes && (
                          <div className="text-xs text-muted-foreground max-w-md italic truncate">
                            Note: {req.notes}
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-muted/40 text-muted-foreground font-semibold border-b text-[11px]">
                          <tr>
                            <th className="py-2.5 px-4">#</th>
                            <th className="py-2.5 px-4">Material Name</th>
                            <th className="py-2.5 px-4">Category</th>
                            <th className="py-2.5 px-4">Specifications</th>
                            <th className="py-2.5 px-4 text-right">Final Qty</th>
                            <th className="py-2.5 px-4">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {req.items.map((item, itemIdx) => (
                            <tr key={item.id} className="hover:bg-muted/20">
                              <td className="py-2.5 px-4 font-mono text-muted-foreground text-[11px]">
                                {itemIdx + 1}
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-foreground">
                                {item.materialName}
                              </td>
                              <td className="py-2.5 px-4">
                                <Badge variant="outline" className="text-[10px] font-normal">
                                  {item.workCategory.replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-4 text-muted-foreground max-w-xs truncate">
                                {item.specifications || '—'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                                {item.finalQuantity}
                              </td>
                              <td className="py-2.5 px-4 text-muted-foreground">{item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: ORDERS AND DELIVERIES (PO Cards with Material Situation)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'DELIVERY' && (
        <div className="space-y-6">
          {/* Top Counters Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 bg-card border">
              <span className="text-[11px] font-medium text-muted-foreground block">Purchase Orders</span>
              <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">{poDeliveryStats.totalPOs} POs</span>
            </Card>
            <Card className="p-3 bg-card border">
              <span className="text-[11px] font-medium text-muted-foreground block">Purchased Materials</span>
              <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">{poDeliveryStats.totalItems} Items</span>
            </Card>
            <Card className="p-3 bg-card border bg-emerald-500/5 border-emerald-500/30">
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 block">Delivered on Site</span>
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {poDeliveryStats.deliveredItems} Items
              </span>
            </Card>
            <Card className="p-3 bg-card border bg-rose-500/5 border-rose-500/30">
              <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300 block">Not Delivered (Pending)</span>
              <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                {poDeliveryStats.notDeliveredItems} Items
              </span>
            </Card>
          </div>

          {/* Section A: Purchase Order Cards (PO Cards) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Purchase Order Cards &amp; Material Delivery Situation
                </h3>
                <p className="text-xs text-muted-foreground">
                  Shows all materials procured under each PO and their live delivery status: <strong>Purchased</strong>, <strong>Not Delivered</strong>, or <strong>Delivered</strong>.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedPO(null)
                  setDeliveryModalOpen(true)
                }}
                className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Log Gate Delivery
              </Button>
            </div>

            {(!lead.purchaseOrders || lead.purchaseOrders.length === 0) ? (
              <div className="p-12 text-center border rounded-xl bg-card space-y-2">
                <Truck className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <h3 className="text-sm font-semibold">No Purchase Orders Issued</h3>
                <p className="text-xs text-muted-foreground">
                  There are no purchase orders generated for this project site yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {lead.purchaseOrders.map((po) => {
                  const poItems = po.indent?.items || []
                  const deliveredCount = poItems.filter(
                    (it) => getMaterialSituation(it.requisitionItem?.materialName || '', po).situation === 'DELIVERED',
                  ).length
                  const isFullyDelivered = poItems.length > 0 && deliveredCount === poItems.length

                  return (
                    <Card key={po.id} className="border-border bg-card overflow-hidden shadow-xs">
                      {/* PO Card Header (NO AMOUNT SHOWN) */}
                      <CardHeader className="p-3.5 sm:p-4 bg-muted/20 border-b">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm font-mono font-bold text-foreground flex items-center gap-1.5">
                                <Package className="w-4 h-4 text-purple-600" />
                                {po.poNo}
                              </CardTitle>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold ${
                                  po.status === 'APPROVED' || po.status === 'FULFILLED'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                }`}
                              >
                                {po.status.replace(/_/g, ' ')}
                              </Badge>

                              {/* Overall PO Delivery Badge */}
                              {isFullyDelivered ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] font-semibold gap-1">
                                  <Check className="w-3 h-3" /> Fully Delivered
                                </Badge>
                              ) : deliveredCount > 0 ? (
                                <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 text-[10px] font-semibold">
                                  Partially Delivered ({deliveredCount}/{poItems.length})
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800 text-[10px] font-semibold">
                                  Awaiting Site Arrival
                                </Badge>
                              )}
                            </div>

                            <CardDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 mt-0.5">
                              <span>
                                Supplier: <strong className="text-foreground">{po.supplierName || 'Direct Vendor'}</strong>
                              </span>
                              <span>•</span>
                              <span>Issued: {new Date(po.createdAt).toLocaleDateString('en-GB')}</span>
                              {po.approvedBy && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    ✓ Verified by Accounts ({po.approvedBy.fullName})
                                  </span>
                                </>
                              )}
                            </CardDescription>
                          </div>

                          <div className="flex items-center gap-2 self-start md:self-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDeliveryForPO(po)}
                              className="text-xs gap-1.5 h-8 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Receive at Gate
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Materials List Inside PO Card */}
                      <CardContent className="p-0">
                        {poItems.length === 0 ? (
                          <div className="p-6 text-center text-xs text-muted-foreground italic">
                            No materials recorded inside this purchase order.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b text-[11px]">
                                <tr>
                                  <th className="py-2.5 px-4 w-10">#</th>
                                  <th className="py-2.5 px-4">Material Name &amp; Specifications</th>
                                  <th className="py-2.5 px-4">Category</th>
                                  <th className="py-2.5 px-4 text-right">Purchased Qty</th>
                                  <th className="py-2.5 px-4 text-center">Delivery Situation</th>
                                  <th className="py-2.5 px-4">Notes / Gate Receipt</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {poItems.map((item, idx) => {
                                  const materialName = item.requisitionItem?.materialName || 'Material'
                                  const specs = item.requisitionItem?.specifications
                                  const category = item.requisitionItem?.workCategory
                                  const sit = getMaterialSituation(materialName, po)

                                  return (
                                    <tr key={item.id || idx} className="hover:bg-muted/20">
                                      <td className="py-2.5 px-4 font-mono text-muted-foreground text-[11px]">
                                        {idx + 1}
                                      </td>
                                      <td className="py-2.5 px-4">
                                        <div className="font-semibold text-foreground">{materialName}</div>
                                        {specs && (
                                          <div className="text-[11px] text-muted-foreground">{specs}</div>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-4">
                                        {category ? (
                                          <Badge variant="outline" className="text-[10px] font-normal">
                                            {category.replace(/_/g, ' ')}
                                          </Badge>
                                        ) : (
                                          <span className="text-muted-foreground/60">—</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                                        {item.quantity} {item.requisitionItem?.unit || 'Pcs'}
                                      </td>
                                      <td className="py-2.5 px-4 text-center">
                                        <Badge variant="outline" className={`text-[10px] font-semibold ${sit.badgeClass}`}>
                                          {sit.situation === 'DELIVERED' && <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />}
                                          {sit.situation === 'NOT_DELIVERED' && <Clock className="w-3 h-3 mr-1 text-rose-600" />}
                                          {sit.situation === 'PURCHASED' && <Package className="w-3 h-3 mr-1 text-amber-600" />}
                                          {sit.label}
                                        </Badge>
                                      </td>
                                      <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                                        {sit.detail}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section B: Site Gate Delivery Receipts */}
          <div className="space-y-3 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  Site Gate Delivery Receipts &amp; Challans
                </h3>
                <p className="text-xs text-muted-foreground">
                  Physical receipts and condition logs recorded at the site gate.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedPO(null)
                  setDeliveryModalOpen(true)
                }}
                className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Log Gate Delivery
              </Button>
            </div>

            {(!lead.siteDeliveryLogs || lead.siteDeliveryLogs.length === 0) ? (
              <div className="p-8 text-center border rounded-xl bg-card space-y-1">
                <p className="text-xs text-muted-foreground">No material deliveries logged at the gate yet.</p>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden bg-card">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Challan #</th>
                      <th className="py-2.5 px-4">Materials Summary</th>
                      <th className="py-2.5 px-4">Quantity</th>
                      <th className="py-2.5 px-4">Condition</th>
                      <th className="py-2.5 px-4">Received By</th>
                      <th className="py-2.5 px-4">Delivery Date</th>
                      <th className="py-2.5 px-4 text-right">Challan Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lead.siteDeliveryLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4 font-mono font-semibold">{log.challanNo || '—'}</td>
                        <td className="py-2.5 px-4 font-medium text-foreground">{log.itemsSummary}</td>
                        <td className="py-2.5 px-4">
                          {log.quantity ? `${log.quantity} ${log.unit || 'Pcs'}` : '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              log.condition === 'GOOD'
                                ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
                                : log.condition === 'PARTIAL'
                                ? 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30'
                                : 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/30'
                            }`}
                          >
                            {log.condition}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">{log.receivedBy.fullName}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {new Date(log.deliveryDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {log.slipUrl ? (
                            <a
                              href={log.slipUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1"
                            >
                              View Slip <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          QUICK GATE DELIVERY RECEIPT MODAL
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={deliveryModalOpen} onOpenChange={setDeliveryModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <Truck className="w-5 h-5 text-amber-600" />
              Log Material Gate Delivery
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record incoming materials received at <strong>{lead.name}</strong> site gate.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDelivery} className="space-y-4 py-2">
            {selectedPO && (
              <div className="bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 text-xs">
                <span className="text-purple-900 dark:text-purple-300 font-semibold">
                  Receiving materials under PO: {selectedPO.poNo}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Challan # / Slip Ref</Label>
                <Input
                  placeholder="e.g. CH-99014"
                  value={challanNo}
                  onChange={(e) => setChallanNo(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Vendor / Supplier</Label>
                <Input
                  placeholder="e.g. Akij Board Center"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Materials Summary *</Label>
              <Textarea
                placeholder="e.g. 25 Pcs 18mm Gorjon Commercial Plywood, 5 boxes hinges"
                value={itemsSummary}
                onChange={(e) => setItemsSummary(e.target.value)}
                rows={2}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 25"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pcs" className="text-xs">Pcs</SelectItem>
                    <SelectItem value="Sqft" className="text-xs">Sqft</SelectItem>
                    <SelectItem value="Sheets" className="text-xs">Sheets</SelectItem>
                    <SelectItem value="Boxes" className="text-xs">Boxes</SelectItem>
                    <SelectItem value="Bundles" className="text-xs">Bundles</SelectItem>
                    <SelectItem value="Kg" className="text-xs">Kg</SelectItem>
                    <SelectItem value="Liters" className="text-xs">Liters</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Condition Check</Label>
                <Select
                  value={condition}
                  onValueChange={(val) => setCondition(val as 'GOOD' | 'PARTIAL' | 'DAMAGED' | 'REJECTED')}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOD" className="text-xs">Good &amp; Undamaged</SelectItem>
                    <SelectItem value="PARTIAL" className="text-xs">Partial Delivery</SelectItem>
                    <SelectItem value="DAMAGED" className="text-xs">Damaged / Defective</SelectItem>
                    <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Challan Slip Photo</Label>
              <label className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-md cursor-pointer text-xs hover:bg-muted/40 w-full truncate border-dashed">
                {uploadingSlip ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="truncate">
                  {slipUrl ? 'Slip Photo Uploaded ✓' : 'Upload photo of delivery challan slip'}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleSlipUpload}
                  disabled={uploadingSlip}
                />
              </label>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Site Location / Stored Notes</Label>
              <Input
                placeholder="e.g. Stored in 2nd floor bedroom safe from moisture"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeliveryModalOpen(false)}
                disabled={submittingDelivery}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingDelivery || uploadingSlip}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {submittingDelivery ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Recording...
                  </>
                ) : (
                  'Confirm & Record Delivery'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
