'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  FolderKanban,
  MapPin,
  Phone,
  Search,
  RefreshCw,
  Loader2,
  PlusCircle,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type ProjectSite = {
  id: string
  name: string
  location: string | null
  phone: string | null
  stage: string
  subStatus: string | null
  budget: number | null
  created_at: string
}

export default function ElectricianProjectsPage() {
  const [projects, setProjects] = useState<ProjectSite[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('ALL')

  const fetchProjects = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/electrician/projects')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load projects')
      setProjects(json.data.projects || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error loading projects')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.location && p.location.toLowerCase().includes(search.toLowerCase())) ||
      (p.phone && p.phone.includes(search))
    const matchesStage = stageFilter === 'ALL' || p.stage === stageFilter
    return matchesSearch && matchesStage
  })

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/electrician/dashboard" className="hover:text-foreground">Electrician</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Projects Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-yellow-500 shrink-0" />
            Project Sites
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Active client sites for electrical work</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchProjects} disabled={refreshing} className="text-xs gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild size="sm" className="text-xs gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
            <Link href="/electrician/requisition/new">
              <PlusCircle className="w-4 h-4" />
              New Requisition
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by project name, address, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {(['ALL', 'CONVERSION', 'SITE_EXECUTION', 'QUALITY_CHECK', 'HANDOVER'] as const).map((stage) => (
            <Button
              key={stage}
              variant={stageFilter === stage ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-8"
              onClick={() => setStageFilter(stage)}
            >
              {stage === 'ALL' ? `All Sites (${projects.length})` : stage.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading project sites...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-16 text-center space-y-2 border rounded-xl bg-card">
          <FolderKanban className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-semibold">No project sites found</h3>
          <p className="text-xs text-muted-foreground">No projects matched your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <Card key={p.id} className="border-border hover:shadow-md transition bg-card flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold leading-snug line-clamp-1">{p.name}</CardTitle>
                  <Badge variant="outline" className="text-[10px] shrink-0 font-normal">{p.stage.replace(/_/g, ' ')}</Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{p.location || 'Location not specified'}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {p.phone && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{p.phone}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border/50">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1 text-yellow-700 dark:text-yellow-300 w-full"
                  >
                    <Link href={`/electrician/requisition/new?leadId=${p.id}`}>
                      <Zap className="w-3.5 h-3.5" />
                      Create Electrical Requisition
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
