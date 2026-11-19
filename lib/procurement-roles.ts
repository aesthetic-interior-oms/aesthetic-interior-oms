export const PROCUREMENT_TEAM_LEADER_ROLE = 'PROCUREMENT_TEAM_LEADER'
export const PROCUREMENT_TEAM_MEMBER_ROLE = 'PROCUREMENT_TEAM_MEMBER'

function normalized(roleNames: string[] | null | undefined) {
  return new Set((roleNames ?? []).map((role) => role.trim().toUpperCase().replace(/\s+/g, '_')))
}

export function hasProcurementLeaderRole(roleNames?: string[] | null) {
  return normalized(roleNames).has(PROCUREMENT_TEAM_LEADER_ROLE)
}

export function hasProcurementMemberRole(roleNames?: string[] | null) {
  return normalized(roleNames).has(PROCUREMENT_TEAM_MEMBER_ROLE)
}

export function hasProcurementRole(roleNames?: string[] | null, departments?: string[] | null) {
  const roles = normalized(roleNames)
  const depts = normalized(departments)
  return roles.has(PROCUREMENT_TEAM_LEADER_ROLE) || roles.has(PROCUREMENT_TEAM_MEMBER_ROLE) || depts.has('PROCUREMENT') || depts.has('ADMIN') || roles.has('ADMIN')
}
