'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
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

  useEffect(() => {
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

  return (
    <div className="flex flex-col min-h-screen">
      <CrmPageHeader
        title="My Projects"
        subtitle="Projects assigned to you for coordination."
      />
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8 w-full flex-1">
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
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <p>Loading projects...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : projects.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-48 text-center text-muted-foreground"
                      >
                        No projects assigned to you yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => (
                      <TableRow
                        key={project.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() =>
                          router.push(`/crm/pc/projects/${project.id}`)
                        }
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
                          <div
                            className="max-w-[150px] truncate"
                            title={project.location ?? 'N/A'}
                          >
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
                          <Badge
                            variant={stageBadgeVariant(project.stage)}
                            className="font-normal"
                          >
                            {project.stage.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
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
                            className="text-xs text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View →
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
