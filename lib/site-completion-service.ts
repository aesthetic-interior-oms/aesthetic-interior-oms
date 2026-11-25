import prisma from '@/lib/prisma'
import { normalizeDepartmentName } from '@/lib/department-normalization'
import {
  LeadAssignmentDepartment,
  NotificationType,
  SiteItemCompletionRequestStatus,
} from '@/generated/prisma/client'

export interface CompletionSnapshotItem {
  lineId: string
  description: string
  floorName: string
  areaName: string
  quantity: number | null
  unit: string | null
}

export interface ScopeProgress {
  total: number
  completed: number
  percent: number
}

export class ServiceError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export async function getUserRoleFlags(userId: string, actorRoles: string[] = []) {
  const [userDepts, userRoles] = await Promise.all([
    prisma.userDepartment.findMany({
      where: { userId },
      select: { department: { select: { name: true } } },
    }),
    prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { name: true } } },
    }),
  ])

  const deptNames = new Set(
    userDepts
      .map((d) => normalizeDepartmentName(d.department.name))
      .filter((name): name is string => Boolean(name)),
  )

  const roleNames = new Set([
    ...userRoles.map((r) => r.role.name.toUpperCase()),
    ...actorRoles.map((r) => r.toUpperCase()),
  ])

  const isAdmin = deptNames.has('ADMIN') || roleNames.has('ADMIN')
  const isPc =
    deptNames.has('PROJECT_COORDINATOR') ||
    deptNames.has('PROJECT_CORDINATOR') ||
    roleNames.has('PROJECT_COORDINATOR') ||
    roleNames.has('PROJECT_CORDINATOR') ||
    Array.from(roleNames).some(
      (r) => r.includes('PROJECT_COORDINATOR') || r.includes('PROJECT_CORDINATOR'),
    )
  const isSiteEngineer =
    deptNames.has('SITE_ENGINEER') ||
    deptNames.has('PROJECT_ENGINEER') ||
    deptNames.has('IMPLEMENTATION_TEAM') ||
    roleNames.has('SITE_ENGINEER')

  return { isAdmin, isPc, isSiteEngineer }
}

export async function ensureSiteEngineerAccess(leadId: string, userId: string) {
  const [seAssignment, anySeAssignment] = await Promise.all([
    prisma.leadAssignment.findFirst({
      where: {
        leadId,
        userId,
        department: LeadAssignmentDepartment.SITE_ENGINEER,
      },
    }),
    prisma.leadAssignment.findFirst({
      where: {
        leadId,
        department: LeadAssignmentDepartment.SITE_ENGINEER,
      },
    }),
  ])

  if (anySeAssignment && !seAssignment) {
    throw new ServiceError('Forbidden: You are not assigned to this project site', 403)
  }
}

export async function ensurePcAccess(leadId: string, userId: string) {
  const [pcAssignment, anyPcAssignment] = await Promise.all([
    prisma.leadAssignment.findFirst({
      where: {
        leadId,
        userId,
        department: LeadAssignmentDepartment.PROJECT_COORDINATOR,
      },
    }),
    prisma.leadAssignment.findFirst({
      where: {
        leadId,
        department: LeadAssignmentDepartment.PROJECT_COORDINATOR,
      },
    }),
  ])

  if (anyPcAssignment && !pcAssignment) {
    throw new ServiceError('Forbidden: You are not assigned as Project Coordinator for this project', 403)
  }
}

export function computeDraftScopeProgress(content: unknown): ScopeProgress {
  if (!content || typeof content !== 'object') {
    return { total: 0, completed: 0, percent: 0 }
  }
  const c = content as Record<string, unknown>
  const lineItems = Array.isArray(c.lineItems)
    ? (c.lineItems as Array<Record<string, unknown>>)
    : []
  const activeItems = lineItems.filter((i) => i && i.included !== false)
  const total = activeItems.length
  const completed = activeItems.filter((i) => i.completed === true).length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return { total, completed, percent }
}

function buildSectionAndAreaMaps(content: Record<string, unknown>) {
  const rawSections = Array.isArray(content.sections)
    ? (content.sections as Array<{ id?: string; name?: string }>)
    : Array.isArray(content.floors)
      ? (content.floors as Array<{ id?: string; name?: string }>)
      : []

  const rawAreas = Array.isArray(content.areas)
    ? (content.areas as Array<{ id?: string; name?: string; floorId?: string }>)
    : []

  const sectionMap = new Map<string, string>()
  for (const s of rawSections) {
    if (s.id && s.name) sectionMap.set(s.id, s.name)
  }

  const areaMap = new Map<string, { name: string; floorId?: string }>()
  for (const a of rawAreas) {
    if (a.id && a.name) areaMap.set(a.id, { name: a.name, floorId: a.floorId })
  }

  return { sectionMap, areaMap }
}

export async function createCompletionRequest(params: {
  leadId: string
  draftId: string
  lineIds: string[]
  note?: string | null
  userId: string
  userFullName: string
}) {
  const { leadId, draftId, lineIds, note, userId, userFullName } = params

  const uniqueLineIds = Array.from(
    new Set(lineIds.map((id) => String(id).trim()).filter(Boolean)),
  )
  if (uniqueLineIds.length === 0) {
    throw new ServiceError('Select at least one work item to submit a completion request', 400)
  }

  const [lead, draft, pendingRequests] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, name: true },
    }),
    prisma.quotationDraft.findFirst({
      where: { id: draftId, leadId },
    }),
    prisma.siteItemCompletionRequest.findMany({
      where: {
        leadId,
        draftId,
        status: SiteItemCompletionRequestStatus.PENDING,
      },
      select: { id: true, lineIds: true },
    }),
  ])

  if (!lead) {
    throw new ServiceError('Project not found', 404)
  }
  if (!draft) {
    throw new ServiceError('Quotation draft not found for this project', 404)
  }

  const content = (draft.content as Record<string, unknown>) ?? {}
  const lineItems = Array.isArray(content.lineItems)
    ? (content.lineItems as Array<Record<string, unknown>>)
    : []

  const { sectionMap, areaMap } = buildSectionAndAreaMaps(content)

  const itemById = new Map<string, Record<string, unknown>>()
  for (const item of lineItems) {
    if (item && typeof item.id === 'string' && item.included !== false) {
      itemById.set(item.id, item)
    }
  }

  const alreadyPendingIds = new Set<string>()
  for (const req of pendingRequests) {
    for (const id of req.lineIds) {
      alreadyPendingIds.add(id)
    }
  }

  const snapshot: CompletionSnapshotItem[] = []
  for (const lineId of uniqueLineIds) {
    const item = itemById.get(lineId)
    if (!item) {
      throw new ServiceError(`Work item (${lineId}) not found in active quotation`, 404)
    }
    if (item.completed === true) {
      throw new ServiceError(
        `Item "${String(item.description || lineId)}" is already approved and completed`,
        400,
      )
    }
    if (alreadyPendingIds.has(lineId)) {
      throw new ServiceError(
        `Item "${String(item.description || lineId)}" is already pending Project Coordinator approval`,
        409,
      )
    }

    const sectionId = typeof item.sectionId === 'string' ? item.sectionId : ''
    const areaId = typeof item.areaId === 'string' ? item.areaId : ''
    const areaInfo = areaId ? areaMap.get(areaId) : undefined

    const floorName =
      (sectionId && sectionMap.get(sectionId)) ||
      (areaInfo?.floorId && sectionMap.get(areaInfo.floorId)) ||
      'General Floor / Scope'
    const areaName = areaInfo?.name || 'General Area'

    snapshot.push({
      lineId,
      description: String(item.description || 'Custom Product / Work Scope'),
      floorName,
      areaName,
      quantity: typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || null,
      unit: typeof item.unit === 'string' ? item.unit : null,
    })
  }

  const created = await prisma.siteItemCompletionRequest.create({
    data: {
      leadId,
      draftId,
      requestedById: userId,
      status: SiteItemCompletionRequestStatus.PENDING,
      lineIds: uniqueLineIds,
      itemsSnapshot: snapshot as unknown as any,
      note: note?.trim() || null,
    },
    include: {
      lead: { select: { id: true, name: true, location: true } },
      requestedBy: { select: { id: true, fullName: true, email: true } },
      reviewedBy: { select: { id: true, fullName: true, email: true } },
    },
  })

  // Notify assigned PC(s), or all active PCs if none specifically assigned
  try {
    const assignedPcs = await prisma.leadAssignment.findMany({
      where: {
        leadId,
        department: LeadAssignmentDepartment.PROJECT_COORDINATOR,
      },
      select: { userId: true },
    })

    let targetPcIds = assignedPcs.map((a) => a.userId)
    if (targetPcIds.length === 0) {
      const allPcs = await prisma.user.findMany({
        where: {
          isActive: true,
          userDepartments: {
            some: {
              department: {
                name: { in: ['PROJECT_COORDINATOR', 'PROJECT_CORDINATOR'] },
              },
            },
          },
        },
        select: { id: true },
      })
      targetPcIds = allPcs.map((u) => u.id)
    }

    if (targetPcIds.length > 0) {
      const countLabel =
        uniqueLineIds.length === 1 ? '1 work item' : `${uniqueLineIds.length} work items`
      await prisma.notification.createMany({
        data: targetPcIds.map((pcId) => ({
          userId: pcId,
          leadId,
          type: NotificationType.LEAD_ASSIGNED_TO_YOU,
          title: 'Item Completion Approval Request',
          message: `${userFullName} requested completion approval for ${countLabel} on ${lead.name}.`,
          scheduledFor: new Date(),
        })),
      })
    }
  } catch (notifErr) {
    console.error('[SiteCompletionService] Failed to notify Project Coordinators:', notifErr)
  }

  return created
}

export async function listCompletionRequests(filters: {
  leadId?: string
  status?: string | null
  requestedById?: string
}) {
  const where: Record<string, unknown> = {}
  if (filters.leadId) where.leadId = filters.leadId
  if (filters.requestedById) where.requestedById = filters.requestedById
  if (
    filters.status &&
    filters.status !== 'ALL' &&
    Object.values(SiteItemCompletionRequestStatus).includes(
      filters.status as SiteItemCompletionRequestStatus,
    )
  ) {
    where.status = filters.status as SiteItemCompletionRequestStatus
  }

  return prisma.siteItemCompletionRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          location: true,
          phone: true,
        },
      },
      requestedBy: {
        select: { id: true, fullName: true, email: true },
      },
      reviewedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  })
}

export async function reviewCompletionRequest(params: {
  requestId: string
  action: 'APPROVE' | 'REJECT'
  rejectionReason?: string | null
  reviewerId: string
  reviewerFullName: string
}) {
  const { requestId, action, rejectionReason, reviewerId, reviewerFullName } = params

  const existing = await prisma.siteItemCompletionRequest.findUnique({
    where: { id: requestId },
    include: {
      lead: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, fullName: true } },
    },
  })

  if (!existing) {
    throw new ServiceError('Completion request not found', 404)
  }

  if (existing.status !== SiteItemCompletionRequestStatus.PENDING) {
    throw new ServiceError(`This request has already been ${existing.status.toLowerCase()}`, 409)
  }

  const now = new Date()

  if (action === 'REJECT') {
    const trimmedReason = rejectionReason?.trim()
    if (!trimmedReason) {
      throw new ServiceError('Rejection reason is required when rejecting a completion request', 400)
    }

    const updated = await prisma.siteItemCompletionRequest.update({
      where: { id: requestId },
      data: {
        status: SiteItemCompletionRequestStatus.REJECTED,
        rejectionReason: trimmedReason,
        reviewedById: reviewerId,
        reviewedAt: now,
      },
      include: {
        lead: { select: { id: true, name: true, location: true } },
        requestedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
    })

    try {
      await prisma.notification.create({
        data: {
          userId: existing.requestedById,
          leadId: existing.leadId,
          type: NotificationType.LEAD_ASSIGNED_TO_YOU,
          title: 'Completion Request Rejected',
          message: `${reviewerFullName} rejected your completion request for ${existing.lead.name}: "${trimmedReason}"`,
          scheduledFor: now,
        },
      })
    } catch (notifErr) {
      console.error('[SiteCompletionService] Failed to send rejection notification:', notifErr)
    }

    const draft = await prisma.quotationDraft.findUnique({
      where: { id: existing.draftId },
      select: { content: true },
    })

    return {
      request: updated,
      scopeProgress: computeDraftScopeProgress(draft?.content),
    }
  }

  // APPROVE
  const result = await prisma.$transaction(async (tx) => {
    const updatedReq = await tx.siteItemCompletionRequest.update({
      where: { id: requestId },
      data: {
        status: SiteItemCompletionRequestStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: now,
      },
      include: {
        lead: { select: { id: true, name: true, location: true } },
        requestedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
    })

    const draft = await tx.quotationDraft.findUnique({
      where: { id: existing.draftId },
    })

    if (!draft) {
      throw new ServiceError('Associated quotation draft not found', 404)
    }

    const content = (draft.content as Record<string, unknown>) ?? {}
    const lineItems = Array.isArray(content.lineItems)
      ? (content.lineItems as Array<Record<string, unknown>>)
      : []

    const targetIds = new Set(existing.lineIds)
    const nextItems = lineItems.map((item) => {
      if (item && typeof item.id === 'string' && targetIds.has(item.id)) {
        return {
          ...item,
          completed: true,
          completedAt: now.toISOString(),
          completedByUserId: existing.requestedById,
          approvedByUserId: reviewerId,
          approvedAt: now.toISOString(),
        }
      }
      return item
    })

    const nextContent = { ...content, lineItems: nextItems }

    await tx.quotationDraft.update({
      where: { id: draft.id },
      data: {
        content: nextContent as any,
        updatedById: reviewerId,
      },
    })

    const scopeProgress = computeDraftScopeProgress(nextContent)

    return {
      request: updatedReq,
      scopeProgress,
    }
  })

  try {
    const countLabel =
      existing.lineIds.length === 1 ? '1 work item' : `${existing.lineIds.length} work items`
    await prisma.notification.create({
      data: {
        userId: existing.requestedById,
        leadId: existing.leadId,
        type: NotificationType.LEAD_ASSIGNED_TO_YOU,
        title: 'Completion Request Approved',
        message: `${reviewerFullName} approved ${countLabel} as completed for ${existing.lead.name}.`,
        scheduledFor: now,
      },
    })
  } catch (notifErr) {
    console.error('[SiteCompletionService] Failed to send approval notification:', notifErr)
  }

  return result
}
