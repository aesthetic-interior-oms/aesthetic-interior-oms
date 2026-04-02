"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateDummyVisits } from "@/lib/dashboardData"
import { ArrowRight } from "lucide-react"

export function TeamWorkflowCard() {
  const visits = generateDummyVisits()

  const workflowStats = {
    created: visits.filter((v) => v.status === 'SCHEDULED').length + visits.filter((v) => v.status === 'PENDING_RESCHEDULE').length,
    assigned: visits.filter((v) => v.status === 'SCHEDULED').length,
    completed: visits.filter((v) => v.status === 'COMPLETED').length,
    cancelled: visits.filter((v) => v.status === 'CANCELLED').length,
  }

  const workflowStages = [
    { label: "Created", count: workflowStats.created, color: "bg-primary/10 text-primary border-primary/20" },
    { label: "Assigned", count: workflowStats.assigned, color: "bg-chart-1/10 text-chart-1 border-chart-1/20" },
    { label: "Completed", count: workflowStats.completed, color: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
    { label: "Cancelled", count: workflowStats.cancelled, color: "bg-destructive/10 text-destructive border-destructive/20" },
  ]

  const completionDenominator = visits.length - workflowStats.cancelled
  const completionRate = completionDenominator > 0 ? Math.round((workflowStats.completed / completionDenominator) * 100) : 0
  const todayCompleted = visits.filter((v) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const visitDate = new Date(v.scheduledAt)
    visitDate.setHours(0, 0, 0, 0)
    return visitDate.getTime() === today.getTime() && v.status === "COMPLETED"
  }).length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-card-foreground">Visit Workflow</CardTitle>
        <p className="text-xs text-muted-foreground">Flow from creation to completion</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {workflowStages.map((stage, index) => (
          <div key={index} className="flex items-center gap-4 flex-1">
            <div className={`rounded-md border px-3 py-2 ${stage.color} flex-1 text-center min-w-24`}>
              <p className="text-xs font-medium">{stage.label}</p>
              <p className="mt-1 text-xl font-bold">{stage.count}</p>
            </div>

            {index < workflowStages.length - 1 && (
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border bg-muted/30 p-3 text-center">
          <p className="text-xs text-muted-foreground">Completion Rate</p>
          <p className="text-lg font-semibold text-card-foreground">{completionRate}%</p>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3 text-center">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-lg font-semibold text-card-foreground">{workflowStats.assigned}</p>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3 text-center">
          <p className="text-xs text-muted-foreground">Today Completed</p>
          <p className="text-lg font-semibold text-card-foreground">{todayCompleted}</p>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3 text-center">
          <p className="text-xs text-muted-foreground">Cancelled</p>
          <p className="text-lg font-semibold text-card-foreground">{workflowStats.cancelled}</p>
        </div>
      </div>
      </CardContent>
    </Card>
  )
}
