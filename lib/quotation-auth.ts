import { LeadAssignmentDepartment, LeadStage, LeadSubStatus } from '@/generated/prisma/client'
import { buildScopedLeadWhere } from '@/lib/lead-access'

export const QUOTATION_EDITABLE_SUBSTATUSES = new Set<LeadSubStatus>([
  LeadSubStatus.QUOTATION_WORKING,
  LeadSubStatus.QUOTATION_CORRECTION,
  LeadSubStatus.BUDGET_MEETING_SET,
  LeadSubStatus.QUOTATION_ASSIGNED,
  LeadSubStatus.QUOTATION_COMPLETED,
  LeadSubStatus.QUOTATION_APPROVED,
])

export function isQuotationDepartment(actorDepartments: string[]): boolean {
  return actorDepartments.includes('QUOTATION') || actorDepartments.includes('QUOTATION_TEAM')
}

export function isQuotationAdmin(actorDepartments: string[]): boolean {
  return actorDepartments.includes('ADMIN') || actorDepartments.includes('SR_CRM')
}

export function canAccessQuotationDraft(actorDepartments: string[]): boolean {
  if (!Array.isArray(actorDepartments) || actorDepartments.length === 0) return true
  return (
    isQuotationAdmin(actorDepartments) ||
    isQuotationDepartment(actorDepartments) ||
    actorDepartments.includes('ACCOUNTS') ||
    actorDepartments.includes('PROJECT_COORDINATOR') ||
    actorDepartments.includes('PROJECT_CORDINATOR') ||
    actorDepartments.includes('VISIT_TEAM') ||
    actorDepartments.includes('SPECIALIST_DESIGN_CONSULTANTS') ||
    actorDepartments.includes('JR_CRM') ||
    actorDepartments.includes('JR_ARCHITECT') ||
    actorDepartments.includes('VISUALIZER_3D') ||
    actorDepartments.includes('BOQ') ||
    actorDepartments.includes('PROCUREMENT')
  )
}

export function canEditQuotationDraft(input: {
  actorDepartments: string[]
  actorUserId: string
  leadSubStatus: LeadSubStatus | null
  assignedQuotationUserId: string | null
  leadStage?: LeadStage | null
}): boolean {
  if (
    isQuotationAdmin(input.actorDepartments) ||
    input.actorDepartments.includes('PROJECT_COORDINATOR') ||
    input.actorDepartments.includes('PROJECT_CORDINATOR') ||
    input.actorDepartments.includes('VISIT_TEAM') ||
    input.actorDepartments.includes('SPECIALIST_DESIGN_CONSULTANTS') ||
    input.actorDepartments.includes('JR_CRM') ||
    input.actorDepartments.includes('JR_ARCHITECT') ||
    input.actorDepartments.includes('VISUALIZER_3D')
  ) {
    return true
  }

  if (isQuotationDepartment(input.actorDepartments)) {
    if (!input.assignedQuotationUserId || input.assignedQuotationUserId === input.actorUserId) {
      return true
    }
  }

  return true
}

export function buildQuotationLeadWhere(input: {
  leadId: string
  actorUserId: string
  actorDepartments: string[]
  actorRoles?: string[]
}) {
  const isAdminOrSrOrAccountsOrPc =
    isQuotationAdmin(input.actorDepartments) ||
    input.actorDepartments.includes('ACCOUNTS') ||
    input.actorDepartments.includes('PROJECT_COORDINATOR') ||
    input.actorDepartments.includes('PROJECT_CORDINATOR')

  if (isAdminOrSrOrAccountsOrPc) {
    return { id: input.leadId }
  }

  return buildScopedLeadWhere({
    leadId: input.leadId,
    actorUserId: input.actorUserId,
    actorDepartments: input.actorDepartments,
    actorRoles: input.actorRoles,
  })
}
