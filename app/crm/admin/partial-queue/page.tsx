import { VisitQueueCalendar } from '@/components/crm/shared/visit-queue-calendar'

export default function AdminPartialVisitQueuePage() {
  return (
    <VisitQueueCalendar
      title="Partial Visit Queue (Admin)"
      subtitle="Calendar view of scheduled partial visits and completed partial visits awaiting JR Architect assignment."
      leadHrefPrefix="/visit-team/partial-visits"
      visitScope="all"
      mode="partial"
    />
  )
}
