'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  FolderKanban,
  MapPin,
  Phone,
  Search,
  RefreshCw,
  Loader2,
  UserCheck,
  UserPlus,
  Building2,
  Zap,
  Check,
  Users,
  X,
  AlertTriangle,
  HardHat,
  Truck,
  ShoppingCart,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { toast } from 'sonner'

type ElectricianUser = {
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
  agreementSqft: number | null
  budget: number | null
  created_at: string
  isSiteWorkActive: boolean
  siteWorkStartedAt: string | null
  assignedElectricians: ElectricianUser[]
  assignedSiteEngineers: ElectricianUser[]
  assignedProjectCoordinator: { id: string; fullName: string } | null
  assignedSrCrm: { id: string; fullName: string } | null
  deliveriesSummary: {
    total: number
    issues: number
    latestDate: string | null
  }
  purchasedSummary: {
    totalPOs: number
    totalAmount: number
  }
}

type SummaryStats = {
  totalProjects: number
  unassignedElectricianCount: number
  assignedElectricianCount: number
  inExecutionCount: number
}

function formatCurrency(val: number | null | undefined) {
  if (!val) return '৳ 0'
  return `৳ ${Number(val).toLocaleString('en-BD')}`
}

export default function ElectricEngineerProjectsPage() {
  const [projects, setProjects] = useState<ProjectSite[]>([])
  const [electricians, setElectricians] = useState<ElectricianUser[]>([])
  const [summary, setSummary] = useState<SummaryStats>({
    totalProjects: 0,
    unassignedElectricianCount: 0,
    assignedElectricianCount: 0,
    inExecutionCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'SITE_EXECUTION'>('ALL')

  // Assignment modal state
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectSite | null>(null)
  const [selectedElectricianIds, setSelectedElectricianIds] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)
  const [removingKey, setRemovingKey] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/electric-engineer/projects')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load ongoing site projects')

      setProjects(json.data.projects || [])
      setElectricians(json.data.electricians || [])
      if (json.data.summary) {
        setSummary(json.data.summary)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error loading projects')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        p.assignedElectricians.some((e) => e.fullName.toLowerCase().includes(q)) ||
        p.assignedSiteEngineers.some((e) => e.fullName.toLowerCase().includes(q))

      if (!matchesSearch) return false

      if (filterMode === 'UNASSIGNED') return p.assignedElectricians.length === 0
      if (filterMode === 'ASSIGNED') return p.assignedElectricians.length > 0
      if (filterMode === 'SITE_EXECUTION') return p.stage === 'SITE_EXECUTION' || p.isSiteWorkActive
      return true
    })
  }, [projects, search, filterMode])

  const handleOpenAssignModal = (project: ProjectSite) => {
    setSelectedProject(project)
    setSelectedElectricianIds(project.assignedElectricians.map((e) => e.id))
    setAssignmentModalOpen(true)
  }

  const toggleElectricianSelection = (userId: string) => {
    setSelectedElectricianIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const handleSaveAssignment = async () => {
    if (!selectedProject) return
    setAssigning(true)
    try {
      const res = await fetch(`/api/lead/${selectedProject.id}/electricians`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedElectricianIds }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to update Electricians')

      toast.success(json.message || 'Electricians updated successfully')
      setAssignmentModalOpen(false)
      await fetchProjects()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update Electricians')
    } finally {
      setAssigning(false)
    }
  }

  const handleRemoveElectrician = async (projectId: string, electrician: ElectricianUser) => {
    const key = `${projectId}:${electrician.id}`
    setRemovingKey(key)
    try {
      const res = await fetch(
        `/api/lead/${projectId}/electricians?userId=${encodeURIComponent(electrician.id)}`,
        { method: 'DELETE' },
      )
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to remove Electrician')

      toast.success(`Removed ${electrician.fullName} from project`)
      await fetchProjects()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove Electrician')
    } finally {
      setRemovingKey(null)
    }
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 min-h-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/electric-engineer/dashboard" className="hover:text-foreground transition">
              Electric Engineer
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Ongoing Site Projects</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-yellow-500 shrink-0" />
            Ongoing Site Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View active Project Coordinator sites and manage Electrician assignments
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
          <Button
            asChild
            size="sm"
            className="text-xs gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          >
            <Link href="/electric-engineer/requisition">
              <Zap className="w-4 h-4" />
              New Requisition
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card
          onClick={() => setFilterMode('ALL')}
          className={`p-4 border-border transition cursor-pointer ${
            filterMode === 'ALL'
              ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500/50'
              : 'bg-card hover:border-blue-500/40'
          }`}
        >
          <div className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">
            Ongoing Sites
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{summary.totalProjects}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Active PC projects</div>
        </Card>

        <Card
          onClick={() => setFilterMode('ASSIGNED')}
          className={`p-4 border-border transition cursor-pointer ${
            filterMode === 'ASSIGNED'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500/50'
              : 'bg-card hover:border-emerald-500/40'
          }`}
        >
          <div className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">
            Electrician Assigned
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {summary.assignedElectricianCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Sites covered</div>
        </Card>

        <Card
          onClick={() => setFilterMode('UNASSIGNED')}
          className={`p-4 border-border transition cursor-pointer ${
            filterMode === 'UNASSIGNED'
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-500/50'
              : 'bg-card hover:border-amber-500/40'
          }`}
        >
          <div className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">
            Needs Electrician
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
            {summary.unassignedElectricianCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Unassigned sites</div>
        </Card>

        <Card
          onClick={() => setFilterMode('SITE_EXECUTION')}
          className={`p-4 border-border transition cursor-pointer ${
            filterMode === 'SITE_EXECUTION'
              ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-500/50'
              : 'bg-card hover:border-purple-500/40'
          }`}
        >
          <div className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">
            In Site Execution
          </div>
          <div className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
            {summary.inExecutionCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Active execution</div>
        </Card>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by project, address, phone, or electrician..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {([
            { key: 'ALL', label: `All (${projects.length})` },
            { key: 'UNASSIGNED', label: `Unassigned (${summary.unassignedElectricianCount})` },
            { key: 'ASSIGNED', label: `Assigned (${summary.assignedElectricianCount})` },
            { key: 'SITE_EXECUTION', label: 'Site Execution' },
          ] as const).map((tab) => (
            <Button
              key={tab.key}
              variant={filterMode === tab.key ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-8"
              onClick={() => setFilterMode(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Card Grid ── */}
      {loading ? (
        <div className="flex justify-center items-center p-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading ongoing site projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-16 text-center space-y-2 border rounded-xl bg-card">
          <FolderKanban className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-semibold">No ongoing site projects found</h3>
          <p className="text-xs text-muted-foreground">
            {search || filterMode !== 'ALL'
              ? 'No projects matched your current search or filter.'
              : 'There are currently no ongoing site projects under the Project Coordinator.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const hasElectrician = p.assignedElectricians.length > 0

            return (
              <Card
                key={p.id}
                className="border-border hover:shadow-md transition-all bg-card flex flex-col justify-between overflow-hidden"
              >
                {/* ── Card Header: Client Name, Address, Phone & Stage ── */}
                <CardHeader className="pb-3 border-b border-border/40 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold text-foreground line-clamp-1">
                        {p.name}
                      </div>

                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{p.location || 'Address not specified'}</span>
                      </div>

                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {p.phone ? (
                          <a
                            href={`tel:${p.phone}`}
                            className="font-semibold text-foreground hover:text-blue-600 hover:underline transition"
                          >
                            {p.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground/70 italic text-[11px]">
                            Phone not provided
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant={p.isSiteWorkActive || p.stage === 'SITE_EXECUTION' ? 'default' : 'outline'}
                        className="text-[10px] font-medium"
                      >
                        {p.isSiteWorkActive ? 'Active Site' : p.stage.replace(/_/g, ' ')}
                      </Badge>
                      {p.assignedProjectCoordinator && (
                        <span className="text-[10px] text-muted-foreground">
                          PC: {p.assignedProjectCoordinator.fullName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scope / Agreement Highlight */}
                  <div className="flex items-center justify-between gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg px-2.5 py-1.5">
                    <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{p.agreementSqft ? 'Project Area' : 'Agreement Value'}</span>
                    </span>
                    <span className="font-mono font-bold text-sm text-blue-700 dark:text-blue-400">
                      {p.agreementSqft
                        ? `${p.agreementSqft.toLocaleString()} sqft`
                        : formatCurrency(p.agreementValue || p.budget)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3.5 pt-3 pb-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* ── Assigned Electricians & Management ── */}
                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-yellow-500" />
                          <span>Assigned Electricians</span>
                          {p.assignedElectricians.length > 0 && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                              {p.assignedElectricians.length}
                            </Badge>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAssignModal(p)}
                          className="h-6 px-2 text-[11px] font-medium gap-1 text-yellow-700 border-yellow-300 bg-yellow-50/70 hover:bg-yellow-100 hover:text-yellow-800 dark:text-yellow-300 dark:border-yellow-800 dark:bg-yellow-950/50 transition"
                        >
                          <UserPlus className="w-3 h-3" />
                          {hasElectrician ? 'Add / Manage' : 'Assign Electrician'}
                        </Button>
                      </div>

                      {hasElectrician ? (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {p.assignedElectricians.map((el) => {
                            const isRemoving = removingKey === `${p.id}:${el.id}`
                            return (
                              <Badge
                                key={el.id}
                                variant="secondary"
                                className="text-[11px] py-0.5 pl-2 pr-1 bg-yellow-50 text-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-200 font-medium border border-yellow-300/70 dark:border-yellow-800 flex items-center gap-1"
                              >
                                <UserCheck className="w-3 h-3 text-yellow-600 dark:text-yellow-400 shrink-0" />
                                <span>{el.fullName}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveElectrician(p.id, el)}
                                  disabled={isRemoving}
                                  title={`Remove ${el.fullName}`}
                                  className="ml-0.5 rounded-full p-0.5 hover:bg-yellow-200/80 dark:hover:bg-yellow-800/80 text-yellow-800 dark:text-yellow-300 transition"
                                >
                                  {isRemoving ? (
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  ) : (
                                    <X className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              </Badge>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            No electrician assigned yet
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── Site Engineers & Site Activity Summary ── */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-lg border border-border/60 bg-background/60 p-2 space-y-0.5">
                        <div className="text-muted-foreground flex items-center gap-1">
                          <HardHat className="w-3 h-3 text-blue-500" />
                          <span>Site Engineer</span>
                        </div>
                        <div className="font-medium text-foreground truncate">
                          {p.assignedSiteEngineers.length > 0
                            ? p.assignedSiteEngineers.map((se) => se.fullName).join(', ')
                            : 'Unassigned'}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/60 bg-background/60 p-2 space-y-0.5">
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Truck className="w-3 h-3 text-emerald-500" />
                          <span>Deliveries / POs</span>
                        </div>
                        <div className="font-medium text-foreground flex items-center gap-2">
                          <span>{p.deliveriesSummary.total} deliveries</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="flex items-center gap-0.5">
                            <ShoppingCart className="w-3 h-3 text-muted-foreground" />
                            {p.purchasedSummary.totalPOs}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Card Footer Action ── */}
                  <div className="pt-2 border-t border-border/50 flex items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 flex-1 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950/40 transition"
                    >
                      <Link href={`/electric-engineer/requisition?leadId=${p.id}`}>
                        <Zap className="w-3.5 h-3.5" />
                        Electrical Requisition
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenAssignModal(p)}
                      className="h-8 text-xs gap-1.5 transition"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Manage Team
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Multi-Electrician Assignment Modal ── */}
      <Dialog open={assignmentModalOpen} onOpenChange={setAssignmentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-yellow-500" />
              Manage Electricians
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign or remove Electricians for{' '}
              <strong className="text-foreground">{selectedProject?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-xs text-muted-foreground">
              Select all Electricians who should work on and see this project:
            </div>

            {electricians.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground border rounded-lg">
                No active users found in the ELECTRICIAN department.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2 divide-y">
                {electricians.map((el) => {
                  const isSelected = selectedElectricianIds.includes(el.id)
                  return (
                    <div
                      key={el.id}
                      onClick={() => toggleElectricianSelection(el.id)}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition text-xs ${
                        isSelected
                          ? 'bg-yellow-50/90 dark:bg-yellow-950/40'
                          : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                            isSelected
                              ? 'bg-yellow-500 border-yellow-500 text-black'
                              : 'border-input'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{el.fullName}</div>
                          <div className="text-[11px] text-muted-foreground">{el.email}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {el.activeProjectsCount ? `${el.activeProjectsCount} sites` : 'Available'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}

            {selectedElectricianIds.length === 0 && electricians.length > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Notice: Saving with 0 electricians will unassign all electricians from this project.
              </p>
            )}
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
              onClick={handleSaveAssignment}
              disabled={assigning}
              className="text-xs bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {assigning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Assignments'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
