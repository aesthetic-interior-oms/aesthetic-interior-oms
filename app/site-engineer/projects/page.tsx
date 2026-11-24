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
  LayoutGrid,
  List,
  Clock,
  XCircle,
  HardHat,
  MessageSquare,
  Check,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  agreementSqft?: number | null
  budget?: number | null
  created_at: string
  isSiteWorkActive?: boolean
  siteWorkStartedAt?: string | null
  latestSiteWorkRequest?: {
    id: string
    status: string
    note: string | null
    createdAt: string
  } | null
  assignedSiteEngineer: SiteEngineerUser | null
  assignedSiteEngineers?: SiteEngineerUser[]
  assignedProjectCoordinator: { id: string; fullName: string } | null
  assignedSrCrm: { id: string; fullName: string } | null
  quotationProductsCount?: number
  deliveriesSummary: {
    total: number
    issues: number
    goodCount?: number
    partialCount?: number
    damagedCount?: number
    rejectedCount?: number
    totalQuantity?: number
    latestDate: string | null
  }
  purchasedSummary: {
    totalPOs: number
    approvedPOs: number
    completedPOs?: number
    pendingPOs?: number
    totalAmount: number
    totalItemsCount?: number
    totalQuantity?: number
  }
  scopeProgress: {
    total: number
    completed: number
    percent: number
  }
  materialsComparison?: {
    status: 'NO_PURCHASES' | 'AWAITING_DELIVERY' | 'PARTIALLY_DELIVERED' | 'FULLY_DELIVERED'
    label: string
    purchasedQty: number
    deliveredQty: number
    deliveryPercent: number
  }
}

type SiteWorkRequestItem = {
  id: string
  leadId: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  note: string | null
  rejectionReason: string | null
  createdAt: string
  reviewedAt: string | null
  lead: {
    id: string
    name: string
    phone: string | null
    email: string | null
    location: string | null
    stage: string
    subStatus: string | null
    agreementType: string | null
    agreementValue: number | null
    isSiteWorkActive: boolean
    assignments?: Array<{
      department: string
      user: { id: string; fullName: string; email: string }
    }>
  }
  requestedBy: { id: string; fullName: string; email: string }
  reviewedBy: { id: string; fullName: string; email: string } | null
}

type Stats = {
  totalProjects: number
  unassignedCount: number
  inExecutionCount: number
  totalDeliveries: number
  totalPurchased: number
  pendingRequestsCount?: number
}

export default function SiteEngineerProjectsPage() {
  const [activeMainTab, setActiveMainTab] = useState<'ONGOING' | 'REQUESTS'>('ONGOING')
  const [viewMode, setViewMode] = useState<'CARDS' | 'LIST'>('CARDS')

  // Projects State
  const [projects, setProjects] = useState<ProjectSite[]>([])
  const [siteEngineers, setSiteEngineers] = useState<SiteEngineerUser[]>([])
  const [canManageAssignments, setCanManageAssignments] = useState(false)
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    unassignedCount: 0,
    inExecutionCount: 0,
    totalDeliveries: 0,
    totalPurchased: 0,
    pendingRequestsCount: 0,
  })

  // Pending Requests State
  const [requests, setRequests] = useState<SiteWorkRequestItem[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [requestsFilter, setRequestsFilter] = useState<'PENDING' | 'ALL' | 'ACCEPTED' | 'REJECTED'>('PENDING')

  // Common UI State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNASSIGNED' | 'SITE_EXECUTION'>('ALL')
  const [engineerFilter, setEngineerFilter] = useState('ALL')

  // Multi-Site Engineer Assignment Dialog
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectSite | null>(null)
  const [selectedEngineerIds, setSelectedEngineerIds] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)

  // Request Action Modals
  const [acceptingRequest, setAcceptingRequest] = useState<SiteWorkRequestItem | null>(null)
  const [acceptEngineerIds, setAcceptEngineerIds] = useState<string[]>([])
  const [processingAccept, setProcessingAccept] = useState(false)

  const [rejectingRequest, setRejectingRequest] = useState<SiteWorkRequestItem | null>(null)
  const [rejectionReasonText, setRejectionReasonText] = useState('')
  const [processingReject, setProcessingReject] = useState(false)

  // Fetch Projects
  const fetchProjects = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/site-engineer/projects')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load projects')
      setProjects(json.data.projects || [])
      setStats(
        json.data.stats || {
          totalProjects: 0,
          unassignedCount: 0,
          inExecutionCount: 0,
          totalDeliveries: 0,
          totalPurchased: 0,
          pendingRequestsCount: 0,
        },
      )
      setSiteEngineers(json.data.siteEngineers || [])
      setCanManageAssignments(Boolean(json.data.canManageAssignments))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error loading projects')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeMainTab])

  // Fetch Site Work Requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoadingRequests(true)
      const res = await fetch(`/api/site-engineer/requests?status=${requestsFilter}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load requests')
      setRequests(json.data || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error loading requests')
    } finally {
      setLoadingRequests(false)
    }
  }, [requestsFilter])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    if (activeMainTab === 'REQUESTS') {
      fetchRequests()
    }
  }, [activeMainTab, fetchRequests])

  // Open Multi-Engineer Assignment Modal
  const handleOpenAssignModal = (project: ProjectSite) => {
    setSelectedProject(project)
    const currentIds = (project.assignedSiteEngineers || [])
      .map((e) => e.id)
      .concat(project.assignedSiteEngineer ? [project.assignedSiteEngineer.id] : [])
    const uniqueIds = Array.from(new Set(currentIds.filter(Boolean)))
    setSelectedEngineerIds(uniqueIds)
    setAssignmentModalOpen(true)
  }

  // Toggle engineer selection in assignment modal
  const toggleEngineerSelection = (engId: string) => {
    setSelectedEngineerIds((prev) =>
      prev.includes(engId) ? prev.filter((id) => id !== engId) : [...prev, engId],
    )
  }

  // Save assignment of multiple site engineers
  const handleSaveMultiAssignment = async () => {
    if (!selectedProject) return

    try {
      setAssigning(true)
      const res = await fetch(`/api/lead/${selectedProject.id}/site-engineers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedEngineerIds }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update site engineer assignments')
      }

      toast.success(
        selectedEngineerIds.length > 0
          ? `Assigned ${selectedEngineerIds.length} Site Engineer(s) to ${selectedProject.name}`
          : `Removed all Site Engineers from ${selectedProject.name}`,
      )
      setAssignmentModalOpen(false)
      fetchProjects()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update assignment')
    } finally {
      setAssigning(false)
    }
  }

  // Submit Accept Site Work Request
  const handleAcceptRequest = async () => {
    if (!acceptingRequest) return

    try {
      setProcessingAccept(true)
      const res = await fetch(`/api/site-engineer/requests/${acceptingRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACCEPT',
          siteEngineerUserIds: acceptEngineerIds,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to accept site work request')
      }

      toast.success(`Site work accepted for ${acceptingRequest.lead.name}!`)
      setAcceptingRequest(null)
      setAcceptEngineerIds([])
      // Refresh requests and projects
      fetchRequests()
      fetchProjects()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to accept request')
    } finally {
      setProcessingAccept(false)
    }
  }

  // Submit Reject Site Work Request
  const handleRejectRequest = async () => {
    if (!rejectingRequest) return
    const reason = rejectionReasonText.trim()
    if (!reason) {
      toast.error('Please enter a rejection reason')
      return
    }

    try {
      setProcessingReject(true)
      const res = await fetch(`/api/site-engineer/requests/${rejectingRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          rejectionReason: reason,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to reject site work request')
      }

      toast.success(`Request declined. Feedback saved for Admin / Sr CRM.`)
      setRejectingRequest(null)
      setRejectionReasonText('')
      fetchRequests()
      fetchProjects()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject request')
    } finally {
      setProcessingReject(false)
    }
  }

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = search.toLowerCase().trim()
      const engineerNames = (p.assignedSiteEngineers || [p.assignedSiteEngineer])
        .filter(Boolean)
        .map((e) => e?.fullName.toLowerCase())
        .join(' ')

      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        engineerNames.includes(q)

      let matchesFilter = true
      const hasEngineer =
        (p.assignedSiteEngineers && p.assignedSiteEngineers.length > 0) || Boolean(p.assignedSiteEngineer)

      if (filterMode === 'UNASSIGNED') {
        matchesFilter = !hasEngineer
      } else if (filterMode === 'SITE_EXECUTION') {
        matchesFilter = p.stage === 'SITE_EXECUTION' || Boolean(p.isSiteWorkActive)
      }

      let matchesEngineer = true
      if (engineerFilter !== 'ALL') {
        if (engineerFilter === 'UNASSIGNED') {
          matchesEngineer = !hasEngineer
        } else {
          const assignedIds = (p.assignedSiteEngineers || [p.assignedSiteEngineer])
            .filter(Boolean)
            .map((e) => e?.id)
          matchesEngineer = assignedIds.includes(engineerFilter)
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
            <Link href="/crm/pc/dashboard" className="hover:text-foreground">
              Project Coordinator
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Site Engineering</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FolderKanban className="w-7 h-7 text-blue-600 shrink-0" />
            Site Engineering &amp; Execution
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review site work requests from CRM, assign Site Engineers, and monitor ongoing field construction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchProjects()
              if (activeMainTab === 'REQUESTS') fetchRequests()
            }}
            disabled={refreshing || loadingRequests}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loadingRequests ? 'animate-spin' : ''}`} />
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

      {/* ── Primary Navigation Tabs ── */}
      <div className="flex items-center justify-between border-b pb-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant={activeMainTab === 'ONGOING' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveMainTab('ONGOING')}
            className={`text-xs gap-2 font-medium ${
              activeMainTab === 'ONGOING' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
            }`}
          >
            <HardHat className="w-4 h-4" />
            Ongoing Sites
            <Badge
              variant="secondary"
              className={`text-[10px] ml-1 px-1.5 py-0 ${
                activeMainTab === 'ONGOING' ? 'bg-white/20 text-white' : ''
              }`}
            >
              {projects.length}
            </Badge>
          </Button>

          <Button
            variant={activeMainTab === 'REQUESTS' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveMainTab('REQUESTS')}
            className={`text-xs gap-2 font-medium relative ${
              activeMainTab === 'REQUESTS' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Requests
            {(stats.pendingRequestsCount ?? 0) > 0 ? (
              <Badge
                className={`text-[10px] ml-1 px-1.5 py-0 ${
                  activeMainTab === 'REQUESTS'
                    ? 'bg-white text-amber-900 font-bold'
                    : 'bg-amber-600 text-white'
                }`}
              >
                {stats.pendingRequestsCount}
              </Badge>
            ) : null}
          </Button>
        </div>

        {/* View Mode Switcher (Card vs List) */}
        {activeMainTab !== 'REQUESTS' && (
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={viewMode === 'CARDS' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('CARDS')}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </Button>
            <Button
              variant={viewMode === 'LIST' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('LIST')}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <List className="w-3.5 h-3.5" />
              List
            </Button>
          </div>
        )}
      </div>

      {/* ── TOP METRICS CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-card border-border hover:border-blue-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Ongoing Sites</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{stats.totalProjects}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Approved site execution projects</p>
        </Card>

        <Card
          className={`p-4 border-border transition cursor-pointer ${
            stats.unassignedCount > 0
              ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15'
              : 'bg-card'
          }`}
          onClick={() => {
            setActiveMainTab('ONGOING')
            setFilterMode(stats.unassignedCount > 0 ? 'UNASSIGNED' : 'ALL')
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Needs Site Engineer</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">
            {stats.unassignedCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {stats.unassignedCount > 0 ? 'Requires PC assignment' : 'All sites assigned'}
          </p>
        </Card>

        <Card
          className={`p-4 border-border transition cursor-pointer ${
            (stats.pendingRequestsCount ?? 0) > 0
              ? 'bg-blue-500/10 border-blue-500/40 hover:bg-blue-500/15'
              : 'bg-card'
          }`}
          onClick={() => setActiveMainTab('REQUESTS')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Pending Requests</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-blue-700 dark:text-blue-300">
            {stats.pendingRequestsCount ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting PC approval to mobilize</p>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {canManageAssignments ? 'Purchased & Delivered' : 'Gate Deliveries Logged'}
            </span>
            <ShoppingCart className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-foreground truncate">
            {canManageAssignments
              ? formatCurrency(stats.totalPurchased)
              : `${stats.totalDeliveries} Deliveries`}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {canManageAssignments
              ? 'Procured materials value across sites'
              : `${stats.totalDeliveries} site deliveries logged`}
          </p>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1 & 3: ONGOING SITES & ALL AGREEMENT LEADS
      ───────────────────────────────────────────────────────────── */}
      {activeMainTab !== 'REQUESTS' && (
        <div className="space-y-4">
          {/* Search & Filter Controls */}
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
                All ({projects.length})
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
                In Execution ({stats.inExecutionCount})
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

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col justify-center items-center p-20 text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Loading project sites...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-16 text-center space-y-3 border rounded-xl bg-card">
              <FolderKanban className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <h3 className="text-base font-semibold">No ongoing sites found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search || filterMode !== 'ALL' || engineerFilter !== 'ALL'
                  ? 'No projects match your active search and filter filters.'
                  : 'Site projects will appear here once accepted from the Pending Requests queue.'}
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
          ) : viewMode === 'CARDS' ? (
            /* ── VIEW MODE: CARDS ── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((p) => {
                const assignedEngs = (p.assignedSiteEngineers && p.assignedSiteEngineers.length > 0)
                  ? p.assignedSiteEngineers
                  : p.assignedSiteEngineer
                  ? [p.assignedSiteEngineer]
                  : []
                const hasEngineer = assignedEngs.length > 0

                return (
                  <Card
                    key={p.id}
                    className="border-border hover:shadow-md transition-all bg-card flex flex-col justify-between overflow-hidden"
                  >
                    {/* ── 1. Client Name, Address, Phone & 2. Agreement Budget Header ── */}
                    <CardHeader className="pb-3 border-b border-border/40 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* 1. Client Name */}
                          <Link
                            href={`/site-engineer/projects/${p.id}`}
                            className="text-base font-bold text-foreground hover:text-blue-600 transition flex items-center gap-1.5"
                          >
                            <span className="line-clamp-1">{p.name}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-60 shrink-0" />
                          </Link>

                          {/* 1. Client Address */}
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate">{p.location || 'Address not specified'}</span>
                          </div>

                          {/* 1. Client Phone */}
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-mono">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            {p.phone ? (
                              <a
                                href={`tel:${p.phone}`}
                                className="font-semibold text-foreground hover:text-blue-600 hover:underline"
                              >
                                {p.phone}
                              </a>
                            ) : (
                              <span className="text-muted-foreground/70 italic text-[11px]">Phone not provided</span>
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
                          {p.assignedSrCrm && (
                            <span className="text-[10px] text-muted-foreground">
                              CRM: {p.assignedSrCrm.fullName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2. Agreement Budget or Scope / Sqft Highlight Banner */}
                      {canManageAssignments ? (
                        <div className="flex items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg px-2.5 py-1.5">
                          <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Agreement Budget</span>
                          </span>
                          <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(p.agreementValue || p.budget)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg px-2.5 py-1.5">
                          <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>Project Scope Area</span>
                          </span>
                          <span className="font-mono font-bold text-sm text-blue-700 dark:text-blue-400">
                            {p.agreementSqft ? `${p.agreementSqft.toLocaleString()} sqft` : `${p.quotationProductsCount || 0} Work Items`}
                          </span>
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3.5 pt-3 pb-4">
                      {/* ── 3. Site Engineers (Multiple) & 4. Add Site Engineers Button ── */}
                      <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
                            <HardHat className="w-3.5 h-3.5 text-blue-600" />
                            <span>Site Engineers</span>
                            {assignedEngs.length > 0 && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                {assignedEngs.length}
                              </Badge>
                            )}
                          </div>

                          {/* 4. Add Site Engineers Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAssignModal(p)}
                            className="h-6 px-2 text-[11px] font-medium gap-1 text-blue-700 border-blue-200 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-300 dark:border-blue-800 dark:bg-blue-950/50"
                          >
                            <UserPlus className="w-3 h-3" />
                            {hasEngineer ? 'Add / Manage' : 'Add Site Engineers'}
                          </Button>
                        </div>

                        {/* 3. Site Engineers Badges */}
                        {hasEngineer ? (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {assignedEngs.map((eng) => (
                              <Badge
                                key={eng.id}
                                variant="secondary"
                                className="text-[11px] py-0.5 px-2 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-medium border border-blue-200/60 flex items-center gap-1"
                              >
                                <UserCheck className="w-3 h-3 text-blue-600 shrink-0" />
                                <span>{eng.fullName}</span>
                                {eng.phone && <span className="text-[10px] opacity-70 font-mono">({eng.phone})</span>}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                            <span className="flex items-center gap-1 text-[11px]">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              No Site Engineer assigned
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleOpenAssignModal(p)}
                              className="h-5 px-1.5 text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1"
                            >
                              <UserPlus className="w-2.5 h-2.5" /> Assign Now
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* ── 5. Progress Bar & 6. Number of Quotation Products ── */}
                      <div className="bg-muted/30 p-2.5 rounded-lg border border-border/60 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                            <span>Execution Progress</span>
                          </span>
                          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                            {p.scopeProgress.percent}%
                          </span>
                        </div>

                        {/* 5. Visual Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/30">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              p.scopeProgress.percent === 100
                                ? 'bg-emerald-600'
                                : p.scopeProgress.percent > 50
                                ? 'bg-blue-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, p.scopeProgress.percent))}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                          <span>
                            Completed: <strong className="text-foreground">{p.scopeProgress.completed}</strong> / {p.scopeProgress.total} items
                          </span>
                          {/* 6. Number of Quotation Products */}
                          <span className="font-medium text-foreground">
                            Quotation Products: <strong className="text-blue-600 dark:text-blue-400 font-bold">{p.quotationProductsCount || p.scopeProgress.total}</strong>
                          </span>
                        </div>
                      </div>

                      {/* ── 7. Purchase Orders Completed & 8. Comparison Between Purchased & Delivered Materials ── */}
                      <div className="space-y-2 border border-border/60 rounded-lg p-2.5 bg-card">
                        <div className="flex items-center justify-between text-xs pb-1 border-b border-border/40">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-purple-600" />
                            <span>Purchased vs Delivered</span>
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${
                              p.materialsComparison?.status === 'FULLY_DELIVERED'
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : p.materialsComparison?.status === 'PARTIALLY_DELIVERED'
                                ? 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                : p.materialsComparison?.status === 'AWAITING_DELIVERY'
                                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'border-muted text-muted-foreground'
                            }`}
                          >
                            {p.materialsComparison?.label || 'No POs Issued'}
                          </Badge>
                        </div>

                        {/* Split Comparison Cards */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* 7. Purchased Side (Completed POs) */}
                          <div className="bg-muted/30 p-2 rounded border border-border/40 text-left space-y-0.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <ShoppingCart className="w-3 h-3 text-purple-600" />
                              <span>Purchased</span>
                            </div>
                            {/* 7. Completed POs count */}
                            <div className="text-xs font-bold text-foreground">
                              <span className="text-emerald-600 font-extrabold">{p.purchasedSummary.completedPOs || 0}</span>
                              <span className="text-muted-foreground font-normal"> / {p.purchasedSummary.totalPOs} POs Done</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              Approved: {p.purchasedSummary.approvedPOs} POs
                              {canManageAssignments ? ` • ${formatCurrency(p.purchasedSummary.totalAmount)}` : ''}
                            </div>
                            {Boolean(p.purchasedSummary.totalQuantity) && (
                              <div className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">
                                Qty: {p.purchasedSummary.totalQuantity} units ({p.purchasedSummary.totalItemsCount || 0} items)
                              </div>
                            )}
                          </div>

                          {/* 8. Delivered Side (Gate Logs) */}
                          <div className="bg-muted/30 p-2 rounded border border-border/40 text-left space-y-0.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Truck className="w-3 h-3 text-blue-600" />
                              <span>Delivered</span>
                            </div>
                            <div className="text-xs font-bold text-foreground">
                              <span>{p.deliveriesSummary.total} Deliveries</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {p.deliveriesSummary.issues > 0 ? (
                                <span className="text-rose-600 font-medium">{p.deliveriesSummary.issues} issues reported</span>
                              ) : (
                                <span className="text-emerald-600 font-medium">All verified good</span>
                              )}
                            </div>
                            {Boolean(p.deliveriesSummary.totalQuantity) ? (
                              <div className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">
                                Received: {p.deliveriesSummary.totalQuantity} units
                              </div>
                            ) : (
                              <div className="text-[10px] text-muted-foreground truncate">
                                {p.deliveriesSummary.latestDate
                                  ? new Date(p.deliveriesSummary.latestDate).toLocaleDateString('en-GB')
                                  : 'No gate logs yet'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 8. Delivery Fulfillment Progress Bar */}
                        {p.purchasedSummary.totalPOs > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                              <span>Delivery Fulfillment</span>
                              <span className="font-semibold text-foreground font-mono">
                                {p.materialsComparison?.deliveryPercent || 0}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  (p.materialsComparison?.deliveryPercent || 0) >= 100
                                    ? 'bg-emerald-600'
                                    : (p.materialsComparison?.deliveryPercent || 0) > 0
                                    ? 'bg-purple-600'
                                    : 'bg-muted-foreground/30'
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, p.materialsComparison?.deliveryPercent || 0))}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

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
                            Deliveries &amp; Gate Pass
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            /* ── VIEW MODE: LIST / TABLE ── */
            <Card className="border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 border-b">
                      <TableHead className="w-[230px] font-semibold text-foreground py-3">Client &amp; Site</TableHead>
                      <TableHead className="w-[180px] font-semibold text-foreground py-3">Address &amp; Phone</TableHead>
                      <TableHead className="w-[130px] font-semibold text-foreground py-3 text-right">
                        {canManageAssignments ? 'Agreement Budget' : 'Project Sqft / Scope'}
                      </TableHead>
                      <TableHead className="w-[230px] font-semibold text-foreground py-3">Site Engineer(s)</TableHead>
                      <TableHead className="w-[180px] font-semibold text-foreground py-3">Execution &amp; Products</TableHead>
                      <TableHead className="w-[150px] font-semibold text-foreground py-3 text-center">Completed POs</TableHead>
                      <TableHead className="w-[160px] font-semibold text-foreground py-3 text-center">Material Deliveries</TableHead>
                      <TableHead className="w-[120px] font-semibold text-foreground py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((p) => {
                      const assignedEngs = (p.assignedSiteEngineers && p.assignedSiteEngineers.length > 0)
                        ? p.assignedSiteEngineers
                        : p.assignedSiteEngineer
                        ? [p.assignedSiteEngineer]
                        : []
                      const hasEngineer = assignedEngs.length > 0

                      return (
                        <TableRow key={p.id} className="hover:bg-muted/30">
                          {/* 1. Client Name & Stage */}
                          <TableCell className="align-top py-3.5">
                            <div>
                              <Link
                                href={`/site-engineer/projects/${p.id}`}
                                className="font-bold text-foreground hover:text-blue-600 transition flex items-center gap-1"
                              >
                                {p.name}
                                <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-60" />
                              </Link>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                  {p.isSiteWorkActive ? 'Active Site' : p.stage.replace(/_/g, ' ')}
                                </Badge>
                                {p.assignedSrCrm && (
                                  <span className="text-[11px] text-muted-foreground">
                                    CRM: {p.assignedSrCrm.fullName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* 1. Address & Phone */}
                          <TableCell className="align-top py-3.5 text-xs text-muted-foreground">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="truncate max-w-[170px]">{p.location || 'Address not specified'}</span>
                              </div>
                              <div className="flex items-center gap-1 font-mono">
                                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                {p.phone ? (
                                  <a href={`tel:${p.phone}`} className="hover:underline font-semibold text-foreground">
                                    {p.phone}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground/60 italic text-[11px]">N/A</span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* 2. Agreement Budget or Project Sqft */}
                          <TableCell className="align-top py-3.5 text-right font-mono font-bold text-xs text-foreground">
                            {canManageAssignments ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(p.agreementValue || p.budget)}
                              </span>
                            ) : (
                              <span className="text-blue-600 dark:text-blue-400">
                                {p.agreementSqft ? `${p.agreementSqft.toLocaleString()} sqft` : `${p.quotationProductsCount || 0} items`}
                              </span>
                            )}
                          </TableCell>

                          {/* 3. Site Engineers & 4. Add Site Engineers Button */}
                          <TableCell className="align-top py-3.5">
                            <div className="space-y-1.5">
                              {hasEngineer ? (
                                <div className="flex flex-wrap gap-1 items-center">
                                  {assignedEngs.map((eng) => (
                                    <Badge
                                      key={eng.id}
                                      variant="secondary"
                                      className="text-[10px] py-0.5 px-1.5 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-medium"
                                    >
                                      {eng.fullName}
                                    </Badge>
                                  ))}
                                  {canManageAssignments && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleOpenAssignModal(p)}
                                      className="h-5 px-1 text-[10px] text-blue-700 dark:text-blue-300 hover:text-foreground"
                                    >
                                      + Add
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                    Unassigned
                                  </span>
                                  {canManageAssignments && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenAssignModal(p)}
                                      className="h-5 px-1.5 text-[10px] border-amber-500/50 text-amber-700 hover:bg-amber-50"
                                    >
                                      <UserPlus className="w-2.5 h-2.5 mr-0.5" /> Add
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* 5. Progress Bar & 6. Number of Quotation Products */}
                          <TableCell className="align-top py-3.5">
                            <div className="space-y-1 min-w-[140px]">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-blue-600">{p.scopeProgress.percent}%</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {p.scopeProgress.completed}/{p.quotationProductsCount || p.scopeProgress.total} products
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    p.scopeProgress.percent === 100
                                      ? 'bg-emerald-600'
                                      : p.scopeProgress.percent > 50
                                      ? 'bg-blue-600'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, p.scopeProgress.percent))}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>

                          {/* 7. Number of Purchase Orders Completed */}
                          <TableCell className="align-top py-3.5 text-center text-xs">
                            <div className="font-bold text-foreground">
                              <span className="text-emerald-600">{p.purchasedSummary.completedPOs || 0}</span>
                              <span className="text-muted-foreground font-normal"> / {p.purchasedSummary.totalPOs} Done</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground block font-mono">
                              {canManageAssignments
                                ? formatCurrency(p.purchasedSummary.totalAmount)
                                : `${p.purchasedSummary.approvedPOs} Approved POs`}
                            </span>
                          </TableCell>

                          {/* 8. Comparison: Purchased vs Delivered */}
                          <TableCell className="align-top py-3.5 text-center text-xs">
                            <div>
                              <Badge
                                variant="outline"
                                className={`text-[9px] py-0 px-1 font-semibold ${
                                  p.materialsComparison?.status === 'FULLY_DELIVERED'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                    : p.materialsComparison?.status === 'PARTIALLY_DELIVERED'
                                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                                    : p.materialsComparison?.status === 'AWAITING_DELIVERY'
                                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                                    : 'border-muted text-muted-foreground'
                                }`}
                              >
                                {p.materialsComparison?.label || `${p.deliveriesSummary.total} Deliveries`}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground block mt-0.5">
                                {p.deliveriesSummary.total} deliveries logged
                              </span>
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="align-top py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button asChild size="sm" variant="outline" className="h-7 text-xs px-2.5">
                                <Link href={`/site-engineer/projects/${p.id}`}>
                                  Scope
                                </Link>
                              </Button>
                              <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2 text-amber-700">
                                <Link href={`/site-engineer/delivery?leadId=${p.id}`}>
                                  <Truck className="w-3.5 h-3.5" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: PENDING SITE WORK REQUESTS (FROM AGREEMENT LEAD PAGE)
      ───────────────────────────────────────────────────────────── */}
      {activeMainTab === 'REQUESTS' && (
        <div className="space-y-4">
          {/* Header & Filter for Requests */}
          <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-xl border flex-wrap">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Incoming Site Work Requests
              </h2>
              <p className="text-xs text-muted-foreground">
                Requests submitted by Admin &amp; Senior CRM from the Agreement Lead page to commence site operations.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant={requestsFilter === 'PENDING' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setRequestsFilter('PENDING')}
                className={`text-xs h-8 ${
                  requestsFilter === 'PENDING' ? 'bg-amber-600 hover:bg-amber-700 text-white font-semibold' : ''
                }`}
              >
                Pending Review
              </Button>
              <Button
                variant={requestsFilter === 'ACCEPTED' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setRequestsFilter('ACCEPTED')}
                className="text-xs h-8"
              >
                Accepted
              </Button>
              <Button
                variant={requestsFilter === 'REJECTED' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setRequestsFilter('REJECTED')}
                className="text-xs h-8"
              >
                Declined
              </Button>
              <Button
                variant={requestsFilter === 'ALL' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setRequestsFilter('ALL')}
                className="text-xs h-8"
              >
                All Requests
              </Button>
            </div>
          </div>

          {/* Loading or List */}
          {loadingRequests ? (
            <div className="flex flex-col justify-center items-center p-20 text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              <p className="text-sm font-medium">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-16 text-center space-y-3 border rounded-xl bg-card">
              <CheckCircle2 className="w-12 h-12 text-emerald-600/40 mx-auto" />
              <h3 className="text-base font-semibold">No requests in this view</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {requestsFilter === 'PENDING'
                  ? 'All site work requests have been reviewed and processed.'
                  : 'No site work requests match this filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((req) => {
                const isPending = req.status === 'PENDING'
                const isAccepted = req.status === 'ACCEPTED'
                const isRejected = req.status === 'REJECTED'

                return (
                  <Card
                    key={req.id}
                    className={`border transition bg-card overflow-hidden ${
                      isPending ? 'border-amber-400/80 shadow-xs' : 'border-border'
                    }`}
                  >
                    <CardHeader className="pb-3 border-b bg-muted/20 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-base font-bold text-foreground">
                            {req.lead?.name || 'Project'}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{req.lead?.location || 'Location not specified'}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={`text-[10px] font-semibold ${
                              isPending
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : isAccepted
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            }`}
                          >
                            {req.status}
                          </Badge>
                          {canManageAssignments && req.lead?.agreementValue ? (
                            <span className="text-xs font-mono font-bold text-emerald-600">
                              {formatCurrency(req.lead.agreementValue)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {req.lead?.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3" />
                          <span>{req.lead.phone}</span>
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4 pt-3.5 pb-4">
                      {/* Requester Info */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Requested By:</span>
                          <span className="font-semibold text-foreground">
                            {req.requestedBy?.fullName} ({req.requestedBy?.email})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Requested At:</span>
                          <span>{new Date(req.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Requester Note */}
                      {req.note && (
                        <div className="bg-muted/40 p-2.5 rounded-lg border text-xs space-y-1">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            Notes from CRM:
                          </span>
                          <p className="text-muted-foreground italic whitespace-pre-wrap">{req.note}</p>
                        </div>
                      )}

                      {/* Rejection Reason (if rejected) */}
                      {isRejected && req.rejectionReason && (
                        <div className="bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900/60 text-xs space-y-1">
                          <span className="font-semibold text-red-800 dark:text-red-300">
                            Rejection Reason:
                          </span>
                          <p className="text-red-900 dark:text-red-200">{req.rejectionReason}</p>
                        </div>
                      )}

                      {/* Action Buttons for Pending Requests */}
                      {isPending && canManageAssignments && (
                        <div className="pt-2 border-t flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRejectingRequest(req)
                              setRejectionReasonText('')
                            }}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => {
                              setAcceptingRequest(req)
                              setAcceptEngineerIds([])
                            }}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Accept &amp; Assign Engineer
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: MULTI-SITE ENGINEER ASSIGNMENT MODAL
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={assignmentModalOpen} onOpenChange={setAssignmentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-blue-600" />
              Manage Site Engineers
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign one or multiple Site Engineers to oversee site execution for{' '}
              <strong className="text-foreground">{selectedProject?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-xs text-muted-foreground">
              Select all Site Engineers who should have access and responsibility for this site:
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2 divide-y">
              {siteEngineers.map((se) => {
                const isSelected = selectedEngineerIds.includes(se.id)
                return (
                  <div
                    key={se.id}
                    onClick={() => toggleEngineerSelection(se.id)}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition text-xs ${
                      isSelected ? 'bg-blue-50/80 dark:bg-blue-950/40' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-input'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{se.fullName}</div>
                        <div className="text-[11px] text-muted-foreground">{se.email}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {se.activeProjectsCount ? `${se.activeProjectsCount} sites` : 'Available'}
                    </Badge>
                  </div>
                )
              })}
            </div>

            {selectedEngineerIds.length === 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Notice: Saving with 0 engineers will unassign all engineers from this project.
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
              onClick={handleSaveMultiAssignment}
              disabled={assigning}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {assigning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Updating...
                </>
              ) : (
                `Save (${selectedEngineerIds.length} assigned)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: ACCEPT SITE WORK REQUEST & ASSIGN ENGINEER
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={Boolean(acceptingRequest)} onOpenChange={(open) => !open && setAcceptingRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              Accept Site Work Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm site mobilization for <strong>{acceptingRequest?.lead.name}</strong> and assign Site Engineer(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted/40 p-2.5 rounded-lg border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-semibold text-foreground">{acceptingRequest?.lead.location || 'N/A'}</span>
              </div>
              {canManageAssignments && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agreement Value:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatCurrency(acceptingRequest?.lead.agreementValue)}
                  </span>
                </div>
              )}
              {acceptingRequest?.note && (
                <div className="pt-1 mt-1 border-t text-muted-foreground italic">
                  &ldquo;{acceptingRequest.note}&rdquo;
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Assign Site Engineer(s) (optional now, can be updated later)
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-lg p-2 divide-y">
                {siteEngineers.map((se) => {
                  const isSelected = acceptEngineerIds.includes(se.id)
                  return (
                    <div
                      key={se.id}
                      onClick={() =>
                        setAcceptEngineerIds((prev) =>
                          prev.includes(se.id) ? prev.filter((id) => id !== se.id) : [...prev, se.id],
                        )
                      }
                      className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs ${
                        isSelected ? 'bg-blue-50/80 dark:bg-blue-950/40' : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-input'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-medium text-foreground">{se.fullName}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {se.activeProjectsCount ? `${se.activeProjectsCount} sites` : '0 sites'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAcceptingRequest(null)}
              disabled={processingAccept}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAcceptRequest}
              disabled={processingAccept}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {processingAccept ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Accepting...
                </>
              ) : (
                'Accept & Mobilize Site'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: REJECT SITE WORK REQUEST
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={Boolean(rejectingRequest)} onOpenChange={(open) => !open && setRejectingRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
              <XCircle className="w-5 h-5" />
              Decline Site Work Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              State the reason why site mobilization cannot start for{' '}
              <strong>{rejectingRequest?.lead.name}</strong>. This feedback will be saved and shown to Admin / Sr. CRM.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                rows={3}
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                placeholder="e.g. Site is not yet ready, client has not completed first installment, civil handover pending..."
                disabled={processingReject}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectingRequest(null)}
              disabled={processingReject}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRejectRequest}
              disabled={processingReject || !rejectionReasonText.trim()}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {processingReject ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Rejecting...
                </>
              ) : (
                'Confirm Rejection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
