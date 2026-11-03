'use client'

import { ReviewCenterView } from '@/app/crm/sr/review-center/view'

export default function SpecialistPartialReviewCenterPage() {
  return (
    <ReviewCenterView
      title="Partial Review Center"
      subtitle="Review completed CAD submissions for partial leads before client meeting or quotation."
      myLeadsOnly={true}
      leadBasePath="/visit-team/partial-visits"
      mode="partial"
    />
  )
}
