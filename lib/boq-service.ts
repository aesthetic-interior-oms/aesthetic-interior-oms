'use server'

import prisma from '@/lib/prisma'
import { RequisitionWorkCategory, RequisitionStatus } from '@/generated/prisma/client'


export type RequisitionItemInput = {
  id?: string
  quotationLineItemId?: string
  workCategory: RequisitionWorkCategory
  materialName: string
  specifications?: string
  variantAttributes?: any
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
    // Get leads that have a QuotationDraft or are assigned to BOQ department
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          {
            quotationDrafts: {
              some: {
                draftKey: 'detail',
              },
            },
          },
          {
            assignments: {
              some: {
                department: 'BOQ',
              },
            },
          },
        ],
      },
      orderBy: { updated_at: 'desc' },
      include: {
        assignee: {
          select: { id: true, fullName: true, email: true },
        },
        quotationDrafts: {
          where: { draftKey: 'detail' },
          take: 1,
          select: {
            id: true,
            status: true,
            grandTotal: true,
            updatedAt: true,
          },
        },
        materialRequisitions: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
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
        quotationStatus: quotation?.status || 'NO_QUOTATION',
        quotationTotal: quotation?.grandTotal || 0,
        requisitionStatus: requisition?.status || 'NOT_STARTED',
        requisitionItemCount: requisition?._count.items || 0,
        requisitionId: requisition?.id || null,
        updatedAt: lead.updated_at,
      }
    })
  } catch (error) {
    console.error('Error fetching BOQ assigned tasks:', error)
    return []
  }
}

export async function getLeadRequisitionData(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        quotationDrafts: {
          where: { draftKey: 'detail' },
          take: 1,
        },
        materialRequisitions: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
          include: {
            items: {
              orderBy: { id: 'asc' },
            },
          },
        },
      },
    })

    if (!lead) return null

    const detailQuotation = lead.quotationDrafts[0] || null
    const existingRequisition = lead.materialRequisitions[0] || null

    return {
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        location: lead.location,
        budget: lead.budget,
        stage: lead.stage,
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
      requisition: existingRequisition
        ? {
            id: existingRequisition.id,
            requisitionNo: existingRequisition.requisitionNo,
            status: existingRequisition.status,
            notes: existingRequisition.notes,
            items: existingRequisition.items,
          }
        : null,
    }
  } catch (error) {
    console.error('Error fetching lead requisition data:', error)
    return null
  }
}

export async function saveMaterialRequisition(input: {
  leadId: string
  quotationDraftId?: string
  status?: RequisitionStatus
  notes?: string
  createdById: string
  items: RequisitionItemInput[]
}) {
  try {
    const requisitionNo = `REQ-${Date.now().toString().slice(-6)}`

    // Check if requisition exists for lead
    const existing = await prisma.materialRequisition.findFirst({
      where: { leadId: input.leadId },
    })

    let requisitionId = existing?.id

    if (existing) {
      // Update header
      await prisma.materialRequisition.update({
        where: { id: existing.id },
        data: {
          status: input.status || existing.status,
          notes: input.notes,
          quotationDraftId: input.quotationDraftId || existing.quotationDraftId,
        },
      })
      // Clear old items and recreate
      await prisma.materialRequisitionItem.deleteMany({
        where: { requisitionId: existing.id },
      })
    } else {
      // Create new header
      const newReq = await prisma.materialRequisition.create({
        data: {
          leadId: input.leadId,
          quotationDraftId: input.quotationDraftId,
          requisitionNo,
          status: input.status || 'DRAFT',
          notes: input.notes,
          createdById: input.createdById,
        },
      })
      requisitionId = newReq.id
    }

    // Insert line items
    if (requisitionId && input.items.length > 0) {
      await prisma.materialRequisitionItem.createMany({
        data: input.items.map((item) => ({
          requisitionId: requisitionId!,
          quotationLineItemId: item.quotationLineItemId,
          workCategory: item.workCategory,
          materialName: item.materialName,
          specifications: item.specifications,
          variantAttributes: item.variantAttributes || {},
          netQuantity: Number(item.netQuantity) || 1,
          wastagePercent: Number(item.wastagePercent) || 0,
          finalQuantity: Number(item.finalQuantity) || Number(item.netQuantity) || 1,
          unit: item.unit || 'Pcs',
          productionPhase: item.productionPhase,
          remarks: item.remarks,
        })),
      })
    }

    return { success: true, requisitionId }
  } catch (error) {
    console.error('Error saving material requisition:', error)
    return { success: false, error: String(error) }
  }
}
