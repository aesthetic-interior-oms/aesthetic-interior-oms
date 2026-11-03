'use client'

import { ReviewCenterView } from '@/app/crm/sr/review-center/view'

export default function AdminPartialReviewCenterPage() {
  return (
    <ReviewCenterView
      title="Partial Review Center (Admin)"
      subtitle="Review CAD submissions for all partial projects across the organization."
      myLeadsOnly={false}
      leadBasePath="/visit-team/partial-visits"
      showSrCrmFilter
      mode="partial"
    />
  )
}
