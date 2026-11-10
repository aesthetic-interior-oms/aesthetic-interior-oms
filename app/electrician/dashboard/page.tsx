'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Zap,
  FolderKanban,
  ClipboardList,
  PlusCircle,
  RefreshCw,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  Loader2,
  HardHat,
  ArrowRight,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type Project = {
  id: string
  name: string
  location: string | null
  phone: string | null
  stage: string
}

type Requisition = {
  id: string
  requisitionNo: string
  status: string
  createdAt: string
  lead: { id: string; name: string; location: string | null }
  items: { id: string }[]
}

type SiteWorkLog = {
  id: string
  itemsSummary: string
  deliveryDate: string
  notes: string | null
  lead: { id: string; name: string; location: string | null }
}

export default function ElectricianDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [siteWorkLogs, setSiteWorkLogs] = useState<SiteWorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      const [projRes, reqRes, workRes] = await Promise.all([
        fetch('/api/electrician/projects'),
        fetch('/api/electrician/requisitions'),
        fetch('/api/electrician/site-work'),
      ])
      const [projJson, reqJson, workJson] = await Promise.all([
        projRes.json(),
        reqRes.json(),
        workRes.json(),
      ])
      if (projJson.success) setProjects(projJson.data.projects || [])
      if (reqJson.success) setRequisitions(reqJson.data.requisitions || [])
      if (workJson.success) setSiteWorkLogs(workJson.data.logs || [])
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const submittedCount = requisitions.filter((r) => r.status === 'SUBMITTED').length
  const inProcurementCount = requisitions.filter((r) => r.status === 'IN_PROCUREMENT').length
  const fulfilledCount = requisitions.filter((r) => r.status === 'FULFILLED').length

  const statusBadgeClass = (status: string) => {
    if (status === 'FULFILLED') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
    if (status === 'IN_PROCUREMENT') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
    if (status === 'SUBMITTED') return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
    if (status === 'DRAFT') return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    if (status === 'REJECTED') return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
    return 'bg-slate-100 text-slate-700'
  }

  const statusLabel = (status: string) => {
    if (status === 'IN_PROCUREMENT') return 'In Procurement'
    if (status === 'FULFILLED') return 'Fulfilled'
    return status.charAt(0) + status.slice(1).toLowerCase()
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
              Electrician Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2">
            <Zap className="w-7 h-7 text-yellow-500 shrink-0" />
            Electrician Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Electrical requisitions, site work logs & active project sites
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing} className="text-xs gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shadow-sm text-xs gap-1.5">
            <Link href="/electrician/requisition/new">
              <PlusCircle className="w-4 h-4" />
              New Requisition
            </Link>
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Sites</span>
            <FolderKanban className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-foreground">{projects.length}</div>
          <p className="text-xs text-muted-foreground">Projects assigned</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">{submittedCount}</div>
          <p className="text-xs text-muted-foreground">Awaiting procurement</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">In Procurement</span>
            <ClipboardList className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{inProcurementCount}</div>
          <p className="text-xs text-muted-foreground">Being purchased</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 border-emerald-500/20 bg-emerald-500/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Fulfilled</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{fulfilledCount}</div>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/electrician/requisition/new" className="rounded-xl border bg-card hover:bg-muted/30 transition p-5 flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center shrink-0">
            <PlusCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground group-hover:text-yellow-700 dark:group-hover:text-yellow-400 transition">New Electrical Requisition</div>
            <div className="text-xs text-muted-foreground">Request materials from procurement</div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link href="/electrician/site-work" className="rounded-xl border bg-card hover:bg-muted/30 transition p-5 flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-400 transition">Log Site Work</div>
            <div className="text-xs text-muted-foreground">Record electrical work done on site</div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link href="/electrician/projects" className="rounded-xl border bg-card hover:bg-muted/30 transition p-5 flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <HardHat className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground group-hover:text-slate-700 dark:group-hover:text-slate-400 transition">Project Sites</div>
            <div className="text-xs text-muted-foreground">View all active construction sites</div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ── Recent Requisitions ── */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Recent Requisitions</h2>
                <p className="text-xs text-muted-foreground">Your electrical material requests</p>
              </div>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                <Link href="/electrician/requisition/new">
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  New
                </Link>
              </Button>
            </div>
            {requisitions.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium">No requisitions yet</p>
                <p className="text-xs text-muted-foreground">Create your first electrical material requisition</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {requisitions.slice(0, 6).map((req) => (
                  <div key={req.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-semibold text-foreground truncate">{req.requisitionNo}</div>
                      <div className="text-xs text-muted-foreground truncate">{req.lead.name}</div>
                      <div className="text-[11px] text-muted-foreground/70">{req.items.length} item{req.items.length !== 1 ? 's' : ''} · {new Date(req.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${statusBadgeClass(req.status)}`}>
                      {statusLabel(req.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Recent Site Work ── */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Recent Site Work</h2>
                <p className="text-xs text-muted-foreground">Electrical work logged on site</p>
              </div>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                <Link href="/electrician/site-work">
                  <Wrench className="w-3.5 h-3.5 mr-1.5" />
                  Log Work
                </Link>
              </Button>
            </div>
            {siteWorkLogs.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Wrench className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium">No work logged yet</p>
                <p className="text-xs text-muted-foreground">Log electrical work completed on site</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {siteWorkLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="px-5 py-3 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-medium text-foreground line-clamp-1">{log.itemsSummary}</div>
                      <div className="text-[11px] text-muted-foreground shrink-0">{new Date(log.deliveryDate).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{log.lead.name}{log.lead.location ? ` · ${log.lead.location}` : ''}</span>
                    </div>
                    {log.notes && <div className="text-[11px] text-muted-foreground/70 italic truncate">{log.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Active Sites Preview ── */}
      {!loading && projects.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Active Project Sites</h2>
              <p className="text-xs text-muted-foreground">Sites where electrical work is ongoing</p>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/electrician/projects">View All</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {projects.slice(0, 6).map((p) => (
              <div key={p.id} className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-foreground leading-snug line-clamp-1">{p.name}</div>
                  <Badge variant="outline" className="text-[10px] shrink-0 font-normal">{p.stage.replace(/_/g, ' ')}</Badge>
                </div>
                {p.location && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{p.location}</span>
                  </div>
                )}
                {p.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{p.phone}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
