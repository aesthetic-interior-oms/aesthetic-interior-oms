export interface Visit {
  id: string
  leadName: string
  location: string
  scheduledAt: Date
  status: 'SCHEDULED' | 'COMPLETED' | 'PENDING_RESCHEDULE' | 'CANCELLED'
  teamMember: string
  projectDetails: string
  notes: string
}

export interface ActivityLog {
  id: string
  action: 'VISIT_COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'ASSIGNED'
  description: string
  performedBy: string
  timestamp: Date
  relatedVisit: string
}

export interface TeamMember {
  id: string
  name: string
  visitsCompleted: number
  visitsScheduled: number
  averageRating: number
  utilization: number
}

export interface WorkflowNode {
  id: string
  label: string
  status: string
  count: number
}

export interface DashboardMetrics {
  totalVisitsScheduled: number
  visitsCompletedToday: number
  pendingReschedule: number
  teamUtilization: number
}

// Dummy data generators
const teamMembers = [
  { id: '1', name: 'John Smith', visitsCompleted: 24, visitsScheduled: 28, averageRating: 4.8, utilization: 92 },
  { id: '2', name: 'Sarah Johnson', visitsCompleted: 22, visitsScheduled: 25, averageRating: 4.6, utilization: 88 },
  { id: '3', name: 'Mike Davis', visitsCompleted: 20, visitsScheduled: 24, averageRating: 4.5, utilization: 85 },
  { id: '4', name: 'Emily Chen', visitsCompleted: 26, visitsScheduled: 30, averageRating: 4.9, utilization: 95 },
  { id: '5', name: 'David Wilson', visitsCompleted: 18, visitsScheduled: 22, averageRating: 4.4, utilization: 80 },
]

const locations = [
  '123 Main St, Downtown',
  '456 Oak Ave, Midtown',
  '789 Elm St, Uptown',
  '321 Pine Rd, Suburbs',
  '654 Maple Dr, Downtown',
  '987 Cedar Ln, Waterfront',
]

const projects = [
  'Office Renovation - 5000 sqft',
  'Residential Complex - 8500 sqft',
  'Commercial Space - 3200 sqft',
  'Retail Store - 2100 sqft',
  'Industrial Warehouse - 12000 sqft',
  'Medical Facility - 6800 sqft',
]

const leads = [
  'ABC Corporation',
  'XYZ Development',
  'Tech Innovations Inc',
  'Green Valley Homes',
  'Metro Commercial Group',
  'Future Projects LLC',
  'Summit Construction',
  'Elite Designs Studio',
]

export function generateDummyVisits(): Visit[] {
  const visits: Visit[] = []
  const now = new Date()

  for (let i = 0; i < 15; i++) {
    const daysFromNow = Math.floor(Math.random() * 7)
    const scheduledAt = new Date(now)
    scheduledAt.setDate(scheduledAt.getDate() + daysFromNow)
    scheduledAt.setHours(Math.floor(Math.random() * 16) + 8, 0, 0, 0)

    const statuses: ('SCHEDULED' | 'COMPLETED' | 'PENDING_RESCHEDULE' | 'CANCELLED')[] = [
      'SCHEDULED',
      'COMPLETED',
      'PENDING_RESCHEDULE',
      'CANCELLED',
    ]

    visits.push({
      id: `visit-${i + 1}`,
      leadName: leads[Math.floor(Math.random() * leads.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      scheduledAt,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      teamMember: teamMembers[Math.floor(Math.random() * teamMembers.length)].name,
      projectDetails: projects[Math.floor(Math.random() * projects.length)],
      notes: 'Project discussion and site assessment',
    })
  }

  return visits
}

export function generateActivityLogs(): ActivityLog[] {
  const activities: ActivityLog[] = []
  const actionTypes: ('VISIT_COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'ASSIGNED')[] = [
    'VISIT_COMPLETED',
    'RESCHEDULED',
    'CANCELLED',
    'ASSIGNED',
  ]

  const actionDescriptions = {
    VISIT_COMPLETED: 'Visit completed at',
    RESCHEDULED: 'Visit rescheduled to',
    CANCELLED: 'Visit cancelled at',
    ASSIGNED: 'Visit assigned to',
  }

  const visits = generateDummyVisits()

  for (let i = 0; i < 12; i++) {
    const action = actionTypes[Math.floor(Math.random() * actionTypes.length)]
    const visit = visits[Math.floor(Math.random() * visits.length)]
    const timestamp = new Date()
    timestamp.setHours(timestamp.getHours() - Math.random() * 24)

    activities.push({
      id: `activity-${i + 1}`,
      action,
      description: `${actionDescriptions[action]} ${visit.location}`,
      performedBy: teamMembers[Math.floor(Math.random() * teamMembers.length)].name,
      timestamp,
      relatedVisit: visit.id,
    })
  }

  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

export function generateMetrics(): DashboardMetrics {
  const visits = generateDummyVisits()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayVisits = visits.filter((v) => {
    const visitDate = new Date(v.scheduledAt)
    visitDate.setHours(0, 0, 0, 0)
    return visitDate.getTime() === today.getTime()
  })

  return {
    totalVisitsScheduled: visits.length,
    visitsCompletedToday: todayVisits.filter((v) => v.status === 'COMPLETED').length,
    pendingReschedule: visits.filter((v) => v.status === 'PENDING_RESCHEDULE').length,
    teamUtilization: 89,
  }
}

export function getTeamMembers(): TeamMember[] {
  return teamMembers
}

export function getVisitTrendData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((day) => ({
    day,
    completed: Math.floor(Math.random() * 8) + 3,
    scheduled: Math.floor(Math.random() * 10) + 5,
    cancelled: Math.floor(Math.random() * 3),
  }))
}

export function getVisitStatusData() {
  return [
    { name: 'Completed', value: 45, fill: '#10b981' },
    { name: 'Scheduled', value: 35, fill: '#3b82f6' },
    { name: 'Pending', value: 15, fill: '#f59e0b' },
    { name: 'Cancelled', value: 5, fill: '#ef4444' },
  ]
}

export function getTeamWorkloadData() {
  return teamMembers.map((member) => ({
    name: member.name.split(' ')[0],
    visits: member.visitsScheduled,
    completed: member.visitsCompleted,
  }))
}
