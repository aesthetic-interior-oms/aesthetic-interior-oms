'use client'

import { generateActivityLogs } from '@/lib/dashboardData'
import { motion } from 'framer-motion'
import { CheckCircle, Clock, XCircle, AlertCircle, UserPlus } from 'lucide-react'

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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="rounded-lg border border-border bg-card p-6"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Activity Log</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-start gap-4 p-3 rounded-lg border border-border/50 ${getActivityColor(activity.action)}`}
          >
            <div className="flex-shrink-0 pt-0.5">{getActivityIcon(activity.action)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-foreground">{activity.action.replace(/_/g, ' ')}</p>
                <span className="text-xs text-muted-foreground">
                  {activity.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-1">by {activity.performedBy}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
