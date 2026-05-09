'use client'

import { ReviewCenterView } from '@/app/crm/sr/review-center/page'

export default function AdminReviewCenterPage() {
  return (
    <ReviewCenterView
      title="Review Center (Admin)"
      subtitle="Review all Senior CRM CAD submissions across the organization."
      myLeadsOnly={false}
      leadBasePath="/crm/admin/leads"
    />
  )
}
