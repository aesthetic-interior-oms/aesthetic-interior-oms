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
  UserX,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Boxes,
  ClipboardList,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

type ProjectSite = {
  id: string
  name: string
  location: string | null
  phone: string | null
  stage: string
  subStatus: string | null
  agreementType: string | null
  agreementValue: number | null
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
    totalAmount: number
  }
  scopeProgress: {
    total: number
    completed: number
    percent: number
  }
}

type Stats = {
  totalProjects: number
  unassignedCount: number
  inExecutionCount: number
  totalDeliveries: number
  totalPurchased: number
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
    totalPurchased: 0,
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
        totalPurchased: 0,
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

  const formatCurrency = (val: number | null | undefined) => {
    if (!val || val === 0) return '৳0'
    return `৳${Number(val).toLocaleString('en-IN')}`
  }

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
            Confirmed agreement sites: Assign Site Engineers, track materials purchased, and monitor delivery gate checks.
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
            <span className="text-xs font-medium text-muted-foreground">Active Agreement Sites</span>
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
          <p className="text-[11px] text-muted-foreground mt-0.5">Active civil / interior work</p>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Purchased &amp; Delivered</span>
            <ShoppingCart className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-foreground truncate">
            {formatCurrency(stats.totalPurchased)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {stats.totalDeliveries} site deliveries logged
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
                      {p.agreementValue ? (
                        <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.agreementValue)}
                        </span>
                      ) : null}
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
                        <span>Purchased</span>
                      </div>
                      <div className="text-xs font-bold mt-0.5 text-foreground">
                        {p.purchasedSummary.approvedPOs} POs
                      </div>
                      <span className="text-[9px] text-muted-foreground block truncate">
                        {p.purchasedSummary.totalAmount > 0
                          ? formatCurrency(p.purchasedSummary.totalAmount)
                          : '৳0'}
                      </span>
                    </div>

                    {/* Scope / BOQ Progress */}
                    <div className="bg-background p-2 rounded border border-border/50">
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <ClipboardList className="w-3 h-3 text-blue-600" />
                        <span>Scope</span>
                      </div>
                      <div className="text-xs font-bold mt-0.5 text-foreground">
                        {p.scopeProgress.percent}%
                      </div>
                      <span className="text-[9px] text-muted-foreground block truncate">
                        {p.scopeProgress.completed}/{p.scopeProgress.total} Items
                      </span>
                    </div>
                  </div>

                  {/* Scope Progress Bar */}
                  {p.scopeProgress.total > 0 && (
                    <div className="space-y-1">
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${p.scopeProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-border/50 flex flex-col gap-2 text-xs">
                    <Button
                      asChild
                      size="sm"
                      className="h-8 text-[11px] gap-1.5 bg-blue-600 hover:bg-blue-700 text-white w-full font-semibold"
                    >
                      <Link href={`/site-engineer/projects/${p.id}`}>
                        <FolderKanban className="w-3.5 h-3.5" />
                        Site Scope &amp; BOQ Progress
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1 text-amber-700 dark:text-amber-300 w-full"
                    >
                      <Link href={`/site-engineer/delivery?leadId=${p.id}`}>
                        <Truck className="w-3.5 h-3.5" />
                        View Deliveries &amp; Gate Pass
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

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
