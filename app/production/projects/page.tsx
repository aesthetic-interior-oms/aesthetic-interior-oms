import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { normalizeDepartmentName } from '@/lib/department-normalization'
import {
  Building2, MapPin, Package, ArrowRight,
  CheckCircle2, Clock, AlertCircle, Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export const runtime = 'nodejs'
export const revalidate = 0

const PRODUCTION_STAGE_SET = new Set([
  'PROJECT_SETUP', 'MATERIAL_PLANNING', 'PROCUREMENT',
  'SITE_EXECUTION', 'QUALITY_CHECK', 'HANDOVER', 'CONVERSION',
])

function stageBadge(stage: string) {
  const label = stage.replace(/_/g, ' ')
  if (['SITE_EXECUTION', 'QUALITY_CHECK'].includes(stage))
    return { label, cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' }
  if (stage === 'MATERIAL_PLANNING' || stage === 'PROCUREMENT')
    return { label, cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' }
  if (stage === 'HANDOVER')
    return { label, cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' }
  return { label, cls: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' }
}

export default async function ProductionProjectsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      userDepartments: { select: { department: { select: { name: true } } } },
      userRoles: { select: { role: { select: { name: true } } } },
    },
  })
  if (!dbUser) redirect('/onboarding')

  const deptNames = dbUser.userDepartments
    .map((r) => normalizeDepartmentName(r.department.name))
    .filter((d): d is string => Boolean(d))
  const roleNames = dbUser.userRoles.map((r) => r.role.name.trim().toUpperCase().replace(/\s+/g, '_'))

  const isAdmin = deptNames.includes('ADMIN') || roleNames.includes('ADMIN')
  const isPC = deptNames.includes('PROJECT_COORDINATOR') || deptNames.includes('PROJECT_CORDINATOR') || roleNames.includes('PROJECT_COORDINATOR')
  const isAccounts = deptNames.includes('ACCOUNTS') || deptNames.includes('FINANCE')
  const isBOQLeader = roleNames.includes('BOQ_TEAM_LEADER')
  const isBOQMember = roleNames.includes('BOQ_TEAM_MEMBER')
  const isProcurement = roleNames.includes('PROCUREMENT_TEAM_LEADER') || roleNames.includes('PROCUREMENT_TEAM_MEMBER') || deptNames.includes('PROCUREMENT')
  const isSiteEngineer = deptNames.includes('SITE_ENGINEER')

  // Build where clause based on role
  // All production roles see ALL production projects (filtered by assignment for non-leads)
  const whereBase: Record<string, unknown> = {
    stage: { in: Array.from(PRODUCTION_STAGE_SET) },
  }

  // Site engineers and BOQ members see only their assigned projects
  if (!isAdmin && !isPC && !isAccounts && !isBOQLeader && !isProcurement) {
    whereBase.assignments = {
      some: { userId: dbUser.id },
    }
  }

  const leads = await prisma.lead.findMany({
    where: whereBase,
    orderBy: { updated_at: 'desc' },
    take: 50,
    include: {
      assignments: {
        select: {
          department: true,
          user: { select: { fullName: true } },
        },
      },
      materialRequisitions: {
        select: {
          id: true,
          status: true,
          requisitionNo: true,
          indents: {
            select: {
              id: true,
              indentNo: true,
              purchaseOrder: { select: { status: true, poNo: true } },
            },
          },
        },
      },
      _count: {
        select: { siteDeliveryLogs: true },
      },
    },
  })

  // Stats
  const total = leads.length
  const inExecution = leads.filter((l) => l.stage === 'SITE_EXECUTION').length
  const pendingPOs = leads.reduce((sum, l) => {
    return sum + l.materialRequisitions.flatMap((r) => r.indents).filter((i) => i.purchaseOrder?.status === 'PENDING_ACCOUNTS_APPROVAL').length
  }, 0)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600 shrink-0" />
            Production Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All active projects in production — your role determines available actions
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Projects</span>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-foreground">{total}</div>
          <p className="text-xs text-muted-foreground">In production pipeline</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On Site</span>
            <Truck className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{inExecution}</div>
          <p className="text-xs text-muted-foreground">In site execution</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">POs Pending Approval</span>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingPOs}</div>
          <p className="text-xs text-muted-foreground">Awaiting Accounts review</p>
        </div>
      </div>

      {/* Projects Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b">
          <h2 className="text-base font-semibold">Projects</h2>
          <p className="text-xs text-muted-foreground">Click a project to open the Production Hub</p>
        </div>

        {leads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-sm font-semibold">No production projects yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Projects appear here once they move into the production phase after client agreement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase font-medium text-muted-foreground border-b">
                <tr>
                  <th className="px-5 py-3.5">Client / Project</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Stage</th>
                  <th className="px-5 py-3.5">Requisitions</th>
                  <th className="px-5 py-3.5">PO Status</th>
                  <th className="px-5 py-3.5">Team</th>
                  <th className="px-5 py-3.5 text-right">Hub</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead) => {
                  const badge = stageBadge(lead.stage)
                  const allIndents = lead.materialRequisitions.flatMap((r) => r.indents)
                  const pendingPOCount = allIndents.filter((i) => i.purchaseOrder?.status === 'PENDING_ACCOUNTS_APPROVAL').length
                  const approvedPOCount = allIndents.filter((i) => i.purchaseOrder?.status === 'APPROVED').length
                  const noPOCount = allIndents.filter((i) => !i.purchaseOrder).length

                  const boqAssignees = lead.assignments.filter((a) => a.department === 'BOQ').map((a) => a.user.fullName)
                  const pcAssignees = lead.assignments.filter((a) => a.department === 'PROJECT_COORDINATOR').map((a) => a.user.fullName)
                  const teamPreview = [...new Set([...boqAssignees, ...pcAssignees])].slice(0, 2).join(', ')

                  return (
                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground">{lead.name}</div>
                        {lead.agreementValue && (
                          <div className="text-xs text-muted-foreground">৳{lead.agreementValue.toLocaleString()}</div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {lead.location && <><MapPin className="w-3 h-3 shrink-0" />{lead.location}</>}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-xs">
                        <span className="font-semibold">{lead.materialRequisitions.length}</span>
                        <span className="text-muted-foreground"> req · </span>
                        <span className="font-semibold">{allIndents.length}</span>
                        <span className="text-muted-foreground"> indent{allIndents.length !== 1 ? 's' : ''}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {pendingPOCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <Clock className="w-3 h-3" />{pendingPOCount} pending
                            </span>
                          )}
                          {approvedPOCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />{approvedPOCount} approved
                            </span>
                          )}
                          {noPOCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                              {noPOCount} no PO
                            </span>
                          )}
                          {allIndents.length === 0 && (
                            <span className="text-xs text-muted-foreground">No indents yet</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {teamPreview || <span className="italic">Not assigned</span>}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
                          <Link href={`/production/projects/${lead.id}`}>
                            Open Hub
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
