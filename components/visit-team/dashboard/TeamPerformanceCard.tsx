'use client'

import { getTeamMembers } from '@/lib/dashboardData'
import { motion } from 'framer-motion'
import { Star, TrendingUp } from 'lucide-react'

export function TeamPerformanceCard() {
  const teamMembers = getTeamMembers()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="rounded-lg border border-border bg-card p-6 lg:col-span-2"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Team Performance</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Team Member</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground text-sm">Completed</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground text-sm">Scheduled</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground text-sm">Rating</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground text-sm">Utilization</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member, index) => (
              <motion.tr
                key={member.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <td className="py-3 px-4 text-sm font-medium text-foreground">{member.name}</td>
                <td className="py-3 px-4 text-sm text-right">
                  <span className="inline-flex items-center justify-center rounded-full bg-green-500/20 text-green-700 dark:text-green-400 px-2.5 py-1 font-medium">
                    {member.visitsCompleted}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2.5 py-1 font-medium">
                    {member.visitsScheduled}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-medium text-foreground">{member.averageRating.toFixed(1)}</span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${member.utilization}%` }}
                        transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      />
                    </div>
                    <span className="font-medium text-muted-foreground text-xs w-8 text-right">{member.utilization}%</span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
