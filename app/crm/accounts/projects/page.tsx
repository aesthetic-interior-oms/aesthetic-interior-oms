'use client'

import { useEffect, useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
  srCrmName: string
}

export default function AccountsProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  const [ledgerProject, setLedgerProject] = useState<ProjectData | null>(null)
  const [projectReport, setProjectReport] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const openLedger = async (project: ProjectData) => {
    setLedgerProject(project)
    setReportLoading(true)
    setProjectReport(null)
    try {
      const res = await fetch(`/api/finance/reports?mode=project&leadId=${project.id}`)
      const data = await res.json()
      if (data.success) {
        setProjectReport(data)
      } else {
        toast.error('Failed to load ledger data')
      }
    } catch (e: any) {
      toast.error('Error fetching ledger data')
      console.error(e)
    } finally {
      setReportLoading(false)
    }
  }

  const formatCategory = (cat: string) => {
    const CATEGORY_LABELS: Record<string, string> = {
      CLIENT_DEPOSIT: "Client Deposit",
      MATERIAL_COST: "Material Cost",
      LABOR_COST: "Labor Cost",
      CONVEYANCE: "Conveyance",
      OFFICE_EXPENSE: "Office Expense",
      MISC: "Miscellaneous",
      FEE_COLLECTION: "Fee Collection",
    }
    return CATEGORY_LABELS[cat] || cat
  }

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
          prev.map((p) =>
            p.id === projectId ? { ...p, accountStatus: newStatus } : p
          )
        )
      } else {
        toast.error(data.error || 'Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col gap-4 p-4 md:gap-8 md:p-8">
      <CrmPageHeader
        title="Projects"
        subtitle="Overview of all confirmed projects and their financial status."
      />
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
                      <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                        No projects found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => openLedger(project)}
                            className="text-primary hover:underline font-semibold text-left"
                          >
                            {project.name}
                          </button>
                        </TableCell>
                        <TableCell>{project.location || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {project.agreementType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{project.srCrmName}</TableCell>
                        <TableCell>
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
                <Card key={project.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          <button
                            onClick={() => openLedger(project)}
                            className="text-primary hover:underline font-semibold text-left"
                          >
                            {project.name}
                          </button>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {project.location || 'No location'}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-normal text-xs whitespace-nowrap">
                        {project.agreementType.replace('_', ' ')}
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
                    
                    <div className="mt-auto space-y-2 rounded-md bg-muted/50 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Value</span>
                        <span className="font-medium tabular-nums">৳{project.agreementValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">৳{project.paid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="font-medium">Due</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">৳{project.due.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ledger Modal */}
      <Dialog open={!!ledgerProject} onOpenChange={(open) => !open && setLedgerProject(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Expenses Ledger Allocation</DialogTitle>
            <DialogDescription>
              Ledger details for <span className="font-semibold text-foreground">{ledgerProject?.name}</span>
            </DialogDescription>
          </DialogHeader>

          {reportLoading ? (
            <div className="flex h-48 flex-col items-center justify-center space-y-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Loading ledger details...</p>
            </div>
          ) : projectReport ? (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <div className="text-xs text-muted-foreground">Total Budget</div>
                  <div className="text-xl font-bold mt-1">
                    {projectReport.project?.budget ? `${projectReport.project.budget.toLocaleString()} BDT` : "Not Defined"}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <div className="text-xs text-muted-foreground">Total Site Expense Logged</div>
                  <div className="text-xl font-bold mt-1 text-rose-500">
                    {((Object.values(projectReport.categoryTotals || {}) as number[]) || []).reduce((a: number, b: number) => a + b, 0).toLocaleString()} BDT
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <div className="text-xs text-muted-foreground">Profit margin estimation</div>
                  <div className="text-xl font-bold mt-1 text-emerald-500">
                    {projectReport.project?.budget
                      ? `${(projectReport.project.budget - ((Object.values(projectReport.categoryTotals || {}) as number[]) || []).reduce((a: number, b: number) => a + b, 0)).toLocaleString()} BDT`
                      : "N/A"}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-md font-bold">Category-wise Spending Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(projectReport.categoryTotals || {}).map(([cat, val]: any) => (
                    <div key={cat} className="p-3 border border-border rounded-lg bg-card flex flex-col justify-between">
                      <span className="text-xs text-muted-foreground font-medium">{formatCategory(cat)}</span>
                      <span className="text-md font-bold mt-1">{val.toLocaleString()} BDT</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-md font-bold">Raw Logs for this Site</h3>
                <div className="border border-border rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Particulars</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {projectReport.transactions?.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-muted/10">
                          <td className="p-3 text-xs">
                            {new Date(tx.date).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-xs">{formatCategory(tx.category)}</td>
                          <td className="p-3">{tx.particular}</td>
                          <td className="p-3 text-right font-bold text-rose-500">
                            {tx.amount.toLocaleString()} BDT
                          </td>
                        </tr>
                      ))}
                      {(!projectReport.transactions || projectReport.transactions.length === 0) && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted-foreground">
                            No logs found for this project.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Failed to load ledger data.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
