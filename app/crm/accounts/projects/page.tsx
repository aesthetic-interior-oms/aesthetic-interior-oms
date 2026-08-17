'use client'

import { useEffect, useState } from 'react'
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
import { toast } from '@/components/ui/sonner'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type ProjectData = {
  id: string
  name: string
  location: string | null
  agreementType: string
  agreementValue: number
  paid: number
  due: number
  srCrmName: string
}

export default function AccountsProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/accounts/projects', {
          cache: 'no-store',
        })
        const data = await response.json()
        if (data.success) {
          setProjects(data.data)
        } else {
          toast.error(data.error || 'Failed to fetch projects')
        }
      } catch (error) {
        toast.error('Failed to load projects data')
      } finally {
        setLoading(false)
      }
    }
    void fetchProjects()
  }, [])

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col gap-4 p-4 md:gap-8 md:p-8">
      <CrmPageHeader
        title="Projects"
        subtitle="Overview of all confirmed projects and their financial status."
      />

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
                  <TableHead className="text-right">Agreement Value</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <p>Loading projects...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                      No projects found.
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.location || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {project.agreementType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{project.srCrmName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        ৳{project.agreementValue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        ৳{project.paid.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                        ৳{project.due.toLocaleString()}
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
  )
}
