'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, LayoutGrid, List, MapPin, User, ArrowRight } from 'lucide-react'
import { toast } from '@/components/ui/sonner'

type ProjectItem = {
  id: string
  name: string
  location: string | null
  agreementType: string | null
  agreementValue: number
  stage: string
  subStatus: string | null
  srCrmName: string
  draftCount: number
  latestDraftGrandTotal: number
  createdAt: string
}

function stageBadgeVariant(
  stage: string,
): 'default' | 'secondary' | 'outline' {
  if (stage === 'CLOSED') return 'secondary'
  if (stage === 'CONVERSION') return 'default'
  return 'outline'
}

export default function PCProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  useEffect(() => {
    const saved = localStorage.getItem('pc_projects_view_mode')
    if (saved === 'card' || saved === 'table') {
      setViewMode(saved)
    }

    fetch('/api/pc/projects', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { success: boolean; data?: ProjectItem[]; error?: string }) => {
        if (data.success && data.data) {
          setProjects(data.data)
        } else {
          toast.error(data.error ?? 'Failed to load projects')
        }
      })
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false))
  }, [])

  const handleViewModeChange = (mode: 'table' | 'card') => {
    setViewMode(mode)
    localStorage.setItem('pc_projects_view_mode', mode)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CrmPageHeader
        title="My Projects"
        subtitle="Projects assigned to you for coordination."
      />
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8 w-full flex-1">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Assigned Projects ({projects.length})
          </h2>
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
            <Button
              type="button"
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1.5"
              onClick={() => handleViewModeChange('table')}
            >
              <List className="h-3.5 w-3.5" />
              <span>Table</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1.5"
              onClick={() => handleViewModeChange('card')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Card</span>
            </Button>
          </div>
        </div>
        {loading ? (
          <Card className="flex-1 border sm:shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Loading projects...</p>
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card className="flex-1 border sm:shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <p>No projects assigned to you yet.</p>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <Card className="flex-1 overflow-hidden border-0 bg-transparent shadow-none sm:border sm:bg-card sm:shadow-sm">
            <CardContent className="p-0 sm:p-6">
              <div className="rounded-md sm:border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Agreement Type</TableHead>
                      <TableHead>Sr. CRM</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Agreement Value</TableHead>
                      <TableHead className="text-right">Quotation Value</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow
                        key={project.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => router.push(`/crm/pc/projects/${project.id}`)}
                      >
                        <TableCell className="font-medium">
                          <Link
                            href={`/crm/pc/projects/${project.id}`}
                            className="text-primary hover:underline font-semibold"
                          >
                            {project.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] truncate" title={project.location ?? 'N/A'}>
                            {project.location ?? 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {(project.agreementType ?? 'N/A').replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{project.srCrmName}</TableCell>
                        <TableCell>
                          <Badge variant={stageBadgeVariant(project.stage)} className="font-normal">
                            {project.stage.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          ৳{project.agreementValue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {project.draftCount > 0
                            ? `৳${project.latestDraftGrandTotal.toLocaleString()}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/crm/pc/projects/${project.id}`}
                            className="text-xs text-primary hover:underline font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View →
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group relative flex flex-col justify-between overflow-hidden border transition-all duration-200 hover:border-primary/50 hover:shadow-md cursor-pointer"
                onClick={() => router.push(`/crm/pc/projects/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <p className="flex items-center text-xs text-muted-foreground gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                        <span className="truncate">{project.location ?? 'No location provided'}</span>
                      </p>
                    </div>
                    <Badge variant={stageBadgeVariant(project.stage)} className="shrink-0 font-normal">
                      {project.stage.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-2 text-xs border-y py-3 bg-muted/20 px-3 rounded-md">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Agreement Value</span>
                      <span className="font-bold text-sm text-foreground">৳{project.agreementValue.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Quotation Value</span>
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {project.draftCount > 0 ? `৳${project.latestDraftGrandTotal.toLocaleString()}` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate">Sr. CRM: <strong className="text-foreground">{project.srCrmName}</strong></span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                      {(project.agreementType ?? 'N/A').replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors justify-between"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/crm/pc/projects/${project.id}`)
                      }}
                    >
                      <span>Open Project Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
