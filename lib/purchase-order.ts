import { normalizeDepartmentName } from '@/lib/department-normalization'
import { hasBoqLeaderRole } from '@/lib/boq-roles'

export const PURCHASE_ORDER_STATUSES = {
  PENDING_ACCOUNTS_APPROVAL: 'Pending Accounts Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  FULFILLED: 'Fulfilled',
} as const

export type PurchaseOrderStatusKey = keyof typeof PURCHASE_ORDER_STATUSES

export function getPOStatusColor(status: string): string {
  switch (status) {
    case 'PENDING_ACCOUNTS_APPROVAL': return 'amber'
    case 'APPROVED': return 'emerald'
    case 'REJECTED': return 'red'
    case 'FULFILLED': return 'blue'
    default: return 'gray'
  }
}

/** Returns true if user is in Accounts or Admin department */
export function isAccountsUser(departments: string[] | null | undefined): boolean {
  const depts = (departments ?? []).map((d) => normalizeDepartmentName(d)).filter(Boolean) as string[]
  return depts.some((d) => d === 'ACCOUNTS' || d === 'ADMIN' || d === 'FINANCE')
}

/** Returns true if user can CREATE a purchase order (Procurement roles) */
export function canCreatePO(roles: string[] | null | undefined, departments: string[] | null | undefined): boolean {
  const normRoles = (roles ?? []).map((r) => r.trim().toUpperCase().replace(/\s+/g, '_'))
  const normDepts = (departments ?? []).map((d) => normalizeDepartmentName(d)).filter(Boolean) as string[]
  return (
    normRoles.includes('PROCUREMENT_TEAM_LEADER') ||
    normRoles.includes('PROCUREMENT_TEAM_MEMBER') ||
    normDepts.includes('PROCUREMENT') ||
    normDepts.includes('ADMIN') ||
    normRoles.includes('ADMIN')
  )
}

/** Returns true if user can APPROVE/REJECT a purchase order (Accounts/Admin) */
export function canApprovePO(roles: string[] | null | undefined, departments: string[] | null | undefined): boolean {
  return isAccountsUser(departments) || (roles ?? []).some((r) => r.trim().toUpperCase() === 'ADMIN')
}

/** Returns true if user can VIEW purchase orders (all production roles) */
export function canViewPO(roles: string[] | null | undefined, departments: string[] | null | undefined): boolean {
  const normRoles = (roles ?? []).map((r) => r.trim().toUpperCase().replace(/\s+/g, '_'))
  const normDepts = (departments ?? []).map((d) => normalizeDepartmentName(d)).filter(Boolean) as string[]
  return (
    canCreatePO(roles, departments) ||
    canApprovePO(roles, departments) ||
    normDepts.includes('PROJECT_COORDINATOR') ||
    normDepts.includes('PROJECT_CORDINATOR') ||
    normDepts.includes('BOQ') ||
    normRoles.includes('BOQ_TEAM_LEADER') ||
    normRoles.includes('BOQ_TEAM_MEMBER') ||
    normRoles.includes('PROJECT_COORDINATOR') ||
    normDepts.includes('SITE_ENGINEER') ||
    normDepts.includes('ADMIN')
  )
}
