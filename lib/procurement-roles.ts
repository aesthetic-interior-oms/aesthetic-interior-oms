// ─── Procurement Role Hierarchy ───────────────────────────────────────────────
// Two distinct roles govern Procurement access:
//   PROCUREMENT_TEAM_LEADER  – oversees incoming requisitions and assigns/delegates tasks
//   PROCUREMENT_TEAM_MEMBER  – receives assigned requisitions to price materials and generate indents

export const PROCUREMENT_TEAM_LEADER_ROLE = 'PROCUREMENT_TEAM_LEADER'
export const PROCUREMENT_TEAM_MEMBER_ROLE = 'PROCUREMENT_TEAM_MEMBER'

export const PROCUREMENT_LEADERSHIP_ROLES = [PROCUREMENT_TEAM_LEADER_ROLE] as const

function normalized(names: string[] | null | undefined): Set<string> {
  return new Set((names ?? []).map((name) => name.trim().toUpperCase().replace(/\s+/g, '_')))
}

/** Returns true when the user holds the Procurement Team Leader role. */
export function hasProcurementLeaderRole(roleNames?: string[] | null): boolean {
  return normalized(roleNames).has(PROCUREMENT_TEAM_LEADER_ROLE)
}

/** Returns true when the user holds the Procurement Team Member role. */
export function hasProcurementMemberRole(roleNames?: string[] | null): boolean {
  return normalized(roleNames).has(PROCUREMENT_TEAM_MEMBER_ROLE)
}

/** Returns true when the user holds any procurement leadership role. */
export function hasProcurementLeadershipRole(roleNames?: string[] | null): boolean {
  return hasProcurementLeaderRole(roleNames)
}

/** Returns true when the user has either procurement role or is an Admin/Procurement department member. */
export function hasProcurementRole(roleNames?: string[] | null, departments?: string[] | null): boolean {
  const roles = normalized(roleNames)
  const depts = normalized(departments)
  return (
    roles.has(PROCUREMENT_TEAM_LEADER_ROLE) ||
    roles.has(PROCUREMENT_TEAM_MEMBER_ROLE) ||
    roles.has('ADMIN') ||
    depts.has('PROCUREMENT') ||
    depts.has('PROCUREMENT_DEPARTMENT') ||
    depts.has('PROCUREMENT_SUPPLY_CHAIN') ||
    depts.has('ADMIN')
  )
}

/** Returns true when the user holds the Project Coordinator role or belongs to the Project Coordinator department. */
export function isProjectCoordinator(roleNames?: string[] | null, departments?: string[] | null): boolean {
  const roles = normalized(roleNames)
  const depts = normalized(departments)
  return (
    Array.from(roles).some((r) => r.includes('PROJECT_COORDINATOR') || r.includes('PROJECT_CORDINATOR')) ||
    Array.from(depts).some((d) => d.includes('PROJECT_COORDINATOR') || d.includes('PROJECT_CORDINATOR'))
  )
}

/** Returns true when the user has authority to delegate and oversee procurement tasks (Leader or Admin). */
export function isProcurementLeader(roleNames?: string[] | null, departments?: string[] | null): boolean {
  const roles = normalized(roleNames)
  const depts = normalized(departments)
  return roles.has(PROCUREMENT_TEAM_LEADER_ROLE) || roles.has('ADMIN') || depts.has('ADMIN')
}

/** Returns true when the user can assign procurement members to requisitions (PC, Procurement Leader, or Admin). */
export function canAssignProcurement(roleNames?: string[] | null, departments?: string[] | null): boolean {
  return isProcurementLeader(roleNames, departments) || isProjectCoordinator(roleNames, departments)
}
