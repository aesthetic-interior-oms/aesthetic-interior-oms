import { LeadAssignmentDepartment, LeadStage, Prisma } from '@/generated/prisma/client'
import { hasJrArchitectureLeadershipRole } from '@/lib/jr-architecture-roles'

const SCOPED_DEPARTMENTS: LeadAssignmentDepartment[] = [
  LeadAssignmentDepartment.JR_CRM,
  LeadAssignmentDepartment.SR_CRM,
  LeadAssignmentDepartment.QUOTATION,
  LeadAssignmentDepartment.JR_ARCHITECT,
  LeadAssignmentDepartment.VISUALIZER_3D,
]

export function scopedAssignmentDepartments(userDepartments: string[]): LeadAssignmentDepartment[] {
  const set = new Set(userDepartments)
  const hasQuotationAccess = set.has('QUOTATION') || set.has('QUOTATION_TEAM')

  const scoped = SCOPED_DEPARTMENTS.filter((department) => set.has(department))

  if (hasQuotationAccess && !scoped.includes(LeadAssignmentDepartment.QUOTATION)) {
    scoped.push(LeadAssignmentDepartment.QUOTATION)
  }

  return scoped
}

export function buildScopedLeadWhere(input: {
  leadId?: string
  actorUserId: string
  actorDepartments: string[]
  actorRoles?: string[]
}): Prisma.LeadWhereInput {
  const scopedDepartments = scopedAssignmentDepartments(input.actorDepartments)
  const isAdmin = input.actorDepartments.includes('ADMIN')
  const isVisitTeam = input.actorDepartments.includes('VISIT_TEAM')
  const isJrArchitectLeader =
    input.actorDepartments.includes('JR_ARCHITECT') &&
    hasJrArchitectureLeadershipRole(input.actorRoles)

  const idClause = input.leadId ? { id: input.leadId } : {}

  if (isAdmin) {
    return idClause
  }

  if (scopedDepartments.length === 0 && !isVisitTeam && !isJrArchitectLeader) {
    return {
      ...idClause,
      id: '__no_access__',
    }
  }

  const accessClauses: Prisma.LeadWhereInput[] = []

  if (scopedDepartments.length > 0) {
    accessClauses.push({
      assignments: {
        some: {
          userId: input.actorUserId,
          department: { in: scopedDepartments },
        },
      },
    })
  }

  if (isJrArchitectLeader) {
    accessClauses.push({
      stage: { in: [LeadStage.CAD_PHASE, LeadStage.DISCOVERY, LeadStage.QUOTATION_PHASE, LeadStage.BUDGET_PHASE] },
    })
  }

  if (isVisitTeam) {
    accessClauses.push({
      visits: {
        some: {
          OR: [
            { assignedToId: input.actorUserId },
            {
              supportAssignments: {
                some: {
                  supportUserId: input.actorUserId,
                },
              },
            },
          ],
        },
      },
    })
    accessClauses.push({
      assignments: {
        some: {
          userId: input.actorUserId,
          department: LeadAssignmentDepartment.VISIT_TEAM,
        },
      },
    })
  }

  return {
    ...idClause,
    OR: accessClauses,
  }
}
