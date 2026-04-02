import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Star,
  TrendingUp,
  Users,
  UserCheck,
} from "lucide-react"
import { DashboardMetrics, generateDummyVisits, getTeamMembers } from "@/lib/dashboardData"

interface KpiMetricsProps {
  metrics: DashboardMetrics
}

export function KpiMetrics({ metrics }: KpiMetricsProps) {
  const visits = generateDummyVisits()
  const teamMembers = getTeamMembers()
  const completed = visits.filter((visit) => visit.status === "COMPLETED").length
  const cancelled = visits.filter((visit) => visit.status === "CANCELLED").length
  const completionRate = visits.length > 0 ? Math.round((completed / visits.length) * 100) : 0
  const averageRating =
    teamMembers.length > 0
      ? (
          teamMembers.reduce((sum, member) => sum + member.averageRating, 0) /
          teamMembers.length
        ).toFixed(1)
      : "0.0"

  const topCards = [
    {
      title: "Visits Scheduled",
      value: metrics.totalVisitsScheduled.toString(),
      subtitle: `${cancelled} cancelled`,
      icon: Calendar,
      trend: `${completionRate}% completion`,
    },
    {
      title: "Completed Today",
      value: metrics.visitsCompletedToday.toString(),
      subtitle: `${metrics.pendingReschedule} needs reschedule`,
      icon: CheckCircle,
      trend: `${metrics.visitsCompletedToday} done today`,
    },
    {
      title: "Pending Reschedule",
      value: metrics.pendingReschedule.toString(),
      subtitle: `${visits.length - completed - cancelled} still active`,
      icon: AlertTriangle,
      trend: "Needs follow-up",
    },
    {
      title: "Team Utilization",
      value: `${metrics.teamUtilization}%`,
      subtitle: `${teamMembers.length} members`,
      icon: TrendingUp,
      trend: "Current capacity",
    },
  ]

  const secondaryCards = [
    {
      title: "Completion Rate",
      value: `${completionRate}%`,
      icon: UserCheck,
    },
    {
      title: "Cancelled Visits",
      value: cancelled.toString(),
      icon: Clock,
    },
    {
      title: "Avg Team Rating",
      value: averageRating,
      icon: Star,
    },
    {
      title: "Active Members",
      value: teamMembers.length.toString(),
      icon: Users,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight text-card-foreground">
                  {card.value}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs font-medium text-success">{card.trend}</span>
                  <span className="text-xs text-muted-foreground">{card.subtitle}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {secondaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="py-3">
              <CardContent className="flex items-center gap-3 px-4 py-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                  <p className="text-lg font-semibold text-card-foreground">{card.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
