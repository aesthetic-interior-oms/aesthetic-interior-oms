"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { getTeamWorkloadData, getVisitStatusData, getVisitTrendData } from "@/lib/dashboardData"

const visitTrendConfig: ChartConfig = {
  completed: { label: "Completed", color: "var(--color-chart-2)" },
  scheduled: { label: "Scheduled", color: "var(--color-chart-1)" },
  cancelled: { label: "Cancelled", color: "var(--color-destructive)" },
}

const visitStatusConfig: ChartConfig = {
  Completed: { label: "Completed", color: "var(--color-chart-2)" },
  Scheduled: { label: "Scheduled", color: "var(--color-chart-1)" },
  Pending: { label: "Pending", color: "var(--color-chart-3)" },
  Cancelled: { label: "Cancelled", color: "var(--color-destructive)" },
}

const workloadConfig: ChartConfig = {
  completed: { label: "Completed", color: "var(--color-chart-2)" },
  visits: { label: "Scheduled", color: "var(--color-chart-1)" },
}

function VisitTrendChart() {
  const trendData = getVisitTrendData()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-card-foreground">Visit Trend</CardTitle>
        <p className="text-xs text-muted-foreground">Weekly completed vs scheduled visits</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={visitTrendConfig} className="h-[260px] w-full">
          <AreaChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="day" className="text-xs" tickLine={false} axisLine={false} />
            <YAxis className="text-xs" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="scheduled"
              stroke="var(--color-chart-1)"
              fill="var(--color-chart-1)"
              fillOpacity={0.1}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="var(--color-chart-2)"
              fill="var(--color-chart-2)"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function VisitStatusChart() {
  const statusData = getVisitStatusData()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-card-foreground">Visit Status</CardTitle>
        <p className="text-xs text-muted-foreground">Distribution by current status</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={visitStatusConfig} className="mx-auto h-[260px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={statusData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              strokeWidth={2}
              stroke="var(--color-card)"
            >
              {statusData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {statusData.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
              <span className="text-xs text-muted-foreground">
                {item.name} ({item.value})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TeamWorkloadChart() {
  const workloadData = getTeamWorkloadData()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-card-foreground">Team Workload</CardTitle>
        <p className="text-xs text-muted-foreground">Scheduled and completed visits by member</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={workloadConfig} className="h-[260px] w-full">
          <BarChart data={workloadData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
            <YAxis className="text-xs" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="completed" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="visits" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function VisitChart() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <VisitTrendChart />
      <VisitStatusChart />
      <TeamWorkloadChart />
    </div>
  )
}
