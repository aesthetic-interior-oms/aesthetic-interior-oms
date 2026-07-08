'use client'

import { VisitsPageView } from '@/app/crm/jr/visits/page'

export default function JrArchitectureVisitsPage() {
  return (
    <VisitsPageView
      pageTitle="Visits"
      pageSubtitle="Review all scheduled site visits for JR Architect leadership follow-up."
      leadHrefPrefix="/crm/jr-architecture/leads"
      restrictToCreator={false}
      visitScope="all"
      allowManageAssignment={false}
      showScheduleButton={false}
      showSummaryDashboard
      cardNavigatesToLead
    />
  )
}
