import { VisitQueueCalendar } from '@/components/crm/shared/visit-queue-calendar'

export default function SdcPartialVisitQueuePage() {
  return (
    <VisitQueueCalendar
      title="Partial Visit Queue"
      subtitle="Calendar view of scheduled partial visits and completed partial visits awaiting JR Architect assignment."
      leadHrefPrefix="/visit-team/partial-visits"
      visitScope="all"
      mode="partial"
    />
  )
}
