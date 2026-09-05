export const queueLinks = {
  cad: '/crm/admin/cad-phase-queue?queueType=cad-phase',
  review: '/crm/admin/review-center',
  visit: '/crm/admin/queue',
  meeting: '/crm/admin/meeting-queue',
  budget: '/crm/admin/budget-queue',
  design: '/crm/admin/design-queue',
}

export type PriorityAction = {
  id: string
  title: string
  label: string
  detail: string
  href: string
  tone: 'critical' | 'warning' | 'info' | 'success'
  time?: Date | null
}

export function formatLabel(value: string | null | undefined): string {
  if (!value) return 'N/A'
  if (value === 'DISCOVERY') return 'Consulting Phase'
  if (value === 'PROPOSAL_SENT') return 'Quotation Sent'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatRelativeTime(value: Date | null | undefined): string {
  if (!value) return 'Needs attention'
  const diffMs = value.getTime() - Date.now()
  const absMs = Math.abs(diffMs)
  const minutes = Math.round(absMs / (1000 * 60))
  const hours = Math.round(absMs / (1000 * 60 * 60))
  const days = Math.round(absMs / (1000 * 60 * 60 * 24))

  if (minutes < 60) return diffMs >= 0 ? `in ${minutes}m` : `${minutes}m overdue`
  if (hours < 24) return diffMs >= 0 ? `in ${hours}h` : `${hours}h overdue`
  return diffMs >= 0 ? `in ${days}d` : `${days}d overdue`
}
