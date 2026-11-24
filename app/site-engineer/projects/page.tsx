'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  FolderKanban,
  MapPin,
  Phone,
  Search,
  Truck,
  RefreshCw,
  Loader2,
  UserCheck,
  UserPlus,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ArrowUpRight,
  ClipboardList,
  CheckSquare,
  Square,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

type SiteEngineerUser = {
  id: string
  fullName: string
  email: string
  phone: string | null
  activeProjectsCount?: number
}

type QuotationProduct = {
  id: string
  description: string
  quantity: number
  unit: string
  materials: string | null
  areaName?: string | null
  completed: boolean
}

type ProjectQuotation = {
  draftId: string
  totalItems: number
  completedItems: number
  progressPercent: number
  items: QuotationProduct[]
}

type ProjectSite = {
  id: string
  name: string
  location: string | null
  phone: string | null
  stage: string
  subStatus: string | null
  agreementType: string | null
  created_at: string
  assignedSiteEngineer: SiteEngineerUser | null
  assignedProjectCoordinator: { id: string; fullName: string } | null
  assignedSrCrm: { id: string; fullName: string } | null
  deliveriesSummary: {
    total: number
    issues: number
    latestDate: string | null
  }
  purchasedSummary: {
    totalPOs: number
    approvedPOs: number
  }
  scopeProgress: {
    total: number
    completed: number
    percent: number
  }
  quotation?: ProjectQuotation | null
}

type Stats = {
  totalProjects: number
  unassignedCount: number
  inExecutionCount: number
  totalDeliveries: number
  overallCompletedItems: number
  overallTotalItems: number
  overallProgressPercent: number
}

export default function SiteEngineerProjectsPage() {
  const [projects, setProjects] = useState<ProjectSite[]>([])
  const [siteEngineers, setSiteEngineers] = useState<SiteEngineerUser[]>([])
  const [canManageAssignments, setCanManageAssignments] = useState(false)
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    unassignedCount: 0,
    inExecutionCount: 0,
    totalDeliveries: 0,
    overallCompletedItems: 0,
    overallTotalItems: 0,
    overallProgressPercent: 0,
  })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNASSIGNED' | 'SITE_EXECUTION' | 'SETUP' | 'QC'>('ALL')
  const [engineerFilter, setEngineerFilter] = useState('ALL')

  // Assignment Modal State
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectSite | null>(null)
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)

  // Quotation Checklist Modal State
  const [quotationModalOpen, setQuotationModalOpen] = useState(false)
  const [quotationProject, setQuotationProject] = useState<ProjectSite | null>(null)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [quotationSearch, setQuotationSearch] = useState('')
  const [quotationFilter, setQuotationFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL')

  const fetchProjects = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/site-engineer/projects')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load projects')
      setProjects(json.data.projects || [])
      setStats(json.data.stats || {
        totalProjects: 0,
        unassignedCount: 0,
        inExecutionCount: 0,
        totalDeliveries: 0,
        overallCompletedItems: 0,
        overallTotalItems: 0,
        overallProgressPercent: 0,
      })
      setSiteEngineers(json.data.siteEngineers || [])
      setCanManageAssignments(Boolean(json.data.canManageAssignments))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error loading projects')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Open assignment dialog
  const handleOpenAssignModal = (project: ProjectSite) => {
    setSelectedProject(project)
    setSelectedEngineerId(project.assignedSiteEngineer?.id || '')
    setAssignmentModalOpen(true)
  }

  // Open quotation checklist modal
  const handleOpenQuotationModal = (project: ProjectSite) => {
    setQuotationProject(project)
    setQuotationSearch('')
    setQuotationFilter('ALL')
    setQuotationModalOpen(true)
  }

  // Submit assignment or reassignment
  const handleAssignEngineer = async () => {
    if (!selectedProject) return

    try {
      setAssigning(true)

      // If "UNASSIGN" chosen
      if (selectedEngineerId === 'UNASSIGN') {
        const res = await fetch(`/api/lead/${selectedProject.id}/assignments/SITE_ENGINEER`, {
          method: 'DELETE',
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to unassign Site Engineer')
        }
        toast.success(`Site Engineer removed from ${selectedProject.name}`)
      } else {
        if (!selectedEngineerId) {
          toast.error('Please select a Site Engineer')
          return
        }

        const res = await fetch(`/api/lead/${selectedProject.id}/assignments/SITE_ENGINEER`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedEngineerId }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to assign Site Engineer')
        }

        const assignedUser = siteEngineers.find((se) => se.id === selectedEngineerId)
        toast.success(
          `Assigned ${assignedUser?.fullName || 'Site Engineer'} to ${selectedProject.name}`,
        )
      }

      setAssignmentModalOpen(false)
      fetchProjects()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update assignment')
    } finally {
      setAssigning(false)
    }
  }

  // Toggle Quotation Product Status
  const handleToggleProductStatus = async (
    projectId: string,
    draftId: string,
    lineId: string,
    currentCompleted: boolean,
  ) => {
    setUpdatingItemId(lineId)
    const nextCompleted = !currentCompleted

    try {
      const res = await fetch(`/api/site-engineer/projects/${projectId}/item-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, lineId, completed: nextCompleted }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update work item status')
      }

      // Optimistically update projects list
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId || !p.quotation) return p
          const nextItems = p.quotation.items.map((it) =>
            it.id === lineId ? { ...it, completed: nextCompleted } : it,
          )
          const completedCount = nextItems.filter((i) => i.completed).length
          const totalCount = nextItems.length
          const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

          const updatedQuotation: ProjectQuotation = {
            ...p.quotation,
            items: nextItems,
            completedItems: completedCount,
            progressPercent: percent,
          }

          return {
            ...p,
            scopeProgress: {
              total: totalCount,
              completed: completedCount,
              percent,
            },
            quotation: updatedQuotation,
          }
        }),
      )

      // Update active modal view
      setQuotationProject((prev) => {
        if (!prev || prev.id !== projectId || !prev.quotation) return prev
        const nextItems = prev.quotation.items.map((it) =>
          it.id === lineId ? { ...it, completed: nextCompleted } : it,
        )
        const completedCount = nextItems.filter((i) => i.completed).length
        const totalCount = nextItems.length
        const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

        return {
          ...prev,
          scopeProgress: {
            total: totalCount,
            completed: completedCount,
            percent,
          },
          quotation: {
            ...prev.quotation,
            items: nextItems,
            completedItems: completedCount,
            progressPercent: percent,
          },
        }
      })

      toast.success(nextCompleted ? 'Work item marked as completed ✓' : 'Marked as pending')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error updating product status')
    } finally {
      setUpdatingItemId(null)
    }
  }

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.assignedSiteEngineer && p.assignedSiteEngineer.fullName.toLowerCase().includes(q))

      let matchesFilter = true
      if (filterMode === 'UNASSIGNED') {
        matchesFilter = !p.assignedSiteEngineer
      } else if (filterMode === 'SITE_EXECUTION') {
        matchesFilter = p.stage === 'SITE_EXECUTION'
      } else if (filterMode === 'SETUP') {
        matchesFilter = p.stage === 'CONVERSION' || p.stage === 'PROJECT_SETUP' || p.stage === 'MATERIAL_PLANNING'
      } else if (filterMode === 'QC') {
        matchesFilter = p.stage === 'QUALITY_CHECK' || p.stage === 'HANDOVER'
      }

      let matchesEngineer = true
      if (engineerFilter !== 'ALL') {
        if (engineerFilter === 'UNASSIGNED') {
          matchesEngineer = !p.assignedSiteEngineer
        } else {
          matchesEngineer = p.assignedSiteEngineer?.id === engineerFilter
        }
      }

      return matchesSearch && matchesFilter && matchesEngineer
    })
  }, [projects, search, filterMode, engineerFilter])

  // Filter quotation products inside modal
  const modalFilteredProducts = useMemo(() => {
    if (!quotationProject?.quotation?.items) return []
    return quotationProject.quotation.items.filter((item) => {
      const q = quotationSearch.toLowerCase().trim()
      const matchesSearch =
        !q ||
        item.description.toLowerCase().includes(q) ||
        (item.materials && item.materials.toLowerCase().includes(q)) ||
        (item.areaName && item.areaName.toLowerCase().includes(q))

      const matchesFilter =
        quotationFilter === 'ALL' ||
        (quotationFilter === 'COMPLETED' && item.completed) ||
        (quotationFilter === 'PENDING' && !item.completed)

      return matchesSearch && matchesFilter
    })
  }, [quotationProject, quotationSearch, quotationFilter])

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 min-h-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/site-engineer/dashboard" className="hover:text-foreground">
              Site Operations
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Projects Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FolderKanban className="w-7 h-7 text-blue-600 shrink-0" />
            Active Site Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor confirmed sites: Inspect quotation product scope, tick completed items, and log delivery gate checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProjects}
            disabled={refreshing}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button asChild size="sm" className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
            <Link href="/site-engineer/delivery">
              <Truck className="w-4 h-4" />
              Delivery Gate Checks
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Top Overview KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-card border-border hover:border-blue-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Site Projects</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{stats.totalProjects}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Confirmed production sites</p>
        </Card>

        <Card
          className={`p-4 border-border transition cursor-pointer ${
            stats.unassignedCount > 0
              ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15'
              : 'bg-card'
          }`}
          onClick={() => setFilterMode(stats.unassignedCount > 0 ? 'UNASSIGNED' : 'ALL')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Needs Engineer</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">
            {stats.unassignedCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {stats.unassignedCount > 0 ? 'Requires PC assignment' : 'All sites assigned'}
          </p>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">In Site Execution</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{stats.inExecutionCount}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Active civil / interior sites</p>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Overall Scope Done</span>
            <ClipboardList className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {stats.overallProgressPercent || 0}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {stats.overallCompletedItems} of {stats.overallTotalItems} products completed
          </p>
        </Card>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search site name, location, phone, or engineer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={filterMode === 'ALL' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs h-8"
            onClick={() => setFilterMode('ALL')}
          >
            All Sites ({projects.length})
          </Button>

          <Button
            variant={filterMode === 'UNASSIGNED' ? 'secondary' : 'ghost'}
            size="sm"
            className={`text-xs h-8 ${
              stats.unassignedCount > 0 ? 'text-amber-700 dark:text-amber-300 font-semibold' : ''
            }`}
            onClick={() => setFilterMode('UNASSIGNED')}
          >
            Unassigned ({stats.unassignedCount})
          </Button>

          <Button
            variant={filterMode === 'SITE_EXECUTION' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs h-8"
            onClick={() => setFilterMode('SITE_EXECUTION')}
          >
            Site Execution ({stats.inExecutionCount})
          </Button>

          <Button
            variant={filterMode === 'SETUP' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs h-8"
            onClick={() => setFilterMode('SETUP')}
          >
            Project Setup
          </Button>

          <Button
            variant={filterMode === 'QC' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs h-8"
            onClick={() => setFilterMode('QC')}
          >
            QC &amp; Handover
          </Button>

          {siteEngineers.length > 0 && (
            <Select value={engineerFilter} onValueChange={setEngineerFilter}>
              <SelectTrigger className="h-8 text-xs w-[160px]">
                <SelectValue placeholder="All Engineers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Engineers</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned Only</SelectItem>
                {siteEngineers.map((se) => (
                  <SelectItem key={se.id} value={se.id}>
                    {se.fullName} ({se.activeProjectsCount || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── Project Cards Grid ── */}
      {loading ? (
        <div className="flex flex-col justify-center items-center p-20 text-muted-foreground gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Loading agreement project sites...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-16 text-center space-y-3 border rounded-xl bg-card">
          <FolderKanban className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h3 className="text-base font-semibold">No agreement sites found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search || filterMode !== 'ALL' || engineerFilter !== 'ALL'
              ? 'No projects match your active search and filter filters.'
              : 'Only projects with a signed agreement will appear here for site engineering.'}
          </p>
          {(search || filterMode !== 'ALL' || engineerFilter !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('')
                setFilterMode('ALL')
                setEngineerFilter('ALL')
              }}
              className="text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const hasEngineer = Boolean(p.assignedSiteEngineer)
            const hasQuotation = Boolean(p.quotation && p.quotation.items.length > 0)

            return (
              <Card
                key={p.id}
                className="border-border hover:shadow-md transition-all bg-card flex flex-col justify-between overflow-hidden"
              >
                {/* Card Header */}
                <CardHeader className="pb-3 border-b border-border/40 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/site-engineer/projects/${p.id}`}
                        className="text-base font-bold text-foreground hover:text-blue-600 transition line-clamp-1 flex items-center gap-1.5"
                      >
                        {p.name}
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                      </Link>
                      <CardDescription className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{p.location || 'Location not specified'}</span>
                      </CardDescription>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant={p.stage === 'SITE_EXECUTION' ? 'default' : 'outline'}
                        className="text-[10px] font-medium"
                      >
                        {p.stage.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {p.scopeProgress.percent}% Done
                      </span>
                    </div>
                  </div>

                  {p.phone && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span>{p.phone}</span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-4 pt-3 pb-4">
                  {/* Site Engineer Assignment Row */}
                  <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          hasEngineer
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        {hasEngineer ? (
                          <UserCheck className="w-3.5 h-3.5" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                          Site Engineer
                        </div>
                        <div className="text-xs font-medium text-foreground truncate">
                          {p.assignedSiteEngineer ? p.assignedSiteEngineer.fullName : 'Not Assigned Yet'}
                        </div>
                      </div>
                    </div>

                    {canManageAssignments && (
                      <Button
                        size="sm"
                        variant={hasEngineer ? 'ghost' : 'outline'}
                        onClick={() => handleOpenAssignModal(p)}
                        className={`h-7 px-2 text-xs shrink-0 ${
                          !hasEngineer
                            ? 'border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10'
                            : ''
                        }`}
                      >
                        {hasEngineer ? 'Change' : 'Assign'}
                      </Button>
                    )}
                  </div>

                  {/* Operational Metrics (Purchased, Deliveries, Scope) */}
                  <div className="grid grid-cols-3 gap-2 py-1 text-center">
                    {/* Deliveries */}
                    <div className="bg-background p-2 rounded border border-border/50">
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Truck className="w-3 h-3 text-amber-600" />
                        <span>Deliveries</span>
                      </div>
                      <div className="text-xs font-bold mt-0.5 text-foreground">
                        {p.deliveriesSummary.total}
                      </div>
                      {p.deliveriesSummary.issues > 0 ? (
                        <span className="text-[9px] text-destructive font-medium block truncate">
                          {p.deliveriesSummary.issues} issue(s)
                        </span>
                      ) : (
                        <span className="text-[9px] text-muted-foreground block truncate">
                          {p.deliveriesSummary.total > 0 ? 'Logged' : 'None yet'}
                        </span>
                      )}
                    </div>

                    {/* Purchased / POs */}
                    <div className="bg-background p-2 rounded border border-border/50">
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <ShoppingCart className="w-3 h-3 text-purple-600" />
                        <span>Orders</span>
                      </div>
                      <div className="text-xs font-bold mt-0.5 text-foreground">
                        {p.purchasedSummary.approvedPOs} POs
                      </div>
                      <span className="text-[9px] text-muted-foreground block truncate">
                        Approved for Site
                      </span>
                    </div>

                    {/* Scope / Quotation Products Progress */}
                    <div className="bg-background p-2 rounded border border-border/50">
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <ClipboardList className="w-3 h-3 text-blue-600" />
                        <span>Products</span>
                      </div>
                      <div className="text-xs font-bold mt-0.5 text-foreground">
                        {p.scopeProgress.completed}/{p.scopeProgress.total}
                      </div>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold block truncate">
                        {p.scopeProgress.percent}% Done
                      </span>
                    </div>
                  </div>

                  {/* Scope Progress Bar */}
                  {p.scopeProgress.total > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Quotation Completion</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          {p.scopeProgress.completed} of {p.scopeProgress.total} done
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${p.scopeProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-border/50 flex flex-col gap-2 text-xs">
                    {/* Primary Button: View & Tick Quotation Products */}
                    <Button
                      size="sm"
                      onClick={() => handleOpenQuotationModal(p)}
                      className="h-8 text-[11px] gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white w-full font-semibold shadow-xs"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      View &amp; Tick Quotation Products ({p.scopeProgress.completed}/{p.scopeProgress.total})
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1 flex-1"
                      >
                        <Link href={`/site-engineer/projects/${p.id}`}>
                          <FolderKanban className="w-3 h-3" />
                          Full Scope
                        </Link>
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1 text-amber-700 dark:text-amber-300 flex-1"
                      >
                        <Link href={`/site-engineer/delivery?leadId=${p.id}`}>
                          <Truck className="w-3 h-3" />
                          Gate Passes
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Quotation Checklist Dialog (Modal to Tick Products without Prices) ── */}
      <Dialog open={quotationModalOpen} onOpenChange={setQuotationModalOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-5 border-b bg-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                  Quotation Products Checklist
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Project: <strong className="text-foreground">{quotationProject?.name}</strong> •{' '}
                  {quotationProject?.location || 'On-site'}
                </DialogDescription>
              </div>

              {quotationProject?.quotation && (
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {quotationProject.scopeProgress.percent}%
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Work Completed
                  </div>
                </div>
              )}
            </div>

            {/* Live Progress Meter inside Dialog */}
            {quotationProject?.scopeProgress && (
              <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Progress: <strong className="text-foreground">{quotationProject.scopeProgress.completed}</strong> of{' '}
                    <strong className="text-foreground">{quotationProject.scopeProgress.total}</strong> products finished
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {quotationProject.scopeProgress.total - quotationProject.scopeProgress.completed} pending
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${quotationProject.scopeProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Search & Filter Toolbar inside Dialog */}
          <div className="p-3 bg-muted/30 border-b flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search product or material..."
                value={quotationSearch}
                onChange={(e) => setQuotationSearch(e.target.value)}
                className="pl-8 text-xs h-8 bg-background"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Button
                variant={quotationFilter === 'ALL' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => setQuotationFilter('ALL')}
              >
                All ({quotationProject?.quotation?.items.length || 0})
              </Button>
              <Button
                variant={quotationFilter === 'PENDING' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-7 px-2.5 text-amber-700 dark:text-amber-400"
                onClick={() => setQuotationFilter('PENDING')}
              >
                Pending ({quotationProject?.quotation?.items.filter((i) => !i.completed).length || 0})
              </Button>
              <Button
                variant={quotationFilter === 'COMPLETED' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-7 px-2.5 text-emerald-700 dark:text-emerald-400"
                onClick={() => setQuotationFilter('COMPLETED')}
              >
                Done ({quotationProject?.quotation?.items.filter((i) => i.completed).length || 0})
              </Button>
            </div>
          </div>

          {/* Quotation Products Checklist (NO PRICES, STRICT OPERATIONAL WORK ITEMS) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {!quotationProject?.quotation || quotationProject.quotation.items.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <h4 className="text-sm font-semibold">No quotation products available</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  A quotation has not yet been prepared or approved for this site project.
                </p>
              </div>
            ) : modalFilteredProducts.length === 0 ? (
              <div className="p-8 text-center space-y-1">
                <p className="text-xs text-muted-foreground">No quotation products match your active filter.</p>
              </div>
            ) : (
              modalFilteredProducts.map((item, idx) => {
                const isCompleted = item.completed
                const isUpdating = updatingItemId === item.id

                return (
                  <div
                    key={item.id || idx}
                    className={`p-3 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                      isCompleted
                        ? 'border-emerald-300/80 bg-emerald-50/40 dark:border-emerald-950 dark:bg-emerald-950/20'
                        : 'border-border/70 bg-card hover:border-border'
                    }`}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                          #{idx + 1}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-semibold leading-tight ${
                            isCompleted ? 'text-foreground line-through opacity-80' : 'text-foreground'
                          }`}
                        >
                          {item.description}
                        </span>
                        {isCompleted ? (
                          <Badge className="bg-emerald-600 text-white text-[9px] h-4 gap-0.5 font-semibold">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Done
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 text-amber-700 dark:text-amber-400 border-amber-300"
                          >
                            <Clock className="w-2.5 h-2.5 mr-0.5" /> In Progress
                          </Badge>
                        )}
                      </div>

                      {item.materials && (
                        <p className="text-xs text-muted-foreground line-clamp-2 pl-4">
                          {item.materials}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pl-4 pt-0.5">
                        <span className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-medium text-foreground">
                          Qty: {item.quantity} {item.unit}
                        </span>
                        {item.areaName && (
                          <span className="text-[11px] text-muted-foreground">
                            • Area: <strong className="text-foreground">{item.areaName}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Checkbox Button */}
                    <div className="shrink-0 self-center">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isUpdating || !quotationProject}
                        variant={isCompleted ? 'default' : 'outline'}
                        className={`text-xs h-8 px-3 font-semibold gap-1.5 transition-colors ${
                          isCompleted
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'hover:bg-muted text-foreground'
                        }`}
                        onClick={() =>
                          handleToggleProductStatus(
                            quotationProject!.id,
                            quotationProject!.quotation!.draftId,
                            item.id,
                            isCompleted,
                          )
                        }
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isCompleted ? (
                          <CheckSquare className="w-3.5 h-3.5" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                        <span>{isCompleted ? 'Done ✓' : 'Mark Done'}</span>
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className="p-3 bg-card border-t flex sm:justify-between items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Site Engineer Checklist • No prices displayed
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuotationModalOpen(false)}
              className="text-xs"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Site Engineer Dialog ── */}
      <Dialog open={assignmentModalOpen} onOpenChange={setAssignmentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Assign Site Engineer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Allocate a dedicated Site Engineer to oversee construction execution, material deliveries, and site scope for{' '}
              <strong className="text-foreground">{selectedProject?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-xs text-muted-foreground">
              Current Assignee:{' '}
              <span className="font-semibold text-foreground">
                {selectedProject?.assignedSiteEngineer
                  ? selectedProject.assignedSiteEngineer.fullName
                  : 'Unassigned'}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Select Site Engineer</label>
              <Select value={selectedEngineerId} onValueChange={setSelectedEngineerId}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Choose a Site Engineer..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedProject?.assignedSiteEngineer && (
                    <SelectItem value="UNASSIGN" className="text-destructive font-medium">
                      ✕ Unassign (Remove current engineer)
                    </SelectItem>
                  )}
                  {siteEngineers.map((se) => (
                    <SelectItem key={se.id} value={se.id}>
                      {se.fullName} {se.activeProjectsCount ? `(${se.activeProjectsCount} active sites)` : '(0 sites)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAssignmentModalOpen(false)}
              disabled={assigning}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAssignEngineer}
              disabled={assigning || !selectedEngineerId}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {assigning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Updating...
                </>
              ) : selectedEngineerId === 'UNASSIGN' ? (
                'Confirm Unassign'
              ) : (
                'Save Assignment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
