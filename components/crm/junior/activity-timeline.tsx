'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  UserPlus,
  Phone,
  CalendarCheck,
  ArrowRight,
  StickyNote,
  CheckCircle2,
} from "lucide-react"

const actionConfig: Record<
  string,
  { icon: typeof UserPlus; color: string; bg: string }
> = {
  "Lead Created": {
    icon: UserPlus,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  "Followup Completed": {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
  },
  "Visit Completed": {
    icon: CalendarCheck,
    color: "text-chart-2",
    bg: "bg-chart-2/10",
  },
  "Status Changed": {
    icon: ArrowRight,
    color: "text-chart-3",
    bg: "bg-chart-3/10",
  },
  "Note Added": {
    icon: StickyNote,
    color: "text-chart-4",
    bg: "bg-chart-4/10",
  },
  "Visit Scheduled": {
    icon: Phone,
    color: "text-chart-5",
    bg: "bg-chart-5/10",
  },
  "Call Made": {
    icon: Phone,
    color: "text-chart-5",
    bg: "bg-chart-5/10",
  },
  "Followup Set": {
    icon: CalendarCheck,
    color: "text-chart-2",
    bg: "bg-chart-2/10",
  },
  "User Assigned": {
    icon: UserPlus,
    color: "text-primary",
    bg: "bg-primary/10",
  },
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMins < 5) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays === 1) return "Yesterday"
  return `${diffDays}d ago`
}

export function ActivityTimeline() {
  const [activities, setActivities] = useState<
    Array<{
      id: string
      userName: string
      leadName: string
      action: string
      description: string
      createdAt: string
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTimeline = useCallback(async (nextOffset: number, append: boolean) => {
    if (!append) setLoading(true)
    if (append) setLoadingMore(true)
    try {
      const res = await fetch(`/api/jr/dashboard/activity-log?limit=20&offset=${nextOffset}`)
      const payload = await res.json()
      if (!res.ok || !payload?.success || !Array.isArray(payload.data)) {
        throw new Error(payload?.error || 'Failed to load activity timeline.')
      }

      const nextItems = payload.data as typeof activities
      setActivities((prev) => (append ? [...prev, ...nextItems] : nextItems))
      setOffset(
        typeof payload?.pagination?.nextOffset === 'number'
          ? payload.pagination.nextOffset
          : nextOffset + nextItems.length,
      )
      setHasMore(Boolean(payload?.pagination?.hasMore))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity timeline.')
      if (!append) setActivities([])
    } finally {
      if (!append) setLoading(false)
      if (append) setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    fetchTimeline(0, false)
  }, [fetchTimeline])

  const sortedTimeline = useMemo(
    () =>
      [...activities].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [activities]
  )

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base text-card-foreground">Activity Timeline</CardTitle>
        <Button variant="outline" size="sm" disabled={loading || loadingMore} onClick={() => fetchTimeline(0, false)}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading activity...</p>
        ) : null}
        {!loading && error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        {!loading && !error ? (
          <div className="relative flex flex-col gap-0">
            {sortedTimeline.map((activity, index) => {
              const config = actionConfig[activity.action] || {
                icon: UserPlus,
                color: "text-muted-foreground",
                bg: "bg-muted",
              }
              const Icon = config.icon
              const isLast = index === sortedTimeline.length - 1

              return (
                <div key={activity.id} className="relative flex gap-3 pb-6 last:pb-0">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-4 top-9 h-[calc(100%-12px)] w-px bg-border" />
                  )}

                  {/* Icon */}
                  <div
                    className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${config.bg}`}
                  >
                    <Icon className={`size-4 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-card-foreground leading-tight">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {activity.description}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatTime(activity.createdAt)}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                          {getInitials(activity.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {activity.userName}
                      </span>
                      <span className="text-xs text-muted-foreground">{"/"}</span>
                      <span className="text-xs text-primary font-medium truncate">
                        {activity.leadName}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            {hasMore ? (
              <div className="mt-2 flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingMore}
                  onClick={() => fetchTimeline(offset, true)}
                >
                  {loadingMore ? 'Loading...' : 'Show More'}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
