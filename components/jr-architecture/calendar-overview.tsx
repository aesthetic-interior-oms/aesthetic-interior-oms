'use client'

import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function JrArchitectureCalendarOverview() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)

    const gridStart = new Date(monthStart)
    gridStart.setDate(gridStart.getDate() - gridStart.getDay())

    const gridEnd = new Date(monthEnd)
    gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()))

    const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

    const bucket: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      bucket.push(days.slice(i, i + 7))
    }

    return bucket
  }, [currentDate])

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="JR Architecture Calendar"
        subtitle="Leader-only monthly planning overview."
      />

      <main className="mx-auto max-w-[1440px] space-y-4 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-foreground">{format(currentDate, 'MMMM yyyy')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="rounded-lg border border-border bg-card p-2 hover:bg-accent"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="rounded-lg border border-border bg-card p-2 hover:bg-accent"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {dayLabels.map((label) => (
              <div key={label} className="p-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                {label}
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b border-border last:border-b-0">
              {week.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`min-h-28 border-r border-border p-3 last:border-r-0 ${
                    isSameMonth(day, currentDate) ? 'bg-background' : 'bg-muted/20 text-muted-foreground'
                  }`}
                >
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-semibold ${
                      isToday(day) ? 'bg-primary text-primary-foreground' : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
