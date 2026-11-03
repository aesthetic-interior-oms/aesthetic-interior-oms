'use client'

import { PartialLeadsView } from '@/components/crm/shared/partial-leads-view'

export default function AdminPartialLeadsPage() {
  return <PartialLeadsView leadBasePath="/crm/admin/leads" role="Admin" />
}
