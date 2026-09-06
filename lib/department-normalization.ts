const DEPARTMENT_NAME_ALIASES: Record<string, string> = {
  PROJECT_CORDINATOR: 'PROJECT_COORDINATOR',
}

const DEPARTMENT_QUERY_ALIASES: Record<string, string[]> = {
  PROJECT_COORDINATOR: ['PROJECT_COORDINATOR', 'PROJECT_CORDINATOR'],
}

export function normalizeDepartmentName(name?: string | null) {
  if (!name) return null

  const normalized = name.trim().toUpperCase().replace(/\s+/g, '_')
  return DEPARTMENT_NAME_ALIASES[normalized] ?? normalized
}

export function getDepartmentNameAliases(name?: string | null) {
  const normalized = normalizeDepartmentName(name)
  if (!normalized) return []

  return DEPARTMENT_QUERY_ALIASES[normalized] ?? [normalized]
}
