'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  HardHat,
  Calculator,
  Truck,
  Zap,
  ArrowRight,
  Loader2,
  Users,
  CheckCircle2,
  Sparkles,
  ClipboardList,
  FileText,
  PlusCircle,
  FolderKanban,
  ExternalLink,
  ShieldAlert,
  Wallet,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'

type ExecutionDept = {
  key: string
  name: string
  reportingHead: 'PROJECT_COORDINATOR' | 'BOQ_TEAM_LEADER' | 'ACCOUNTS'
  assignmentDepartment?: string
  description: string
  primaryRoute: string
  activeStaffCount: number
}

type ProductionHead = {
  key: 'PROJECT_COORDINATOR' | 'BOQ_TEAM_LEADER' | 'ACCOUNTS'
  title: string
  scope: string
  activeCount: number
  reportingDepartments: ExecutionDept[]
}

type ProductionData = {
  heads: ProductionHead[]
  allExecutionDepartments: ExecutionDept[]
  userCanManage: boolean
}

export default function ProductionModulePage() {
  const [data, setData] = useState<ProductionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [promoteLeadId, setPromoteLeadId] = useState('')
  const [promoteNote, setPromoteNote] = useState('')
  const [promoting, setPromoteLoading] = useState(false)

  const fetchProductionHierarchy = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/production/departments', { cache: 'no-store' })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      } else {
        toast.error(json.error ?? 'Failed to load production data')
      }
    } catch (err) {
      toast.error('Network error loading production module.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchProductionHierarchy()
  }, [])

  const handlePromoteLead = async () => {
    if (!promoteLeadId.trim()) {
      toast.error('Please enter a Lead ID.')
      return
    }

    setPromoteLoading(true)
    try {
      const res = await fetch('/api/production/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: promoteLeadId.trim(),
          note: promoteNote.trim() || undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(result.error ?? 'Promotion failed')
      }
      toast.success(result.data?.message ?? 'Lead successfully promoted to Production Level!')
      setPromoteOpen(false)
      setPromoteLeadId('')
      setPromoteNote('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to promote lead')
    } finally {
      setPromoteLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CrmPageHeader
        title="Production Module"
        subtitle="Post-Agreement execution governed jointly by Project Coordinator & BOQ Team Leader."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9">
              <Link href="/production/projects">
                <FolderKanban className="h-4 w-4" />
                Active Projects &amp; Hub
              </Link>
            </Button>
            {data?.userCanManage && (
              <Button
                onClick={() => setPromoteOpen(true)}
                className="gap-2 bg-primary text-primary-foreground text-xs h-9"
              >
                <Sparkles className="h-4 w-4" />
                Promote Lead to Production
              </Button>
            )}
            <Button variant="outline" asChild className="text-xs h-9">
              <Link href="/crm/boq/agreement-leads">
                <FileText className="h-4 w-4 mr-1.5" />
                Agreement Leads
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-8 flex-1 w-full max-w-7xl mx-auto">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Top-Level Governance Banner */}
            <div className="rounded-xl border bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-amber-500/10 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-background text-xs font-semibold px-2.5 py-0.5">
                      Production Governance Architecture
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">v2.0 Post-Agreement</span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight mt-2 text-foreground">
                    Initial Entry-Point Roles & Controlled Downstream Delegation
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
                    Once a Lead reaches Agreement status, it transitions directly into the Production phase.
                    Initial visibility and routing is exposed immediately to three entry points:
                    <strong> Accounts</strong>, <strong>BOQ Team Leader</strong>, and <strong>Project Coordinator</strong>.
                    Downstream execution roles (BOQ members, Site Engineers) receive access after intake and assignment by these leaders.
                  </p>
                </div>
              </div>
            </div>

            {/* Top-Level Entry-Point Roles */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                Initial Entry-Point Roles (Production Gatekeepers)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Accounts Card */}
                <Card className="border-emerald-500/30 bg-card hover:border-emerald-500/50 transition-colors shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs">
                        Entry-Point: Finance
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold mt-3">Accounts</CardTitle>
                    <CardDescription className="text-xs">
                      Handles advance payment clearance, token money, financial gating, and vendor accounts payable.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1.5">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Active Accounts Staff:</span>
                        <span className="font-semibold text-foreground">
                          {data?.heads.find((h) => h.key === 'ACCOUNTS')?.activeCount ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Intake Scope:</span>
                        <span className="font-semibold text-foreground">Advance & Token Money</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Quick Workspaces
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" asChild className="text-xs h-8">
                          <Link href="/crm/accounts/projects">
                            <ClipboardList className="h-3.5 w-3.5 mr-1" />
                            Accounts Projects
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="text-xs h-8">
                          <Link href="/crm/accounts/token-money">
                            <Wallet className="h-3.5 w-3.5 mr-1" />
                            Token Money
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="text-xs h-8">
                          <Link href="/crm/admin/finance">
                            Finance Dashboard
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* BOQ Team Leader Card */}
                <Card className="border-amber-500/30 bg-card hover:border-amber-500/50 transition-colors shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <Calculator className="h-5 w-5" />
                      </div>
                      <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs">
                        Entry-Point: Estimation
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold mt-3">BOQ Team Leader</CardTitle>
                    <CardDescription className="text-xs">
                      Governs bill of quantities, costing breakdown, rate approvals, and downstream member assignment.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1.5">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Active Team Leaders:</span>
                        <span className="font-semibold text-foreground">
                          {data?.heads.find((h) => h.key === 'BOQ_TEAM_LEADER')?.activeCount ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Mapped Execution Sub-Departments:</span>
                        <span className="font-semibold text-foreground">
                          {data?.heads.find((h) => h.key === 'BOQ_TEAM_LEADER')?.reportingDepartments.length ?? 0}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Quick Workspaces
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" asChild className="text-xs h-8">
                          <Link href="/crm/boq/agreement-leads">
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Agreement Leads
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="text-xs h-8">
                          <Link href="/crm/boq/assigned-task">
                            <Calculator className="h-3.5 w-3.5 mr-1" />
                            BOQ Tasks
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="text-xs h-8">
                          <Link href="/crm/boq/settings">
                            Rate Settings
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Project Coordinator Card */}
                <Card className="border-blue-500/30 bg-card hover:border-blue-500/50 transition-colors shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <HardHat className="h-5 w-5" />
                      </div>
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs">
                        Entry-Point: Execution
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold mt-3">Project Coordinator (PC)</CardTitle>
                    <CardDescription className="text-xs">
                      Governs on-site execution, milestone management, and downstream Site Engineer assignment.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1.5">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Active Coordinators:</span>
                        <span className="font-semibold text-foreground">
                          {data?.heads.find((h) => h.key === 'PROJECT_COORDINATOR')?.activeCount ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Mapped Execution Sub-Departments:</span>
                        <span className="font-semibold text-foreground">
                          {data?.heads.find((h) => h.key === 'PROJECT_COORDINATOR')?.reportingDepartments.length ?? 0}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Quick Workspaces
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" asChild className="text-xs h-8">
                          <Link href="/crm/pc/projects">
                            <ClipboardList className="h-3.5 w-3.5 mr-1" />
                            PC Active Projects
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="text-xs h-8">
                          <Link href="/site-engineer/projects">
                            <HardHat className="h-3.5 w-3.5 mr-1" />
                            Site Engineering
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="text-xs h-8">
                          <Link href="/procurement/projects">
                            <Truck className="h-3.5 w-3.5 mr-1" />
                            Procurement
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Sub-Departments Operating in Production */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Mapped Execution Departments Under Production Heads
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Execution teams assigned to deliver post-agreement milestones.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data?.allExecutionDepartments.map((dept) => {
                  const isUnderPc = dept.reportingHead === 'PROJECT_COORDINATOR'
                  return (
                    <Card key={dept.key} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className={
                              isUnderPc
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px]'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px]'
                            }
                          >
                            Under {isUnderPc ? 'Project Coordinator' : 'BOQ Team Leader'}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {dept.activeStaffCount} staff
                          </span>
                        </div>
                        <CardTitle className="text-sm font-bold mt-2">{dept.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {dept.description}
                        </p>
                        <Button size="sm" variant="ghost" asChild className="w-full justify-between text-xs h-8 px-2">
                          <Link href={dept.primaryRoute}>
                            <span>Open Workspace</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Extensible Future Department Slot */}
                <Card className="border-dashed border-2 flex flex-col justify-center items-center p-6 text-center bg-muted/20">
                  <PlusCircle className="h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p className="text-xs font-semibold text-foreground">Extensible Architecture</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Missing execution teams (e.g. Joinery, QA/QC, Installation) can be dynamically registered under PC or BOQ Leader.
                  </p>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Manual Promotion Dialog */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Promote Lead to Production Level
            </DialogTitle>
            <DialogDescription className="text-xs">
              Induct an agreement lead into active Production. The system will automatically ensure Project Coordinator and BOQ Team oversight assignments are generated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Lead ID</label>
              <Input
                placeholder="Enter lead ID (e.g. cly...)"
                value={promoteLeadId}
                onChange={(e) => setPromoteLeadId(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Promotion / Handoff Note (Optional)</label>
              <Input
                placeholder="e.g. Client signed fitout agreement, start site prep"
                value={promoteNote}
                onChange={(e) => setPromoteNote(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPromoteOpen(false)}
              disabled={promoting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handlePromoteLead}
              disabled={promoting}
              className="text-xs"
            >
              {promoting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
              Confirm Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
