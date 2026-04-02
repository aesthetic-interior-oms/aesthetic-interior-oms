"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateDummyVisits } from "@/lib/dashboardData"
import { Clock, MapPin, User } from "lucide-react"

export function VisitScheduleCard() {
  const visits = generateDummyVisits().sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()).slice(0, 7)

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-700 dark:text-green-400'
      case 'PENDING_RESCHEDULE':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-700 dark:text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-card-foreground">Visit Schedule</CardTitle>
        <p className="text-xs text-muted-foreground">Upcoming site visits</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {visits.map((visit) => (
            <div
              key={visit.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="truncate text-sm font-medium text-card-foreground">{visit.leadName}</h4>
                  <Badge variant="outline" className={`text-[10px] ${getStatusBadgeColor(visit.status)}`}>
                    {visit.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {visit.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {visit.scheduledAt.toLocaleDateString()}{" "}
                    {visit.scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="size-3" />
                  {visit.teamMember}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
