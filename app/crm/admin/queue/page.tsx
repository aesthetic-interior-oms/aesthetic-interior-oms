import { VisitQueueCalendar } from '@/components/crm/shared/visit-queue-calendar'

export default function AdminVisitCompleteQueuePage() {
  return (
    <VisitQueueCalendar
      title="Visit Queue Calendar (Admin)"
      subtitle="Calendar view of scheduled visits (observe) and completed visits awaiting JR Architect assignment."
      leadHrefPrefix="/crm/admin/leads"
      visitScope="all"
    />
  )
}
