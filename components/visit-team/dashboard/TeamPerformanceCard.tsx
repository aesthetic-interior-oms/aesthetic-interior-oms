"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTeamMembers } from "@/lib/dashboardData"
import { Star } from "lucide-react"

export function TeamPerformanceCard() {
  const teamMembers = getTeamMembers()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-card-foreground">Team Performance</CardTitle>
        <p className="text-xs text-muted-foreground">Output, quality, and utilization by member</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Team Member</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Completed</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Scheduled</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Rating</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 font-medium text-card-foreground">{member.name}</td>
                  <td className="px-3 py-2 text-right text-card-foreground">{member.visitsCompleted}</td>
                  <td className="px-3 py-2 text-right text-card-foreground">{member.visitsScheduled}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1 text-card-foreground">
                      <span>{member.averageRating.toFixed(1)}</span>
                      <Star className="size-3.5 fill-chart-4 text-chart-4" />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{member.utilization}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
