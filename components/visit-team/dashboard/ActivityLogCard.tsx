"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateActivityLogs } from "@/lib/dashboardData"
import { AlertCircle, CheckCircle, Clock, UserPlus, XCircle } from "lucide-react"

export function ActivityLogCard() {
  const activities = generateActivityLogs()

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'VISIT_COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      case 'ASSIGNED':
        return <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      case 'RESCHEDULED':
        return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'VISIT_COMPLETED':
        return 'bg-green-500/10'
      case 'ASSIGNED':
        return 'bg-blue-500/10'
      case 'RESCHEDULED':
        return 'bg-yellow-500/10'
      case 'CANCELLED':
        return 'bg-red-500/10'
      default:
        return 'bg-gray-500/10'
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-card-foreground">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={`flex items-start gap-3 rounded-lg border border-border p-3 ${getActivityColor(activity.action)}`}
            >
              <div className="shrink-0 pt-0.5">{getActivityIcon(activity.action)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {activity.action.replace(/_/g, " ")}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {activity.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{activity.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">by {activity.performedBy}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
