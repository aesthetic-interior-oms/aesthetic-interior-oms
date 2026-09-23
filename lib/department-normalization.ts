const DEPARTMENT_NAME_ALIASES: Record<string, string> = {
  PROJECT_CORDINATOR: 'PROJECT_COORDINATOR',
  SDC: 'SPECIALIST_DESIGN_CONSULTANTS',
  HR: 'HUMAN_RESOURCES',
  HUMAN_RESOURCE: 'HUMAN_RESOURCES',
  HUMAN_RESOURCES: 'HUMAN_RESOURCES',
}

const DEPARTMENT_QUERY_ALIASES: Record<string, string[]> = {
  PROJECT_COORDINATOR: ['PROJECT_COORDINATOR', 'PROJECT_CORDINATOR'],
  SPECIALIST_DESIGN_CONSULTANTS: ['SPECIALIST_DESIGN_CONSULTANTS', 'SDC'],
  SDC: ['SPECIALIST_DESIGN_CONSULTANTS', 'SDC'],
  HUMAN_RESOURCES: ['HUMAN_RESOURCES', 'HUMAN_RESOURCE', 'HR', 'Human_Resources'],
  HR: ['HUMAN_RESOURCES', 'HUMAN_RESOURCE', 'HR', 'Human_Resources'],
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
