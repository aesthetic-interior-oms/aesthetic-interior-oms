import { LeadAssignmentDepartment, LeadStage, LeadSubStatus } from '@/generated/prisma/client'

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
  return (
    isQuotationAdmin(actorDepartments) ||
    isQuotationDepartment(actorDepartments) ||
    actorDepartments.includes('ACCOUNTS') ||
    actorDepartments.includes('PROJECT_COORDINATOR') ||
    actorDepartments.includes('PROJECT_CORDINATOR')
  )
}

export function canEditQuotationDraft(input: {
  actorDepartments: string[]
  actorUserId: string
  leadSubStatus: LeadSubStatus | null
  assignedQuotationUserId: string | null
  leadStage?: LeadStage | null
}): boolean {
  // Quotation editing is locked once the lead reaches CONVERSION stage
  if (input.leadStage === LeadStage.CONVERSION) {
    return false
  }

  if (
    isQuotationAdmin(input.actorDepartments) ||
    input.actorDepartments.includes('PROJECT_COORDINATOR') ||
    input.actorDepartments.includes('PROJECT_CORDINATOR')
  )
    return true

  if (!isQuotationDepartment(input.actorDepartments)) return false
  if (!input.assignedQuotationUserId) return false

  // Once assigned to a lead, quotation team member can edit until CONVERSION stage without needing reassignment
  return input.assignedQuotationUserId === input.actorUserId
}

export function buildQuotationLeadWhere(input: {
  leadId: string
  actorUserId: string
  actorDepartments: string[]
}) {
  const isAdminOrSrOrAccountsOrPc =
    isQuotationAdmin(input.actorDepartments) ||
    input.actorDepartments.includes('ACCOUNTS') ||
    input.actorDepartments.includes('PROJECT_COORDINATOR') ||
    input.actorDepartments.includes('PROJECT_CORDINATOR')
  const isQuotation = isQuotationDepartment(input.actorDepartments)

  if (!isAdminOrSrOrAccountsOrPc && !isQuotation) {
    return null
  }

  return {
    id: input.leadId,
    ...(isAdminOrSrOrAccountsOrPc
      ? {}
      : {
          assignments: {
            some: {
              department: LeadAssignmentDepartment.QUOTATION,
              userId: input.actorUserId,
            },
          },
        }),
  }
}
