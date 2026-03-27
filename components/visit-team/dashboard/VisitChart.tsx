'use client'

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getVisitTrendData, getVisitStatusData, getTeamWorkloadData } from '@/lib/dashboardData'
import { motion } from 'framer-motion'

export function VisitChart() {
  const trendData = getVisitTrendData()
  const statusData = getVisitStatusData()
  const workloadData = getTeamWorkloadData()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Visit Trend */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-lg border border-border bg-card p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Visit Trend (Weekly)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
              }}
              cursor={{ fill: 'rgba(0,0,0,0.1)' }}
            />
            <Legend />
            <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            <Line type="monotone" dataKey="scheduled" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
            <Line type="monotone" dataKey="cancelled" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Visit Status Pie */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="rounded-lg border border-border bg-card p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Visit Status Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Team Workload */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="rounded-lg border border-border bg-card p-6 lg:col-span-2"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Team Workload Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={workloadData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
              }}
              cursor={{ fill: 'rgba(0,0,0,0.1)' }}
            />
            <Legend />
            <Bar dataKey="completed" stackId="a" fill="#10b981" />
            <Bar dataKey="visits" stackId="a" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}
