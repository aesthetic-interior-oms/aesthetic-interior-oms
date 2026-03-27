'use client'

import { motion } from 'framer-motion'
import { generateDummyVisits } from '@/lib/dashboardData'
import { ArrowRight } from 'lucide-react'

export function TeamWorkflowCard() {
  const visits = generateDummyVisits()

  const workflowStats = {
    created: visits.filter((v) => v.status === 'SCHEDULED').length + visits.filter((v) => v.status === 'PENDING_RESCHEDULE').length,
    assigned: visits.filter((v) => v.status === 'SCHEDULED').length,
    completed: visits.filter((v) => v.status === 'COMPLETED').length,
    cancelled: visits.filter((v) => v.status === 'CANCELLED').length,
  }

  const workflowStages = [
    { label: 'Created', count: workflowStats.created, color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
    { label: 'Assigned', count: workflowStats.assigned, color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400' },
    { label: 'Completed', count: workflowStats.completed, color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
    { label: 'Cancelled', count: workflowStats.cancelled, color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="rounded-lg border border-border bg-card p-6 lg:col-span-2"
    >
      <h3 className="text-lg font-semibold text-foreground mb-6">Visit Workflow</h3>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {workflowStages.map((stage, index) => (
          <div key={index} className="flex items-center gap-4 flex-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-lg p-4 ${stage.color} flex-1 text-center min-w-32`}
            >
              <p className="text-sm font-medium">{stage.label}</p>
              <p className="mt-2 text-2xl font-bold">{stage.count}</p>
            </motion.div>

            {index < workflowStages.length - 1 && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: index * 0.1 + 0.05 }}
                className="hidden md:flex items-center justify-center"
              >
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </motion.div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 rounded-lg bg-muted text-center">
          <p className="text-xs text-muted-foreground mb-1">Completion Rate</p>
          <p className="text-xl font-bold text-foreground">
            {Math.round((workflowStats.completed / (visits.length - workflowStats.cancelled)) * 100)}%
          </p>
        </div>
        <div className="p-3 rounded-lg bg-muted text-center">
          <p className="text-xs text-muted-foreground mb-1">Pending</p>
          <p className="text-xl font-bold text-foreground">{workflowStats.assigned}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted text-center">
          <p className="text-xs text-muted-foreground mb-1">Today Completed</p>
          <p className="text-xl font-bold text-foreground">
            {visits.filter((v) => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const visitDate = new Date(v.scheduledAt)
              visitDate.setHours(0, 0, 0, 0)
              return visitDate.getTime() === today.getTime() && v.status === 'COMPLETED'
            }).length}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-muted text-center">
          <p className="text-xs text-muted-foreground mb-1">Cancelled</p>
          <p className="text-xl font-bold text-foreground">{workflowStats.cancelled}</p>
        </div>
      </div>
    </motion.div>
  )
}
