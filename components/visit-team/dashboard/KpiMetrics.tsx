'use client'

import { DashboardMetrics } from '@/lib/dashboardData'
import { Motion } from 'react-motion'
import { motion } from 'framer-motion'
import { TrendingUp, Clock, AlertCircle, Users } from 'lucide-react'

interface KpiMetricsProps {
  metrics: DashboardMetrics
}

export function KpiMetrics({ metrics }: KpiMetricsProps) {
  const cards = [
    {
      label: 'Visits Scheduled',
      value: metrics.totalVisitsScheduled,
      icon: Clock,
      color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Completed Today',
      value: metrics.visitsCompletedToday,
      icon: TrendingUp,
      color: 'bg-green-500/20 text-green-600 dark:text-green-400',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Pending Reschedule',
      value: metrics.pendingReschedule,
      icon: AlertCircle,
      color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      label: 'Team Utilization',
      value: `${metrics.teamUtilization}%`,
      icon: Users,
      color: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {typeof card.value === 'number' ? (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                      {card.value}
                    </motion.span>
                  ) : (
                    card.value
                  )}
                </p>
              </div>
              <div className={`rounded-lg p-3 ${card.color}`}>
                <Icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
