import { LeadAssignmentDepartment, LeadStage } from '@/generated/prisma/client'

/**
 * Production Module Top-Level Heads & Entry Roles
 */
export const PRODUCTION_HEAD_ROLES = {
  PROJECT_COORDINATOR: 'PROJECT_COORDINATOR',
  BOQ_TEAM_LEADER: 'BOQ_TEAM_LEADER',
  ACCOUNTS: 'ACCOUNTS',
} as const

export const PRODUCTION_ENTRY_ROLES = {
  ACCOUNTS: 'ACCOUNTS',
  BOQ_TEAM_LEADER: 'BOQ_TEAM_LEADER',
  PROJECT_COORDINATOR: 'PROJECT_COORDINATOR',
} as const

export type ProductionHeadType = keyof typeof PRODUCTION_HEAD_ROLES
export type ProductionEntryRoleType = keyof typeof PRODUCTION_ENTRY_ROLES

/**
 * Execution Department definition mapped under a Production Head
 */
export interface ExecutionDepartmentDefinition {
  key: string
  name: string
  reportingHead: ProductionHeadType
  assignmentDepartment?: LeadAssignmentDepartment
  description: string
  primaryRoute: string
  iconName?: string
  colorTheme?: string
}

/**
 * Initial registry of execution departments operating within the Production Level.
 * This registry is designed to be easily extensible so future departments
 * (e.g. Joinery, QA/QC, Installation, Civil Works) can be added without schema rewrites.
 */
export const EXECUTION_DEPARTMENTS_REGISTRY: ExecutionDepartmentDefinition[] = [
  // ─── Under BOQ Team Leader ────────────────────────────────────────────────
  {
    key: 'BOQ',
    name: 'BOQ & Estimation',
    reportingHead: 'BOQ_TEAM_LEADER',
    assignmentDepartment: LeadAssignmentDepartment.BOQ,
    description: 'Detailed bill of quantities, cost estimation, rate analysis, and material requisitions.',
    primaryRoute: '/crm/boq/assigned-task',
    iconName: 'Calculator',
    colorTheme: 'amber',
  },

  // ─── Under Project Coordinator ────────────────────────────────────────────
  {
    key: 'SITE_ENGINEER',
    name: 'Site Engineering & Execution',
    reportingHead: 'PROJECT_COORDINATOR',
    assignmentDepartment: LeadAssignmentDepartment.SITE_ENGINEER,
    description: 'Site supervision, daily progress logging, site delivery acceptance, and contractor execution.',
    primaryRoute: '/site-engineer/projects',
    iconName: 'HardHat',
    colorTheme: 'blue',
  },
  {
    key: 'PROCUREMENT',
    name: 'Procurement & Supply Chain',
    reportingHead: 'PROJECT_COORDINATOR',
    assignmentDepartment: LeadAssignmentDepartment.PROCUREMENT,
    description: 'Material sourcing, purchase order management, supplier agreements, and stock delivery.',
    primaryRoute: '/procurement/projects',
    iconName: 'Truck',
    colorTheme: 'emerald',
  },
  {
    key: 'ELECTRICIAN',
    name: 'Electrical & MEP Execution',
    reportingHead: 'PROJECT_COORDINATOR',
    description: 'Electrical layouts, conduit fitting, cable pulling, DB setups, and electrical fixtures installation.',
    primaryRoute: '/electrician',
    iconName: 'Zap',
    colorTheme: 'violet',
  },
]

/**
 * Stages that represent active Post-Agreement Production Level.
 */
export const POST_AGREEMENT_PRODUCTION_STAGES: readonly LeadStage[] = [
  LeadStage.CONVERSION,
  LeadStage.PROJECT_SETUP,
  LeadStage.MATERIAL_PLANNING,
  LeadStage.PROCUREMENT,
  LeadStage.SITE_EXECUTION,
  LeadStage.QUALITY_CHECK,
  LeadStage.HANDOVER,
] as const

const POST_AGREEMENT_SET = new Set<LeadStage>(POST_AGREEMENT_PRODUCTION_STAGES)

/**
 * Check if a stage belongs to the Production Level.
 */
export function isProductionStage(stage: LeadStage | string | null | undefined): boolean {
  if (!stage) return false
  return POST_AGREEMENT_SET.has(stage as LeadStage)
}

/**
 * Check if a lead has reached or is at the Agreement / Production threshold.
 */
export function isLeadAgreementReady(lead: {
  stage?: LeadStage | string | null
  agreementType?: string | null
  agreementValue?: number | null
  initialAgreementValue?: number | null
}): boolean {
  if (!lead) return false
  if (lead.agreementType && lead.agreementType.trim() !== '') return true
  if (lead.stage && isProductionStage(lead.stage as LeadStage)) return true
  if (typeof lead.agreementValue === 'number' && lead.agreementValue > 0) return true
  if (typeof lead.initialAgreementValue === 'number' && lead.initialAgreementValue > 0) return true
  return false
}

/**
 * Check if user holds any Production Entry/Head role (Accounts, BOQ Team Leader, Project Coordinator, or Admin).
 */
export function isProductionHeadUser(input: {
  departments?: string[] | Set<string>
  roles?: string[] | Set<string>
}): boolean {
  const depts = input.departments instanceof Set ? input.departments : new Set(input.departments ?? [])
  const roles = input.roles instanceof Set ? input.roles : new Set((input.roles ?? []).map((r) => r.toUpperCase().replace(/\s+/g, '_')))

  if (depts.has('ADMIN') || roles.has('ADMIN')) return true

  // Accounts
  if (depts.has('ACCOUNTS') || roles.has('ACCOUNTS')) {
    return true
  }

  // Project Coordinator
  if (
    depts.has('PROJECT_COORDINATOR') ||
    depts.has('PROJECT_CORDINATOR') ||
    roles.has('PROJECT_COORDINATOR') ||
    roles.has('PROJECT_CORDINATOR')
  ) {
    return true
  }

  // BOQ Team Leader
  if (roles.has('BOQ_TEAM_LEADER')) {
    return true
  }

  // Procurement Team Leader
  if (roles.has('PROCUREMENT_TEAM_LEADER')) {
    return true
  }

  return false
}

/**
 * Alias for isProductionHeadUser representing the 3 initial entry-point roles.
 */
export const isProductionEntryUser = isProductionHeadUser

/**
 * Check if user is an Accounts entry-point role.
 */
export function isAccountsHead(input: {
  departments?: string[] | Set<string>
  roles?: string[] | Set<string>
}): boolean {
  const depts = input.departments instanceof Set ? input.departments : new Set(input.departments ?? [])
  const roles = input.roles instanceof Set ? input.roles : new Set((input.roles ?? []).map((r) => r.toUpperCase().replace(/\s+/g, '_')))

  return depts.has('ADMIN') || roles.has('ADMIN') || depts.has('ACCOUNTS') || roles.has('ACCOUNTS')
}

/**
 * Check if user is a Project Coordinator head.
 */
export function isProjectCoordinatorHead(input: {
  departments?: string[] | Set<string>
  roles?: string[] | Set<string>
}): boolean {
  const depts = input.departments instanceof Set ? input.departments : new Set(input.departments ?? [])
  const roles = input.roles instanceof Set ? input.roles : new Set((input.roles ?? []).map((r) => r.toUpperCase().replace(/\s+/g, '_')))

  return (
    depts.has('ADMIN') ||
    roles.has('ADMIN') ||
    depts.has('PROJECT_COORDINATOR') ||
    depts.has('PROJECT_CORDINATOR') ||
    roles.has('PROJECT_COORDINATOR') ||
    roles.has('PROJECT_CORDINATOR')
  )
}

/**
 * Check if user is a BOQ Team Leader head.
 */
export function isBoqTeamLeaderHead(input: {
  departments?: string[] | Set<string>
  roles?: string[] | Set<string>
}): boolean {
  const depts = input.departments instanceof Set ? input.departments : new Set(input.departments ?? [])
  const roles = input.roles instanceof Set ? input.roles : new Set((input.roles ?? []).map((r) => r.toUpperCase().replace(/\s+/g, '_')))

  return depts.has('ADMIN') || roles.has('ADMIN') || roles.has('BOQ_TEAM_LEADER')
}

/**
 * Check if user is a Procurement Team Leader head.
 */
export function isProcurementTeamLeaderHead(input: {
  departments?: string[] | Set<string>
  roles?: string[] | Set<string>
}): boolean {
  const depts = input.departments instanceof Set ? input.departments : new Set(input.departments ?? [])
  const roles = input.roles instanceof Set ? input.roles : new Set((input.roles ?? []).map((r) => r.toUpperCase().replace(/\s+/g, '_')))

  return depts.has('ADMIN') || roles.has('ADMIN') || roles.has('PROCUREMENT_TEAM_LEADER')
}

/**
 * Check if user is any participant in the Production Level (Head or Execution role).
 */
export function isProductionLevelMember(input: {
  departments?: string[] | Set<string>
  roles?: string[] | Set<string>
}): boolean {
  if (isProductionHeadUser(input)) return true

  const depts = input.departments instanceof Set ? input.departments : new Set(input.departments ?? [])
  const roles = input.roles instanceof Set ? input.roles : new Set((input.roles ?? []).map((r) => r.toUpperCase().replace(/\s+/g, '_')))

  const executionDeptKeys = [
    'ACCOUNTS',
    'BOQ',
    'SITE_ENGINEER',
    'PROJECT_ENGINEER',
    'IMPLEMENTATION_TEAM',
    'PROCUREMENT',
    'PROCUREMENT_DEPARTMENT',
    'PROCUREMENT_SUPPLY_CHAIN',
    'ELECTRICIAN',
    'ELECTRICAL_TEAM',
  ]

  for (const k of executionDeptKeys) {
    if (depts.has(k) || roles.has(k)) return true
  }

  return false
}

/**
 * Get all execution departments reporting under a given Production Head.
 */
export function getDepartmentsUnderHead(head: ProductionHeadType): ExecutionDepartmentDefinition[] {
  return EXECUTION_DEPARTMENTS_REGISTRY.filter((d) => d.reportingHead === head)
}

/**
 * Dynamic registration of an execution department under a Production Head.
 */
export function registerExecutionDepartment(def: ExecutionDepartmentDefinition) {
  const existingIdx = EXECUTION_DEPARTMENTS_REGISTRY.findIndex((d) => d.key === def.key)
  if (existingIdx >= 0) {
    EXECUTION_DEPARTMENTS_REGISTRY[existingIdx] = def
  } else {
    EXECUTION_DEPARTMENTS_REGISTRY.push(def)
  }
}
