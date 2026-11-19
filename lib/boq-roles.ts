// ─── BOQ Role Hierarchy ───────────────────────────────────────────────────────
// Two distinct roles govern BOQ access:
//   BOQ_TEAM_LEADER  – can view the Agreement Leads page and assign projects
//   BOQ_TEAM_MEMBER  – regular BOQ staff; receives assignments; no Agreement Leads access

export const BOQ_TEAM_LEADER_ROLE = 'BOQ_TEAM_LEADER'
export const BOQ_TEAM_MEMBER_ROLE = 'BOQ_TEAM_MEMBER'

export const BOQ_LEADERSHIP_ROLES = [BOQ_TEAM_LEADER_ROLE] as const

/** Returns true when the user holds the BOQ Team Leader role. */
export function hasBoqLeaderRole(roleNames: string[] | null | undefined): boolean {
  if (!Array.isArray(roleNames) || roleNames.length === 0) return false
  const normalized = new Set(roleNames.map((r) => r.trim().toUpperCase().replace(/\s+/g, '_')))
  return normalized.has(BOQ_TEAM_LEADER_ROLE)
}

/** Returns true when the user holds the BOQ Team Member role. */
export function hasBoqMemberRole(roleNames: string[] | null | undefined): boolean {
  if (!Array.isArray(roleNames) || roleNames.length === 0) return false
  const normalized = new Set(roleNames.map((r) => r.trim().toUpperCase().replace(/\s+/g, '_')))
  return normalized.has(BOQ_TEAM_MEMBER_ROLE)
}

/** Returns true when the user holds any BOQ leadership role. */
export function hasBoqLeadershipRole(roleNames: string[] | null | undefined): boolean {
  return hasBoqLeaderRole(roleNames)
}

/** Returns true when user is a Project Coordinator */
export function isProjectCoordinator(roles?: string[] | null, departments?: string[] | null): boolean {
  const normRoles = (roles || []).map((r) => r.trim().toUpperCase().replace(/\s+/g, '_'))
  const normDepts = (departments || []).map((d) => d.trim().toUpperCase().replace(/\s+/g, '_'))
  return (
    normRoles.some((r) => r.includes('PROJECT_COORDINATOR') || r.includes('PROJECT_CORDINATOR')) ||
    normDepts.some((d) => d.includes('PROJECT_COORDINATOR') || d.includes('PROJECT_CORDINATOR'))
  )
}

/**
 * Validates whether user has management ownership to create, edit, or delete Ceiling Vendor Work Orders.
 * BOQ Team Leader and Project Coordinator (plus Admin) hold full management permissions.
 */
export function canManageCeilingVendorWorkOrders(input: {
  roles?: string[] | null
  departments?: string[] | null
  isAssignedPc?: boolean
}): boolean {
  const normRoles = (input.roles || []).map((r) => r.trim().toUpperCase().replace(/\s+/g, '_'))
  const normDepts = (input.departments || []).map((d) => d.trim().toUpperCase().replace(/\s+/g, '_'))
  const isAdmin = normRoles.includes('ADMIN') || normDepts.includes('ADMIN')
  const isLeader = hasBoqLeaderRole(input.roles) || normDepts.includes('BOQ_TEAM_LEADER')
  const isPc = isProjectCoordinator(input.roles, input.departments) || Boolean(input.isAssignedPc)
  return isAdmin || isLeader || isPc
}

