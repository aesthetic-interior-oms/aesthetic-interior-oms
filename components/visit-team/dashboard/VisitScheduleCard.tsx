'use client'

import { generateDummyVisits } from '@/lib/dashboardData'
import { motion } from 'framer-motion'
import { MapPin, Clock, User } from 'lucide-react'

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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="rounded-lg border border-border bg-card p-6"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Upcoming Visits (7 Days)</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {visits.map((visit, index) => (
          <motion.div
            key={visit.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start gap-4 p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground truncate">{visit.leadName}</h4>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(visit.status)}`}>
                  {visit.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{visit.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {visit.scheduledAt.toLocaleDateString()} at{' '}
                    {visit.scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span>{visit.teamMember}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
