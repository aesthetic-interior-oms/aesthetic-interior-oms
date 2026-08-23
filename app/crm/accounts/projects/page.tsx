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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { LayoutGrid, Loader2, TableIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type ProjectData = {
  id: string
  name: string
  location: string | null
  agreementType: string
  agreementValue: number
  accountStatus: string | null
  paid: number
  due: number
  totalOutflow: number
  profitMargin: number
  srCrmName: string
}

export default function AccountsProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/accounts/projects', { cache: 'no-store' })
      const data = await response.json()
      if (data.success) {
        setProjects(data.data)
      } else {
        toast.error(data.error || 'Failed to fetch projects')
      }
    } catch {
      toast.error('Failed to load projects data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchProjects()
  }, [])

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    setUpdatingId(projectId)
    try {
      const response = await fetch(`/api/accounts/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Account status updated')
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, accountStatus: newStatus } : p))
        )
      } else {
        toast.error(data.error || 'Failed to update status')
      }
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CrmPageHeader
        title="Projects"
        subtitle="Overview of all confirmed projects and their financial status."
      />
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8 w-full max-w-7xl mx-auto flex-1">
        <div className="flex items-center space-x-2 rounded-md border p-1 w-fit">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8"
          >
            <TableIcon className="mr-2 h-4 w-4" />
            Table
          </Button>
          <Button
            variant={viewMode === 'card' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('card')}
            className="h-8"
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Grid
          </Button>
        </div>

      {viewMode === 'table' ? (
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Agreement Value</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="text-right">Total Outflow</TableHead>
                    <TableHead className="text-right">Profit Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <p>Loading projects...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-48 text-center text-muted-foreground">
                        No projects found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => (
                      <TableRow
                        key={project.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => router.push(`/crm/accounts/projects/${project.id}`)}
                      >
                        <TableCell className="font-medium">
                          <Link
                            href={`/crm/accounts/projects/${project.id}`}
                            className="text-primary hover:underline font-semibold"
                          >
                            {project.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div
                            className="max-w-[150px] truncate"
                            title={project.location || 'N/A'}
                          >
                            {project.location || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {project.agreementType.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{project.srCrmName}</TableCell>
                        <TableCell>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Select
                              disabled={updatingId === project.id}
                              value={project.accountStatus || 'PENDING'}
                              onValueChange={(value) => handleStatusChange(project.id, value)}
                            >
                              <SelectTrigger className="h-8 w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="PROCESSING">Processing</SelectItem>
                                <SelectItem value="PARTIAL_PAID">Partial Paid</SelectItem>
                                <SelectItem value="FULL_PAID">Full Paid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ৳{project.agreementValue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          ৳{project.paid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                          ৳{project.due.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-rose-500">
                          ৳{project.totalOutflow.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${project.profitMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          ৳{project.profitMargin.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-48 flex-col items-center justify-center space-y-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              No projects found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-8">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="flex flex-col hover:shadow-md transition-shadow cursor-pointer hover:bg-muted/40"
                  onClick={() => router.push(`/crm/accounts/projects/${project.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          <Link
                            href={`/crm/accounts/projects/${project.id}`}
                            className="text-primary hover:underline font-semibold"
                          >
                            {project.name}
                          </Link>
                        </CardTitle>
                        <p
                          className="text-sm text-muted-foreground mt-1 truncate max-w-[200px]"
                          title={project.location || 'No location'}
                        >
                          {project.location || 'No location'}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-normal text-xs whitespace-nowrap">
                        {project.agreementType.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 flex-1">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sr. CRM</span>
                        <span className="font-medium">{project.srCrmName}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Select
                            disabled={updatingId === project.id}
                            value={project.accountStatus || 'PENDING'}
                            onValueChange={(value) => handleStatusChange(project.id, value)}
                          >
                            <SelectTrigger className="h-7 w-[120px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="PROCESSING">Processing</SelectItem>
                              <SelectItem value="PARTIAL_PAID">Partial Paid</SelectItem>
                              <SelectItem value="FULL_PAID">Full Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto space-y-2 rounded-md bg-muted/50 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Value</span>
                        <span className="font-medium tabular-nums">৳{project.agreementValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">৳{project.paid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due</span>
                        <span className="font-medium text-rose-600 dark:text-rose-400 tabular-nums">৳{project.due.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="text-muted-foreground">Total Outflow</span>
                        <span className="font-medium text-rose-500 tabular-nums">৳{project.totalOutflow.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="font-medium">{project.profitMargin >= 0 ? 'Profit' : 'Loss'}</span>
                        <span className={`font-bold tabular-nums ${project.profitMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          ৳{project.profitMargin.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Payment progress bar */}
                    {(() => {
                      const pct = project.agreementValue > 0
                        ? Math.min(100, Math.round((project.paid / project.agreementValue) * 100))
                        : 0
                      return (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Payment Progress</span>
                            <span className={`font-bold ${pct === 100 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                              {pct}%
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct === 100
                                  ? 'bg-emerald-500'
                                  : pct >= 50
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })()}

                    <Link
                      href={`/crm/accounts/projects/${project.id}`}
                      className="w-full text-center text-xs text-primary hover:underline py-1"
                    >
                      View Ledger →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
