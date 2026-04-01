'use client'

import { VisitsPageView } from '@/app/crm/jr/visits/page'

export default function AdminVisitsPage() {
  return (
    <VisitsPageView
      leadHrefPrefix="/crm/admin/leads"
      restrictToCreator={false}
    />
  )
}
