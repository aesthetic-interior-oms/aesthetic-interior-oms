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
