import Link from 'next/link'
import { startOfMonth } from 'date-fns'
import { LeadStage, LeadSubStatus } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CommandCenterCharts } from './command-center-charts'

const commandActions = [
  { label: 'Leads', href: '/crm/admin/leads' },
  { label: 'Visits', href: '/crm/admin/visits' },
  { label: 'Visit Queue', href: '/crm/admin/queue' },
  { label: 'Meeting Queue', href: '/crm/admin/meeting-queue' },
  { label: 'Budget Queue', href: '/crm/admin/budget-queue' },
  { label: 'Design Queue', href: '/crm/admin/design-queue' },
  { label: 'Review Center', href: '/crm/admin/review-center' },
  { label: 'Senior Tasks', href: '/crm/admin/today-tasks' },
  { label: 'CAD Queue', href: '/crm/admin/cad-phase-queue' },
  { label: 'Senior Calendar', href: '/crm/admin/calendar' },
  { label: 'Settings', href: '/crm/admin/settings' },
  { label: 'WhatsApp Monitor', href: '/crm/admin/whatsapp-monitor' },
]

export default async function AdminCommandCenterPage() {
  const now = new Date()
  const monthStart = startOfMonth(now)

  const [stageCounts, totalLeads, unassignedLeads, activeCad, activeQuotation, budgetReady] = await Promise.all([
    prisma.lead.groupBy({
      by: ['stage'],
      where: { createdAt: { gte: monthStart } },
      _count: { stage: true },
      orderBy: { _count: { stage: 'desc' } },
    }),
    prisma.lead.count(),
    prisma.lead.count({ where: { assignedTo: null } }),
    prisma.lead.count({ where: { stage: LeadStage.CAD_PHASE } }),
    prisma.lead.count({ where: { stage: LeadStage.QUOTATION_PHASE } }),
    prisma.lead.count({
      where: {
        OR: [
          { stage: LeadStage.BUDGET_PHASE },
          { stage: LeadStage.QUOTATION_PHASE, subStatus: LeadSubStatus.QUOTATION_APPROVED },
        ],
      },
    }),
  ])

  const data = stageCounts.map((row) => ({ stage: row.stage, count: row._count.stage }))
  const totalThisMonth = data.reduce((sum, item) => sum + item.count, 0)
  const topStages = data.slice(0, 5)

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Command Center</h1>
          <p className="text-muted-foreground">A single center to operate queues, monitor stages, and take fast action across all admin pages.</p>
        </div>
        <Button asChild>
          <Link href="/crm/admin/dashboard">Open Dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm">Total Leads</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{totalLeads}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Unassigned Leads</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{unassignedLeads}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Active CAD</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{activeCad}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Budget-ready</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{budgetReady}</CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Action Center (All Admin Pages)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {commandActions.map((action) => (
              <Button key={action.href} asChild variant="outline" className="justify-start">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span>CAD Phase</span><span className="font-semibold">{activeCad}</span></div>
            <div className="flex items-center justify-between"><span>Quotation Phase</span><span className="font-semibold">{activeQuotation}</span></div>
            <div className="flex items-center justify-between"><span>Budget Pipeline</span><span className="font-semibold">{budgetReady}</span></div>
            <div className="pt-2 text-xs text-muted-foreground">Use the Action Center links above for quickest navigation by work-type.</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>This Month Lead Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{totalThisMonth}</p>
          <p className="text-sm text-muted-foreground">Total leads created since {monthStart.toLocaleDateString()}.</p>
        </CardContent>
      </Card>

      <CommandCenterCharts data={data} />

      <Card>
        <CardHeader>
          <CardTitle>Top Stages This Month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topStages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads found for this month yet.</p>
          ) : (
            topStages.map((item) => (
              <div key={item.stage} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>{item.stage.replaceAll('_', ' ')}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
