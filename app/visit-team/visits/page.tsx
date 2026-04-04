'use client'

import { VisitsPageView } from '@/app/crm/jr/visits/page'

export default function VisitTeamVisitsPage() {
  return (
    <VisitsPageView
      leadHrefPrefix="/visit-team/leads"
      restrictToCreator={false}
      allowCompleteVisit
      blurUnassignedVisitDetails
      visitScope="all"
      allowManageAssignment={false}
    />
  )
}
