'use client'


import { ActivityLogCard } from '@/components/visit-team/dashboard/ActivityLogCard'
import { KpiMetrics } from '@/components/visit-team/dashboard/KpiMetrics'
import { TeamPerformanceCard } from '@/components/visit-team/dashboard/TeamPerformanceCard'
import { TeamWorkflowCard } from '@/components/visit-team/dashboard/TeamWorkflowCard'
import { VisitChart } from '@/components/visit-team/dashboard/VisitChart'
import { VisitScheduleCard } from '@/components/visit-team/dashboard/VisitScheduleCard'
import { generateMetrics } from '@/lib/dashboardData'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarDays, Users } from 'lucide-react'

export default function DashboardPage() {
  const metrics = generateMetrics()
  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Visit Team Dashboard</h1>
            <p className="text-sm text-muted-foreground">Live coordination board for visits, workflow, and team output.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {today}
            </span>
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 py-6">
        <div className="flex flex-col gap-6">
          <KpiMetrics metrics={metrics} />

          <section>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="workflow">Workflow</TabsTrigger>
                <TabsTrigger value="team">Team Performance</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <VisitChart />
              </TabsContent>

              <TabsContent value="workflow" className="mt-4">
                <TeamWorkflowCard />
              </TabsContent>

              <TabsContent value="team" className="mt-4">
                <TeamPerformanceCard />
              </TabsContent>
            </Tabs>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <VisitScheduleCard />
            </div>
            <div className="lg:col-span-1">
              <ActivityLogCard />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
