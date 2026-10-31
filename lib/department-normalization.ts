const DEPARTMENT_NAME_ALIASES: Record<string, string> = {
  // Typo/legacy aliases for canonical department names
  PROJECT_COORDINATOR: 'PROJECT_CORDINATOR',    // canonical is PROJECT_CORDINATOR
  VISUALIZER_3D: '3D_VISUALIZER',              // canonical is 3D_VISUALIZER
  QUOTATION: 'QUOTATION_TEAM',                 // canonical is QUOTATION_TEAM
  PROCUREMENT_SUPPLY_CHAIN: 'PROCUREMENT',     // canonical is PROCUREMENT
  PROCUREMENT_DEPARTMENT: 'PROCUREMENT',
  SDC: 'SPECIALIST_DESIGN_CONSULTANTS',
  HR: 'HUMAN_RESOURCES',
  HUMAN_RESOURCE: 'HUMAN_RESOURCES',
  HUMAN_RESOURCES: 'HUMAN_RESOURCES',
  BOQ_TEAM: 'BOQ',
  BOQ_DEPARTMENT: 'BOQ',
}

const DEPARTMENT_QUERY_ALIASES: Record<string, string[]> = {
  // When querying DB for a department, also look up its legacy aliases
  PROJECT_CORDINATOR: ['PROJECT_CORDINATOR', 'PROJECT_COORDINATOR'],
  '3D_VISUALIZER': ['3D_VISUALIZER', 'VISUALIZER_3D'],
  QUOTATION_TEAM: ['QUOTATION_TEAM', 'QUOTATION'],
  PROCUREMENT: ['PROCUREMENT', 'Procurement', 'Procurement Department', 'Procurement & Supply Chain', 'PROCUREMENT_SUPPLY_CHAIN'],
  SPECIALIST_DESIGN_CONSULTANTS: ['SPECIALIST_DESIGN_CONSULTANTS', 'SDC'],
  SDC: ['SPECIALIST_DESIGN_CONSULTANTS', 'SDC'],
  HUMAN_RESOURCES: ['HUMAN_RESOURCES', 'HUMAN_RESOURCE', 'HR', 'Human_Resources'],
  HR: ['HUMAN_RESOURCES', 'HUMAN_RESOURCE', 'HR', 'Human_Resources'],
  BOQ: ['BOQ', 'BOQ Team', 'BOQ Department'],
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
