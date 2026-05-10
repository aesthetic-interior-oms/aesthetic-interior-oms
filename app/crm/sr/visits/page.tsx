'use client'

import { VisitsPageView } from '@/app/crm/jr/visits/page'

export default function SeniorCrmVisitsPage() {
  return (
    <VisitsPageView
      pageTitle="My Lead Visits"
      pageSubtitle="Calendar and visit details for leads assigned to you in Senior CRM."
      leadHrefPrefix="/crm/sr/leads"
      restrictToCreator={false}
      visitScope="sr-assigned"
      allowManageAssignment={false}
      showScheduleButton={false}
      showSummaryDashboard
      cardNavigatesToLead
    />
  )
}
