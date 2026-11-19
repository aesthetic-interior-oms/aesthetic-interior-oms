'use server'

import prisma from '@/lib/prisma'
import { RequisitionWorkCategory, RequisitionStatus, LeadSubStatus, LeadAssignmentDepartment } from '@/generated/prisma/client'
import type { Prisma } from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'

type RequisitionVariantAttributes = Record<string, string | number | boolean | null | undefined>

export type RequisitionItemInput = {
  id?: string
  quotationLineItemId?: string
  workCategory: RequisitionWorkCategory
  materialName: string
  specifications?: string
  variantAttributes?: RequisitionVariantAttributes
  netQuantity: number
  wastagePercent: number
  finalQuantity: number
  unit: string
  productionPhase?: string
  remarks?: string
}

export async function getBoqDashboardStats() {
  try {
    const totalRequisitions = await prisma.materialRequisition.count()
    const draftCount = await prisma.materialRequisition.count({
      where: { status: 'DRAFT' },
    })
    const submittedCount = await prisma.materialRequisition.count({
      where: { status: 'SUBMITTED' },
    })
    const inProcurementCount = await prisma.materialRequisition.count({
      where: { status: 'IN_PROCUREMENT' },
    })
    const fulfilledCount = await prisma.materialRequisition.count({
      where: { status: 'FULFILLED' },
    })

    // Count leads with approved detail quotations
    const approvedQuotationsCount = await prisma.quotationDraft.count({
      where: {
        draftKey: 'detail',
      },
    })

    const recentRequisitions = await prisma.materialRequisition.findMany({
      take: 6,
      orderBy: { updatedAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            location: true,
            stage: true,
          },
        },
        createdBy: {
          select: { fullName: true },
        },
        _count: {
          select: { items: true },
        },
      },
    })

    return {
      totalRequisitions,
      draftCount,
      submittedCount,
      inProcurementCount,
      fulfilledCount,
      approvedQuotationsCount,
      recentRequisitions,
    }
  } catch (error) {
    console.error('Error fetching BOQ dashboard stats:', error)
    return {
      totalRequisitions: 0,
      draftCount: 0,
      submittedCount: 0,
      inProcurementCount: 0,
      fulfilledCount: 0,
      approvedQuotationsCount: 0,
      recentRequisitions: [],
    }
  }
}

export async function getBoqAssignedTasks() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return []
    const currentUserId = authResult.actorUserId
    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = new Set(authResult.actorRoles.map((r) => r.trim().toLowerCase()))
    const isAdmin = actorDepartments.has('ADMIN') || actorRoles.has('admin')
    const isBoqLeader =
      isAdmin ||
      actorRoles.has('boq_team_leader') ||
      actorDepartments.has('boq_team_leader')

    // BOQ Team Leader & Admin see all production / agreement projects & BOQ assignments
    // Downstream BOQ members only see projects explicitly assigned to them
    const leads = await prisma.lead.findMany({
      where: isBoqLeader
        ? {
            OR: [
              {
                assignments: {
                  some: {
                    department: LeadAssignmentDepartment.BOQ,
                  },
                },
              },
              {
                stage: {
                  in: [
                    'CONVERSION' as any,
                    'PROJECT_SETUP' as any,
                    'MATERIAL_PLANNING' as any,
                    'PROCUREMENT' as any,
                    'SITE_EXECUTION' as any,
                    'QUALITY_CHECK' as any,
                    'HANDOVER' as any,
                  ],
                },
              },
              {
                agreementType: { not: null },
              },
            ],
          }
        : {
            assignments: {
              some: {
                department: LeadAssignmentDepartment.BOQ,
                userId: currentUserId,
              },
            },
          },
      orderBy: { updated_at: 'desc' },
      include: {
        assignee: {
          select: { id: true, fullName: true, email: true },
        },
        assignments: {
          where: { department: LeadAssignmentDepartment.BOQ },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
        quotationDrafts: {
          where: { draftKey: { startsWith: 'detail' } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            grandTotal: true,
            updatedAt: true,
          },
        },
        materialRequisitions: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { items: true } },
          },
        },
      },
    })

    return leads.map((lead) => {
      const quotation = lead.quotationDrafts[0] || null
      const requisition = lead.materialRequisitions[0] || null

      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone || 'N/A',
        location: lead.location || 'N/A',
        stage: lead.stage,
        assigneeName: lead.assignee?.fullName || 'Unassigned',
        boqAssignee: lead.assignments[0]?.user ?? null,
        quotationStatus: quotation?.status || 'NO_QUOTATION',
        quotationTotal: quotation?.grandTotal || 0,
        requisitionStatus: requisition?.status || 'NOT_STARTED',
        requisitionItemCount: requisition?._count.items || 0,
        requisitionId: requisition?.id || null,
        totalRequisitions: lead.materialRequisitions.length,
        requisitionBatches: lead.materialRequisitions.map((r) => ({
          id: r.id,
          requisitionNo: r.requisitionNo,
          status: r.status,
          notes: r.notes,
          itemCount: r._count.items,
        })),
        updatedAt: lead.updated_at,
      }
    })
  } catch (error) {
    console.error('Error fetching BOQ assigned tasks:', error)
    return []
  }
}

export async function getLeadRequisitionData(
  leadId: string,
  requisitionId?: string,
  isNewBatch?: boolean
) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return null
    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = new Set(authResult.actorRoles.map((r) => r.trim().toLowerCase()))
    const actorIsAdmin = actorDepartments.has('ADMIN') || actorRoles.has('admin')
    if (!actorIsAdmin) {
      const assigned = await prisma.leadAssignment.findFirst({
        where: { leadId, department: LeadAssignmentDepartment.BOQ, userId: authResult.actorUserId },
        select: { id: true },
      })
      if (!assigned) return null
    }
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        quotationDrafts: {
          where: { draftKey: { startsWith: 'detail' } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        materialRequisitions: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              orderBy: { id: 'asc' },
            },
            amendments: {
              orderBy: { requestedAt: 'desc' },
              include: {
                requestedBy: { select: { fullName: true } },
              },
            },
            _count: {
              select: { items: true },
            },
          },
        },
      },
    })

    if (!lead) return null

    const detailQuotation = lead.quotationDrafts[0] || null

    const allRequisitions = lead.materialRequisitions.map((r) => ({
      id: r.id,
      requisitionNo: r.requisitionNo,
      status: r.status,
      notes: r.notes,
      itemCount: r._count?.items ?? r.items?.length ?? 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))

    let activeRequisition = null
    if (isNewBatch) {
      activeRequisition = null
    } else if (requisitionId) {
      activeRequisition = lead.materialRequisitions.find((r) => r.id === requisitionId) || null
    } else {
      // Pick the most relevant batch:
      // Prefer latest DRAFT, then SUBMITTED, then latest overall
      activeRequisition =
        lead.materialRequisitions.find((r) => r.status === 'DRAFT') ||
        lead.materialRequisitions.find((r) => r.status === 'SUBMITTED') ||
        lead.materialRequisitions[0] ||
        null
    }

    return {
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        location: lead.location,
        budget: lead.budget,
        stage: lead.stage,
        subStatus: lead.subStatus,
      },
      detailQuotation: detailQuotation
        ? {
            id: detailQuotation.id,
            grandTotal: detailQuotation.grandTotal,
            projectSqft: detailQuotation.projectSqft,
            status: detailQuotation.status,
            content: detailQuotation.content,
          }
        : null,
      requisition: activeRequisition
        ? {
            id: activeRequisition.id,
            requisitionNo: activeRequisition.requisitionNo,
            status: activeRequisition.status,
            notes: activeRequisition.notes,
            rejectionReason: activeRequisition.rejectionReason,
            cancellationReason: activeRequisition.cancellationReason,
            items: activeRequisition.items,
            amendments: activeRequisition.amendments,
          }
        : null,
      allRequisitions,
    }
  } catch (error) {
    console.error('Error fetching lead requisition data:', error)
    return null
  }
}

export async function saveMaterialRequisition(input: {
  leadId: string
  requisitionId?: string | null
  isNewBatch?: boolean
  batchTitle?: string
  quotationDraftId?: string
  status?: RequisitionStatus
  notes?: string
  items: RequisitionItemInput[]
}) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return { success: false, error: 'Unauthorized' }
    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = new Set(authResult.actorRoles.map((r) => r.trim().toLowerCase()))
    const actorIsAdmin = actorDepartments.has('ADMIN') || actorRoles.has('admin')
    if (!actorIsAdmin) {
      const assigned = await prisma.leadAssignment.findFirst({
        where: { leadId: input.leadId, department: LeadAssignmentDepartment.BOQ, userId: authResult.actorUserId },
        select: { id: true },
      })
      if (!assigned) return { success: false, error: 'This project is not assigned to you.' }
    }

    const requisitionNo = `REQ-${Date.now().toString().slice(-6)}`

    let targetRequisition = null

    if (input.requisitionId && !input.isNewBatch) {
      targetRequisition = await prisma.materialRequisition.findUnique({
        where: { id: input.requisitionId },
      })
    } else if (!input.isNewBatch) {
      // Find an editable draft or rejected requisition for this lead
      targetRequisition = await prisma.materialRequisition.findFirst({
        where: {
          leadId: input.leadId,
          status: { in: ['DRAFT', 'REJECTED'] },
        },
        orderBy: { updatedAt: 'desc' },
      })
    }

    let requisitionId: string
    let finalRequisitionNo = requisitionNo

    if (targetRequisition) {
      // If target batch is in procurement or fulfilled and user tried to overwrite it in-place:
      if (targetRequisition.status === 'IN_PROCUREMENT' || targetRequisition.status === 'FULFILLED') {
        // Auto-create as new supplemental batch so ongoing site work/procurement NEVER blocks new requisitions!
        const newReq = await prisma.materialRequisition.create({
          data: {
            leadId: input.leadId,
            quotationDraftId: input.quotationDraftId,
            requisitionNo,
            status: input.status || 'DRAFT',
            notes: input.notes || `Supplemental: ${input.batchTitle || 'Batch'}`,
            createdById: authResult.actorUserId,
          },
        })
        requisitionId = newReq.id
        finalRequisitionNo = newReq.requisitionNo
      } else {
        // Update existing editable requisition
        await prisma.materialRequisition.update({
          where: { id: targetRequisition.id },
          data: {
            status: input.status || targetRequisition.status,
            notes: input.notes !== undefined ? input.notes : targetRequisition.notes,
            quotationDraftId: input.quotationDraftId || targetRequisition.quotationDraftId,
            ...(input.status === 'SUBMITTED' ? { rejectionReason: null } : {}),
          },
        })
        // Clear old items and recreate
        await prisma.materialRequisitionItem.deleteMany({
          where: { requisitionId: targetRequisition.id },
        })
        requisitionId = targetRequisition.id
        finalRequisitionNo = targetRequisition.requisitionNo
      }
    } else {
      // Create new header (new batch or supplemental)
      const newReq = await prisma.materialRequisition.create({
        data: {
          leadId: input.leadId,
          quotationDraftId: input.quotationDraftId,
          requisitionNo,
          status: input.status || 'DRAFT',
          notes: input.notes || input.batchTitle || null,
          createdById: authResult.actorUserId,
        },
      })
      requisitionId = newReq.id
      finalRequisitionNo = newReq.requisitionNo
    }

    // Non-blocking decoupled state update:
    // Only advance lead subStatus if it's still in initial BOQ intake.
    // NEVER downgrade or block if site work is already underway!
    const lead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      select: { subStatus: true, stage: true },
    })

    if (lead) {
      const isEarlyBoqPhase = [
        LeadSubStatus.BOQ_ASSIGNED,
        LeadSubStatus.BOQ_WORKING,
        LeadSubStatus.BOQ_CORRECTION,
      ].includes(lead.subStatus as any)

      if (isEarlyBoqPhase) {
        const nextSubStatus =
          input.status === RequisitionStatus.SUBMITTED
            ? LeadSubStatus.BOQ_COMPLETED
            : LeadSubStatus.BOQ_WORKING
        await prisma.lead.update({
          where: { id: input.leadId },
          data: { subStatus: nextSubStatus },
        })
      }
    }

    // Insert line items
    if (requisitionId && input.items.length > 0) {
      await prisma.materialRequisitionItem.createMany({
        data: input.items.map((item) => {
          const parsedNetQuantity = Number(item.netQuantity)
          const netQuantity = Number.isFinite(parsedNetQuantity) ? parsedNetQuantity : 1
          const parsedWastagePercent = Number(item.wastagePercent)
          const parsedFinalQuantity = Number(item.finalQuantity)
          return {
            requisitionId,
            quotationLineItemId: item.quotationLineItemId,
            workCategory: item.workCategory,
            materialName: item.materialName,
            specifications: item.specifications,
            variantAttributes: (item.variantAttributes || {}) as Prisma.InputJsonValue,
            netQuantity,
            wastagePercent: Number.isFinite(parsedWastagePercent) ? parsedWastagePercent : 0,
            finalQuantity: Number.isFinite(parsedFinalQuantity) ? parsedFinalQuantity : netQuantity,
            unit: item.unit || 'Pcs',
            productionPhase: item.productionPhase,
            remarks: item.remarks,
          }
        }),
      })
    }

    return {
      success: true,
      requisitionId,
      requisitionNo: finalRequisitionNo,
      status: input.status || 'DRAFT',
    }
  } catch (error) {
    console.error('Error saving material requisition:', error)
    return { success: false, error: String(error) }
  }
}

export async function pushPartialRequisition(input: {
  leadId: string
  batchTitle?: string
  notes?: string
  quotationDraftId?: string
  items: RequisitionItemInput[]
}) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return { success: false, error: 'Unauthorized' }
    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'No items selected to push into Purchase pipeline.' }
    }

    const requisitionNo = `REQ-P-${Date.now().toString().slice(-6)}`
    const newReq = await prisma.materialRequisition.create({
      data: {
        leadId: input.leadId,
        quotationDraftId: input.quotationDraftId,
        requisitionNo,
        status: RequisitionStatus.SUBMITTED,
        notes: input.batchTitle || input.notes || 'Partial Requisition Batch',
        createdById: authResult.actorUserId,
      },
    })

    await prisma.materialRequisitionItem.createMany({
      data: input.items.map((item) => {
        const parsedNetQuantity = Number(item.netQuantity)
        const netQuantity = Number.isFinite(parsedNetQuantity) ? parsedNetQuantity : 1
        const parsedWastagePercent = Number(item.wastagePercent)
        const parsedFinalQuantity = Number(item.finalQuantity)
        return {
          requisitionId: newReq.id,
          quotationLineItemId: item.quotationLineItemId,
          workCategory: item.workCategory,
          materialName: item.materialName,
          specifications: item.specifications,
          variantAttributes: (item.variantAttributes || {}) as Prisma.InputJsonValue,
          netQuantity,
          wastagePercent: Number.isFinite(parsedWastagePercent) ? parsedWastagePercent : 0,
          finalQuantity: Number.isFinite(parsedFinalQuantity) ? parsedFinalQuantity : netQuantity,
          unit: item.unit || 'Pcs',
          productionPhase: item.productionPhase,
          remarks: item.remarks,
        }
      }),
    })

    return {
      success: true,
      requisitionId: newReq.id,
      requisitionNo: newReq.requisitionNo,
      message: `Pushed ${input.items.length} items to Purchase as ${newReq.requisitionNo}`,
    }
  } catch (error) {
    console.error('Error pushing partial requisition:', error)
    return { success: false, error: String(error) }
  }
}

import { DEFAULT_CABINET_CATALOG, type CabinetCatalogConfig } from '@/lib/boq-cabinet-catalog'
export type { CabinetCatalogConfig }

export async function getBoqCabinetCatalog(): Promise<CabinetCatalogConfig> {
  try {
    const items = await prisma.boqBoardFinishItem.findMany({
      where: { isActive: true },
      orderBy: [{ serialNo: 'asc' }, { name: 'asc' }],
    })

    if (items.length > 0) {
      const baseMaterials = items.filter((i) => i.type === 'BOARD').map((i) => i.name)
      const solidShades = items.filter((i) => i.type === 'PRELAMINATED').map((i) => i.name)
      const hplBrands = items.filter((i) => i.type === 'HPL').map((i) => i.name)
      const docuOptions = items.filter((i) => i.type === 'DOCU').map((i) => i.name)

      return {
        ...DEFAULT_CABINET_CATALOG,
        baseMaterials: baseMaterials.length > 0 ? baseMaterials : DEFAULT_CABINET_CATALOG.baseMaterials,
        solidShades: solidShades.length > 0 ? solidShades : DEFAULT_CABINET_CATALOG.solidShades,
        hplBrands: hplBrands.length > 0 ? hplBrands : DEFAULT_CABINET_CATALOG.hplBrands,
        docuOptions: docuOptions.length > 0 ? docuOptions : (DEFAULT_CABINET_CATALOG.docuOptions || ['Glossy', 'Soft matt', 'White Duco']),
      }
    }
  } catch (error) {
    console.error('Error fetching dynamic BOQ catalog:', error)
  }
  return DEFAULT_CABINET_CATALOG
}

export async function createBoqAmendment(leadId: string, changeDescription: string) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return { success: false, error: 'Unauthorized' }

    if (!changeDescription.trim()) {
      return { success: false, error: 'Change description is required.' }
    }

    const requisition = await prisma.materialRequisition.findFirst({
      where: { leadId },
      select: { id: true },
    })

    if (!requisition) {
      return { success: false, error: 'No requisition found for this project.' }
    }

    const amendment = await prisma.requisitionAmendment.create({
      data: {
        requisitionId: requisition.id,
        changeDescription: changeDescription.trim(),
        requestedById: authResult.actorUserId,
        status: 'PENDING',
      },
    })

    return { success: true, data: amendment }
  } catch (error) {
    console.error('Error creating BOQ amendment:', error)
    return { success: false, error: 'Failed to submit amendment request.' }
  }
}

