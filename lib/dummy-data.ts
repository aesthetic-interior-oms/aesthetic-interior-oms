// ==============================
// CRM Dummy Data Based on Entities
// ==============================

// Lead statuses
export type LeadStatus = "NEW" | "CONTACTED" | "FOLLOWUP" | "VISIT_SCHEDULED" | "REJECTED" | "CONVERTED"

export type Lead = {
  id: number
  name: string
  phone: string
  email: string
  location: string
  projectType: string
  projectSize: string
  source: "facebook" | "manual" | "referral" | "website" | "instagram"
  status: LeadStatus
  assignedTo: string
  createdAt: string
}

export type Followup = {
  id: number
  leadId: number
  leadName: string
  assignedTo: string
  followupDate: string
  followupType: "call" | "meeting" | "email"
  note: string
  status: "pending" | "done" | "missed"
}

export type Visit = {
  id: number
  leadId: number
  leadName: string
  location: string
  scheduledDate: string
  startTime: string
  endTime: string
  assignedTeamMember: string
  visitStatus: "Scheduled" | "Completed" | "Cancelled" | "Rescheduled"
}

export type ActivityLog = {
  id: number
  userId: number
  userName: string
  leadId: number
  leadName: string
  action: string
  description: string
  createdAt: string
}

// ==============================
// Recent Leads (Block 2)
// ==============================
export const recentLeads: Lead[] = []

// ==============================
// Today's Followups (Block 3)
// ==============================
export const todayFollowups: Followup[] = []

// ==============================
// Visit Schedule (Block 4)
// ==============================
export const visitSchedule: Visit[] = []

// ==============================
// Activity Timeline (Block 5)
// ==============================
export const activityTimeline: ActivityLog[] = []

// ==============================
// Performance Metrics Data (Charts)
// ==============================

// Lead Handling Metrics - Monthly trend
export const monthlyLeadData: { month: string, totalLeads: number, contacted: number, pending: number }[] = []

// Follow-Up Discipline - Weekly
export const followupDisciplineData: { week: string, onTime: number, overdue: number, missed: number }[] = []

// Conversion Funnel
export const conversionFunnelData: { stage: string, value: number }[] = []

// Visit Management
export const visitManagementData: { month: string, scheduled: number, completed: number, cancelled: number, rescheduled: number }[] = []

// Lead Source Distribution
export const leadSourceData: { source: string, count: number, fill: string }[] = []

// Contact Rate & Conversion Rate trend
export const ratesTrendData: { month: string, contactRate: number, visitConversion: number, qualifiedRate: number }[] = []

// KPI Summary Numbers
export const kpiSummary = {
  totalLeadsAssigned: 0,
  newLeadsPending: 0,
  firstContactTimeAvg: "0 hrs",
  contactRate: 0,
  followupsDueToday: 0,
  followupsCompletedOnTime: 0,
  overdueFollowups: 0,
  visitConversionRate: 0,
  rejectionRate: 0,
  qualifiedLeadRate: 0,
  visitsScheduled: 0,
  visitShowUpRate: 0,
}
