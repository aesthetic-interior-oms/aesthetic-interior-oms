'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

type VisitStatusDatum = {
  name: string
  value: number
  fill: string
}

const chartConfig: ChartConfig = {
  Completed: { label: 'Completed', color: 'var(--color-chart-2)' },
  Rescheduled: { label: 'Rescheduled', color: 'var(--color-chart-3)' },
  Cancelled: { label: 'Cancelled', color: 'var(--color-destructive)' },
  Pending: { label: 'Pending', color: 'var(--color-chart-1)' },
}

export function VisitStatusChart({ data }: { data: VisitStatusDatum[] }) {
  return (
    <>
      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
          <YAxis className="text-xs" tickLine={false} axisLine={false} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap gap-3">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
          </div>
        ))}
      </div>
    </>
  )
}
